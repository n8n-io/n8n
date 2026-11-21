"""Does Understat xG improve the odds model? Out-of-sample test before any collection (D55).

Source: the Understat shot files that worldfootballR_data republishes on GitHub (big five
leagues, 2014-15 to September 2025). Understat itself is never contacted: its robots.txt
disallows every robot. The files are read from a local folder and never stored in the database.

Run from football-intel/:
  .venv/bin/python scripts/xg_experiment.py <folder with the *_shot_data.rds files> <folder with pyreadr>

Features, fixed before reading any result: for each team, the mean xG for and against over
its last 10 league matches with xG (at least 5), computed before the match.
"""

import sys
from collections import Counter, defaultdict

import numpy as np
import pandas as pd

DATA, PYLIB = sys.argv[1], sys.argv[2]
sys.path.insert(0, PYLIB)
sys.path.insert(0, "src")
import pyreadr  # noqa: E402

from footintel.db.session import get_engine  # noqa: E402
from footintel.evaluation.backtest import paired_logloss, walk_forward  # noqa: E402
from footintel.evaluation.clv import clv_table, load_prices  # noqa: E402
from footintel.features.builder import build_features  # noqa: E402
from footintel.features.dataset import load_matches  # noqa: E402
from footintel.models import zoo  # noqa: E402
from footintel.models.ml import WITH_MARKET_FEATURES, logistic  # noqa: E402

FILES = {"EPL": "ENG-PL", "La_liga": "ESP-LL", "Bundesliga": "GER-BL", "Serie_A": "ITA-SA"}
WINDOW, MIN_MATCHES = 10, 5
XG = ["xg_for_h", "xg_against_h", "xg_for_a", "xg_against_a", "xg_diff"]
TEST_SEASONS = [2021, 2022, 2023, 2024]  # 2025-26 is cut in September 2025 in the files


def understat_matches() -> pd.DataFrame:
    rows = []
    for name, comp in FILES.items():
        shots = next(iter(pyreadr.read_r(f"{DATA}/{name}_shot_data.rds").values()))
        shots["xG"] = pd.to_numeric(shots["xG"], errors="coerce").fillna(0.0)
        # The side column is h_a up to 2021-22, then home_away.
        shots["h_a"] = shots["h_a"].where(shots["h_a"].notna() & (shots["h_a"] != ""), shots["home_away"])
        per = shots.pivot_table(index="match_id", columns="h_a", values="xG", aggfunc="sum", fill_value=0.0)
        meta = shots.groupby("match_id")[["date", "home_team", "away_team", "home_goals", "away_goals"]].first()
        m = meta.join(per).rename(columns={"h": "xg_home", "a": "xg_away"})
        m["competition"] = comp
        rows.append(m.reset_index(drop=True))
    out = pd.concat(rows, ignore_index=True)
    out["date"] = pd.to_datetime(out["date"]).dt.normalize()
    out[["home_goals", "away_goals"]] = out[["home_goals", "away_goals"]].astype(float)
    return out


def team_map(us: pd.DataFrame, ours: pd.DataFrame) -> dict:
    """Understat name -> our team_id, by votes on matches with the same league, date and score."""
    votes: dict[tuple, Counter] = defaultdict(Counter)
    key = ["competition", "date", "home_goals", "away_goals"]
    pairs = us.merge(ours, on=key)
    # Keep the dates where one league has a single match with that exact score.
    single = pairs.groupby(key).filter(lambda g: len(g) == 1)
    for r in single.itertuples():
        votes[(r.competition, r.home_team_us)][r.home_team_id] += 1
        votes[(r.competition, r.away_team_us)][r.away_team_id] += 1
    mapping = {}
    for (comp, name), c in votes.items():
        team, n = c.most_common(1)[0]
        if n >= 3 and n >= 0.9 * sum(c.values()):
            mapping[(comp, name)] = team
    return mapping


def rolling_xg(matched: pd.DataFrame) -> pd.DataFrame:
    """Pre-match mean xG for and against over each team's last WINDOW matches."""
    long = pd.concat([
        matched.assign(team=matched.home_team_id, xf=matched.xg_home, xa=matched.xg_away, side="h"),
        matched.assign(team=matched.away_team_id, xf=matched.xg_away, xa=matched.xg_home, side="a"),
    ]).sort_values(["team", "date", "match_id"]).reset_index(drop=True)  # unique index for the transforms
    g = long.groupby("team")
    for col, src in (("for", "xf"), ("against", "xa")):
        long[col] = g[src].transform(lambda s: s.shift(1).rolling(WINDOW, min_periods=MIN_MATCHES).mean())
    wide = long.pivot_table(index="match_id", columns="side", values=["for", "against"])
    wide.columns = [f"xg_{a}_{s}" for a, s in wide.columns]
    wide["xg_diff"] = (wide.xg_for_h - wide.xg_against_h) - (wide.xg_for_a - wide.xg_against_a)
    return wide.reset_index()


engine = get_engine()
us = understat_matches().rename(columns={"home_team": "home_team_us", "away_team": "away_team_us"})
raw = load_matches(engine)
ours = raw[raw.competition.isin(FILES.values()) & raw.home_goals.notna()][
    ["match_id", "competition", "kickoff_date", "home_team_id", "away_team_id", "home_goals", "away_goals"]].copy()
ours["date"] = pd.to_datetime(ours.kickoff_date).dt.normalize()
mapping = team_map(us, ours)
us["home_team_id"] = [mapping.get((c, n)) for c, n in zip(us.competition, us.home_team_us, strict=True)]
us["away_team_id"] = [mapping.get((c, n)) for c, n in zip(us.competition, us.away_team_us, strict=True)]
names = set(zip(us.competition, us.home_team_us, strict=True))
print(f"Understat: {len(us)} matches, {len(names)} team names, {len(mapping)} mapped")
print("Unmapped names:", sorted(n for n in names if n not in mapping))

matched = us.dropna(subset=["home_team_id", "away_team_id"]).merge(
    ours, on=["competition", "home_team_id", "away_team_id"], suffixes=("", "_ours"))
matched = matched[(matched.date - matched.date_ours).abs() <= pd.Timedelta(days=3)]
bad = (matched.home_goals != matched.home_goals_ours) | (matched.away_goals != matched.away_goals_ours)
print(f"Matched {len(matched)} matches; {int(bad.sum())} with a different score (dropped)")
matched = matched[~bad]

feats = build_features(raw).merge(rolling_xg(matched), on="match_id", how="left")
coverage = feats[feats.season.isin(TEST_SEASONS) & feats.competition.isin(FILES.values())]
print("Share of test matches with xG features:", round(coverage.xg_diff.notna().mean(), 3))


class WithXG(zoo.RoutedCompetitionAware):
    def __init__(self, name: str, only_with_xg: bool):
        super().__init__(name)
        self.only_with_xg = only_with_xg
        self.with_odds = logistic(WITH_MARKET_FEATURES + XG, f"{name}:with_odds")

    def fit(self, train):
        if self.only_with_xg:
            train = train[train.xg_diff.notna() | train.mkt_p_home.isna()]
        return super().fit(train)


class BaseOnXGRows(zoo.RoutedCompetitionAware):
    """Same training rows as WithXG(only_with_xg=True), without the xG columns."""

    def fit(self, train):
        return super().fit(train[train.xg_diff.notna() | train.mkt_p_home.isna()])


zoo.MODEL_FACTORIES.update({
    "rc_xg": lambda: WithXG("rc_xg", only_with_xg=False),
    "rc_xg_rows": lambda: WithXG("rc_xg_rows", only_with_xg=True),
    "rc_base_rows": lambda: BaseOnXGRows("rc_base_rows"),
})
models = ["routed_competition", "rc_xg", "rc_base_rows", "rc_xg_rows", "market_implied"]
preds = walk_forward(feats, models, TEST_SEASONS)
has_xg = feats.loc[feats.xg_diff.notna(), "match_id"]
preds = preds[preds.match_id.isin(has_xg)]
print(f"\nTest: seasons {TEST_SEASONS}, {preds.match_id.nunique()} league matches with xG features")
for cand, ref in (("rc_xg", "routed_competition"), ("rc_xg_rows", "rc_base_rows"),
                  ("rc_xg", "market_implied"), ("routed_competition", "market_implied")):
    r = paired_logloss(preds, cand, ref, samples=2000)
    print(f"{cand} - {ref}: {r['mean_diff']:+.4f} [{r['ci_low']:+.4f} ; {r['ci_high']:+.4f}] n={r['n']}")
print("\nClosing line value (average pre-closing price, edge > 3 %):")
print(clv_table(preds, load_prices(engine, preds.match_id), samples=1000).round(4).to_string(index=False))
