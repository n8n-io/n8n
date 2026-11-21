"""Catalogue of measurable match and team indicators.

Each indicator returns, per row, 1/0 (rate) or a number (mean), and NaN when the
data it needs is unknown for that row. "Not collected" indicators (no authorised
source provides them) are listed in NOT_COLLECTED and never computed.

All results are on 90 minutes; extra time and penalties have their own indicators
and are computed on knockout matches only.
"""

from dataclasses import dataclass
from collections.abc import Callable

import numpy as np
import pandas as pd

NOT_COLLECTED = {
    "goals by 15-minute period (0-15 ... 76-90+)": "no source with goal minutes",
    "early and late goals, equalisers, decisive goals": "no source with goal minutes",
    "first goal and its effect on the result": "no source with goal order",
    "penalties awarded and scored": "not in football-data.co.uk or openfootball",
    "xG / xGA, big chances, touches in the box": "no authorised source",
    "possession, passing, progression, pressing, PPDA": "no authorised source",
    "formations, roles, in-match structure changes": "no authorised source",
    "line-ups, absences, suspensions, returns": "no authorised source",
    "coach changes": "no authorised source with dated appointments",
}

DEFINITION_WARNINGS = {
    "yellow_cards": "England and Scotland count a second yellow only as a red; European "
                    "files count it as yellow plus red (football-data.co.uk notes). Do not "
                    "compare yellow cards across these groups.",
}


@dataclass(frozen=True)
class Indicator:
    name: str
    kind: str  # rate | mean
    definition: str
    needs: tuple[str, ...]
    fn: Callable[[pd.DataFrame], pd.Series]
    knockout_only: bool = False


def _known(d: pd.DataFrame, cols: tuple[str, ...]) -> pd.Series:
    return d[list(cols)].notna().all(axis=1)


def _rate(cond: pd.Series, known: pd.Series) -> pd.Series:
    return cond.astype(float).where(known)


def _total(d):
    return d.home_goals + d.away_goals


def _ht_total(d):
    return d.ht_home_goals + d.ht_away_goals


FT = ("home_goals", "away_goals")
HT = FT + ("ht_home_goals", "ht_away_goals")


def _ht_lead(d):
    return np.sign(d.ht_home_goals - d.ht_away_goals)


def _ft_sign(d):
    return np.sign(d.home_goals - d.away_goals)


MATCH_INDICATORS: list[Indicator] = []


def _add(name, kind, definition, needs, fn, knockout_only=False):
    MATCH_INDICATORS.append(Indicator(name, kind, definition, needs, fn, knockout_only))


for k in range(5):
    _add(f"total_goals_{k}", "rate", f"Exactly {k} goals in 90 minutes.", FT,
         lambda d, k=k: _total(d) == k)
_add("total_goals_5plus", "rate", "Five goals or more in 90 minutes.", FT, lambda d: _total(d) >= 5)
for h, a in [(0, 0), (1, 0), (0, 1), (1, 1), (2, 0), (0, 2), (2, 1), (1, 2), (2, 2), (3, 0),
             (0, 3), (3, 1), (1, 3)]:
    _add(f"score_{h}_{a}", "rate", f"90-minute score {h}-{a} (home-away).", FT,
         lambda d, h=h, a=a: (d.home_goals == h) & (d.away_goals == a))
for line in (0.5, 1.5, 2.5, 3.5, 4.5):
    _add(f"over_{str(line).replace('.', '_')}", "rate", f"More than {line} goals in 90 minutes.",
         FT, lambda d, line=line: _total(d) > line)
_add("btts", "rate", "Both teams score in 90 minutes.", FT,
     lambda d: (d.home_goals > 0) & (d.away_goals > 0))
_add("home_win", "rate", "Home team wins after 90 minutes.", FT, lambda d: d.home_goals > d.away_goals)
_add("draw", "rate", "Draw after 90 minutes.", FT, lambda d: d.home_goals == d.away_goals)
_add("away_win", "rate", "Away team wins after 90 minutes.", FT, lambda d: d.home_goals < d.away_goals)
_add("nil_nil", "rate", "0-0 after 90 minutes.", FT, lambda d: _total(d) == 0)
_add("home_clean_sheet", "rate", "Away team does not score.", FT, lambda d: d.away_goals == 0)
_add("away_clean_sheet", "rate", "Home team does not score.", FT, lambda d: d.home_goals == 0)
_add("win_to_nil", "rate", "One team wins without conceding.", FT,
     lambda d: ((d.home_goals > d.away_goals) & (d.away_goals == 0))
     | ((d.away_goals > d.home_goals) & (d.home_goals == 0)))
_add("goals", "mean", "Goals per match, 90 minutes.", FT, _total)
_add("first_half_goals", "mean", "Goals in the first half.", HT, _ht_total)
_add("second_half_goals", "mean", "Goals in the second half (90-minute total minus half time).",
     HT, lambda d: _total(d) - _ht_total(d))
_add("second_half_more_goals", "rate", "More goals in the second half than in the first.", HT,
     lambda d: (_total(d) - _ht_total(d)) > _ht_total(d))
_add("ht_over_0_5", "rate", "At least one goal before half time.", HT, lambda d: _ht_total(d) > 0.5)
_add("ht_over_1_5", "rate", "At least two goals before half time.", HT, lambda d: _ht_total(d) > 1.5)
_add("ht_draw", "rate", "Level at half time.", HT, lambda d: d.ht_home_goals == d.ht_away_goals)
_add("ht_leader_wins", "rate",
     "Among matches with a half-time leader: that team wins after 90 minutes.", HT,
     lambda d: (_ft_sign(d) == _ht_lead(d)).where(_ht_lead(d) != 0))
_add("ht_leader_loses", "rate",
     "Among matches with a half-time leader: that team loses (comeback from half time).", HT,
     lambda d: (_ft_sign(d) == -_ht_lead(d)).where(_ht_lead(d) != 0))
_add("ht_level_decided", "rate", "Among matches level at half time: a winner after 90 minutes.",
     HT, lambda d: (_ft_sign(d) != 0).where(_ht_lead(d) == 0))
_add("shots", "mean", "Total shots.", ("home_shots", "away_shots"), lambda d: d.home_shots + d.away_shots)
_add("shots_on_target", "mean", "Total shots on target.", ("home_sot", "away_sot"),
     lambda d: d.home_sot + d.away_sot)
_add("corners", "mean", "Total corners.", ("home_corners", "away_corners"),
     lambda d: d.home_corners + d.away_corners)
_add("fouls", "mean", "Total fouls committed.", ("home_fouls", "away_fouls"),
     lambda d: d.home_fouls + d.away_fouls)
_add("yellow_cards", "mean", "Total yellow cards (see definition warning).",
     ("home_yellows", "away_yellows"), lambda d: d.home_yellows + d.away_yellows)
_add("red_cards", "mean", "Total red cards.", ("home_reds", "away_reds"),
     lambda d: d.home_reds + d.away_reds)
_add("extra_time", "rate", "Knockout matches that went to extra time.", FT,
     lambda d: d.aet_home_goals.notna(), knockout_only=True)
_add("penalty_shootout", "rate", "Knockout matches decided by a penalty shoot-out.", FT,
     lambda d: d.pen_home.notna(), knockout_only=True)


def evaluate(ind: Indicator, d: pd.DataFrame) -> pd.Series:
    """Indicator values with NaN where the needed data is unknown."""
    if ind.knockout_only:
        d = d[d["is_knockout"] == 1]
    if any(c not in d for c in ind.needs):
        return pd.Series(np.nan, index=d.index)
    known = _known(d, ind.needs)
    raw = ind.fn(d)
    if ind.kind == "rate":
        return raw.astype(float).where(known & raw.notna())
    return pd.to_numeric(raw, errors="coerce").where(known)


# --- Team perspective ------------------------------------------------------------

def team_long(d: pd.DataFrame) -> pd.DataFrame:
    """Two rows per finished match: one per team, from its own point of view."""
    cols = {"match_id": "match_id", "kickoff_date": "kickoff_date", "competition": "competition",
            "season": "season", "competition_type": "competition_type"}
    base = d[list(cols)].copy()

    def side(is_home: bool) -> pd.DataFrame:
        p, o = ("home", "away") if is_home else ("away", "home")
        s = base.copy()
        s["team_id"] = d[f"{p}_team_id"].to_numpy()
        s["team"] = d[f"{p}_team"].to_numpy() if f"{p}_team" in d else s["team_id"].astype(str)
        s["opponent_id"] = d[f"{o}_team_id"].to_numpy()
        s["is_home"] = is_home
        s["neutral"] = d["neutral_venue"].astype(bool).to_numpy() if "neutral_venue" in d else False
        s["gf"], s["ga"] = d[f"{p}_goals"].to_numpy(), d[f"{o}_goals"].to_numpy()
        s["ht_gf"] = d[f"ht_{p}_goals"].to_numpy() if f"ht_{p}_goals" in d else np.nan
        s["ht_ga"] = d[f"ht_{o}_goals"].to_numpy() if f"ht_{o}_goals" in d else np.nan
        for stat in ("shots", "sot", "corners", "fouls", "yellows"):
            s[f"{stat}_for"] = d.get(f"{p}_{stat}", pd.Series(np.nan, index=d.index)).to_numpy()
            s[f"{stat}_against"] = d.get(f"{o}_{stat}", pd.Series(np.nan, index=d.index)).to_numpy()
        elo_t = d["elo_home"] if is_home else d["elo_away"]
        elo_o = d["elo_away"] if is_home else d["elo_home"]
        s["elo_gap"] = (elo_t - elo_o).to_numpy()
        # Pre-match Elo expectation of the team's score (win 1, draw 0.5, loss 0).
        hfa = np.where(s["neutral"], 0.0, 60.0 if is_home else -60.0)
        s["elo_expected"] = 1.0 / (1.0 + 10 ** (-(s["elo_gap"] + hfa) / 400.0))
        return s

    out = pd.concat([side(True), side(False)], ignore_index=True)
    out["score"] = np.where(out.gf > out.ga, 1.0, np.where(out.gf == out.ga, 0.5, 0.0))
    out["points"] = np.where(out.gf > out.ga, 3.0, np.where(out.gf == out.ga, 1.0, 0.0))
    out["opponent_level"] = np.where(out.elo_gap > 75, "weaker", np.where(out.elo_gap < -75,
                                                                          "stronger", "similar"))
    return out.sort_values(["team_id", "kickoff_date", "match_id"]).reset_index(drop=True)


TEAM_INDICATORS: list[Indicator] = []


def _tadd(name, kind, definition, needs, fn):
    TEAM_INDICATORS.append(Indicator(name, kind, definition, needs, fn))


_tadd("win", "rate", "Team wins after 90 minutes.", ("gf", "ga"), lambda t: t.gf > t.ga)
_tadd("draw", "rate", "Team draws after 90 minutes.", ("gf", "ga"), lambda t: t.gf == t.ga)
_tadd("points", "mean", "Points per match (3/1/0).", ("gf", "ga"), lambda t: t.points)
_tadd("goals_for", "mean", "Goals scored per match.", ("gf",), lambda t: t.gf)
_tadd("goals_against", "mean", "Goals conceded per match.", ("ga",), lambda t: t.ga)
_tadd("clean_sheet", "rate", "Team concedes no goal.", ("ga",), lambda t: t.ga == 0)
_tadd("failed_to_score", "rate", "Team scores no goal.", ("gf",), lambda t: t.gf == 0)
_tadd("btts", "rate", "Both teams score.", ("gf", "ga"), lambda t: (t.gf > 0) & (t.ga > 0))
_tadd("over_2_5", "rate", "More than 2.5 goals in the match.", ("gf", "ga"), lambda t: t.gf + t.ga > 2.5)
_tadd("score_minus_elo_expected", "mean",
      "Result score (1/0.5/0) minus the pre-match Elo expectation: over- or under-performance "
      "against strength.", ("gf", "ga"), lambda t: t.score - t.elo_expected)
_tadd("goal_difference_volatility", "mean",
      "Absolute deviation of the goal difference from the window mean (consistency).",
      ("gf", "ga"), lambda t: (t.gf - t.ga))
_tadd("shots_for", "mean", "Shots per match.", ("shots_for",), lambda t: t.shots_for)
_tadd("shots_against", "mean", "Shots conceded per match.", ("shots_against",), lambda t: t.shots_against)
_tadd("sot_for", "mean", "Shots on target per match.", ("sot_for",), lambda t: t.sot_for)
_tadd("sot_against", "mean", "Shots on target conceded per match.", ("sot_against",),
      lambda t: t.sot_against)
_tadd("conversion", "mean", "Goals per shot on target (ratio of window sums).", ("gf", "sot_for"),
      lambda t: t.gf)
_tadd("corners_for", "mean", "Corners won per match.", ("corners_for",), lambda t: t.corners_for)
_tadd("ht_lead_kept", "rate", "When leading at half time: team wins.", ("gf", "ga", "ht_gf", "ht_ga"),
      lambda t: (t.gf > t.ga).where(t.ht_gf > t.ht_ga))
_tadd("ht_deficit_recovered", "rate", "When behind at half time: team avoids defeat.",
      ("gf", "ga", "ht_gf", "ht_ga"), lambda t: (t.gf >= t.ga).where(t.ht_gf < t.ht_ga))
_tadd("scored_first_half", "rate", "Team scores before half time.", ("ht_gf",), lambda t: t.ht_gf > 0)


def team_value(ind: Indicator, t: pd.DataFrame) -> float:
    """Window value of a team indicator (ratios and dispersion need the whole window)."""
    if ind.name == "conversion":
        ok = t[["gf", "sot_for"]].notna().all(axis=1)
        sot = t.loc[ok, "sot_for"].sum()
        return float(t.loc[ok, "gf"].sum() / sot) if sot > 0 else np.nan
    vals = evaluate(ind, t).dropna()
    if ind.name == "goal_difference_volatility":
        return float((vals - vals.mean()).abs().mean()) if len(vals) >= 2 else np.nan
    return float(vals.mean()) if len(vals) else np.nan
