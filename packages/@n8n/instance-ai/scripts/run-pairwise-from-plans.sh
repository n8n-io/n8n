#!/usr/bin/env bash
# Run the full pairwise eval against the orchestrator-plans dataset.
#
# Reads keys from ~/repos/n8n-worktree/master/.env (handles quoted values),
# defaults to the `instance-ai-builder-from-plans` LangSmith dataset, and
# writes results to packages/@n8n/instance-ai/.output/pairwise/<iso-timestamp>
# (the eval CLI's default — anchored to the package dir we cd into below).
#
# Usage:
#   ./scripts/run-pairwise-from-plans.sh
#   DATASET=instance-ai-builder-from-plans-test ./scripts/run-pairwise-from-plans.sh
#   JUDGES=3 CONCURRENCY=2 ./scripts/run-pairwise-from-plans.sh
#
# All other flags pass through to `eval:pairwise` (e.g. --max-examples 5).

set -euo pipefail

ENV_FILE="${ENV_FILE:-$HOME/repos/n8n-worktree/master/.env}"
if [[ ! -f "$ENV_FILE" ]]; then
	echo "env file not found: $ENV_FILE" >&2
	echo "set ENV_FILE=/path/to/.env or copy keys there" >&2
	exit 1
fi

# Master .env stores values wrapped in double quotes; strip them.
read_env() {
	grep "^$1=" "$ENV_FILE" | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//'
}

export ANTHROPIC_API_KEY="$(read_env ANTHROPIC_API_KEY)"
export LANGSMITH_API_KEY="$(read_env LANGSMITH_API_KEY)"
export DAYTONA_API_KEY="$(read_env DAYTONA_API_KEY)"
export DAYTONA_API_URL="$(read_env DAYTONA_API_URL)"
export N8N_INSTANCE_AI_SANDBOX_PROVIDER=daytona
export N8N_INSTANCE_AI_SANDBOX_LINK_SDK=1
export N8N_INSTANCE_AI_SANDBOX_ENABLED=true

DATASET="${DATASET:-instance-ai-builder-from-plans}"
JUDGES="${JUDGES:-1}"
CONCURRENCY="${CONCURRENCY:-4}"
EXPERIMENT_NAME="${EXPERIMENT_NAME:-pairwise-from-plans}"

ARGS=(
	--dataset "$DATASET"
	--judges "$JUDGES"
	--concurrency "$CONCURRENCY"
	--experiment-name "$EXPERIMENT_NAME"
	--verbose
)

# Resolve the package dir relative to this script so the command works from
# any cwd. `--filter` keeps pnpm rooted at the workspace package, and the
# eval CLI anchors `.output/` at process.cwd, which is this dir.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACKAGE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PACKAGE_DIR"

echo "Running pairwise eval"
echo "  dataset:     $DATASET"
echo "  judges:      $JUDGES"
echo "  concurrency: $CONCURRENCY"
echo "  output-dir:  $PACKAGE_DIR/.output/pairwise/<iso>"
echo

exec pnpm --filter @n8n/instance-ai eval:pairwise "${ARGS[@]}" "$@"
