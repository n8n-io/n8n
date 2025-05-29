#!/bin/bash

# TLS-n8n Cloudflare Workers Deployment Script

set -e

echo "🚀 Deploying TLS-n8n to Cloudflare Workers..."

# Build the project
echo "🔨 Building project..."
npm run build

# Run database migrations on production
echo "🗄️ Running production database migrations..."
wrangler d1 execute n8n-db --file=./schema.sql

# Deploy to Cloudflare Workers
echo "☁️ Deploying to Cloudflare Workers..."
wrangler deploy

echo "✅ Deployment complete!"
echo ""
echo "🌐 Your n8n instance is now live!"
echo "📊 Monitor at: https://dash.cloudflare.com"