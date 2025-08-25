#!/bin/bash

# n8n Local Deployment Script
# This script helps you quickly deploy n8n locally for testing

set -e

echo "🚀 Starting n8n deployment..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Create local-files directory if it doesn't exist
if [ ! -d "local-files" ]; then
    echo "📁 Creating local-files directory..."
    mkdir -p local-files
fi

# Copy environment file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file from template..."
    cp env.example .env
    echo "✅ .env file created. Please edit it with your configuration."
fi

# Start the containers
echo "🐳 Starting n8n containers..."
docker-compose up -d

# Wait for the service to be ready
echo "⏳ Waiting for n8n to be ready..."
sleep 10

# Check if the service is running
if curl -f http://localhost:5678/healthz &> /dev/null; then
    echo "✅ n8n is running successfully!"
    echo "🌐 Access n8n at: http://localhost:5678"
    echo "📊 View logs with: docker-compose logs -f n8n"
    echo "🛑 Stop n8n with: docker-compose down"
else
    echo "❌ n8n failed to start. Check logs with: docker-compose logs n8n"
    exit 1
fi
