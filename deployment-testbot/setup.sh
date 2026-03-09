#!/bin/bash
set -e

# TestBot Setup Script for n8n
# This script starts n8n service

cd "$(dirname "$0")"

echo "Current directory: $(pwd)"
echo "Starting n8n service..."
docker compose up -d

echo "Waiting for service to be ready..."
sleep 10

echo "Checking container status..."
docker compose ps

echo "✓ n8n setup complete"
