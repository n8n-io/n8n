"""Competition profiles, residual effects and trend tests.

Pipeline:
1. Reference predictions: Elo-Poisson trained walk-forward (season S predicted by a
   model fitted on earlier seasons). It knows team strength and home advantage but
   not the competition, so "observed - expected" isolates what the competition adds
   beyond its participants.
2. Profiles: rates and means per competition, season and segment, with intervals.
3. Tests, all corrected together with Benjamini-Hochberg:
   - competition effect (residual) in-sample, then checked on later seasons;
   - recent change: last complete season against the five before;
   - linear trend across seasons.
Status: hypothesis -> robust (adjusted p < 0.05) -> validated_out_of_sample
(robust in-sample AND same sign with a CI that excludes 0 on later seasons).
"""

import logging
from dataclasses import dataclass
from datetime import UTC, datetime

import numpy as np
import pandas as pd
from sqlalchemy import Engine, select

from footintel.analysis import stats as S
from footintel.db.models import CompetitionProfileMetric, Competition, DetectedPattern, TrainingRun
from footintel.db.session import session_scope
from footintel.evaluation.backtest import finished
from footintel.models.base import GOAL_COLS, PROB_COLS
from footintel.models.zoo import build

log = logging.getLogger(__name__)

# Binary events: name -> (observed function, reference probability column or None).
EVENTS = {
    "home_win": (lambda d: d.home_goals > d.away_goals, "p_home"),
    "draw": (lambda d: d.home_goals == d.away_goals, "p_draw"),
    "away_win": (lambda d: d.home_goals < d.away_goals, "p_away"),
    "over_1_5": (lambda d: d.home_goals + d.away_goals > 1.5, "p_over_1_5"),
    "over_2_5": (lambda d: d.home_goals + d.away_goals > 2.5, "p_over_2_5"),
    "over_3_5": (lambda d: d.home_goals + d.away_goals > 3.5, "p_over_3_5"),
    "btts": (lambda d: (d.home_goals > 0) & (d.away_goals > 0), "p_btts"),
    "nil_nil": (lambda d: (d.home_goals == 0) & (d.away_goals == 0), None),
    "home_clean_sheet": (lambda d: d.away_goals == 0, None),
    "away_clean_sheet": (lambda d: d.home_goals == 0, None),
    "favourite_won": (lambda d: d.fav_won, "p_fav"),
}
# Means: name -> function returning a float series (NaN when the source lacks the data).
MEANS = {
    "goals": lambda d: d.home_goals + d.away_goals,
    "home_goal_advantage": lambda d: d.home_goals - d.away_goals,
    "first_half_goal_share": lambda d: (d.ht_home_goals + d.ht_away_goals)
    / (d.home_goals + d.away_goals).where(d.home_goals + d.away_goals > 0),
    "shots": lambda d: d.home_shots + d.away_shots,
    "shots_on_target": lambda d: d.home_sot + d.away_sot,
    "corners": lambda d: d.home_corners + d.away_corners,
    "yellow_cards": lambda d: d.home_yellows + d.away_yellows,
    "red_cards": lambda d: d.home_reds + d.away_reds,
    "fouls": lambda d: d.home_fouls + d.away_fouls,
}
UNAVAILABLE = ["xG / xGA", "penalties", "goals by 15-minute period and late goals",
               "pressing, PPDA, direct play, set-piece share", "formations and styles"]
MIN_N_RATE = 30  # below this, a segment rate is shown but never tested


def reference_predictions(features: pd.DataFrame, first_test_season: int | None = None,
                          min_train: int = 500) -> pd.DataFrame:
    """Out-of-sample Elo-Poisson probabilities for every finished match of every season
    after the second one (the first is warm-up, the second the first training set)."""
    data = finished(features)
    seasons = sorted(data["season"].unique())
    first = int(seasons[0])
    start = first_test_season or first + 2
    out = []
    for season in [s for s in seasons if s >= start]:
        train = data[(data["season"] > first) & (data["season"] < season)]
        test = data[data["season"] == season]
        if len(train) < min_train or test.empty:
            continue
        pred = build("elo_poisson").fit(train).predict(test)
        out.append(pd.concat([test[["match_id"]], pred[PROB_COLS + GOAL_COLS]], axis=1))
    if not out:
        raise ValueError(f"Not enough history for reference predictions (< {min_train} matches)")
    ref = pd.concat(out, ignore_index=True)
    probs = ref[PROB_COLS].to_numpy()
    ref["fav_side"] = probs.argmax(axis=1)  # 0 home, 1 draw, 2 away
    ref["p_fav"] = probs.max(axis=1)
    return ref


def prepare(features: pd.DataFrame, reference: pd.DataFrame) -> pd.DataFrame:
    d = finished(features).merge(reference, on="match_id", how="left")
    result = np.where(d.home_goals > d.away_goals, 0, np.where(d.home_goals == d.away_goals, 1, 2))
    d["fav_won"] = (d["fav_side"] == result).where(d["fav_side"].notna())
    gap = d["elo_diff"].abs()
    d["matchup"] = np.where(gap < 75, "balanced", np.where(gap > 200, "unbalanced", "medium"))
    busy = (d["games_14d_h"] >= 4) | (d["games_14d_a"] >= 4)
    d["schedule"] = np.where(busy, "congested", "normal")
    return d


def _segments(d: pd.DataFrame) -> list[tuple[str, pd.DataFrame]]:
    segs = [("all", d)]
    for col, prefix in (("season_phase", "phase"), ("stage", "stage"), ("matchup", "matchup"),
                        ("schedule", "schedule")):
        for value, part in d.groupby(col):
            if value not in (None, "unknown", "league") or prefix == "phase":
                segs.append((f"{prefix}:{value}", part))
    for leg, part in d[d["leg"].notna()].groupby("leg"):
        segs.append((f"leg:{int(leg)}", part))
    return segs


def profile_rows(d: pd.DataFrame) -> list[dict]:
    """One row per (competition, season or None, segment, metric)."""
    rows = []
    for comp, cd in d.groupby("competition"):
        groups = [(None, cd)] + [(int(s), sd) for s, sd in cd.groupby("season")]
        for season, sd in groups:
            for segment, part in _segments(sd):
                n = len(part)
                if n == 0:
                    continue
                for name, (fn, ref_col) in EVENTS.items():
                    obs = fn(part)
                    valid = obs.notna() if hasattr(obs, "notna") else pd.Series(True, index=part.index)
                    obs = obs[valid].astype(float)
                    if obs.empty:
                        continue
                    lo, hi = S.wilson(obs.sum(), len(obs))
                    exp = None
                    if ref_col and ref_col in part and part.loc[valid.index[valid], ref_col].notna().all():
                        exp = float(part.loc[valid.index[valid], ref_col].mean())
                    rows.append(dict(competition=comp, season=season, segment=segment, metric=name,
                                     value=float(obs.mean()), n=len(obs), ci_low=lo, ci_high=hi,
                                     expected=exp))
                for name, fn in MEANS.items():
                    vals = pd.to_numeric(fn(part), errors="coerce").to_numpy(dtype=float)
                    vals = vals[~np.isnan(vals)]
                    if len(vals) < 2:
                        continue
                    lo, hi = S.mean_ci(vals)
                    rows.append(dict(competition=comp, season=season, segment=segment, metric=name,
                                     value=float(vals.mean()), n=len(vals), ci_low=lo, ci_high=hi,
                                     expected=None))
                    if name == "goals" and segment == "all":
                        var = float(vals.var(ddof=1))
                        rows.append(dict(competition=comp, season=season, segment=segment,
                                         metric="goals_dispersion", value=var / vals.mean(),
                                         n=len(vals), ci_low=None, ci_high=None, expected=None))
                if segment == "all" and season is None:
                    scores = (part.home_goals.astype(int).astype(str) + "-"
                              + part.away_goals.astype(int).astype(str)).value_counts()
                    for score, count in scores.head(10).items():
                        lo, hi = S.wilson(count, n)
                        rows.append(dict(competition=comp, season=None, segment="all",
                                         metric=f"score:{score}", value=count / n, n=n,
                                         ci_low=lo, ci_high=hi, expected=None))
    return rows


@dataclass
class PatternTest:
    key: str
    description: str
    method: str
    segment: dict
    n: int
    effect: float
    ci_low: float
    ci_high: float
    p_value: float
    oos_effect: float | None = None
    oos_n: int | None = None
    oos_ci: tuple[float, float] | None = None


def residual_tests(d: pd.DataFrame, split_season: int) -> list[PatternTest]:
    """Competition effect = observed - reference, estimated before `split_season`,
    then checked on `split_season` and later."""
    tests = []
    for comp, cd in d.groupby("competition"):
        for segment, part in _segments(cd):
            for name, (fn, ref_col) in EVENTS.items():
                if ref_col is None:
                    continue
                sub = part[part[ref_col].notna()]
                if name == "favourite_won":
                    sub = sub[sub["fav_won"].notna()]
                ins, oos = sub[sub.season < split_season], sub[sub.season >= split_season]
                if len(ins) < MIN_N_RATE:
                    continue
                r = S.residual_test(fn(ins).astype(float).to_numpy(), ins[ref_col].to_numpy())
                t = PatternTest(
                    key=f"residual|{comp}|{segment}|{name}",
                    description=f"{comp} [{segment}] {name}: observed minus a competition-blind "
                                f"Elo-Poisson model",
                    method="residual vs walk-forward Elo-Poisson, normal approximation",
                    segment={"competition": comp, "segment": segment, "metric": name},
                    n=r["n"], effect=r["diff"], ci_low=r["ci_low"], ci_high=r["ci_high"],
                    p_value=r["p_value"])
                if len(oos) >= MIN_N_RATE:
                    ro = S.residual_test(fn(oos).astype(float).to_numpy(), oos[ref_col].to_numpy())
                    t.oos_effect, t.oos_n, t.oos_ci = ro["diff"], ro["n"], (ro["ci_low"], ro["ci_high"])
                tests.append(t)
    return tests


def change_tests(d: pd.DataFrame, last_season: int) -> list[PatternTest]:
    """Last complete season against the five previous seasons, and a linear trend."""
    tests = []
    for comp, cd in d[d["segment_all"]].groupby("competition"):
        for name, (fn, _) in EVENTS.items():
            if name == "favourite_won":
                cd2 = cd[cd["fav_won"].notna()]
            else:
                cd2 = cd
            obs = fn(cd2).astype(float)
            recent, before = obs[cd2.season == last_season], obs[cd2.season.between(last_season - 5, last_season - 1)]
            if len(recent) >= MIN_N_RATE and len(before) >= MIN_N_RATE:
                r = S.two_proportion_test(recent.sum(), len(recent), before.sum(), len(before))
                tests.append(PatternTest(
                    key=f"change|{comp}|{name}|{last_season}",
                    description=f"{comp} {name}: season {last_season}-{last_season + 1} against the "
                                f"five previous seasons",
                    method="two-proportion z test", segment={"competition": comp, "metric": name,
                                                             "season": last_season},
                    n=r["n"], effect=r["diff"], ci_low=r["ci_low"], ci_high=r["ci_high"],
                    p_value=r["p_value"]))
            by_season = pd.DataFrame({"s": cd2.season, "y": obs}).groupby("s")["y"].agg(["mean", "size"])
            by_season = by_season[by_season["size"] >= MIN_N_RATE]
            if len(by_season) >= 6:
                r = S.weighted_slope(by_season.index.to_numpy(float), by_season["mean"].to_numpy(),
                                     by_season["size"].to_numpy(float))
                tests.append(PatternTest(
                    key=f"trend|{comp}|{name}",
                    description=f"{comp} {name}: linear change per season "
                                f"({int(by_season.index.min())}-{int(by_season.index.max())})",
                    method="weighted least squares on season rates", segment={"competition": comp,
                                                                               "metric": name},
                    n=r["n"], effect=r["diff"], ci_low=r["ci_low"], ci_high=r["ci_high"],
                    p_value=r["p_value"]))
    return tests


def classify(tests: list[PatternTest]) -> list[tuple[PatternTest, float, str]]:
    adjusted = S.benjamini_hochberg([t.p_value for t in tests])
    out = []
    for t, adj in zip(tests, adjusted, strict=True):
        status = "hypothesis"
        if adj < 0.05:
            status = "robust"
            if t.oos_ci is not None and np.sign(t.oos_effect) == np.sign(t.effect) and (
                    t.oos_ci[0] > 0 or t.oos_ci[1] < 0):
                status = "validated_out_of_sample"
            elif t.oos_ci is not None and (t.oos_ci[0] <= 0 <= t.oos_ci[1]):
                status = "robust_not_confirmed"
        out.append((t, adj, status))
    return out


def run_analysis(engine: Engine, features: pd.DataFrame, split_season: int,
                 last_complete_season: int, min_train: int = 500) -> dict:
    started = datetime.now(UTC)
    with session_scope(engine) as s:
        run = TrainingRun(kind="analysis", started_at=started, status="running",
                          config={"split_season": split_season, "last_season": last_complete_season})
        s.add(run)
        s.flush()
        run_id = run.id
        comp_ids = {c.code: c.id for c in s.scalars(select(Competition))}
    reference = reference_predictions(features, min_train=min_train)
    d = prepare(features, reference)
    d["segment_all"] = True
    rows = profile_rows(d)
    data_until = pd.to_datetime(d["kickoff_date"]).max().date()
    tests = residual_tests(d, split_season) + change_tests(d, last_complete_season)
    classified = classify(tests)
    now = datetime.now(UTC)
    with session_scope(engine) as s:
        s.bulk_save_objects([CompetitionProfileMetric(
            training_run_id=run_id, competition_id=comp_ids[r["competition"]], season=r["season"],
            segment=r["segment"], metric=r["metric"], value=r["value"], n=r["n"],
            ci_low=r["ci_low"], ci_high=r["ci_high"], expected=r["expected"],
            data_until=data_until) for r in rows])
        existing = {p.key: p for p in s.scalars(select(DetectedPattern))}
        for t, adj, status in classified:
            p = existing.get(t.key) or DetectedPattern(key=t.key)
            p.description, p.method, p.segment, p.n = t.description, t.method, t.segment, t.n
            p.effect, p.ci_low, p.ci_high = t.effect, t.ci_low, t.ci_high
            p.p_value, p.adjusted_p_value, p.status = t.p_value, adj, status
            p.out_of_sample_effect, p.out_of_sample_n = t.oos_effect, t.oos_n
            p.updated_at = now
            if t.key not in existing:
                s.add(p)
        r = s.get(TrainingRun, run_id)
        r.status, r.finished_at, r.data_until, r.n_matches = "success", now, data_until, len(d)
    log.info("Analysis run %d: %d profile rows, %d tests", run_id, len(rows), len(tests))
    return {"run_id": run_id, "profiles": pd.DataFrame(rows),
            "tests": pd.DataFrame([{**t.__dict__, "adjusted_p": a, "status": st}
                                   for t, a, st in classified])}
