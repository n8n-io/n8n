---
name: football-data-sources
description: Football (soccer) data sources for the football-intel project and any football analytics work - which source gives what (results, odds, line-ups, events, xG, tracking, absences), its licence or terms, whether it is reachable from the cloud container, the decisions already taken (D36, D49, D50, D55, Transfermarkt) and how to read each format (soccerdata, StatsBomb/Hudl open data, football.json, OneFootball, Sofascore scraper). Use before adding, testing or proposing any new football data source, scraper or feature, or when the user mentions FBref, Understat, Transfermarkt, Sofascore, StatsBomb, Opta, Wyscout, xG, compositions, blessures, cotes.
---

# Football data sources

Read `football-intel/docs/DATA_SOURCES.md` and `football-intel/docs/DECISIONS.md` first:
they are the source of truth. This skill is the quick map.

## Rule before adding any source

1. What does it give that we do not have? (A new column is not a gain.)
2. Licence or terms of use, and `robots.txt`. A permissive `robots.txt` does not override
   terms that forbid bots.
3. Reachable from where the pipeline runs? (cloud container, then the VPS).
4. Out-of-sample test with the D9 rule (≥ 300 test matches, log-loss gain ≥ 0.002, CI
   below 0) **and** `footintel clv` before any collection at scale.
5. A source the user approves against its terms gets its own decision (like D50) with
   safeguards: personal use, nothing published, no raw pages stored, no protection bypass.

## Map of sources (status 2026-10-29)

| Source | Gives | Terms | Status |
|---|---|---|---|
| football-data.co.uk | Results, shots, cards, pre-closing and closing odds (Pinnacle, average, max) since 2005 | Free use | In use (core of the model) |
| openfootball (football.json, champions-league) | Fixtures and scores, JSON | CC0 public domain | In use for cups; football.json is late for 2026-27 |
| OpenLigaDB | Current European cups, DFB-Pokal | ODbL 1.0 | In use |
| football-data.org | Fixtures, same-day results | Free tier, attribution | In use |
| The Odds API | Current odds of ~20 bookmakers | API key | In use for display; model does not read them (D49) |
| OneFootball | Line-ups, formations, events, possession | Terms forbid bots | In use by owner decision (D50) |
| Understat | xG per shot | robots.txt `Disallow: /` | Tested via a GitHub republication: no gain (D55). Not collected |
| Transfermarkt | Injuries, suspensions, market values | Terms 11.1 forbid bots **and** use for machine learning | Excluded |
| FBref | Advanced stats | Returns 403 to the container | Not usable from here |
| Sofascore | Everything, live | Terms forbid collection (D36) | Scraper installed; 403 from the container. Residential connection approved by the owner (D56): set `SOFASCORE_CLIENT__PROXY` (env only), 1 req/s, breaker on |
| ESPN (site.api.espn.com) | Schedules, match sheets, line-ups | Terms not yet checked | Reachable (200). Candidate for line-ups: check terms first |
| ClubElo | Elo history | Free | API returned 502 from the container; tested in D48, no gain |
| StatsBomb / Hudl open data | Full event data (+ 360 freeze frames) for selected competitions | Free, cite StatsBomb with logo | Not for the model (isolated seasons); useful to learn event models (xG, xT) |
| Wyscout public dataset (Pappalardo et al.), Metrica sample tracking | Events / tracking for research | Research licences | Learning only |

## Reading the formats

**soccerdata** (Python, Apache-2.0; venv `/home/user/tools/venvs/soccerdata`, not in the
football-intel dependencies):

```python
import soccerdata as sd
espn = sd.ESPN(leagues="ENG-Premier League", seasons="2025")
schedule = espn.read_schedule()
lineups = espn.read_lineup(match_id=...)       # check ESPN terms before any real use
history = sd.MatchHistory("ENG-Premier League", "2025").read_games()  # football-data.co.uk
```

Readers: ClubElo, ESPN, FBref, MatchHistory, SoFIFA, Sofascore, Understat, WhoScored.
Each one hits the original site: the site's terms apply, not the library's licence.

**StatsBomb / Hudl open data** (`data/competitions.json` → `data/matches/<competition>/<season>.json`
→ `data/events/<match_id>.json`, `data/lineups/`, `data/three-sixty/`): one JSON list of
events per match; each event has `type.name`, `team`, `player`, `minute`, `second`,
`location` [x, y] on a 120 × 80 pitch; shots carry `shot.statsbomb_xg` and
`shot.outcome`. Publications must credit StatsBomb with its logo.

**football.json**: `{"name", "matches": [{"round", "date", "time", "team1", "team2",
"score": {"ht": [h, a], "ft": [h, a]}}]}`; team names need the alias table.

**Sofascore scraper** (`/home/user/tools/venvs/sofascore/bin/ssc`, Python 3.14 venv):
`ssc doctor`, `ssc fetch tournament <id> --season <id> --rate 1 --data-dir <dir>`,
`ssc export`. Blocked from the cloud container (403); would need a residential
connection: D56 allows one residential proxy (or the owner's home connection) through
`SOFASCORE_CLIENT__PROXY`; no rotation to raise throughput, keep the circuit breaker.

**worldfootballR** (R, GPL-3): wraps FBref, Transfermarkt (injuries, suspensions,
market values) and Understat. R is not installed and both main sites are excluded.

## Results already measured (do not re-test without new data)

- Line-ups (rotation, missing regulars, formation change): no gain on 44 / 117 matches (D51).
- ClubElo: −0.0007, below threshold (D48).
- Market blend: −0.0006, below threshold (D54).
- Understat xG: +0.0008, worse (D55).
- CLV at average price: −2.5 %; the model does not beat the closing line (D54).

What remains untested and may carry information the morning market does not have:
confirmed absences close to kick-off.

## Gotchas

- Team names differ in every source: always go through `reference/team_aliases.csv`,
  and have the user validate new aliases before writing them.
- Shot files can change column names between seasons (Understat: `h_a` became
  `home_away` in 2022-23). Check coverage per season before reading a result.
- "Best price" (maximum across bookmakers) shows a positive CLV even without a model:
  never use it as proof of an edge.
