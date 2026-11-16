"""National teams (D82): an Elo rating over every international match since 1872, then
Poisson goals whose rates depend on the rating gap.

Kept apart from the club models: national teams play few matches, often on neutral
ground, and their ratings come from a different history. The rating follows the method of
the World Football Elo Ratings (eloratings.net): K by match weight, 100 points for the home
side, and a bigger change for a wider score.
"""

from dataclasses import dataclass, field

import numpy as np
import pandas as pd
from scipy.optimize import minimize
from scipy.stats import poisson

HOME_ADVANTAGE = 100.0
START = 1500.0
MAX_GOALS = 10
# Independent Poisson goals give too few draws (21 % against 23 % in 2018-2026). Raising the
# draw scores by 10 % then rescaling matches the real rate and lowers the log loss.
DRAW_BOOST = 0.10
# The goal model learns on the last 12 years: scoring changes slowly over decades.
FIT_YEARS = 12
# Match weight (eloratings.net): world cup finals, continental finals, qualifiers and
# Nations Leagues, other tournaments, friendlies.
K_BY_KIND = {"world_cup": 60.0, "continental": 50.0, "qualifier": 40.0, "tournament": 30.0, "friendly": 20.0}


def goal_index(diff: int) -> float:
    d = abs(diff)
    return 1.0 if d <= 1 else 1.5 if d == 2 else (11 + d) / 8


def rating_gap(elo_home: float, elo_away: float, neutral: bool) -> float:
    return elo_home - elo_away + (0.0 if neutral else HOME_ADVANTAGE)


def ratings(matches: pd.DataFrame) -> tuple[pd.DataFrame, dict[str, float]]:
    """Pre-match ratings of each match, in date order, and the current ratings.

    `matches`: date, home, away, home_goals, away_goals (empty when not played), kind, neutral."""
    elo: dict[str, float] = {}
    pre_h, pre_a = [], []
    df = matches.sort_values("date", kind="stable")
    for h, a, hg, ag, kind, neutral in zip(df["home"], df["away"], df["home_goals"], df["away_goals"],
                                           df["kind"], df["neutral"], strict=True):
        rh, ra = elo.get(h, START), elo.get(a, START)
        pre_h.append(rh)
        pre_a.append(ra)
        if pd.isna(hg) or pd.isna(ag):
            continue
        expected = 1 / (1 + 10 ** (-rating_gap(rh, ra, bool(neutral)) / 400))
        result = 1.0 if hg > ag else 0.5 if hg == ag else 0.0
        change = K_BY_KIND.get(kind, 30.0) * goal_index(int(hg) - int(ag)) * (result - expected)
        elo[h], elo[a] = rh + change, ra - change
    return df.assign(elo_home=pre_h, elo_away=pre_a), elo


@dataclass
class GoalModel:
    """log(goal rate of a side) = a + b * edge / 400, where edge is that side's rating gap; a
    third term lets the home side differ from the away side when the match is not neutral."""

    coef: list[float] = field(default_factory=lambda: [0.25, 0.55, 0.0])

    @staticmethod
    def _rows(gap: np.ndarray, neutral: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
        home = np.column_stack([np.ones_like(gap), gap / 400, (~neutral).astype(float)])
        away = np.column_stack([np.ones_like(gap), -gap / 400, np.zeros_like(gap)])
        return home, away

    def fit(self, gap: np.ndarray, neutral: np.ndarray, hg: np.ndarray, ag: np.ndarray) -> "GoalModel":
        xh, xa = self._rows(gap, neutral)
        x, y = np.vstack([xh, xa]), np.concatenate([hg, ag])

        def nll(c: np.ndarray) -> float:
            eta = x @ c
            return float(np.sum(np.exp(eta) - y * eta)) / len(y)

        self.coef = minimize(nll, np.array(self.coef), method="BFGS").x.tolist()
        return self

    def rates(self, gap, neutral) -> tuple[np.ndarray, np.ndarray]:
        xh, xa = self._rows(np.asarray(gap, float), np.asarray(neutral, bool))
        c = np.array(self.coef)
        return np.exp(xh @ c), np.exp(xa @ c)


def markets(lh: float, la: float, draw_boost: float = DRAW_BOOST) -> dict[str, float]:
    """1X2 and goal markets from two Poisson rates, draws raised by `draw_boost`."""
    g = np.arange(MAX_GOALS + 1)
    grid = np.outer(poisson.pmf(g, lh), poisson.pmf(g, la))
    grid[np.diag_indices(MAX_GOALS + 1)] *= 1 + draw_boost
    grid /= grid.sum()
    total = np.add.outer(g, g)
    return {"p_home": float(np.tril(grid, -1).sum()), "p_draw": float(np.trace(grid)),
            "p_away": float(np.triu(grid, 1).sum()), "exp_home_goals": float(lh), "exp_away_goals": float(la),
            "p_over_1_5": float(grid[total > 1].sum()), "p_over_2_5": float(grid[total > 2].sum()),
            "p_over_3_5": float(grid[total > 3].sum()), "p_btts": float(grid[1:, 1:].sum())}


def fit(rated: pd.DataFrame, since: str | None = None) -> GoalModel:
    """Goal model on finished matches since `since`, by default the last FIT_YEARS years."""
    done = rated[rated["home_goals"].notna()]
    start = pd.Timestamp(since) if since else done["date"].max() - pd.DateOffset(years=FIT_YEARS)
    d = done[done["date"] >= start]
    gap = np.array([rating_gap(h, a, n) for h, a, n in zip(d["elo_home"], d["elo_away"], d["neutral"], strict=True)])
    return GoalModel().fit(gap, d["neutral"].to_numpy(bool), d["home_goals"].to_numpy(float),
                           d["away_goals"].to_numpy(float))


def predict(model: GoalModel, elo: dict[str, float], fixtures: pd.DataFrame) -> pd.DataFrame:
    """Probabilities for `fixtures` (home, away, neutral) from the current ratings."""
    rows = []
    for h, a, n in zip(fixtures["home"], fixtures["away"], fixtures["neutral"], strict=True):
        eh, ea = elo.get(h, START), elo.get(a, START)
        lh, la = model.rates([rating_gap(eh, ea, bool(n))], [bool(n)])
        rows.append(markets(float(lh[0]), float(la[0])) | {"elo_home": eh, "elo_away": ea})
    return pd.DataFrame(rows, index=fixtures.index)


def result_index(hg, ag) -> np.ndarray:
    hg, ag = np.asarray(hg), np.asarray(ag)
    return np.select([hg > ag, hg == ag], [0, 1], 2)


def log_loss(p: np.ndarray, y: np.ndarray) -> float:
    return float(-np.mean(np.log(np.clip(p[np.arange(len(y)), y], 1e-12, 1))))


def accuracy(p: np.ndarray, y: np.ndarray) -> float:
    return float(np.mean(p.argmax(axis=1) == y))
