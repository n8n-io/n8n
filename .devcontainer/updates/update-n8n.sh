#!/bin/bash
echo "=== N8N UPDATE ONLY ==="
#!/bin/bash
cd "$(dirname "$0")"

export LATEST_VERSION=$(curl -s https://api.github.com/repos/StardawnAI/n8n-advanced/releases/latest | jq -r '.tag_name')

echo "Pulling ghcr.io/stardawnai/n8n-advanced:$LATEST_VERSION"
docker pull ghcr.io/stardawnai/n8n-advanced:$LATEST_VERSION

echo "Restarting services..."
docker-compose down
docker-compose up -d