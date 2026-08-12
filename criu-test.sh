#!/usr/bin/env bash
# Minimal CRIU smoke test: dump a `sleep`, verify it's dead, restore it, verify it's back.
# Run as root: sudo ./criu-test.sh
set -euo pipefail

DIR=$(mktemp -d /tmp/criu-test.XXXX)
IMG="$DIR/images"
mkdir -p "$IMG"
echo "workdir: $DIR"

# setsid + no tty fds: CRIU refuses processes attached to a terminal unless --shell-job
setsid sleep 1000 < /dev/null &> "$DIR/sleep.log" &
PID=$!
sleep 0.2
echo "started sleep, pid=$PID"

criu dump -t "$PID" -D "$IMG" -o dump.log || { cat "$IMG/dump.log"; exit 1; }
echo "dumped."

if kill -0 "$PID" 2>/dev/null; then
	echo "FAIL: process still alive after dump"
	exit 1
fi
echo "process gone (dump kills by default)."

ls "$IMG"/*.img | head -5

criu restore -D "$IMG" -d -o restore.log || { cat "$IMG/restore.log"; exit 1; }
echo "restored."

if kill -0 "$PID" 2>/dev/null; then
	echo "OK: sleep back alive with same pid=$PID"
	kill "$PID"
	echo "PASS"
else
	echo "FAIL: process not running after restore"
	exit 1
fi
