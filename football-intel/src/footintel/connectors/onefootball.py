"""Connector for onefootball.com pages: league results, line-ups, events and match statistics.

The terms of use (static.onefootball.com/legal/terms-of-use/en, 7.2 and 7.4) allow personal
use only and forbid saving the content. Used anyway by an explicit owner decision (see
docs/DECISIONS.md D50): personal use, nothing published, raw pages never written to disk.

Each page embeds its data in a `__NEXT_DATA__` JSON block. Format checked on 2026-10-29:

    competition results: components {"$case": "matchCardsListsAppender"} with
        lists[].matchCards[] = {"link": "/en/match/2693644", "kickoff": "2026-10-25T16:30:00Z",
                                "timePeriod": "Full time", "homeTeam": {"name", "score"}, ...}
        and loadMoreButton.apiUrl for the older matches of the season (same JSON shape).
    match page: components "matchScore", "matchLineup", "matchEvents", "matchStats".
        A line-up is a list of rows from the forwards to the goalkeeper; each player has a
        name and link.urlPath "/en/player/<slug>-<id>". Events name players only by name.
"""

import json
import logging
import re
from dataclasses import dataclass, field
from datetime import UTC, datetime

from footintel.config import Settings
from footintel.connectors.http import HttpClient, SourceUnavailable

log = logging.getLogger(__name__)

SITE = "https://onefootball.com"
# Competition page slugs (checked on 2026-10-30). Leagues: line-ups, events and the fixture
# list. Cups: fixtures and results, because no other free source has them (D62). The
# DFB-Pokal stays on OpenLigaDB.
LEAGUE_SLUGS = {"ENG-PL": "premier-league-9", "ESP-LL": "laliga-10", "ITA-SA": "serie-a-13",
                "GER-BL": "bundesliga-1", "FRA-L1": "ligue-1-23"}
# Coupe de France: no page found yet ("coupe-de-france-20" holds national teams).
CUP_SLUGS = {"ENG-FAC": "fa-cup-17", "ENG-EFL": "efl-cup-41", "ESP-CDR": "copa-del-rey-18",
             "ITA-CI": "coppa-italia-19"}
# Bracket slots shown before a draw ("Home", "Winner Quarter Final 1"): not teams.
PLACEHOLDER = re.compile(r"^(Home|Guest|Away|Winner|Loser|TBD|TBA)\b", re.I)
# National teams (D82). Ids found on 2026-11-16 through /en/competition/x-<id>, which redirects to
# the named page. A new edition (Euro 2028 qualifying, AFCON 2027) gets a new id: add it here.
NATIONAL_SLUGS = {"INT-UNL": "uefa-nations-league-2349", "INT-FRI": "international-friendlies-24",
                  "INT-WC": "world-cup-12", "INT-AFCON": "africa-cup-of-nations-49", "INT-COPA": "copa-america-37",
                  "INT-ASIA": "afc-asian-cup-156", "INT-GOLD": "concacaf-gold-cup-87"}
CALENDAR_SLUGS = {**LEAGUE_SLUGS, **CUP_SLUGS, **NATIONAL_SLUGS}

_NEXT_DATA = re.compile(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', re.S)
_MINUTE = re.compile(r"^(\d+)(?:\+(\d+))?'?$")
_PLAYER_ID = re.compile(r"-(\d+)$")
# Stats titles shown on the match page, mapped to our column names.
_STATS = {"Possession": "possession_pct", "Total shots": "shots", "Shots on target": "shots_on_target"}


@dataclass
class MatchCard:
    external_id: str
    kickoff_utc: datetime
    home_team: str
    away_team: str
    finished: bool
    home_score: int | None = None
    away_score: int | None = None


@dataclass
class LineupPlayer:
    external_id: str
    name: str
    short_name: str
    position: str  # G | D | M | A, from the row of the formation


@dataclass
class TeamSheet:
    team_name: str
    formation: str | None
    starters: list[LineupPlayer] = field(default_factory=list)


@dataclass
class Event:
    key: str
    side: int  # 0 home, 1 away
    type: str  # goal | disallowed_goal | card | substitution
    detail: str  # label shown by the source, e.g. "Yellow card", "Own goal"
    minute: int | None
    extra_minute: int | None
    player: str | None
    other_player: str | None = None  # assist, or player off for a substitution


@dataclass
class MatchPage:
    external_id: str
    finished: bool
    lineup_title: str | None
    home: TeamSheet | None
    away: TeamSheet | None
    events: list[Event] = field(default_factory=list)
    # {"home": {"shots": 15, ...}, "away": {...}}
    stats: dict[str, dict[str, float]] = field(default_factory=dict)


def next_data(html: str) -> dict:
    m = _NEXT_DATA.search(html)
    if not m:
        raise SourceUnavailable("onefootball: page without __NEXT_DATA__ (format changed?)")
    return json.loads(m.group(1))


def _components(data, case: str) -> list[dict]:
    found = []

    def walk(o):
        if isinstance(o, dict):
            ct = o.get("contentType")
            if isinstance(ct, dict) and ct.get("$case") == case:
                found.append(ct[case])
            for v in o.values():
                walk(v)
        elif isinstance(o, list):
            for v in o:
                walk(v)

    walk(data)
    return found


def _ts(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(UTC)


def _score(value) -> int | None:
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def parse_cards(data: dict) -> tuple[list[MatchCard], str | None]:
    """Match cards of a results or fixtures page, and the URL of the older results."""
    cards, more = [], None
    for appender in _components(data, "matchCardsListsAppender") or [data]:
        for lst in appender.get("lists", []):
            for c in lst.get("matchCards", []):
                link = c.get("link", "")
                if not link.startswith("/en/match/") or not c.get("kickoff"):
                    continue
                if PLACEHOLDER.match(c["homeTeam"]["name"]) or PLACEHOLDER.match(c["awayTeam"]["name"]):
                    continue
                cards.append(MatchCard(
                    external_id=link.rsplit("/", 1)[-1], kickoff_utc=_ts(c["kickoff"]),
                    home_team=c["homeTeam"]["name"], away_team=c["awayTeam"]["name"],
                    finished=c.get("timePeriod") == "Full time",
                    home_score=_score(c["homeTeam"].get("score")), away_score=_score(c["awayTeam"].get("score"))))
        more = more or (appender.get("loadMoreButton") or {}).get("apiUrl")
    return cards, more


def formation_of(row_sizes: list[int]) -> str | None:
    """Rows go from the forwards to the goalkeeper: [1, 3, 2, 4, 1] is 4-2-3-1."""
    if len(row_sizes) < 3 or row_sizes[-1] != 1 or sum(row_sizes) != 11:
        return None
    return "-".join(str(n) for n in reversed(row_sizes[:-1]))


def _sheet(team: dict) -> TeamSheet:
    rows = ((team.get("variant") or {}).get("formation") or {}).get("rows") or []
    sheet = TeamSheet(team.get("teamName", ""), formation_of([len(r.get("players", [])) for r in rows]))
    last = len(rows) - 1
    for i, row in enumerate(rows):
        position = "G" if i == last else "D" if i == last - 1 else "A" if i == 0 else "M"
        for p in row.get("players", []):
            m = _PLAYER_ID.search((p.get("link") or {}).get("urlPath", ""))
            if m:
                sheet.starters.append(LineupPlayer(m.group(1), p.get("name", ""),
                                                   p.get("nickName") or "", position))
    return sheet


def _minute(timeline: str) -> tuple[int | None, int | None]:
    m = _MINUTE.match((timeline or "").strip())
    if not m:
        return None, None
    return int(m.group(1)), int(m.group(2)) if m.group(2) else None


def _event(e: dict, n: int) -> Event | None:
    kind = (e.get("type") or {}).get("$case")
    body = (e.get("type") or {}).get(kind) or {}
    minute, extra = _minute(e.get("timeline", ""))
    if kind == "goal":
        player, other = (body.get("scorer") or {}).get("name"), (body.get("assistant") or {}).get("name")
    elif kind == "card":
        player, other = (body.get("player") or {}).get("name"), None
    elif kind == "substitution":
        player, other = (body.get("playerIn") or {}).get("name"), (body.get("playerOut") or {}).get("name")
    else:
        return None
    # A goal the referee cancelled keeps its own type, so goal counts stay true.
    if kind == "goal" and "disallowed" in (e.get("name") or "").lower():
        kind = "disallowed_goal"
    # No event id in the source: the key is the order and content, stable on re-read.
    key = f"{n}|{kind}|{e.get('timeline', '')}|{player or ''}"[:200]
    return Event(key, int(e.get("teamSide", 0)), kind, (e.get("name") or kind)[:200],
                 minute, extra, player or None, other or None)


def parse_match(external_id: str, data: dict) -> MatchPage:
    score = next(iter(_components(data, "matchScore")), {})
    page = MatchPage(external_id, score.get("timePeriod") == "Full time", None, None, None)
    lineup = next(iter(_components(data, "matchLineup")), None)
    if lineup and (lineup.get("variant") or {}).get("$case") == "lineup":
        teams = lineup["variant"]["lineup"]
        page.lineup_title = lineup.get("title")
        page.home, page.away = _sheet(teams.get("homeTeam") or {}), _sheet(teams.get("awayTeam") or {})
    for block in _components(data, "matchEvents"):
        for n, e in enumerate(block.get("events", [])):
            ev = _event(e, n)
            if ev:
                page.events.append(ev)
    for block in _components(data, "matchStats"):
        for s in block.get("stats", []):
            col = _STATS.get(s.get("title"))
            if col and isinstance(s.get("home"), (int, float)) and isinstance(s.get("away"), (int, float)):
                page.stats.setdefault("home", {})[col] = s["home"]
                page.stats.setdefault("away", {})[col] = s["away"]
    return page


class OneFootball:
    def __init__(self, settings: Settings, client: HttpClient | None = None):
        self.client = client or HttpClient(settings)

    def fixtures(self, competition_code: str) -> list[MatchCard]:
        """The next match cards shown on the fixtures page (about the next 30)."""
        url = f"{SITE}/en/competition/{CALENDAR_SLUGS[competition_code]}/fixtures"
        cards, _ = parse_cards(next_data(self.client.get(url).text))
        return [c for c in cards if not c.finished]

    def results(self, competition_code: str) -> list[MatchCard]:
        """Every match card of the current season shown on the results pages."""
        url = f"{SITE}/en/competition/{CALENDAR_SLUGS[competition_code]}/results"
        cards, more = parse_cards(next_data(self.client.get(url).text))
        if more:
            older, _ = parse_cards(self.client.get(more).json())
            cards += older
        return list({c.external_id: c for c in cards}.values())

    def match(self, external_id: str) -> MatchPage:
        return parse_match(external_id, next_data(self.client.get(f"{SITE}/en/match/{external_id}").text))
