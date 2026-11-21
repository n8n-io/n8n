"""Connector for https://api.the-odds-api.com/v4 (free plan: 500 credits per month).

Format from the official v4 guide (https://the-odds-api.com/liveapi/guides/v4/):

    [{"id": "e912...", "sport_key": "soccer_uefa_champs_league",
      "commence_time": "2026-11-04T20:00:00Z", "home_team": "...", "away_team": "...",
      "bookmakers": [{"key": "pinnacle", "title": "Pinnacle", "last_update": "...",
                      "markets": [{"key": "h2h", "outcomes": [{"name": "<home>", "price": 1.9},
                                                              {"name": "Draw", "price": 3.6}, ...]}]}]}]

Cost: 1 credit per region and market for each /odds call; /sports is free and an empty
answer costs nothing. Only h2h in one region is requested, so one sport costs 1 credit.
"""

import logging
from dataclasses import dataclass, field
from datetime import UTC, datetime
from pathlib import Path

from footintel.config import Settings
from footintel.connectors.base import OddsRecord
from footintel.connectors.http import HttpClient, SourceUnavailable

log = logging.getLogger(__name__)

API_BASE = "https://api.the-odds-api.com/v4"


@dataclass
class OddsEvent:
    external_id: str
    sport_key: str
    commence_utc: datetime
    home_team: str
    away_team: str
    odds: list[OddsRecord] = field(default_factory=list)


def _ts(value: str | None) -> datetime | None:
    return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(UTC) if value else None


def parse_events(data: list[dict], fetched_at: datetime) -> list[OddsEvent]:
    """One event per match; 1X2 prices of every bookmaker. A bookmaker whose h2h market
    does not have exactly the home team, the away team and Draw is left out."""
    label = f"oddsapi@{fetched_at.astimezone(UTC):%Y-%m-%dT%H:%M}"
    events = []
    for e in data:
        ev = OddsEvent(e["id"], e["sport_key"], _ts(e["commence_time"]), e["home_team"], e["away_team"])
        sel = {e["home_team"]: "H", "Draw": "D", e["away_team"]: "A"}
        for b in e.get("bookmakers", []):
            for m in b.get("markets", []):
                if m.get("key") != "h2h":
                    continue
                prices = {sel.get(o.get("name")): o.get("price") for o in m.get("outcomes", [])}
                prices.pop(None, None)
                if set(prices) != {"H", "D", "A"} or any(not p or p <= 1.0 for p in prices.values()):
                    log.info("the-odds-api %s %s: incomplete h2h market skipped", e["id"], b.get("key"))
                    continue
                captured = _ts(m.get("last_update") or b.get("last_update"))
                ev.odds += [OddsRecord(bookmaker=b["key"][:50], market="1X2", selection=s, price=float(p),
                                       snapshot_label=label, captured_at=captured)
                            for s, p in prices.items()]
        events.append(ev)
    return events


class TheOddsApi:
    def __init__(self, settings: Settings, client: HttpClient | None = None):
        if not settings.odds_api_enabled:
            raise ValueError("ODDS_API_KEY is not set")
        self._key = settings.odds_api_key.get_secret_value().strip()
        self.regions = settings.odds_api_regions
        self.client = client or HttpClient(settings)
        self.raw_dir = Path(settings.data_dir) / "raw" / "the_odds_api"
        self.remaining: int | None = None

    def _get(self, path: str, **params):
        # The key goes in the query string (the API's only option): scrub it from errors.
        try:
            response = self.client.get(f"{API_BASE}{path}", params={"apiKey": self._key, **params})
        except SourceUnavailable as exc:
            raise SourceUnavailable(str(exc).replace(self._key, "***")) from None
        left = response.headers.get("x-requests-remaining")
        if left is not None:
            self.remaining = int(float(left))
        return response

    def active_sports(self) -> set[str]:
        """Sport keys in season now. Free: does not count against the quota."""
        return {s["key"] for s in self._get("/sports").json() if s.get("active")}

    def odds(self, sport_key: str) -> list[OddsEvent]:
        fetched = datetime.now(UTC)
        response = self._get(f"/sports/{sport_key}/odds", regions=self.regions, markets="h2h",
                             oddsFormat="decimal", dateFormat="iso")
        path = self.raw_dir / f"{fetched:%Y-%m-%d}" / f"{sport_key}-{fetched:%H%M}.json"
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(response.text, encoding="utf-8")
        return parse_events(response.json(), fetched)
