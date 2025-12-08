#!/bin/bash
set -e

# Track all child PIDs
PIDS=""

# Cleanup function to kill all children
cleanup() {
    echo "Stopping services..."
    for pid in $PIDS; do
        kill -TERM "$pid" 2>/dev/null || true
    done
    wait
    exit 0
}

# Trap signals
trap cleanup SIGTERM SIGINT SIGQUIT

# Start Xvfb (X11 socket directory is created in Dockerfile)
Xvfb ${DISPLAY} -screen 0 ${WIDTH}x${HEIGHT}x24 -ac -nolisten tcp 2>/dev/null &
PIDS="$PIDS $!"

# Wait a bit for Xvfb to start
sleep 2

echo "Starting window manager (openbox)..."
DISPLAY=${DISPLAY} openbox 2>/dev/null &
PIDS="$PIDS $!"

echo "Starting panel (tint2)..."
DISPLAY=${DISPLAY} tint2 2>/dev/null &
PIDS="$PIDS $!"

echo "Starting VNC server on port 5900..."
x11vnc -display ${DISPLAY} -forever -shared -rfbport 5900 -nopw -q &
PIDS="$PIDS $!"

echo "All services started"
echo "  - Display: ${DISPLAY}"
echo "  - Resolution: ${WIDTH}x${HEIGHT}"
echo "  - VNC: port 5900"

# Keep services running - wait for any child to exit
wait
