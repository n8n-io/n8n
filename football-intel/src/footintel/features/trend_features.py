"""Trend features for the prediction model, grouped by category so each group can be
tested, enabled or left out on its own.

Team values use only the team's earlier matches (one match per team per day, so
"earlier rows" means earlier days). Rates are shrunk toward a fixed prior with a
small weight so a team with few matches gets a cautious value.
"""

import numpy as np
import pandas as pd

from footintel.features.context import rolling_competition_rates

TEAM_GROUPS = {
    "team_form_residual": ["tt_resid_6", "tt_resid_19", "tt_resid_76"],
    "team_scoring_profile": ["tt_clean_sheet_19", "tt_failed_to_score_19", "tt_btts_19",
                             "tt_over25_19", "tt_conversion_38", "tt_first_half_share_38"],
    "team_game_state": ["tt_ht_lead_kept_38", "tt_ht_deficit_recovered_38", "tt_volatility_19"],
}
COMPETITION_GROUPS = {
    "competition_score_profile": ["comp_nil_nil_rate", "comp_first_half_share",
                                  "comp_ht_leader_wins_rate", "comp_over35_rate",
                                  "comp_one_goal_margin_rate"],
}
TREND_GROUPS = {**TEAM_GROUPS, **COMPETITION_GROUPS}


def group_columns(group: str) -> list[str]:
    cols = TREND_GROUPS[group]
    if group in TEAM_GROUPS:
        return [f"{c}_h" for c in cols] + [f"{c}_a" for c in cols]
    return cols


def _rolling(series: pd.Series, by: pd.Series, window: int, prior: float | None = None,
             weight: float = 0.0, count: pd.Series | None = None) -> pd.Series:
    """Mean of the previous `window` known values of each team, optionally shrunk."""
    known = series.notna().astype(float)
    filled = series.fillna(0.0)
    g = filled.groupby(by)
    s = g.transform(lambda x: x.shift(1).rolling(window, min_periods=1).sum())
    n = known.groupby(by).transform(lambda x: x.shift(1).rolling(window, min_periods=1).sum())
    if prior is None:
        return (s / n).where(n > 0)
    # A team's first match gets the prior.
    return (s.fillna(0.0) + weight * prior) / (n.fillna(0.0) + weight)


def _rolling_sum(series: pd.Series, by: pd.Series, window: int) -> pd.Series:
    """Sum of the previous `window` rows of each team (unknown values count as 0)."""
    return series.fillna(0.0).groupby(by).transform(
        lambda x: x.shift(1).rolling(window, min_periods=1).sum()).fillna(0.0)


def team_trend_features(df: pd.DataFrame) -> pd.DataFrame:
    """Columns `tt_*_h` and `tt_*_a` for every row of `df` (scheduled matches included)."""
    from footintel.analysis.events import team_long

    base = df.copy()
    played = base["home_goals"].notna() & base["away_goals"].notna()
    # team_long needs a goal value per row; unplayed rows keep NaN and only receive features.
    t = team_long(base.assign(home_goals=base["home_goals"], away_goals=base["away_goals"]))
    t = t.sort_values(["team_id", "kickoff_date", "match_id"]).reset_index(drop=True)
    tid = t["team_id"]
    done = t["gf"].notna() & t["ga"].notna()
    resid = (t["score"] - t["elo_expected"]).where(done)
    out = pd.DataFrame({"match_id": t["match_id"], "team_id": tid, "is_home": t["is_home"]})
    for w in (6, 19, 76):
        out[f"tt_resid_{w}"] = _rolling(resid, tid, w, prior=0.0, weight=3.0)
    rate = lambda cond: cond.astype(float).where(done)  # noqa: E731
    out["tt_clean_sheet_19"] = _rolling(rate(t.ga == 0), tid, 19, prior=0.28, weight=5)
    out["tt_failed_to_score_19"] = _rolling(rate(t.gf == 0), tid, 19, prior=0.28, weight=5)
    out["tt_btts_19"] = _rolling(rate((t.gf > 0) & (t.ga > 0)), tid, 19, prior=0.5, weight=5)
    out["tt_over25_19"] = _rolling(rate(t.gf + t.ga > 2.5), tid, 19, prior=0.5, weight=5)
    # Goals per shot on target: ratio of window sums over matches with the statistic,
    # prior 0.30 with the weight of 30 shots on target.
    sot_known = t["sot_for"].notna() & done
    gf_sum = _rolling_sum(t["gf"].where(sot_known), tid, 38)
    sot_sum = _rolling_sum(t["sot_for"].where(sot_known), tid, 38)
    out["tt_conversion_38"] = (gf_sum + 0.30 * 30) / (sot_sum + 30)
    # Share of the team's match goals scored before half time, prior 0.44 with weight 10 goals.
    ht_known = t["ht_gf"].notna() & t["ht_ga"].notna() & done
    fh_sum = _rolling_sum((t["ht_gf"] + t["ht_ga"]).where(ht_known), tid, 38)
    tot_sum = _rolling_sum((t["gf"] + t["ga"]).where(ht_known), tid, 38)
    out["tt_first_half_share_38"] = (fh_sum + 0.44 * 10) / (tot_sum + 10)
    lead = (t.ht_gf > t.ht_ga) & ht_known
    behind = (t.ht_gf < t.ht_ga) & ht_known
    out["tt_ht_lead_kept_38"] = _rolling((t.gf > t.ga).astype(float).where(lead), tid, 38,
                                         prior=0.70, weight=5)
    out["tt_ht_deficit_recovered_38"] = _rolling((t.gf >= t.ga).astype(float).where(behind), tid, 38,
                                                 prior=0.25, weight=5)
    gd = (t.gf - t.ga).where(done)
    gd_mean = _rolling(gd, tid, 19)
    out["tt_volatility_19"] = _rolling((gd - gd_mean).abs(), tid, 19, prior=1.2, weight=3)
    cols = [c for c in out.columns if c.startswith("tt_")]
    home = out[out["is_home"]].set_index("match_id")[cols].add_suffix("_h")
    away = out[~out["is_home"]].set_index("match_id")[cols].add_suffix("_a")
    res = df[["match_id"]].join(home, on="match_id").join(away, on="match_id")
    return res.drop(columns="match_id").set_index(df.index)


def competition_profile_features(df: pd.DataFrame) -> pd.DataFrame:
    hg, ag = df["home_goals"], df["away_goals"]
    played = hg.notna() & ag.notna()
    ht_known = played & df.get("ht_home_goals", pd.Series(np.nan, index=df.index)).notna()
    ht = df.get("ht_home_goals", 0) + df.get("ht_away_goals", 0)
    lead = np.sign(df.get("ht_home_goals", 0) - df.get("ht_away_goals", 0))
    events = {
        "comp_nil_nil_rate": ((hg + ag) == 0).astype(float).where(played),
        "comp_first_half_share": (ht / (hg + ag)).where(ht_known & ((hg + ag) > 0)),
        "comp_ht_leader_wins_rate": (np.sign(hg - ag) == lead).astype(float).where(ht_known & (lead != 0)),
        "comp_over35_rate": ((hg + ag) > 3.5).astype(float).where(played),
        "comp_one_goal_margin_rate": ((hg - ag).abs() == 1).astype(float).where(played),
    }
    return rolling_competition_rates(df, events)


def add_trend_features(df: pd.DataFrame) -> pd.DataFrame:
    return pd.concat([df, team_trend_features(df), competition_profile_features(df)], axis=1)
