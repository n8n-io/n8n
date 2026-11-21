"""Source-independent records. Every connector returns these; ingestion only reads these."""

from dataclasses import dataclass, field
from datetime import date, datetime


@dataclass
class TeamStatsRecord:
    shots: int | None = None
    shots_on_target: int | None = None
    corners: int | None = None
    fouls: int | None = None
    yellow_cards: int | None = None
    red_cards: int | None = None
    xg: float | None = None


@dataclass
class OutcomeRecord:
    home_goals: int
    away_goals: int
    result: str  # H | D | A
    ht_home_goals: int | None = None
    ht_away_goals: int | None = None
    aet_home_goals: int | None = None
    aet_away_goals: int | None = None
    pen_home: int | None = None
    pen_away: int | None = None
    is_final: bool = True


@dataclass
class OddsRecord:
    bookmaker: str
    market: str
    selection: str
    price: float
    snapshot_label: str
    captured_at: datetime | None = None


@dataclass
class MatchRecord:
    source_code: str
    external_id: str
    competition_code: str
    season_start_year: int
    kickoff_date: date
    kickoff_utc: datetime | None
    home_team: str
    away_team: str
    status: str  # scheduled | finished
    outcome: OutcomeRecord | None = None
    home_stats: TeamStatsRecord | None = None
    away_stats: TeamStatsRecord | None = None
    odds: list[OddsRecord] = field(default_factory=list)
    round: str | None = None
    neutral: bool = False
    # Problems found while parsing: (code, message). Stored as data quality issues.
    issues: list[tuple[str, str]] = field(default_factory=list)


def season_label(start_year: int) -> str:
    return f"{start_year}-{start_year + 1}"


def season_start_for(d: date) -> int:
    """European seasons start in July or August."""
    return d.year if d.month >= 7 else d.year - 1
