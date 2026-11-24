"""Link final results to the predictions made before kick-off and score them."""

import logging
import math
from dataclasses import dataclass

from sqlalchemy import Engine, select

from footintel.db.models import (
    Match,
    MatchOutcome,
    ModelVersion,
    Prediction,
    PredictionEvaluation,
    UserPrediction,
)
from footintel.db.session import session_scope
from footintel.predictions.service import as_utc, kickoff_deadline

log = logging.getLogger(__name__)

EPS = 1e-15


@dataclass
class EvalSummary:
    model_rows: int = 0
    market_rows: int = 0
    user_rows: int = 0
    ignored_late: int = 0


def _ll(p: float | None) -> float | None:
    return None if p is None else -math.log(max(p, EPS))


def _eval_row(match_id, kind, ref, model_name, market, probs: dict[str, float], actual: str):
    """probs: outcome -> probability. Brier is summed over outcomes."""
    p_actual = probs.get(actual)
    brier = sum((p - (1.0 if k == actual else 0.0)) ** 2 for k, p in probs.items())
    predicted = max(probs, key=probs.get)
    return PredictionEvaluation(match_id=match_id, predictor_kind=kind, predictor_ref=ref,
                                model_name=model_name, market=market,
                                probability_of_outcome=p_actual, log_loss=_ll(p_actual),
                                brier=brier, correct=predicted == actual)


def evaluate_finished(engine: Engine) -> EvalSummary:
    """Idempotent: a (predictor, market) pair is scored only once."""
    summary = EvalSummary()
    with session_scope(engine) as s:
        done = set(s.execute(select(PredictionEvaluation.predictor_kind,
                                    PredictionEvaluation.predictor_ref,
                                    PredictionEvaluation.market)).all())
        rows = s.execute(
            select(Match, MatchOutcome)
            .join(MatchOutcome, MatchOutcome.match_id == Match.id)
            .where(MatchOutcome.is_final.is_(True),
                   Match.id.in_(select(Prediction.match_id).union(
                       select(UserPrediction.match_id))))
        ).all()
        for match, outcome in rows:
            deadline = kickoff_deadline(match.kickoff_utc, match.kickoff_date)
            total = outcome.home_goals + outcome.away_goals
            actual_1x2 = outcome.result
            actual_ou = "over" if total > 2.5 else "under"
            actual_btts = "yes" if outcome.home_goals > 0 and outcome.away_goals > 0 else "no"

            # Latest pre-kick-off prediction per model version.
            preds = s.scalars(select(Prediction).where(Prediction.match_id == match.id)
                              .order_by(Prediction.predicted_at.desc())).all()
            seen_versions = set()
            for pred in preds:
                if as_utc(pred.predicted_at) >= deadline:
                    summary.ignored_late += 1
                    continue
                if pred.model_version_id in seen_versions:
                    continue
                seen_versions.add(pred.model_version_id)
                mv = s.get(ModelVersion, pred.model_version_id)
                label = f"{mv.name}:v{mv.version}"
                todo = [
                    ("1X2", {"H": pred.p_home, "D": pred.p_draw, "A": pred.p_away}, actual_1x2),
                ]
                if pred.p_over_2_5 is not None:
                    todo.append(("OU2.5", {"over": pred.p_over_2_5, "under": 1 - pred.p_over_2_5},
                                 actual_ou))
                if pred.p_btts is not None:
                    todo.append(("BTTS", {"yes": pred.p_btts, "no": 1 - pred.p_btts}, actual_btts))
                for market, probs, actual in todo:
                    if ("model", pred.id, market) not in done:
                        s.add(_eval_row(match.id, "model", pred.id, label, market, probs, actual))
                        done.add(("model", pred.id, market))
                        summary.model_rows += 1
                snap = pred.feature_snapshot or {}
                mkt = [snap.get("mkt_p_home"), snap.get("mkt_p_draw"), snap.get("mkt_p_away")]
                if all(v is not None for v in mkt) and ("market", pred.id, "1X2") not in done:
                    s.add(_eval_row(match.id, "market", pred.id, "market_implied", "1X2",
                                    dict(zip("HDA", mkt, strict=True)), actual_1x2))
                    done.add(("market", pred.id, "1X2"))
                    summary.market_rows += 1

            # Latest user prediction submitted before kick-off, per user.
            users = s.scalars(select(UserPrediction).where(UserPrediction.match_id == match.id)
                              .order_by(UserPrediction.submitted_at.desc())).all()
            seen_users = set()
            for up in users:
                if as_utc(up.submitted_at) >= deadline:
                    summary.ignored_late += 1
                    continue
                if up.user_label in seen_users:
                    continue
                seen_users.add(up.user_label)
                # A pick has no probability: only correctness is scored for now.
                checks = [("1X2", up.pick == actual_1x2)]
                if up.over_2_5 is not None:
                    checks.append(("OU2.5", up.over_2_5 == (actual_ou == "over")))
                if up.btts is not None:
                    checks.append(("BTTS", up.btts == (actual_btts == "yes")))
                for market, correct in checks:
                    if ("user", up.id, market) not in done:
                        s.add(PredictionEvaluation(match_id=match.id, predictor_kind="user",
                                                   predictor_ref=up.id, model_name=up.user_label,
                                                   market=market, correct=correct))
                        done.add(("user", up.id, market))
                        summary.user_rows += 1
    log.info("Evaluation: %d model, %d market, %d user rows; %d late predictions ignored",
             summary.model_rows, summary.market_rows, summary.user_rows, summary.ignored_late)
    return summary
