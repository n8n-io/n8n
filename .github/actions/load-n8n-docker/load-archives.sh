#!/usr/bin/env bash
#
# Loads every Docker archive given as an argument into the local daemon. The
# loads run at the same time, so the decompress + extract work of the n8n and
# the runners archive overlaps instead of running one after the other.
#
# Each load writes to its own log file, because the output of concurrent
# `docker load` calls interleaves and is then hard to read. The script prints
# the logs after it waits for the load, one group for each archive.
#
# The script waits for every load and collects the exit codes. If one load
# fails, the script exits non-zero and the calling step fails the job.

set -euo pipefail

if [ "$#" -eq 0 ]; then
  echo '::error::load-archives.sh needs at least one archive path'
  exit 1
fi

archives=("$@")

logdir="$(mktemp -d)"
trap 'rm -rf "$logdir"' EXIT

pids=()
logs=()
for i in "${!archives[@]}"; do
  log="$logdir/load-$i.log"
  docker load -i "${archives[$i]}" >"$log" 2>&1 &
  pids+=("$!")
  logs+=("$log")
done

status=0
for i in "${!pids[@]}"; do
  code=0
  wait "${pids[$i]}" || code=$?
  echo "::group::docker load ${archives[$i]} (exit $code)"
  cat "${logs[$i]}"
  echo '::endgroup::'
  if [ "$code" -ne 0 ]; then
    echo "::error::docker load failed for ${archives[$i]} (exit $code)"
    status=1
  fi
done

exit "$status"
