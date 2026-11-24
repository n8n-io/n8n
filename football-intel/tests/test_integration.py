"""Integration tests on a real PostgreSQL test database, with SYNTHETIC data only."""

from datetime import UTC, date, datetime, timedelta

import pandas as pd
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select, text

from footintel.config import PromotionCriteria
from footintel.connectors.base import MatchRecord, OddsRecord, OutcomeRecord
from footintel.db.models import (
    CollectionRun,
    DataSource,
    Match,
    MatchExternalRef,
    MatchOutcome,
    ModelVersion,
    OddsSnapshot,
    Prediction,
    PredictionEvaluation,
)
from footintel.db.session import session_scope
from footintel.features.builder import build_features
from footintel.features.dataset import load_matches
from footintel.ingestion import tasks
from footintel.ingestion.store import MatchStore
from footintel.jobs import JobAlreadyRunning, RunStats, acquire_lock, release_lock
from footintel.models import registry
from footintel.postmatch.evaluate import evaluate_finished
from footintel.predictions.service import (
    PredictionRefused,
    predict_upcoming,
    submit_user_prediction,
)
from footintel.reports.daily import postmatch_report, prematch_report

from .conftest import FakeConnector, synthetic_season_records

LOW_BAR = PromotionCriteria(min_test_matches=20, min_logloss_improvement=-1.0,
                            require_ci_below_zero=False, bootstrap_samples=100)


def _count(engine, model) -> int:
    with session_scope(engine) as s:
        return s.scalar(select(func.count()).select_from(model))


def test_history_import_is_idempotent(db, settings):
    conn = FakeConnector({2020: synthetic_season_records(2020), 2021: synthetic_season_records(2021)})
    first = tasks.import_history(db, settings, 2020, 2021, ["ENG-PL"], connector=conn)
    second = tasks.import_history(db, settings, 2020, 2021, ["ENG-PL"], connector=conn)
    assert first.inserted == 112 and second.inserted == 0 and second.skipped == 112
    assert _count(db, Match) == 112 and _count(db, MatchOutcome) == 112
    assert _count(db, OddsSnapshot) == 112 * 3
    with session_scope(db) as s:
        runs = s.scalars(select(CollectionRun).order_by(CollectionRun.id)).all()
        assert [r.status for r in runs] == ["success", "success"]


def test_uncovered_competition_is_reported_not_faked(db, settings):
    st = tasks.import_history(db, settings, 2020, 2020, ["UEFA-CL"], connector=FakeConnector({}))
    assert st.inserted == 0 and any(code == "not_covered" for _, code, *_ in st.issues)


def test_rescheduled_fixture_updates_the_same_match(db, settings):
    rec = MatchRecord("football_data_uk", "E0|2030|Synthetic FC 0|Synthetic FC 1", "ENG-PL", 2030,
                      date(2030, 9, 1), None, "Synthetic FC 0", "Synthetic FC 1", "scheduled")
    tasks.sync_fixtures(db, settings, connector=FakeConnector({}, [rec]))
    rec.kickoff_date = date(2030, 9, 8)
    st = tasks.sync_fixtures(db, settings, connector=FakeConnector({}, [rec]))
    assert st.updated == 1 and _count(db, Match) == 1
    with session_scope(db) as s:
        assert s.scalars(select(Match)).one().kickoff_date == date(2030, 9, 8)


def test_job_lock_blocks_a_second_instance(db):
    owner = acquire_lock(db, "demo_job", timedelta(minutes=5))
    with pytest.raises(JobAlreadyRunning):
        acquire_lock(db, "demo_job", timedelta(minutes=5))
    release_lock(db, "demo_job", owner, "success")
    owner2 = acquire_lock(db, "demo_job", timedelta(minutes=5))
    release_lock(db, "demo_job", owner2, "success")
    # An expired lock (crashed process) can be taken over.
    acquire_lock(db, "stale_job", timedelta(seconds=-1))
    release_lock(db, "stale_job", acquire_lock(db, "stale_job", timedelta(minutes=1)), "success")


def _load_synthetic_history(db, settings, seasons=(2018, 2019, 2020, 2021, 2022)):
    conn = FakeConnector({y: synthetic_season_records(y, n_teams=10) for y in seasons})
    tasks.import_history(db, settings, min(seasons), max(seasons), ["ENG-PL"], connector=conn)


def test_end_to_end_prediction_loop(db, settings):
    """Acceptance path: import -> features -> train -> promote -> predict -> user pick
    -> result -> evaluation -> report -> second version -> rollback."""
    _load_synthetic_history(db, settings)
    feats = build_features(load_matches(db))
    v1 = registry.train_version(db, settings, feats, "logreg_market_goals")
    decision = registry.promote(db, feats, v1, [2021, 2022], LOW_BAR)
    assert decision.promoted, decision.reason

    now = datetime.now(UTC).replace(microsecond=0)
    kickoff = now + timedelta(days=2)
    fixture = MatchRecord(
        "football_data_uk", "E0|2023|Synthetic FC 1|Synthetic FC 2", "ENG-PL", 2023,
        kickoff.date(), kickoff, "Synthetic FC 1", "Synthetic FC 2", "scheduled",
        odds=[OddsRecord("market_avg", "1X2", s, p, "fixtures@test", now - timedelta(hours=1))
              for s, p in zip("HDA", (2.1, 3.4, 3.6), strict=True)])
    tasks.sync_fixtures(db, settings, connector=FakeConnector({}, [fixture]))

    first = predict_upcoming(db, settings, now=now)
    again = predict_upcoming(db, settings, now=now + timedelta(minutes=5))
    assert first.created == 1 and again.unchanged == 1
    with session_scope(db) as s:
        pred = s.scalars(select(Prediction)).one()
        assert abs(pred.p_home + pred.p_draw + pred.p_away - 1) < 1e-9
        assert pred.p_over_2_5 is not None and pred.feature_snapshot["odds_1x2"] == [2.1, 3.4, 3.6]
        assert pred.sufficient_data is True and pred.predicted_at < kickoff
        match_id = pred.match_id

    up_id = submit_user_prediction(db, match_id, "H", 4, home_goals=2, away_goals=1,
                                   over_2_5=True, btts=True, reasoning="test", now=now)
    assert up_id > 0
    with pytest.raises(PredictionRefused):
        submit_user_prediction(db, match_id, "A", 3, now=kickoff + timedelta(minutes=1))
    with pytest.raises(PredictionRefused):
        submit_user_prediction(db, match_id, "A", 3, home_goals=2, away_goals=0, now=now)

    # Out-of-distribution inputs (synthetic odds have a near-constant margin) must not
    # produce near-certain probabilities.
    assert max(pred.p_home, pred.p_draw, pred.p_away) < 0.95
    pre = prematch_report(db, settings, today=now.date()).markdown
    assert "| Synthetic FC 1 – Synthetic FC 2 |" in pre

    # The match is played: the result arrives with the next results sync.
    fixture.status, fixture.outcome = "finished", OutcomeRecord(2, 1, "H")
    tasks.sync_fixtures(db, settings, connector=FakeConnector({}, [fixture]))
    ev = evaluate_finished(db)
    assert ev.model_rows == 3 and ev.market_rows == 1 and ev.user_rows == 3
    assert evaluate_finished(db).model_rows == 0  # idempotent
    with session_scope(db) as s:
        row = s.scalars(select(PredictionEvaluation).where(
            PredictionEvaluation.predictor_kind == "model",
            PredictionEvaluation.market == "1X2")).one()
        assert row.log_loss > 0 and row.probability_of_outcome == pytest.approx(pred.p_home)

    report = postmatch_report(db, settings, kickoff.date() - timedelta(days=1), kickoff.date())
    assert "Synthetic FC 1" in report.markdown and report.paths["html"].exists()
    assert "trop petit pour conclure" in report.markdown

    # A second version that passes the bar replaces v1, and rollback restores v1.
    v2 = registry.train_version(db, settings, feats, "logreg_core_goals")
    registry.promote(db, feats, v2, [2021, 2022],
                     PromotionCriteria(min_test_matches=20, min_logloss_improvement=-1.0,
                                       require_ci_below_zero=False, bootstrap_samples=50))
    restored = registry.rollback(db)
    assert restored.id == v1
    with session_scope(db) as s:
        statuses = dict(s.execute(select(ModelVersion.id, ModelVersion.status)).all())
    assert statuses == {v1: "active", v2: "retired"}


def test_strict_criteria_reject_and_keep_the_active_model(db, settings):
    _load_synthetic_history(db, settings)
    feats = build_features(load_matches(db))
    v1 = registry.train_version(db, settings, feats, "logreg_market_goals")
    registry.promote(db, feats, v1, [2021, 2022], LOW_BAR)
    v2 = registry.train_version(db, settings, feats, "elo_poisson")
    # 180 test matches are below this predefined minimum, whatever the gain.
    strict = PromotionCriteria(min_test_matches=1000, min_logloss_improvement=0.002,
                               require_ci_below_zero=True, bootstrap_samples=100)
    decision = registry.promote(db, feats, v2, [2021, 2022], strict)
    assert not decision.promoted and "test matches" in decision.reason
    with session_scope(db) as s:
        assert s.get(ModelVersion, v1).status == "active"
        assert s.get(ModelVersion, v2).status == "rejected"


def test_no_active_model_means_no_prediction(db, settings):
    _load_synthetic_history(db, settings, seasons=(2020, 2021))
    assert predict_upcoming(db, settings).created == 0


def test_artifact_tampering_is_detected(db, settings):
    _load_synthetic_history(db, settings, seasons=(2020, 2021, 2022))
    feats = build_features(load_matches(db))
    vid = registry.train_version(db, settings, feats, "elo_poisson")
    with session_scope(db) as s:
        mv = s.get(ModelVersion, vid)
    with open(mv.artifact_path, "ab") as f:
        f.write(b"tampered")
    with pytest.raises(RuntimeError, match="checksum"):
        registry.load_model(mv)


def test_api_write_needs_the_admin_token(db, settings, monkeypatch):
    from footintel import config
    from footintel.api import app as api_module
    from footintel.db import session as session_module

    monkeypatch.setattr(config, "get_settings", lambda: settings)
    from footintel.api import security

    monkeypatch.setattr(api_module, "get_settings", lambda: settings)
    monkeypatch.setattr(security, "get_settings", lambda: settings)
    monkeypatch.setattr(api_module, "get_engine", lambda: db)
    monkeypatch.setattr(session_module, "get_engine", lambda url=None: db)
    client = TestClient(api_module.app)
    assert client.get("/health").status_code == 200
    body = {"match_id": 999, "pick": "H", "confidence": 3}
    assert client.post("/api/user-predictions", json=body).status_code == 401
    r = client.post("/api/user-predictions", json=body,
                    headers={"Authorization": "Bearer test-token"})
    assert r.status_code == 409 and "does not exist" in r.json()["detail"]
    # The dashboard header works next to a proxy password in Authorization.
    r = client.post("/api/user-predictions", json=body,
                    headers={"X-Admin-Token": "test-token", "Authorization": "Basic dXNlcjpwYXNz"})
    assert r.status_code == 409
    assert client.post("/api/user-predictions", json=body,
                       headers={"Authorization": "Basic dGVzdC10b2tlbg=="}).status_code == 401
    assert client.get("/api/status").json()["api_football_configured"] is False


class FakeOpenFootball:
    def __init__(self, files: dict[tuple[int, str], str]):
        self.files = files

    def fetch(self, start_year, filename, *, current_season):
        from footintel.connectors.http import SourceUnavailable
        from footintel.connectors.openfootball import parse_txt

        if (start_year, filename) not in self.files:
            raise SourceUnavailable("404")
        return parse_txt(self.files[(start_year, filename)], filename, start_year)


def test_european_import_maps_names_and_merges_manual_aliases(db, settings, monkeypatch, tmp_path):
    from footintel.db.models import Team
    from footintel.ingestion import teams as teams_mod

    # Domestic history gives the canonical names "Synthetic FC 0" ... "Synthetic FC 9".
    _load_synthetic_history(db, settings, seasons=(2020,))
    txt = """= UEFA Champions League 2020/21

▪ League, Matchday 1
  Tue Sep 15 2020
    21:00  Synthetic FC 1 (ENG)    v Synthetic Rovers (ENG)   2-0 (1-0)
"""
    conn = FakeOpenFootball({(2020, "cl.txt"): txt})
    alias_file = tmp_path / "aliases.csv"
    alias_file.write_text("source,alias,team\n", encoding="utf-8")
    monkeypatch.setattr(teams_mod, "ALIAS_FILE", alias_file)
    monkeypatch.setattr(teams_mod.load_manual_aliases, "__defaults__", (alias_file,))

    st = tasks.import_european(db, settings, 2020, 2020, connector=conn)
    assert st.inserted == 1
    assert any(code == "unmapped_team" for _, code, *_ in st.issues)
    assert any(code == "season_not_published" for _, code, *_ in st.issues)
    with session_scope(db) as s:
        assert s.scalars(select(Team).where(Team.name == "Synthetic Rovers (ENG)")).one()

    # A human adds the alias: the next run merges the placeholder into the real team.
    alias_file.write_text("source,alias,team\nopenfootball,Synthetic Rovers (ENG),Synthetic FC 7\n",
                          encoding="utf-8")
    st2 = tasks.import_european(db, settings, 2020, 2020, connector=conn)
    assert st2.inserted == 0
    with session_scope(db) as s:
        assert s.scalars(select(Team).where(Team.name == "Synthetic Rovers (ENG)")).first() is None
        m = s.scalars(select(Match).where(Match.competition.has(code="UEFA-CL"))).one()
        assert m.away_team.name == "Synthetic FC 7" and m.home_team.name == "Synthetic FC 1"


def test_prematch_sheet_lists_missing_data_instead_of_inventing_it(db, settings):
    from footintel.reports.fiche import match_sheet_markdown

    _load_synthetic_history(db, settings, seasons=(2020,))
    with session_scope(db) as s:
        match_id = s.scalars(select(Match.id).order_by(Match.kickoff_date.desc())).first()
    md = match_sheet_markdown(db, match_id)
    assert "Non disponible" in md and "formations" in md and "xG" in md
    assert "pressing haut" not in md.lower()


def test_competition_analysis_stores_profiles_and_patterns(db, settings):
    from footintel.analysis.competitions import run_analysis
    from footintel.db.models import CompetitionProfileMetric, DetectedPattern
    from footintel.reports.competitions import competition_report

    _load_synthetic_history(db, settings, seasons=(2016, 2017, 2018, 2019, 2020, 2021, 2022))
    feats = build_features(load_matches(db))
    res = run_analysis(db, feats, split_season=2021, last_complete_season=2022, min_train=100)
    assert len(res["tests"]) > 0
    with session_scope(db) as s:
        n_rows = s.scalar(select(func.count()).select_from(CompetitionProfileMetric))
        statuses = set(s.scalars(select(DetectedPattern.status)).all())
    assert n_rows > 100 and statuses <= {"hypothesis", "robust", "robust_not_confirmed",
                                         "validated_out_of_sample"}
    # A second run adds rows; it never rewrites the first run's values.
    run_analysis(db, feats, split_season=2021, last_complete_season=2022, min_train=100)
    with session_scope(db) as s:
        assert s.scalar(select(func.count()).select_from(CompetitionProfileMetric)) == 2 * n_rows
    report = competition_report(db, settings)
    assert "Premier League" in report.markdown and "FA Cup" in report.markdown
    assert "Aucune donnée" in report.markdown  # uncovered competitions are stated, not filled


def test_trend_run_and_report(db, settings):
    from footintel.analysis.trend_engine import run_trends
    from footintel.db.models import Trend
    from footintel.reports.trends import trends_report

    _load_synthetic_history(db, settings, seasons=(2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022))
    feats = build_features(load_matches(db))
    first = run_trends(db, feats)
    second = run_trends(db, feats)
    with session_scope(db) as s:
        counts = dict(s.execute(select(Trend.training_run_id, func.count())
                                .group_by(Trend.training_run_id)).all())
    assert counts[first["run_id"]] == counts[second["run_id"]] > 0  # insert-only snapshots
    rep = trends_report(db, settings, category="team")
    assert "[Fait]" in rep.markdown and "Non collecté" in rep.markdown
    assert "Changements tactiques documentés" in rep.markdown


def test_dashboard_endpoints(db, settings, monkeypatch):
    from footintel.api import app as api_module
    from footintel.api import dashboard

    _load_synthetic_history(db, settings, seasons=(2019, 2020, 2021))
    monkeypatch.setattr(dashboard, "get_engine", lambda: db)
    client = TestClient(api_module.app)
    assert client.get("/dashboard/").status_code == 200
    ov = client.get("/api/dash/overview").json()
    assert ov["counts"]["matches"] == 270 and "not_collected" in ov
    comp = client.get("/api/dash/competition/ENG-PL").json()
    assert comp["available"] and sum(s["n"] for s in comp["seasons"]) == 270
    assert all(0 <= s["over_2_5_ci"][0] <= s["over_2_5"] <= s["over_2_5_ci"][1] <= 1 for s in comp["seasons"])
    assert "goals_by_period" in comp["unavailable"]  # shown as missing, never as zero
    assert client.get("/api/dash/competition/ENG-FAC").json()["available"] is False
    cell = client.get("/api/dash/matches", params={"competition": "ENG-PL", "home_goals": 1, "away_goals": 1}).json()
    assert all(r["home_goals"] == 1 and r["away_goals"] == 1 for r in cell)
    team_id = client.get("/api/dash/teams", params={"competition": "ENG-PL"}).json()[0]["id"]
    team = client.get(f"/api/dash/team/{team_id}").json()
    assert team["series"] and team["tactics_available"] is False
    match = client.get(f"/api/dash/match/{cell[0]['id']}").json() if cell else None
    if match:
        assert match["prediction"] is None and len(match["sheets"]) == 2
    assert "versions" in client.get("/api/dash/performance").json()
    board = client.get("/api/dash/value-board").json()
    assert board["matches"] == [] and "1x2" in board["reliability"]
    assert client.get("/dashboard/value.html").status_code == 200


def test_admin_endpoints_hide_secrets_and_protect_writes(db, settings, monkeypatch):
    from footintel.api import admin, dashboard, security
    from footintel.api import app as api_module

    _load_synthetic_history(db, settings, seasons=(2020,))
    from pydantic import SecretStr

    settings = settings.model_copy(update={"telegram_bot_token": SecretStr("123456:" + "S" * 35)})
    for mod in (admin, security):
        monkeypatch.setattr(mod, "get_settings", lambda: settings)
    for mod in (admin, dashboard):
        monkeypatch.setattr(mod, "get_engine", lambda: db)
    client = TestClient(api_module.app)
    auth = {"Authorization": "Bearer test-token"}

    r = client.get("/api/admin/overview")
    assert r.status_code == 200
    assert r.json()["secrets"] == {"API_FOOTBALL_KEY": False, "FOOTBALL_DATA_ORG_KEY": False, "ODDS_API_KEY": False,
                                   "ADMIN_TOKEN": True,
                                   "TELEGRAM_BOT_TOKEN": True, "TELEGRAM_CHAT_ID": False}
    assert "S" * 35 not in r.text and "test-token" not in r.text

    assert client.post("/api/admin/run/weekly").status_code == 401
    assert client.post("/api/admin/run/unknown", headers=auth).status_code == 404
    assert client.patch("/api/admin/competitions/ENG-PL", json={"active": False}).status_code == 401
    assert client.patch("/api/admin/competitions/ENG-PL", json={"active": False},
                        headers=auth).json() == {"code": "ENG-PL", "active": False}
    with db.connect() as conn:
        assert conn.execute(text("SELECT active FROM competitions WHERE code = 'ENG-PL'")).scalar() is False
    assert client.patch("/api/admin/competitions/NOPE", json={"active": True}, headers=auth).status_code == 404
    assert client.post("/api/admin/models/rollback", headers=auth).status_code == 409  # nothing to roll back

    picks = client.get("/api/admin/user-predictions").json()
    assert picks["rows"] == [] and picks["hybrid"]["status"] == "not_run"


def test_weekly_report_and_hybrid_run_are_stored(db, settings):
    from footintel.analysis.hybrid import latest, run_hybrid
    from footintel.reports.weekly import weekly_report

    _load_synthetic_history(db, settings, seasons=(2020,))
    res = run_hybrid(db, "me", settings.promotion)
    assert res["status"] == "insufficient_data" and res["n_picks"] == 0
    assert latest(db, "me")["training_run_id"] == res["training_run_id"]
    rep = weekly_report(db, settings, end=date(2021, 6, 1))
    md = rep.paths["md"].read_text()
    assert md.startswith("#") and rep.paths["html"].exists() and rep.paths["csv"].exists()


class FakeOpenLigaDB:
    def __init__(self, matches: list[dict]):
        self.matches = matches

    def fetch(self, competition_code, season):
        from footintel.connectors.openligadb import parse_matches

        data = self.matches if competition_code == "UEFA-CL" else []
        return parse_matches(data, competition_code, season, "ucl")


def _oldb(mid, home, away, day, score=None):
    return {"matchID": mid, "matchDateTime": f"{day}T21:00:00", "matchDateTimeUTC": f"{day}T19:00:00Z",
            "matchIsFinished": score is not None, "group": {"groupName": "1.Spieltag"},
            "team1": {"teamName": home}, "team2": {"teamName": away},
            "matchResults": [{"resultTypeKind": "After90Minutes", "pointsTeam1": score[0],
                              "pointsTeam2": score[1]}] if score else [],
            "goals": []}


def test_openligadb_import_uses_manual_aliases_and_never_duplicates_a_match(db, settings, monkeypatch):
    from footintel.catalog import OPENFOOTBALL
    from footintel.ingestion import store as store_mod
    from footintel.ingestion import teams as teams_mod

    aliases = {("openligadb", "Synthetic Eins"): "Synthetic FC 1",
               ("openligadb", "Synthetic Zwei"): "Synthetic FC 2"}
    monkeypatch.setattr(store_mod, "load_manual_aliases", lambda: aliases)
    monkeypatch.setattr(teams_mod, "load_manual_aliases", lambda: aliases)
    _load_synthetic_history(db, settings, seasons=(2025,))
    # The same match, already known from openfootball.
    with session_scope(db) as s:
        MatchStore(s, OPENFOOTBALL).upsert(MatchRecord(
            source_code=OPENFOOTBALL, external_id="cl.txt|2026|2026-09-16|1|2",
            competition_code="UEFA-CL", season_start_year=2026, kickoff_date=date(2026, 9, 16),
            kickoff_utc=None, home_team="Synthetic FC 1 (ENG)", away_team="Synthetic FC 2 (ENG)",
            status="scheduled"), RunStats())

    def cl_matches():
        with db.connect() as conn:
            return conn.execute(text("""SELECT m.id, count(r.id) FROM matches m
                JOIN competitions c ON c.id = m.competition_id
                JOIN match_external_refs r ON r.match_id = m.id
                WHERE c.code = 'UEFA-CL' GROUP BY m.id ORDER BY m.id""")).all()

    feed = [_oldb(10, "Synthetic Eins", "Synthetic Zwei", "2026-09-16", (2, 1)),
            _oldb(11, "Unknown Club", "Synthetic Eins", "2026-10-01")]
    st = tasks.import_openligadb(db, settings, [2026], connector=FakeOpenLigaDB(feed))
    rows = cl_matches()
    assert len(rows) == 2 and rows[0][1] == 2  # first match: one match, two sources
    assert st.inserted == 1 and st.updated == 1
    assert any(i[1] == "unmapped_team" and "Unknown Club" in i[2] for i in st.issues)
    with db.connect() as conn:
        assert conn.execute(text("SELECT home_goals FROM match_outcomes WHERE match_id = :m"),
                            {"m": rows[0][0]}).scalar() == 2
    # Re-run: nothing new.
    assert tasks.import_openligadb(db, settings, [2026], connector=FakeOpenLigaDB(feed)).inserted == 0
    # A volunteer re-creates the first match under a new id: same match, old link dropped.
    feed[0] = _oldb(12, "Synthetic Eins", "Synthetic Zwei", "2026-09-16", (2, 1))
    tasks.import_openligadb(db, settings, [2026], connector=FakeOpenLigaDB(feed))
    assert cl_matches() == rows


class FakeFootballDataOrg:
    def __init__(self, matches: list[dict], league: list[dict] | None = None):
        self.data = {"UEFA-CL": {"matches": matches}, "ENG-PL": {"matches": league or []}}

    def fetch(self, competition_code, season):
        from footintel.connectors.football_data_org import parse_matches

        return parse_matches(self.data.get(competition_code, {"matches": []}), competition_code, season)


def _fdo(mid, home, away, day, score, ht):
    return {"id": mid, "utcDate": f"{day}T19:00:00Z", "status": "FINISHED", "matchday": 1,
            "stage": "LEAGUE_STAGE", "homeTeam": {"name": home}, "awayTeam": {"name": away},
            "score": {"duration": "REGULAR", "fullTime": {"home": score[0], "away": score[1]},
                      "halfTime": {"home": ht[0], "away": ht[1]}}}


def test_football_data_org_checks_results_without_creating_matches(db, settings, monkeypatch):
    from footintel.ingestion import store as store_mod
    from footintel.ingestion import teams as teams_mod

    aliases = {("openligadb", "Synthetic Eins"): "Synthetic FC 1",
               ("openligadb", "Synthetic Zwei"): "Synthetic FC 2",
               ("openligadb", "Synthetic Drei"): "Synthetic FC 3",
               ("football_data_org", "Synthetic One FC"): "Synthetic FC 1",
               ("football_data_org", "Synthetic Two FC"): "Synthetic FC 2",
               ("football_data_org", "Synthetic Three FC"): "Synthetic FC 3"}
    monkeypatch.setattr(store_mod, "load_manual_aliases", lambda: aliases)
    monkeypatch.setattr(teams_mod, "load_manual_aliases", lambda: aliases)
    _load_synthetic_history(db, settings, seasons=(2025,))
    oldb = [_oldb(10, "Synthetic Eins", "Synthetic Zwei", "2026-09-16", (1, 0)),
            _oldb(11, "Synthetic Drei", "Synthetic Eins", "2026-09-30")]
    tasks.import_openligadb(db, settings, [2026], connector=FakeOpenLigaDB(oldb))

    fdo = [_fdo(1, "Synthetic One FC", "Synthetic Two FC", "2026-09-16", (2, 0), (1, 0)),  # disagrees
           _fdo(2, "Synthetic Three FC", "Synthetic One FC", "2026-09-30", (1, 1), (0, 1)),  # fills
           _fdo(3, "Synthetic Two FC", "Synthetic Three FC", "2026-10-07", (0, 0), (0, 0)),  # unknown
           _fdo(4, "Nobody FC", "Synthetic One FC", "2026-10-21", (0, 3), (0, 1))]  # no alias
    st = tasks.check_football_data_org(db, settings, [2026], connector=FakeFootballDataOrg(fdo))
    codes = [i[1] for i in st.issues]
    assert st.inserted == 0 and codes.count("sources_disagree") == 1
    assert "match_not_found" in codes and "unmapped_team" in codes

    def score(home, away):
        with db.connect() as conn:
            return conn.execute(text("""SELECT o.home_goals, o.away_goals, d.code FROM matches m
                JOIN teams th ON th.id = m.home_team_id JOIN teams ta ON ta.id = m.away_team_id
                JOIN match_outcomes o ON o.match_id = m.id JOIN data_sources d ON d.id = o.source_id
                JOIN competitions c ON c.id = m.competition_id
                WHERE c.code = 'UEFA-CL' AND th.name = :h AND ta.name = :a"""), {"h": home, "a": away}).one()

    assert tuple(score("Synthetic FC 1", "Synthetic FC 2")) == (2, 0, "football_data_org")
    assert tuple(score("Synthetic FC 3", "Synthetic FC 1")) == (1, 1, "football_data_org")
    with db.connect() as conn:
        assert conn.execute(text("SELECT count(*) FROM teams WHERE name = 'Nobody FC'")).scalar() == 0
    # The volunteer source never overwrites the checked result.
    tasks.import_openligadb(db, settings, [2026], connector=FakeOpenLigaDB(oldb))
    assert tuple(score("Synthetic FC 1", "Synthetic FC 2")) == (2, 0, "football_data_org")


def test_stories_run_stores_scenarios_and_stories(db, settings):
    from footintel.analysis.stories import run_stories
    from footintel.reports.stories import stories_report

    _load_synthetic_history(db, settings, seasons=(2019, 2020, 2021))
    feats = build_features(load_matches(db))
    last = pd.to_datetime(feats.loc[feats["home_goals"].notna(), "kickoff_date"]).max().date()
    res = run_stories(db, feats, days=14, today=last)
    assert res["stories"] and all(s["narrative"] for s in res["stories"])
    with db.connect() as conn:
        n_st = conn.execute(text("SELECT count(*) FROM match_stories WHERE training_run_id = :r"),
                            {"r": res["run_id"]}).scalar()
        n_sc = conn.execute(text("SELECT count(DISTINCT scenario) FROM scenario_stats WHERE training_run_id = :r"),
                            {"r": res["run_id"]}).scalar()
    assert n_st == len(res["stories"]) and n_sc >= 1
    md = stories_report(db, settings, res, today=last).paths["md"].read_text()
    assert "Scénarios récurrents" in md and "Histoires des matchs" in md and "OpenLigaDB" in md


def test_football_data_org_adds_league_fixtures_once(db, settings, monkeypatch):
    from footintel.ingestion import store as store_mod
    from footintel.ingestion import teams as teams_mod

    aliases = {("football_data_org", "Synthetic One FC"): "Synthetic FC 1",
               ("football_data_org", "Synthetic Two FC"): "Synthetic FC 2"}
    monkeypatch.setattr(store_mod, "load_manual_aliases", lambda: aliases)
    monkeypatch.setattr(teams_mod, "load_manual_aliases", lambda: aliases)
    _load_synthetic_history(db, settings, seasons=(2025,))
    fixture = _fdo(7, "Synthetic One FC", "Synthetic Two FC", "2026-11-07", (0, 0), (0, 0))
    fixture.update(status="TIMED", stage="REGULAR_SEASON")
    st = tasks.check_football_data_org(db, settings, [2026], connector=FakeFootballDataOrg([], [fixture]))
    assert st.inserted == 1
    # Postponed by three weeks in football-data.co.uk: still the same league match.
    later = MatchRecord(source_code="football_data_uk", external_id="E0|2026|Synthetic FC 1|Synthetic FC 2",
                        competition_code="ENG-PL", season_start_year=2026, kickoff_date=date(2026, 11, 28),
                        kickoff_utc=None, home_team="Synthetic FC 1", away_team="Synthetic FC 2",
                        status="scheduled")
    with session_scope(db) as s:
        MatchStore(s, "football_data_uk").upsert(later, RunStats())
    with db.connect() as conn:
        rows = conn.execute(text("""SELECT m.kickoff_date, count(r.id) FROM matches m
            JOIN seasons se ON se.id = m.season_id JOIN match_external_refs r ON r.match_id = m.id
            WHERE se.start_year = 2026 GROUP BY m.id""")).all()
    assert len(rows) == 1 and rows[0][1] == 2 and rows[0][0] == date(2026, 11, 28)


class FakeOddsApi:
    def __init__(self, events, remaining=400):
        self.events, self.remaining, self.calls = events, remaining, []

    def active_sports(self):
        return {"soccer_epl"}

    def odds(self, sport_key):
        from footintel.connectors.the_odds_api import parse_events

        self.calls.append(sport_key)
        return parse_events(self.events, datetime(2026, 11, 3, 10, 0, tzinfo=UTC))


def test_odds_api_attaches_prices_without_feeding_the_model(db, settings, monkeypatch):
    from footintel.api import app as api_module
    from footintel.api import dashboard
    from footintel.ingestion import teams as teams_mod

    monkeypatch.setattr(tasks, "ODDS_API_SPORTS", {"ENG-PL": "soccer_epl", "UEFA-CL": "soccer_uefa_champs_league"})
    monkeypatch.setattr(teams_mod, "load_manual_aliases", lambda: {
        ("the_odds_api", "Synth One"): "Synthetic FC 1"})
    _load_synthetic_history(db, settings)
    feats = build_features(load_matches(db))
    v1 = registry.train_version(db, settings, feats, "logreg_market_goals")
    assert registry.promote(db, feats, v1, [2021, 2022], LOW_BAR).promoted
    now = datetime.now(UTC).replace(microsecond=0)
    kickoff = now + timedelta(days=2)
    fixture = MatchRecord("football_data_uk", "E0|2023|Synthetic FC 1|Synthetic FC 2", "ENG-PL", 2023,
                          kickoff.date(), kickoff, "Synthetic FC 1", "Synthetic FC 2", "scheduled")
    tasks.sync_fixtures(db, settings, connector=FakeConnector({}, [fixture]))

    def event(eid, home, away):
        return {"id": eid, "sport_key": "soccer_epl", "commence_time": kickoff.isoformat().replace("+00:00", "Z"),
                "home_team": home, "away_team": away,
                "bookmakers": [{"key": k, "markets": [{"key": "h2h", "outcomes": [
                    {"name": home, "price": h}, {"name": "Draw", "price": 3.4}, {"name": away, "price": a}]}]}
                    for k, h, a in (("pinnacle", 2.0, 3.9), ("betfair_ex_eu", 2.1, 3.8))]}

    # "Synthetic 2" has no alias: same normalised name as "Synthetic FC 2" in this league.
    fake = FakeOddsApi([event("e1", "Synth One", "Synthetic 2"), event("e2", "Nobody", "Synth One")])
    st = tasks.sync_odds_api(db, settings, connector=fake)
    codes = [i[1] for i in st.issues]
    assert st.inserted == 1 and "unmapped_team" in codes and "not_in_season" in codes
    assert fake.calls == ["soccer_epl"]  # the cup key is not in season: no credit spent
    again = tasks.sync_odds_api(db, settings, connector=fake)
    assert again.inserted == 0
    with db.connect() as conn:
        assert conn.execute(text("SELECT count(*) FROM odds_snapshots o JOIN data_sources d ON d.id = o.source_id "
                                 "WHERE d.code = 'the_odds_api'")).scalar() == 6
        assert conn.execute(text("SELECT count(*) FROM teams WHERE name = 'Nobody'")).scalar() == 0

    assert predict_upcoming(db, settings, now=now).created == 1
    with session_scope(db) as s:
        assert s.scalars(select(Prediction)).one().feature_snapshot.get("mkt_p_home") is None
    monkeypatch.setattr(dashboard, "get_engine", lambda: db)
    board = TestClient(api_module.app).get("/api/dash/value-board").json()
    m = board["matches"][0]
    assert m["has_odds"] is False and m["market"]["n_bookmakers"] == 2 and m["market"]["best"]["H"] == 2.1
    # 1UP and first goal implied by the bookmakers: consistent with their 1X2.
    mk = m["market"]
    assert mk["1UP_1"] > mk["1"] and mk["FG_1"] + mk["FG_2"] + mk["FG_0"] == pytest.approx(1, abs=1e-3)
    home = TestClient(api_module.app).get("/api/dash/home").json()
    assert home["model"] == "logreg_market_goals v1"
    assert len(home["matches"]) == 1 and home["matches"][0]["p_home"] is not None
    # The list shows the bookmaker average; it never feeds the model snapshot (checked above).
    assert home["matches"][0]["market"] == [m["market"]["1"], m["market"]["X"], m["market"]["2"]]
    assert home["matches"][0]["fg_mkt"][0] == mk["FG_1"]

    low = FakeOddsApi([], remaining=10)
    assert "quota_low" in [i[1] for i in tasks.sync_odds_api(db, settings, connector=low).issues]
    assert low.calls == []


class FakeOneFootball:
    def __init__(self, cards, pages):
        self.cards, self.pages, self.calls = cards, pages, []

    def results(self, competition_code):
        return self.cards if competition_code == "ENG-PL" else []

    def match(self, external_id):
        from footintel.connectors.onefootball import parse_match

        self.calls.append(external_id)
        return parse_match(external_id, self.pages[external_id])


def test_onefootball_attaches_lineups_without_creating_teams(db, settings, monkeypatch):
    from footintel.connectors.onefootball import MatchCard
    from footintel.ingestion import teams as teams_mod

    from .test_unit import onefootball_match_page

    monkeypatch.setattr(teams_mod, "load_manual_aliases", lambda: {
        ("onefootball", "Synth One"): "Synthetic FC 1", ("onefootball", "Synth Two"): "Synthetic FC 2"})
    kickoff = datetime(2026, 10, 25, 15, 0, tzinfo=UTC)
    played = MatchRecord("football_data_uk", "E0|2026|Synthetic FC 1|Synthetic FC 2", "ENG-PL", 2026,
                         kickoff.date(), kickoff, "Synthetic FC 1", "Synthetic FC 2", "scheduled")
    tasks.sync_fixtures(db, settings, connector=FakeConnector({}, [played]))
    cards = [MatchCard("m1", kickoff, "Synth One", "Synth Two", True),
             MatchCard("m2", kickoff, "Nobody", "Synth One", True),
             MatchCard("m3", kickoff + timedelta(days=7), "Synth Two", "Synth One", False)]
    fake = FakeOneFootball(cards, {"m1": onefootball_match_page()})
    # The calendar (D62) stores a reference for the fixture before it is played: the page must
    # still be read once the match is finished.
    with session_scope(db) as s:
        match_id = s.scalar(select(Match.id))
        source = s.scalar(select(DataSource.id).where(DataSource.code == "onefootball"))
        s.add(MatchExternalRef(match_id=match_id, source_id=source, external_id="m1"))
    st = tasks.sync_onefootball(db, settings, connector=fake)
    assert st.inserted == 1 and fake.calls == ["m1"]  # unfinished and unmapped: no page read
    assert "unmapped_team" in [i[1] for i in st.issues]
    again = tasks.sync_onefootball(db, settings, connector=fake)
    assert again.inserted == 0 and fake.calls == ["m1"]  # a match already read is not fetched again
    with db.connect() as conn:
        def one(sql):
            return conn.execute(text(sql)).scalar()

        assert one("SELECT count(*) FROM lineups WHERE confirmed") == 22
        assert one("SELECT string_agg(formation, ',' ORDER BY formation) FROM team_match_tactics") == "4-3-3,4-3-3"
        assert one("SELECT count(*) FROM match_events") == 4
        # The scorer is a starter: linked to a player. The substitute is not in the line-up.
        assert one("SELECT count(*) FROM match_events WHERE player_id IS NOT NULL") == 2
        # Names stay in the detail even when no player row matches.
        assert one("SELECT detail FROM match_events WHERE type = 'disallowed_goal'") == "Disallowed goal: Bench Man"
        # Shots go with the tactics; the statistics table the model reads keeps one source.
        assert one("SELECT count(*) FROM team_match_statistics") == 0
        assert one("SELECT max((extra->>'shots')::int) FROM team_match_tactics") == 12
        assert one("SELECT count(*) FROM teams WHERE name = 'Nobody'") == 0
        assert one("SELECT count(*) FROM match_outcomes") == 0  # scores are never written


class FakeNationalCalendar:
    def __init__(self, cards):
        self.cards = cards

    def fixtures(self, competition_code):
        return [c for c in self.cards if not c.finished] if competition_code == "INT-UNL" else []

    def results(self, competition_code):
        return [c for c in self.cards if c.finished] if competition_code == "INT-UNL" else []


def test_national_teams_get_their_own_rows_forecasts_and_stay_out_of_club_data(db, settings, monkeypatch):
    from footintel.connectors import international as intl
    from footintel.connectors.onefootball import MatchCard
    from footintel.db.models import Team
    from footintel.ingestion.international import predict_national, sync_international

    # A club already holds the name "Andorra" (FC Andorra).
    with session_scope(db) as s:
        s.add(Team(name="Andorra", country="Spain"))
    file = pd.DataFrame({"date": pd.to_datetime(["2025-06-01", "2025-09-01", "2025-10-01"]),
                         "home": ["France", "Turkey", "Andorra"], "away": ["Turkey", "Andorra", "France"],
                         "home_goals": [2, 3, 0], "away_goals": [1, 0, 4], "tournament": ["UEFA Nations League"] * 3,
                         "code": ["INT-UNL"] * 3, "kind": ["qualifier"] * 3, "neutral": [False] * 3})
    monkeypatch.setattr(intl, "download", lambda settings: settings.data_dir)
    monkeypatch.setattr(intl, "load", lambda folder: file)
    st = sync_international(db, settings)
    assert st.inserted == 3 and "name_taken" in [i[1] for i in st.issues]
    assert sync_international(db, settings).inserted == 0  # idempotent

    soon = datetime.now(UTC) + timedelta(days=2)
    cards = [MatchCard("n1", soon, "Türkiye", "Andorra", False),
             MatchCard("n2", soon, "France", "Atlantis", False)]
    cal = tasks.sync_onefootball_calendar(db, settings, competitions=["INT-UNL"], connector=FakeNationalCalendar(cards))
    assert cal.inserted == 1 and "unmapped_team" in [i[1] for i in cal.issues]  # Atlantis is skipped
    with db.connect() as conn:
        teams = conn.execute(text("""SELECT th.name, ta.name FROM matches m JOIN teams th ON th.id = m.home_team_id
                                     JOIN teams ta ON ta.id = m.away_team_id""")).all()
    # The OneFootball spelling maps to the file's name; the national Andorra is not the club.
    assert teams == [("Turkey", "Andorra (sélection)")]

    summary = predict_national(db, settings)
    assert summary.created == 1 and predict_national(db, settings).unchanged == 1
    with db.connect() as conn:
        p = conn.execute(text("""SELECT p.p_home, p.p_away, mv.status FROM predictions p
                                 JOIN model_versions mv ON mv.id = p.model_version_id""")).one()
    assert p.p_home > p.p_away and p.status == "companion"  # Turkey beat Andorra 3-0 at home
    # Club features never see national-team matches.
    assert load_matches(db)["competition"].str.startswith("INT-").sum() == 0


def test_day_results_lists_every_result_of_the_last_day_played(db):
    """D87: the "Hier" block shows every finished match of the last day, forecast or not."""
    from footintel.analysis.bilan import day_results
    from footintel.connectors.base import OutcomeRecord

    def rec(comp, home, away, d, goals):
        return MatchRecord(source_code="football_data_uk", external_id=f"SYN|{comp}|{home}|{d}",
                           competition_code=comp, season_start_year=2026, kickoff_date=d, kickoff_utc=None,
                           home_team=home, away_team=away, status="finished" if goals else "scheduled",
                           outcome=OutcomeRecord(*goals, "H" if goals[0] > goals[1] else "D") if goals else None)
    with session_scope(db) as s:
        store = MatchStore(s, "football_data_uk")
        store.upsert(rec("ENG-PL", "Synthetic FC 1", "Synthetic FC 2", date(2026, 11, 14), (2, 0)), RunStats())
        store.upsert(rec("GER-BL", "Synthetic FC 3", "Synthetic FC 4", date(2026, 11, 14), (1, 1)), RunStats())
        store.upsert(rec("ENG-PL", "Synthetic FC 5", "Synthetic FC 6", date(2026, 11, 12), (0, 1)), RunStats())
        store.upsert(rec("ENG-PL", "Synthetic FC 7", "Synthetic FC 8", date(2026, 11, 15), None), RunStats())

    out = day_results(db, date(2026, 11, 16))
    # The 15th has no result yet: the last day played is the 14th, in both competitions.
    assert out["date"] == "2026-11-14"
    assert {(m["competition"], m["score"], m["model"]) for m in out["matches"]} == {
        ("ENG-PL", "2-0", None), ("GER-BL", "1-1", None)}
    assert day_results(db, date(2026, 11, 30)) == {"date": None, "matches": []}
