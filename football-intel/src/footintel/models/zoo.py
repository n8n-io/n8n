"""Named model configurations. A registry name always builds the same configuration."""

from collections.abc import Callable

import numpy as np
import pandas as pd

from footintel.analysis.stories import CONFIRMED_FOR_MODEL, scenario_columns
from footintel.models.base import GOAL_COLS, PROB_COLS, ProbModel
from footintel.models.baseline import EloPoisson, MarketImplied, NaiveFrequency, PoissonFeatures
from footintel.models.ml import CORE_FEATURES, WITH_MARKET_FEATURES, logistic, random_forest, xgboost

MARKET_PROBS = ["mkt_p_home", "mkt_p_draw", "mkt_p_away"]


def blend(p_model: np.ndarray, p_market: np.ndarray, weight: float) -> np.ndarray:
    """Geometric mix of two (n, 3) probability arrays: weight on the model, the rest on the market."""
    z = weight * np.log(p_model.clip(1e-12, 1)) + (1 - weight) * np.log(p_market.clip(1e-12, 1))
    z = np.exp(z - z.max(axis=1, keepdims=True))
    return z / z.sum(axis=1, keepdims=True)


class Composite(ProbModel):
    """1X2 from one model, goal markets from another. Versioned as one unit."""

    family = "composite"

    def __init__(self, name: str, outcome: ProbModel, goals: ProbModel):
        self.name, self.outcome, self.goals = name, outcome, goals
        self.features = sorted(set(outcome.features) | set(goals.features))

    def fit(self, train: pd.DataFrame) -> "Composite":
        self.outcome.fit(train)
        self.goals.fit(train)
        return self

    def predict(self, df: pd.DataFrame) -> pd.DataFrame:
        return pd.concat([self.outcome.predict(df)[PROB_COLS], self.goals.predict(df)[GOAL_COLS]],
                         axis=1)

    def params(self) -> dict:
        return {"outcome": self.outcome.name, "outcome_params": self.outcome.params(),
                "goals": self.goals.name, "goals_params": self.goals.params()}


class RoutedByOdds(ProbModel):
    """Use the odds model where pre-match odds exist, the Elo model elsewhere.

    Backtest 2021-2025 (docs/RESULTS.md): one logistic model trained on every match
    learned a weak odds weight (many rows without odds) and lost to the market in
    domestic leagues; training it only on rows with odds removed that loss. Cups have
    no odds in our sources, so they go to the Elo-Poisson model."""

    family = "routed"

    def __init__(self, name: str):
        self.name = name
        self.with_odds = logistic(WITH_MARKET_FEATURES, f"{name}:with_odds")
        self.without_odds = EloPoisson()
        self.features = sorted(set(self.with_odds.features) | set(self.without_odds.features))

    def fit(self, train: pd.DataFrame) -> "RoutedByOdds":
        self.with_odds.fit(train[train["mkt_p_home"].notna()])
        self.without_odds.fit(train)
        return self

    def predict(self, df: pd.DataFrame) -> pd.DataFrame:
        goals = self.without_odds.predict(df)
        out = goals[PROB_COLS].copy()
        has_odds = df["mkt_p_home"].notna()
        if has_odds.any():
            out.loc[has_odds, PROB_COLS] = self.with_odds.predict(df[has_odds])[PROB_COLS]
        return pd.concat([out, goals[GOAL_COLS]], axis=1)

    def params(self) -> dict:
        return {"with_odds": self.with_odds.params(), "without_odds": self.without_odds.params()}


class RoutedCompetitionAware(ProbModel):
    """Configuration chosen from the level study (docs/RESULTS.md, run 8):
    - with pre-match odds: logistic on Elo, team form and market features;
    - without odds (European cups): logistic on Elo and competition trends;
    - goal markets: Poisson GLM on Elo, competition trends and team attack/defence.
    Season phase is left out: it showed no gain and slightly worse goal log loss."""

    family = "routed"

    def __init__(self, name: str, trend_groups: tuple[str, ...] = (), dixon_coles: bool = False,
                 calibrate_without_odds: bool = False, scenario_flags: bool = False,
                 market_blend: bool = False):
        from footintel.analysis.ablation import COMPETITION, GOAL_TEAM
        from footintel.features.trend_features import group_columns

        self.name, self.trend_groups = name, tuple(trend_groups)
        extra = [c for g in trend_groups for c in group_columns(g)]
        # Confirmed pre-match scenarios (D44) as 0/1 inputs of the odds model only.
        self.scenario_flags = scenario_flags
        sc = ([f"sc_{c}_{s}" for c in CONFIRMED_FOR_MODEL for s in ("h", "a")] if scenario_flags else [])
        self.with_odds = logistic(WITH_MARKET_FEATURES + sc, f"{name}:with_odds")
        self.without_odds = logistic(COMPETITION + extra, f"{name}:without_odds")
        self.goals = PoissonFeatures(f"{name}:goals", COMPETITION + GOAL_TEAM + extra,
                                     dixon_coles=dixon_coles)
        self.calibrate_without_odds, self.temperature_ = calibrate_without_odds, 1.0
        # Weight of the odds model against the de-margined market, in log space (1.0 = model only).
        self.market_blend, self.blend_weight_ = market_blend, 1.0
        self.features = sorted(set(self.with_odds.features) | set(self.without_odds.features)
                               | set(self.goals.features))

    def _with_flags(self, df: pd.DataFrame) -> pd.DataFrame:
        if not getattr(self, "scenario_flags", False):
            return df
        return pd.concat([df, scenario_columns(df)], axis=1)

    def fit(self, train: pd.DataFrame) -> "RoutedCompetitionAware":
        if getattr(self, "market_blend", False):
            self.blend_weight_ = self._fit_blend(train)
        self.with_odds.fit(self._with_flags(train[train["mkt_p_home"].notna()]))
        if self.calibrate_without_odds:
            self.temperature_ = self._fit_temperature(train)
        self.without_odds.fit(train)
        self.goals.fit(train)
        return self

    def _fit_temperature(self, train: pd.DataFrame) -> float:
        """Temperature for matches without odds, fitted out of sample on the training window:
        fit on the earliest 80 % of dates, score the matches without odds in the rest."""
        import copy

        from scipy.optimize import minimize_scalar

        from footintel.models.base import encode_result

        cut = train["kickoff_date"].quantile(0.8)
        early, late = train[train["kickoff_date"] <= cut], train[train["kickoff_date"] > cut]
        late = late[late["mkt_p_home"].isna() & late["home_goals"].notna()]
        if len(late) < 100:
            return 1.0
        logp = np.log(copy.deepcopy(self.without_odds).fit(early).predict(late)[PROB_COLS]
                      .to_numpy(float).clip(1e-12, 1))
        y = encode_result(late)

        def nll(t: float) -> float:
            z = logp / t
            z = z - z.max(axis=1, keepdims=True)
            p = np.exp(z) / np.exp(z).sum(axis=1, keepdims=True)
            return float(-np.log(p[np.arange(len(y)), y]).mean())

        return float(minimize_scalar(nll, bounds=(0.5, 2.0), method="bounded").x)

    def _fit_blend(self, train: pd.DataFrame) -> float:
        """Blend weight fitted out of sample on the training window, as for the temperature:
        fit the odds model on the earliest 80 % of dates, score the later matches with odds."""
        import copy

        from scipy.optimize import minimize_scalar

        from footintel.models.base import encode_result

        rows = train[train["mkt_p_home"].notna()]
        cut = rows["kickoff_date"].quantile(0.8)
        early, late = rows[rows["kickoff_date"] <= cut], rows[rows["kickoff_date"] > cut]
        late = late[late["home_goals"].notna()]
        if len(late) < 300:
            return 1.0
        model = copy.deepcopy(self.with_odds).fit(self._with_flags(early))
        p_model = model.predict(self._with_flags(late))[PROB_COLS].to_numpy(float)
        p_market = late[MARKET_PROBS].to_numpy(float)
        y = encode_result(late)

        def nll(w: float) -> float:
            p = blend(p_model, p_market, w)
            return float(-np.log(p[np.arange(len(y)), y].clip(1e-12, 1)).mean())

        return float(minimize_scalar(nll, bounds=(0.0, 1.0), method="bounded").x)

    def predict(self, df: pd.DataFrame) -> pd.DataFrame:
        out = self.without_odds.predict(df)[PROB_COLS].copy()
        # Versions saved before calibration existed have no temperature: 1.0 keeps them unchanged.
        temperature = getattr(self, "temperature_", 1.0)
        if temperature != 1.0:
            z = np.log(out.to_numpy(float).clip(1e-12, 1)) / temperature
            z = np.exp(z - z.max(axis=1, keepdims=True))
            out[PROB_COLS] = z / z.sum(axis=1, keepdims=True)
        has_odds = df["mkt_p_home"].notna()
        if has_odds.any():
            p = self.with_odds.predict(self._with_flags(df[has_odds]))[PROB_COLS].to_numpy(float)
            weight = getattr(self, "blend_weight_", 1.0)
            if weight != 1.0:
                p = blend(p, df.loc[has_odds, MARKET_PROBS].to_numpy(float), weight)
            out.loc[has_odds, PROB_COLS] = p
        return pd.concat([out, self.goals.predict(df)[GOAL_COLS]], axis=1)

    def params(self) -> dict:
        return {"with_odds": self.with_odds.params(), "without_odds": self.without_odds.params(),
                "goals": self.goals.params(), "trend_groups": list(self.trend_groups),
                "temperature_without_odds": getattr(self, "temperature_", 1.0),
                "market_blend_weight": getattr(self, "blend_weight_", 1.0)}


MODEL_FACTORIES: dict[str, Callable[[], ProbModel]] = {
    "routed_competition": lambda: RoutedCompetitionAware("routed_competition"),
    # Candidate from the trend study: team scoring profile on goal markets and cup 1X2
    # (where it showed gains); the odds model is left unchanged.
    "routed_competition_scoring": lambda: RoutedCompetitionAware(
        "routed_competition_scoring", ("team_scoring_profile",)),
    # Phase 6 candidates (D30, D31): cup calibration and low-score correction.
    "routed_competition_cal": lambda: RoutedCompetitionAware(
        "routed_competition_cal", calibrate_without_odds=True),
    "routed_competition_dc": lambda: RoutedCompetitionAware("routed_competition_dc", dixon_coles=True),
    # Candidate from the scenario study (D44): confirmed scenarios as inputs of the odds model.
    "routed_competition_scen": lambda: RoutedCompetitionAware("routed_competition_scen", scenario_flags=True),
    # Candidate (D54): odds model mixed with the de-margined market, weight learned per fold.
    "routed_competition_blend": lambda: RoutedCompetitionAware("routed_competition_blend", market_blend=True),
    "routed_odds_elo": lambda: RoutedByOdds("routed_odds_elo"),
    "logreg_market_goals": lambda: Composite(
        "logreg_market_goals", logistic(WITH_MARKET_FEATURES, "logreg_market"), EloPoisson()),
    "logreg_core_goals": lambda: Composite(
        "logreg_core_goals", logistic(CORE_FEATURES, "logreg_core"), EloPoisson()),
    "naive_frequency": NaiveFrequency,
    "elo_poisson": EloPoisson,
    "market_implied": MarketImplied,
    "logreg_core": lambda: logistic(CORE_FEATURES, "logreg_core"),
    "logreg_market": lambda: logistic(WITH_MARKET_FEATURES, "logreg_market"),
    "rf_core": lambda: random_forest(CORE_FEATURES, "rf_core"),
    "xgb_core": lambda: xgboost(CORE_FEATURES, "xgb_core"),
}

# Reference models are compared against, never deployed for predictions.
REFERENCE_MODELS = {"naive_frequency", "market_implied"}


def build(name: str) -> ProbModel:
    try:
        return MODEL_FACTORIES[name]()
    except KeyError:
        raise ValueError(f"Unknown model {name!r}. Known: {sorted(MODEL_FACTORIES)}") from None
