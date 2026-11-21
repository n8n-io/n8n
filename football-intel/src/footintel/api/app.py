"""HTTP API. Read endpoints are open on the bind address; write endpoints need ADMIN_TOKEN.

Bind to 127.0.0.1 (default) unless a reverse proxy with TLS is in front.
"""

from datetime import UTC, datetime

from fastapi import Depends, FastAPI, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import text

from footintel.config import get_settings
from footintel.db.session import get_engine
from footintel.api.security import require_admin
from footintel.predictions.service import PredictionRefused, submit_user_prediction

app = FastAPI(title="footintel", version="0.1.0")

from pathlib import Path  # noqa: E402

from fastapi.responses import RedirectResponse  # noqa: E402
from fastapi.staticfiles import StaticFiles  # noqa: E402

from footintel.api.admin import router as admin_router  # noqa: E402
from footintel.api.dashboard import router as dashboard_router  # noqa: E402

app.include_router(dashboard_router)
app.include_router(admin_router)
app.mount("/dashboard", StaticFiles(directory=Path(__file__).parent / "static", html=True),
          name="dashboard")


@app.get("/", include_in_schema=False)
def root() -> RedirectResponse:
    return RedirectResponse("/dashboard/")




class UserPredictionIn(BaseModel):
    match_id: int
    pick: str = Field(pattern="^[HDA]$")
    confidence: int = Field(ge=1, le=5)
    home_goals: int | None = Field(default=None, ge=0, le=20)
    away_goals: int | None = Field(default=None, ge=0, le=20)
    over_2_5: bool | None = None
    btts: bool | None = None
    reasoning: str | None = Field(default=None, max_length=5000)


def _rows(sql: str, **params) -> list[dict]:
    with get_engine().connect() as conn:
        return [dict(r) for r in conn.execute(text(sql), params).mappings().all()]


@app.get("/health")
def health() -> dict:
    _rows("SELECT 1")
    return {"status": "ok", "time": datetime.now(UTC)}


@app.get("/api/status")
def status() -> dict:
    s = get_settings()
    return {
        "sources": _rows("SELECT code, name, enabled, terms_note FROM data_sources"),
        "api_football_configured": s.api_football_enabled,
        "active_models": _rows("SELECT name, version, promoted_at, trained_until, decision_note "
                               "FROM model_versions WHERE status = 'active'"),
        "last_runs": _rows("SELECT DISTINCT ON (job_name) job_name, status, started_at, "
                           "finished_at, rows_inserted, rows_updated FROM collection_runs "
                           "ORDER BY job_name, started_at DESC"),
    }


@app.get("/api/matches/upcoming")
def upcoming(days: int = 7) -> list[dict]:
    return _rows("""
        SELECT m.id AS match_id, m.kickoff_date, m.kickoff_utc, c.code AS competition,
               th.name AS home_team, ta.name AS away_team
        FROM matches m JOIN competitions c ON c.id = m.competition_id
        JOIN teams th ON th.id = m.home_team_id JOIN teams ta ON ta.id = m.away_team_id
        WHERE m.status = 'scheduled' AND m.kickoff_date BETWEEN CURRENT_DATE
              AND CURRENT_DATE + make_interval(days => :days)
        ORDER BY m.kickoff_date, m.kickoff_utc""", days=days)


@app.get("/api/matches/{match_id}/predictions")
def match_predictions(match_id: int) -> list[dict]:
    return _rows("""
        SELECT p.predicted_at, mv.name AS model, mv.version, p.p_home, p.p_draw, p.p_away,
               p.p_over_2_5, p.p_btts, p.exp_home_goals, p.exp_away_goals,
               p.sufficient_data, p.data_quality
        FROM predictions p JOIN model_versions mv ON mv.id = p.model_version_id
        WHERE p.match_id = :m ORDER BY p.predicted_at DESC""", m=match_id)


@app.get("/api/metrics/backtest")
def backtest_metrics() -> list[dict]:
    return _rows("""
        SELECT model_name, segment, metric, value, n, ci_low, ci_high
        FROM model_metrics
        WHERE training_run_id = (SELECT max(id) FROM training_runs
                                 WHERE kind = 'backtest' AND status = 'success')
        ORDER BY model_name, segment, metric""")


@app.post("/api/user-predictions", dependencies=[Depends(require_admin)], status_code=201)
def create_user_prediction(body: UserPredictionIn) -> dict:
    try:
        pid = submit_user_prediction(get_engine(), body.match_id, body.pick, body.confidence,
                                     home_goals=body.home_goals, away_goals=body.away_goals,
                                     over_2_5=body.over_2_5, btts=body.btts,
                                     reasoning=body.reasoning)
    except PredictionRefused as exc:
        raise HTTPException(409, str(exc)) from exc
    return {"id": pid}
