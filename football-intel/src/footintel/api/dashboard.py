"""Read-only data endpoints for the dashboard. Every answer carries its period, sample
size and data status, so the interface never shows a number without its context."""

import math
from functools import lru_cache
from datetime import date, timedelta
from decimal import Decimal

import numpy as np
from fastapi import APIRouter, HTTPException
from scipy.stats import poisson
from sqlalchemy import text

from footintel.analysis.events import DEFINITION_WARNINGS, NOT_COLLECTED
from footintel.catalog import COMPETITION_BY_CODE
from footintel.db.session import get_engine
from footintel.predictions.service import PREDICT_DAYS as LIST_DAYS
from footintel.reports.fiche import team_sheet

router = APIRouter(prefix="/api/dash", tags=["dashboard"])

TARGETS = ["ENG-PL", "ESP-LL", "ITA-SA", "GER-BL", "FRA-L1", "UEFA-CL", "UEFA-EL", "UEFA-ECL", "FRA-CDF",
           "ENG-FAC", "ENG-EFL", "ESP-CDR", "ITA-CI", "GER-DFB"]


def _clean(v):
    if isinstance(v, Decimal):
        v = float(v)
    return None if isinstance(v, float) and math.isnan(v) else v


def _rows(sql: str, **params) -> list[dict]:
    with get_engine().connect() as conn:
        return [{k: _clean(v) for k, v in r.items()}
                for r in conn.execute(text(sql), params).mappings().all()]


def _one(sql: str, **params):
    rows = _rows(sql, **params)
    return rows[0] if rows else None


def _latest(kind: str) -> int | None:
    r = _one("SELECT max(id) AS id FROM training_runs WHERE kind = :k AND status = 'success'", k=kind)
    return r["id"] if r else None


# --- 1. Overview -----------------------------------------------------------------

@router.get("/overview")
def overview() -> dict:
    counts = _one("""
        SELECT (SELECT count(*) FROM matches m JOIN match_outcomes o ON o.match_id = m.id) AS matches,
               (SELECT count(DISTINCT competition_id) FROM matches) AS competitions,
               (SELECT min(kickoff_date) FROM matches) AS first_date,
               (SELECT max(m.kickoff_date) FROM matches m JOIN match_outcomes o ON o.match_id = m.id) AS last_result,
               (SELECT max(collected_at) FROM match_outcomes) AS last_update,
               (SELECT count(*) FROM matches WHERE status = 'scheduled' AND kickoff_date >= CURRENT_DATE) AS upcoming""")
    trend_run = _one("SELECT max(training_run_id) AS id FROM trends")["id"]
    trend_counts, watch = [], []
    if trend_run:
        trend_counts = _rows("""SELECT population_type, status, count(*) AS n FROM trends
            WHERE training_run_id = :r AND "window" = 'medium' GROUP BY 1, 2 ORDER BY 1, 3 DESC""", r=trend_run)
        watch = _rows("""SELECT t.trend_key, t.population, t.competition, t.metric, t.definition, t.status,
                   t.confidence, t.n, t.observed, t.reference, t.abs_diff, t.adjusted_p_value,
                   t.period_start, t.period_end
            FROM trends t WHERE t.training_run_id = :r AND t."window" = 'medium'
              AND t.population_type = 'competition' AND t.competition = ANY(:targets)
              AND t.status IN ('rising', 'falling', 'emerging', 'disappeared')
            ORDER BY t.adjusted_p_value NULLS LAST LIMIT 12""", r=trend_run, targets=TARGETS)
    validated = _one("""SELECT count(*) AS n FROM detected_patterns
                        WHERE status = 'validated_out_of_sample'""")["n"]
    validated_targets = _rows("""SELECT key, description, effect, out_of_sample_effect, n, out_of_sample_n
        FROM detected_patterns WHERE status = 'validated_out_of_sample' AND key LIKE 'residual|%|all|%'
          AND segment->>'competition' = ANY(:targets) ORDER BY adjusted_p_value LIMIT 8""", targets=TARGETS)
    active = _one("""SELECT name, version, promoted_at, trained_until, n_train, decision_note
                     FROM model_versions WHERE status = 'active'""")
    weak = _rows("""SELECT model_name, segment, metric, value, n, ci_low, ci_high FROM model_metrics
        WHERE training_run_id = :r AND model_name = 'all' AND segment = 'trend_ablation:all targets'
        ORDER BY metric""", r=_latest("trend_ablation") or -1)
    calib = _rows("""SELECT model_name, segment, value, n FROM model_metrics
        WHERE training_run_id = :r AND metric = 'ece' AND segment LIKE 'calibration:%'""",
                  r=_latest("calibration") or -1)
    issues = _rows("""SELECT severity, code, count(*) AS n FROM data_quality_issues
        WHERE collection_run_id = (SELECT max(id) FROM collection_runs WHERE job_name = 'check_data_quality')
        GROUP BY 1, 2 ORDER BY 3 DESC""")
    return {"counts": counts, "trend_run": trend_run, "trend_counts": trend_counts,
            "watch": watch, "validated_effects": validated, "validated_targets": validated_targets,
            "active_model": active, "calibration": calib, "goal_market_note": weak,
            "quality_issues": issues, "not_collected": NOT_COLLECTED}


# --- 2. Competitions -------------------------------------------------------------

@router.get("/competitions")
def competitions() -> list[dict]:
    rows = _rows("""
        SELECT c.code, c.name, c.type, c.is_target, count(o.id) AS matches,
               min(se.start_year) AS first_season, max(se.start_year) AS last_season
        FROM competitions c LEFT JOIN matches m ON m.competition_id = c.id
        LEFT JOIN seasons se ON se.id = m.season_id
        LEFT JOIN match_outcomes o ON o.match_id = m.id
        GROUP BY c.id ORDER BY c.is_target DESC, matches DESC""")
    return rows


@router.get("/competition/{code}")
def competition(code: str, season_from: int | None = None, season_to: int | None = None) -> dict:
    if code not in COMPETITION_BY_CODE:
        raise HTTPException(404, "unknown competition")
    info = _one("""SELECT c.code, c.name, c.type, count(o.id) AS matches, min(se.start_year) AS first_season,
                          max(se.start_year) AS last_season
                   FROM competitions c LEFT JOIN matches m ON m.competition_id = c.id
                   LEFT JOIN seasons se ON se.id = m.season_id LEFT JOIN match_outcomes o ON o.match_id = m.id
                   WHERE c.code = :c GROUP BY c.id""", c=code)
    if not info or not info["matches"]:
        return {"info": info, "available": False,
                "reason": "Aucune source autorisée ne couvre cette compétition (clé API-Football requise)."}
    lo = season_from if season_from is not None else info["first_season"]
    hi = season_to if season_to is not None else info["last_season"]
    base = """FROM matches m JOIN competitions c ON c.id = m.competition_id
              JOIN seasons se ON se.id = m.season_id JOIN match_outcomes o ON o.match_id = m.id
              WHERE c.code = :c AND se.start_year BETWEEN :lo AND :hi"""
    seasons = _rows(f"""SELECT se.start_year AS season, count(*) AS n,
            avg((o.home_goals > o.away_goals)::int) AS home_win, avg((o.home_goals = o.away_goals)::int) AS draw,
            avg((o.home_goals < o.away_goals)::int) AS away_win,
            avg((o.home_goals + o.away_goals > 2.5)::int) AS over_2_5,
            avg((o.home_goals + o.away_goals > 1.5)::int) AS over_1_5,
            avg((o.home_goals + o.away_goals > 3.5)::int) AS over_3_5,
            avg((o.home_goals > 0 AND o.away_goals > 0)::int) AS btts,
            avg(o.home_goals + o.away_goals) AS goals,
            avg(o.ht_home_goals + o.ht_away_goals) AS first_half_goals,
            avg(o.home_goals + o.away_goals - o.ht_home_goals - o.ht_away_goals) AS second_half_goals,
            count(o.ht_home_goals) AS n_ht
            {base} GROUP BY 1 ORDER BY 1""", c=code, lo=lo, hi=hi)
    for s in seasons:  # Wilson intervals for the rates
        from footintel.analysis.stats import wilson
        for k in ("home_win", "draw", "away_win", "over_2_5", "over_1_5", "over_3_5", "btts"):
            a, b = wilson(s[k] * s["n"], s["n"])
            s[f"{k}_ci"] = [a, b]
    scores = _rows(f"""SELECT least(o.home_goals, 5) AS h, least(o.away_goals, 5) AS a, count(*) AS n
                      {base} GROUP BY 1, 2""", c=code, lo=lo, hi=hi)
    totals = _rows(f"""SELECT least(o.home_goals + o.away_goals, 6) AS goals, count(*) AS n
                      {base} GROUP BY 1 ORDER BY 1""", c=code, lo=lo, hi=hi)
    stats = _rows(f"""SELECT se.start_year AS season, count(sh.id) AS n,
            avg(sh.shots + sa.shots) AS shots, avg(sh.shots_on_target + sa.shots_on_target) AS sot,
            avg(sh.corners + sa.corners) AS corners, avg(sh.yellow_cards + sa.yellow_cards) AS yellows,
            avg(sh.red_cards + sa.red_cards) AS reds, avg(sh.fouls + sa.fouls) AS fouls
            {base.replace('JOIN match_outcomes o ON o.match_id = m.id', 'JOIN match_outcomes o ON o.match_id = m.id JOIN team_match_statistics sh ON sh.match_id = m.id AND sh.team_id = m.home_team_id JOIN team_match_statistics sa ON sa.match_id = m.id AND sa.team_id = m.away_team_id')}
            GROUP BY 1 ORDER BY 1""", c=code, lo=lo, hi=hi)
    trend_run = _one("SELECT max(training_run_id) AS id FROM trends")["id"]
    trends = _rows("""SELECT metric, definition, "window", n, observed, smoothed, reference, abs_diff, ci_low,
                             ci_high, adjusted_p_value, status, confidence, period_start, period_end,
                             limitations, out_of_sample
                      FROM trends WHERE training_run_id = :r AND population_type = 'competition'
                        AND population = :c ORDER BY metric, "window" DESC""", r=trend_run or -1, c=code)
    effects = _rows("""SELECT key, segment->>'segment' AS segment, segment->>'metric' AS metric, n, effect,
                              ci_low, ci_high, out_of_sample_effect, out_of_sample_n, status, adjusted_p_value
                       FROM detected_patterns WHERE key LIKE 'residual|%' AND segment->>'competition' = :c
                         AND status <> 'hypothesis' ORDER BY adjusted_p_value LIMIT 30""", c=code)
    return {"info": info, "available": True, "period": [lo, hi], "seasons": seasons, "scores": scores,
            "totals": totals, "stats": stats, "trends": trends, "effects": effects,
            "unavailable": {"goals_by_period": NOT_COLLECTED["goals by 15-minute period (0-15 ... 76-90+)"],
                            "xg": NOT_COLLECTED["xG / xGA, big chances, touches in the box"],
                            "tactics": NOT_COLLECTED["possession, passing, progression, pressing, PPDA"]},
            "definition_warnings": DEFINITION_WARNINGS}


@router.get("/matches")
def matches(competition: str, season: int | None = None, home_goals: int | None = None,
            away_goals: int | None = None, team: int | None = None, limit: int = 200) -> list[dict]:
    """Drill-down: the matches behind a chart cell."""
    return _rows("""
        SELECT m.id, m.kickoff_date, se.start_year AS season, m.round, th.name AS home, ta.name AS away,
               o.home_goals, o.away_goals, o.ht_home_goals, o.ht_away_goals, o.aet_home_goals, o.pen_home
        FROM matches m JOIN competitions c ON c.id = m.competition_id JOIN seasons se ON se.id = m.season_id
        JOIN teams th ON th.id = m.home_team_id JOIN teams ta ON ta.id = m.away_team_id
        JOIN match_outcomes o ON o.match_id = m.id
        WHERE c.code = :c AND (CAST(:s AS int) IS NULL OR se.start_year = CAST(:s AS int))
          AND (CAST(:hg AS int) IS NULL OR least(o.home_goals, 5) = CAST(:hg AS int))
          AND (CAST(:ag AS int) IS NULL OR least(o.away_goals, 5) = CAST(:ag AS int))
          AND (CAST(:t AS int) IS NULL OR CAST(:t AS int) IN (m.home_team_id, m.away_team_id))
        ORDER BY m.kickoff_date DESC LIMIT :lim""",
                 c=competition, s=season, hg=home_goals, ag=away_goals, t=team, lim=min(limit, 500))


# --- 3. Teams --------------------------------------------------------------------

@router.get("/teams")
def teams(competition: str | None = None) -> list[dict]:
    return _rows("""
        SELECT DISTINCT t.id, t.name, c.code AS competition
        FROM matches m JOIN competitions c ON c.id = m.competition_id JOIN seasons se ON se.id = m.season_id
        JOIN teams t ON t.id IN (m.home_team_id, m.away_team_id)
        WHERE c.is_target AND c.type = 'league'
          AND se.start_year = (SELECT max(s2.start_year) FROM seasons s2 WHERE s2.competition_id = c.id)
          AND (CAST(:c AS text) IS NULL OR c.code = CAST(:c AS text))
        ORDER BY c.code, t.name""", c=competition)


@router.get("/team/{team_id}")
def team(team_id: int) -> dict:
    info = _one("SELECT id, name, country FROM teams WHERE id = :t", t=team_id)
    if not info:
        raise HTTPException(404, "unknown team")
    series = _rows("""
        SELECT m.id, m.kickoff_date, c.code AS competition, se.start_year AS season,
               (m.home_team_id = :t) AS at_home, m.neutral_venue,
               CASE WHEN m.home_team_id = :t THEN ta.name ELSE th.name END AS opponent,
               CASE WHEN m.home_team_id = :t THEN o.home_goals ELSE o.away_goals END AS gf,
               CASE WHEN m.home_team_id = :t THEN o.away_goals ELSE o.home_goals END AS ga,
               sf.shots AS shots_for, sa.shots AS shots_against, sf.shots_on_target AS sot_for,
               sa.shots_on_target AS sot_against, sf.corners AS corners_for
        FROM matches m JOIN competitions c ON c.id = m.competition_id JOIN seasons se ON se.id = m.season_id
        JOIN teams th ON th.id = m.home_team_id JOIN teams ta ON ta.id = m.away_team_id
        JOIN match_outcomes o ON o.match_id = m.id
        LEFT JOIN team_match_statistics sf ON sf.match_id = m.id AND sf.team_id = :t
        LEFT JOIN team_match_statistics sa ON sa.match_id = m.id AND sa.team_id <> :t
        WHERE :t IN (m.home_team_id, m.away_team_id)
        ORDER BY m.kickoff_date DESC LIMIT 114""", t=team_id)
    series.reverse()
    trend_run = _one("SELECT max(training_run_id) AS id FROM trends")["id"]
    trends = _rows("""SELECT population, metric, definition, "window", n, observed, smoothed, reference,
                             abs_diff, ci_low, ci_high, adjusted_p_value, status, confidence,
                             period_start, period_end, out_of_sample
                      FROM trends WHERE training_run_id = :r AND population_type = 'team'
                        AND split_part(population, '|', 1) = :n
                      ORDER BY population, metric, "window" DESC""", r=trend_run or -1, n=info["name"])
    tactics = _one("SELECT count(*) AS n FROM team_match_tactics WHERE team_id = :t", t=team_id)["n"]
    lineups = _one("SELECT count(*) AS n FROM lineups WHERE team_id = :t", t=team_id)["n"]
    return {"info": info, "series": series, "trends": trends,
            "tactics_available": bool(tactics), "lineups_available": bool(lineups),
            "unavailable": {k: v for k, v in NOT_COLLECTED.items()
                            if k.startswith(("xG", "possession", "formations", "line-ups", "coach"))}}


# --- 4. Pre-match ----------------------------------------------------------------

# The start page lists the predicted window (a fixed count hid whole match days, D63).
LIST_CAP, DETAIL_DAYS = 600, 7


@router.get("/matches/upcoming")
def upcoming() -> list[dict]:
    return _rows("""
        SELECT m.id, m.kickoff_date, m.kickoff_utc, c.code AS competition, th.name AS home, ta.name AS away,
               (SELECT count(*) FROM predictions p WHERE p.match_id = m.id) AS predictions
        FROM matches m JOIN competitions c ON c.id = m.competition_id
        JOIN teams th ON th.id = m.home_team_id JOIN teams ta ON ta.id = m.away_team_id
        WHERE m.status = 'scheduled' AND m.kickoff_date >= CURRENT_DATE AND c.is_target
          AND m.kickoff_date < CURRENT_DATE + :days
        ORDER BY m.kickoff_date, m.kickoff_utc LIMIT :cap""", days=LIST_DAYS, cap=LIST_CAP)


@lru_cache(maxsize=2048)
def _order_markets(ph, pa, po, eh, ea) -> tuple | None:
    """FG home, no goal, FG away, 1UP home, 1UP away; None without goal expectations."""
    if None in (ph, pa, eh, ea):
        return None
    from footintel.analysis.value import _fit_lambdas, path_markets

    pm = path_markets(*_fit_lambdas(ph, pa, (eh, ea), po))
    return tuple(round(pm[k], 4) for k in ("first_home", "none", "first_away", "up1_home", "up1_away"))


@router.get("/home")
def home() -> dict:
    """Upcoming matches with the latest stored prediction, for the start page."""
    matches = _rows("""
        SELECT m.id, m.kickoff_date, m.kickoff_utc, c.code AS competition, c.name AS competition_name,
               th.name AS home, ta.name AS away, p.p_home, p.p_draw, p.p_away, p.p_over_1_5, p.p_over_2_5,
               p.p_over_3_5, p.p_btts, p.exp_home_goals, p.exp_away_goals, p.sufficient_data,
               p.feature_snapshot->>'mkt_p_home' AS mkt_home,
               p.feature_snapshot->>'mkt_p_draw' AS mkt_draw, p.feature_snapshot->>'mkt_p_away' AS mkt_away
        FROM matches m JOIN competitions c ON c.id = m.competition_id
        JOIN teams th ON th.id = m.home_team_id JOIN teams ta ON ta.id = m.away_team_id
        LEFT JOIN LATERAL (SELECT * FROM predictions p WHERE p.match_id = m.id
                           ORDER BY p.predicted_at DESC LIMIT 1) p ON true
        WHERE m.status = 'scheduled' AND m.kickoff_date >= CURRENT_DATE AND c.is_target
          AND m.kickoff_date < CURRENT_DATE + :days
        ORDER BY m.kickoff_date, m.kickoff_utc LIMIT :cap""", days=LIST_DAYS, cap=LIST_CAP)
    from footintel.analysis.summary import list_pick, safe_picks
    from footintel.analysis.value import market_consensus, market_probabilities

    # Bookmaker average from The Odds API when the model's own odds (football-data.co.uk) are missing.
    prices, _ = _odds_api_prices([m["id"] for m in matches])
    overs = _market_over_2_5([m["id"] for m in matches])
    for m in matches:
        mk = [m.pop("mkt_home"), m.pop("mkt_draw"), m.pop("mkt_away")]
        m["market"] = [float(x) for x in mk] if all(x is not None for x in mk) else None
        if m["market"] is None and (c := market_consensus(prices.get(m["id"], []))):
            m["market"] = [c["1"], c["X"], c["2"]]
        # Result and goal markets only: the order-dependent ones need a fit, not useful here.
        picks = safe_picks(market_probabilities({k: m[k] for k in ("p_home", "p_draw", "p_away", "p_over_1_5",
                                                                    "p_over_2_5", "p_over_3_5", "p_btts")})) \
            if m["p_home"] is not None else []
        m["safe"] = list_pick(picks)
        # First goal and 1UP for the owner's "Mes équipes" view (cached: the fit costs ~20 ms).
        eh, ea = m.pop("exp_home_goals"), m.pop("exp_away_goals")
        order = _order_markets(m["p_home"], m["p_away"], m["p_over_2_5"], eh, ea)
        m["fg"], m["up1"] = (order[:3], order[3:]) if order else (None, None)
        # The same markets implied by the bookmakers, the reference for betPawa's prices.
        mo = (_market_order(m["market"][0], m["market"][2], overs.get(m["id"]), eh or 1.4, ea or 1.1)
              if m["market"] else None)
        m["fg_mkt"] = [mo["FG_1"], mo["FG_0"], mo["FG_2"]] if mo else None
        m["up1_mkt"] = [mo["1UP_1"], mo["1UP_2"]] if mo else None
        # The match page exists once the match has probabilities or is within a week.
        m["detail"] = m["p_home"] is not None or m["kickoff_date"] <= date.today() + timedelta(days=DETAIL_DAYS)
    status = _one("""SELECT (SELECT max(m.kickoff_date) FROM matches m JOIN match_outcomes o ON o.match_id = m.id)
                            AS last_result,
                            (SELECT name || ' v' || version FROM model_versions WHERE status = 'active'
                             ORDER BY promoted_at DESC LIMIT 1) AS model,
                            (SELECT max(predicted_at) FROM predictions) AS last_prediction""")
    return {**status, "matches": matches}


@router.get("/match/{match_id}/insights")
def match_insights_view(match_id: int) -> dict:
    """Form, head-to-head, standings, scorers, last line-up, tactical profile, first goal."""
    from footintel.analysis.matchup import match_insights

    m = _one("""SELECT m.id, m.kickoff_date, c.code AS competition, m.home_team_id, m.away_team_id,
                       th.name AS home, ta.name AS away
                FROM matches m JOIN competitions c ON c.id = m.competition_id
                JOIN teams th ON th.id = m.home_team_id JOIN teams ta ON ta.id = m.away_team_id
                WHERE m.id = :m""", m=match_id)
    if not m:
        raise HTTPException(404, "unknown match")
    m["kickoff_date"] = date.fromisoformat(str(m["kickoff_date"]))
    pred = _one("""SELECT exp_home_goals, exp_away_goals FROM predictions WHERE match_id = :m
                   ORDER BY predicted_at DESC LIMIT 1""", m=match_id)
    return match_insights(get_engine(), m, pred)


@router.get("/match/{match_id}/players")
def match_players(match_id: int) -> dict:
    """Player and unit impact of both teams this season, before the kick-off (D53)."""
    from footintel.analysis.players import player_impact
    from footintel.connectors.base import season_start_for

    m = _one("SELECT kickoff_date, home_team_id, away_team_id FROM matches WHERE id = :m", m=match_id)
    if not m:
        raise HTTPException(404, "unknown match")
    before = date.fromisoformat(str(m["kickoff_date"]))
    season = season_start_for(before)
    return {"season": season,
            "home": player_impact(get_engine(), m["home_team_id"], season, before),
            "away": player_impact(get_engine(), m["away_team_id"], season, before)}


def _score_grid(lh: float, la: float, n: int = 6) -> list[list[float]]:
    goals = np.arange(11)
    m = np.outer(poisson.pmf(goals, lh), poisson.pmf(goals, la))
    m /= m.sum()
    return m[:n, :n].round(4).tolist()


@router.get("/match/{match_id}")
def match(match_id: int) -> dict:
    m = _one("""SELECT m.id, m.kickoff_date, m.kickoff_utc, m.status, m.round, m.neutral_venue,
                       c.code AS competition, c.name AS competition_name, m.home_team_id, m.away_team_id,
                       th.name AS home, ta.name AS away, o.home_goals, o.away_goals
                FROM matches m JOIN competitions c ON c.id = m.competition_id
                JOIN teams th ON th.id = m.home_team_id JOIN teams ta ON ta.id = m.away_team_id
                LEFT JOIN match_outcomes o ON o.match_id = m.id WHERE m.id = :m""", m=match_id)
    if not m:
        raise HTTPException(404, "unknown match")
    pred = _one("""SELECT p.*, mv.name AS model, mv.version FROM predictions p
                   JOIN model_versions mv ON mv.id = p.model_version_id
                   WHERE p.match_id = :m ORDER BY p.predicted_at DESC LIMIT 1""", m=match_id)
    out = {"match": m, "prediction": None}
    if pred:
        grid = _score_grid(pred["exp_home_goals"], pred["exp_away_goals"]) if pred["exp_home_goals"] else None
        top = []
        if grid:
            cells = [(grid[i][j], f"{i}-{j}") for i in range(len(grid)) for j in range(len(grid))]
            top = [{"score": s, "p": p} for p, s in sorted(cells, reverse=True)[:6]]
        snap = pred["feature_snapshot"] or {}
        out["prediction"] = {
            "model": f"{pred['model']} v{pred['version']}", "predicted_at": pred["predicted_at"],
            "p_home": pred["p_home"], "p_draw": pred["p_draw"], "p_away": pred["p_away"],
            "p_over_1_5": pred["p_over_1_5"], "p_over_2_5": pred["p_over_2_5"],
            "p_over_3_5": pred["p_over_3_5"], "p_btts": pred["p_btts"],
            "exp_home_goals": pred["exp_home_goals"], "exp_away_goals": pred["exp_away_goals"],
            "score_grid": grid, "top_scores": top, "data_quality": pred["data_quality"],
            "sufficient_data": pred["sufficient_data"],
            "market": [snap.get("mkt_p_home"), snap.get("mkt_p_draw"), snap.get("mkt_p_away")],
            "factors": {k: snap.get(k) for k in ("elo_home", "elo_away", "elo_diff", "form5_ppg_h",
                                                   "form5_ppg_a", "rest_days_h", "rest_days_a",
                                                   "games_14d_h", "games_14d_a", "comp_over25_rate",
                                                   "comp_draw_rate", "comp_goals_mean")},
        }
        from footintel.analysis.value import RELIABILITY, market_probabilities

        from footintel.analysis.summary import safe_picks, verdict

        out["markets"] = market_probabilities(pred)
        out["market_notes"] = RELIABILITY
        out["summary"] = {"verdict": verdict(pred["p_home"], pred["p_draw"], pred["p_away"], pred["p_over_2_5"],
                                             m["home"], m["away"]),
                          "safe_picks": safe_picks(out["markets"])}
    before = m["kickoff_date"]
    out["sheets"] =[team_sheet(get_engine(), m["home_team_id"], m["home"], before).__dict__,
                     team_sheet(get_engine(), m["away_team_id"], m["away"], before).__dict__]
    return out


# --- 5. Model performance --------------------------------------------------------

@router.get("/performance")
def performance() -> dict:
    versions = _rows("""SELECT id, name, version, family, status, created_at, promoted_at, retired_at,
                               trained_until, n_train, decision_note FROM model_versions ORDER BY id""")
    bt = _latest("backtest")
    backtest = _rows("""SELECT model_name, segment, metric, value, n, ci_low, ci_high FROM model_metrics
                        WHERE training_run_id = :r AND (metric IN ('log_loss', 'brier', 'ece', 'ou25_log_loss',
                        'btts_log_loss', 'log_loss_diff'))""", r=bt or -1)
    run = _one("SELECT id, started_at, config FROM training_runs WHERE id = :r", r=bt or -1)
    cal = _latest("calibration")
    calibration = _rows("""SELECT model_name, segment, metric, value, n, ci_low, ci_high FROM model_metrics
                           WHERE training_run_id = :r""", r=cal or -1)
    levels = _rows("""SELECT model_name, segment, metric, value, n, ci_low, ci_high FROM model_metrics
                      WHERE training_run_id IN (:a, :b)""", a=_latest("ablation") or -1,
                   b=_latest("trend_ablation") or -1)
    live = _rows("""SELECT predictor_kind, model_name, market, count(*) AS n, avg(log_loss) AS log_loss,
                           avg(brier) AS brier, avg(correct::int) AS accuracy
                    FROM prediction_evaluations GROUP BY 1, 2, 3 ORDER BY 1, 2, 3""")
    return {"versions": versions, "backtest_run": run, "backtest": backtest,
            "calibration_run": cal, "calibration": calibration, "levels": levels, "live": live}


# --- Odds checker --------------------------------------------------------------------

def _odds_api_prices(ids: list[int]) -> tuple[dict[int, list], dict[int, object]]:
    """Latest The Odds API snapshot of each match: the market reference shown next to the model."""
    prices: dict[int, list] = {}
    captured: dict[int, object] = {}
    if not ids:
        return prices, captured
    for o in _rows("""
        SELECT o.match_id, o.bookmaker, o.selection, o.price, o.captured_at
        FROM odds_snapshots o JOIN data_sources d ON d.id = o.source_id
        WHERE d.code = 'the_odds_api' AND o.market = '1X2' AND o.match_id = ANY(:ids)
          AND o.snapshot_label = (SELECT max(o2.snapshot_label) FROM odds_snapshots o2
                                  WHERE o2.match_id = o.match_id AND o2.source_id = o.source_id)""",
                   ids=ids):
        prices.setdefault(o["match_id"], []).append((o["bookmaker"], o["selection"], o["price"]))
        if o["captured_at"] and (captured.get(o["match_id"]) is None or o["captured_at"] > captured[o["match_id"]]):
            captured[o["match_id"]] = o["captured_at"]
    return prices, captured


def _market_over_2_5(ids: list[int]) -> dict[int, float]:
    """Bookmakers' average P(over 2.5), margin removed, from the latest football-data.co.uk snapshot."""
    if not ids:
        return {}
    out: dict[int, float] = {}
    for r in _rows("""
        SELECT o.match_id, max(o.price) FILTER (WHERE o.selection = 'over') AS o,
               max(o.price) FILTER (WHERE o.selection = 'under') AS u
        FROM odds_snapshots o
        WHERE o.market = 'OU2.5' AND o.bookmaker = 'market_avg' AND o.match_id = ANY(:ids)
          AND o.snapshot_label = (SELECT max(o2.snapshot_label) FROM odds_snapshots o2
                                  WHERE o2.match_id = o.match_id AND o2.market = 'OU2.5'
                                    AND o2.bookmaker = 'market_avg')
        GROUP BY o.match_id""", ids=ids):
        if r["o"] and r["u"] and r["o"] > 1 and r["u"] > 1:
            out[r["match_id"]] = (1 / r["o"]) / (1 / r["o"] + 1 / r["u"])
    return out


@lru_cache(maxsize=2048)
def _market_order(p1: float, p2: float, p_over: float | None, eh: float, ea: float) -> dict[str, float]:
    """1UP, 2UP and first-goal probabilities implied by the bookmakers' 1X2 (and their total
    goals when known): betPawa derives these markets from its own 1X2 the same way."""
    from footintel.analysis.value import _fit_lambdas, path_markets

    pm = path_markets(*_fit_lambdas(p1, p2, (eh, ea), p_over))
    keys = {"1UP_1": "up1_home", "1UP_2": "up1_away", "2UP_1": "up2_home", "2UP_2": "up2_away",
            "FG_1": "first_home", "FG_2": "first_away", "FG_0": "none",
            "FGW_1": "first_home_win", "FGW_2": "first_away_win"}
    out = {k: round(pm[v], 4) for k, v in keys.items()}
    if p_over is not None:
        out |= {"O2.5": round(p_over, 4), "U2.5": round(1 - p_over, 4)}
    return out


@router.get("/tickets")
def tickets() -> dict:
    """Tickets du jour (D69): three combos of 10 or more for each of the next two match days,
    with every alternative of each match. Market 1X2 and over 2.5 when known, else the model's."""
    from datetime import UTC, datetime

    from footintel.analysis import scenario_adjust
    from footintel.analysis.tickets import LOCAL_OFFSET, day_tickets, load_journal
    from footintel.config import get_settings

    board = value_board(days=4)["matches"]
    learnt = scenario_adjust.load(get_settings().artifacts_dir)
    ids = [m["id"] for m in board]
    snaps = {r["match_id"]: r for r in _rows("""
        SELECT DISTINCT ON (p.match_id) p.match_id, p.feature_snapshot AS snap, c.type AS ctype
        FROM predictions p JOIN matches m ON m.id = p.match_id JOIN competitions c ON c.id = m.competition_id
        WHERE p.match_id = ANY(:ids) ORDER BY p.match_id, p.predicted_at DESC""", ids=ids)} if ids else {}
    # Each team's domestic league (its latest league match), to find the owner's teams in cups.
    leagues = {r["id"]: r for r in _rows("""
        SELECT m.id,
          (SELECT c.code FROM matches x JOIN competitions c ON c.id = x.competition_id
           WHERE c.type = 'league' AND m.home_team_id IN (x.home_team_id, x.away_team_id)
           ORDER BY x.kickoff_date DESC LIMIT 1) AS home_league,
          (SELECT c.code FROM matches x JOIN competitions c ON c.id = x.competition_id
           WHERE c.type = 'league' AND m.away_team_id IN (x.home_team_id, x.away_team_id)
           ORDER BY x.kickoff_date DESC LIMIT 1) AS away_league
        FROM matches m WHERE m.id = ANY(:ids)""", ids=ids)} if ids else {}
    matches = []
    now = datetime.now(UTC)
    for m in board:
        if m["kickoff_utc"] and m["kickoff_utc"] <= now:
            continue  # already started: no longer playable
        mk = m.get("market") or {}
        model = {r["key"]: r["prob"] for r in m["markets"]}
        p1, p2 = (mk["1"], mk["2"]) if mk.get("1") else (model.get("1"), model.get("2"))
        if p1 is None or p2 is None:
            continue
        # D72: league matches only, where the scenario weights were learnt.
        s = snaps.get(m["id"]) or {}
        notes = []
        if s.get("ctype") == "league":
            p1, p2, notes = scenario_adjust.adjust(p1, p2, s.get("snap"), learnt, m["home"], m["away"],
                                                     m["competition"])
        matches.append({k: m[k] for k in ("id", "kickoff_date", "kickoff_utc", "competition", "home", "away")}
                       | {"p1": p1, "p2": p2, "p_over": mk.get("O2.5") or model.get("O2.5"),
                          "source": "marché" if mk.get("1") else "modèle", "scenarios": notes,
                          "home_league": (leagues.get(m["id"]) or {}).get("home_league"),
                          "away_league": (leagues.get(m["id"]) or {}).get("away_league")})
    today = (datetime.now(UTC) + LOCAL_OFFSET).date()
    return {"days": day_tickets(matches, load_journal(), today),
            "note": "Cotes betPawa vérifiées sur les captures du propriétaire quand « vérifiée », sinon estimées "
                    "par la marge mesurée de chaque marché (docs/RESULTS.md). Aucun avantage démontré sur le marché."}


@router.get("/lecture")
def lecture() -> dict:
    """Lecture du jour (D77): one checked text per competition, or no groups."""
    from footintel.agents.analysts import latest
    from footintel.config import get_settings
    from footintel.notify.tickets import local_today

    return latest(get_settings().artifacts_dir, local_today()) or {"date": None, "groups": []}


@router.get("/bilan")
def bilan() -> dict:
    """Bilan (D76): the archived tickets of the last 7 days settled, and the model's and the
    bookmakers' favourite against the result for the finished matches."""
    from footintel.analysis.bilan import day_results, forecast_results, ticket_results
    from footintel.config import get_settings
    from footintel.notify.tickets import local_today

    engine = get_engine()
    return {"tickets": ticket_results(engine, get_settings().artifacts_dir),
            "matches": forecast_results(engine),
            # D87: every result of the last day played, for the "Hier" block of the Today page.
            "yesterday": day_results(engine, local_today())}


@router.get("/value-board")
def value_board(days: int = 7) -> dict:
    """Upcoming predicted matches with the model probability of each betting market."""
    from footintel.analysis.value import RELIABILITY, market_consensus, market_probabilities

    rows = _rows("""
        SELECT m.id, m.kickoff_date, m.kickoff_utc, c.code AS competition, c.name AS competition_name,
               th.name AS home, ta.name AS away, p.p_home, p.p_draw, p.p_away, p.p_over_1_5, p.p_over_2_5,
               p.p_over_3_5, p.p_btts, p.exp_home_goals, p.exp_away_goals, p.predicted_at,
               p.sufficient_data, (p.feature_snapshot->>'mkt_p_home') IS NOT NULL AS has_odds,
               (p.feature_snapshot->>'elo_home')::float AS elo_home, (p.feature_snapshot->>'elo_away')::float AS elo_away,
               mv.name || ' v' || mv.version AS model
        FROM matches m JOIN competitions c ON c.id = m.competition_id
        JOIN teams th ON th.id = m.home_team_id JOIN teams ta ON ta.id = m.away_team_id
        JOIN LATERAL (SELECT * FROM predictions p WHERE p.match_id = m.id
                      ORDER BY p.predicted_at DESC LIMIT 1) p ON TRUE
        JOIN model_versions mv ON mv.id = p.model_version_id
        WHERE m.status = 'scheduled' AND m.kickoff_date >= CURRENT_DATE
          AND m.kickoff_date <= CURRENT_DATE + CAST(:d AS int)
        ORDER BY m.kickoff_utc NULLS LAST, m.kickoff_date""", d=days)
    prices, captured = _odds_api_prices([r["id"] for r in rows])
    overs = _market_over_2_5([r["id"] for r in rows])
    matches = []
    for r in rows:
        market = market_consensus(prices.get(r["id"], []))
        if market:
            market["captured_at"] = captured.get(r["id"])
            market |= _market_order(market["1"], market["2"], overs.get(r["id"]),
                                    r["exp_home_goals"] or 1.4, r["exp_away_goals"] or 1.1)
        matches.append({k: r[k] for k in ("id", "kickoff_date", "kickoff_utc", "competition", "competition_name",
                                          "home", "away", "predicted_at", "has_odds", "model")}
                       | {"markets": market_probabilities(r), "market": market,
                          "elo": [round(r["elo_home"]), round(r["elo_away"])] if r["elo_home"] and r["elo_away"] else None})
    return {"generated_for_days": days, "reliability": RELIABILITY, "matches": matches}
