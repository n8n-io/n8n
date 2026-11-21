"""International results (martj42/international_results, CC0): every men's national-team
match since 1872, with the tournament and whether the ground was neutral (D82).

The two CSV files are downloaded once a day and kept in DATA_DIR/international. When the
download fails, the last copy is used.
"""

import logging
from pathlib import Path

import pandas as pd

from footintel.config import Settings
from footintel.connectors.http import HttpClient, SourceUnavailable

log = logging.getLogger(__name__)

BASE = "https://raw.githubusercontent.com/martj42/international_results/master"
FILES = ("results.csv", "goalscorers.csv")

# Tournament name in the file -> our competition code and its weight (models/national.py).
TOURNAMENTS = {
    "FIFA World Cup": ("INT-WC", "world_cup"),
    "FIFA World Cup qualification": ("INT-WCQ", "qualifier"),
    "UEFA Euro": ("INT-EURO", "continental"),
    "UEFA Euro qualification": ("INT-EUROQ", "qualifier"),
    "UEFA Nations League": ("INT-UNL", "qualifier"),
    "African Cup of Nations": ("INT-AFCON", "continental"),
    "African Cup of Nations qualification": ("INT-AFCONQ", "qualifier"),
    "Copa América": ("INT-COPA", "continental"),
    "AFC Asian Cup": ("INT-ASIA", "continental"),
    "Gold Cup": ("INT-GOLD", "continental"),
    "Friendly": ("INT-FRI", "friendly"),
}
# Our codes for the matches of other tournaments, by weight.
OTHER = ("INT-OTHER", "tournament")


def kind_of(tournament: str) -> tuple[str, str]:
    """(competition code, weight) of a tournament name."""
    if tournament in TOURNAMENTS:
        return TOURNAMENTS[tournament]
    if "qualification" in tournament or "Nations League" in tournament:
        return "INT-OTHER", "qualifier"
    return OTHER


# Kind of each of our national competitions, for matches stored in the database.
KIND_BY_CODE = {code: kind for code, kind in TOURNAMENTS.values()} | {"INT-OTHER": "tournament"}

# OneFootball spelling -> spelling in the results file (checked on 2026-11-16).
ONEFOOTBALL_NAMES = {
    "Bosnia & Herzegovina": "Bosnia and Herzegovina", "CAR": "Central African Republic",
    "Cabo Verde": "Cape Verde", "China PR": "China", "Chinese Taipei": "Taiwan", "Czechia": "Czech Republic",
    "Côte d'Ivoire": "Ivory Coast", "DPR Korea": "North Korea", "Ireland": "Republic of Ireland",
    "Korea Republic": "South Korea", "Kyrgyz Republic": "Kyrgyzstan", "São Tomé": "São Tomé and Príncipe",
    "Türkiye": "Turkey", "USA": "United States", "IR Iran": "Iran", "Congo DR": "DR Congo",
    "St. Kitts and Nevis": "Saint Kitts and Nevis", "St. Vincent": "Saint Vincent and the Grenadines",
    "St. Lucia": "Saint Lucia", "US Virgin Islands": "United States Virgin Islands",
}


def download(settings: Settings) -> Path:
    """Refresh the CSV files in DATA_DIR/international; keep the last copy on failure."""
    folder = Path(settings.data_dir) / "international"
    folder.mkdir(parents=True, exist_ok=True)
    try:
        with HttpClient(settings) as client:
            for name in FILES:
                text = client.get(f"{BASE}/{name}").text
                if not text.startswith("date,"):
                    raise SourceUnavailable(f"{name}: unexpected content")
                (folder / name).write_text(text, encoding="utf-8")
    except Exception as exc:  # an old copy is still usable
        if not (folder / FILES[0]).exists():
            raise
        log.warning("international results not refreshed (%s): using the last copy", exc)
    return folder


def load(folder: Path) -> pd.DataFrame:
    """Matches as date, home, away, home_goals, away_goals, tournament, code, kind, neutral."""
    df = pd.read_csv(folder / "results.csv")
    df = df.rename(columns={"home_team": "home", "away_team": "away",
                            "home_score": "home_goals", "away_score": "away_goals"})
    df["date"] = pd.to_datetime(df["date"])
    kinds = df["tournament"].astype(str).map(kind_of)
    df["code"], df["kind"] = kinds.str[0], kinds.str[1]
    df["neutral"] = df["neutral"].astype(str).str.upper() == "TRUE"
    return df[["date", "home", "away", "home_goals", "away_goals", "tournament", "code", "kind", "neutral"]]
