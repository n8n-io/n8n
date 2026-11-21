"""D78: does squad rotation add to the market? Uses the Transfermarkt line-ups (CC0).

Run from football-intel/, with the database of a daily cycle:
    curl -LO https://pub-e682421888d945d684bcae8890b0ec20.r2.dev/data/transfermarkt-datasets.duckdb
    .venv/bin/python scripts/rotation_experiment.py transfermarkt-datasets.duckdb

The file is a snapshot up to 6 July 2026 (dcaribou/transfermarkt-datasets, CC0). We only
download it: no page is collected by us.

Variables for each team and match, from the starting line-ups of all its games (league,
cups, Europe):
- rot: starters who did not start the team's previous game (within 30 days);
- core_out: of the 11 players who started most often in the 10 previous games, how many
  do not start.
Both are known about one hour before kick-off. The test compares them with two prices:
pre-closing (taken before the line-ups, football-data.co.uk) and closing (after them).
"""

import sys

import duckdb
import numpy as np
import pandas as pd
from scipy.optimize import minimize
from sqlalchemy import text

sys.path.insert(0, "src")
from footintel.db.session import get_engine

TM_LEAGUES = {"GB1": "ENG-PL", "L1": "GER-BL", "IT1": "ITA-SA", "ES1": "ESP-LL", "FR1": "FRA-L1"}
RIDGE = 50.0
rng = np.random.default_rng(7)


def tm_tables(path: str) -> tuple[pd.DataFrame, pd.DataFrame]:
    c = duckdb.connect(path, read_only=True)
    games = c.sql("""SELECT CAST(game_id AS INTEGER) game_id, competition_id, date,
                            home_club_id, away_club_id, home_club_goals hg, away_club_goals ag
                     FROM games""").df()
    xi = c.sql("""SELECT game_id, club_id, list(player_id) players FROM game_lineups
                  WHERE type = 'starting_lineup' GROUP BY 1, 2""").df()
    return games, xi


def rotation(games: pd.DataFrame, xi: pd.DataFrame) -> pd.DataFrame:
    xi = xi.merge(games[["game_id", "date"]], on="game_id")
    xi = xi[xi.players.apply(len) >= 10].sort_values(["club_id", "date"])
    rows = []
    for club, g in xi.groupby("club_id"):
        sets = [frozenset(p) for p in g.players]
        dates = list(pd.to_datetime(g.date))
        for i, gid in enumerate(g.game_id):
            r = {"club_id": club, "game_id": gid, "rot": np.nan, "core_out": np.nan}
            if i >= 1 and (dates[i] - dates[i - 1]).days <= 30:
                r["rot"] = len(sets[i] - sets[i - 1])
            if i >= 10:
                counts = pd.Series([p for s in sets[i - 10:i] for p in s]).value_counts()
                r["core_out"] = len(set(counts.index[:11]) - sets[i])
            rows.append(r)
    return pd.DataFrame(rows)


def our_matches(engine) -> pd.DataFrame:
    sql = text("""
        SELECT m.id match_id, c.code competition, se.start_year season, m.kickoff_date,
               m.home_team_id, m.away_team_id, o.home_goals, o.away_goals,
               s.snapshot_label label, s.selection, avg(s.price) price
        FROM matches m
        JOIN competitions c ON c.id = m.competition_id
        JOIN seasons se ON se.id = m.season_id
        JOIN match_outcomes o ON o.match_id = m.id
        JOIN odds_snapshots s ON s.match_id = m.id AND s.market = '1X2'
             AND s.bookmaker = 'market_avg' AND s.snapshot_label IN ('pre_closing', 'closing')
        WHERE c.code IN ('ENG-PL','GER-BL','ITA-SA','ESP-LL','FRA-L1')
          AND m.kickoff_date >= '2012-07-01' AND o.home_goals IS NOT NULL
        GROUP BY 1,2,3,4,5,6,7,8,9,10""")
    with engine.connect() as c:
        df = pd.read_sql(sql, c)
    wide = df.pivot_table(index=["match_id", "competition", "season", "kickoff_date",
                                 "home_team_id", "away_team_id", "home_goals", "away_goals"],
                          columns=["label", "selection"], values="price").reset_index()
    wide.columns = ["_".join(x for x in col if x) if isinstance(col, tuple) else col
                    for col in wide.columns]
    for lab in ("pre_closing", "closing"):
        inv = 1 / wide[[f"{lab}_H", f"{lab}_D", f"{lab}_A"]].to_numpy()
        p = inv / inv.sum(axis=1, keepdims=True)
        for k, s in enumerate("hda"):
            wide[f"{lab}_p{s}"] = p[:, k]
    wide["kickoff_date"] = pd.to_datetime(wide.kickoff_date)
    return wide


def link(games: pd.DataFrame, ours: pd.DataFrame) -> pd.DataFrame:
    """Map Transfermarkt games to ours. Clubs are matched by votes on (league, date, score);
    then games by (date within 1 day, both clubs)."""
    tm = games[games.competition_id.isin(TM_LEAGUES)].copy()
    tm["competition"] = tm.competition_id.map(TM_LEAGUES)
    tm["date"] = pd.to_datetime(tm.date)
    cand = tm.merge(ours, left_on=["competition", "date", "hg", "ag"],
                    right_on=["competition", "kickoff_date", "home_goals", "away_goals"])
    votes = pd.concat([cand[["home_club_id", "home_team_id"]].set_axis(["club", "team"], axis=1),
                       cand[["away_club_id", "away_team_id"]].set_axis(["club", "team"], axis=1)])
    vc = votes.value_counts().reset_index(name="n").sort_values("n", ascending=False)
    clubs = vc.drop_duplicates("club").drop_duplicates("team")
    cmap = dict(zip(clubs.club, clubs.team, strict=True))
    tm["home_team_id"] = tm.home_club_id.map(cmap)
    tm["away_team_id"] = tm.away_club_id.map(cmap)
    out = []
    for shift in (0, -1, 1):
        t = tm.assign(kickoff_date=tm.date + pd.Timedelta(days=shift))
        out.append(t.merge(ours, on=["kickoff_date", "home_team_id", "away_team_id"]))
    linked = pd.concat(out).drop_duplicates("match_id")
    agree = (linked.hg == linked.home_goals) & (linked.ag == linked.away_goals)
    print(f"Clubs mapped: {len(cmap)}; games linked: {len(linked)}; same score: {agree.mean():.3%}")
    return linked[agree]


def nll(w, X, logp, y):
    z = logp.copy()
    z[:, 0] += X @ w
    z[:, 2] -= X @ w
    z -= z.max(axis=1, keepdims=True)
    lp = z - np.log(np.exp(z).sum(axis=1, keepdims=True))
    return -lp[np.arange(len(y)), y].mean() + RIDGE * (w @ w) / len(y)


def walk_forward(d: pd.DataFrame, cols: list[str], label: str) -> None:
    gains = []
    for s in range(2015, int(d.season.max()) + 1):
        tr, te = d[d.season < s], d[d.season == s]
        if len(te) < 100 or len(tr) < 1000:
            continue
        mu, sd = tr[cols].mean(), tr[cols].std()
        Xtr, Xte = ((tr[cols] - mu) / sd).to_numpy(), ((te[cols] - mu) / sd).to_numpy()
        ltr = np.log(tr[[f"{label}_ph", f"{label}_pd", f"{label}_pa"]].to_numpy())
        lte = np.log(te[[f"{label}_ph", f"{label}_pd", f"{label}_pa"]].to_numpy())
        w = minimize(nll, np.zeros(len(cols)), args=(Xtr, ltr, tr.y.to_numpy())).x
        base = -lte[np.arange(len(te)), te.y.to_numpy()]
        z = lte.copy()
        z[:, 0] += Xte @ w
        z[:, 2] -= Xte @ w
        z -= np.log(np.exp(z).sum(axis=1, keepdims=True))
        new = -z[np.arange(len(te)), te.y.to_numpy()]
        gains.append(pd.DataFrame({"season": s, "gain": base - new}))
        print(f"  {s}: n={len(te)}  weights={np.round(w, 3)}  gain={1000 * (base - new).mean():+.3f}‰")
    g = pd.concat(gains)
    boot = [1000 * g.gain.sample(frac=1, replace=True, random_state=int(rng.integers(1e9))).mean()
            for _ in range(500)]
    print(f"  Overall {label}: {1000 * g.gain.mean():+.3f}‰ per match "
          f"(CI {np.percentile(boot, 2.5):+.3f} ; {np.percentile(boot, 97.5):+.3f}), "
          f"seasons better than the market: {(g.groupby('season').gain.mean() > 0).sum()}"
          f"/{g.season.nunique()}")


def buckets(d: pd.DataFrame, label: str) -> None:
    """Points above the market's expectation, home side and away side pooled."""
    rows = []
    for side, o in (("home", "away"), ("away", "home")):
        pw = d[f"{label}_p{side[0]}"]
        pts = np.where(d[f"{side}_goals"] > d[f"{o}_goals"], 3,
                       np.where(d.home_goals == d.away_goals, 1, 0))
        rows.append(pd.DataFrame({"rot": d[f"rot_{side}"], "core": d[f"core_out_{side}"],
                                  "diff": pts - (3 * pw + d[f"{label}_pd"])}))
    r = pd.concat(rows).dropna()
    r["band"] = pd.cut(r.rot, [-1, 1, 3, 5, 11], labels=["0-1", "2-3", "4-5", "6+"])
    print(r.groupby("band", observed=True)["diff"].agg(["count", "mean"]).round(3))
    r["cband"] = pd.cut(r.core, [-1, 1, 3, 5, 11], labels=["0-1", "2-3", "4-5", "6+"])
    print(r.groupby("cband", observed=True)["diff"].agg(["count", "mean"]).round(3))


def main(path: str) -> None:
    games, xi = tm_tables(path)
    rot = rotation(games, xi)
    linked = link(games, our_matches(get_engine()))
    for side in ("home", "away"):
        part = rot.rename(columns={"club_id": f"{side}_club_id", "rot": f"rot_{side}",
                                   "core_out": f"core_out_{side}"})
        linked = linked.merge(part, on=["game_id", f"{side}_club_id"], how="left")
    d = linked.dropna(subset=["rot_home", "rot_away", "core_out_home", "core_out_away"]).copy()
    d["y"] = np.select([d.home_goals > d.away_goals, d.home_goals == d.away_goals], [0, 1], 2)
    d["rot_diff"] = d.rot_home - d.rot_away
    d["core_diff"] = d.core_out_home - d.core_out_away
    for label in ("pre_closing", "closing"):
        dl = d.dropna(subset=[f"{label}_ph"])
        print(f"\nLeague matches with both line-ups and {label} prices: {len(dl)} "
              f"({dl.kickoff_date.min():%Y-%m} to {dl.kickoff_date.max():%Y-%m})")
        print(f"\n== Points above the market ({label}) by changes in the XI")
        buckets(dl, label)
        print(f"\n== Season by season, against {label} prices")
        walk_forward(dl, ["rot_diff", "core_diff"], label)


if __name__ == "__main__":
    main(sys.argv[1])
