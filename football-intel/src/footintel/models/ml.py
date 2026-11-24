"""Model B: supervised 1X2 classifiers on pre-match features."""

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import FunctionTransformer, StandardScaler

from footintel.features.builder import CONTEXT_FEATURES, ELO_FEATURES, MARKET_FEATURES, side_features
from footintel.models.base import PROB_COLS, ProbModel, encode_result

CORE_FEATURES = ELO_FEATURES + side_features("h") + side_features("a") + CONTEXT_FEATURES
WITH_MARKET_FEATURES = CORE_FEATURES + MARKET_FEATURES


def _preprocess() -> list:
    # Missing values: median from the training fold plus a missing-indicator column,
    # so "no data" stays visible to the model instead of looking like an average.
    # Clipping z-scores stops an out-of-range input (a near-constant feature, a bad
    # price) from pushing a linear model to probabilities of 0 or 1.
    return [("impute", SimpleImputer(strategy="median", add_indicator=True)),
            ("scale", StandardScaler()),
            ("clip", FunctionTransformer(np.clip, kw_args={"a_min": -5.0, "a_max": 5.0}))]


class SklearnClassifierModel(ProbModel):
    def __init__(self, name: str, family: str, features: list[str], estimator, params: dict):
        self.name, self.family, self.features = name, family, list(features)
        self.estimator = estimator
        self._params = params

    def fit(self, train: pd.DataFrame) -> "SklearnClassifierModel":
        self.pipeline_ = Pipeline(_preprocess() + [("clf", self.estimator)])
        self.pipeline_.fit(train[self.features], encode_result(train))
        return self

    def predict(self, df: pd.DataFrame) -> pd.DataFrame:
        proba = self.pipeline_.predict_proba(df[self.features])
        full = np.zeros((len(df), 3))
        full[:, self.pipeline_.classes_] = proba
        return pd.DataFrame(full, columns=PROB_COLS, index=df.index)

    def params(self) -> dict:
        return {**self._params, "features": self.features}


def logistic(features: list[str], name: str, c: float = 0.5) -> SklearnClassifierModel:
    return SklearnClassifierModel(name, "logistic_regression", features,
                                  LogisticRegression(C=c, max_iter=3000), {"C": c})


def random_forest(features: list[str], name: str) -> SklearnClassifierModel:
    params = {"n_estimators": 300, "min_samples_leaf": 40, "max_features": "sqrt"}
    est = RandomForestClassifier(**params, n_jobs=-1, random_state=42)
    return SklearnClassifierModel(name, "random_forest", features, est, params)


def xgboost(features: list[str], name: str) -> SklearnClassifierModel:
    from xgboost import XGBClassifier  # heavy import, only when used

    params = {"n_estimators": 300, "max_depth": 3, "learning_rate": 0.03,
              "subsample": 0.8, "colsample_bytree": 0.8, "min_child_weight": 20}
    est = XGBClassifier(objective="multi:softprob", eval_metric="mlogloss", n_jobs=4,
                        random_state=42, **params)
    return SklearnClassifierModel(name, "xgboost", features, est, params)
