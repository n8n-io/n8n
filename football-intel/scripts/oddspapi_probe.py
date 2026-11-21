"""One-off probe of OddsPapi (https://oddspapi.io/en/docs): what betPawa offers there.

Spends 4 of the 250 monthly requests (bookmakers, tournaments, markets, fixtures);
historical odds are free. Prints a summary and writes the raw answers to OUT_DIR,
never the key. Run: ODDS_PAPI_KEY=... python scripts/oddspapi_probe.py
"""

import json
import os
import sys
import time
from datetime import UTC, datetime, timedelta
from pathlib import Path

import httpx

BASE = "https://api.oddspapi.io/v4"
KEY = os.environ.get("ODDS_PAPI_KEY", "").strip()
OUT = Path(os.environ.get("OUT_DIR", "oddspapi-probe"))
LEAGUES = {("england", "premier-league"), ("germany", "bundesliga"), ("spain", "laliga"),
           ("italy", "serie-a"), ("france", "ligue-1")}
SAMPLE = 6


def get(path: str, **params):
    for _ in range(4):
        r = httpx.get(f"{BASE}{path}", params={"apiKey": KEY, **params}, timeout=60)
        if r.status_code != 429:
            break
        # Each endpoint has a cooldown of a few seconds; the answer says how long.
        time.sleep(float(r.json().get("error", {}).get("retryMs", 3000)) / 1000 + 0.5)
    if r.status_code >= 400:
        sys.exit(f"{path}: HTTP {r.status_code} {r.text[:300].replace(KEY, '***')}")
    data = r.json()
    (OUT / f"{path.strip('/').replace('/', '_')}-{params.get('fixtureId', '')}.json").write_text(
        json.dumps(data, indent=1), encoding="utf-8")
    return data


def last_price(history: list[dict], start: str) -> float | None:
    """Last price of one outcome before kick-off (later entries are in-play prices)."""
    rows = sorted((h for h in history if h.get("price") and h["createdAt"] < start),
                  key=lambda h: h["createdAt"])
    return rows[-1]["price"] if rows else None


def main() -> None:
    if not KEY:
        sys.exit("ODDS_PAPI_KEY is not set")
    OUT.mkdir(parents=True, exist_ok=True)
    books = get("/bookmakers")
    slugs = [b.get("slug") or b.get("bookmaker") for b in books] if isinstance(books, list) else list(books)
    pawa = [s for s in slugs if s and "pawa" in s.lower()]
    print("betPawa slugs:", pawa, "| pinnacle:", "pinnacle" in slugs)

    tours = get("/tournaments", sportId=10)
    ids = {}
    for t in tours:
        key = (t.get("categorySlug"), t.get("tournamentSlug"))
        if key in LEAGUES:
            ids[key] = t.get("tournamentId")
    print("Tournament ids:", ids)

    markets = {str(m["marketId"]): m for m in get("/markets") if m.get("sportId") == 10}
    print(f"Soccer markets known: {len(markets)}")

    pl = ids.get(("england", "premier-league"))
    if not pl:
        sys.exit("Premier League tournament id not found")
    since = (datetime.now(UTC) - timedelta(days=12)).strftime("%Y-%m-%dT%H:%M:%SZ")
    fixtures = [f for f in get("/fixtures", tournamentId=pl, **{"from": since}) if f.get("statusId") == 2]
    print(f"Finished PL fixtures since {since[:10]}: {len(fixtures)}")

    book = pawa[0] if pawa else "betpawa.cm"
    seen: dict[str, int] = {}
    for f in fixtures[:SAMPLE]:
        hist = get("/historical-odds", fixtureId=f["fixtureId"], bookmakers=f"pinnacle,{book}")
        b = hist.get("bookmakers", {})
        line = f"{f['participant1Name']} - {f['participant2Name']}:"
        for slug in ("pinnacle", book):
            mk = b.get(slug, {}).get("markets", {})
            line += f" {slug} {len(mk)} markets;"
            if slug == book:
                for mid in mk:
                    seen[mid] = seen.get(mid, 0) + 1
            one = mk.get("101", {}).get("outcomes", {})
            prices = [last_price(one.get(o, {}).get("players", {}).get("0", []), f["startTime"][:19])
                      for o in ("101", "102", "103")]
            line += f" 1X2 {prices};"
        print(line)

    print(f"\n{book} markets over {min(SAMPLE, len(fixtures))} fixtures (id, fixtures, name, line):")
    for mid, n in sorted(seen.items(), key=lambda kv: -kv[1]):
        m = markets.get(mid, {})
        print(f"  {mid:>6} {n} {m.get('marketName', '?')} {m.get('period', '')} {m.get('handicap', '')}"
              f" -> {[o.get('outcomeName') for o in m.get('outcomes', [])]}")


if __name__ == "__main__":
    main()
