"""Model versions: train, store, promote with predefined criteria, roll back."""

import hashlib
import logging
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path

import joblib
import pandas as pd
from sqlalchemy import Engine, func, select

from footintel.config import PromotionCriteria, Settings
from footintel.db.models import ModelVersion, TrainingRun
from footintel.db.session import session_scope
from footintel.evaluation.backtest import finished, paired_logloss, walk_forward
from footintel.models.base import ProbModel
from footintel.models.zoo import REFERENCE_MODELS, build

log = logging.getLogger(__name__)


def _sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def train_version(engine: Engine, settings: Settings, features: pd.DataFrame, name: str) -> int:
    """Fit `name` on all finished matches after the warm-up season. Status: candidate."""
    if name in REFERENCE_MODELS:
        raise ValueError(f"{name} is a reference model and is not deployed")
    data = finished(features)
    data = data[data["season"] > data["season"].min()]
    started = datetime.now(UTC)
    with session_scope(engine) as s:
        run = TrainingRun(kind="fit", started_at=started, status="running", config={"model": name})
        s.add(run)
        s.flush()
        run_id = run.id
    model = build(name).fit(data)
    with session_scope(engine) as s:
        version = (s.scalar(select(func.max(ModelVersion.version))
                            .where(ModelVersion.name == name)) or 0) + 1
        path = Path(settings.artifacts_dir) / name / f"v{version}.joblib"
        path.parent.mkdir(parents=True, exist_ok=True)
        joblib.dump(model, path)
        trained_until = pd.to_datetime(data["kickoff_date"]).max().date()
        mv = ModelVersion(name=name, version=version, family=model.family, status="candidate",
                          params=model.params(), features=list(model.features),
                          artifact_path=str(path), artifact_sha256=_sha256(path),
                          trained_until=trained_until, n_train=len(data), training_run_id=run_id)
        s.add(mv)
        r = s.get(TrainingRun, run_id)
        r.status, r.finished_at = "success", datetime.now(UTC)
        r.n_matches, r.data_until = len(data), trained_until
        s.flush()
        log.info("Trained %s v%d on %d matches (until %s)", name, version, len(data), trained_until)
        return mv.id


def load_model(mv: ModelVersion) -> ProbModel:
    path = Path(mv.artifact_path)
    if _sha256(path) != mv.artifact_sha256:
        raise RuntimeError(f"Artifact {path} does not match its recorded checksum")
    return joblib.load(path)


def active_version(engine: Engine, name: str | None = None) -> ModelVersion | None:
    with session_scope(engine) as s:
        q = select(ModelVersion).where(ModelVersion.status == "active")
        if name:
            q = q.where(ModelVersion.name == name)
        return s.scalars(q.order_by(ModelVersion.promoted_at.desc())).first()


@dataclass
class PromotionDecision:
    promoted: bool
    reason: str
    comparison: dict


def evaluate_promotion(features: pd.DataFrame, candidate_name: str, reference_name: str,
                       test_seasons: list[int], criteria: PromotionCriteria) -> PromotionDecision:
    """Paired walk-forward comparison on identical folds. Criteria are fixed in config."""
    names = [candidate_name] if candidate_name == reference_name else [candidate_name, reference_name]
    preds = walk_forward(features, names, test_seasons)
    if candidate_name == reference_name:
        return PromotionDecision(False, "candidate and reference are the same configuration", {})
    return decide(preds, candidate_name, reference_name, criteria)


def decide(preds: pd.DataFrame, candidate_name: str, reference_name: str,
           criteria: PromotionCriteria) -> PromotionDecision:
    """Apply the fixed promotion rules to walk-forward predictions of both models."""
    cmp = paired_logloss(preds, candidate_name, reference_name, criteria.bootstrap_samples)
    if cmp["n"] < criteria.min_test_matches:
        return PromotionDecision(False, f"only {cmp['n']} test matches "
                                 f"(< {criteria.min_test_matches})", cmp)
    if -cmp["mean_diff"] < criteria.min_logloss_improvement:
        if criteria.goals_secondary and cmp["mean_diff"] <= criteria.max_1x2_degradation:
            g = paired_goal_logloss(preds, candidate_name, reference_name, criteria.bootstrap_samples)
            cmp["goals_ou25"] = g
            if g.get("n", 0) >= criteria.min_test_matches and \
                    -g["mean_diff"] >= criteria.min_goal_improvement and g["ci_high"] < 0:
                return PromotionDecision(True, f"1X2 not degraded ({cmp['mean_diff']:+.4f}); "
                                         f"over/under 2.5 log loss gain {-g['mean_diff']:.4f}, CI "
                                         f"[{g['ci_low']:.4f}, {g['ci_high']:.4f}]", cmp)
        return PromotionDecision(False, f"log loss gain {-cmp['mean_diff']:.4f} below "
                                 f"{criteria.min_logloss_improvement}", cmp)
    if criteria.require_ci_below_zero and not cmp["ci_high"] < 0:
        return PromotionDecision(False, f"95% CI of the difference [{cmp['ci_low']:.4f}, "
                                 f"{cmp['ci_high']:.4f}] includes 0", cmp)
    return PromotionDecision(True, f"log loss gain {-cmp['mean_diff']:.4f}, CI "
                             f"[{cmp['ci_low']:.4f}, {cmp['ci_high']:.4f}]", cmp)


def paired_goal_logloss(preds: pd.DataFrame, candidate: str, reference: str,
                        samples: int) -> dict:
    """Paired over/under 2.5 log loss difference on matches both models priced."""
    from footintel.evaluation import metrics as M

    a = preds[preds["model"] == candidate].dropna(subset=["p_over_2_5"]).set_index("match_id")
    b = preds[preds["model"] == reference].dropna(subset=["p_over_2_5"]).set_index("match_id")
    common = a.index.intersection(b.index)
    if len(common) == 0:
        return {"n": 0}
    y = ((a.loc[common, "home_goals"] + a.loc[common, "away_goals"]) > 2.5).astype(float).to_numpy()
    diff = (M.binary_log_loss(a.loc[common, "p_over_2_5"].to_numpy(), y)
            - M.binary_log_loss(b.loc[common, "p_over_2_5"].to_numpy(), y))
    lo, hi = M.bootstrap_mean_ci(diff, samples=samples)
    return {"n": int(len(common)), "mean_diff": float(diff.mean()), "ci_low": lo, "ci_high": hi}


def promote(engine: Engine, features: pd.DataFrame, version_id: int, test_seasons: list[int],
            criteria: PromotionCriteria) -> PromotionDecision:
    """Promote a candidate if it beats the active model (or the naive baseline if none)."""
    with session_scope(engine) as s:
        cand = s.get(ModelVersion, version_id)
        if cand is None or cand.status != "candidate":
            raise ValueError(f"Version {version_id} is not a candidate")
        current = s.scalars(select(ModelVersion).where(ModelVersion.status == "active")).first()
        reference = current.name if current else "naive_frequency"
        cand_name = cand.name
    decision = evaluate_promotion(features, cand_name, reference, test_seasons, criteria)
    if current is not None and current.name == cand_name and not decision.comparison:
        # Same configuration retrained on newer data: identical folds would give identical
        # predictions, so the retrained version must still beat the naive baseline.
        reference = "naive_frequency"
        decision = evaluate_promotion(features, cand_name, reference, test_seasons, criteria)
    now = datetime.now(UTC)
    with session_scope(engine) as s:
        cand = s.get(ModelVersion, version_id)
        cand.decision_note = f"vs {reference}: {decision.reason}"
        if decision.promoted:
            for old in s.scalars(select(ModelVersion).where(ModelVersion.status == "active")):
                old.status, old.retired_at = "retired", now
            cand.status, cand.promoted_at = "active", now
        else:
            cand.status = "rejected"
    log.info("Promotion of version %d: %s (%s)", version_id,
             "ACCEPTED" if decision.promoted else "REJECTED", decision.reason)
    return decision


def rollback(engine: Engine) -> ModelVersion:
    """Reactivate the most recently retired version and retire the current active one."""
    now = datetime.now(UTC)
    with session_scope(engine) as s:
        previous = s.scalars(select(ModelVersion).where(ModelVersion.status == "retired")
                             .order_by(ModelVersion.retired_at.desc())).first()
        if previous is None:
            raise ValueError("No retired version to roll back to")
        for cur in s.scalars(select(ModelVersion).where(ModelVersion.status == "active")):
            cur.status, cur.retired_at = "retired", now
            cur.decision_note = (cur.decision_note or "") + f" | rolled back at {now:%Y-%m-%d %H:%M}"
        previous.status, previous.promoted_at, previous.retired_at = "active", now, None
        s.flush()
        return previous
