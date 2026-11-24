"""Load the match table from the database in the shape build_features expects."""

from datetime import UTC, datetime

import numpy as np
import pandas as pd
from sqlalchemy import Engine, text

_MATCHES_SQL = text("""
SELECT m.id AS match_id, m.kickoff_date, m.kickoff_utc, m.status,
       c.code AS competition, c.type AS competition_type, c.is_target, m.neutral_venue,
       m.round, se.start_year AS season,
       m.home_team_id, m.away_team_id, th.name AS home_team, ta.name AS away_team,
       o.home_goals, o.away_goals, o.ht_home_goals, o.ht_away_goals,
       o.aet_home_goals, o.pen_home,
       sh.shots AS home_shots, sa.shots AS away_shots,
       sh.shots_on_target AS home_sot, sa.shots_on_target AS away_sot,
       sh.corners AS home_corners, sa.corners AS away_corners,
       sh.yellow_cards AS home_yellows, sa.yellow_cards AS away_yellows,
       sh.red_cards AS home_reds, sa.red_cards AS away_reds,
       sh.fouls AS home_fouls, sa.fouls AS away_fouls
FROM matches m
JOIN competitions c ON c.id = m.competition_id
JOIN seasons se ON se.id = m.season_id
JOIN teams th ON th.id = m.home_team_id
JOIN teams ta ON ta.id = m.away_team_id
LEFT JOIN match_outcomes o ON o.match_id = m.id
LEFT JOIN team_match_statistics sh ON sh.match_id = m.id AND sh.team_id = m.home_team_id
LEFT JOIN team_match_statistics sa ON sa.match_id = m.id AND sa.team_id = m.away_team_id
WHERE m.status IN ('scheduled', 'finished')
  -- National teams have their own model (D82): they never enter the club features or training.
  AND c.type <> 'national'
""")

_ODDS_SQL = text("""
SELECT match_id, bookmaker, selection, price, snapshot_label, captured_at
FROM odds_snapshots
WHERE market = '1X2' AND bookmaker IN ('market_avg', 'b365')
  AND (snapshot_label = 'pre_closing' OR snapshot_label LIKE 'fixtures@%')
""")


def _pick_odds(odds: pd.DataFrame, as_of: datetime) -> pd.DataFrame:
    """One H/D/A price triple per match, known at `as_of`.

    Preference: latest fixtures@ snapshot captured before as_of, then the
    historical pre-closing market average, then Bet365 pre-closing.
    """
    if odds.empty:
        return pd.DataFrame(columns=["match_id", "odds_h", "odds_d", "odds_a"])
    odds = odds.copy()
    captured = pd.to_datetime(odds["captured_at"], utc=True)
    odds = odds[captured.isna() | (captured <= pd.Timestamp(as_of))]
    odds["rank"] = np.where(odds["snapshot_label"].str.startswith("fixtures@"), 0,
                            np.where(odds["bookmaker"] == "market_avg", 1, 2))
    odds["ts"] = pd.to_datetime(odds["captured_at"], utc=True)
    odds = odds.sort_values(["match_id", "rank", "ts"], ascending=[True, True, False])
    best = odds.groupby("match_id")[["rank", "bookmaker", "snapshot_label"]].first().reset_index()
    chosen = odds.merge(best, on=["match_id", "rank", "bookmaker", "snapshot_label"])
    wide = chosen.pivot_table(index="match_id", columns="selection", values="price",
                              aggfunc="first")
    wide = wide.rename(columns={"H": "odds_h", "D": "odds_d", "A": "odds_a"}).reset_index()
    for col in ("odds_h", "odds_d", "odds_a"):
        if col not in wide:
            wide[col] = np.nan
    return wide[["match_id", "odds_h", "odds_d", "odds_a"]]


def load_matches(engine: Engine, as_of: datetime | None = None) -> pd.DataFrame:
    as_of = as_of or datetime.now(UTC)
    with engine.connect() as conn:
        matches = pd.read_sql(_MATCHES_SQL, conn)
        odds = pd.read_sql(_ODDS_SQL, conn)
    df = matches.merge(_pick_odds(odds, as_of), on="match_id", how="left")
    numeric = ["home_goals", "away_goals", "ht_home_goals", "ht_away_goals", "aet_home_goals",
               "pen_home", "home_shots", "away_shots", "home_sot", "away_sot", "home_corners",
               "away_corners", "home_yellows", "away_yellows", "home_reds", "away_reds",
               "home_fouls", "away_fouls", "odds_h", "odds_d", "odds_a"]
    for col in numeric:
        df[col] = pd.to_numeric(df[col], errors="coerce").astype(float)
    return df
