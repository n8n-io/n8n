"""Trend detection over short, medium and long windows, with persistence testing.

For each population (a competition, a team, a team split) and indicator:
- observed value in the short and medium windows, reference = long window just before;
- smoothed value: shrunk toward the reference with a prior weight (small samples
  stay close to the reference);
- test of window against reference; all p-values of a run corrected together
  (Benjamini-Hochberg);
- status from the two windows and from the previous run;
- out-of-sample persistence: at many past dates, does a deviation measured then
  continue in the next window? (slope of future deviation on current deviation).
"""

import logging
import math
from dataclasses import dataclass
from datetime import UTC, date, datetime

import numpy as np
import pandas as pd
from scipy.stats import norm
from sqlalchemy import Engine, select, text

from footintel.analysis import events as E
from footintel.analysis import stats as S
from footintel.db.models import TrainingRun, Trend
from footintel.db.session import session_scope
from footintel.evaluation.backtest import finished

log = logging.getLogger(__name__)


@dataclass(frozen=True)
class WindowSpec:
    short: int
    medium: int
    long: int
    prior_weight: float
    min_short: int
    min_long: int


COMPETITION_WINDOWS = WindowSpec(short=60, medium=380, long=1900, prior_weight=150,
                                 min_short=30, min_long=200)
TEAM_WINDOWS = WindowSpec(short=6, medium=19, long=76, prior_weight=10, min_short=5, min_long=30)
SPLIT_WINDOWS = WindowSpec(short=0, medium=19, long=76, prior_weight=10, min_short=0, min_long=30)
SOURCES = {"league": ["football-data.co.uk"], "continental": ["openfootball/champions-league"]}


def _test(kind: str, a: np.ndarray, b: np.ndarray) -> float:
    """Small-sample safe tests: Fisher exact for rates below 30 observations, Welch t for
    means (a normal approximation on 6 matches overstated significance)."""
    from scipy.stats import fisher_exact

    if len(a) < 2 or len(b) < 2:
        return float("nan")
    if kind == "rate":
        if min(len(a), len(b)) < 30:
            xa, xb = int(round(a.sum())), int(round(b.sum()))
            return float(fisher_exact([[xa, len(a) - xa], [xb, len(b) - xb]])[1])
        return S.two_proportion_test(a.sum(), len(a), b.sum(), len(b)).get("p_value", float("nan"))
    va, vb = a.var(ddof=1), b.var(ddof=1)
    if len(a) < 30:
        # A short window can show no spread at all (six defeats): its variance is floored
        # at the reference variance so the test does not trust that artificial precision.
        va = max(va, vb)
    se2a, se2b = va / len(a), vb / len(b)
    if se2a + se2b == 0:
        return 1.0 if a.mean() == b.mean() else 0.0
    t_stat = (a.mean() - b.mean()) / math.sqrt(se2a + se2b)
    dof = (se2a + se2b) ** 2 / ((se2a ** 2 / (len(a) - 1)) + (se2b ** 2 / (len(b) - 1) if se2b else 0) or 1)
    from scipy.stats import t as student

    return float(2 * student.sf(abs(t_stat), dof))


def _ci(kind: str, a: np.ndarray) -> tuple[float, float]:
    if kind == "rate":
        return S.wilson(a.sum(), len(a))
    return S.mean_ci(a)


def window_rows(values: pd.Series, dates: pd.Series, ind: E.Indicator, spec: WindowSpec,
                population_type: str, population: str, competition: str | None,
                category: str, coverage: float, value_fn=None) -> list[dict]:
    """Trend rows for one population and indicator. `values` are ordered by date."""
    known = values.notna().to_numpy()
    v, dts = values.to_numpy(dtype=float)[known], dates.to_numpy()[known]
    total = len(v)
    rows = []
    for window, size in (("short", spec.short), ("medium", spec.medium)):
        if size == 0:
            continue
        cur, prev = v[-size:], v[-2 * size:-size]
        ref = v[max(0, total - spec.medium - spec.long):max(0, total - spec.medium)]
        if window == "medium" and len(ref) < spec.min_long:
            ref = v[:-size]
        status = None
        if len(cur) < max(spec.min_short, 1) or len(ref) < spec.min_long:
            status = "insufficient_data"
        obs = float(value_fn(cur) if value_fn else cur.mean()) if len(cur) else float("nan")
        refv = float(value_fn(ref) if value_fn else ref.mean()) if len(ref) else float("nan")
        smoothed = ((len(cur) * obs + spec.prior_weight * refv) / (len(cur) + spec.prior_weight)
                    if len(cur) and not math.isnan(refv) else None)
        lo, hi = _ci(ind.kind, cur) if len(cur) >= 2 else (None, None)
        rows.append(dict(
            trend_key=f"{category}|{population_type}|{population}|{ind.name}",
            category=category, population_type=population_type, population=population,
            competition=competition, metric=ind.name, definition=ind.definition, window=window,
            period_start=pd.Timestamp(dts[-len(cur)]).date() if len(cur) else None,
            period_end=pd.Timestamp(dts[-1]).date() if len(cur) else None,
            n=int(len(cur)), observed=obs, smoothed=smoothed, reference=refv,
            reference_kind=f"long window ({len(ref)} previous observations)",
            abs_diff=obs - refv if not math.isnan(refv) else None,
            rel_diff=(obs - refv) / refv if refv not in (0, None) and not math.isnan(refv) else None,
            ci_low=lo, ci_high=hi,
            p_value=None if status else _test(ind.kind, cur, ref),
            previous_window_value=float(value_fn(prev) if value_fn else prev.mean()) if len(prev) else None,
            status=status, coverage=coverage,
            limitations=E.DEFINITION_WARNINGS.get(ind.name),
            sources=SOURCES.get("continental" if competition and competition.startswith("UEFA") else "league")))
    return rows


def classify(rows: list[dict], previous: dict[str, str]) -> None:
    """Fill adjusted_p_value, status and confidence in place."""
    testable = [r for r in rows if r["status"] is None and r["p_value"] is not None
                and not math.isnan(r["p_value"])]
    for r, adj in zip(testable, S.benjamini_hochberg([r["p_value"] for r in testable]), strict=True):
        r["adjusted_p_value"] = adj
    by_key: dict[str, dict[str, dict]] = {}
    for r in rows:
        by_key.setdefault(r["trend_key"], {})[r["window"]] = r
    for key, wins in by_key.items():
        s, m = wins.get("short"), wins.get("medium")

        def sig(r):
            return r is not None and r.get("adjusted_p_value") is not None and r["adjusted_p_value"] < 0.05

        def sign(r):
            return np.sign(r["abs_diff"]) if r and r.get("abs_diff") is not None else 0

        if m is None or m["status"] == "insufficient_data":
            for r in wins.values():
                r["status"], r["confidence"] = "insufficient_data", "low"
            continue
        if sig(m) and (s is None or sig(s)) and (s is None or sign(s) == sign(m)):
            status = "rising" if sign(m) > 0 else "falling"
            conf = "high" if m["adjusted_p_value"] < 0.01 and (s is None or sig(s)) else "medium"
        elif sig(m) and s is not None and not sig(s):
            reverted = abs(s["abs_diff"] or 0) < 0.5 * abs(m["abs_diff"] or 0)
            status = "disappeared" if reverted else ("rising" if sign(m) > 0 else "falling")
            conf = "medium"
        elif s is not None and sig(s) and not sig(m):
            status, conf = "emerging", "low"
        else:
            status = "stable"
            conf = "high" if m["n"] >= 300 else "medium"
        if status == "stable" and previous.get(key) in ("emerging",):
            status = "unconfirmed"
        for r in wins.values():
            r["status"], r["confidence"] = status, conf


def persistence(values_by_pop: dict[str, tuple[np.ndarray, np.ndarray]], spec: WindowSpec,
                as_of_dates: list[date], min_window: int) -> dict:
    """Out-of-sample check over many past dates: slope of the next window's deviation
    on the current one (0 = pure noise, 1 = fully persistent), and the share of
    nominally significant deviations that kept their sign."""
    cur_dev, fut_dev, sig_same, sig_n = [], [], 0, 0
    for vals, dts in values_by_pop.values():
        for a in as_of_dates:
            i = int(np.searchsorted(dts, np.datetime64(a)))
            cur = vals[max(0, i - spec.medium):i]
            ref = vals[max(0, i - spec.medium - spec.long):max(0, i - spec.medium)]
            fut = vals[i:i + spec.medium]
            if len(cur) < min_window or len(ref) < spec.min_long or len(fut) < min_window:
                continue
            c, f = cur.mean() - ref.mean(), fut.mean() - ref.mean()
            cur_dev.append(c)
            fut_dev.append(f)
            se = math.sqrt((cur.var(ddof=1) if len(cur) > 1 else 0) / len(cur)
                           + (ref.var(ddof=1) if len(ref) > 1 else 0) / len(ref))
            if se > 0 and abs(c / se) > 1.96:
                sig_n += 1
                sig_same += int(np.sign(f) == np.sign(c))
    if len(cur_dev) < 30:
        return {"pairs": len(cur_dev)}
    c, f = np.array(cur_dev), np.array(fut_dev)
    slope = float((c * f).sum() / (c * c).sum()) if (c * c).sum() > 0 else float("nan")
    # Bootstrap interval of the slope.
    rng = np.random.default_rng(0)
    idx = rng.integers(0, len(c), size=(500, len(c)))
    boots = (c[idx] * f[idx]).sum(axis=1) / np.maximum((c[idx] ** 2).sum(axis=1), 1e-12)
    return {"pairs": len(c), "persistence_slope": slope,
            "slope_ci": [float(np.quantile(boots, 0.025)), float(np.quantile(boots, 0.975))],
            "significant_then": sig_n,
            "kept_sign_share": (sig_same / sig_n) if sig_n else None}


def as_of_dates(first_year: int, last_year: int) -> list[date]:
    return [date(y, m, 1) for y in range(first_year, last_year + 1) for m in (1, 8)]


def build_trends(features: pd.DataFrame, today: date | None = None,
                 team_scope_season: int | None = None) -> tuple[list[dict], dict]:
    d = finished(features).sort_values(["kickoff_date", "match_id"]).reset_index(drop=True)
    today = today or pd.to_datetime(d["kickoff_date"]).max().date()
    dates_hist = as_of_dates(2010, today.year - 1)
    rows: list[dict] = []
    oos: dict[str, dict] = {}

    # Competition populations.
    pers_input: dict[str, dict] = {}
    for comp, cd in d.groupby("competition"):
        for ind in E.MATCH_INDICATORS:
            vals = E.evaluate(ind, cd)
            if vals.notna().sum() == 0:
                continue
            sub = cd.loc[vals.index]
            coverage = float(vals.notna().mean())
            rows += window_rows(vals, sub["kickoff_date"], ind, COMPETITION_WINDOWS, "competition",
                                comp, comp, "score" if ind.needs[0].endswith("goals") else
                                "competition", coverage)
            known = vals.notna().to_numpy()
            pers_input.setdefault(ind.name, {})[comp] = (vals.to_numpy(float)[known],
                                                        sub["kickoff_date"].to_numpy()[known].astype("datetime64[D]"))
    for name, pops in pers_input.items():
        oos[f"competition|{name}"] = persistence(pops, COMPETITION_WINDOWS, dates_hist, 100)

    # Team populations: teams that played a target competition in the scoped season.
    t = E.team_long(d)
    scope = team_scope_season or int(d["season"].max())
    target_comps = set(d.loc[d["is_target"].fillna(True).astype(bool), "competition"])
    teams = set(t.loc[(t["season"] == scope) & t["competition"].isin(target_comps), "team_id"])
    team_pers: dict[str, dict] = {}
    for team_id, td in t.groupby("team_id"):
        name = str(td["team"].iloc[0])
        for ind in E.TEAM_INDICATORS:
            if ind.name == "conversion":
                continue  # a ratio of window sums: used as a model feature, not a window trend
            if ind.name == "goal_difference_volatility":
                vals = (td["gf"] - td["ga"]).where(td[["gf", "ga"]].notna().all(axis=1))
            else:
                vals = E.evaluate(ind, td)
            known = vals.notna().to_numpy()
            if known.sum() == 0:
                continue
            if ind.name != "goal_difference_volatility":
                team_pers.setdefault(ind.name, {})[str(team_id)] = (
                    vals.to_numpy(float)[known], td["kickoff_date"].to_numpy()[known].astype("datetime64[D]"))
            if team_id not in teams:
                continue
            value_fn = None
            if ind.name == "goal_difference_volatility":
                def value_fn(arr):
                    return float(np.abs(arr - arr.mean()).mean()) if len(arr) else np.nan
            rows += window_rows(vals, td["kickoff_date"], ind, TEAM_WINDOWS, "team", name,
                                None, "team", float(vals.notna().mean()), value_fn)
            for split, mask in (("home", td["is_home"] & ~td["neutral"]), ("away", ~td["is_home"] & ~td["neutral"]),
                                ("vs_stronger", td["opponent_level"] == "stronger"),
                                ("vs_similar", td["opponent_level"] == "similar"),
                                ("vs_weaker", td["opponent_level"] == "weaker")):
                if ind.name not in ("points", "goals_for", "goals_against", "win", "clean_sheet",
                                    "score_minus_elo_expected"):
                    continue
                sv = vals[mask.to_numpy()]
                rows += window_rows(sv, td.loc[mask, "kickoff_date"], ind, SPLIT_WINDOWS, "team",
                                    f"{name}|{split}", None, "team", float(sv.notna().mean()) if len(sv) else 0.0)
    for name, pops in team_pers.items():
        oos[f"team|{name}"] = persistence(pops, TEAM_WINDOWS, dates_hist, 15)
    for r in rows:
        r["out_of_sample"] = oos.get(f"{r['population_type']}|{r['metric']}")
    return rows, oos


def run_trends(engine: Engine, features: pd.DataFrame, today: date | None = None) -> dict:
    started = datetime.now(UTC)
    with session_scope(engine) as s:
        run = TrainingRun(kind="trends", started_at=started, status="running", config={})
        s.add(run)
        s.flush()
        run_id = run.id
        prev_run = s.execute(text("SELECT max(training_run_id) FROM trends")).scalar()
        previous = {}
        if prev_run:
            previous = dict(s.execute(select(Trend.trend_key, Trend.status)
                                      .where(Trend.training_run_id == prev_run,
                                             Trend.window == "medium")).all())
    rows, oos = build_trends(features, today)
    classify(rows, previous)
    now = datetime.now(UTC)
    with session_scope(engine) as s:
        s.bulk_insert_mappings(Trend, [{**r, "training_run_id": run_id, "computed_at": now,
                                        "status": r["status"] or "stable",
                                        "confidence": r.get("confidence", "low")} for r in rows])
        r = s.get(TrainingRun, run_id)
        r.status, r.finished_at, r.n_matches = "success", now, len(rows)
        r.config = {"persistence": oos, "previous_run": prev_run}
    log.info("Trend run %d: %d rows", run_id, len(rows))
    return {"run_id": run_id, "rows": pd.DataFrame(rows), "persistence": oos}
