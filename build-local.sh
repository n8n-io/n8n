#!/bin/bash
set -e

echo "🔨 Building n8n Docker images locally..."
echo ""

# --- INSTALL DEPENDENCIES ---
echo "📦 Installing dependencies..."
pnpm install --frozen-lockfile

# --- BUILD N8N APPLICATION ---
echo "🔨 Building n8n application..."
node scripts/build-n8n.mjs

# --- BUILD DOCKER IMAGES ---
echo "🐳 Building Docker images..."
node scripts/dockerize-n8n.mjs

echo ""
echo "✅ Local build complete!"
echo ""
echo "Your images are now available locally:"
echo "  - n8nio/n8n:local"
echo "  - n8nio/runners:local"
echo ""
echo "To run n8n locally:"
echo "  docker run -it --rm -p 5678:5678 n8nio/n8n:local"
