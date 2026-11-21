#!/usr/bin/env bash
# First data load on a new server: history, current season, model, first predictions.
# Run by footintel-bootstrap.service (deploy/install.sh). Safe to re-run: imports are idempotent.
set -euo pipefail
cd "$(dirname "$0")/.."
F=.venv/bin/footintel
step() { echo "== $* ($(date '+%H:%M'))"; "$F" "$@"; }
# A source that is down must not block the rest: the daily cycles retry it.
optional() { step "$@" || echo "!! $* failed, continuing"; }

step ingest history --first 2005
optional ingest context --first 2005
optional ingest european
optional ingest openligadb
optional ingest football-data-org
optional ingest fixtures
optional ingest odds-api
# Trains the deployed model and promotes it only if it beats the naive baseline (no active model yet).
step run weekly
step run morning
touch /var/lib/footintel/.bootstrapped
echo "== done ($(date '+%H:%M'))"
