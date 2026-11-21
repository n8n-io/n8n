"""Static catalog of sources and competitions, and its idempotent seeding.

Add a competition here and run `footintel db seed`. No schema change is needed.
"""

from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.orm import Session

from footintel.db.models import Competition, CompetitionSourceCode, DataSource

FOOTBALL_DATA = "football_data_uk"
API_FOOTBALL = "api_football"
OPENFOOTBALL = "openfootball"
OPENLIGADB = "openligadb"
FOOTBALL_DATA_ORG = "football_data_org"
THE_ODDS_API = "the_odds_api"
ONEFOOTBALL = "onefootball"
INTERNATIONAL = "intl_results"


@dataclass(frozen=True)
class SourceDef:
    code: str
    name: str
    kind: str
    base_url: str
    terms_url: str
    terms_note: str


@dataclass(frozen=True)
class CompetitionDef:
    code: str
    name: str
    country: str | None
    type: str
    # External code per source. A missing key means the source does not cover it.
    source_codes: dict[str, str]
    # Context leagues are imported only to rate the clubs met in European cups.
    is_target: bool = True
    # Starting Elo of a club in this league (assumption, see docs/DECISIONS.md D14).
    elo_prior: float = 1500.0
    # Three-letter code used by openfootball, e.g. "ENG" in "Arsenal FC (ENG)".
    country_code: str | None = None
    # Domestic cups: starting Elo of a club seen in no imported league (lower divisions).
    unknown_team_prior: float | None = None


SOURCES = [
    SourceDef(
        code=FOOTBALL_DATA,
        name="Football-Data.co.uk",
        kind="csv",
        base_url="https://www.football-data.co.uk",
        terms_url="https://www.football-data.co.uk/disclaimer.php",
        terms_note=(
            "Free CSV files. Leagues only (no cups, no UEFA competitions). "
            "Odds are pre-closing and closing prices without an exact capture time."
        ),
    ),
    SourceDef(
        code=API_FOOTBALL,
        name="API-Football (api-sports.io)",
        kind="api",
        base_url="https://v3.football.api-sports.io",
        terms_url="https://www.api-football.com/terms",
        terms_note="Needs an API key (header x-apisports-key). Quotas depend on the plan.",
    ),
    SourceDef(
        code=OPENFOOTBALL,
        name="openfootball (champions-league repository)",
        kind="text",
        base_url="https://github.com/openfootball/champions-league",
        terms_url="https://github.com/openfootball/football.json#license",
        terms_note=(
            "Public domain. UEFA results only, from 2011-12 (CL), 2020-21 (EL), 2021-22 "
            "(Conference League). No current season, no odds, no statistics."
        ),
    ),
    SourceDef(
        code=FOOTBALL_DATA_ORG,
        name="football-data.org",
        kind="api",
        base_url="https://api.football-data.org/v4",
        terms_url="https://www.football-data.org/about",
        terms_note=(
            "Free plan with a personal key (FOOTBALL_DATA_ORG_KEY): 12 competitions, scores "
            "delayed, 10 requests per minute. Used to check Champions League results. Odds "
            "and statistics are paid add-ons. Credit required: \"Data provided by "
            "football-data.org\". After the account ends, its data may no longer be shown."
        ),
    ),
    SourceDef(
        code=OPENLIGADB,
        name="OpenLigaDB",
        kind="api",
        base_url="https://api.openligadb.de",
        terms_url="https://api.openligadb.de/index.html",
        terms_note=(
            "Free, no key, 60 requests per minute and IP. Results are entered by volunteers: "
            "they can lag or contradict the goal list (checked at import). Used for the "
            "current season of the UEFA cups and the DFB-Pokal. No odds, no statistics."
        ),
    ),
    SourceDef(
        code=THE_ODDS_API,
        name="The Odds API",
        kind="api",
        base_url="https://api.the-odds-api.com/v4",
        terms_url="https://the-odds-api.com/terms-and-conditions.html",
        terms_note=(
            "Free plan with a personal key (ODDS_API_KEY): 500 credits per month. Storing the "
            "data and showing it in a dashboard are permitted; reselling it as a data service "
            "is not. Used for the 1X2 prices of the cups, which have no other free odds source."
        ),
    ),
    SourceDef(
        code=ONEFOOTBALL,
        name="OneFootball",
        kind="scraper",
        base_url="https://onefootball.com",
        terms_url="https://static.onefootball.com/legal/terms-of-use/en",
        terms_note=(
            "Terms 7.2 and 7.4: personal use only; copying, saving or processing the content "
            "is forbidden. Used anyway by an explicit owner decision (D50): personal use, "
            "nothing published, raw pages not kept. Line-ups, formations, events and shots "
            "of the four target leagues, current season."
        ),
    ),
    SourceDef(
        code=INTERNATIONAL,
        name="International football results (martj42)",
        kind="csv",
        base_url="https://github.com/martj42/international_results",
        terms_url="https://github.com/martj42/international_results/blob/master/LICENSE",
        terms_note=(
            "CC0 1.0 (public domain). Every men's national-team match since 1872, updated after "
            "each international window, with the goal scorers and minutes. No odds. Used to rate "
            "national teams (D82); upcoming matches come from the OneFootball calendar."
        ),
    ),
]

# The Odds API sport keys. Checked against /sports (free) before each call: a key that is
# not in season is skipped without spending credits. The leagues already have odds from
# football-data.co.uk, so they are left out to keep within the free quota.
ODDS_API_SPORTS = {"UEFA-CL": "soccer_uefa_champs_league", "UEFA-EL": "soccer_uefa_europa_league",
                   "UEFA-ECL": "soccer_uefa_europa_conference_league",
                   "GER-DFB": "soccer_germany_dfb_pokal",
                   # Bookmaker reference for the leagues and national cups too (D64). A key that
                   # /sports does not list as active costs no credit and is reported.
                   "ENG-PL": "soccer_epl", "ESP-LL": "soccer_spain_la_liga", "ITA-SA": "soccer_italy_serie_a",
                   "GER-BL": "soccer_germany_bundesliga", "FRA-L1": "soccer_france_ligue_one",
                   "ENG-FAC": "soccer_fa_cup", "ENG-EFL": "soccer_england_efl_cup",
                   "ESP-CDR": "soccer_spain_copa_del_rey", "ITA-CI": "soccer_italy_coppa_italia",
                   "FRA-CDF": "soccer_france_coupe_de_france",
                   # National teams (D82). Keys not in season cost nothing.
                   "INT-UNL": "soccer_uefa_nations_league", "INT-WC": "soccer_fifa_world_cup",
                   "INT-EURO": "soccer_uefa_european_championship", "INT-COPA": "soccer_conmebol_copa_america",
                   "INT-AFCON": "soccer_africa_cup_of_nations"}

# football-data.org codes (free plan). It never creates teams. For the cups it only checks
# matches that exist; for the four leagues it also adds the full season calendar and
# publishes results the same day (football-data.co.uk publishes them days later).
FOOTBALL_DATA_ORG_COMPETITIONS = {"UEFA-CL": "CL", "ENG-PL": "PL", "ITA-SA": "SA", "GER-BL": "BL1",
                                  "ESP-LL": "PD"}

# When two sources give a different score, the higher rank wins and the disagreement
# is logged. Volunteer-entered data rank lowest.
OUTCOME_SOURCE_RANK = {FOOTBALL_DATA: 3, FOOTBALL_DATA_ORG: 3, OPENFOOTBALL: 2, OPENLIGADB: 1, ONEFOOTBALL: 1}

# OpenLigaDB league shortcuts per season. They are chosen by hand: several community
# leagues can cover one competition (e.g. "ucl2026" is an empty copy of "ucl").
# Check https://api.openligadb.de/getavailableleagues before each new season.
OPENLIGADB_LEAGUES: dict[int, dict[str, str]] = {
    2026: {"UEFA-CL": "ucl", "UEFA-EL": "uel2026", "UEFA-ECL": "uecl2026", "GER-DFB": "dfb"},
}

# API-Football league ids are not listed here: they must be read from the
# /leagues endpoint with a real key before use (see docs/DATA_SOURCES.md).
FD_NEW = "new:"  # prefix for football-data.co.uk files under /new/ (one file per country)

COMPETITIONS = [
    CompetitionDef("ENG-PL", "Premier League", "England", "league", {FOOTBALL_DATA: "E0"},
                   country_code="ENG"),
    # National cups from OneFootball (D62). A club absent from the imported divisions plays
    # below them: same prior as the DFB-Pokal (D37), an assumption to check on results.
    CompetitionDef("ENG-FAC", "FA Cup", "England", "cup", {}, country_code="ENG", unknown_team_prior=1240),
    CompetitionDef("ENG-EFL", "EFL Cup", "England", "cup", {}, country_code="ENG", unknown_team_prior=1240),
    CompetitionDef("ESP-LL", "La Liga", "Spain", "league", {FOOTBALL_DATA: "SP1"},
                   country_code="ESP"),
    CompetitionDef("ESP-CDR", "Copa del Rey", "Spain", "cup", {}, country_code="ESP", unknown_team_prior=1240),
    CompetitionDef("ITA-SA", "Serie A", "Italy", "league", {FOOTBALL_DATA: "I1"},
                   country_code="ITA"),
    CompetitionDef("ITA-CI", "Coppa Italia", "Italy", "cup", {}, country_code="ITA", unknown_team_prior=1240),
    CompetitionDef("GER-BL", "Bundesliga", "Germany", "league", {FOOTBALL_DATA: "D1"},
                   country_code="GER"),
    # Clubs absent from the two imported German divisions play in the 3. Liga or lower:
    # about two tiers below the 2. Bundesliga prior (1400), as in England (D37).
    CompetitionDef("GER-DFB", "DFB-Pokal", "Germany", "cup", {}, country_code="GER",
                   unknown_team_prior=1240),
    CompetitionDef("UEFA-CL", "UEFA Champions League", None, "continental",
                   {OPENFOOTBALL: "cl.txt"}),
    CompetitionDef("UEFA-EL", "UEFA Europa League", None, "continental",
                   {OPENFOOTBALL: "el.txt"}),
    CompetitionDef("UEFA-ECL", "UEFA Conference League", None, "continental",
                   {OPENFOOTBALL: "conf.txt"}),
    # Ligue 1 and the Coupe de France are predicted since 2026-10-30 (D62).
    CompetitionDef("FRA-L1", "Ligue 1", "France", "league", {FOOTBALL_DATA: "F1"},
                   elo_prior=1480, country_code="FRA"),
    CompetitionDef("FRA-CDF", "Coupe de France", "France", "cup", {}, country_code="FRA",
                   unknown_team_prior=1240),
    # National teams (D82): rated by their own Elo model (models/national.py), never mixed with
    # the clubs. History from the martj42 results; fixtures and new results from OneFootball.
    CompetitionDef("INT-WC", "FIFA World Cup", None, "national", {}),
    CompetitionDef("INT-WCQ", "World Cup qualification", None, "national", {}),
    CompetitionDef("INT-EURO", "UEFA Euro", None, "national", {}),
    CompetitionDef("INT-EUROQ", "UEFA Euro qualification", None, "national", {}),
    CompetitionDef("INT-UNL", "UEFA Nations League", None, "national", {}),
    CompetitionDef("INT-AFCON", "Africa Cup of Nations", None, "national", {}),
    CompetitionDef("INT-AFCONQ", "Africa Cup of Nations qualification", None, "national", {}),
    CompetitionDef("INT-COPA", "Copa América", None, "national", {}),
    CompetitionDef("INT-ASIA", "AFC Asian Cup", None, "national", {}),
    CompetitionDef("INT-GOLD", "CONCACAF Gold Cup", None, "national", {}),
    CompetitionDef("INT-FRI", "International friendlies", None, "national", {}),
    CompetitionDef("INT-OTHER", "Other national-team matches", None, "national", {}, is_target=False),
    # Context leagues: domestic form of clubs met in European cups. Not predicted.
    CompetitionDef("NED-ERE", "Eredivisie", "Netherlands", "league", {FOOTBALL_DATA: "N1"},
                   is_target=False, elo_prior=1440, country_code="NED"),
    CompetitionDef("POR-PL", "Primeira Liga", "Portugal", "league", {FOOTBALL_DATA: "P1"},
                   is_target=False, elo_prior=1450, country_code="POR"),
    CompetitionDef("BEL-PRO", "Pro League", "Belgium", "league", {FOOTBALL_DATA: "B1"},
                   is_target=False, elo_prior=1420, country_code="BEL"),
    CompetitionDef("TUR-SL", "Süper Lig", "Turkey", "league", {FOOTBALL_DATA: "T1"},
                   is_target=False, elo_prior=1410, country_code="TUR"),
    CompetitionDef("SCO-PREM", "Scottish Premiership", "Scotland", "league",
                   {FOOTBALL_DATA: "SC0"}, is_target=False, elo_prior=1380, country_code="SCO"),
    CompetitionDef("GRE-SL", "Super League Greece", "Greece", "league", {FOOTBALL_DATA: "G1"},
                   is_target=False, elo_prior=1380, country_code="GRE"),
    CompetitionDef("AUT-BL", "Austrian Bundesliga", "Austria", "league",
                   {FOOTBALL_DATA: FD_NEW + "AUT"}, is_target=False, elo_prior=1390,
                   country_code="AUT"),
    CompetitionDef("SUI-SL", "Swiss Super League", "Switzerland", "league",
                   {FOOTBALL_DATA: FD_NEW + "SWZ"}, is_target=False, elo_prior=1390,
                   country_code="SUI"),
    CompetitionDef("DEN-SL", "Danish Superliga", "Denmark", "league",
                   {FOOTBALL_DATA: FD_NEW + "DNK"}, is_target=False, elo_prior=1370,
                   country_code="DEN"),
    CompetitionDef("NOR-ES", "Eliteserien", "Norway", "league", {FOOTBALL_DATA: FD_NEW + "NOR"},
                   is_target=False, elo_prior=1340, country_code="NOR"),
    CompetitionDef("SWE-AS", "Allsvenskan", "Sweden", "league", {FOOTBALL_DATA: FD_NEW + "SWE"},
                   is_target=False, elo_prior=1340, country_code="SWE"),
    CompetitionDef("POL-EK", "Ekstraklasa", "Poland", "league", {FOOTBALL_DATA: FD_NEW + "POL"},
                   is_target=False, elo_prior=1340, country_code="POL"),
    # Lower divisions: more training data, Elo links through promotion and relegation,
    # and the future opponents of top clubs in domestic cups.
    CompetitionDef("ENG-CH", "Championship", "England", "league", {FOOTBALL_DATA: "E1"},
                   is_target=False, elo_prior=1400, country_code="ENG"),
    CompetitionDef("ENG-L1", "League One", "England", "league", {FOOTBALL_DATA: "E2"},
                   is_target=False, elo_prior=1310, country_code="ENG"),
    CompetitionDef("ENG-L2", "League Two", "England", "league", {FOOTBALL_DATA: "E3"},
                   is_target=False, elo_prior=1240, country_code="ENG"),
    CompetitionDef("ENG-NL", "National League", "England", "league", {FOOTBALL_DATA: "EC"},
                   is_target=False, elo_prior=1170, country_code="ENG"),
    CompetitionDef("ESP-L2", "Segunda División", "Spain", "league", {FOOTBALL_DATA: "SP2"},
                   is_target=False, elo_prior=1390, country_code="ESP"),
    CompetitionDef("ITA-SB", "Serie B", "Italy", "league", {FOOTBALL_DATA: "I2"},
                   is_target=False, elo_prior=1380, country_code="ITA"),
    CompetitionDef("GER-B2", "2. Bundesliga", "Germany", "league", {FOOTBALL_DATA: "D2"},
                   is_target=False, elo_prior=1400, country_code="GER"),
    CompetitionDef("FRA-L2", "Ligue 2", "France", "league", {FOOTBALL_DATA: "F2"},
                   is_target=False, elo_prior=1360, country_code="FRA"),
    CompetitionDef("SCO-CH", "Scottish Championship", "Scotland", "league",
                   {FOOTBALL_DATA: "SC1"}, is_target=False, elo_prior=1250, country_code="SCO"),
    CompetitionDef("SCO-L1", "Scottish League One", "Scotland", "league",
                   {FOOTBALL_DATA: "SC2"}, is_target=False, elo_prior=1180, country_code="SCO"),
    CompetitionDef("SCO-L2", "Scottish League Two", "Scotland", "league",
                   {FOOTBALL_DATA: "SC3"}, is_target=False, elo_prior=1130, country_code="SCO"),
]

COMPETITION_BY_CODE = {c.code: c for c in COMPETITIONS}
COUNTRY_BY_CODE = {c.country_code: c.country for c in COMPETITIONS if c.country_code and c.country}


def seed_catalog(session: Session) -> dict[str, int]:
    """Insert or update sources and competitions. Safe to run many times."""
    created = {"sources": 0, "competitions": 0, "codes": 0}
    sources: dict[str, DataSource] = {}
    for sdef in SOURCES:
        src = session.scalar(select(DataSource).where(DataSource.code == sdef.code))
        if src is None:
            src = DataSource(code=sdef.code)
            session.add(src)
            created["sources"] += 1
        src.name, src.kind, src.base_url = sdef.name, sdef.kind, sdef.base_url
        src.terms_url, src.terms_note = sdef.terms_url, sdef.terms_note
        sources[sdef.code] = src
    session.flush()

    for cdef in COMPETITIONS:
        comp = session.scalar(select(Competition).where(Competition.code == cdef.code))
        if comp is None:
            comp = Competition(code=cdef.code)
            session.add(comp)
            created["competitions"] += 1
        comp.name, comp.country, comp.type = cdef.name, cdef.country, cdef.type
        comp.is_target = cdef.is_target
        session.flush()
        for source_code, external in cdef.source_codes.items():
            src = sources[source_code]
            exists = session.scalar(
                select(CompetitionSourceCode).where(
                    CompetitionSourceCode.source_id == src.id,
                    CompetitionSourceCode.external_code == external,
                )
            )
            if exists is None:
                session.add(
                    CompetitionSourceCode(
                        competition_id=comp.id, source_id=src.id, external_code=external
                    )
                )
                created["codes"] += 1
    session.flush()
    return created


def get_source(session: Session, code: str) -> DataSource:
    src = session.scalar(select(DataSource).where(DataSource.code == code))
    if src is None:
        raise LookupError(f"Source {code!r} is not seeded. Run `footintel db seed`.")
    return src
