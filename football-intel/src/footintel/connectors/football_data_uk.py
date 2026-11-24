"""Connector for https://www.football-data.co.uk CSV files.

Column meanings come from https://www.football-data.co.uk/notes.txt (checked
2026-10-21). Facts verified by real downloads in that session:
- Season files: /mmz4281/{yy}{yy+1}/{DIV}.csv, available from 2005-06 to 2026-27
  for E0, SP1, I1, D1.
- Upcoming matches: /fixtures.csv (only matches of the next few days, with odds).
- The `Time` column exists from 2019-20. Its timezone is not documented; we
  assume UK local time (Europe/London). See docs/DECISIONS.md.
- Average-odds columns changed names over time (BbAv* before 2019-20, Avg* after).
"""

import csv
import io
import logging
import time
from datetime import UTC, date, datetime
from pathlib import Path
from zoneinfo import ZoneInfo

from footintel.catalog import COMPETITION_BY_CODE, COMPETITIONS, FD_NEW, FOOTBALL_DATA
from footintel.config import Settings
from footintel.connectors.base import (
    MatchRecord,
    OddsRecord,
    OutcomeRecord,
    TeamStatsRecord,
    season_start_for,
)
from footintel.connectors.http import HttpClient

log = logging.getLogger(__name__)

BASE_URL = "https://www.football-data.co.uk"
SOURCE_TZ = ZoneInfo("Europe/London")

DIV_TO_COMPETITION = {
    c.source_codes[FOOTBALL_DATA]: c.code for c in COMPETITIONS
    if FOOTBALL_DATA in c.source_codes and not c.source_codes[FOOTBALL_DATA].startswith(FD_NEW)
}
# Country files under /new/ (all seasons in one file), e.g. "AUT" -> "AUT-BL".
NEW_TO_COMPETITION = {
    c.source_codes[FOOTBALL_DATA].removeprefix(FD_NEW): c.code for c in COMPETITIONS
    if FOOTBALL_DATA in c.source_codes and c.source_codes[FOOTBALL_DATA].startswith(FD_NEW)
}

# (bookmaker, snapshot_label, market, selection) -> candidate columns, first present wins.
ODDS_COLUMNS: dict[tuple[str, str, str, str], list[str]] = {}


def _add_odds(bookmaker: str, label: str, market: str, selection: str, *cols: str) -> None:
    ODDS_COLUMNS[(bookmaker, label, market, selection)] = list(cols)


for sel, suffix in (("H", "H"), ("D", "D"), ("A", "A")):
    _add_odds("market_avg", "pre_closing", "1X2", sel, f"Avg{suffix}", f"BbAv{suffix}")
    _add_odds("market_avg", "closing", "1X2", sel, f"AvgC{suffix}")
    _add_odds("market_max", "pre_closing", "1X2", sel, f"Max{suffix}", f"BbMx{suffix}")
    _add_odds("b365", "pre_closing", "1X2", sel, f"B365{suffix}")
    _add_odds("b365", "closing", "1X2", sel, f"B365C{suffix}")
    _add_odds("pinnacle", "pre_closing", "1X2", sel, f"PS{suffix}")
    _add_odds("pinnacle", "closing", "1X2", sel, f"PSC{suffix}")
for sel, sym in (("over", ">"), ("under", "<")):
    _add_odds("market_avg", "pre_closing", "OU2.5", sel, f"Avg{sym}2.5", f"BbAv{sym}2.5")
    _add_odds("market_avg", "closing", "OU2.5", sel, f"AvgC{sym}2.5")


def season_code(start_year: int) -> str:
    return f"{start_year % 100:02d}{(start_year + 1) % 100:02d}"


def season_url(start_year: int, div: str) -> str:
    return f"{BASE_URL}/mmz4281/{season_code(start_year)}/{div}.csv"


def external_id(div: str, start_year: int, home: str, away: str,
                kickoff: date | None = None) -> str:
    """Target leagues: a pairing happens once per season and venue, so the key survives
    a rescheduled date. Context leagues (Scotland, Switzerland, play-off formats) can
    repeat a pairing at the same venue, so their key includes the date."""
    if kickoff is not None:
        return f"{div}|{start_year}|{kickoff:%Y-%m-%d}|{home}|{away}"
    return f"{div}|{start_year}|{home}|{away}"


def _is_target(competition_code: str) -> bool:
    return COMPETITION_BY_CODE[competition_code].is_target


def _decode(raw: bytes) -> str:
    for encoding in ("utf-8-sig", "latin-1"):
        try:
            return raw.decode(encoding)
        except UnicodeDecodeError:
            continue
    raise ValueError("Unreadable CSV encoding")


def _int(value: str | None) -> int | None:
    if value is None or value.strip() == "":
        return None
    return int(float(value))


def _float(value: str | None) -> float | None:
    if value is None or value.strip() == "":
        return None
    try:
        return float(value)
    except ValueError:
        return None


def _parse_date(value: str) -> date:
    for fmt in ("%d/%m/%Y", "%d/%m/%y"):
        try:
            return datetime.strptime(value.strip(), fmt).date()
        except ValueError:
            continue
    raise ValueError(f"Bad date {value!r}")


def _parse_kickoff(d: date, time_value: str | None) -> datetime | None:
    if not time_value or not time_value.strip():
        return None
    hh, mm = time_value.strip().split(":")[:2]
    local = datetime(d.year, d.month, d.day, int(hh), int(mm), tzinfo=SOURCE_TZ)
    return local.astimezone(UTC)


def parse_csv(text: str, *, season_start_year: int | None = None) -> list[MatchRecord]:
    """Parse a season file or fixtures.csv. Rows of unknown divisions are skipped."""
    records: list[MatchRecord] = []
    reader = csv.DictReader(io.StringIO(text))
    for row in reader:
        div = (row.get("Div") or "").strip()
        home, away = (row.get("HomeTeam") or "").strip(), (row.get("AwayTeam") or "").strip()
        if not div or not home or not away or div not in DIV_TO_COMPETITION:
            continue
        issues: list[tuple[str, str]] = []
        d = _parse_date(row["Date"])
        start_year = season_start_year if season_start_year is not None else season_start_for(d)
        kickoff = _parse_kickoff(d, row.get("Time"))

        outcome = None
        fthg, ftag, ftr = _int(row.get("FTHG")), _int(row.get("FTAG")), (row.get("FTR") or "").strip()
        if fthg is not None and ftag is not None:
            expected = "H" if fthg > ftag else "A" if fthg < ftag else "D"
            if ftr and ftr != expected:
                issues.append(("result_mismatch", f"FTR={ftr} but score {fthg}-{ftag}"))
            if fthg < 0 or ftag < 0:
                issues.append(("negative_goals", f"score {fthg}-{ftag}"))
            else:
                outcome = OutcomeRecord(
                    home_goals=fthg,
                    away_goals=ftag,
                    result=expected,
                    ht_home_goals=_int(row.get("HTHG")),
                    ht_away_goals=_int(row.get("HTAG")),
                )

        def stats(prefix: str) -> TeamStatsRecord:
            return TeamStatsRecord(
                shots=_int(row.get(f"{prefix}S")),
                shots_on_target=_int(row.get(f"{prefix}ST")),
                corners=_int(row.get(f"{prefix}C")),
                fouls=_int(row.get(f"{prefix}F")),
                yellow_cards=_int(row.get(f"{prefix}Y")),
                red_cards=_int(row.get(f"{prefix}R")),
            )

        odds: list[OddsRecord] = []
        for (bookmaker, label, market, selection), cols in ODDS_COLUMNS.items():
            for col in cols:
                price = _float(row.get(col))
                if price is None:
                    continue
                if price <= 1.0:
                    issues.append(("bad_odds", f"{col}={price}"))
                else:
                    odds.append(OddsRecord(bookmaker, market, selection, price, label))
                break

        comp_code = DIV_TO_COMPETITION[div]
        records.append(
            MatchRecord(
                source_code=FOOTBALL_DATA,
                external_id=external_id(div, start_year, home, away,
                                        None if _is_target(comp_code) else d),
                competition_code=comp_code,
                season_start_year=start_year,
                kickoff_date=d,
                kickoff_utc=kickoff,
                home_team=home,
                away_team=away,
                status="finished" if outcome else "scheduled",
                outcome=outcome,
                home_stats=stats("H") if outcome else None,
                away_stats=stats("A") if outcome else None,
                odds=odds,
                issues=issues,
            )
        )
    return records


def parse_new_csv(text: str, country: str, first_season: int = 0) -> list[MatchRecord]:
    """Parse a /new/{COUNTRY}.csv file: results and closing odds only, all seasons.

    Season is "2012/2013" or "2012" (calendar-year leagues such as Norway)."""
    comp_code = NEW_TO_COMPETITION[country]
    records = []
    for row in csv.DictReader(io.StringIO(text)):
        home, away = (row.get("Home") or "").strip(), (row.get("Away") or "").strip()
        season = (row.get("Season") or "").strip()
        if not home or not away or not season:
            continue
        start_year = int(season.split("/")[0])
        if start_year < first_season:
            continue
        d = _parse_date(row["Date"])
        hg, ag = _int(row.get("HG")), _int(row.get("AG"))
        outcome, issues = None, []
        if hg is not None and ag is not None:
            res = "H" if hg > ag else "A" if hg < ag else "D"
            if (row.get("Res") or "").strip() not in ("", res):
                issues.append(("result_mismatch", f"Res={row.get('Res')} but score {hg}-{ag}"))
            outcome = OutcomeRecord(home_goals=hg, away_goals=ag, result=res)
        odds = []
        for sel in ("H", "D", "A"):
            price = _float(row.get(f"AvgC{sel}"))
            if price is not None and price > 1.0:
                # Closing prices are not known at prediction time: stored, never used as features.
                odds.append(OddsRecord("market_avg", "1X2", sel, price, "closing"))
        records.append(MatchRecord(
            source_code=FOOTBALL_DATA,
            external_id=external_id(FD_NEW + country, start_year, home, away, d),
            competition_code=comp_code, season_start_year=start_year, kickoff_date=d,
            kickoff_utc=_parse_kickoff(d, row.get("Time")), home_team=home, away_team=away,
            status="finished" if outcome else "scheduled", outcome=outcome, odds=odds,
            issues=issues))
    return records


class FootballDataUK:
    def __init__(self, settings: Settings, client: HttpClient | None = None):
        self.settings = settings
        self.client = client or HttpClient(settings)
        self.raw_dir = Path(settings.data_dir) / "raw" / FOOTBALL_DATA

    def _cached_download(self, url: str, path: Path, max_age_seconds: float | None) -> str:
        """Use the cached file if it is fresh enough; otherwise download it."""
        if path.exists() and (
            max_age_seconds is None or time.time() - path.stat().st_mtime < max_age_seconds
        ):
            return _decode(path.read_bytes())
        response = self.client.get(url)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(response.content)
        log.info("Downloaded %s (%d bytes)", url, len(response.content))
        return _decode(response.content)

    def fetch_season(self, start_year: int, div: str, *, current_season: bool) -> list[MatchRecord]:
        path = self.raw_dir / season_code(start_year) / f"{div}.csv"
        # A finished season does not change; the current one is refreshed after 6 hours.
        text = self._cached_download(
            season_url(start_year, div), path, 6 * 3600 if current_season else None
        )
        return parse_csv(text, season_start_year=start_year)

    def fetch_country(self, country: str, first_season: int) -> list[MatchRecord]:
        path = self.raw_dir / "new" / f"{country}.csv"
        text = self._cached_download(f"{BASE_URL}/new/{country}.csv", path, 6 * 3600)
        return parse_new_csv(text, country, first_season)

    def fetch_fixtures(self) -> list[MatchRecord]:
        path = self.raw_dir / "fixtures.csv"
        text = self._cached_download(f"{BASE_URL}/fixtures.csv", path, 3600)
        # Only predicted competitions: context leagues are imported from results files.
        records = [r for r in parse_csv(text) if _is_target(r.competition_code)]
        # Each download is a distinct odds snapshot, so odds movement is kept over time.
        captured = datetime.fromtimestamp(path.stat().st_mtime, UTC).replace(microsecond=0)
        for rec in records:
            for odd in rec.odds:
                if odd.snapshot_label == "pre_closing":
                    odd.snapshot_label = f"fixtures@{captured:%Y-%m-%dT%H:%M}Z"
                    odd.captured_at = captured
        return records
