#!/bin/bash
set -e

# TestBot Setup Script for n8n
# This script builds n8n from source and starts the service

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$ROOT_DIR"
echo "Installing dependencies..."
corepack enable
pnpm install --no-frozen-lockfile

echo "Building n8n from source in $ROOT_DIR..."
N8N_SKIP_LICENSES=true node scripts/build-n8n.mjs

cd "$SCRIPT_DIR"
echo "Building Docker image..."
docker compose build

echo "Starting n8n service..."
docker compose up -d

echo "Waiting for n8n to be healthy..."
TIMEOUT=120
ELAPSED=0
until curl -sf http://localhost:5678/healthz > /dev/null 2>&1; do
  if [ "$ELAPSED" -ge "$TIMEOUT" ]; then
    echo "ERROR: n8n failed to become healthy within ${TIMEOUT}s"
    echo "--- n8n logs ---"
    docker compose logs n8n --tail 50
    echo "--- postgres logs ---"
    docker compose logs postgres --tail 20
    exit 1
  fi
  sleep 5
  ELAPSED=$((ELAPSED + 5))
  echo "  waiting... (${ELAPSED}s)"
done

echo "Checking container status..."
docker compose ps

echo "✓ n8n setup complete"
