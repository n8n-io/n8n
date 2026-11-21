"""Match page insights: form, head-to-head, standings, scorers, last line-up, tactical
profile and who scores first.

Rules (D52):
- Every figure comes from matches played before the kick-off of the match shown.
- A style label is written only from a measured figure, against the same competition's
  average for the same season, with the threshold below. The figure is always shown.
- These insights are for reading. The active model does not use them (D47, D51).
"""

import math
import re
from dataclasses import dataclass
from datetime import date

import pandas as pd
from sqlalchemy import Engine, text

from footintel.connectors.base import season_start_for

# Thresholds fixed before reading any team's figures.
POSSESSION_HIGH, POSSESSION_LOW = 55.0, 45.0
RATIO_HIGH, RATIO_LOW = 1.20, 0.80  # against the competition average
HALF_SHARE = 0.60  # share of goals scored in one half
FIRST_GOAL_HIGH = 0.60
MIN_MATCHES = 4

_PLAYED_SQL = text("""
SELECT m.id, m.kickoff_date, m.kickoff_utc, c.code AS competition, c.type AS ctype, se.start_year AS season,
       m.round, m.home_team_id, m.away_team_id, th.name AS home, ta.name AS away,
       o.home_goals, o.away_goals, o.ht_home_goals, o.ht_away_goals
FROM matches m
JOIN competitions c ON c.id = m.competition_id
JOIN seasons se ON se.id = m.season_id
JOIN match_outcomes o ON o.match_id = m.id
JOIN teams th ON th.id = m.home_team_id JOIN teams ta ON ta.id = m.away_team_id
WHERE se.start_year >= :since AND m.kickoff_date < :before
""")

_STATS_SQL = text("""
SELECT s.match_id, s.team_id, s.shots, s.shots_on_target
FROM team_match_statistics s JOIN matches m ON m.id = s.match_id JOIN seasons se ON se.id = m.season_id
WHERE se.start_year = :season AND m.kickoff_date < :before
""")

_TACTICS_SQL = text("""
SELECT t.match_id, t.team_id, t.formation, t.possession_pct
FROM team_match_tactics t JOIN data_sources d ON d.id = t.source_id AND d.code = 'onefootball'
JOIN matches m ON m.id = t.match_id JOIN seasons se ON se.id = m.season_id
WHERE se.start_year = :season AND m.kickoff_date < :before AND t.kind = 'official'
""")

_GOALS_SQL = text("""
SELECT e.match_id, e.team_id, e.minute, coalesce(e.extra_minute, 0) AS extra, e.detail,
       m.home_team_id, m.away_team_id
FROM match_events e JOIN data_sources d ON d.id = e.source_id AND d.code = 'onefootball'
JOIN matches m ON m.id = e.match_id JOIN seasons se ON se.id = m.season_id
WHERE se.start_year = :season AND m.kickoff_date < :before AND e.type = 'goal'
""")

_LINEUP_SQL = text("""
SELECT l.id, p.name, l.position, t.formation, m.kickoff_date, th.name AS home, ta.name AS away,
       (m.home_team_id = :team) AS at_home
FROM lineups l
JOIN players p ON p.id = l.player_id
JOIN data_sources d ON d.id = l.source_id AND d.code = 'onefootball'
JOIN matches m ON m.id = l.match_id
JOIN teams th ON th.id = m.home_team_id JOIN teams ta ON ta.id = m.away_team_id
LEFT JOIN team_match_tactics t ON t.match_id = l.match_id AND t.team_id = l.team_id AND t.source_id = l.source_id
WHERE l.team_id = :team AND l.is_starter AND m.kickoff_date < :before
  AND l.match_id = (SELECT l2.match_id FROM lineups l2 JOIN matches m2 ON m2.id = l2.match_id
                    WHERE l2.team_id = :team AND l2.source_id = l.source_id AND m2.kickoff_date < :before
                    ORDER BY m2.kickoff_date DESC LIMIT 1)
ORDER BY l.id
""")

_STARTS_SQL = text("""
SELECT p.name, count(*) AS starts
FROM lineups l JOIN players p ON p.id = l.player_id
JOIN data_sources d ON d.id = l.source_id AND d.code = 'onefootball'
JOIN matches m ON m.id = l.match_id JOIN seasons se ON se.id = m.season_id
WHERE l.team_id = :team AND l.is_starter AND se.start_year = :season AND m.kickoff_date < :before
GROUP BY p.name ORDER BY starts DESC, p.name LIMIT 14
""")

_NEXT_SQL = text("""
SELECT m.kickoff_date, m.kickoff_utc, m.round, th.name AS home, ta.name AS away
FROM matches m JOIN competitions c ON c.id = m.competition_id
JOIN teams th ON th.id = m.home_team_id JOIN teams ta ON ta.id = m.away_team_id
WHERE c.code = :comp AND m.status = 'scheduled' AND m.kickoff_date >= :before
ORDER BY m.kickoff_date, m.kickoff_utc LIMIT 10
""")

_DETAIL = re.compile(r"^(?P<label>[^:]+)(?::\s*(?P<player>[^/]+?))?(?:\s*/\s*(?P<other>.+))?$")


def _result(gf, ga) -> str:
    return "V" if gf > ga else "N" if gf == ga else "D"


def _team_rows(played: pd.DataFrame, team_id: int) -> pd.DataFrame:
    """One row per match of the team, from its side: goals for and against, opponent."""
    home = played[played.home_team_id == team_id].assign(
        at_home=True, opponent=lambda d: d.away, gf=lambda d: d.home_goals, ga=lambda d: d.away_goals,
        ht_gf=lambda d: d.ht_home_goals, ht_ga=lambda d: d.ht_away_goals)
    away = played[played.away_team_id == team_id].assign(
        at_home=False, opponent=lambda d: d.home, gf=lambda d: d.away_goals, ga=lambda d: d.home_goals,
        ht_gf=lambda d: d.ht_away_goals, ht_ga=lambda d: d.ht_home_goals)
    rows = pd.concat([home, away]).sort_values("kickoff_date", ascending=False)
    rows["result"] = [_result(f, a) for f, a in zip(rows.gf, rows.ga)]
    return rows


def _form(rows: pd.DataFrame, n: int = 6) -> list[dict]:
    return [{"date": r.kickoff_date.isoformat(), "competition": r.competition, "opponent": r.opponent,
             "at_home": bool(r.at_home), "gf": int(r.gf), "ga": int(r.ga), "result": r.result}
            for r in rows.head(n).itertuples()]


def _streaks(rows: pd.DataFrame) -> dict:
    def run(cond) -> int:
        k = 0
        for c in cond:
            if not c:
                break
            k += 1
        return k
    return {"unbeaten": run(r != "D" for r in rows.result), "wins": run(r == "V" for r in rows.result),
            "winless": run(r != "V" for r in rows.result), "scored": run(g > 0 for g in rows.gf),
            "clean_sheets": run(g == 0 for g in rows.ga)}


def standings(played: pd.DataFrame, competition: str, season: int) -> list[dict]:
    df = played[(played.competition == competition) & (played.season == season)]
    table: dict[int, dict] = {}
    for r in df.itertuples():
        for tid, name, gf, ga in ((r.home_team_id, r.home, r.home_goals, r.away_goals),
                                  (r.away_team_id, r.away, r.away_goals, r.home_goals)):
            t = table.setdefault(tid, {"team_id": int(tid), "team": name, "played": 0, "won": 0, "drawn": 0,
                                       "lost": 0, "gf": 0, "ga": 0, "points": 0, "form": []})
            res = _result(gf, ga)
            t["played"] += 1
            t["gf"] += int(gf)
            t["ga"] += int(ga)
            t["won" if res == "V" else "drawn" if res == "N" else "lost"] += 1
            t["points"] += 3 if res == "V" else 1 if res == "N" else 0
            t["form"].append((r.kickoff_date, res))
    rows = sorted(table.values(), key=lambda t: (-t["points"], -(t["gf"] - t["ga"]), -t["gf"], t["team"]))
    for i, t in enumerate(rows, 1):
        t["rank"] = i
        t["form"] = [res for _, res in sorted(t["form"], reverse=True)[:5]]
    return rows


def _goal_events(goals: pd.DataFrame) -> pd.DataFrame:
    """Goals with the scorer's name, the time in minutes and the team credited."""
    if goals.empty:
        return goals.assign(scorer=None, t=None, credited=None, own=False)
    parsed = goals.detail.str.extract(_DETAIL)
    goals = goals.assign(scorer=parsed.player.str.strip(), label=parsed.label.str.strip(),
                         t=goals.minute.fillna(0) + goals.extra / 100)
    goals["own"] = goals.label.str.lower().str.contains("own")
    # The source already files an own goal under the team it counts for: summed this way,
    # the goals of all 322 matches read on 2026-10-29 give their final scores exactly.
    goals["credited"] = goals.team_id
    return goals


@dataclass
class Profile:
    matches: int
    figures: dict
    labels: list[dict]


def _profile(team_id: int, rows: pd.DataFrame, comp_rows: pd.DataFrame, stats: pd.DataFrame,
             tactics: pd.DataFrame, goals: pd.DataFrame) -> Profile:
    """Measured style of a team this season, each figure next to its competition's average."""
    f: dict = {"matches": int(len(rows))}
    labels: list[dict] = []
    if len(rows) < MIN_MATCHES:
        return Profile(len(rows), f, labels)
    ids = set(rows.id)
    st = stats[stats.match_id.isin(ids)]
    mine, theirs = st[st.team_id == team_id], st[st.team_id != team_id]
    comp_ids = set(comp_rows.id)
    comp_st = stats[stats.match_id.isin(comp_ids)]

    def per_match(s):
        s = pd.to_numeric(s, errors="coerce").dropna()
        return float(s.mean()) if len(s) >= MIN_MATCHES else None

    f["goals_for"] = float(rows.gf.mean())
    f["goals_against"] = float(rows.ga.mean())
    f["shots_for"] = per_match(mine.shots)
    f["shots_against"] = per_match(theirs.shots)
    comp_shots = per_match(comp_st.shots)
    f["comp_shots"] = comp_shots
    sot = pd.to_numeric(mine.shots_on_target, errors="coerce").dropna()
    if len(sot) >= MIN_MATCHES and sot.sum() > 0:
        gf_with_sot = rows[rows.id.isin(mine.dropna(subset=["shots_on_target"]).match_id)].gf.sum()
        f["conversion"] = float(gf_with_sot / sot.sum())
    comp_sot = pd.to_numeric(comp_st.shots_on_target, errors="coerce").dropna()
    if len(comp_sot) and comp_sot.sum() > 0:
        comp_goals = comp_rows[comp_rows.id.isin(comp_st.dropna(subset=["shots_on_target"]).match_id)]
        f["comp_conversion"] = float((comp_goals.home_goals.sum() + comp_goals.away_goals.sum()) / comp_sot.sum())
    tac = tactics[(tactics.team_id == team_id) & tactics.match_id.isin(ids)]
    pos = pd.to_numeric(tac.possession_pct, errors="coerce").dropna()
    if len(pos) >= MIN_MATCHES:
        f["possession"] = float(pos.mean())
    forms = tac.formation.dropna()
    if len(forms):
        counts = forms.value_counts()
        f["formation"] = counts.index[0]
        f["formation_share"] = float(counts.iloc[0] / len(forms))
        f["formations"] = {k: int(v) for k, v in counts.head(3).items()}
    ht = rows.dropna(subset=["ht_gf"])
    if len(ht) >= MIN_MATCHES and rows.gf.sum() > 0:
        first_half = ht.ht_gf.sum()
        total = ht.gf.sum()
        if total > 0:
            f["second_half_share"] = float((total - first_half) / total)
    g = goals[goals.match_id.isin(ids)]
    if len(g):
        first = g.sort_values("t").groupby("match_id").first()
        n_with_goal = len(first)
        f["first_goal_matches"] = int(n_with_goal)
        f["scored_first"] = float((first.credited == team_id).mean())
        firsts = rows[rows.id.isin(first.index)].set_index("id")
        mine_first = firsts[first.loc[firsts.index, "credited"] == team_id]
        if len(mine_first):
            f["win_when_first"] = float((mine_first.result == "V").mean())
            f["n_first"] = int(len(mine_first))

    def ratio(a, b):
        return a / b if a is not None and b else None

    if "possession" in f:
        if f["possession"] >= POSSESSION_HIGH:
            labels.append({"key": "possession", "text": "Aime avoir le ballon"})
        elif f["possession"] <= POSSESSION_LOW:
            labels.append({"key": "transition", "text": "Laisse le ballon et joue en transition"})
        else:
            labels.append({"key": "balanced", "text": "Partage le ballon"})
    conv = ratio(f.get("conversion"), f.get("comp_conversion"))
    if conv is not None and conv >= RATIO_HIGH:
        labels.append({"key": "clinical", "text": "Clinique devant le but"})
    elif conv is not None and conv <= RATIO_LOW:
        labels.append({"key": "wasteful", "text": "Gâche beaucoup d'occasions"})
    shots_ag = ratio(f.get("shots_against"), comp_shots)  # both are per team and per match
    if shots_ag is not None and shots_ag <= 2 - RATIO_HIGH:
        labels.append({"key": "solid", "text": "Concède peu d'occasions"})
    elif shots_ag is not None and shots_ag >= RATIO_HIGH:
        labels.append({"key": "exposed", "text": "Concède beaucoup d'occasions"})
    share = f.get("second_half_share")
    if share is not None and share >= HALF_SHARE:
        labels.append({"key": "late", "text": "Marque surtout en seconde période"})
    elif share is not None and share <= 1 - HALF_SHARE:
        labels.append({"key": "early", "text": "Marque surtout en première période"})
    if f.get("scored_first") is not None and f.get("first_goal_matches", 0) >= MIN_MATCHES \
            and f["scored_first"] >= FIRST_GOAL_HIGH:
        labels.append({"key": "first", "text": "Ouvre souvent le score"})
    return Profile(len(rows), f, labels)


# Plain explanations of each style, shown under the label.
GLOSSARY = {
    "possession": "L'équipe construit par la passe et garde le ballon longtemps. Elle impose le rythme, "
                  "mais en le perdant haut sur le terrain elle laisse de l'espace dans son dos.",
    "transition": "L'équipe accepte de ne pas avoir le ballon, défend groupée et attaque vite dès qu'elle "
                  "le récupère. Elle est dangereuse quand l'adversaire monte avec beaucoup de joueurs.",
    "balanced": "Ni équipe de possession, ni équipe de contre : elle s'adapte à l'adversaire.",
    "clinical": "Une part de tirs cadrés transformés en buts plus haute que la moyenne de la compétition : "
                "elle a besoin de peu d'occasions pour marquer.",
    "wasteful": "Beaucoup de tirs cadrés pour peu de buts : elle crée mais ne conclut pas assez.",
    "solid": "Ses adversaires tirent nettement moins que la moyenne : le bloc défensif tient.",
    "exposed": "Ses adversaires tirent nettement plus que la moyenne : la défense laisse des occasions.",
    "late": "La majorité de ses buts arrivent après la pause cette saison. Sur 164 135 matchs, ce "
            "profil ne se répète presque pas d'une saison à l'autre : c'est une description, pas une prévision.",
    "early": "La majorité de ses buts arrivent avant la pause cette saison. Sur 164 135 matchs, ce "
             "profil ne se répète presque pas d'une saison à l'autre : c'est une description, pas une prévision.",
    "first": "Elle ouvre le score dans la majorité de ses matchs où un but est marqué.",
}


def first_goal(exp_home: float | None, exp_away: float | None) -> dict | None:
    """Who scores first if goals arrive at a steady rate (Poisson): P(home), P(away), P(0-0)."""
    if not exp_home or not exp_away:
        return None
    total = exp_home + exp_away
    p_goal = 1 - math.exp(-total)
    return {"home": exp_home / total * p_goal, "away": exp_away / total * p_goal, "none": 1 - p_goal}


def _matchup(home: str, away: str, ph: Profile, pa: Profile, fg: dict | None) -> list[str]:
    """Plain sentences on how the two measured profiles meet. Only rules on measured labels."""
    out = []
    lh, la = {x["key"] for x in ph.labels}, {x["key"] for x in pa.labels}
    for a, b, la_, lb_ in ((home, away, lh, la), (away, home, la, lh)):
        if "possession" in la_ and "transition" in lb_:
            extra = " et elle est clinique devant le but" if "clinical" in lb_ else ""
            out.append(f"{a} voudra le ballon ; {b} attend et attaque vite à la récupération{extra}. "
                       f"Chaque perte de balle de {a} peut devenir une occasion pour {b}.")
        if "clinical" in la_ and "exposed" in lb_:
            out.append(f"{a} a besoin de peu d'occasions, et {b} en concède beaucoup : avantage {a} pour marquer.")
        if "exposed" in la_ and "wasteful" in lb_:
            out.append(f"{b} se crée des occasions face à une défense de {a} qui en laisse, "
                       f"mais conclut mal : son efficacité décidera du match.")
    if "transition" in lh and "transition" in la:
        out.append(f"{home} et {away} laissent toutes deux le ballon : match plutôt fermé, où l'équipe "
                   "qui ouvre le score peut ensuite défendre et attendre les espaces.")
    if "possession" in lh and "possession" in la:
        out.append(f"{home} et {away} veulent toutes deux le ballon : la bataille du milieu décidera "
                   "qui contrôle le match.")
    sh, sa = ph.figures.get("scored_first"), pa.figures.get("scored_first")
    if sh is not None and sa is not None and min(ph.figures.get("first_goal_matches", 0),
                                                  pa.figures.get("first_goal_matches", 0)) >= MIN_MATCHES:
        out.append(f"Ouverture du score cette saison : {home} marque le premier but dans {round(100 * sh)} % "
                   f"de ses matchs, {away} dans {round(100 * sa)} %.")
    if fg:
        lead, other = (home, away) if fg["home"] >= fg["away"] else (away, home)
        p = max(fg["home"], fg["away"])
        out.append(f"Premier but : le modèle voit {lead} ouvrir le score dans {round(100 * p)} % des cas, "
                   f"{other} dans {round(100 * min(fg['home'], fg['away']))} %, "
                   f"et aucun but dans {round(100 * fg['none'])} %.")
    for team, prof in ((home, ph), (away, pa)):
        w = prof.figures.get("win_when_first")
        if w is not None and prof.figures.get("n_first", 0) >= MIN_MATCHES:
            out.append(f"Cette saison, quand {team} ouvre le score, elle gagne {round(100 * w)} % de ces matchs "
                       f"({prof.figures['n_first']} matchs).")
    return out


def _scorers(goals: pd.DataFrame, team_id: int, n: int = 5) -> list[dict]:
    g = goals[(goals.credited == team_id) & ~goals.own & goals.scorer.notna()]
    counts = g.groupby("scorer").size().sort_values(ascending=False).head(n)
    pens = g[g.label.str.lower().str.contains("penalty")].groupby("scorer").size()
    return [{"name": k, "goals": int(v), "penalties": int(pens.get(k, 0))} for k, v in counts.items()]


def _lineup(conn, team_id: int, before) -> dict | None:
    rows = conn.execute(_LINEUP_SQL, {"team": team_id, "before": before}).mappings().all()
    if len(rows) != 11:
        return None
    formation = rows[0]["formation"]
    names = [r["name"] for r in rows]  # stored from the forwards to the goalkeeper
    lines = []
    if formation and sum(int(x) for x in formation.split("-")) == 10:
        sizes = [int(x) for x in reversed(formation.split("-"))] + [1]
        i = 0
        for size in sizes:
            lines.append(names[i:i + size])
            i += size
    else:
        lines = [names]
    r0 = rows[0]
    return {"formation": formation, "lines": list(reversed(lines)),  # goalkeeper first
            "date": r0["kickoff_date"].isoformat(), "opponent": r0["away"] if r0["at_home"] else r0["home"]}


def match_insights(engine: Engine, match: dict, prediction: dict | None) -> dict:
    from footintel.analysis.periods import first_goal_effect, team_periods

    before = match["kickoff_date"]
    season = season_start_for(before if isinstance(before, date) else date.fromisoformat(str(before)))
    with engine.connect() as conn:
        played = pd.read_sql(_PLAYED_SQL, conn, params={"since": season - 8, "before": before})
        stats = pd.read_sql(_STATS_SQL, conn, params={"season": season, "before": before})
        tactics = pd.read_sql(_TACTICS_SQL, conn, params={"season": season, "before": before})
        goals = _goal_events(pd.read_sql(_GOALS_SQL, conn, params={"season": season, "before": before}))
        lineups = {k: _lineup(conn, match[f"{k}_team_id"], before) for k in ("home", "away")}
        upcoming = [dict(r) for r in conn.execute(_NEXT_SQL, {"comp": match["competition"],
                                                             "before": before}).mappings().all()]
        starts = {k: [dict(r) for r in conn.execute(_STARTS_SQL, {"team": match[f"{k}_team_id"], "season": season,
                                                                 "before": before}).mappings().all()]
                  for k in ("home", "away")}
    if not played.empty:
        played["kickoff_date"] = pd.to_datetime(played.kickoff_date).dt.date
    comp = match["competition"]
    out: dict = {"season": season, "teams": {}}
    profiles = {}
    for side in ("home", "away"):
        tid = match[f"{side}_team_id"]
        rows = _team_rows(played, tid) if not played.empty else pd.DataFrame()
        season_rows = rows[rows.season == season] if len(rows) else rows
        comp_season = played[(played.competition == comp) & (played.season == season)] if not played.empty else played
        # A cup's profile is read on the team's own league matches, where the statistics are.
        own = season_rows[season_rows.ctype == "league"] if len(season_rows) else season_rows
        base = own if len(own) >= MIN_MATCHES else season_rows
        comp_base = played[(played.competition.isin(set(base.competition))) & (played.season == season)] \
            if len(base) else comp_season
        prof = _profile(tid, base, comp_base, stats, tactics, goals) if len(base) else Profile(0, {}, [])
        profiles[side] = prof
        out["teams"][side] = {
            "name": match[side],
            "form_all": _form(rows) if len(rows) else [],
            "form_comp": _form(rows[rows.competition == comp]) if len(rows) else [],
            "streaks": _streaks(rows) if len(rows) else {},
            "profile": {"matches": prof.matches, "figures": prof.figures, "labels": prof.labels},
            "scorers": _scorers(goals, tid) if len(goals) else [],
            "lineup": lineups[side],
            "regulars": starts[side],
            "periods": team_periods(engine, tid, season, before),
            "first_goal": first_goal_effect(engine, tid, season, before,
                                            sorted(set(own.competition)) if len(own) else [comp]),
        }
    if not played.empty:
        h, a = match["home_team_id"], match["away_team_id"]
        h2h = played[((played.home_team_id == h) & (played.away_team_id == a))
                     | ((played.home_team_id == a) & (played.away_team_id == h))].sort_values("kickoff_date", ascending=False)
        out["h2h"] = [{"date": r.kickoff_date.isoformat(), "competition": r.competition, "home": r.home,
                       "away": r.away, "score": f"{int(r.home_goals)}-{int(r.away_goals)}"}
                      for r in h2h.head(6).itertuples()]
        out["standings"] = standings(played, comp, season)
        recent = played[(played.competition == comp) & (played.season == season)].sort_values(
            ["kickoff_date", "id"], ascending=False).head(10)
        out["recent_results"] = [{"date": r.kickoff_date.isoformat(), "round": r.round, "home": r.home,
                                  "away": r.away, "score": f"{int(r.home_goals)}-{int(r.away_goals)}"}
                                 for r in recent.itertuples()]
    out["next_fixtures"] = [{**u, "kickoff_date": u["kickoff_date"].isoformat(),
                             "kickoff_utc": u["kickoff_utc"].isoformat() if u["kickoff_utc"] else None}
                            for u in upcoming]
    fg = first_goal(prediction.get("exp_home_goals") if prediction else None,
                    prediction.get("exp_away_goals") if prediction else None)
    out["first_goal"] = fg
    out["matchup"] = _matchup(match["home"], match["away"], profiles["home"], profiles["away"], fg)
    out["glossary"] = GLOSSARY
    from footintel.analysis.summary import key_facts

    out["key_facts"] = key_facts(out)
    return out
