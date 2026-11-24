"""Map team names of one source to the canonical teams of another.

openfootball writes "Club Atlético de Madrid (ESP)"; football-data.co.uk writes
"Ath Madrid". Order of resolution:
1. Manual aliases in reference/team_aliases.csv (checked by a human).
2. Automatic match among clubs of the same country that played a domestic league
   in the same or an adjacent season, if the best score is clearly ahead.
3. Otherwise a new team is created and a data quality issue is logged, so the
   alias can be added by hand. A wrong merge is worse than a missing one.
"""

import csv
import re
import unicodedata
from dataclasses import dataclass
from difflib import SequenceMatcher
from pathlib import Path

from sqlalchemy import text
from sqlalchemy.orm import Session

from footintel.catalog import COUNTRY_BY_CODE

ALIAS_FILE = Path(__file__).resolve().parent.parent / "reference" / "team_aliases.csv"

# Words that carry no identity ("FC", "Club") are dropped before comparing.
STOPWORDS = {
    "fc", "cf", "ac", "afc", "sc", "sk", "fk", "ssc", "as", "ss", "us", "club", "de", "del",
    "futbol", "football", "calcio", "sl", "sport", "sporting", "clube", "e", "cd", "ud", "rc",
    "rcd", "sv", "vfl", "vfb", "tsg", "bv", "bsc", "1", "fsv", "ogc", "osc", "losc",
    "sad", "spa", "aj", "acf", "if", "bk", "ff", "kv", "krc", "kaa", "rsc", "royal", "cp",
    "and", "the", "of", "y", "the", "pfc", "gnk", "nk", "hnk", "ks", "mks", "kks", "jk", "olympique",
}
# football-data.co.uk spellings of common words; "" drops the word.
SYNONYMS = {
    "munchen": "munich", "internazionale": "inter", "atletico": "ath", "athletic": "ath",
    "manchester": "man", "borussia": "", "monchengladbach": "mgladbach", "lisboa": "",
    "eintracht": "", "olympiacos": "olympiakos", "piraeus": "",
    "1899": "", "1893": "", "1909": "", "1907": "", "1913": "",
}


def normalize(name: str) -> str:
    name = re.sub(r"\s\([A-Z]{3}\)$", "", name)
    name = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode().lower()
    tokens = re.split(r"[^a-z0-9]+", name)
    out = []
    for tok in tokens:
        if not tok or tok in STOPWORDS:
            continue
        tok = SYNONYMS.get(tok, tok)
        out.extend(t for t in tok.split() if t)
    return " ".join(out)


def similarity(a: str, b: str) -> float:
    na, nb = normalize(a), normalize(b)
    if not na or not nb:
        return 0.0
    if na == nb:
        return 1.0
    ta, tb = set(na.split()), set(nb.split())
    jaccard = len(ta & tb) / len(ta | tb)
    # No "one name contains the other" rule: it merged Paris Saint-Germain into
    # Paris FC during the review of real names.
    return max(jaccard, SequenceMatcher(None, na, nb).ratio())


def load_manual_aliases(path: Path = ALIAS_FILE) -> dict[tuple[str, str], str]:
    """(source, alias) -> canonical team name."""
    if not path.exists():
        return {}
    with path.open(encoding="utf-8") as f:
        rows = [r for r in csv.DictReader(line for line in f if not line.startswith("#"))]
    return {(r["source"].strip(), r["alias"].strip()): r["team"].strip() for r in rows}


@dataclass
class Resolution:
    team_name: str | None
    method: str  # manual | automatic | unresolved
    score: float = 0.0
    runner_up: str | None = None


class TeamResolver:
    MIN_SCORE = 0.6
    MIN_MARGIN = 0.15

    def __init__(self, session: Session, source_code: str):
        self.s = session
        self.source_code = source_code
        self.manual = load_manual_aliases()
        self._candidates: dict[tuple[str, int], list[str]] = {}

    def _domestic_teams(self, country: str, season: int) -> list[str]:
        key = (country, season)
        if key not in self._candidates:
            rows = self.s.execute(text("""
                SELECT DISTINCT t.name FROM matches m
                JOIN competitions c ON c.id = m.competition_id
                JOIN seasons se ON se.id = m.season_id
                JOIN teams t ON t.id IN (m.home_team_id, m.away_team_id)
                WHERE c.type = 'league' AND c.country = :country
                  AND se.start_year BETWEEN :y0 AND :y1"""),
                {"country": country, "y0": season - 1, "y1": season + 1}).scalars().all()
            self._candidates[key] = list(rows)
        return self._candidates[key]

    def resolve_in_country(self, raw_name: str, country: str, season: int) -> Resolution:
        """Like resolve(), for a source that does not tag names with a country code."""
        scored = sorted(((similarity(raw_name, c), c) for c in self._domestic_teams(country, season)),
                        reverse=True)
        if not scored:
            return Resolution(None, "unresolved")
        best_score, best = scored[0]
        second_score = scored[1][0] if len(scored) > 1 else 0.0
        if (best_score == 1.0 and second_score < 1.0) or (
                best_score >= self.MIN_SCORE and best_score - second_score >= self.MIN_MARGIN):
            return Resolution(best, "automatic", best_score, scored[1][1] if len(scored) > 1 else None)
        return Resolution(None, "unresolved", best_score, best)

    def resolve(self, raw_name: str, season: int) -> Resolution:
        manual = self.manual.get((self.source_code, raw_name))
        if manual:
            return Resolution(manual, "manual", 1.0)
        m = re.search(r"\(([A-Z]{3})\)$", raw_name)
        country = COUNTRY_BY_CODE.get(m[1]) if m else None
        if country is None:
            return Resolution(None, "unresolved")
        scored = sorted(((similarity(raw_name, c), c) for c in self._domestic_teams(country, season)),
                        reverse=True)
        if not scored:
            return Resolution(None, "unresolved")
        best_score, best = scored[0]
        second_score, second = scored[1] if len(scored) > 1 else (0.0, None)
        exact_and_unique = best_score == 1.0 and second_score < 1.0
        if exact_and_unique or (best_score >= self.MIN_SCORE
                                and best_score - second_score >= self.MIN_MARGIN):
            return Resolution(best, "automatic", best_score, second)
        return Resolution(None, "unresolved", best_score, best)


# Every column that points at teams.id. Kept in one place so a merge cannot miss one.
TEAM_FK_COLUMNS = [
    ("matches", "home_team_id"), ("matches", "away_team_id"), ("team_aliases", "team_id"),
    ("team_match_statistics", "team_id"), ("team_match_tactics", "team_id"),
    ("player_match_statistics", "team_id"), ("lineups", "team_id"), ("injuries", "team_id"),
    ("suspensions", "team_id"), ("match_events", "team_id"), ("news_items", "team_id"),
]


def merge_team(session: Session, from_id: int, into_id: int) -> None:
    """Move every row of team `from_id` to `into_id`, then delete `from_id`."""
    for table, col in TEAM_FK_COLUMNS:
        session.execute(text(f"UPDATE {table} SET {col} = :into WHERE {col} = :from"),
                        {"into": into_id, "from": from_id})
    session.execute(text("DELETE FROM teams WHERE id = :from"), {"from": from_id})


def apply_manual_aliases(session: Session, source_id: int, source_code: str) -> int:
    """Apply aliases added to the CSV after a team was already created unresolved."""
    merged = 0
    for (src, alias), team_name in load_manual_aliases().items():
        if src != source_code:
            continue
        current = session.execute(text(
            "SELECT a.team_id, t.name FROM team_aliases a JOIN teams t ON t.id = a.team_id "
            "WHERE a.source_id = :s AND a.alias = :a"), {"s": source_id, "a": alias}).first()
        target = session.execute(text("SELECT id FROM teams WHERE name = :n"),
                                 {"n": team_name}).scalar()
        if current is None or target is None or current.team_id == target:
            continue
        merge_team(session, current.team_id, target)
        merged += 1
    return merged


def backfill_team_countries(session: Session) -> None:
    """Set teams.country from the domestic league a team plays in."""
    session.execute(text("""
        UPDATE teams t SET country = sub.country FROM (
            SELECT DISTINCT ON (tid) tid, country FROM (
                SELECT m.home_team_id AS tid, c.country, count(*) AS n FROM matches m
                JOIN competitions c ON c.id = m.competition_id
                WHERE c.type = 'league' AND c.country IS NOT NULL GROUP BY 1, 2
            ) x ORDER BY tid, n DESC
        ) sub WHERE t.id = sub.tid AND t.country IS NULL"""))
