"""match stories and scenario statistics

Revision ID: 0005
Revises: 0004
Create Date: 2026-10-25 20:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0005"
down_revision: Union[str, Sequence[str], None] = "0004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "match_stories",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("training_run_id", sa.Integer(), nullable=False),
        sa.Column("match_id", sa.Integer(), nullable=False),
        sa.Column("factors", sa.JSON(), nullable=False),
        sa.Column("scenarios", sa.JSON(), nullable=False),
        sa.Column("flow", sa.JSON(), nullable=False),
        sa.Column("expected_prob", sa.Float(), nullable=True),
        sa.Column("surprise", sa.String(length=20), nullable=False),
        sa.Column("narrative", sa.Text(), nullable=False),
        sa.Column("computed_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["training_run_id"], ["training_runs.id"]),
        sa.ForeignKeyConstraint(["match_id"], ["matches.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("training_run_id", "match_id"),
    )
    op.create_index("ix_match_stories_training_run_id", "match_stories", ["training_run_id"])
    op.create_index("ix_match_stories_match_id", "match_stories", ["match_id"])
    op.create_table(
        "scenario_stats",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("training_run_id", sa.Integer(), nullable=False),
        sa.Column("scenario", sa.String(length=60), nullable=False),
        sa.Column("definition", sa.Text(), nullable=False),
        sa.Column("window", sa.String(length=20), nullable=False),
        sa.Column("n", sa.Integer(), nullable=False),
        sa.Column("points", sa.Float(), nullable=False),
        sa.Column("expected_points", sa.Float(), nullable=False),
        sa.Column("observed", sa.Float(), nullable=False),
        sa.Column("ci_low", sa.Float(), nullable=True),
        sa.Column("ci_high", sa.Float(), nullable=True),
        sa.Column("p_value", sa.Float(), nullable=True),
        sa.Column("adjusted_p_value", sa.Float(), nullable=True),
        sa.Column("status", sa.String(length=30), nullable=False),
        sa.Column("computed_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["training_run_id"], ["training_runs.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("training_run_id", "scenario", "window"),
    )
    op.create_index("ix_scenario_stats_training_run_id", "scenario_stats", ["training_run_id"])


def downgrade() -> None:
    op.drop_index("ix_scenario_stats_training_run_id", table_name="scenario_stats")
    op.drop_table("scenario_stats")
    op.drop_index("ix_match_stories_match_id", table_name="match_stories")
    op.drop_index("ix_match_stories_training_run_id", table_name="match_stories")
    op.drop_table("match_stories")
