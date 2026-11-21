"""Administration and personal-prediction endpoints.

Reads expose no secret: keys are reported as configured or not, never shown.
Every write needs the ADMIN_TOKEN bearer token (see app.require_admin).
"""

import logging
import threading
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import text

from footintel.api.security import require_admin
from footintel.config import get_settings
from footintel.db.session import get_engine
from footintel.jobs import JobAlreadyRunning

log = logging.getLogger(__name__)
router = APIRouter(prefix="/api/admin", tags=["admin"])

CYCLES = ("morning", "evening", "nightly", "weekly")
_running: dict[str, dict] = {}


def _rows(sql: str, **params) -> list[dict]:
    from footintel.api.dashboard import _rows as dash_rows

    return dash_rows(sql, **params)


@router.get("/overview")
def admin_overview() -> dict:
    import os

    from footintel.scheduler import DEFAULT_SCHEDULE

    s = get_settings()
    secrets = {
        "API_FOOTBALL_KEY": s.api_football_enabled,
        "FOOTBALL_DATA_ORG_KEY": s.football_data_org_enabled,
        "ODDS_API_KEY": s.odds_api_enabled,
        "ADMIN_TOKEN": bool(s.admin_token and s.admin_token.get_secret_value()),
        "TELEGRAM_BOT_TOKEN": bool(s.telegram_bot_token and s.telegram_bot_token.get_secret_value()),
        "TELEGRAM_CHAT_ID": bool(s.telegram_chat_id),
    }
    schedule = {name: os.environ.get(f"SCHEDULE_{name.upper()}", expr)
                for name, expr in DEFAULT_SCHEDULE.items()}
    return {
        "secrets": secrets,
        "timezone": s.timezone,
        "schedule": schedule,
        "sources": _rows("SELECT code, name, kind, enabled, terms_url, terms_note FROM data_sources ORDER BY id"),
        "jobs": _rows("""SELECT name, last_started_at, last_finished_at, last_status,
                                lock_owner IS NOT NULL AS locked, lock_expires_at
                         FROM scheduled_jobs ORDER BY last_started_at DESC NULLS LAST"""),
        "runs": _rows("""SELECT id, job_name, status, started_at, finished_at, rows_inserted, rows_updated,
                                rows_skipped, error FROM collection_runs ORDER BY id DESC LIMIT 40"""),
        "training": _rows("""SELECT id, kind, status, started_at, finished_at, n_matches, error
                             FROM training_runs ORDER BY id DESC LIMIT 20"""),
        "issues": _rows("""SELECT i.severity, i.code, i.message, i.created_at FROM data_quality_issues i
                           ORDER BY i.id DESC LIMIT 60"""),
        "competitions": _rows("""SELECT c.code, c.name, c.type, c.is_target, c.active,
                                        (SELECT count(*) FROM matches m WHERE m.competition_id = c.id) AS matches
                                 FROM competitions c ORDER BY c.is_target DESC, c.code"""),
        "models": _rows("""SELECT id, name, version, status, promoted_at, trained_until, decision_note
                           FROM model_versions ORDER BY id DESC"""),
        "promotion": get_settings().promotion.model_dump(),
        "running": _running,
    }


def _run_cycle(cycle: str) -> None:
    from footintel import pipeline

    _running[cycle] = {"started_at": datetime.now(UTC).isoformat(), "status": "running"}
    try:
        result = getattr(pipeline, cycle)(get_engine(), get_settings())
        _running[cycle] = {**_running[cycle], "status": "finished",
                           "finished_at": datetime.now(UTC).isoformat(),
                           "result": {k: str(v)[:300] for k, v in result.items()}}
    except JobAlreadyRunning as exc:
        _running[cycle] = {**_running[cycle], "status": "skipped", "error": str(exc)}
    except Exception as exc:  # noqa: BLE001 - reported to the admin page
        log.exception("Cycle %s failed", cycle)
        _running[cycle] = {**_running[cycle], "status": "failed", "error": str(exc)[:500]}


@router.post("/run/{cycle}", status_code=202, dependencies=[Depends(require_admin)])
def run_cycle(cycle: str) -> dict:
    if cycle not in CYCLES:
        raise HTTPException(404, "unknown cycle")
    if _running.get(cycle, {}).get("status") == "running":
        raise HTTPException(409, f"{cycle} is already running")
    threading.Thread(target=_run_cycle, args=(cycle,), daemon=True).start()
    return {"cycle": cycle, "status": "started"}


@router.post("/models/rollback", dependencies=[Depends(require_admin)])
def models_rollback() -> dict:
    from footintel.models.registry import rollback

    try:
        mv = rollback(get_engine())
    except ValueError as exc:
        raise HTTPException(409, str(exc)) from exc
    return {"active": f"{mv.name} v{mv.version}"}


class CompetitionToggle(BaseModel):
    active: bool


@router.patch("/competitions/{code}", dependencies=[Depends(require_admin)])
def toggle_competition(code: str, body: CompetitionToggle) -> dict:
    with get_engine().begin() as conn:
        n = conn.execute(text("UPDATE competitions SET active = :a WHERE code = :c"),
                         {"a": body.active, "c": code}).rowcount
    if n != 1:
        raise HTTPException(404, "unknown competition")
    return {"code": code, "active": body.active}


# --- Personal predictions ----------------------------------------------------------

@router.get("/user-predictions")
def user_predictions(user_label: str = "me") -> dict:
    """History of the user's picks with the model's pre-match view and the result."""
    rows = _rows("""
        SELECT up.id, up.match_id, up.pick, up.confidence, up.home_goals, up.away_goals, up.over_2_5,
               up.btts, up.reasoning, up.submitted_at, m.kickoff_date, m.kickoff_utc, c.code AS competition,
               th.name AS home, ta.name AS away, o.home_goals AS res_home, o.away_goals AS res_away,
               (SELECT row_to_json(p) FROM (SELECT p.p_home, p.p_draw, p.p_away, p.p_over_2_5, p.p_btts
                 FROM predictions p WHERE p.match_id = m.id AND p.predicted_at < COALESCE(m.kickoff_utc,
                 m.kickoff_date::timestamptz) ORDER BY p.predicted_at DESC LIMIT 1) p) AS model,
               (SELECT bool_and(e.correct) FROM prediction_evaluations e
                 WHERE e.predictor_kind = 'user' AND e.predictor_ref = up.id AND e.market = '1X2') AS correct
        FROM user_predictions up JOIN matches m ON m.id = up.match_id
        JOIN competitions c ON c.id = m.competition_id
        JOIN teams th ON th.id = m.home_team_id JOIN teams ta ON ta.id = m.away_team_id
        LEFT JOIN match_outcomes o ON o.match_id = m.id
        WHERE up.user_label = :u ORDER BY up.submitted_at DESC LIMIT 300""", u=user_label)
    summary = _rows("""
        SELECT e.predictor_kind, e.market, count(*) AS n, avg(e.correct::int) AS accuracy
        FROM prediction_evaluations e WHERE e.match_id IN (SELECT match_id FROM user_predictions
          WHERE user_label = :u) GROUP BY 1, 2 ORDER BY 1, 2""", u=user_label)
    from footintel.analysis.hybrid import MIN_PICKS, latest

    return {"rows": rows, "summary": summary,
            "hybrid": latest(get_engine(), user_label) or {"status": "not_run", "min_picks": MIN_PICKS}}
