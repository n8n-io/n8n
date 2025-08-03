#!/bin/bash

# n8n Development Server with Timeout and Process Management
# Usage: ./dev-with-timeout.sh [timeout_minutes] [mode]

TIMEOUT_MINUTES=${1:-10}  # Default 10 minutes
MODE=${2:-"dev"}          # Default full dev mode

echo "🚀 Starting n8n development server (${MODE}) with ${TIMEOUT_MINUTES} minute timeout..."

# Function to cleanup processes
cleanup() {
    echo "🧹 Cleaning up development processes..."
    pkill -f "turbo run ${MODE}" 2>/dev/null
    pkill -f "pnpm run ${MODE}" 2>/dev/null
    pkill -f "typescript.*--watch" 2>/dev/null
    pkill -f "vite" 2>/dev/null
    echo "✅ Cleanup completed"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Start development server in background
timeout ${TIMEOUT_MINUTES}m pnpm run ${MODE} &
DEV_PID=$!

echo "📊 Development server started (PID: ${DEV_PID})"
echo "⏰ Will auto-stop after ${TIMEOUT_MINUTES} minutes"
echo "🛑 Press Ctrl+C to stop manually"

# Wait for the process or timeout
wait $DEV_PID

echo "🏁 Development server stopped"
cleanup