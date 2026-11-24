"""Calls the REAL sources to check that the columns and envelopes we rely on still exist.

Run with: pytest -m live
"""

import httpx
import pytest

from footintel.config import get_settings
from footintel.connectors.football_data_uk import BASE_URL, parse_csv, season_url

pytestmark = pytest.mark.live

REQUIRED_SEASON_COLUMNS = {"Div", "Date", "Time", "HomeTeam", "AwayTeam", "FTHG", "FTAG", "FTR",
                           "HS", "AS", "HST", "AST", "AvgH", "AvgD", "AvgA", "Avg>2.5", "Avg<2.5"}


def _get(url: str) -> httpx.Response:
    return httpx.get(url, follow_redirects=True, timeout=20,
                     headers={"User-Agent": get_settings().user_agent})


@pytest.mark.parametrize("div", ["E0", "SP1", "I1", "D1"])
def test_football_data_last_complete_season_has_required_columns(div):
    r = _get(season_url(2025, div))
    assert r.status_code == 200
    text = r.content.decode("utf-8-sig")
    header = set(text.splitlines()[0].split(","))
    assert REQUIRED_SEASON_COLUMNS <= header, REQUIRED_SEASON_COLUMNS - header
    records = parse_csv(text, season_start_year=2025)
    assert len(records) >= 300 and all(r.outcome is not None for r in records)


def test_football_data_fixtures_file_is_reachable():
    r = _get(f"{BASE_URL}/fixtures.csv")
    assert r.status_code == 200
    assert {"Div", "Date", "HomeTeam", "AwayTeam"} <= set(
        r.content.decode("utf-8-sig").splitlines()[0].split(","))


def test_api_football_envelope():
    """Without a key the API answers 403 with its standard envelope (seen 2026-10-21)."""
    settings = get_settings()
    headers = {}
    if settings.api_football_enabled:
        headers["x-apisports-key"] = settings.api_football_key.get_secret_value()
    r = httpx.get(f"{settings.api_football_base_url}/status", headers=headers, timeout=20)
    body = r.json()
    assert {"get", "parameters", "errors", "results", "paging", "response"} <= set(body)
    if not settings.api_football_enabled:
        assert r.status_code == 403 and "token" in body["errors"]


def test_openfootball_latest_cl_file_parses_completely():
    import re

    from footintel.connectors.openfootball import RAW_BASE, parse_txt

    r = _get(f"{RAW_BASE}/2025-26/cl.txt")
    assert r.status_code == 200
    declared = int(re.search(r"# Matches\s+(\d+)", r.text)[1])
    records = parse_txt(r.text, "cl.txt", 2025)
    assert len(records) == declared
    assert sum(1 for x in records if x.outcome) >= declared - 5


@pytest.mark.parametrize("competition", ["UEFA-CL", "UEFA-EL", "UEFA-ECL", "GER-DFB"])
def test_openligadb_current_leagues_have_the_fields_we_read(competition):
    from footintel.catalog import OPENLIGADB_LEAGUES
    from footintel.connectors.openligadb import API_BASE, parse_matches

    season = max(OPENLIGADB_LEAGUES)
    shortcut = OPENLIGADB_LEAGUES[season][competition]
    r = _get(f"{API_BASE}/getmatchdata/{shortcut}/{season}")
    assert r.status_code == 200
    data = r.json()
    assert len(data) >= 30, f"{shortcut} looks empty: check catalog.OPENLIGADB_LEAGUES"
    assert {"matchID", "matchDateTime", "matchDateTimeUTC", "matchIsFinished", "group", "team1",
            "team2", "matchResults", "goals"} <= set(data[0])
    records = parse_matches(data, competition, season, shortcut)
    finished = [x for x in records if x.outcome]
    # Most results pass the consistency checks; a few volunteer errors are expected.
    assert sum(1 for x in data if x["matchIsFinished"]) - len(finished) <= 3


def test_football_data_org_champions_league_fields():
    from footintel.connectors.football_data_org import API_BASE, parse_matches

    settings = get_settings()
    if not settings.football_data_org_enabled:
        pytest.skip("FOOTBALL_DATA_ORG_KEY not set")
    r = httpx.get(f"{API_BASE}/competitions/CL/matches", params={"season": 2026}, timeout=20,
                  headers={"X-Auth-Token": settings.football_data_org_key.get_secret_value()})
    assert r.status_code == 200
    m = r.json()["matches"][0]
    assert {"id", "utcDate", "status", "stage", "homeTeam", "awayTeam", "score"} <= set(m)
    records = parse_matches(r.json(), "UEFA-CL", 2026)
    assert len(records) >= 100
