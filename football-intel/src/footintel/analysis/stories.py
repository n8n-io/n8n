"""Match stories, recurring scenarios and the road ahead of each team.

Three questions, all answered from stored data only (no lineups, injuries or xG are
collected, so none are used or guessed):

1. Scenarios: in a situation fixed before kick-off (European match a few days before,
   short rest, form that flatters or hides the shot balance, ...), do teams win more or
   fewer points than teams at the same bookmaker price? The market price is the
   reference, so a scenario counts only if the market misjudges it. Tested on all seasons with odds,
   on two halves (persistence), and on the last 365 and 60 days (what is new).
2. Stories: for each finished match, what was known before kick-off, which scenarios
   applied, how the score developed (half time) and what the shot counts say.
3. Road ahead: the next five matches of each team, with rest days, European matches in
   between and the current form.
"""

import logging
from dataclasses import dataclass
from datetime import UTC, date, datetime, timedelta

import numpy as np
import pandas as pd
from scipy import stats as st
from sqlalchemy import Engine, text

from footintel.analysis.stats import benjamini_hochberg
from footintel.db.models import MatchStory, ScenarioStat, TrainingRun
from footintel.db.session import session_scope

log = logging.getLogger(__name__)

TARGETS = ("ENG-PL", "ESP-LL", "ITA-SA", "GER-BL")
SPLIT = pd.Timestamp("2016-07-01")


@dataclass(frozen=True)
class Scenario:
    code: str
    label: str  # French text for the reports
    definition: str


# Thresholds were fixed before looking at any result (D44). One row per team and match:
# columns ending in "_s" are the team's own values, "_o" the opponent's.
SCENARIOS = [
    Scenario("europe_midweek", "a joué en Coupe d'Europe dans les 7 jours",
             "europe_7d_s == 1 and competition is a domestic league"),
    Scenario("short_rest_vs_rested", "repos court (≤ 3 j) face à un adversaire reposé (≥ 5 j)",
             "rest_days_s <= 3 and rest_days_o >= 5"),
    Scenario("congested", "4 matchs ou plus en 14 jours", "games_14d_s >= 4"),
    Scenario("hot_form", "en grande forme (≥ 2,4 pts/match sur 5)", "form5_ppg_s >= 2.4"),
    Scenario("cold_form", "en méforme (≤ 0,6 pt/match sur 5)", "form5_ppg_s <= 0.6"),
    Scenario("hot_underdog", "outsider en forme (≥ 2 pts/match, < 35 % de victoire selon le marché)",
             "form5_ppg_s >= 2.0 and market win < 0.35"),
    Scenario("cold_favourite", "favori en méforme (≤ 1 pt/match, ≥ 50 % de victoire selon le marché)",
             "form5_ppg_s <= 1.0 and market win >= 0.50"),
    Scenario("unlucky", "résultats inférieurs au jeu (tirs cadrés +1,5/match, ≤ 1,2 pt/match)",
             "sot5_for_s - sot5_against_s >= 1.5 and form5_ppg_s <= 1.2"),
    Scenario("lucky", "résultats supérieurs au jeu (≥ 2 pts/match, tirs cadrés négatifs)",
             "form5_ppg_s >= 2.0 and sot5_for_s - sot5_against_s <= -0.5"),
    Scenario("big_away_favourite", "grand favori à l'extérieur (≥ 60 %)", "away and market win >= 0.60"),
    Scenario("big_home_favourite", "grand favori à domicile (≥ 70 %)", "home and market win >= 0.70"),
    Scenario("leaky_defence", "défense qui prend l'eau (≥ 2 buts encaissés/match sur 5)", "ga5_s >= 2.0"),
]
SCENARIO_BY_CODE = {s.code: s for s in SCENARIOS}


def team_rows(f: pd.DataFrame) -> pd.DataFrame:
    """One row per team and league match with odds: own and opponent features, market
    probabilities from the team's side, and the points won (NaN when not played)."""
    f = f[f["mkt_p_home"].notna() & (f["competition_type"] == "league")]
    base = ["match_id", "kickoff_date", "season", "competition", "home_goals", "away_goals"]
    side_cols = ["form5_ppg", "gf5", "ga5", "sot5_for", "sot5_against", "rest_days",
                 "games_14d", "europe_7d"]
    out = []
    for s, o, home in (("h", "a", True), ("a", "h", False)):
        d = f[base].copy()
        d["team_id"] = f["home_team_id" if home else "away_team_id"]
        d["is_home"] = home
        for c in side_cols:
            d[f"{c}_s"], d[f"{c}_o"] = f[f"{c}_{s}"], f[f"{c}_{o}"]
        d["p_win"] = f["mkt_p_home" if home else "mkt_p_away"]
        d["p_draw"] = f["mkt_p_draw"]
        gf, ga = (f["home_goals"], f["away_goals"]) if home else (f["away_goals"], f["home_goals"])
        d["points"] = np.where(gf > ga, 3.0, np.where(gf == ga, 1.0, 0.0))
        d.loc[gf.isna() | ga.isna(), "points"] = np.nan
        d["expected_points"] = 3 * d["p_win"] + d["p_draw"]
        out.append(d)
    return pd.concat(out, ignore_index=True)


def flags(r: pd.DataFrame) -> pd.DataFrame:
    """Boolean column per scenario. Missing inputs make a scenario False, never True."""
    sot = r["sot5_for_s"] - r["sot5_against_s"]
    return pd.DataFrame({
        "europe_midweek": r["europe_7d_s"] == 1,
        "short_rest_vs_rested": (r["rest_days_s"] <= 3) & (r["rest_days_o"] >= 5),
        "congested": r["games_14d_s"] >= 4,
        "hot_form": r["form5_ppg_s"] >= 2.4,
        "cold_form": r["form5_ppg_s"] <= 0.6,
        "hot_underdog": (r["form5_ppg_s"] >= 2.0) & (r["p_win"] < 0.35),
        "cold_favourite": (r["form5_ppg_s"] <= 1.0) & (r["p_win"] >= 0.50),
        "unlucky": (sot >= 1.5) & (r["form5_ppg_s"] <= 1.2),
        "lucky": (r["form5_ppg_s"] >= 2.0) & (sot <= -0.5),
        "big_away_favourite": ~r["is_home"] & (r["p_win"] >= 0.60),
        "big_home_favourite": r["is_home"] & (r["p_win"] >= 0.70),
        "leaky_defence": r["ga5_s"] >= 2.0,
    }, index=r.index).fillna(False)


def _test(resid: np.ndarray) -> tuple[float, float, float, float]:
    """Mean, 95 % CI and two-sided p-value of the mean residual (t distribution)."""
    n = len(resid)
    m = float(resid.mean())
    if n < 2:
        return m, float("nan"), float("nan"), float("nan")
    se = float(resid.std(ddof=1) / np.sqrt(n))
    if se == 0:
        return m, m, m, 1.0
    t = m / se
    q = st.t.ppf(0.975, n - 1)
    return m, m - q * se, m + q * se, float(2 * st.t.sf(abs(t), n - 1))


WINDOWS = {"all": (None, None), "before_2016": (None, SPLIT), "from_2016": (SPLIT, None)}
MIN_N = {"all": 200, "before_2016": 100, "from_2016": 100, "last_365d": 40, "last_60d": 15}


PRICE_BINS = 20


def scenario_table(rows: pd.DataFrame, as_of: pd.Timestamp) -> pd.DataFrame:
    """Residual of each scenario, measured at equal price.

    Proportional margin removal (D7) leaves a favourite-longshot bias: favourites win a
    little more than their price says. Each team is therefore compared with all teams of
    the same price band (20 bands of win probability) in the same window, so a scenario
    that merely selects favourites or outsiders shows no effect."""
    played = rows[rows["points"].notna()].copy()
    played["kickoff_date"] = pd.to_datetime(played["kickoff_date"])
    played["resid"] = played["points"] - played["expected_points"]
    played["price_bin"] = pd.qcut(played["p_win"], PRICE_BINS, labels=False, duplicates="drop")
    fl = flags(played)
    windows = dict(WINDOWS)
    windows["last_365d"] = (as_of - pd.Timedelta(days=365), None)
    windows["last_60d"] = (as_of - pd.Timedelta(days=60), None)
    out = []
    for sc in SCENARIOS:
        for w, (lo, hi) in windows.items():
            in_w = pd.Series(True, index=played.index)
            if lo is not None:
                in_w &= played["kickoff_date"] >= lo
            if hi is not None:
                in_w &= played["kickoff_date"] < hi
            band_mean = played[in_w].groupby("price_bin")["resid"].mean()
            d = played[in_w & fl[sc.code]]
            resid = (d["resid"] - d["price_bin"].map(band_mean)).to_numpy()
            if len(d) == 0:
                out.append(dict(scenario=sc.code, window=w, n=0, points=np.nan, expected_points=np.nan,
                                observed=np.nan, ci_low=np.nan, ci_high=np.nan, p_value=np.nan))
                continue
            m, lo_ci, hi_ci, p = _test(resid)
            out.append(dict(scenario=sc.code, window=w, n=len(d), points=float(d["points"].mean()),
                            expected_points=float(d["expected_points"].mean()), observed=m,
                            ci_low=lo_ci, ci_high=hi_ci, p_value=p))
    t = pd.DataFrame(out)
    t["adjusted_p_value"] = np.nan
    for w in t["window"].unique():
        idx = t.index[(t["window"] == w) & t["p_value"].notna()]
        t.loc[idx, "adjusted_p_value"] = benjamini_hochberg(t.loc[idx, "p_value"].tolist())
    t["status"] = t.apply(lambda r: _window_status(r), axis=1)
    return _scenario_status(t)


def _window_status(r) -> str:
    if r["n"] < MIN_N[r["window"]] or np.isnan(r["p_value"]):
        return "insufficient_data"
    return "significant" if r["adjusted_p_value"] < 0.05 else "not_significant"


def _scenario_status(t: pd.DataFrame) -> pd.DataFrame:
    """Overall verdict written on the "all" row:
    confirmed  - significant on all seasons, same sign on both halves and in the last year;
    reversing  - confirmed long-term, but the last year goes the other way (p < 0.05);
    emerging   - not confirmed long-term, but the last 365 or 60 days show a nominal
                 effect (p < 0.05): new, to watch, not yet proven;
    no_effect  - otherwise (the market already prices the scenario)."""
    t = t.copy()
    for sc, g in t.groupby("scenario"):
        w = g.set_index("window")
        a = w.loc["all"]
        if a["n"] < MIN_N["all"]:
            verdict = "insufficient_data"
        else:
            sign = np.sign(a["observed"])
            halves = all(w.loc[h, "n"] >= MIN_N[h] and np.sign(w.loc[h, "observed"]) == sign
                         for h in ("before_2016", "from_2016"))
            last = w.loc["last_365d"]
            last_ok = last["n"] < MIN_N["last_365d"] or np.sign(last["observed"]) == sign
            confirmed = a["status"] == "significant" and halves
            recent = [w.loc[x] for x in ("last_365d", "last_60d")
                      if w.loc[x, "n"] >= MIN_N[x] and w.loc[x, "p_value"] < 0.05]
            if confirmed and last_ok:
                verdict = "confirmed"
            elif confirmed and not last_ok and last["p_value"] < 0.05:
                verdict = "reversing"
            elif recent:
                verdict = "emerging"
            else:
                verdict = "no_effect"
        t.loc[(t["scenario"] == sc) & (t["window"] == "all"), "status"] = verdict
    return t


# --- Stories ------------------------------------------------------------------------

def _num(v) -> float | None:
    return None if v is None or (isinstance(v, float) and np.isnan(v)) else float(v)


def _flow(r) -> list[str]:
    hg, ag, hh, ha = r["home_goals"], r["away_goals"], r["ht_home_goals"], r["ht_away_goals"]
    out = []
    if np.isnan(hh) or np.isnan(ha):
        return ["half_time_unknown"]
    if hh < ha and hg >= ag:
        out.append("comeback_home" if hg > ag else "home_recovered_draw")
    if ha < hh and ag >= hg:
        out.append("comeback_away" if ag > hg else "away_recovered_draw")
    if hh > ha and hg < ag:
        out.append("home_lead_lost")
    if hh == ha == 0 and hg + ag >= 2:
        out.append("goals_after_break")
    if (hg - hh) + (ag - ha) >= 3:
        out.append("open_second_half")
    if hg + ag == 0:
        out.append("goalless")
    if abs(hg - ag) >= 3:
        out.append("wide_margin")
    return out


FLOW_GENERIC_FR = {
    "comeback_home": "équipe à domicile menée à la pause, victorieuse",
    "comeback_away": "équipe à l'extérieur menée à la pause, victorieuse",
    "home_recovered_draw": "équipe à domicile menée à la pause, nul arraché",
    "away_recovered_draw": "équipe à l'extérieur menée à la pause, nul arraché",
    "home_lead_lost": "équipe à domicile qui menait à la pause, battue",
    "goals_after_break": "0-0 à la pause, au moins 2 buts ensuite",
    "open_second_half": "3 buts ou plus en deuxième mi-temps",
    "goalless": "0-0",
    "wide_margin": "écart de 3 buts ou plus",
    "half_time_unknown": "score à la pause inconnu",
}

FLOW_FR = {
    "comeback_home": "{home}, mené à la pause, a gagné",
    "comeback_away": "{away}, mené à la pause, a gagné",
    "home_recovered_draw": "{home}, mené à la pause, a arraché le nul",
    "away_recovered_draw": "{away}, mené à la pause, a arraché le nul",
    "home_lead_lost": "{home} menait à la pause et a perdu",
    "goals_after_break": "0-0 à la pause, tout s'est joué en deuxième mi-temps",
    "open_second_half": "deuxième mi-temps très ouverte (3 buts ou plus)",
    "goalless": "aucun but",
    "wide_margin": "écart de 3 buts ou plus",
    "half_time_unknown": "score à la pause inconnu",
}


def _surprise(p: float | None) -> str:
    if p is None:
        return "unknown"
    return "big_surprise" if p < 0.15 else "surprise" if p < 0.30 else "open" if p < 0.50 else "expected"


def story(r, active: dict[str, list[str]], scen: dict[str, dict], model_p: dict | None) -> dict:
    """Facts and a short French text for one finished match."""
    home, away = r["home_team"], r["away_team"]
    hg, ag = int(r["home_goals"]), int(r["away_goals"])
    res = 0 if hg > ag else 1 if hg == ag else 2
    market = [r.get("mkt_p_home"), r.get("mkt_p_draw"), r.get("mkt_p_away")]
    probs = market if not any(v is None or np.isnan(v) for v in market) else (
        [model_p["p_home"], model_p["p_draw"], model_p["p_away"]] if model_p else None)
    source = "marché" if probs is market else "modèle" if probs else None
    p_res = float(probs[res]) if probs else None
    factors = {"home": {}, "away": {}, "match": {}}
    for side, s in (("home", "h"), ("away", "a")):
        for k in ("form5_ppg", "gf5", "ga5", "sot5_for", "sot5_against", "rest_days", "games_14d",
                  "europe_7d", "venue5_ppg"):
            factors[side][k] = _num(r.get(f"{k}_{s}"))
        factors[side]["elo"] = _num(r.get(f"elo_{'home' if s == 'h' else 'away'}"))
        factors[side]["shots"] = _num(r.get(f"{side}_shots"))
        factors[side]["shots_on_target"] = _num(r.get(f"{side}_sot"))
    factors["match"] = {"score": f"{hg}-{ag}", "half_time": None if np.isnan(r["ht_home_goals"])
                        else f"{int(r['ht_home_goals'])}-{int(r['ht_away_goals'])}",
                        "probabilities": None if probs is None else [float(x) for x in probs],
                        "probability_source": source, "elo_diff": _num(r.get("elo_diff"))}
    flow = _flow(r)
    lines = []
    res_txt = (f"victoire de {home}" if res == 0 else "match nul" if res == 1 else f"victoire de {away}")
    if p_res is not None:
        fav = int(np.argmax(probs))
        fav_txt = (f"{home} favori ({probs[0]:.0%})" if fav == 0 else
                   f"nul le plus probable ({probs[1]:.0%})" if fav == 1 else f"{away} favori ({probs[2]:.0%})")
        lines.append(f"Avant le match ({source}) : {fav_txt}. Résultat : {res_txt}, "
                     f"auquel le {source} donnait {p_res:.0%}.")
    h, a = factors["home"], factors["away"]
    fmt = lambda v, p=1: "n/d" if v is None else f"{v:.{p}f}"  # noqa: E731
    lines.append(f"Forme (5 derniers) : {home} {fmt(h['form5_ppg'])} pt/match, {fmt(h['gf5'])} marqués / "
                 f"{fmt(h['ga5'])} encaissés ; {away} {fmt(a['form5_ppg'])} pt/match, {fmt(a['gf5'])} / "
                 f"{fmt(a['ga5'])}. Repos : {fmt(h['rest_days'], 0)} j contre {fmt(a['rest_days'], 0)} j.")
    if h["sot5_for"] is not None and a["sot5_for"] is not None:
        lines.append(f"Tirs cadrés par match (5 derniers, pour/contre) : {home} {h['sot5_for']:.1f}/"
                     f"{h['sot5_against']:.1f}, {away} {a['sot5_for']:.1f}/{a['sot5_against']:.1f}.")
    if h["elo"] and a["elo"]:
        lines.append(f"Niveau Elo : {home} {h['elo']:.0f}, {away} {a['elo']:.0f} ({h['elo'] - a['elo']:+.0f}).")
    for side, name in (("home", home), ("away", away)):
        f_ = factors[side]
        if f_["europe_7d"]:
            lines.append(f"{name} a joué en Coupe d'Europe dans les 7 jours (repos : {f_['rest_days']:.0f} j).")
        elif f_["rest_days"] is not None and f_["rest_days"] <= 3:
            lines.append(f"{name} n'avait que {f_['rest_days']:.0f} jours de repos.")
    for code in flow:
        lines.append(FLOW_FR[code].format(home=home, away=away).capitalize() + ".")
    if h["shots_on_target"] is not None and a["shots_on_target"] is not None:
        dom = h["shots_on_target"] - a["shots_on_target"]
        lines.append(f"Tirs cadrés : {home} {h['shots_on_target']:.0f}, {away} {a['shots_on_target']:.0f}"
                     + (" — le vainqueur a moins cadré que le perdant (efficacité ou réussite)."
                        if (res == 0 and dom < 0) or (res == 2 and dom > 0) else "."))
    else:
        lines.append("Statistiques de tirs du match pas encore publiées par la source.")
    for side, name in (("home", home), ("away", away)):
        for code in active.get(side, []):
            sc = scen.get(code)
            # Scenarios the market already prices are left out of the story.
            if not sc or sc["status"] not in ("confirmed", "emerging", "reversing"):
                continue
            pts = 3 if (res == 0 and side == "home") or (res == 2 and side == "away") else 1 if res == 1 else 0
            direction = ("au-dessus" if sc["observed"] > 0 else "en dessous")
            lines.append(f"{name} : {SCENARIO_BY_CODE[code].label}. Historiquement, ces équipes font "
                         f"{abs(sc['observed']):.2f} pt/match {direction} de l'attente du marché "
                         f"(statut : {STATUS_FR[sc['status']]}). Ici : {pts} pt.")
    return {"factors": factors, "flow": flow, "expected_prob": p_res, "surprise": _surprise(p_res),
            "narrative": "\n".join(lines)}


STATUS_FR = {"confirmed": "confirmé", "reversing": "s'inverse récemment", "emerging": "nouveau, à surveiller",
             "no_effect": "aucun effet démontré, le marché en tient compte",
             "insufficient_data": "données insuffisantes"}


# --- Road ahead ------------------------------------------------------------------------

def road_ahead(engine: Engine, f: pd.DataFrame, today: date, n_next: int = 5) -> pd.DataFrame:
    """Next matches of each team of the four target leagues, with the rest before each
    one, European or cup matches in between, and the team's current form."""
    with engine.connect() as conn:
        sched = pd.read_sql(text("""
            SELECT m.id AS match_id, m.kickoff_date, c.code AS competition, c.type AS ctype,
                   m.home_team_id, m.away_team_id, th.name AS home, ta.name AS away, m.status
            FROM matches m JOIN competitions c ON c.id = m.competition_id
            JOIN teams th ON th.id = m.home_team_id JOIN teams ta ON ta.id = m.away_team_id
            WHERE m.kickoff_date >= :lo AND m.kickoff_date <= :hi"""),
            conn, params={"lo": today - timedelta(days=30), "hi": today + timedelta(days=60)})
        teams = pd.read_sql(text("""
            SELECT DISTINCT t.id, t.name, c.code AS league FROM matches m
            JOIN competitions c ON c.id = m.competition_id JOIN seasons s ON s.id = m.season_id
            JOIN teams t ON t.id IN (m.home_team_id, m.away_team_id)
            WHERE c.code = ANY(:t) AND s.start_year = (SELECT max(start_year) FROM seasons)"""),
            conn, params={"t": list(TARGETS)})
    sched["kickoff_date"] = pd.to_datetime(sched["kickoff_date"])
    feats = f.set_index("match_id")
    rows = []
    for t in teams.itertuples():
        mine = sched[(sched["home_team_id"] == t.id) | (sched["away_team_id"] == t.id)].sort_values("kickoff_date")
        past = mine[mine["kickoff_date"] < pd.Timestamp(today)]
        future = mine[(mine["kickoff_date"] >= pd.Timestamp(today)) & (mine["status"] == "scheduled")].head(n_next)
        prev = past["kickoff_date"].max() if len(past) else pd.NaT
        dates = list(mine["kickoff_date"])
        for k, m in enumerate(future.itertuples()):
            home = m.home_team_id == t.id
            rest = (m.kickoff_date - prev).days if pd.notna(prev) else None
            in_14 = sum(1 for d in dates if m.kickoff_date - pd.Timedelta(days=14) < d < m.kickoff_date)
            after = mine[mine["kickoff_date"] > m.kickoff_date].head(1)
            gap_after = (after["kickoff_date"].iloc[0] - m.kickoff_date).days if len(after) else None
            fr = feats.loc[m.match_id] if m.match_id in feats.index else None
            s, o = ("h", "a") if home else ("a", "h")
            rows.append(dict(
                team=t.name, league=t.league, order=k + 1, date=m.kickoff_date.date(), competition=m.competition,
                venue="dom." if home else "ext.", opponent=m.away if home else m.home, rest_days=rest,
                matches_prev_14d=in_14, next_match_in_days=gap_after,
                europe_before=bool(len(past) and k == 0 and (past["ctype"] == "continental").any()
                                   and (m.kickoff_date - past[past["ctype"] == "continental"]["kickoff_date"].max()).days <= 4),
                cup_or_europe_next=bool(len(after) and after["ctype"].iloc[0] != "league" and gap_after is not None
                                        and gap_after <= 4),
                form5_ppg=None if fr is None else _num(fr.get(f"form5_ppg_{s}")),
                opp_form5_ppg=None if fr is None else _num(fr.get(f"form5_ppg_{o}")),
                elo=None if fr is None else _num(fr.get("elo_home" if home else "elo_away")),
                opp_elo=None if fr is None else _num(fr.get("elo_away" if home else "elo_home"))))
            prev = m.kickoff_date
    return pd.DataFrame(rows)


# --- Run --------------------------------------------------------------------------------

def run_stories(engine: Engine, features: pd.DataFrame, days: int = 7,
                today: date | None = None) -> dict:
    """Recompute scenario statistics and the stories of the last `days` days; store both."""
    today = today or date.today()
    as_of = pd.Timestamp(today)
    rows = team_rows(features)
    table = scenario_table(rows, as_of)
    overall = table[table["window"] == "all"].set_index("scenario")
    scen = {c: {"observed": overall.loc[c, "observed"], "status": overall.loc[c, "status"]}
            for c in overall.index}

    f = features.copy()
    f["kickoff_date"] = pd.to_datetime(f["kickoff_date"])
    recent = f[(f["kickoff_date"] >= as_of - pd.Timedelta(days=days)) & (f["kickoff_date"] <= as_of)
               & f["home_goals"].notna()]
    rows["kickoff_date"] = pd.to_datetime(rows["kickoff_date"])
    fl = flags(rows)
    active_by_match: dict[int, dict[str, list[str]]] = {}
    for i in rows.index[rows["match_id"].isin(recent["match_id"])]:
        codes = [c for c in fl.columns if fl.at[i, c]]
        active_by_match.setdefault(int(rows.at[i, "match_id"]), {})["home" if rows.at[i, "is_home"] else "away"] = codes
    with engine.connect() as conn:
        model = {r.match_id: r._asdict() for r in conn.execute(text("""
            SELECT DISTINCT ON (p.match_id) p.match_id, p.p_home, p.p_draw, p.p_away FROM predictions p
            WHERE p.match_id = ANY(:ids) ORDER BY p.match_id, p.predicted_at DESC"""),
            {"ids": [int(x) for x in recent["match_id"]]})}
    now = datetime.now(UTC)
    with session_scope(engine) as s:
        run = TrainingRun(kind="stories", started_at=now, finished_at=now, status="success",
                          config={"days": days, "as_of": str(today), "scenarios": [x.code for x in SCENARIOS]},
                          n_matches=int(len(recent)))
        s.add(run)
        s.flush()
        for r in table.itertuples():
            if r.n == 0:
                continue
            s.add(ScenarioStat(training_run_id=run.id, scenario=r.scenario,
                               definition=SCENARIO_BY_CODE[r.scenario].definition, window=r.window,
                               n=int(r.n), points=float(r.points), expected_points=float(r.expected_points),
                               observed=float(r.observed), ci_low=_num(r.ci_low), ci_high=_num(r.ci_high),
                               p_value=_num(r.p_value), adjusted_p_value=_num(r.adjusted_p_value),
                               status=r.status))
        stories = []
        for _, r in recent.iterrows():
            active = active_by_match.get(int(r["match_id"]), {})
            out = story(r, active, scen, model.get(int(r["match_id"])))
            s.add(MatchStory(training_run_id=run.id, match_id=int(r["match_id"]), factors=out["factors"],
                             scenarios=active, flow=out["flow"], expected_prob=out["expected_prob"],
                             surprise=out["surprise"], narrative=out["narrative"]))
            stories.append({"match_id": int(r["match_id"]), "date": r["kickoff_date"].date(),
                            "home_goals": int(r["home_goals"]), "away_goals": int(r["away_goals"]),
                            "competition": r["competition"], "home": r["home_team"], "away": r["away_team"],
                            **out, "scenarios": active})
        run_id = run.id
    ahead = road_ahead(engine, features, today)
    log.info("Stories run %d: %d stories, %d scenario rows, %d upcoming rows",
             run_id, len(stories), len(table), len(ahead))
    return {"run_id": run_id, "scenarios": table, "stories": stories, "ahead": ahead}


CONFIRMED_FOR_MODEL = ("unlucky", "lucky", "short_rest_vs_rested", "hot_underdog")


def scenario_columns(f: pd.DataFrame, codes=CONFIRMED_FOR_MODEL) -> pd.DataFrame:
    """Match-level 0/1 columns sc_<code>_h / sc_<code>_a from pre-match features only."""
    out = pd.DataFrame(index=f.index)
    for side, s, o, p in (("h", "h", "a", "mkt_p_home"), ("a", "a", "h", "mkt_p_away")):
        r = pd.DataFrame({
            "form5_ppg_s": f[f"form5_ppg_{s}"], "sot5_for_s": f[f"sot5_for_{s}"],
            "sot5_against_s": f[f"sot5_against_{s}"], "rest_days_s": f[f"rest_days_{s}"],
            "rest_days_o": f[f"rest_days_{o}"], "games_14d_s": f[f"games_14d_{s}"],
            "europe_7d_s": f[f"europe_7d_{s}"], "ga5_s": f[f"ga5_{s}"], "p_win": f[p],
            "is_home": side == "h"}, index=f.index)
        fl = flags(r)
        for c in codes:
            out[f"sc_{c}_{side}"] = fl[c].astype(float)
    return out
