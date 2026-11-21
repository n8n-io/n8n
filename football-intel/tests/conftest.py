"""Test setup.

SYNTHETIC DATA ONLY in this folder (except tests marked `live`). Team names start
with "Synthetic FC" so they can never be mistaken for real results, and they live
in a separate database (TEST_DATABASE_URL), never in the main one.
"""

import os
from datetime import date, timedelta

import numpy as np
import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, text

from footintel.config import Settings

TEST_DB = os.environ.get(
    "TEST_DATABASE_URL", "postgresql+psycopg://footintel:footintel_dev@localhost:5432/footintel_test"
)
ROOT = os.path.dirname(os.path.dirname(__file__))


def alembic_config() -> Config:
    cfg = Config(os.path.join(ROOT, "alembic.ini"))
    cfg.set_main_option("script_location", os.path.join(ROOT, "migrations"))
    cfg.set_main_option("sqlalchemy.url", TEST_DB)
    return cfg


@pytest.fixture(scope="session")
def engine():
    eng = create_engine(TEST_DB)
    try:
        with eng.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as exc:  # noqa: BLE001
        pytest.skip(f"Test database unavailable ({exc}). Set TEST_DATABASE_URL.")
    command.downgrade(alembic_config(), "base")
    command.upgrade(alembic_config(), "head")
    yield eng
    eng.dispose()


@pytest.fixture
def db(engine):
    """Empty tables and the seeded catalog before each test."""
    from footintel.catalog import seed_catalog
    from footintel.db.models import Base
    from footintel.db.session import session_scope

    names = ", ".join(t.name for t in reversed(Base.metadata.sorted_tables))
    with engine.begin() as conn:
        conn.execute(text(f"TRUNCATE {names} RESTART IDENTITY CASCADE"))
    with session_scope(engine) as s:
        seed_catalog(s)
    return engine


@pytest.fixture
def settings(tmp_path):
    return Settings(database_url=TEST_DB, data_dir=tmp_path / "data",
                    artifacts_dir=tmp_path / "artifacts", reports_dir=tmp_path / "reports",
                    admin_token="test-token", api_football_key=None, football_data_org_key=None, odds_api_key=None,
                    telegram_bot_token=None, telegram_chat_id=None, http_min_interval_seconds=0)


def synthetic_season_records(start_year: int, n_teams: int = 8, seed: int = 0,
                             competition: str = "ENG-PL"):
    """Double round-robin with goals drawn from team strengths. NOT real data."""
    from footintel.connectors.base import MatchRecord, OddsRecord, OutcomeRecord, TeamStatsRecord

    rng = np.random.default_rng(seed + start_year)
    strength = np.linspace(-0.4, 0.4, n_teams)
    teams = [f"Synthetic FC {i}" for i in range(n_teams)]
    records, day = [], date(start_year, 8, 10)
    pairs = [(h, a) for h in range(n_teams) for a in range(n_teams) if h != a]
    rng.shuffle(pairs)
    for k, (h, a) in enumerate(pairs):
        d = day + timedelta(days=k // (n_teams // 2) * 7)
        lam_h, lam_a = np.exp(0.35 + strength[h] - strength[a]), np.exp(0.1 + strength[a] - strength[h])
        hg, ag = int(rng.poisson(lam_h)), int(rng.poisson(lam_a))
        res = "H" if hg > ag else "A" if hg < ag else "D"
        ph = 1 / (1 + np.exp(-(strength[h] - strength[a]) * 2 - 0.3))
        probs = np.array([ph * 0.75, 0.25, (1 - ph) * 0.75])
        odds = [OddsRecord("market_avg", "1X2", s, float(round(1 / (p * 1.05), 2)), "pre_closing")
                for s, p in zip("HDA", probs, strict=True)]
        records.append(MatchRecord(
            source_code="football_data_uk", external_id=f"SYN|{start_year}|{teams[h]}|{teams[a]}",
            competition_code=competition, season_start_year=start_year, kickoff_date=d,
            kickoff_utc=None, home_team=teams[h], away_team=teams[a], status="finished",
            outcome=OutcomeRecord(hg, ag, res),
            home_stats=TeamStatsRecord(shots=int(rng.integers(5, 20)), shots_on_target=int(rng.integers(1, 8))),
            away_stats=TeamStatsRecord(shots=int(rng.integers(5, 20)), shots_on_target=int(rng.integers(1, 8))),
            odds=odds))
    return records


class FakeConnector:
    """Stands in for FootballDataUK and returns synthetic records."""

    def __init__(self, seasons: dict[int, list], fixtures: list | None = None):
        self.seasons, self.fixtures = seasons, fixtures or []

    def fetch_season(self, start_year, div, *, current_season):
        return self.seasons.get(start_year, []) if div == "E0" else []

    def fetch_fixtures(self):
        return self.fixtures
