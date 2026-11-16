"""Daily and weekly cycles. Each step is independent: one failure does not stop the others."""

import logging
from datetime import date, timedelta

from sqlalchemy import Engine

from footintel.config import Settings
from footintel.connectors.base import season_start_for
from footintel.features.builder import build_features
from footintel.features.dataset import load_matches
from footintel.ingestion import tasks
from footintel.ingestion.international import predict_national, sync_international
from footintel.jobs import JobAlreadyRunning, acquire_lock, release_lock
from footintel.models import registry
from footintel.postmatch.evaluate import evaluate_finished
from footintel.predictions.service import predict_upcoming
from footintel.reports.daily import postmatch_report, prematch_report

log = logging.getLogger(__name__)

DEFAULT_DEPLOY_MODEL = "routed_competition"


def _step(name: str, fn, results: dict) -> None:
    try:
        results[name] = fn()
        log.info("Step %s: ok", name)
    except JobAlreadyRunning as exc:
        results[name] = f"skipped: {exc}"
        log.warning("Step %s skipped: %s", name, exc)
    except Exception as exc:  # noqa: BLE001 - a failed step is logged and reported
        results[name] = f"failed: {exc}"
        log.exception("Step %s failed", name)


def _notify(settings: Settings, title: str, report_paths) -> None:
    """Send a plain-text digest of a report to Telegram when it is configured."""
    from footintel.notify.telegram import send, summary_from_markdown

    md = report_paths["md"].read_text(encoding="utf-8")
    send(settings, f"{title}\n\n{summary_from_markdown(md)}")


def _email_weekly(engine: Engine, settings: Settings, report_paths, retrained: bool) -> bool:
    """D80: the e-mail body is the week in plain words; the technical report is attached."""
    from footintel.analysis.bilan import forecast_results, ticket_results
    from footintel.notify.email import email_weekly
    from footintel.notify.tickets import local_today
    from footintel.reports.plain_week import plain_week

    subject, body = plain_week(ticket_results(engine, settings.artifacts_dir), forecast_results(engine),
                               local_today(), retrained)
    return email_weekly(settings, report_paths, body, subject)


def morning(engine: Engine, settings: Settings) -> dict:
    """Fixtures and odds, then predictions and the pre-match report."""
    results: dict = {}
    _step("sync_fixtures", lambda: tasks.sync_fixtures(engine, settings), results)
    # National teams (D82): refresh the results file and the team rows before the calendar.
    _step("sync_international", lambda: sync_international(engine, settings), results)
    # Full fixture lists of the five leagues, the national cups and the national teams (D62, D82).
    _step("sync_onefootball_calendar", lambda: tasks.sync_onefootball_calendar(engine, settings), results)
    # Current-season UEFA cups and DFB-Pokal: no other authorised free source has them.
    _step("sync_openligadb", lambda: tasks.import_openligadb(engine, settings, jitter_seconds=90),
          results)
    _step("check_football_data_org", lambda: tasks.check_football_data_org(engine, settings), results)
    # Cup prices for the odds checker; after the cup imports so the matches exist.
    _step("sync_odds_api", lambda: tasks.sync_odds_api(engine, settings), results)
    # League line-ups and events of the matches finished since the last run (D50).
    _step("sync_onefootball", lambda: tasks.sync_onefootball(engine, settings), results)
    _step("predict", lambda: predict_upcoming(engine, settings), results)
    _step("predict_national", lambda: predict_national(engine, settings), results)
    _step("prematch_report", lambda: prematch_report(engine, settings).paths, results)
    if isinstance(results.get("prematch_report"), dict):
        _step("notify", lambda: _notify(settings, "Football Intel — avant-match", results["prematch_report"]), results)
    return results


def _stories(engine: Engine, settings: Settings, days: int) -> str:
    """Tell the latest matches, refresh the scenario statistics and the road ahead."""
    from footintel.analysis.stories import run_stories
    from footintel.reports.stories import stories_report

    res = run_stories(engine, build_features(load_matches(engine)), days=days)
    return str(stories_report(engine, settings, res).paths["md"])


def evening(engine: Engine, settings: Settings) -> dict:
    """Results and statistics, evaluation and the post-match report.

    Results files are re-downloaded at every run, so late statistics are picked up."""
    results: dict = {}
    current = season_start_for(date.today())
    _step("sync_results", lambda: tasks.sync_results(engine, settings), results)
    _step("sync_onefootball_calendar", lambda: tasks.sync_onefootball_calendar(engine, settings), results)
    _step("sync_openligadb", lambda: tasks.import_openligadb(engine, settings, jitter_seconds=90),
          results)
    _step("check_football_data_org", lambda: tasks.check_football_data_org(engine, settings), results)
    # No odds here: once a day (morning) keeps 14 competitions inside the free 500 credits.
    # Foreign clubs' domestic form, used to rate opponents in European cups.
    _step("sync_context_leagues",
          lambda: tasks.import_context_leagues(engine, settings, current - 1, current), results)
    _step("evaluate", lambda: evaluate_finished(engine), results)
    _step("stories", lambda: _stories(engine, settings, days=2), results)
    yesterday = date.today() - timedelta(days=1)
    _step("postmatch_report",
          lambda: postmatch_report(engine, settings, yesterday - timedelta(days=6), date.today()).paths,
          results)
    if isinstance(results.get("postmatch_report"), dict):
        _step("notify", lambda: _notify(settings, "Football Intel — après-match", results["postmatch_report"]), results)
    return results


def nightly(engine: Engine, settings: Settings) -> dict:
    results: dict = {}
    current = season_start_for(date.today())
    _step("sync_european",
          lambda: tasks.import_european(engine, settings, current - 1, current), results)
    _step("check_data_quality", lambda: tasks.check_data_quality(engine), results)
    return results


def weekly(engine: Engine, settings: Settings, model_name: str = DEFAULT_DEPLOY_MODEL,
           n_test_seasons: int = 3) -> dict:
    """Retrain a candidate and promote it only if it passes the promotion criteria."""
    results: dict = {}
    owner = acquire_lock(engine, "weekly_retrain", timedelta(hours=6))
    status = "success"
    try:
        feats = build_features(load_matches(engine))
        current = season_start_for(date.today())
        test_seasons = list(range(current - n_test_seasons, current))
        version_id = registry.train_version(engine, settings, feats, model_name)
        decision = registry.promote(engine, feats, version_id, test_seasons, settings.promotion)
        results["retrain"] = {"version_id": version_id, "promoted": decision.promoted,
                              "reason": decision.reason}
        # Competition profiles and trend tests, refreshed with the week's results.
        from footintel.analysis.competitions import run_analysis
        from footintel.reports.competitions import competition_report

        analysis = run_analysis(engine, feats, current - 5, current - 1)
        # Trends and calibration feed the dashboard.
        from footintel.analysis.trend_engine import run_trends
        from footintel.evaluation.calibration import store_calibration

        from footintel.analysis.drift import run_drift
        from footintel.analysis.hybrid import run_hybrid
        from footintel.reports.weekly import weekly_report

        results["hybrid"] = run_hybrid(engine, criteria=settings.promotion)
        results["trends_run"] = run_trends(engine, feats)["run_id"]
        from footintel.analysis.stories import run_stories
        from footintel.reports.stories import stories_report

        stories = run_stories(engine, feats, days=7)
        results["stories_report"] = str(stories_report(engine, settings, stories).paths["md"])
        # D72: scenario weights that adjust the market price, with their own check.
        from footintel.analysis import scenario_adjust

        learnt = scenario_adjust.learn(feats, current)
        scenario_adjust.save(learnt, settings.artifacts_dir)
        results["scenario_adjust"] = {k: learnt[k] for k in ("active", "active_leagues", "check")}
        results["drift_run"] = run_drift(engine, feats)
        results["calibration_run"] = store_calibration(
            engine, feats, [model_name, "market_implied", "naive_frequency"],
            list(range(current - 5, current)))
        results["analysis"] = {"run_id": analysis["run_id"],
                               "report": str(competition_report(engine, settings,
                                                                analysis["run_id"]).paths["md"])}
        weekly = weekly_report(engine, settings)
        results["weekly_report"] = str(weekly.paths["md"])
        _notify(settings, "Football Intel — rapport hebdomadaire", weekly.paths)
        retrained = bool((results.get("retrain") or {}).get("promoted"))
        _step("email", lambda: _email_weekly(engine, settings, weekly.paths, retrained), results)
    except Exception:
        status = "failed"
        raise
    finally:
        release_lock(engine, "weekly_retrain", owner, status)
    return results
