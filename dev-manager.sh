#!/bin/bash

# n8n Development Manager - Prevents hanging processes
# Usage: ./dev-manager.sh [command] [timeout]

set -e

COMMAND=${1:-"dev:safe"}
TIMEOUT=${2:-300}  # 5 minutes default
LOGFILE="dev-manager.log"

echo "🚀 n8n Development Manager"
echo "📋 Command: pnpm run $COMMAND"
echo "⏱️  Timeout: ${TIMEOUT}s"
echo "📄 Logs: $LOGFILE"

# Cleanup function
cleanup() {
    echo "🧹 Cleaning up processes..."
    pkill -f "turbo run" 2>/dev/null || true
    pkill -f "pnpm run" 2>/dev/null || true
    pkill -f "typescript.*--watch" 2>/dev/null || true
    pkill -f "vite.*dev" 2>/dev/null || true
    echo "✅ Cleanup completed"
    exit 0
}

# Signal handlers
trap cleanup SIGINT SIGTERM EXIT

# Function to check if processes are responsive
check_health() {
    local max_checks=5
    local check_count=0
    
    while [ $check_count -lt $max_checks ]; do
        if pgrep -f "turbo run" > /dev/null; then
            echo "⚡ Development server is running..."
            return 0
        fi
        sleep 2
        ((check_count++))
    done
    
    echo "❌ Development server failed to start"
    return 1
}

# Start with timeout
echo "▶️  Starting development server..."
timeout ${TIMEOUT}s pnpm run $COMMAND > $LOGFILE 2>&1 &
DEV_PID=$!

echo "🎯 Process ID: $DEV_PID"

# Check if it started successfully
if check_health; then
    echo "✅ Development server is running"
    echo "📖 Tail logs: tail -f $LOGFILE"
    echo "🛑 Stop with: kill $DEV_PID or Ctrl+C"
    
    # Wait for completion or timeout
    wait $DEV_PID 2>/dev/null || true
else
    echo "💥 Failed to start development server"
    cleanup
fi

echo "🏁 Development session ended"