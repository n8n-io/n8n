#!/usr/bin/env bash
set -euo pipefail

# ---------------------------------------------------------------------------
# Sync Eval Report
#
# Pulls evaluation results from Azure VM(s) and merges them locally.
# Regenerates a unified HTML report.
#
# Usage:
#   ./sync-eval-report.sh          # sync and print summary
#   ./sync-eval-report.sh --open   # sync and open report in browser
# ---------------------------------------------------------------------------

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.eval-remote.env"
LOCAL_DATA_DIR="$SCRIPT_DIR/../checklist/.data"

OPEN_REPORT=false
if [[ "${1:-}" == "--open" ]]; then
	OPEN_REPORT=true
fi

if [[ ! -f "$ENV_FILE" ]]; then
	echo "Error: $ENV_FILE not found. Run azure-eval-setup.sh first."
	exit 1
fi

# shellcheck source=/dev/null
source "$ENV_FILE"

VM_COUNT=${#AZURE_VM_IPS[@]}
echo "=== Sync Eval Report ==="
echo "Syncing from $VM_COUNT VM(s)..."
echo ""

# Ensure local data dir exists
mkdir -p "$LOCAL_DATA_DIR/instance-ai-runs"

for idx in $(seq 0 $((VM_COUNT - 1))); do
	VM_IP="${AZURE_VM_IPS[$idx]}"
	VM_NUM=$((idx + 1))
	REMOTE_DATA="$REPO_PATH/evaluations/.data"

	echo "  VM $VM_NUM ($VM_IP):"

	# Sync run files
	rsync -az --info=progress2 \
		"${AZURE_VM_USER}@${VM_IP}:${REMOTE_DATA}/instance-ai-runs/" \
		"$LOCAL_DATA_DIR/instance-ai-runs/" \
		2>/dev/null || echo "    Warning: rsync failed (VM may be stopped)"

	# Count synced files
	RUN_COUNT=$(ls "$LOCAL_DATA_DIR/instance-ai-runs/"*.json 2>/dev/null | wc -l | tr -d ' ')
	echo "    $RUN_COUNT total run file(s) locally"
done

# Regenerate unified report
echo ""
echo "Regenerating report..."
cd "$SCRIPT_DIR/../.." && pnpm eval:checklist report 2>/dev/null || {
	echo "Warning: report generation failed. Run files may still be syncing."
}

REPORT_FILE="$LOCAL_DATA_DIR/instance-ai-report.html"
if [[ -f "$REPORT_FILE" ]]; then
	echo ""
	echo "Report: $REPORT_FILE"
	echo "Last modified: $(stat -f '%Sm' "$REPORT_FILE" 2>/dev/null || stat -c '%y' "$REPORT_FILE" 2>/dev/null || echo 'unknown')"

	if $OPEN_REPORT; then
		open "$REPORT_FILE" 2>/dev/null || xdg-open "$REPORT_FILE" 2>/dev/null || echo "Open manually: $REPORT_FILE"
	fi
else
	echo "No report file found yet."
fi
