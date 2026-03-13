#!/bin/bash
set -e

# TestBot Setup Script for n8n
# This script builds n8n from source and starts the service

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$ROOT_DIR"
echo "Installing dependencies..."
corepack enable
pnpm install --frozen-lockfile

echo "Building n8n from source in $ROOT_DIR..."
N8N_SKIP_LICENSES=true node scripts/build-n8n.mjs

cd "$SCRIPT_DIR"
echo "Building Docker image..."
docker compose build

echo "Starting n8n service..."
docker compose up -d

echo "Waiting for service to be ready..."
sleep 10

echo "Checking container status..."
docker compose ps

echo "✓ n8n setup complete"
