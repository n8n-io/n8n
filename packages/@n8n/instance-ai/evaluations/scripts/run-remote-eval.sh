#!/usr/bin/env bash
set -euo pipefail

# ---------------------------------------------------------------------------
# Run Eval Remotely
#
# Starts checklist evaluation on Azure VM(s) in tmux sessions.
# Auto-shards across VMs if multiple are configured.
#
# Usage:
#   ./run-remote-eval.sh --tags build --verbose
#   ./run-remote-eval.sh --tags build --verbose --concurrency 8
# ---------------------------------------------------------------------------

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.eval-remote.env"

if [[ ! -f "$ENV_FILE" ]]; then
	echo "Error: $ENV_FILE not found. Run azure-eval-setup.sh first."
	exit 1
fi

# shellcheck source=/dev/null
source "$ENV_FILE"

# Forward all args to eval:checklist
EVAL_ARGS=("$@")

VM_COUNT=${#AZURE_VM_IPS[@]}
echo "=== Run Remote Eval ==="
echo "VMs: $VM_COUNT"
echo "Args: ${EVAL_ARGS[*]}"
echo ""

for idx in $(seq 0 $((VM_COUNT - 1))); do
	VM_IP="${AZURE_VM_IPS[$idx]}"
	VM_NUM=$((idx + 1))
	SHARD_FLAG=""

	if [[ $VM_COUNT -gt 1 ]]; then
		SHARD_FLAG="--shard ${VM_NUM}/${VM_COUNT}"
	fi

	echo "Starting eval on VM $VM_NUM ($VM_IP)..."

	# Build the eval command
	EVAL_CMD="cd $REPO_PATH && source .env && N8N_EVAL_EMAIL=\$N8N_EVAL_EMAIL N8N_EVAL_PASSWORD=\$N8N_EVAL_PASSWORD ANTHROPIC_API_KEY=\$ANTHROPIC_API_KEY pnpm eval:checklist --n8n-urls http://localhost:5678,http://localhost:5679,http://localhost:5680 ${EVAL_ARGS[*]} ${SHARD_FLAG}"

	# Start in tmux (kill existing session if any)
	ssh -o StrictHostKeyChecking=no "${AZURE_VM_USER}@${VM_IP}" bash <<REMOTE_EOF
tmux kill-session -t eval 2>/dev/null || true
tmux new-session -d -s eval "$EVAL_CMD"
echo "Eval started in tmux session 'eval'"
REMOTE_EOF

	echo "  VM $VM_NUM: eval running in tmux"
done

echo ""
echo "=== Eval Running ==="
echo ""
echo "Monitor:"
for idx in $(seq 0 $((VM_COUNT - 1))); do
	VM_IP="${AZURE_VM_IPS[$idx]}"
	echo "  ssh ${AZURE_VM_USER}@${VM_IP} -t 'tmux attach -t eval'"
done
echo ""
echo "Sync results:"
echo "  ./sync-eval-report.sh --open"
