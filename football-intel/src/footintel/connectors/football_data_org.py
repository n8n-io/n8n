"""Connector for https://api.football-data.org/v4 (free plan, personal key).

Format checked on real answers of /competitions/CL/matches?season=2026 on 2026-10-22:

    {"id": 575323, "utcDate": "2026-09-08T16:45:00Z", "status": "FINISHED", "matchday": 1,
     "stage": "LEAGUE_STAGE", "homeTeam": {"id": 851, "name": "Club Brugge KV"},
     "awayTeam": {...}, "score": {"winner": "AWAY_TEAM", "duration": "REGULAR",
     "fullTime": {"home": 2, "away": 3}, "halfTime": {"home": 1, "away": 3}}}

Only "REGULAR" durations were seen. Extra-time fields (regularTime, extraTime,
penalties) were not seen in real answers yet: without regularTime, a finished match
gets no result rather than a guessed one.
"""

import logging
from datetime import UTC, datetime
from pathlib import Path
from zoneinfo import ZoneInfo

from footintel.catalog import FOOTBALL_DATA_ORG, FOOTBALL_DATA_ORG_COMPETITIONS
from footintel.config import Settings
from footintel.connectors.base import MatchRecord, OutcomeRecord
from footintel.connectors.http import HttpClient

log = logging.getLogger(__name__)

API_BASE = "https://api.football-data.org/v4"
UEFA_TZ = ZoneInfo("Europe/Paris")

_STAGES = {
    "QUALIFICATION": "Qualifying", "PLAYOFFS": "Knockout round play-offs",
    "LAST_32": "Round of 32", "LAST_16": "Round of 16", "QUARTER_FINALS": "Quarter-finals",
    "SEMI_FINALS": "Semi-finals", "FINAL": "Final",
}


def _pair(d: dict | None) -> tuple[int, int] | None:
    if not d or d.get("home") is None or d.get("away") is None:
        return None
    return int(d["home"]), int(d["away"])


def _outcome(score: dict) -> tuple[OutcomeRecord | None, str | None]:
    duration = score.get("duration")
    ht = _pair(score.get("halfTime")) or (None, None)
    if duration == "REGULAR":
        ninety, aet, pens = _pair(score.get("fullTime")), None, None
    else:
        ninety = _pair(score.get("regularTime"))
        aet = _pair(score.get("fullTime")) if duration in ("EXTRA_TIME", "PENALTY_SHOOTOUT") else None
        pens = _pair(score.get("penalties"))
    if ninety is None:
        return None, f"finished ({duration}) without a 90-minute score"
    hg, ag = ninety
    return OutcomeRecord(hg, ag, "H" if hg > ag else "A" if hg < ag else "D",
                         ht_home_goals=ht[0], ht_away_goals=ht[1],
                         aet_home_goals=aet[0] if aet else None, aet_away_goals=aet[1] if aet else None,
                         pen_home=pens[0] if pens else None, pen_away=pens[1] if pens else None), None


def parse_matches(data: dict, competition_code: str, season: int) -> list[MatchRecord]:
    records = []
    for m in data.get("matches", []):
        issues: list[tuple[str, str]] = []
        kickoff = datetime.fromisoformat(m["utcDate"].replace("Z", "+00:00")).astimezone(UTC)
        stage = m.get("stage") or ""
        if stage == "REGULAR_SEASON":
            rnd = None  # league match: same as the football-data.co.uk records
        elif stage == "LEAGUE_STAGE" and m.get("matchday"):
            rnd = f"League, Matchday {m['matchday']}"
        else:
            rnd = _STAGES.get(stage, stage)
        status, outcome = "scheduled", None
        if m["status"] == "FINISHED":
            outcome, problem = _outcome(m.get("score") or {})
            if problem:
                issues.append(("result_inconsistent", problem))
            status = "finished" if outcome else "scheduled"
        elif m["status"] == "AWARDED":
            status = "cancelled"
            issues.append(("score_not_used", "awarded: not a played result"))
        records.append(MatchRecord(
            source_code=FOOTBALL_DATA_ORG, external_id=f"{competition_code}|{season}|{m['id']}",
            competition_code=competition_code, season_start_year=season,
            kickoff_date=kickoff.astimezone(UEFA_TZ).date(), kickoff_utc=kickoff,
            home_team=m["homeTeam"]["name"], away_team=m["awayTeam"]["name"],
            status=status, outcome=outcome, round=rnd, neutral=stage == "FINAL", issues=issues))
    return records


class FootballDataOrg:
    def __init__(self, settings: Settings, client: HttpClient | None = None):
        if not settings.football_data_org_enabled:
            raise ValueError("FOOTBALL_DATA_ORG_KEY is not set")
        key = settings.football_data_org_key.get_secret_value().strip()
        self.client = client or HttpClient(settings, headers={"X-Auth-Token": key})
        self.raw_dir = Path(settings.data_dir) / "raw" / FOOTBALL_DATA_ORG

    def fetch(self, competition_code: str, season: int) -> list[MatchRecord]:
        code = FOOTBALL_DATA_ORG_COMPETITIONS[competition_code]
        response = self.client.get(f"{API_BASE}/competitions/{code}/matches", params={"season": season})
        path = self.raw_dir / str(season) / f"{code}.json"
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(response.text, encoding="utf-8")
        return parse_matches(response.json(), competition_code, season)
