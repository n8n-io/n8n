#!/usr/bin/env bash
# CRIU pause test with observable effect:
#   bash child logs "before", sleeps 5s, logs "after".
#   We dump it mid-sleep, stay paused 10s (> sleep duration),
#   prove "after" does NOT appear while paused, restore, prove it DOES appear.
# Run as root: sudo ./criu-test2.sh
set -euo pipefail

DIR=$(mktemp -d /tmp/criu-test2.XXXX)
IMG="$DIR/images"
LOG="$DIR/proc.log"
mkdir -p "$IMG"
echo "workdir: $DIR"

setsid bash -c '
	echo "before sleep  $(date +%T.%3N)"
	sleep 5
	echo "after sleep   $(date +%T.%3N)"
' < /dev/null &> "$LOG" &
PID=$!
sleep 1 # let it write line 1 and enter sleep

# --- prove what PID actually is ---
echo "PID=$PID comm=$(cat /proc/$PID/comm)"
echo "process tree:"
ps -o pid,ppid,sess,comm -s "$PID"
[ "$(cat /proc/$PID/comm)" = "bash" ] || { echo "FAIL: expected bash"; exit 1; }

# non-root: needs setcap cap_checkpoint_restore,cap_sys_ptrace+eip on criu binary
UNPRIV=$([ "$(id -u)" = 0 ] || echo --unprivileged)

criu dump $UNPRIV -t "$PID" -D "$IMG" -o dump.log || { cat "$IMG/dump.log"; exit 1; }
echo "dumped at $(date +%T.%3N)"

[ "$(wc -l < "$LOG")" = 1 ] || { echo "FAIL: expected 1 log line after dump"; cat "$LOG"; exit 1; }

echo "pausing 10s (sleep inside proc is only 5s)..."
sleep 10

if [ "$(wc -l < "$LOG")" = 1 ]; then
	echo "OK: still 1 line after 10s pause — process really frozen"
else
	echo "FAIL: second line appeared while dumped"
	cat "$LOG"
	exit 1
fi

criu restore $UNPRIV -D "$IMG" -d -o restore.log || { cat "$IMG/restore.log"; exit 1; }
echo "restored at $(date +%T.%3N)"

# remaining sleep resumes; give it up to 7s
for _ in $(seq 70); do
	[ "$(wc -l < "$LOG")" = 2 ] && break
	sleep 0.1
done

echo "--- proc.log ---"
cat "$LOG"
if [ "$(wc -l < "$LOG")" = 2 ]; then
	echo "PASS: 'after sleep' appeared only post-restore (gap in timestamps ≈ pause)"
else
	echo "FAIL: second line never appeared after restore"
	exit 1
fi
