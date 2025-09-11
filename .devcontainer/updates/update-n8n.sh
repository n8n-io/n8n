#!/bin/bash
echo "=== N8N UPDATE ONLY ==="
cd "$(dirname "$0")/.."

# Get latest release from YOUR repo
LATEST_VERSION=$(curl -s https://api.github.com/repos/YOURNAME/n8n-advanced/releases/latest | jq -r '.tag_name')

docker-compose down
docker pull n8nio/n8n:$LATEST_VERSION  # Use YOUR synced version
docker-compose build n8n-advanced
docker-compose up -d