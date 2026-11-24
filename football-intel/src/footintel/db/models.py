"""Relational schema.

Provenance rule: every row that comes from an external source carries `source_id`
and `collected_at`. Rows that describe a fact at a point in time also carry
`known_at` (when the information was available) and, if relevant,
`valid_from` / `valid_to`.
"""

from datetime import date, datetime

from sqlalchemy import (
    JSON,
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


def _now_col() -> Mapped[datetime]:
    return mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


# --- Sources and runs ---------------------------------------------------------


class DataSource(Base):
    __tablename__ = "data_sources"

    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(50), unique=True)
    name: Mapped[str] = mapped_column(String(200))
    kind: Mapped[str] = mapped_column(String(30))  # csv | api | news
    base_url: Mapped[str | None] = mapped_column(String(500))
    terms_url: Mapped[str | None] = mapped_column(String(500))
    terms_note: Mapped[str | None] = mapped_column(Text)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = _now_col()


class CollectionRun(Base):
    __tablename__ = "collection_runs"

    id: Mapped[int] = mapped_column(primary_key=True)
    job_name: Mapped[str] = mapped_column(String(100), index=True)
    source_id: Mapped[int | None] = mapped_column(ForeignKey("data_sources.id"))
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    status: Mapped[str] = mapped_column(String(20))  # running | success | partial | failed | skipped
    params: Mapped[dict | None] = mapped_column(JSON)
    rows_inserted: Mapped[int] = mapped_column(Integer, default=0)
    rows_updated: Mapped[int] = mapped_column(Integer, default=0)
    rows_skipped: Mapped[int] = mapped_column(Integer, default=0)
    error: Mapped[str | None] = mapped_column(Text)


class DataQualityIssue(Base):
    __tablename__ = "data_quality_issues"

    id: Mapped[int] = mapped_column(primary_key=True)
    collection_run_id: Mapped[int | None] = mapped_column(ForeignKey("collection_runs.id"))
    match_id: Mapped[int | None] = mapped_column(ForeignKey("matches.id"), index=True)
    severity: Mapped[str] = mapped_column(String(10))  # info | warning | error
    code: Mapped[str] = mapped_column(String(60), index=True)
    message: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = _now_col()
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class ScheduledJob(Base):
    __tablename__ = "scheduled_jobs"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True)
    cron: Mapped[str | None] = mapped_column(String(100))
    timezone: Mapped[str] = mapped_column(String(50), default="Africa/Lubumbashi")
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    last_started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_status: Mapped[str | None] = mapped_column(String(20))
    # Lock that stops two instances of the same job from running at once.
    lock_owner: Mapped[str | None] = mapped_column(String(200))
    lock_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


# --- Reference data -----------------------------------------------------------


class Competition(Base):
    __tablename__ = "competitions"

    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(30), unique=True)  # e.g. ENG-PL
    name: Mapped[str] = mapped_column(String(200))
    country: Mapped[str | None] = mapped_column(String(100))
    type: Mapped[str] = mapped_column(String(20))  # league | cup | continental
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    # False for leagues imported only to rate foreign clubs (e.g. Portugal for Benfica).
    is_target: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")


class CompetitionSourceCode(Base):
    __tablename__ = "competition_source_codes"
    __table_args__ = (UniqueConstraint("source_id", "external_code"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    competition_id: Mapped[int] = mapped_column(ForeignKey("competitions.id"))
    source_id: Mapped[int] = mapped_column(ForeignKey("data_sources.id"))
    external_code: Mapped[str] = mapped_column(String(50))


class Season(Base):
    __tablename__ = "seasons"
    __table_args__ = (UniqueConstraint("competition_id", "label"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    competition_id: Mapped[int] = mapped_column(ForeignKey("competitions.id"))
    label: Mapped[str] = mapped_column(String(20))  # e.g. 2024-2025
    start_year: Mapped[int] = mapped_column(Integer)


class Team(Base):
    __tablename__ = "teams"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(200), unique=True)
    country: Mapped[str | None] = mapped_column(String(100))


class TeamAlias(Base):
    """Maps a source-specific team name to one canonical team."""

    __tablename__ = "team_aliases"
    __table_args__ = (UniqueConstraint("source_id", "alias"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    team_id: Mapped[int] = mapped_column(ForeignKey("teams.id"), index=True)
    source_id: Mapped[int] = mapped_column(ForeignKey("data_sources.id"))
    alias: Mapped[str] = mapped_column(String(200))


class Player(Base):
    __tablename__ = "players"
    __table_args__ = (UniqueConstraint("source_id", "external_id"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    source_id: Mapped[int] = mapped_column(ForeignKey("data_sources.id"))
    external_id: Mapped[str] = mapped_column(String(100))
    # Only the data needed for football analysis. No contact or private data.
    name: Mapped[str] = mapped_column(String(200))
    position: Mapped[str | None] = mapped_column(String(30))
    collected_at: Mapped[datetime] = _now_col()


# --- Matches ------------------------------------------------------------------


class Match(Base):
    __tablename__ = "matches"
    __table_args__ = (
        CheckConstraint("home_team_id <> away_team_id", name="ck_matches_distinct_teams"),
        Index("ix_matches_kickoff_date", "kickoff_date"),
        Index("ix_matches_season", "season_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    competition_id: Mapped[int] = mapped_column(ForeignKey("competitions.id"))
    season_id: Mapped[int] = mapped_column(ForeignKey("seasons.id"))
    home_team_id: Mapped[int] = mapped_column(ForeignKey("teams.id"))
    away_team_id: Mapped[int] = mapped_column(ForeignKey("teams.id"))
    kickoff_date: Mapped[date] = mapped_column(Date)
    # Null when the source gives no kick-off time (football-data.co.uk before 2019-20).
    kickoff_utc: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    status: Mapped[str] = mapped_column(String(20), default="scheduled")
    round: Mapped[str | None] = mapped_column(String(100))
    neutral_venue: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = _now_col()
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    home_team: Mapped[Team] = relationship(foreign_keys=[home_team_id])
    away_team: Mapped[Team] = relationship(foreign_keys=[away_team_id])
    competition: Mapped[Competition] = relationship()
    season: Mapped[Season] = relationship()


class TeamMatchTactics(Base):
    """Formation and organisation of one team in one match, from a named source.

    Stays empty until a source that provides formations is connected. A formation
    is a starting shape; it does not describe the shape with or without the ball."""

    __tablename__ = "team_match_tactics"
    __table_args__ = (UniqueConstraint("match_id", "team_id", "source_id", "kind"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    match_id: Mapped[int] = mapped_column(ForeignKey("matches.id"), index=True)
    team_id: Mapped[int] = mapped_column(ForeignKey("teams.id"))
    source_id: Mapped[int] = mapped_column(ForeignKey("data_sources.id"))
    kind: Mapped[str] = mapped_column(String(20))  # predicted | official | in_match_change
    formation: Mapped[str | None] = mapped_column(String(20))
    possession_pct: Mapped[float | None] = mapped_column(Float)
    passes: Mapped[int | None] = mapped_column(Integer)
    passes_accurate: Mapped[int | None] = mapped_column(Integer)
    crosses: Mapped[int | None] = mapped_column(Integer)
    long_balls: Mapped[int | None] = mapped_column(Integer)
    tackles: Mapped[int | None] = mapped_column(Integer)
    interceptions: Mapped[int | None] = mapped_column(Integer)
    ppda: Mapped[float | None] = mapped_column(Float)
    extra: Mapped[dict | None] = mapped_column(JSON)
    known_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    collected_at: Mapped[datetime] = _now_col()


class MatchExternalRef(Base):
    """Identity of a match in one source. This key makes ingestion idempotent."""

    __tablename__ = "match_external_refs"
    __table_args__ = (UniqueConstraint("source_id", "external_id"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    match_id: Mapped[int] = mapped_column(ForeignKey("matches.id"), index=True)
    source_id: Mapped[int] = mapped_column(ForeignKey("data_sources.id"))
    external_id: Mapped[str] = mapped_column(String(200))


class MatchOutcome(Base):
    __tablename__ = "match_outcomes"

    id: Mapped[int] = mapped_column(primary_key=True)
    match_id: Mapped[int] = mapped_column(ForeignKey("matches.id"), unique=True)
    source_id: Mapped[int] = mapped_column(ForeignKey("data_sources.id"))
    home_goals: Mapped[int] = mapped_column(Integer)
    away_goals: Mapped[int] = mapped_column(Integer)
    ht_home_goals: Mapped[int | None] = mapped_column(Integer)
    ht_away_goals: Mapped[int | None] = mapped_column(Integer)
    result: Mapped[str] = mapped_column(String(1))  # H | D | A (after 90 minutes)
    # Cup matches: score after extra time and penalty shoot-out, when played.
    aet_home_goals: Mapped[int | None] = mapped_column(Integer)
    aet_away_goals: Mapped[int | None] = mapped_column(Integer)
    pen_home: Mapped[int | None] = mapped_column(Integer)
    pen_away: Mapped[int | None] = mapped_column(Integer)
    is_final: Mapped[bool] = mapped_column(Boolean, default=True)
    collected_at: Mapped[datetime] = _now_col()
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class MatchEvent(Base):
    __tablename__ = "match_events"
    __table_args__ = (UniqueConstraint("match_id", "source_id", "external_key"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    match_id: Mapped[int] = mapped_column(ForeignKey("matches.id"), index=True)
    source_id: Mapped[int] = mapped_column(ForeignKey("data_sources.id"))
    external_key: Mapped[str] = mapped_column(String(200))
    minute: Mapped[int | None] = mapped_column(Integer)
    extra_minute: Mapped[int | None] = mapped_column(Integer)
    team_id: Mapped[int | None] = mapped_column(ForeignKey("teams.id"))
    player_id: Mapped[int | None] = mapped_column(ForeignKey("players.id"))
    type: Mapped[str] = mapped_column(String(50))
    detail: Mapped[str | None] = mapped_column(String(200))
    collected_at: Mapped[datetime] = _now_col()


class TeamMatchStatistics(Base):
    __tablename__ = "team_match_statistics"
    __table_args__ = (UniqueConstraint("match_id", "team_id", "source_id"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    match_id: Mapped[int] = mapped_column(ForeignKey("matches.id"), index=True)
    team_id: Mapped[int] = mapped_column(ForeignKey("teams.id"))
    source_id: Mapped[int] = mapped_column(ForeignKey("data_sources.id"))
    is_home: Mapped[bool] = mapped_column(Boolean)
    shots: Mapped[int | None] = mapped_column(Integer)
    shots_on_target: Mapped[int | None] = mapped_column(Integer)
    corners: Mapped[int | None] = mapped_column(Integer)
    fouls: Mapped[int | None] = mapped_column(Integer)
    yellow_cards: Mapped[int | None] = mapped_column(Integer)
    red_cards: Mapped[int | None] = mapped_column(Integer)
    xg: Mapped[float | None] = mapped_column(Float)  # null when the source has no xG
    collected_at: Mapped[datetime] = _now_col()


class PlayerMatchStatistics(Base):
    __tablename__ = "player_match_statistics"
    __table_args__ = (UniqueConstraint("match_id", "player_id", "source_id"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    match_id: Mapped[int] = mapped_column(ForeignKey("matches.id"), index=True)
    player_id: Mapped[int] = mapped_column(ForeignKey("players.id"))
    team_id: Mapped[int] = mapped_column(ForeignKey("teams.id"))
    source_id: Mapped[int] = mapped_column(ForeignKey("data_sources.id"))
    minutes: Mapped[int | None] = mapped_column(Integer)
    goals: Mapped[int | None] = mapped_column(Integer)
    assists: Mapped[int | None] = mapped_column(Integer)
    shots: Mapped[int | None] = mapped_column(Integer)
    rating: Mapped[float | None] = mapped_column(Float)
    stats: Mapped[dict | None] = mapped_column(JSON)
    collected_at: Mapped[datetime] = _now_col()


class Lineup(Base):
    __tablename__ = "lineups"
    __table_args__ = (UniqueConstraint("match_id", "team_id", "player_id", "source_id"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    match_id: Mapped[int] = mapped_column(ForeignKey("matches.id"), index=True)
    team_id: Mapped[int] = mapped_column(ForeignKey("teams.id"))
    player_id: Mapped[int] = mapped_column(ForeignKey("players.id"))
    source_id: Mapped[int] = mapped_column(ForeignKey("data_sources.id"))
    is_starter: Mapped[bool] = mapped_column(Boolean)
    position: Mapped[str | None] = mapped_column(String(30))
    confirmed: Mapped[bool] = mapped_column(Boolean, default=False)
    known_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    collected_at: Mapped[datetime] = _now_col()


class _Availability:
    """Shared columns for injuries and suspensions."""

    id: Mapped[int] = mapped_column(primary_key=True)
    source_id: Mapped[int] = mapped_column(ForeignKey("data_sources.id"))
    external_key: Mapped[str] = mapped_column(String(200))
    team_id: Mapped[int] = mapped_column(ForeignKey("teams.id"), index=True)
    player_id: Mapped[int | None] = mapped_column(ForeignKey("players.id"))
    match_id: Mapped[int | None] = mapped_column(ForeignKey("matches.id"))
    reason: Mapped[str | None] = mapped_column(String(200))
    known_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    valid_from: Mapped[date | None] = mapped_column(Date)
    valid_to: Mapped[date | None] = mapped_column(Date)
    collected_at: Mapped[datetime] = _now_col()


class Injury(_Availability, Base):
    __tablename__ = "injuries"
    __table_args__ = (UniqueConstraint("source_id", "external_key"),)


class Suspension(_Availability, Base):
    __tablename__ = "suspensions"
    __table_args__ = (UniqueConstraint("source_id", "external_key"),)


class OddsSnapshot(Base):
    __tablename__ = "odds_snapshots"
    __table_args__ = (
        UniqueConstraint(
            "match_id", "source_id", "bookmaker", "market", "selection", "snapshot_label"
        ),
        CheckConstraint("price > 1.0", name="ck_odds_price_gt_one"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    match_id: Mapped[int] = mapped_column(ForeignKey("matches.id"), index=True)
    source_id: Mapped[int] = mapped_column(ForeignKey("data_sources.id"))
    bookmaker: Mapped[str] = mapped_column(String(50))  # e.g. market_avg, b365, pinnacle
    market: Mapped[str] = mapped_column(String(20))  # 1X2 | OU2.5
    selection: Mapped[str] = mapped_column(String(10))  # H D A | over under
    price: Mapped[float] = mapped_column(Float)
    # pre_closing | closing | live label. football-data.co.uk gives no exact capture time.
    snapshot_label: Mapped[str] = mapped_column(String(40))
    captured_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    collected_at: Mapped[datetime] = _now_col()


class NewsItem(Base):
    __tablename__ = "news_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    source_id: Mapped[int] = mapped_column(ForeignKey("data_sources.id"))
    url: Mapped[str] = mapped_column(String(1000), unique=True)
    title: Mapped[str] = mapped_column(String(500))
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    collected_at: Mapped[datetime] = _now_col()
    team_id: Mapped[int | None] = mapped_column(ForeignKey("teams.id"))
    competition_id: Mapped[int | None] = mapped_column(ForeignKey("competitions.id"))
    # A headline is never a verified fact by default.
    verification_status: Mapped[str] = mapped_column(String(20), default="unverified")


# --- Models, predictions, evaluation -----------------------------------------


class TrainingRun(Base):
    __tablename__ = "training_runs"

    id: Mapped[int] = mapped_column(primary_key=True)
    kind: Mapped[str] = mapped_column(String(20))  # backtest | fit
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    status: Mapped[str] = mapped_column(String(20))
    config: Mapped[dict | None] = mapped_column(JSON)
    data_until: Mapped[date | None] = mapped_column(Date)
    n_matches: Mapped[int | None] = mapped_column(Integer)
    error: Mapped[str | None] = mapped_column(Text)


class ModelVersion(Base):
    __tablename__ = "model_versions"
    __table_args__ = (UniqueConstraint("name", "version"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), index=True)
    version: Mapped[int] = mapped_column(Integer)
    family: Mapped[str] = mapped_column(String(50))
    # candidate | active | retired | rejected. One active version per name at most.
    status: Mapped[str] = mapped_column(String(20), default="candidate")
    params: Mapped[dict | None] = mapped_column(JSON)
    features: Mapped[list | None] = mapped_column(JSON)
    artifact_path: Mapped[str] = mapped_column(String(500))
    artifact_sha256: Mapped[str] = mapped_column(String(64))
    trained_until: Mapped[date | None] = mapped_column(Date)
    n_train: Mapped[int | None] = mapped_column(Integer)
    training_run_id: Mapped[int | None] = mapped_column(ForeignKey("training_runs.id"))
    created_at: Mapped[datetime] = _now_col()
    promoted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    retired_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    decision_note: Mapped[str | None] = mapped_column(Text)


class ModelMetric(Base):
    __tablename__ = "model_metrics"
    __table_args__ = (Index("ix_model_metrics_lookup", "model_name", "scope", "segment", "metric"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    training_run_id: Mapped[int | None] = mapped_column(ForeignKey("training_runs.id"))
    model_version_id: Mapped[int | None] = mapped_column(ForeignKey("model_versions.id"))
    model_name: Mapped[str] = mapped_column(String(100))
    scope: Mapped[str] = mapped_column(String(20))  # backtest | live
    segment: Mapped[str] = mapped_column(String(100))  # all | competition:ENG-PL | season:2024-2025
    metric: Mapped[str] = mapped_column(String(50))
    value: Mapped[float] = mapped_column(Float)
    n: Mapped[int] = mapped_column(Integer)
    ci_low: Mapped[float | None] = mapped_column(Float)
    ci_high: Mapped[float | None] = mapped_column(Float)
    computed_at: Mapped[datetime] = _now_col()


class Prediction(Base):
    __tablename__ = "predictions"
    __table_args__ = (
        UniqueConstraint("match_id", "model_version_id", "predicted_at"),
        Index("ix_predictions_match", "match_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    match_id: Mapped[int] = mapped_column(ForeignKey("matches.id"))
    model_version_id: Mapped[int] = mapped_column(ForeignKey("model_versions.id"))
    predicted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    p_home: Mapped[float] = mapped_column(Float)
    p_draw: Mapped[float] = mapped_column(Float)
    p_away: Mapped[float] = mapped_column(Float)
    p_over_1_5: Mapped[float | None] = mapped_column(Float)
    p_over_2_5: Mapped[float | None] = mapped_column(Float)
    p_over_3_5: Mapped[float | None] = mapped_column(Float)
    p_btts: Mapped[float | None] = mapped_column(Float)
    exp_home_goals: Mapped[float | None] = mapped_column(Float)
    exp_away_goals: Mapped[float | None] = mapped_column(Float)
    # Exact feature values the model used, frozen at prediction time.
    feature_snapshot: Mapped[dict] = mapped_column(JSON)
    data_quality: Mapped[dict] = mapped_column(JSON)
    sufficient_data: Mapped[bool] = mapped_column(Boolean)

    model_version: Mapped[ModelVersion] = relationship()
    match: Mapped[Match] = relationship()


class UserPrediction(Base):
    __tablename__ = "user_predictions"
    __table_args__ = (
        CheckConstraint("pick IN ('H','D','A')", name="ck_user_pick"),
        CheckConstraint("confidence BETWEEN 1 AND 5", name="ck_user_confidence"),
        Index("ix_user_predictions_match", "match_id", "user_label"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    match_id: Mapped[int] = mapped_column(ForeignKey("matches.id"))
    user_label: Mapped[str] = mapped_column(String(50), default="me")
    pick: Mapped[str] = mapped_column(String(1))
    confidence: Mapped[int] = mapped_column(Integer)
    home_goals: Mapped[int | None] = mapped_column(Integer)
    away_goals: Mapped[int | None] = mapped_column(Integer)
    over_2_5: Mapped[bool | None] = mapped_column(Boolean)
    btts: Mapped[bool | None] = mapped_column(Boolean)
    reasoning: Mapped[str | None] = mapped_column(Text)
    # Rows are insert-only. The latest row submitted before kick-off counts.
    submitted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

    match: Mapped[Match] = relationship()


class PredictionEvaluation(Base):
    __tablename__ = "prediction_evaluations"
    __table_args__ = (
        UniqueConstraint("predictor_kind", "predictor_ref", "market"),
        Index("ix_prediction_evaluations_match", "match_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    match_id: Mapped[int] = mapped_column(ForeignKey("matches.id"))
    predictor_kind: Mapped[str] = mapped_column(String(20))  # model | user | market | hybrid
    # predictions.id for models, user_predictions.id for users.
    predictor_ref: Mapped[int] = mapped_column(Integer)
    model_name: Mapped[str | None] = mapped_column(String(100))
    market: Mapped[str] = mapped_column(String(20))  # 1X2 | OU2.5 | BTTS
    probability_of_outcome: Mapped[float | None] = mapped_column(Float)
    log_loss: Mapped[float | None] = mapped_column(Float)
    brier: Mapped[float | None] = mapped_column(Float)
    correct: Mapped[bool | None] = mapped_column(Boolean)
    evaluated_at: Mapped[datetime] = _now_col()


class CompetitionProfileMetric(Base):
    """One indicator of one competition, season and segment, for one analysis run.

    Insert-only: every run adds rows with its own `training_run_id`, so the values
    known at any past date can be read back unchanged."""

    __tablename__ = "competition_profile_metrics"
    __table_args__ = (
        UniqueConstraint("training_run_id", "competition_id", "season", "segment", "metric"),
        Index("ix_profile_lookup", "competition_id", "metric", "segment"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    training_run_id: Mapped[int] = mapped_column(ForeignKey("training_runs.id"))
    competition_id: Mapped[int] = mapped_column(ForeignKey("competitions.id"))
    season: Mapped[int | None] = mapped_column(Integer)  # null = all seasons
    segment: Mapped[str] = mapped_column(String(80))  # all | phase:late | stage:R16 | leg:2 ...
    metric: Mapped[str] = mapped_column(String(60))
    value: Mapped[float] = mapped_column(Float)
    n: Mapped[int] = mapped_column(Integer)
    ci_low: Mapped[float | None] = mapped_column(Float)
    ci_high: Mapped[float | None] = mapped_column(Float)
    # Value expected by a reference model that ignores the competition (residual analysis).
    expected: Mapped[float | None] = mapped_column(Float)
    data_until: Mapped[date | None] = mapped_column(Date)
    computed_at: Mapped[datetime] = _now_col()


class Trend(Base):
    """One trend measured in one analysis run. Insert-only: a run never edits an older row,
    so the trends known on any past date can be listed exactly."""

    __tablename__ = "trends"
    __table_args__ = (
        UniqueConstraint("training_run_id", "trend_key", "window"),
        Index("ix_trends_lookup", "category", "population_type", "population", "metric"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    training_run_id: Mapped[int] = mapped_column(ForeignKey("training_runs.id"), index=True)
    trend_key: Mapped[str] = mapped_column(String(250))  # stable identifier across runs
    category: Mapped[str] = mapped_column(String(30))  # score | team | competition | tactical
    population_type: Mapped[str] = mapped_column(String(20))  # competition | team
    population: Mapped[str] = mapped_column(String(200))
    competition: Mapped[str | None] = mapped_column(String(30))
    metric: Mapped[str] = mapped_column(String(60))
    definition: Mapped[str] = mapped_column(Text)
    window: Mapped[str] = mapped_column(String(10))  # short | medium | long
    period_start: Mapped[date | None] = mapped_column(Date)
    period_end: Mapped[date | None] = mapped_column(Date)
    n: Mapped[int] = mapped_column(Integer)
    observed: Mapped[float] = mapped_column(Float)
    # Shrunk toward the reference: what the data supports once sample size is accounted for.
    smoothed: Mapped[float | None] = mapped_column(Float)
    reference: Mapped[float | None] = mapped_column(Float)
    reference_kind: Mapped[str | None] = mapped_column(String(60))
    abs_diff: Mapped[float | None] = mapped_column(Float)
    rel_diff: Mapped[float | None] = mapped_column(Float)
    ci_low: Mapped[float | None] = mapped_column(Float)
    ci_high: Mapped[float | None] = mapped_column(Float)
    p_value: Mapped[float | None] = mapped_column(Float)
    adjusted_p_value: Mapped[float | None] = mapped_column(Float)
    previous_window_value: Mapped[float | None] = mapped_column(Float)
    # emerging | rising | stable | falling | disappeared | unconfirmed | insufficient_data
    status: Mapped[str] = mapped_column(String(20))
    confidence: Mapped[str] = mapped_column(String(10))  # high | medium | low
    limitations: Mapped[str | None] = mapped_column(Text)
    out_of_sample: Mapped[dict | None] = mapped_column(JSON)
    predictive_contribution: Mapped[dict | None] = mapped_column(JSON)
    sources: Mapped[list | None] = mapped_column(JSON)
    coverage: Mapped[float | None] = mapped_column(Float)  # share of matches with the data
    computed_at: Mapped[datetime] = _now_col()


class DetectedPattern(Base):
    __tablename__ = "detected_patterns"

    id: Mapped[int] = mapped_column(primary_key=True)
    key: Mapped[str] = mapped_column(String(200), unique=True)
    description: Mapped[str] = mapped_column(Text)
    method: Mapped[str] = mapped_column(Text)
    segment: Mapped[dict] = mapped_column(JSON)
    n: Mapped[int] = mapped_column(Integer)
    effect: Mapped[float] = mapped_column(Float)
    ci_low: Mapped[float | None] = mapped_column(Float)
    ci_high: Mapped[float | None] = mapped_column(Float)
    p_value: Mapped[float | None] = mapped_column(Float)
    adjusted_p_value: Mapped[float | None] = mapped_column(Float)
    # correlation | hypothesis | robust | validated_out_of_sample | rejected
    status: Mapped[str] = mapped_column(String(30))
    out_of_sample_effect: Mapped[float | None] = mapped_column(Float)
    out_of_sample_n: Mapped[int | None] = mapped_column(Integer)
    detected_at: Mapped[datetime] = _now_col()
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class MatchStory(Base):
    """Why a finished match ended as it did, as far as the data shows: what was known
    before kick-off, the scenarios that applied, and how the score developed.
    Insert-only per analysis run; the latest run holds the most complete data."""

    __tablename__ = "match_stories"
    __table_args__ = (UniqueConstraint("training_run_id", "match_id"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    training_run_id: Mapped[int] = mapped_column(ForeignKey("training_runs.id"), index=True)
    match_id: Mapped[int] = mapped_column(ForeignKey("matches.id"), index=True)
    # Pre-match facts of both sides (form, rest, Elo, market), the in-match statistics
    # and the score development (half time, comeback, lead lost).
    factors: Mapped[dict] = mapped_column(JSON)
    scenarios: Mapped[dict] = mapped_column(JSON)  # {"home": [codes], "away": [codes]}
    flow: Mapped[list] = mapped_column(JSON)  # labels such as "comeback_home"
    expected_prob: Mapped[float | None] = mapped_column(Float)  # market (else model) prob. of the result
    surprise: Mapped[str] = mapped_column(String(20))  # expected | open | surprise | big_surprise
    narrative: Mapped[str] = mapped_column(Text)
    computed_at: Mapped[datetime] = _now_col()


class ScenarioStat(Base):
    """How teams in one pre-match scenario did against the market's expectation.

    `observed` is the mean of points minus market-expected points, minus the same mean
    for all teams in the same price band (equal-price comparison); positive means the
    market underrated teams in that scenario. Insert-only per run."""

    __tablename__ = "scenario_stats"
    __table_args__ = (UniqueConstraint("training_run_id", "scenario", "window"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    training_run_id: Mapped[int] = mapped_column(ForeignKey("training_runs.id"), index=True)
    scenario: Mapped[str] = mapped_column(String(60))
    definition: Mapped[str] = mapped_column(Text)
    window: Mapped[str] = mapped_column(String(20))  # all | before_2016 | from_2016 | last_365d | last_60d
    n: Mapped[int] = mapped_column(Integer)
    points: Mapped[float] = mapped_column(Float)  # mean points won
    expected_points: Mapped[float] = mapped_column(Float)  # mean market-expected points
    observed: Mapped[float] = mapped_column(Float)  # points - expected, at equal price
    ci_low: Mapped[float | None] = mapped_column(Float)
    ci_high: Mapped[float | None] = mapped_column(Float)
    p_value: Mapped[float | None] = mapped_column(Float)
    adjusted_p_value: Mapped[float | None] = mapped_column(Float)
    status: Mapped[str] = mapped_column(String(30))
    computed_at: Mapped[datetime] = _now_col()
