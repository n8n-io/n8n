"""Connector for https://api.openligadb.de (free, no key, community-maintained).

Format checked on real answers of /getmatchdata/{league}/{season} on 2026-10-22
(ucl, uel2026, uecl2026, dfb for 2026):

    {"matchID": 87388, "matchDateTime": "2026-09-08T18:45:00",
     "matchDateTimeUTC": "2026-09-08T16:45:00Z", "matchIsFinished": true,
     "group": {"groupName": "1.Spieltag"},
     "team1": {"teamName": "FC Brügge"}, "team2": {"teamName": "Aston Villa"},
     "matchResults": [{"resultTypeKind": "HalfTime", "pointsTeam1": 0, "pointsTeam2": 1},
                      {"resultTypeKind": "After90Minutes", ...},
                      {"resultTypeKind": "AfterExtraTime", ...}, {"resultTypeKind": "AfterPenalties", ...}],
     "goals": [{"matchMinute": 69, "scoreTeam1": 0, "scoreTeam2": 1, "isPenalty": false}, ...]}

Team names are German ("Inter Mailand") and carry no country: they are mapped only
through the manual aliases in reference/team_aliases.csv, never automatically.
Volunteers enter the data, so every result is checked against the goal list.
"""

import logging
import re
from datetime import UTC, datetime
from pathlib import Path

from footintel.catalog import OPENLIGADB, OPENLIGADB_LEAGUES
from footintel.config import Settings
from footintel.connectors.base import MatchRecord, OutcomeRecord
from footintel.connectors.http import HttpClient

log = logging.getLogger(__name__)

API_BASE = "https://api.openligadb.de"

# German round names to the English names the stage parser reads (features/context.py).
_ROUNDS = [
    (re.compile(r"^(\d+)\.\s*spieltag", re.I), "League, Matchday {0}"),
    (re.compile(r"^(\d+)\.\s*runde", re.I), "Round {0}"),
    (re.compile(r"sechzehntelfinale", re.I), "Round of 32"),
    (re.compile(r"achtelfinale", re.I), "Round of 16"),
    (re.compile(r"viertelfinale", re.I), "Quarter-finals"),
    (re.compile(r"halbfinale", re.I), "Semi-finals"),
    (re.compile(r"^(finale|endspiel)$", re.I), "Final"),
    (re.compile(r"play-?off|zwischenrunde|k\.?-?o\.?-?runde", re.I), "Knockout round play-offs"),
]


def round_name(group: str) -> tuple[str, bool]:
    """English round name, and False when the German name is not known."""
    text = re.sub(r"\s*\((hin|rück)spiel\)|\s*(hin|rück)spiel", "", group.strip(), flags=re.I)
    for pattern, label in _ROUNDS:
        m = pattern.search(text)
        if m:
            return label.format(*m.groups()), True
    return group.strip(), False


def _results(m: dict) -> tuple[dict[str, tuple[int, int]], list[str]]:
    out: dict[str, tuple[int, int]] = {}
    problems = []
    for r in m.get("matchResults") or []:
        kind, score = r.get("resultTypeKind"), (r.get("pointsTeam1"), r.get("pointsTeam2"))
        if kind in out and out[kind] != score:
            problems.append(f"two different {kind} scores {out[kind]} and {score}")
        out.setdefault(kind, score)
    return out, problems


def _goal_check(m: dict, final: tuple[int, int], shootout: bool) -> str | None:
    """The score after the last goal (or the number of goals) must equal the result.

    Shoot-out kicks are listed as penalty goals without a minute: they are left out."""
    goals = [g for g in m.get("goals") or []
             if not (shootout and g.get("isPenalty") and g.get("matchMinute") is None)]
    if not goals:
        return None if final == (0, 0) or not m.get("goals") else "goal list holds only shoot-out kicks"
    timed = [g for g in goals if g.get("matchMinute") is not None]
    if len(timed) == len(goals):
        last = max(timed, key=lambda g: (g["matchMinute"], g["scoreTeam1"] + g["scoreTeam2"]))
        after = (last["scoreTeam1"], last["scoreTeam2"])
        return None if after == final else f"result {final} but the goal list ends at {after}"
    # Some leagues are entered without minutes: compare the number of goals.
    return None if len(goals) == sum(final) else f"result {final} but {len(goals)} goals listed"


def parse_matches(data: list[dict], competition_code: str, season: int,
                  shortcut: str) -> list[MatchRecord]:
    records = []
    for m in data:
        issues: list[tuple[str, str]] = []
        group = (m.get("group") or {}).get("groupName") or ""
        rnd, known = round_name(group)
        if not known:
            issues.append(("unknown_round", f"round name {group!r} kept as is"))
        local = datetime.fromisoformat(m["matchDateTime"])
        kickoff = datetime.fromisoformat(m["matchDateTimeUTC"].replace("Z", "+00:00")).astimezone(UTC)
        outcome = None
        if m.get("matchIsFinished"):
            res, problems = _results(m)
            ninety = res.get("After90Minutes")
            final = res.get("AfterExtraTime") or ninety
            if ninety is None or None in ninety:
                problems.append("finished without a 90-minute score")
            else:
                check = _goal_check(m, final, "AfterPenalties" in res)
                if check:
                    problems.append(check)
                ht = res.get("HalfTime")
                if ht and (ht[0] > ninety[0] or ht[1] > ninety[1]):
                    problems.append(f"half-time score {ht} above the 90-minute score {ninety}")
            if problems:
                issues.extend(("result_inconsistent", p) for p in problems)
            else:
                hg, ag = ninety
                ht = res.get("HalfTime") or (None, None)
                aet, pens = res.get("AfterExtraTime"), res.get("AfterPenalties")
                outcome = OutcomeRecord(
                    hg, ag, "H" if hg > ag else "A" if hg < ag else "D",
                    ht_home_goals=ht[0], ht_away_goals=ht[1],
                    aet_home_goals=aet[0] if aet else None, aet_away_goals=aet[1] if aet else None,
                    pen_home=pens[0] if pens else None, pen_away=pens[1] if pens else None)
        records.append(MatchRecord(
            source_code=OPENLIGADB, external_id=f"{shortcut}|{season}|{m['matchID']}",
            competition_code=competition_code, season_start_year=season,
            kickoff_date=local.date(), kickoff_utc=kickoff,
            home_team=m["team1"]["teamName"].strip(), away_team=m["team2"]["teamName"].strip(),
            # A finished match whose result failed the checks stays scheduled: no result is
            # better than a wrong one, and the nightly check reports it as missing.
            status="finished" if outcome else "scheduled", outcome=outcome,
            round=rnd, neutral=rnd == "Final", issues=issues))
    return records


class OpenLigaDB:
    def __init__(self, settings: Settings, client: HttpClient | None = None):
        self.client = client or HttpClient(settings)
        self.raw_dir = Path(settings.data_dir) / "raw" / OPENLIGADB

    def fetch(self, competition_code: str, season: int) -> list[MatchRecord]:
        """Raise KeyError when no league is mapped for that competition and season."""
        shortcut = OPENLIGADB_LEAGUES[season][competition_code]
        response = self.client.get(f"{API_BASE}/getmatchdata/{shortcut}/{season}")
        path = self.raw_dir / str(season) / f"{shortcut}.json"
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(response.text, encoding="utf-8")
        return parse_matches(response.json(), competition_code, season, shortcut)
