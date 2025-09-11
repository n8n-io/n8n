#!/bin/bash
echo "=== POSTGRES UPDATE ONLY ==="
cd "$(dirname "$0")/.."
docker-compose stop postgres
docker pull postgres:latest
docker-compose up -d postgres
echo "=== POSTGRES UPDATE COMPLETED ==="