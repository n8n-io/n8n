#!/usr/bin/env bash
# Starts airgap-monitoring on :3456 in token mode, with its own demo database.
# Pass `fresh` to delete the receiver's demo data first.
set -euo pipefail
source "$(dirname "$0")/env.sh"

if [[ "${1:-}" == "fresh" ]]; then
	rm -f "$RECEIVER_DB" "$RECEIVER_DB"-*
fi

cd "$RECEIVER_REPO"
N8N_MONITORING_READ_TOKEN="$READ_TOKEN" \
N8N_MONITORING_WRITE_TOKEN="$WRITE_TOKEN" \
N8N_DB_PATH="$RECEIVER_DB" \
	exec pnpm dev
