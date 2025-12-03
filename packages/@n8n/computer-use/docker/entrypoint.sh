#!/bin/bash
set -e

# Track child PIDs for cleanup
SERVICES_PID=""

# Cleanup function
cleanup() {
    echo "Shutting down..."
    if [ -n "$SERVICES_PID" ]; then
        kill -TERM "$SERVICES_PID" 2>/dev/null || true
        wait "$SERVICES_PID" 2>/dev/null || true
    fi
    exit 0
}

# Trap signals
trap cleanup SIGTERM SIGINT SIGQUIT

echo "Starting Computer Use API Server..."

# Start services in background
/home/computeruse/start_services.sh &
SERVICES_PID=$!

# Wait for X11 to be ready
echo "Waiting for X11 display..."
for i in {1..30}; do
    if xdpyinfo -display ${DISPLAY} >/dev/null 2>&1; then
        echo "X11 display is ready"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "ERROR: X11 display failed to start"
        exit 1
    fi
    sleep 1
done

# Start the API server in foreground
echo "Starting API server on port 8080..."
cd /home/computeruse/api
exec node dist/server.js
