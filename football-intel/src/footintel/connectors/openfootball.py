"""Connector for UEFA results in https://github.com/openfootball/champions-league (public domain).

Format checked on real files (2011-12 to 2025-26) on 2026-10-21:

    = UEFA Champions League 2023/24
    ▪ Group A                     (or "▪ League, Matchday 1", "▪ Finals, Round of 16")
      Tue Sep 19 2023             (year only on the first date of the file)
        18:45  AC Milan (ITA)   v Newcastle United FC (ENG)  0-0
               PSV (NED)        v RC Lens (FRA)               1-3 (0-2)
        21:00  Arsenal FC (ENG) v FC Porto (POR)   4-2 pen. 1-0 a.e.t. (1-0, 1-0)
               Villarreal CF (ESP) v Qarabağ FK (AZE)  3-0    [awarded]

Score rules: "x-y (a-b)" is full time (half time). With "a.e.t." the brackets hold
(90-minute score, half time). The 1X2 result uses the 90-minute score.
Kick-off times are UEFA local time (Central European Time).
"""

import logging
import re
from datetime import UTC, date, datetime
from pathlib import Path
from zoneinfo import ZoneInfo

from footintel.catalog import COMPETITIONS, OPENFOOTBALL
from footintel.config import Settings
from footintel.connectors.base import MatchRecord, OutcomeRecord
from footintel.connectors.http import HttpClient, SourceUnavailable

log = logging.getLogger(__name__)

RAW_BASE = "https://raw.githubusercontent.com/openfootball/champions-league/master"
UEFA_TZ = ZoneInfo("Europe/Paris")
FILE_TO_COMPETITION = {c.source_codes[OPENFOOTBALL]: c.code for c in COMPETITIONS
                       if OPENFOOTBALL in c.source_codes}

_DATE = re.compile(r"^\s{2}(Mon|Tue|Wed|Thu|Fri|Sat|Sun) (\w{3}) (\d{1,2})(?: (\d{4}))?\s*$")
_MATCH = re.compile(
    r"^\s+(?:(?P<time>\d{1,2}:\d{2})\s+)?(?P<home>.+?\s\([A-Z]{3}\))\s+v\s+"
    r"(?P<away>.+?\s\([A-Z]{3}\))\s+(?P<score>.*)$"
)
_TEAM = re.compile(r"^(?P<name>.+?)\s\((?P<cc>[A-Z]{3})\)$")
_SIMPLE = re.compile(r"^(\d+)-(\d+)(?:\s\((\d+)-(\d+)\))?$")
_AET = re.compile(
    r"^(?:(?P<p1>\d+)-(?P<p2>\d+) pen\. )?(?P<e1>\d+)-(?P<e2>\d+) a\.e\.t\. "
    r"\((?P<f1>\d+)-(?P<f2>\d+)(?:, (?P<h1>\d+)-(?P<h2>\d+))?\)$"
)
_MONTHS = {m: i for i, m in enumerate(
    ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"], 1)}


def season_dir(start_year: int) -> str:
    return f"{start_year}-{(start_year + 1) % 100:02d}"


def split_team(raw: str) -> tuple[str, str]:
    m = _TEAM.match(raw.strip())
    if not m:
        raise ValueError(f"Bad team {raw!r}")
    return m["name"].strip(), m["cc"]


def parse_score(text: str) -> tuple[OutcomeRecord | None, str | None]:
    """Return (outcome, problem). An unplayed or awarded match has no outcome."""
    text = text.strip()
    if not text:
        return None, None
    if "[" in text:
        return None, f"not a played result: {text}"
    m = _SIMPLE.match(text)
    if m:
        hg, ag = int(m[1]), int(m[2])
        ht = (int(m[3]), int(m[4])) if m[3] is not None else (0, 0) if hg == ag == 0 else (None, None)
        res = "H" if hg > ag else "A" if hg < ag else "D"
        return OutcomeRecord(hg, ag, res, ht_home_goals=ht[0], ht_away_goals=ht[1]), None
    m = _AET.match(text)
    if m:
        hg, ag = int(m["f1"]), int(m["f2"])
        res = "H" if hg > ag else "A" if hg < ag else "D"
        # The half-time score is omitted when the 90-minute score is 0-0.
        ht = (int(m["h1"]), int(m["h2"])) if m["h1"] else (0, 0) if hg == ag == 0 else (None, None)
        return OutcomeRecord(
            hg, ag, res, ht_home_goals=ht[0], ht_away_goals=ht[1],
            aet_home_goals=int(m["e1"]), aet_away_goals=int(m["e2"]),
            pen_home=int(m["p1"]) if m["p1"] else None,
            pen_away=int(m["p2"]) if m["p2"] else None), None
    return None, f"unparsed score {text!r}"


_RANGE = re.compile(r"^# Date\s+\w{3} (\w{3}) (\d{1,2}) (\d{4}) - \w{3} (\w{3}) (\d{1,2}) (\d{4})")


def _year_in_range(month: int, day: int, date_range: tuple[date, date] | None,
                   start_year: int) -> int:
    """Pick the year that puts the date inside the file's declared date range.

    Files are grouped by stage, not sorted by date, so the order of lines cannot be
    used. A fixed July cut-off put the August 2020 finals of 2019-20 in August 2019."""
    if date_range:
        for year in (date_range[0].year, date_range[1].year):
            if date_range[0] <= date(year, month, day) <= date_range[1]:
                return year
    return start_year if month >= 7 else start_year + 1


def parse_txt(text: str, filename: str, start_year: int) -> list[MatchRecord]:
    comp = FILE_TO_COMPETITION[filename]
    date_range = None
    for line in text.splitlines()[:10]:
        rm = _RANGE.match(line)
        if rm:
            date_range = (date(int(rm[3]), _MONTHS[rm[1]], int(rm[2])),
                          date(int(rm[6]), _MONTHS[rm[4]], int(rm[5])))
    records: list[MatchRecord] = []
    stage: str | None = None
    current_date: date | None = None
    last_time: str | None = None
    for line in text.splitlines():
        if line.startswith("▪"):
            stage = line.lstrip("▪ ").strip()
            continue
        dm = _DATE.match(line)
        if dm:
            month, day = _MONTHS[dm[2]], int(dm[3])
            if dm[4]:
                year = int(dm[4])
            else:
                year = _year_in_range(month, day, date_range, start_year)
            current_date, last_time = date(year, month, day), None
            continue
        mm = _MATCH.match(line)
        if not mm or current_date is None:
            continue
        last_time = mm["time"] or last_time
        home, home_cc = split_team(mm["home"])
        away, away_cc = split_team(mm["away"])
        outcome, problem = parse_score(mm["score"])
        kickoff = None
        if last_time:
            hh, mi = last_time.split(":")
            kickoff = datetime(current_date.year, current_date.month, current_date.day,
                               int(hh), int(mi), tzinfo=UEFA_TZ).astimezone(UTC)
        # "Final" (old files) or "Finals, Final" (recent files). Finals are on neutral ground.
        is_final = stage in ("Final", "Finals, Final")
        rec = MatchRecord(
            source_code=OPENFOOTBALL,
            external_id=f"{filename}|{start_year}|{current_date:%Y-%m-%d}|{home}|{away}",
            competition_code=comp, season_start_year=start_year, kickoff_date=current_date,
            kickoff_utc=kickoff, home_team=f"{home} ({home_cc})", away_team=f"{away} ({away_cc})",
            status="finished" if outcome else "scheduled", outcome=outcome, round=stage,
            neutral=is_final)
        if problem:
            rec.issues.append(("score_not_used", problem))
            if "[" in problem:
                rec.status = "cancelled"  # awarded: not a football result
        records.append(rec)
    return records


class OpenFootball:
    def __init__(self, settings: Settings, client: HttpClient | None = None):
        self.client = client or HttpClient(settings)
        self.raw_dir = Path(settings.data_dir) / "raw" / OPENFOOTBALL

    def fetch(self, start_year: int, filename: str, *, current_season: bool) -> list[MatchRecord]:
        """Raise SourceUnavailable when the file does not exist for that season."""
        path = self.raw_dir / season_dir(start_year) / filename
        if path.exists() and not current_season:
            text = path.read_text(encoding="utf-8")
        else:
            try:
                response = self.client.get(f"{RAW_BASE}/{season_dir(start_year)}/{filename}")
            except SourceUnavailable:
                raise
            text = response.text
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(text, encoding="utf-8")
        return parse_txt(text, filename, start_year)
