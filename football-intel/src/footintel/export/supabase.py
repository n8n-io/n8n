"""Copy the dashboard answers to Supabase for the private site (D57, DEPLOYMENT_PLAN section 10).

Each read endpoint of /api/dash is called in-process. Its JSON answer is stored in the
`snapshots` table under the path the dashboard asks for. Row level security lets only
approved accounts read it. Rows that the run did not refresh (past matches) are deleted.
"""

import json
import logging
from datetime import UTC, datetime

import httpx

log = logging.getLogger(__name__)

PREFIX = "/api/dash"
SCORE_CELLS = range(6)  # heatmap rows and columns 0..5 (5 means 5+)
BATCH_BYTES = 2_000_000


def snapshot_paths(get) -> list[str]:
    """Every path the dashboard can ask for, discovered from the list endpoints."""
    paths = ["/overview", "/competitions", "/home", "/performance", "/value-board", "/tickets", "/bilan", "/lecture",
             "/matches/upcoming"]
    competitions = get("/competitions") or []
    for c in competitions:
        if c.get("matches"):
            paths.append(f"/competition/{c['code']}")
        if c.get("is_target") and c.get("matches"):
            paths += [f"/matches?competition={c['code']}&home_goals={h}&away_goals={a}&limit=200"
                      for h in SCORE_CELLS for a in SCORE_CELLS]
        if c.get("is_target") and c.get("type") == "league":
            paths.append(f"/teams?competition={c['code']}")
            paths += [f"/team/{t['id']}" for t in get(f"/teams?competition={c['code']}") or []]
    for m in (get("/home") or {}).get("matches", []):
        if not m.get("detail", True):
            continue  # far fixtures without probabilities: listed only, no match page
        paths += [f"/match/{m['id']}", f"/match/{m['id']}/insights", f"/match/{m['id']}/players"]
    return list(dict.fromkeys(paths))


def collect(client) -> tuple[dict[str, object], list[str]]:
    """Call every path. A failing path is reported and left out; the others still go."""
    cache: dict[str, object] = {}
    failed: list[str] = []

    def get(path: str):
        if path in cache:
            return cache[path]
        r = client.get(PREFIX + path)
        if r.status_code != 200:
            failed.append(f"{path} -> {r.status_code}")
            return None
        cache[path] = r.json()
        return cache[path]

    for path in snapshot_paths(get):
        get(path)
    return cache, failed


def _batches(rows: list[dict]):
    batch, size = [], 0
    for row in rows:
        n = len(json.dumps(row, ensure_ascii=False))
        if batch and size + n > BATCH_BYTES:
            yield batch
            batch, size = [], 0
        batch.append(row)
        size += n
    if batch:
        yield batch


def push(url: str, secret_key: str, data: dict[str, object], timeout: float = 120.0) -> dict:
    """Upsert the snapshots, then delete the rows this run did not write."""
    stamp = datetime.now(UTC).isoformat()
    headers = {"apikey": secret_key, "Authorization": f"Bearer {secret_key}",
               "Content-Type": "application/json"}
    rows = [{"path": p, "body": b, "updated_at": stamp} for p, b in data.items()]
    endpoint = f"{url.rstrip('/')}/rest/v1/snapshots"
    with httpx.Client(timeout=timeout) as http:
        for batch in _batches(rows):
            r = http.post(endpoint, params={"on_conflict": "path"}, json=batch,
                          headers={**headers, "Prefer": "resolution=merge-duplicates,return=minimal"})
            r.raise_for_status()
        r = http.delete(endpoint, params={"updated_at": f"lt.{stamp}"},
                        headers={**headers, "Prefer": "return=representation"})
        r.raise_for_status()
        deleted = len(r.json())
    return {"written": len(rows), "deleted": deleted, "at": stamp}


def export(url: str, secret_key: str) -> dict:
    from fastapi.testclient import TestClient

    from footintel.api.app import app

    with TestClient(app) as client:
        data, failed = collect(client)
    if "/home" not in data:
        raise RuntimeError("the /home answer is missing: nothing pushed")
    result = push(url, secret_key, data)
    result["failed"] = failed
    log.info("Supabase export: %s written, %s deleted, %s failed",
             result["written"], result["deleted"], len(failed))
    return result
