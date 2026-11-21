"""The short reading of a match: a verdict, the safest markets, and a few key facts.

Every line comes from a rule with a fixed threshold, so the summary never says more than the
figures. "Safest" means the highest model probability, not value: a bet only has value when
the bookmaker's odds are above the fair odds (1 / probability), and the model has no
demonstrated edge over the market (docs/RESULTS.md).
"""

SAFE_NOTES = ("1x2", "goals")  # markets whose calibration is checked (BTTS and 1UP are weaker)
SAFE_MIN, SAFE_MAX = 0.60, 0.93  # below: not safe; above: fair odds under 1.08, nothing to gain
MIN_FACT_MATCHES = 4
FIRST_GOAL_GAP = 0.15  # win rate after the first goal, against the league, before it is a fact


def verdict(p_home: float, p_draw: float, p_away: float, p_over_2_5: float | None,
            home: str, away: str) -> str:
    fav, p = (home, p_home) if p_home >= p_away else (away, p_away)
    if p >= 0.55:
        head = f"Favori net : {fav} ({round(100 * p)} % de victoire)."
    elif p >= 0.45:
        head = f"Léger avantage à {fav} ({round(100 * p)} %), le nul reste à {round(100 * p_draw)} %."
    else:
        head = f"Match ouvert : aucune équipe au-dessus de 45 %, nul à {round(100 * p_draw)} %."
    if p_over_2_5 is not None and p_over_2_5 >= 0.60:
        head += f" Match à buts : plus de 2,5 buts à {round(100 * p_over_2_5)} %."
    elif p_over_2_5 is not None and p_over_2_5 <= 0.40:
        head += f" Match fermé : moins de 2,5 buts à {round(100 * (1 - p_over_2_5))} %."
    return head


def safe_picks(markets: list[dict], n: int = 3) -> list[dict]:
    """The n likeliest checked markets between SAFE_MIN and SAFE_MAX, one per family."""
    family = {"1": "result", "X": "result", "2": "result", "1X": "result", "X2": "result", "12": "result"}
    rows = [m for m in markets if m["note"] in SAFE_NOTES and SAFE_MIN <= m["prob"] <= SAFE_MAX]
    out, used = [], set()
    for m in sorted(rows, key=lambda r: -r["prob"]):
        fam = family.get(m["key"], m["key"].lstrip("OU"))  # O2.5 and U2.5 share a line
        if fam in used:
            continue
        used.add(fam)
        out.append({"key": m["key"], "label": m["label"], "prob": m["prob"], "fair_odds": round(1 / m["prob"], 2)})
        if len(out) == n:
            break
    return out


def key_facts(insights: dict, limit: int = 4) -> list[str]:
    """At most `limit` facts, strongest first: series, reaction to the first goal, scorers."""
    facts: list[tuple[int, str]] = []
    for side in ("home", "away"):
        t = insights.get("teams", {}).get(side) or {}
        name, s = t.get("name", ""), t.get("streaks") or {}
        if s.get("unbeaten", 0) >= 5:
            facts.append((s["unbeaten"], f"{name} reste sur {s['unbeaten']} matchs sans défaite."))
        if s.get("winless", 0) >= 4:
            facts.append((s["winless"], f"{name} n'a plus gagné depuis {s['winless']} matchs."))
        fg = t.get("first_goal") or {}
        team, league = fg.get("team") or {}, fg.get("league") or {}
        sf, lsf = team.get("scored_first"), league.get("scored_first")
        if sf and lsf and sf["n"] >= MIN_FACT_MATCHES and sf["win"] - lsf["win"] <= -FIRST_GOAL_GAP:
            facts.append((3, f"{name} ouvre le score mais ne gagne ensuite que {round(100 * sf['win'])} % de ces "
                             f"matchs ({sf['n']}), contre {round(100 * lsf['win'])} % en moyenne : avance fragile."))
        cf, lcf = team.get("conceded_first"), league.get("conceded_first")
        if cf and lcf and cf["n"] >= MIN_FACT_MATCHES and cf["points"] - lcf["points"] >= 0.75:
            facts.append((3, f"{name} revient souvent après avoir encaissé le premier but : "
                             f"{cf['points']:.1f} point par match ({cf['n']} matchs), moyenne {lcf['points']:.1f}."))
        scorers = t.get("scorers") or []
        if scorers and scorers[0]["goals"] >= 5:
            top = scorers[0]
            facts.append((2, f"{top['name']} ({name}) a marqué {top['goals']} buts en championnat cette saison."))
    h2h = insights.get("h2h") or []
    if len(h2h) >= 3:
        winners = {(r["home"] if int(r["score"].split("-")[0]) > int(r["score"].split("-")[1]) else
                    r["away"] if int(r["score"].split("-")[0]) < int(r["score"].split("-")[1]) else "nul")
                   for r in h2h[:3]}
        if len(winners) == 1 and "nul" not in winners:
            facts.append((2, f"{winners.pop()} a gagné les 3 dernières confrontations directes."))
    facts.sort(key=lambda f: -f[0])
    return [text for _, text in facts[:limit]]


RESULT_KEYS = {"1", "X", "2", "1X", "X2", "12"}
LIST_RESULT_MIN = 0.65


def list_pick(picks: list[dict]) -> dict | None:
    """The one pick shown in the match list. "Over 1.5 goals" tops almost every match, so a
    result pick (double chance) comes first when it reaches LIST_RESULT_MIN."""
    result = [p for p in picks if p["key"] in RESULT_KEYS and p["prob"] >= LIST_RESULT_MIN]
    return result[0] if result else (picks[0] if picks else None)
