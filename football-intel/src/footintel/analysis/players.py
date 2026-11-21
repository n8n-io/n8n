"""Player and unit impact for the match page (D53).

From the OneFootball line-ups of the season: the role of each starter from his place in the
formation, the team's figures in the matches he started against those he did not, the
centre-back pairs used, and a match-by-match timeline of each line.

These are associations over a few matches, not effects: the opponent's strength is not
adjusted, and a split is only judged with at least MIN_SPLIT matches on each side.
"""

from collections import defaultdict

import pandas as pd
from sqlalchemy import Engine, text

MIN_SPLIT = 3  # matches with and without a player before a gap is stated
STRONG_SPLIT = 5  # below this on either side, the gap is marked as a weak sample
GAP_GOALS = 0.5  # goals per match: a gap smaller than this is reported as no clear gap

ROLE_FR = {"GK": "Gardien", "CB": "Défenseur central", "FB": "Latéral", "WB": "Piston",
           "DM": "Milieu défensif", "CM": "Milieu central", "WM": "Milieu excentré",
           "AM": "Milieu offensif", "W": "Ailier", "ST": "Attaquant"}
LINE_OF = {"GK": "defence", "CB": "defence", "FB": "defence", "WB": "defence",
           "DM": "midfield", "CM": "midfield", "WM": "midfield", "AM": "attack", "W": "attack", "ST": "attack"}

_LINEUPS_SQL = text("""
SELECT l.id, l.match_id, p.name, t.formation, m.kickoff_date,
       CASE WHEN m.home_team_id = :team THEN ta.name ELSE th.name END AS opponent,
       (m.home_team_id = :team) AS at_home,
       CASE WHEN m.home_team_id = :team THEN o.home_goals ELSE o.away_goals END AS gf,
       CASE WHEN m.home_team_id = :team THEN o.away_goals ELSE o.home_goals END AS ga
FROM lineups l
JOIN players p ON p.id = l.player_id
JOIN data_sources d ON d.id = l.source_id AND d.code = 'onefootball'
JOIN matches m ON m.id = l.match_id
JOIN seasons se ON se.id = m.season_id
JOIN match_outcomes o ON o.match_id = m.id
JOIN teams th ON th.id = m.home_team_id JOIN teams ta ON ta.id = m.away_team_id
LEFT JOIN team_match_tactics t ON t.match_id = l.match_id AND t.team_id = l.team_id AND t.source_id = l.source_id
WHERE l.team_id = :team AND l.is_starter AND se.start_year = :season AND m.kickoff_date < :before
ORDER BY m.kickoff_date, l.id
""")

_SHOTS_SQL = text("""
SELECT s.match_id, sum(CASE WHEN s.team_id = :team THEN s.shots END) AS shots_for,
       sum(CASE WHEN s.team_id <> :team THEN s.shots END) AS shots_against,
       sum(CASE WHEN s.team_id = :team THEN s.shots_on_target END) AS sot_for
FROM team_match_statistics s WHERE s.match_id = ANY(:ids) GROUP BY s.match_id
""")

_EVENTS_SQL = text("""
SELECT e.match_id, e.type, e.detail, e.minute, coalesce(e.extra_minute, 0) AS extra, e.team_id FROM match_events e
JOIN data_sources d ON d.id = e.source_id AND d.code = 'onefootball'
WHERE e.match_id = ANY(:ids) AND e.type IN ('goal', 'card')
""")


def roles(formation: str | None, names: list[str]) -> list[tuple[str, str]]:
    """(name, role) for 11 starters stored from the forwards to the goalkeeper."""
    if not formation or len(names) != 11:
        return [(n, "") for n in names]
    try:
        back_to_front = [int(x) for x in formation.split("-")]
    except ValueError:
        return [(n, "") for n in names]
    if sum(back_to_front) != 10:
        return [(n, "") for n in names]
    rows, i = [], 0
    for size in reversed(back_to_front):  # forwards first, as stored
        rows.append(names[i:i + size])
        i += size
    rows.append(names[i:i + 1])
    out: list[tuple[str, str]] = []
    n_rows = len(rows)
    back = len(rows[-2])
    for r, row in enumerate(rows):
        size = len(row)
        for k, name in enumerate(row):
            edge = size >= 4 and k in (0, size - 1)
            if r == n_rows - 1:
                role = "GK"
            elif r == n_rows - 2:  # back line
                role = "CB" if size == 3 or not edge else ("WB" if size == 5 else "FB")
            elif r == 0:  # front line
                role = "W" if size == 3 and k != 1 else "ST"
            else:  # midfield rows, deepest last
                deepest, highest = r == n_rows - 3, r == 1
                if edge:
                    role = "WB" if back == 3 else "WM"
                elif n_rows - 2 > 2 and highest and not deepest:
                    role = "W" if size == 3 and k != 1 else "AM"
                elif n_rows - 2 > 2 and deepest:
                    role = "DM"
                else:
                    role = "CM"
            out.append((name, role))
    return out


def _split(matches: pd.DataFrame, played: set) -> dict:
    """Team figures in the matches a player started against those he did not."""
    w, wo = matches[matches.match_id.isin(played)], matches[~matches.match_id.isin(played)]

    def fig(d):
        if not len(d):
            return None
        pts = ((d.gf > d.ga) * 3 + (d.gf == d.ga)).mean()
        sa = pd.to_numeric(d.shots_against, errors="coerce").dropna()
        return {"n": int(len(d)), "ga": float(d.ga.mean()), "gf": float(d.gf.mean()), "points": float(pts),
                "clean_sheets": float((d.ga == 0).mean()),
                "shots_against": float(sa.mean()) if len(sa) else None}
    return {"with": fig(w), "without": fig(wo)}


def _verdict(split: dict, line: str) -> str | None:
    w, wo = split["with"], split["without"]
    if not w or not wo or w["n"] < MIN_SPLIT or wo["n"] < MIN_SPLIT:
        return None
    weak = " (faible échantillon)" if min(w["n"], wo["n"]) < STRONG_SPLIT else ""
    if line == "attack":
        gap = w["gf"] - wo["gf"]
        if abs(gap) < GAP_GOALS:
            return "pas d'écart net sur les buts marqués"
        return f"{abs(gap):.1f} but marqué par match en {'plus' if gap > 0 else 'moins'} quand il est titulaire{weak}"
    gap = w["ga"] - wo["ga"]
    if abs(gap) < GAP_GOALS:
        return "pas d'écart net sur les buts encaissés"
    return f"{abs(gap):.1f} but encaissé par match en {'moins' if gap < 0 else 'plus'} quand il est titulaire{weak}"


def _unit_figures(d: pd.DataFrame) -> dict | None:
    if not len(d):
        return None
    sh = pd.to_numeric(d.shots_for, errors="coerce").dropna()
    sot = pd.to_numeric(d.sot_for, errors="coerce").dropna()
    return {"n": int(len(d)), "gf": float(d.gf.mean()), "points": float(((d.gf > d.ga) * 3 + (d.gf == d.ga)).mean()),
            "shots": float(sh.mean()) if len(sh) else None, "sot": float(sot.mean()) if len(sot) else None}


def _units(matches: pd.DataFrame, by_match: dict) -> list[dict]:
    """Midfield and attack duos: the team's attacking figures when both start, and otherwise.

    Only duos that started MIN_SPLIT matches together, with MIN_SPLIT matches without them.
    The gap is stated only above GAP_GOALS goals per match, as for single players (D53)."""
    together: dict[tuple, set] = defaultdict(set)
    for mid, pr in by_match.items():
        front = sorted({n for n, role in pr if LINE_OF.get(role) in ("midfield", "attack")})
        for i, a in enumerate(front):
            for b in front[i + 1:]:
                together[(a, b)].add(mid)
    lines: dict[str, dict] = defaultdict(lambda: defaultdict(int))
    starts: dict[str, set] = defaultdict(set)
    for mid, pr in by_match.items():
        for n, role in pr:
            starts[n].add(mid)
            if role:
                lines[n][LINE_OF[role]] += 1
    line_of = {n: max(c, key=c.get) for n, c in lines.items()}
    out = []
    for (a, b), ids in together.items():
        # A partner who starts every match of the other: the gap is that one player's, shown elsewhere.
        if ids == starts[a] or ids == starts[b]:
            continue
        w, wo = matches[matches.match_id.isin(ids)], matches[~matches.match_id.isin(ids)]
        if len(w) < MIN_SPLIT or len(wo) < MIN_SPLIT:
            continue
        fw, fwo = _unit_figures(w), _unit_figures(wo)
        gap = fw["gf"] - fwo["gf"]
        weak = " (faible échantillon)" if min(len(w), len(wo)) < STRONG_SPLIT else ""
        verdict = ("pas d'écart net sur les buts marqués" if abs(gap) < GAP_GOALS else
                   f"{abs(gap):.1f} but marqué par match en {'plus' if gap > 0 else 'moins'} quand ils jouent ensemble{weak}")
        kind = "-".join(sorted({line_of.get(a), line_of.get(b)}))
        out.append({"players": [a, b], "lines": kind, "with": fw, "without": fwo, "gap_goals": gap, "verdict": verdict})
    out.sort(key=lambda u: (-abs(u["gap_goals"]) if abs(u["gap_goals"]) >= GAP_GOALS else 0, -u["with"]["n"]))
    # One player in many listed duos usually means his own effect: keep his two strongest.
    seen: dict[str, int] = defaultdict(int)
    kept = []
    for u in out:
        if all(seen[p] < 2 for p in u["players"]):
            kept.append(u)
            for p in u["players"]:
                seen[p] += 1
    return kept[:10]


def _assist_duos(parsed: pd.DataFrame) -> list[dict]:
    """Passer and scorer pairs from the goal details (own goals removed)."""
    d = parsed.dropna(subset=["p", "o"])
    if d.empty:
        return []
    counts = d.assign(p=d.p.str.strip(), o=d.o.str.strip()).groupby(["o", "p"]).size().sort_values(ascending=False)
    return [{"passer": o, "scorer": p, "goals": int(n)} for (o, p), n in counts.head(8).items() if n >= 2]


def player_impact(engine: Engine, team_id: int, season: int, before) -> dict | None:
    with engine.connect() as conn:
        lu = pd.read_sql(_LINEUPS_SQL, conn, params={"team": team_id, "season": season, "before": before})
        if lu.empty:
            return None
        ids = [int(x) for x in lu.match_id.unique()]
        shots = pd.read_sql(_SHOTS_SQL, conn, params={"team": team_id, "ids": ids})
        events = pd.read_sql(_EVENTS_SQL, conn, params={"ids": ids})
    matches = lu.drop_duplicates("match_id")[["match_id", "kickoff_date", "opponent", "at_home", "gf", "ga", "formation"]]
    matches = matches.merge(shots, on="match_id", how="left")
    by_match = {}
    for mid, grp in lu.groupby("match_id", sort=False):
        by_match[mid] = roles(grp.formation.iloc[0], grp.name.tolist())

    starts: dict[str, set] = defaultdict(set)
    role_count: dict[str, dict] = defaultdict(lambda: defaultdict(int))
    for mid, pr in by_match.items():
        for name, role in pr:
            starts[name].add(mid)
            if role:
                role_count[name][role] += 1

    # Goals and assists by name, from the event details "Label: scorer / assist".
    goals = events[(events.type == "goal") & (events.team_id == team_id)]
    parsed = goals.detail.str.extract(r"^(?P<label>[^:]+)(?::\s*(?P<p>[^/]+?))?(?:\s*/\s*(?P<o>.+))?$")
    own = parsed.label.str.lower().str.contains("own", na=False)
    scored = parsed.loc[~own, "p"].dropna().str.strip().value_counts()
    assists = parsed.loc[~own, "o"].dropna().str.strip().value_counts()
    cards = events[(events.type == "card") & (events.team_id == team_id)].detail.str.extract(r":\s*(.+)$")[0].str.strip().value_counts()

    players = []
    for name, played in starts.items():
        if not role_count[name]:
            continue
        role = max(role_count[name], key=role_count[name].get)
        line = LINE_OF[role]
        split = _split(matches, played)
        players.append({"name": name, "role": role, "role_fr": ROLE_FR[role], "line": line,
                        "starts": len(played), "goals": int(scored.get(name, 0)), "assists": int(assists.get(name, 0)),
                        "cards": int(cards.get(name, 0)), "split": split, "verdict": _verdict(split, line)})
    players.sort(key=lambda p: (["defence", "midfield", "attack"].index(p["line"]), -p["starts"], p["name"]))

    # Who scored the first goal of each match: the defence on the pitch at kick-off is the context.
    goal_rows = events[events.type == "goal"].assign(t=lambda d: d.minute.fillna(0) + d.extra / 100)
    first_against = {mid: g.sort_values("t").team_id.iloc[0] != team_id for mid, g in goal_rows.groupby("match_id")}
    matches["conceded_first"] = matches.match_id.map(first_against).fillna(False).astype(bool)

    pairs: dict[tuple, list] = defaultdict(list)
    timeline = []
    for r in matches.sort_values("kickoff_date", ascending=False).itertuples():
        pr = by_match[r.match_id]
        cbs = tuple(sorted(n for n, role in pr if role == "CB"))
        if len(cbs) >= 2:
            pairs[cbs].append(r)
        lines = {k: [n for n, role in pr if LINE_OF.get(role) == k and role != "GK"] for k in ("defence", "midfield", "attack")}
        timeline.append({"date": r.kickoff_date.isoformat(), "opponent": r.opponent, "at_home": bool(r.at_home),
                         "gf": int(r.gf), "ga": int(r.ga), "formation": r.formation,
                         "shots_against": None if pd.isna(r.shots_against) else int(r.shots_against),
                         "conceded_first": bool(r.conceded_first),
                         "keeper": next((n for n, role in pr if role == "GK"), None), **lines})
    pair_rows = []
    for cbs, rs in sorted(pairs.items(), key=lambda kv: -len(kv[1])):
        ga = [x.ga for x in rs]
        sa = [x.shots_against for x in rs if not pd.isna(x.shots_against)]
        pair_rows.append({"players": list(cbs), "n": len(rs), "ga": sum(ga) / len(ga),
                          "clean_sheets": sum(1 for g in ga if g == 0), "cracks": sum(1 for g in ga if g >= 2),
                          "conceded_first": sum(1 for x in rs if x.conceded_first),
                          "shots_against": sum(sa) / len(sa) if sa else None})
    return {"matches": int(len(matches)), "players": players, "cb_pairs": pair_rows[:6], "timeline": timeline,
            "units": _units(matches, by_match), "assist_duos": _assist_duos(parsed[~own]),
            "conceded_first": int(matches.conceded_first.sum()),
            "avg_ga": float(matches.ga.mean()), "avg_gf": float(matches.gf.mean())}
