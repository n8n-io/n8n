"""Competition context known before each match: stage, leg, season phase, competition trends.

Every value uses matches of strictly earlier days only. Trend rates are shrunk
toward the long-run rate of the competition (and, with no history at all, toward
the rate of all football in the data), so small samples do not produce extreme
values. Definitions are in docs/FEATURES.md.
"""

import re

import numpy as np
import pandas as pd

# Window of competition history used for trends (about two seasons).
TREND_DAYS = 730
# Pseudo-matches of prior weight used to shrink a rate toward its reference.
SHRINK_WEIGHT = 150

TREND_FEATURES = ["comp_home_rate", "comp_draw_rate", "comp_goals_mean", "comp_btts_rate",
                  "comp_over25_rate", "comp_home_goal_adv"]
PHASE_FEATURES = ["season_progress", "is_knockout", "is_second_leg", "first_leg_gd",
                  "is_final_stage"]
STAGES = ["league", "group", "qualifying", "playoff", "round_of_32", "round_of_16",
          "quarterfinal", "semifinal", "final"]

_STAGE_PATTERNS = [
    ("final", r"(^|, )final$"),
    ("semifinal", r"semi"),
    ("quarterfinal", r"quarter|viertel"),
    ("round_of_16", r"round of 16|achtel"),
    ("round_of_32", r"round of 32|sechzehntel|knockout round play"),
    ("playoff", r"playoff|play-off|knockout"),
    ("qualifying", r"qualif|preliminary"),
    ("group", r"group|gruppe"),
    ("league", r"league|matchday"),
]


def stage_of(round_text: str | None, competition_type: str) -> str:
    # A missing round arrives from pandas as NaN, a float: treat it as unknown.
    if competition_type == "league" or not isinstance(round_text, str) or not round_text:
        return "league" if competition_type == "league" else "unknown"
    text = round_text.lower()
    for stage, pattern in _STAGE_PATTERNS:
        if re.search(pattern, text):
            return stage
    return "unknown"


KNOCKOUT_STAGES = {"playoff", "round_of_32", "round_of_16", "quarterfinal", "semifinal"}


def _legs(df: pd.DataFrame) -> pd.DataFrame:
    """Leg number and first-leg goal difference (from the second-leg home side)."""
    out = pd.DataFrame(index=df.index, data={"leg": np.nan, "first_leg_gd": np.nan})
    ko = df[df["stage"].isin(KNOCKOUT_STAGES)]
    if ko.empty:
        return out
    pair = ko.apply(lambda r: tuple(sorted((r.home_team_id, r.away_team_id))), axis=1)
    for _, idx in ko.groupby([ko["competition"], ko["season"], ko["stage"], pair]).groups.items():
        group = df.loc[idx].sort_values("kickoff_date")
        if len(group) != 2:
            continue
        first, second = group.index[0], group.index[1]
        if (df.at[second, "kickoff_date"] - df.at[first, "kickoff_date"]).days > 60:
            continue
        out.at[first, "leg"], out.at[second, "leg"] = 1, 2
        # The second-leg home team was the away team of the first leg.
        f = df.loc[first]
        if not np.isnan(f.home_goals):
            out.at[second, "first_leg_gd"] = f.away_goals - f.home_goals
    return out


def _cumulative_before(events: pd.DataFrame, days: pd.Series, keys: list[str]) -> pd.DataFrame:
    """Per day: sums over all earlier days (the day itself excluded)."""
    daily = events.assign(day=days.to_numpy()).groupby("day")[keys].sum().sort_index()
    return daily.cumsum().shift(1).fillna(0.0), daily.cumsum()


def rolling_competition_rates(df: pd.DataFrame, events: dict[str, pd.Series]) -> pd.DataFrame:
    """For each event (NaN = unknown for that match): competition rate over the TREND_DAYS
    before each match day, shrunk toward the competition's long-run rate, itself shrunk
    toward all football in the data. Each event has its own count of known matches."""
    cols = list(events)
    vals = pd.DataFrame({k: v.fillna(0.0).astype(float) for k, v in events.items()})
    cnts = pd.DataFrame({f"{k}__n": v.notna().astype(float) for k, v in events.items()})
    frame = pd.concat([vals, cnts], axis=1)
    keys = list(frame.columns)
    g_prev, _ = _cumulative_before(frame, df["kickoff_date"], keys)
    global_rate = {k: (g_prev[k] / g_prev[f"{k}__n"]).where(g_prev[f"{k}__n"] > 0) for k in cols}
    out = pd.DataFrame(index=df.index, columns=cols, dtype=float)
    window = pd.Timedelta(days=TREND_DAYS)
    for _, idx in df.groupby("competition").groups.items():
        days = df.loc[idx, "kickoff_date"]
        prev, cum = _cumulative_before(frame.loc[idx], days, keys)
        day_index = prev.index.to_numpy()
        # Last day strictly before the window start, for each match day.
        j = np.searchsorted(day_index, day_index - window, side="left") - 1
        start = np.where((j >= 0)[:, None], cum.to_numpy()[np.maximum(j, 0)], 0.0)
        win = pd.DataFrame(prev.to_numpy() - start, index=prev.index, columns=prev.columns)
        for k in cols:
            glob = global_rate[k].reindex(prev.index)
            long_run = (prev[k] + SHRINK_WEIGHT * glob) / (prev[f"{k}__n"] + SHRINK_WEIGHT)
            long_run = long_run.fillna(glob)
            rate = (win[k] + SHRINK_WEIGHT * long_run) / (win[f"{k}__n"] + SHRINK_WEIGHT)
            out.loc[idx, k] = days.map(rate).to_numpy()
    return out


def _trends(df: pd.DataFrame) -> pd.DataFrame:
    hg, ag = df["home_goals"], df["away_goals"]
    played = hg.notna() & ag.notna()
    events = {
        "comp_home_rate": (hg > ag).astype(float).where(played),
        "comp_draw_rate": (hg == ag).astype(float).where(played),
        "comp_goals_mean": (hg + ag).where(played),
        "comp_btts_rate": ((hg > 0) & (ag > 0)).astype(float).where(played),
        "comp_over25_rate": ((hg + ag) > 2.5).astype(float).where(played),
        "comp_home_goal_adv": (hg - ag).where(played),
    }
    return rolling_competition_rates(df, events)[TREND_FEATURES]


def _season_progress(df: pd.DataFrame) -> pd.Series:
    """Share of the league season already played by the home team (0 at kick-off of round 1)."""
    leagues = df[df["competition_type"] == "league"]
    keys = ["competition", "season"]
    sides = pd.concat([
        leagues[keys + ["kickoff_date", "match_id"]].assign(team=leagues["home_team_id"], home=True),
        leagues[keys + ["kickoff_date", "match_id"]].assign(team=leagues["away_team_id"], home=False),
    ]).rename_axis("row").reset_index().sort_values(["kickoff_date", "match_id"], kind="stable")
    # Games already played on strictly earlier days: same-day games share the lowest count.
    sides["played"] = sides.groupby(keys + ["team"]).cumcount()
    sides["played"] = sides.groupby(keys + ["team", "kickoff_date"])["played"].transform("min")
    n_teams = sides.groupby(keys)["team"].transform("nunique")
    sides["progress"] = sides["played"] / (2 * (n_teams - 1)).clip(lower=1)
    home = sides[sides["home"]].set_index("row")["progress"]
    return home.reindex(df.index).clip(upper=1.0)


def add_context(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    if "round" not in df:
        df["round"] = None
    df["stage"] = [stage_of(r, t) for r, t in zip(df["round"], df["competition_type"], strict=True)]
    legs = _legs(df)
    df["is_knockout"] = df["stage"].isin(KNOCKOUT_STAGES | {"final"}).astype(float)
    df["is_second_leg"] = (legs["leg"] == 2).astype(float)
    df["first_leg_gd"] = legs["first_leg_gd"].fillna(0.0)
    df["leg"] = legs["leg"]
    df["is_final_stage"] = (df["stage"] == "final").astype(float)
    df["season_progress"] = _season_progress(df)
    df["season_phase"] = pd.cut(df["season_progress"], [-0.01, 1 / 3, 2 / 3, 1.01],
                                labels=["early", "mid", "late"]).astype(object)
    df[TREND_FEATURES] = _trends(df)
    return df
