#!/usr/bin/env bash
# Pause/resume local n8n with CRIU.
# Usage: ./criu-n8n.sh start|pause|resume|status
set -euo pipefail

REPO=$(cd "$(dirname "$0")" && pwd)
N8N_BIN=${N8N_BIN:-$REPO/packages/cli/bin/n8n}
IMG=/tmp/n8n-img
PIDFILE=/tmp/n8n.pid
LOG=/tmp/n8n.log
URL=http://localhost:5678/healthz

case ${1:-} in
start)
	setsid "$N8N_BIN" start < /dev/null &> "$LOG" &
	echo $! > "$PIDFILE"
	echo "pid $(cat "$PIDFILE"), log: $LOG"
	for _ in $(seq 200); do
		curl -sf "$URL" > /dev/null 2>&1 && { echo "up: $URL"; exit 0; }
		kill -0 "$(cat "$PIDFILE")" 2>/dev/null || { echo "n8n died:"; tail -20 "$LOG"; exit 1; }
		sleep 0.3
	done
	echo "timeout waiting for $URL"; tail -20 "$LOG"; exit 1
	;;
pause)
	rm -rf "$IMG" && mkdir -p "$IMG"
	sudo criu dump -t "$(cat "$PIDFILE")" -D "$IMG" --tcp-established -o dump.log \
		|| { echo "dump failed, log tail:"; sudo tail -30 "$IMG/dump.log"; exit 1; }
	if curl -sf --max-time 2 "$URL" > /dev/null 2>&1; then
		echo "FAIL: still responding after dump"; exit 1
	fi
	echo "paused. image: $(sudo du -sh "$IMG" | cut -f1)"
	;;
resume)
	sudo criu restore -D "$IMG" --tcp-established -d -o restore.log \
		|| { echo "restore failed, log tail:"; sudo tail -30 "$IMG/restore.log"; exit 1; }
	sleep 0.5
	curl -sf "$URL" > /dev/null && echo "resumed: $URL responds, pid $(cat "$PIDFILE")"
	;;
status)
	PID=$(cat "$PIDFILE" 2>/dev/null || echo "?")
	kill -0 "$PID" 2>/dev/null && echo "pid $PID alive" || echo "pid $PID not running"
	curl -sf --max-time 2 "$URL" > /dev/null 2>&1 && echo "http: responding" || echo "http: no response"
	;;
*)
	echo "usage: $0 start|pause|resume|status"; exit 1
	;;
esac
