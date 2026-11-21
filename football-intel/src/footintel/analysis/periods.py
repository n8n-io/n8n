"""When a team scores and concedes: by half over several seasons, by 15-minute window this season.

A test on 164 135 league matches (2005-2026, scripts/half_profile_check.py, D59) found that
being better in one half than in the other barely repeats: r = 0.045 from one season to the
next, r = 0.035 between the odd and even matches of one season, against r = 0.47 for the
overall goal difference. These figures describe the past; they are not a betting signal.
"""

import pandas as pd
from sqlalchemy import Engine, text

from footintel.analysis.matchup import _goal_events

HALF_SEASONS = 3  # past seasons read for the half-time profile, plus the current one
WINDOWS = [("0-15", 0, 15.99), ("16-30", 16, 30.99), ("31-45+", 31, 45.99),
           ("46-60", 46, 60.99), ("61-75", 61, 75.99), ("76-90+", 76, 200)]
PERSISTENCE_NOTE = ("Test sur 164 135 matchs (2005-2026) : être meilleur dans une mi-temps que dans "
                    "l'autre ne se répète presque pas d'une saison à l'autre (corrélation 0,05), ni "
                    "même entre deux moitiés d'une saison (0,04). Ces chiffres décrivent le passé ; "
                    "ils ne prédisent pas le prochain match.")

_HALVES_SQL = text("""
SELECT se.start_year AS season,
       CASE WHEN m.home_team_id = :t THEN o.ht_home_goals ELSE o.ht_away_goals END AS gf1,
       CASE WHEN m.home_team_id = :t THEN o.ht_away_goals ELSE o.ht_home_goals END AS ga1,
       CASE WHEN m.home_team_id = :t THEN o.home_goals ELSE o.away_goals END AS gf,
       CASE WHEN m.home_team_id = :t THEN o.away_goals ELSE o.home_goals END AS ga
FROM matches m JOIN match_outcomes o ON o.match_id = m.id JOIN seasons se ON se.id = m.season_id
JOIN competitions c ON c.id = m.competition_id
WHERE :t IN (m.home_team_id, m.away_team_id) AND c.type = 'league'
  AND o.ht_home_goals IS NOT NULL AND se.start_year >= :since AND m.kickoff_date < :before
""")

_READ_SQL = text("""
SELECT DISTINCT m.id FROM matches m
JOIN match_external_refs r ON r.match_id = m.id
JOIN data_sources d ON d.id = r.source_id AND d.code = 'onefootball'
JOIN seasons se ON se.id = m.season_id JOIN match_outcomes o ON o.match_id = m.id
WHERE :t IN (m.home_team_id, m.away_team_id) AND se.start_year = :season AND m.kickoff_date < :before
""")

_GOALS_SQL = text("""
SELECT e.match_id, e.team_id, e.minute, coalesce(e.extra_minute, 0) AS extra, e.detail
FROM match_events e JOIN data_sources d ON d.id = e.source_id AND d.code = 'onefootball'
WHERE e.type = 'goal' AND e.match_id = ANY(:ids)
""")


def _halves(rows: pd.DataFrame) -> dict | None:
    if rows.empty:
        return None
    r = rows.astype(float)
    gf2, ga2 = r.gf - r.gf1, r.ga - r.ga1
    n = len(r)
    return {"matches": n, "gf1": float(r.gf1.mean()), "ga1": float(r.ga1.mean()),
            "gf2": float(gf2.mean()), "ga2": float(ga2.mean()),
            "won1": float((r.gf1 > r.ga1).mean()), "won2": float((gf2 > ga2).mean())}


def team_periods(engine: Engine, team_id: int, season: int, before) -> dict:
    with engine.connect() as conn:
        halves = pd.read_sql(_HALVES_SQL, conn, params={"t": team_id, "since": season - HALF_SEASONS,
                                                        "before": before})
        ids = [r[0] for r in conn.execute(_READ_SQL, {"t": team_id, "season": season, "before": before})]
        goals = _goal_events(pd.read_sql(_GOALS_SQL, conn, params={"ids": ids})) if ids else pd.DataFrame()
    out: dict = {"halves_all": _halves(halves), "halves_season": _halves(halves[halves.season == season]),
                 "since": season - HALF_SEASONS, "windows": None, "note": PERSISTENCE_NOTE}
    if ids:
        windows = []
        for label, lo, hi in WINDOWS:
            inside = goals[(goals.t >= lo) & (goals.t <= hi)] if len(goals) else goals
            windows.append({"window": label,
                            "for": int((inside.credited == team_id).sum()) if len(inside) else 0,
                            "against": int((inside.credited != team_id).sum()) if len(inside) else 0})
        mid = goals[(goals.t >= 30) & (goals.t < 61)] if len(goals) else goals
        out["windows"] = {"matches": len(ids), "rows": windows,
                          "w30_60": {"for": int((mid.credited == team_id).sum()) if len(mid) else 0,
                                     "against": int((mid.credited != team_id).sum()) if len(mid) else 0}}
    return out


_SEASON_GOALS_SQL = text("""
SELECT m.id AS match_id, m.home_team_id, m.away_team_id, c.code AS competition,
       o.home_goals, o.away_goals, e.team_id, e.minute, coalesce(e.extra_minute, 0) AS extra, e.detail
FROM matches m
JOIN match_external_refs r ON r.match_id = m.id
JOIN data_sources d ON d.id = r.source_id AND d.code = 'onefootball'
JOIN seasons se ON se.id = m.season_id JOIN competitions c ON c.id = m.competition_id
JOIN match_outcomes o ON o.match_id = m.id
LEFT JOIN match_events e ON e.match_id = m.id AND e.source_id = r.source_id AND e.type = 'goal'
WHERE se.start_year = :season AND m.kickoff_date < :before AND c.code = ANY(:comps)
""")


def _flows(df: pd.DataFrame) -> pd.DataFrame:
    """One row per (match, team): who scored first, biggest lead, final result."""
    rows = []
    goals = _goal_events(df.dropna(subset=["team_id"]).copy()) if df.team_id.notna().any() else df.iloc[0:0]
    for mid, m in df.drop_duplicates("match_id").set_index("match_id").iterrows():
        g = goals[goals.match_id == mid].sort_values("t") if len(goals) else goals
        seq = [1 if c == m.home_team_id else -1 for c in g.credited] if len(g) else []
        run, lead_h, lead_a = 0, 0, 0
        for s in seq:
            run += s
            lead_h, lead_a = max(lead_h, run), max(lead_a, -run)
        first = 0 if not seq else seq[0]
        for team, sign, gf, ga, lead in ((m.home_team_id, 1, m.home_goals, m.away_goals, lead_h),
                                         (m.away_team_id, -1, m.away_goals, m.home_goals, lead_a)):
            rows.append({"match_id": mid, "team": team, "competition": m.competition,
                         "first": "none" if first == 0 else ("for" if first == sign else "against"),
                         "lead2": lead >= 2, "result": "W" if gf > ga else ("D" if gf == ga else "L")})
    return pd.DataFrame(rows)


def _after(rows: pd.DataFrame) -> dict | None:
    if rows.empty:
        return None
    r = rows.result
    return {"n": int(len(r)), "win": float((r == "W").mean()), "draw": float((r == "D").mean()),
            "loss": float((r == "L").mean()),
            "points": float(((r == "W") * 3 + (r == "D")).mean())}


def first_goal_effect(engine: Engine, team_id: int, season: int, before, competitions: list[str]) -> dict | None:
    """What happens after the first goal: this team, and every team of the same competitions."""
    with engine.connect() as conn:
        df = pd.read_sql(_SEASON_GOALS_SQL, conn, params={"season": season, "before": before,
                                                          "comps": competitions})
    if df.empty:
        return None
    flows = _flows(df)
    mine = flows[flows.team == team_id]
    if mine.empty:
        return None

    def block(f):
        return {"scored_first": _after(f[f["first"] == "for"]), "conceded_first": _after(f[f["first"] == "against"]),
                "led_by_two": _after(f[f.lead2])}
    return {"matches": int(len(mine)), "team": block(mine), "league": block(flows),
            "league_matches": int(flows.match_id.nunique())}
