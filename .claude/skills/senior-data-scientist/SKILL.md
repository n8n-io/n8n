---
name: "senior-data-scientist"
description: World-class senior data scientist skill specialising in statistical modeling, experiment design, causal inference, and predictive analytics. Covers A/B testing (sample sizing, two-proportion z-tests, Bonferroni correction), difference-in-differences, feature engineering pipelines (Scikit-learn, XGBoost), cross-validated model evaluation (AUC-ROC, AUC-PR, SHAP), and MLflow experiment tracking — using Python (NumPy, Pandas, Scikit-learn), R, and SQL. Use when designing or analysing controlled experiments, building and evaluating classification or regression models, performing causal analysis on observational data, engineering features for structured tabular datasets, or translating statistical findings into data-driven business decisions.
---

# Senior Data Scientist

World-class senior data scientist skill for production-grade AI/ML/Data systems.

## Core Workflows

### 1. Design an A/B Test

```python
import numpy as np
from scipy import stats

def calculate_sample_size(baseline_rate, mde, alpha=0.05, power=0.8):
    """
    Calculate required sample size per variant.
    baseline_rate: current conversion rate (e.g. 0.10)
    mde: minimum detectable effect (relative, e.g. 0.05 = 5% lift)
    """
    p1 = baseline_rate
    p2 = baseline_rate * (1 + mde)
    effect_size = abs(p2 - p1) / np.sqrt((p1 * (1 - p1) + p2 * (1 - p2)) / 2)
    z_alpha = stats.norm.ppf(1 - alpha / 2)
    z_beta = stats.norm.ppf(power)
    n = ((z_alpha + z_beta) / effect_size) ** 2
    return int(np.ceil(n))

def analyze_experiment(control, treatment, alpha=0.05):
    """
    Run two-proportion z-test and return structured results.
    control/treatment: dicts with 'conversions' and 'visitors'.
    """
    p_c = control["conversions"] / control["visitors"]
    p_t = treatment["conversions"] / treatment["visitors"]
    pooled = (control["conversions"] + treatment["conversions"]) / (control["visitors"] + treatment["visitors"])
    se = np.sqrt(pooled * (1 - pooled) * (1 / control["visitors"] + 1 / treatment["visitors"]))
    z = (p_t - p_c) / se
    p_value = 2 * (1 - stats.norm.cdf(abs(z)))
    ci_low = (p_t - p_c) - stats.norm.ppf(1 - alpha / 2) * se
    ci_high = (p_t - p_c) + stats.norm.ppf(1 - alpha / 2) * se
    return {
        "lift": (p_t - p_c) / p_c,
        "p_value": p_value,
        "significant": p_value < alpha,
        "ci_95": (ci_low, ci_high),
    }

# --- Experiment checklist ---
# 1. Define ONE primary metric and pre-register secondary metrics.
# 2. Calculate sample size BEFORE starting: calculate_sample_size(0.10, 0.05)
# 3. Randomise at the user (not session) level to avoid leakage.
# 4. Run for at least 1 full business cycle (typically 2 weeks).
# 5. Check for sample ratio mismatch: abs(n_control - n_treatment) / expected < 0.01
# 6. Analyze with analyze_experiment() and report lift + CI, not just p-value.
# 7. Apply Bonferroni correction if testing multiple metrics: alpha / n_metrics
```

### 2. Build a Feature Engineering Pipeline

```python
import pandas as pd
import numpy as np
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.impute import SimpleImputer
from sklearn.compose import ColumnTransformer

def build_feature_pipeline(numeric_cols, categorical_cols, date_cols=None):
    """
    Returns a fitted-ready ColumnTransformer for structured tabular data.
    """
    numeric_pipeline = Pipeline([
        ("impute", SimpleImputer(strategy="median")),
        ("scale",  StandardScaler()),
    ])
    categorical_pipeline = Pipeline([
        ("impute", SimpleImputer(strategy="most_frequent")),
        ("encode", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
    ])
    transformers = [
        ("num", numeric_pipeline, numeric_cols),
        ("cat", categorical_pipeline, categorical_cols),
    ]
    return ColumnTransformer(transformers, remainder="drop")

def add_time_features(df, date_col):
    """Extract cyclical and lag features from a datetime column."""
    df = df.copy()
    df[date_col] = pd.to_datetime(df[date_col])
    df["dow_sin"] = np.sin(2 * np.pi * df[date_col].dt.dayofweek / 7)
    df["dow_cos"] = np.cos(2 * np.pi * df[date_col].dt.dayofweek / 7)
    df["month_sin"] = np.sin(2 * np.pi * df[date_col].dt.month / 12)
    df["month_cos"] = np.cos(2 * np.pi * df[date_col].dt.month / 12)
    df["is_weekend"] = (df[date_col].dt.dayofweek >= 5).astype(int)
    return df

# --- Feature engineering checklist ---
# 1. Never fit transformers on the full dataset — fit on train, transform test.
# 2. Log-transform right-skewed numeric features before scaling.
# 3. For high-cardinality categoricals (>50 levels), use target encoding or embeddings.
# 4. Generate lag/rolling features BEFORE the train/test split to avoid leakage.
# 5. Document each feature's business meaning alongside its code.
```

### 3. Train, Evaluate, and Select a Prediction Model

```python
from sklearn.model_selection import StratifiedKFold, cross_validate
from sklearn.metrics import make_scorer, roc_auc_score, average_precision_score
import xgboost as xgb
import mlflow

SCORERS = {
    "roc_auc":  make_scorer(roc_auc_score, needs_proba=True),
    "avg_prec": make_scorer(average_precision_score, needs_proba=True),
}

def evaluate_model(model, X, y, cv=5):
    """
    Cross-validate and return mean ± std for each scorer.
    Use StratifiedKFold for classification to preserve class balance.
    """
    cv_results = cross_validate(
        model, X, y,
        cv=StratifiedKFold(n_splits=cv, shuffle=True, random_state=42),
        scoring=SCORERS,
        return_train_score=True,
    )
    summary = {}
    for metric in SCORERS:
        test_scores = cv_results[f"test_{metric}"]
        summary[metric] = {"mean": test_scores.mean(), "std": test_scores.std()}
        # Flag overfitting: large gap between train and test score
        train_mean = cv_results[f"train_{metric}"].mean()
        summary[metric]["overfit_gap"] = train_mean - test_scores.mean()
    return summary

def train_and_log(model, X_train, y_train, X_test, y_test, run_name):
    """Train model and log all artefacts to MLflow."""
    with mlflow.start_run(run_name=run_name):
        model.fit(X_train, y_train)
        proba = model.predict_proba(X_test)[:, 1]
        metrics = {
            "roc_auc":  roc_auc_score(y_test, proba),
            "avg_prec": average_precision_score(y_test, proba),
        }
        mlflow.log_params(model.get_params())
        mlflow.log_metrics(metrics)
        mlflow.sklearn.log_model(model, "model")
        return metrics

# --- Model evaluation checklist ---
# 1. Always report AUC-PR alongside AUC-ROC for imbalanced datasets.
# 2. Check overfit_gap > 0.05 as a warning sign of overfitting.
# 3. Calibrate probabilities (Platt scaling / isotonic) before production use.
# 4. Compute SHAP values to validate feature importance makes business sense.
# 5. Run a baseline (e.g. DummyClassifier) and verify the model beats it.
# 6. Log every run to MLflow — never rely on notebook output for comparison.
```

### 4. Causal Inference: Difference-in-Differences

```python
import statsmodels.formula.api as smf

def diff_in_diff(df, outcome, treatment_col, post_col, controls=None):
    """
    Estimate ATT via OLS DiD with optional covariates.
    df must have: outcome, treatment_col (0/1), post_col (0/1).
    Returns the interaction coefficient (treatment × post) and its p-value.
    """
    covariates = " + ".join(controls) if controls else ""
    formula = (
        f"{outcome} ~ {treatment_col} * {post_col}"
        + (f" + {covariates}" if covariates else "")
    )
    result = smf.ols(formula, data=df).fit(cov_type="HC3")
    interaction = f"{treatment_col}:{post_col}"
    return {
        "att":     result.params[interaction],
        "p_value": result.pvalues[interaction],
        "ci_95":   result.conf_int().loc[interaction].tolist(),
        "summary": result.summary(),
    }

# --- Causal inference checklist ---
# 1. Validate parallel trends in pre-period before trusting DiD estimates.
# 2. Use HC3 robust standard errors to handle heteroskedasticity.
# 3. For panel data, cluster SEs at the unit level (add groups= param to fit).
# 4. Consider propensity score matching if groups differ at baseline.
# 5. Report the ATT with confidence interval, not just statistical significance.
```

## Reference Documentation

- **Statistical Methods:** `references/statistical_methods_advanced.md`
- **Experiment Design Frameworks:** `references/experiment_design_frameworks.md`
- **Feature Engineering Patterns:** `references/feature_engineering_patterns.md`

## Common Commands

```bash
# Testing & linting
python -m pytest tests/ -v --cov=src/
python -m black src/ && python -m pylint src/

# Bundled pipeline scaffolds (stdlib runners — extend the process() body with project logic)
python3 scripts/experiment_designer.py --input experiment_spec.json --output experiment_design.json
python3 scripts/feature_engineering_pipeline.py --input raw_features.json --output features.json
python3 scripts/model_evaluation_suite.py --input model_predictions.json --output evaluation.json
# Each prints a JSON run report ({status, processed_items, start/end_time}); any status other
# than "completed" means the stage failed — fix before moving to the next pipeline stage.
```
