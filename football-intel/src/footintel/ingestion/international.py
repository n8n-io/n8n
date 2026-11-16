"""National teams (D82): the teams from the international results file, and their forecasts.

`sync_international` refreshes the results file and makes sure each national team active
since 2014 has a team row, linked to its name in the file. `predict_national` rates every
national team over the whole history, adds the results that OneFootball already shows but
the file does not have yet, and stores a forecast for each upcoming national-team match.
"""

import logging
from datetime import UTC, datetime
from pathlib import Path

import pandas as pd
from sqlalchemy import Engine, select, text

from footintel.catalog import INTERNATIONAL, get_source
from footintel.config import Settings
from footintel.connectors import international as intl
from footintel.db.models import ModelVersion, Prediction, Team, TeamAlias
from footintel.db.session import session_scope
from footintel.jobs import RunStats, tracked_run
from footintel.models import national
from footintel.predictions.service import PREDICT_DAYS, PredictSummary

log = logging.getLogger(__name__)

NATIONAL_COUNTRY = "International"  # Team.country of every national team
ACTIVE_SINCE = "2014-01-01"
MODEL_NAME = "national_elo"


def sync_international(engine: Engine, settings: Settings) -> RunStats:
    with session_scope(engine) as s:
        source_id = get_source(s, INTERNATIONAL).id
    with tracked_run(engine, "sync_international", source_id=source_id) as stats:
        df = intl.load(intl.download(settings))
        recent = df[df["date"] >= pd.Timestamp(ACTIVE_SINCE)]
        names = sorted(set(recent["home"]) | set(recent["away"]))
        with session_scope(engine) as s:
            known = dict(s.execute(select(TeamAlias.alias, TeamAlias.team_id)
                                   .where(TeamAlias.source_id == source_id)).all())
            for name in names:
                if name in known:
                    stats.skipped += 1
                    continue
                team = s.scalar(select(Team).where(Team.name == name))
                if team is not None and team.country != NATIONAL_COUNTRY:
                    # A club already has the name (FC Andorra): the national team gets its own row.
                    label = f"{name} (sélection)"
                    stats.issue("info", "name_taken", f"{name!r} is a club: national team stored as {label!r}")
                    team = s.scalar(select(Team).where(Team.name == label))
                    name_in_db = label
                else:
                    name_in_db = name
                if team is None:
                    team = Team(name=name_in_db, country=NATIONAL_COUNTRY)
                    s.add(team)
                    s.flush()
                    stats.inserted += 1
                s.add(TeamAlias(team_id=team.id, source_id=source_id, alias=name))
        log.info("international: %d matches in the file, %d national teams", len(df), len(names))
    return stats


_DB_MATCHES = text("""
    SELECT m.id, m.kickoff_date, m.kickoff_utc, m.status, m.neutral_venue, c.code, c.is_target,
           m.home_team_id, m.away_team_id, o.home_goals, o.away_goals
    FROM matches m JOIN competitions c ON c.id = m.competition_id
    LEFT JOIN match_outcomes o ON o.match_id = m.id
    WHERE c.type = 'national' AND m.status IN ('scheduled', 'finished')""")


def _history(file: pd.DataFrame, db: pd.DataFrame) -> pd.DataFrame:
    """The file, plus the finished database matches it does not hold yet (no same pairing
    within two days), so a result shown by OneFootball counts before the file is updated."""
    done = db[db["home_goals"].notna()]
    if done.empty:
        return file
    seen = {(h, a, d + pd.Timedelta(days=k)) for h, a, d in zip(file["home"], file["away"], file["date"], strict=True)
            if d >= done["date"].min() - pd.Timedelta(days=2) for k in range(-2, 3)}
    extra = done[[(h, a, d) not in seen for h, a, d in zip(done["home"], done["away"], done["date"], strict=True)]]
    cols = ["date", "home", "away", "home_goals", "away_goals", "kind", "neutral"]
    return pd.concat([file, extra[cols]], ignore_index=True)


def _version(s) -> ModelVersion:
    """The model version row of the national forecasts. Never "active": the club model keeps
    that status, and the dashboard shows the latest forecast of each match whatever its model."""
    mv = s.scalar(select(ModelVersion).where(ModelVersion.name == MODEL_NAME))
    if mv is None:
        mv = ModelVersion(name=MODEL_NAME, version=1, family="elo", status="companion",
                          params={"home_advantage": national.HOME_ADVANTAGE, "draw_boost": national.DRAW_BOOST,
                                  "k_by_kind": national.K_BY_KIND, "fit_years": national.FIT_YEARS},
                          features=["elo_home", "elo_away", "neutral"], artifact_path="(computed each run)",
                          artifact_sha256="-", decision_note="D82: national teams, own Elo model")
        s.add(mv)
        s.flush()
    return mv


def predict_national(engine: Engine, settings: Settings, horizon_days: int = PREDICT_DAYS,
                     now: datetime | None = None) -> PredictSummary:
    now = now or datetime.now(UTC)
    summary = PredictSummary(model=f"{MODEL_NAME} v1")
    # sync_international refreshes the file first; this step only reads the local copy.
    file = intl.load(Path(settings.data_dir) / "international")
    with session_scope(engine) as s:
        source_id = get_source(s, INTERNATIONAL).id
        name_of = {tid: alias for alias, tid in s.execute(
            select(TeamAlias.alias, TeamAlias.team_id).where(TeamAlias.source_id == source_id)).all()}
    with engine.connect() as conn:
        db = pd.read_sql(_DB_MATCHES, conn)
    if db.empty:
        log.info("No national-team match in the database")
        return summary
    db["home"], db["away"] = db["home_team_id"].map(name_of), db["away_team_id"].map(name_of)
    db = db.dropna(subset=["home", "away"])
    db["date"] = pd.to_datetime(db["kickoff_date"])
    db["kind"] = db["code"].map(intl.KIND_BY_CODE).fillna("tournament")
    db["neutral"] = db["neutral_venue"].fillna(False).astype(bool)

    rated, elo = national.ratings(_history(file, db))
    model = national.fit(rated)
    kickoff = pd.to_datetime(db["kickoff_utc"], utc=True)
    upcoming = db[(db["status"] == "scheduled") & db["is_target"].astype(bool)
                  & (kickoff.isna() | (kickoff > now)) & (db["date"] <= pd.Timestamp(now.date()) + pd.Timedelta(days=horizon_days))
                  & (db["date"] >= pd.Timestamp(now.date()))]
    if upcoming.empty:
        return summary
    probs = national.predict(model, elo, upcoming)
    with session_scope(engine) as s:
        mv = _version(s)
        for idx, row in upcoming.iterrows():
            p = probs.loc[idx]
            snapshot = {"elo_home": round(float(p["elo_home"]), 1), "elo_away": round(float(p["elo_away"]), 1),
                        "neutral": bool(row["neutral"]), "goal_model": [round(c, 4) for c in model.coef]}
            latest = s.scalars(select(Prediction).where(Prediction.match_id == int(row["id"]),
                                                        Prediction.model_version_id == mv.id)
                               .order_by(Prediction.predicted_at.desc())).first()
            if latest is not None and latest.feature_snapshot == snapshot:
                summary.unchanged += 1
                continue
            s.add(Prediction(match_id=int(row["id"]), model_version_id=mv.id, predicted_at=now,
                             feature_snapshot=snapshot, data_quality={"sufficient": True, "source": "national_elo"},
                             sufficient_data=True,
                             **{c: float(p[c]) for c in ("p_home", "p_draw", "p_away", "p_over_1_5", "p_over_2_5",
                                                         "p_over_3_5", "p_btts", "exp_home_goals", "exp_away_goals")}))
            summary.created += 1
    log.info("National forecasts: %d new, %d unchanged", summary.created, summary.unchanged)
    return summary

