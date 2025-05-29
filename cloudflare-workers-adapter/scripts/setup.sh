#!/bin/bash

# TLS-n8n Cloudflare Workers Setup Script
# This script sets up the development environment and deploys the application

set -e

echo "🚀 Setting up TLS-n8n Cloudflare Workers Adapter..."

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler CLI not found. Installing..."
    npm install -g wrangler
fi

# Check if user is logged in to Cloudflare
echo "🔐 Checking Cloudflare authentication..."
if ! wrangler whoami &> /dev/null; then
    echo "Please log in to Cloudflare:"
    wrangler login
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Create D1 database
echo "🗄️ Creating D1 database..."
if ! wrangler d1 list | grep -q "n8n-db"; then
    wrangler d1 create n8n-db
    echo "✅ D1 database created"
else
    echo "✅ D1 database already exists"
fi

# Run database migrations
echo "🔄 Running database migrations..."
wrangler d1 execute n8n-db --local --file=./schema.sql
echo "✅ Local database initialized"

# Create R2 bucket
echo "🪣 Creating R2 bucket..."
if ! wrangler r2 bucket list | grep -q "n8n-storage"; then
    wrangler r2 bucket create n8n-storage
    echo "✅ R2 bucket created"
else
    echo "✅ R2 bucket already exists"
fi

# Create KV namespace
echo "🔑 Creating KV namespace..."
if ! wrangler kv:namespace list | grep -q "n8n-cache"; then
    wrangler kv:namespace create "n8n-cache"
    echo "✅ KV namespace created"
else
    echo "✅ KV namespace already exists"
fi

# Generate secrets
echo "🔐 Setting up secrets..."
if [ -z "$JWT_SECRET" ]; then
    JWT_SECRET=$(openssl rand -base64 32)
    wrangler secret put JWT_SECRET --env production
    echo "✅ JWT_SECRET generated and stored"
fi

if [ -z "$ENCRYPTION_KEY" ]; then
    ENCRYPTION_KEY=$(openssl rand -base64 32)
    wrangler secret put ENCRYPTION_KEY --env production
    echo "✅ ENCRYPTION_KEY generated and stored"
fi

# Build the project
echo "🔨 Building project..."
npm run build

echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Update wrangler.toml with your account ID and database/bucket IDs"
echo "2. Run 'npm run dev' to start local development"
echo "3. Run 'npm run deploy' to deploy to production"
echo ""
echo "🌐 Local development: http://localhost:8787"
echo "📚 API docs: http://localhost:8787/docs"