"""Model A: naive frequencies and an Elo-driven Poisson goals model. Plus the market reference."""

import numpy as np
import pandas as pd
from sklearn.linear_model import PoissonRegressor

from footintel.models.base import (GOAL_COLS, PROB_COLS, ProbModel, dixon_coles_tau, encode_result,
                                  markets_from_lambdas)


class NaiveFrequency(ProbModel):
    """Historical H/D/A share per competition, and average goals for goal markets.

    Any model must beat this to justify its complexity."""

    name = "naive_frequency"
    family = "baseline"

    def fit(self, train: pd.DataFrame) -> "NaiveFrequency":
        y = encode_result(train)
        self.global_ = np.bincount(y, minlength=3) / len(y)
        self.by_comp_ = {}
        for comp, idx in train.groupby("competition").indices.items():
            counts = np.bincount(y[idx], minlength=3)
            self.by_comp_[comp] = counts / counts.sum()
        self.lam_home_ = float(train["home_goals"].mean())
        self.lam_away_ = float(train["away_goals"].mean())
        return self

    def predict(self, df: pd.DataFrame) -> pd.DataFrame:
        probs = np.vstack([self.by_comp_.get(c, self.global_) for c in df["competition"]])
        out = pd.DataFrame(probs, columns=PROB_COLS, index=df.index)
        goals = markets_from_lambdas(np.full(len(df), self.lam_home_),
                                     np.full(len(df), self.lam_away_))
        goals.index = df.index
        return pd.concat([out, goals[GOAL_COLS]], axis=1)


class EloPoisson(ProbModel):
    """Home and away goals follow Poisson laws whose means depend on the Elo gap."""

    name = "elo_poisson"
    family = "poisson"
    features = ["elo_diff"]

    def __init__(self, alpha: float = 1e-4):
        self.alpha = alpha

    def _x(self, df: pd.DataFrame) -> np.ndarray:
        return (df[["elo_diff"]].to_numpy() / 100.0)

    def fit(self, train: pd.DataFrame) -> "EloPoisson":
        x = self._x(train)
        self.home_ = PoissonRegressor(alpha=self.alpha, max_iter=1000).fit(x, train["home_goals"])
        self.away_ = PoissonRegressor(alpha=self.alpha, max_iter=1000).fit(x, train["away_goals"])
        return self

    def predict(self, df: pd.DataFrame) -> pd.DataFrame:
        x = self._x(df)
        out = markets_from_lambdas(self.home_.predict(x), self.away_.predict(x))
        out.index = df.index
        return out[PROB_COLS + GOAL_COLS]

    def params(self) -> dict:
        return {"alpha": self.alpha}


class PoissonFeatures(ProbModel):
    """Home and away goals from a Poisson GLM on any feature set (imputed, scaled, clipped)."""

    family = "poisson"

    def __init__(self, name: str, features: list[str], alpha: float = 1e-3,
                 targets: tuple[str, str] = ("home_goals", "away_goals"), dixon_coles: bool = False):
        self.name, self.features, self.alpha = name, list(features), alpha
        # ("ht_home_goals", "ht_away_goals") gives a first-half goals model.
        self.targets = targets
        # Low-score correction: one parameter rho, fitted on the training scores.
        self.dixon_coles, self.rho_ = dixon_coles, 0.0

    def _pipe(self):
        from sklearn.impute import SimpleImputer
        from sklearn.pipeline import Pipeline
        from sklearn.preprocessing import FunctionTransformer, StandardScaler

        return Pipeline([("impute", SimpleImputer(strategy="median", add_indicator=True)),
                         ("scale", StandardScaler()),
                         ("clip", FunctionTransformer(np.clip, kw_args={"a_min": -5.0, "a_max": 5.0})),
                         ("glm", PoissonRegressor(alpha=self.alpha, max_iter=2000))])

    def fit(self, train: pd.DataFrame) -> "PoissonFeatures":
        train = train[train[list(self.targets)].notna().all(axis=1)]
        x = train[self.features]
        self.home_ = self._pipe().fit(x, train[self.targets[0]])
        self.away_ = self._pipe().fit(x, train[self.targets[1]])
        if self.dixon_coles:
            self.rho_ = fit_rho(self.home_.predict(x), self.away_.predict(x),
                                train[self.targets[0]].to_numpy(), train[self.targets[1]].to_numpy())
        return self

    def predict(self, df: pd.DataFrame) -> pd.DataFrame:
        x = df[self.features]
        # Versions saved before the Dixon-Coles option have no rho: 0 keeps them unchanged.
        out = markets_from_lambdas(self.home_.predict(x), self.away_.predict(x),
                                   getattr(self, "rho_", 0.0))
        out.index = df.index
        return out[PROB_COLS + GOAL_COLS]

    def params(self) -> dict:
        return {"alpha": self.alpha, "features": self.features, "targets": list(self.targets),
                "dixon_coles": getattr(self, "dixon_coles", False), "rho": getattr(self, "rho_", 0.0)}


def fit_rho(lam_h: np.ndarray, lam_a: np.ndarray, hg: np.ndarray, ag: np.ndarray) -> float:
    """Maximum-likelihood Dixon-Coles rho, with the Poisson rates held fixed.

    Only the four low scores carry tau; the normalising constant is kept so the
    likelihood stays a proper distribution."""
    from scipy.optimize import minimize_scalar

    p00, p01 = np.exp(-lam_h - lam_a), np.exp(-lam_h - lam_a) * lam_a
    p10, p11 = np.exp(-lam_h - lam_a) * lam_h, np.exp(-lam_h - lam_a) * lam_h * lam_a
    idx = np.select([(hg == 0) & (ag == 0), (hg == 0) & (ag == 1), (hg == 1) & (ag == 0),
                     (hg == 1) & (ag == 1)], [0, 1, 2, 3], -1)

    def nll(rho: float) -> float:
        tau = dixon_coles_tau(lam_h, lam_a, rho)
        if (tau <= 0).any():
            return np.inf
        norm = 1 + (tau[0] - 1) * p00 + (tau[1] - 1) * p01 + (tau[2] - 1) * p10 + (tau[3] - 1) * p11
        low = idx >= 0
        return float(-np.log(tau[idx[low], np.flatnonzero(low)]).sum() + np.log(norm).sum())

    return float(minimize_scalar(nll, bounds=(-0.2, 0.2), method="bounded").x)


class MarketImplied(ProbModel):
    """Model C: bookmaker prices with the margin removed. Not a truth, a reference.

    Rows without odds get NaN and are excluded from market comparisons."""

    name = "market_implied"
    family = "market"
    features = ["mkt_p_home", "mkt_p_draw", "mkt_p_away"]

    def fit(self, train: pd.DataFrame) -> "MarketImplied":
        return self

    def predict(self, df: pd.DataFrame) -> pd.DataFrame:
        out = df[["mkt_p_home", "mkt_p_draw", "mkt_p_away"]].copy()
        out.columns = PROB_COLS
        return out
