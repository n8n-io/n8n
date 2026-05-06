#!/usr/bin/env bash
# Build n8n workflows for each test case using `claude -p` driving an MCP
# server, then write a manifest in the format the eval CLI's
# --prebuilt-workflows flag expects. Pair this with
# `pnpm eval:instance-ai --prebuilt-workflows <manifest>` to verify
# externally-built workflows on the same dataset and verifier as the
# Instance AI cohort.
#
# Each build is a fresh `claude -p` subprocess. Builds run in parallel up
# to --concurrency. The MCP server's own InitializeResult.instructions
# is auto-injected into the system prompt by Claude Code, so this script
# adds only a thin tail telling the model how to print the resulting
# workflow ID for parsing.
#
# Prerequisites
#   * `claude` CLI installed (https://docs.claude.com/claude-code)
#   * `jq` installed
#   * `~/.claude.json` has the MCP server block configured (project-scoped
#     under .projects[<repo-root>].mcpServers[<name>] or globally under
#     .mcpServers[<name>]). Default name: "n8n-mcp (instance)" — override
#     with --mcp-server.
#   * n8n instance running on localhost:5678 (or wherever the MCP server
#     points). For n8n's instance MCP specifically, that means a running
#     dev server with N8N_MCP_BUILDER_ENABLED=true (default).
#
# Usage
#   build-instance-mcp-workflows.sh [flags] [slug ...]
#
# Flags
#   -n, --iterations N      Builds per slug (default: 1).
#   -j, --concurrency N     Parallel builds (default: 1).
#   --append                Append to existing manifest instead of overwriting.
#   --output-dir DIR        Where manifest + logs go (default: cwd).
#   --manifest PATH         Override manifest path (default: <output-dir>/manifest.json).
#   --log-dir DIR           Override log dir (default: <output-dir>/logs).
#   --mcp-server NAME       MCP server name in ~/.claude.json (default: "n8n-mcp (instance)").
#   --builder LABEL         Free-form label written into manifest.builder
#                           (default: "instance-mcp").
#   --model MODEL           Anthropic model id passed to claude -p
#                           (default: claude-sonnet-4-6).
#   -h, --help              Show this help.
#
# Positional args
#   slug ...                Test case slugs to build (filenames in
#                           evaluations/data/workflows/ without .json).
#                           If omitted, every slug in that directory is built.
#
# Examples
#   ./build-instance-mcp-workflows.sh                     # all slugs, 1 build each
#   ./build-instance-mcp-workflows.sh -n 5 -j 4           # all slugs, 5 builds each, 4 parallel
#   ./build-instance-mcp-workflows.sh -n 3 contact-form-automation
#   ./build-instance-mcp-workflows.sh --append -n 2 weather-monitoring
#   ./build-instance-mcp-workflows.sh --mcp-server "my-mcp" --builder "my-build"

set -euo pipefail

usage() {
	# Print the leading comment block (lines 2..first non-comment).
	awk 'NR > 1 && /^#/ { sub(/^# ?/, ""); print; next } NR > 1 { exit }' "${BASH_SOURCE[0]}"
}

# Defaults
ITERATIONS=1
CONCURRENCY=1
APPEND=0
OUTPUT_DIR="$PWD"
MANIFEST=""
LOG_DIR=""
MCP_SERVER_NAME="n8n-mcp (instance)"
BUILDER_LABEL="instance-mcp"
MODEL="claude-sonnet-4-6"
MAX_ATTEMPTS=3
MCP_TIMEOUT_MS=120000

# Workflow-builder tools exposed by n8n's instance MCP. Other servers will
# expose different sets — override --mcp-server and edit this list locally
# if you need a different surface.
INSTANCE_MCP_TOOLS=(
	get_sdk_reference
	search_nodes
	get_suggested_nodes
	get_node_types
	validate_workflow
	create_workflow_from_code
	archive_workflow
	update_workflow
)

# Arg parsing — flags first, slugs last
while [[ $# -gt 0 ]] && [[ "$1" == -* ]]; do
	case "$1" in
		-n|--iterations)   ITERATIONS="$2"; shift 2 ;;
		-j|--concurrency)  CONCURRENCY="$2"; shift 2 ;;
		--append)          APPEND=1; shift ;;
		--output-dir)      OUTPUT_DIR="$2"; shift 2 ;;
		--manifest)        MANIFEST="$2"; shift 2 ;;
		--log-dir)         LOG_DIR="$2"; shift 2 ;;
		--mcp-server)      MCP_SERVER_NAME="$2"; shift 2 ;;
		--builder)         BUILDER_LABEL="$2"; shift 2 ;;
		--model)           MODEL="$2"; shift 2 ;;
		-h|--help)         usage; exit 0 ;;
		*)                 echo "error: unknown flag $1 (use --help)" >&2; exit 1 ;;
	esac
done

[[ "$ITERATIONS"  =~ ^[0-9]+$ ]] && [[ "$ITERATIONS"  -ge 1 ]] || { echo "error: --iterations must be a positive int" >&2; exit 1; }
[[ "$CONCURRENCY" =~ ^[0-9]+$ ]] && [[ "$CONCURRENCY" -ge 1 ]] || { echo "error: --concurrency must be a positive int" >&2; exit 1; }

# Resolve default output paths
mkdir -p "$OUTPUT_DIR"
OUTPUT_DIR="$(cd "$OUTPUT_DIR" && pwd)"
[[ -z "$MANIFEST" ]] && MANIFEST="$OUTPUT_DIR/manifest.json"
[[ -z "$LOG_DIR" ]] && LOG_DIR="$OUTPUT_DIR/logs"
mkdir -p "$LOG_DIR"

# Pre-flight checks
for cmd in claude jq git; do
	command -v "$cmd" >/dev/null 2>&1 || { echo "error: $cmd not on PATH" >&2; exit 1; }
done
CLAUDE_CONFIG="$HOME/.claude.json"
[[ -f "$CLAUDE_CONFIG" ]] || { echo "error: $CLAUDE_CONFIG not found" >&2; exit 1; }

# Locate the n8n repo (script lives at packages/@n8n/instance-ai/evaluations/scripts/)
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || cd "$(dirname "${BASH_SOURCE[0]}")/../../../../.." && pwd)"
WORKFLOW_DIR="$REPO_ROOT/packages/@n8n/instance-ai/evaluations/data/workflows"
[[ -d "$WORKFLOW_DIR" ]] || { echo "error: $WORKFLOW_DIR not found (running from outside the n8n repo?)" >&2; exit 1; }

# Compute the tool-prefix Claude Code uses for this MCP server. Each non
# alphanumeric character in the server name becomes "_". Then the full
# tool name is "mcp__<sanitized>__<tool>". Concrete example:
#   "n8n-mcp (instance)" -> "n8n-mcp__instance_"
#   prefix              -> "mcp__n8n-mcp__instance___"
sanitize_name() {
	echo -n "$1" | sed 's/[^a-zA-Z0-9-]/_/g'
}
TOOL_PREFIX="mcp__$(sanitize_name "$MCP_SERVER_NAME")__"

ALLOWED_TOOLS=""
for tool in "${INSTANCE_MCP_TOOLS[@]}"; do
	ALLOWED_TOOLS+="${TOOL_PREFIX}${tool} "
done

# Stage MCP config + result staging (cleaned up on exit)
MCP_CONFIG_FILE="$(mktemp -t n8n-mcp-config.XXXXXX.json)"
RESULTS_DIR="$(mktemp -d -t n8n-mcp-results.XXXXXX)"
chmod 600 "$MCP_CONFIG_FILE"
cleanup() { rm -f "$MCP_CONFIG_FILE"; rm -rf "$RESULTS_DIR"; }
trap cleanup EXIT

# Extract the MCP server block — try project-scoped first, then global.
if jq -e --arg root "$REPO_ROOT" --arg name "$MCP_SERVER_NAME" \
		'.projects[$root].mcpServers[$name]' "$CLAUDE_CONFIG" >/dev/null 2>&1; then
	jq --arg root "$REPO_ROOT" --arg name "$MCP_SERVER_NAME" \
		'{mcpServers: {($name): .projects[$root].mcpServers[$name]}}' \
		"$CLAUDE_CONFIG" > "$MCP_CONFIG_FILE"
elif jq -e --arg name "$MCP_SERVER_NAME" '.mcpServers[$name]' "$CLAUDE_CONFIG" >/dev/null 2>&1; then
	jq --arg name "$MCP_SERVER_NAME" \
		'{mcpServers: {($name): .mcpServers[$name]}}' \
		"$CLAUDE_CONFIG" > "$MCP_CONFIG_FILE"
else
	echo "error: \"$MCP_SERVER_NAME\" not configured in $CLAUDE_CONFIG (project-scope under \"$REPO_ROOT\" or global)" >&2
	exit 1
fi

# Resolve slug list — positional args, or every test-case file
if [[ $# -gt 0 ]]; then
	SLUGS=("$@")
else
	SLUGS=()
	while IFS= read -r f; do
		SLUGS+=("$(basename "$f" .json)")
	done < <(find "$WORKFLOW_DIR" -maxdepth 1 -name '*.json' -type f | sort)
fi
[[ ${#SLUGS[@]} -gt 0 ]] || { echo "error: no scenarios to build" >&2; exit 1; }

TOTAL_BUILDS=$(( ${#SLUGS[@]} * ITERATIONS ))

echo "Building ${#SLUGS[@]} scenario(s) × $ITERATIONS iteration(s) = $TOTAL_BUILDS workflow(s)"
echo "MCP server:  $MCP_SERVER_NAME"
echo "Builder tag: $BUILDER_LABEL"
echo "Model:       $MODEL"
echo "Concurrency: $CONCURRENCY"
echo "Logs:        $LOG_DIR"
echo "Manifest:    $MANIFEST"
echo

build_one() {
	local slug="$1" iter="$2" label="$3"
	local scenario_file="$WORKFLOW_DIR/$slug.json"
	if [[ ! -f "$scenario_file" ]]; then
		echo "  [$label] skip: scenario file missing"
		return
	fi
	local prompt
	prompt="$(jq -r '.prompt' "$scenario_file")"
	if [[ -z "$prompt" || "$prompt" == "null" ]]; then
		echo "  [$label] skip: no prompt field"
		return
	fi
	local user_message="$prompt

---
After you have created the workflow with create_workflow_from_code, print a final line of the exact form:

WORKFLOW_ID=<id>

where <id> is the workflowId returned by create_workflow_from_code. Emit it verbatim, no quotes, no markdown."

	local workflow_id=""
	for attempt in $(seq 1 "$MAX_ATTEMPTS"); do
		local ts; ts="$(date +%Y%m%d-%H%M%S)"
		local log_file="$LOG_DIR/$slug-iter$iter-attempt$attempt-$ts-$$.json"

		MCP_TIMEOUT="$MCP_TIMEOUT_MS" claude -p "$user_message" \
			--model "$MODEL" \
			--mcp-config "$MCP_CONFIG_FILE" \
			--strict-mcp-config \
			--allowedTools $ALLOWED_TOOLS \
			--output-format json \
			>"$log_file" 2>&1 || true

		workflow_id="$(jq -r '.result // empty' "$log_file" 2>/dev/null \
			| (grep -oE 'WORKFLOW_ID=[A-Za-z0-9_-]+' || true) \
			| tail -1 \
			| sed 's/^WORKFLOW_ID=//')"
		[[ -n "$workflow_id" ]] && break
		echo "  [$label] attempt $attempt: no WORKFLOW_ID (log: $log_file)"
	done

	if [[ -z "$workflow_id" ]]; then
		echo "  [$label] FAILED after $MAX_ATTEMPTS attempts"
		return
	fi

	echo "  [$label] ok → $workflow_id"
	printf '%s\t%s\n' "$slug" "$workflow_id" > "$RESULTS_DIR/$slug-iter$iter.result"
}

wait_for_slot() {
	while (( $(jobs -rp | wc -l) >= CONCURRENCY )); do
		sleep 0.2
	done
}

cd "$REPO_ROOT"

count=0
for slug in "${SLUGS[@]}"; do
	for ((iter=1; iter<=ITERATIONS; iter++)); do
		count=$(( count + 1 ))
		wait_for_slot
		build_one "$slug" "$iter" "$count/$TOTAL_BUILDS $slug#$iter" &
	done
done
wait

# Read existing manifest's workflows map (if --append) or start fresh.
# Without --append, slugs we just rebuilt are cleared so we don't accumulate
# stale IDs; other slugs in the existing manifest are preserved.
if [[ -f "$MANIFEST" && "$APPEND" -eq 1 ]]; then
	WORKFLOWS_JSON="$(jq -r '.workflows // {}' "$MANIFEST")"
else
	WORKFLOWS_JSON='{}'
	if [[ -f "$MANIFEST" && "$APPEND" -eq 0 ]]; then
		WORKFLOWS_JSON="$(jq -r '.workflows // {}' "$MANIFEST")"
		for slug in "${SLUGS[@]}"; do
			WORKFLOWS_JSON="$(jq --arg s "$slug" 'del(.[$s])' <<<"$WORKFLOWS_JSON")"
		done
	fi
fi

for result_file in "$RESULTS_DIR"/*.result; do
	[[ -f "$result_file" ]] || continue
	IFS=$'\t' read -r slug workflow_id < "$result_file"
	WORKFLOWS_JSON="$(jq --arg s "$slug" --arg id "$workflow_id" '
		if (.[$s] | type) == "array" then .[$s] += [$id]
		else . + {($s): [$id]}
		end
	' <<<"$WORKFLOWS_JSON")"
done

# Wrap in the shipped manifest schema: { version, builder, workflows }.
jq -n \
	--argjson workflows "$WORKFLOWS_JSON" \
	--arg builder "$BUILDER_LABEL" \
	'{version: 1, builder: $builder, workflows: $workflows}' \
	> "$MANIFEST"

# Build-stats sidecar: cohort-level cost, turns, and duration aggregates.
# Reads only the successful session JSONs from this run's log dir, so it
# reflects the current invocation and isn't polluted by older logs.
STATS_FILE="${MANIFEST%.json}-stats.json"
if compgen -G "$LOG_DIR/*.json" > /dev/null; then
	jq -s --arg builder "$BUILDER_LABEL" '
		[.[] | select(.subtype == "success")] as $ok |
		{
			version: 1,
			builder: $builder,
			summary: ($ok | {
				totalBuilds: length,
				avgTurns: (if length > 0 then ([.[].num_turns] | add / length) else 0 end),
				avgCostUSD: (if length > 0 then ([.[].total_cost_usd] | add / length) else 0 end),
				totalCostUSD: ([.[].total_cost_usd] | add // 0),
				avgDurationMs: (if length > 0 then ([.[].duration_ms] | add / length) else 0 end)
			}),
			builds: ($ok | map({
				sessionId: .session_id,
				turns: .num_turns,
				costUSD: .total_cost_usd,
				durationMs: .duration_ms
			}))
		}
	' "$LOG_DIR"/*.json > "$STATS_FILE" 2>/dev/null || rm -f "$STATS_FILE"
fi

echo
echo "Manifest: $MANIFEST"
[[ -f "$STATS_FILE" ]] && echo "Stats:    $STATS_FILE"
cat "$MANIFEST"
