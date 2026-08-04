#!/usr/bin/env bash
#
# Local counterpart of .github/workflows/test-evals-instance-ai.yml
# (Instance AI Evals: Experiments / workflow_dispatch).
#
# Boots N docker lanes (optional sandbox service), seeds E2E owners, asserts
# sandbox + model config, then runs eval:instance-ai against an offline suite
# snapshot under evaluations/data/suites/<slug>/ (no LangTracer required).
#
# Usage (from repo root or this package):
#   ./packages/@n8n/instance-ai/scripts/run-eval-experiment.sh \
#     --model custom/Kimi-K3 \
#     --model-url 'https://host/v1' \
#     --suite model-comparison \
#     --experiment-name model-comparison-kimi-k3-local
#
# Credentials come from the environment or --env-file (default: repo .env.local).
# Never put secrets on the command line — pass them via the env file.
#
set -euo pipefail

# ---------------------------------------------------------------------------
# Defaults (match workflow_dispatch / job env)
# ---------------------------------------------------------------------------
MODEL=""
MODEL_URL=""
SUITE="model-comparison"
TIER=""
FILTER=""
ITERATIONS="3"
EXPERIMENT_NAME=""
SANDBOX_PROVIDER="n8n-sandbox"
LANES=""
EVAL_CONCURRENCY=""
VERTEX_PROJECT=""
VERTEX_LOCATION=""
IMAGE="n8nio/n8n:local"
BUILD_IMAGE=false
SKIP_EVAL=false
KEEP_CONTAINERS=false
START_PORT=5678
ENV_FILE=".env.local"
DATASET="instance-ai-workflow-evals"
BASELINE_PREFIX="instance-ai-baseline-"
NETWORK_NAME="n8n-eval-net"
WORKFLOW_DIR=""
EVAL_ARGS=()
CONTAINER_NAMES=()
PORTS=()
SANDBOX_STARTED=false

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EVAL_PKG_DIR="${REPO_ROOT}/packages/@n8n/instance-ai"
RESET_PAYLOAD='{"owner":{"email":"nathan@n8n.io","password":"PlaywrightTest123","firstName":"Eval","lastName":"Owner"},"admin":{"email":"admin@n8n.io","password":"PlaywrightTest123","firstName":"Admin","lastName":"User"},"members":[],"chat":{"email":"chat@n8n.io","password":"PlaywrightTest123","firstName":"Chat","lastName":"User"}}'

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
usage() {
	cat <<'EOF'
Usage: run-eval-experiment.sh [options] [-- extra eval:instance-ai args]

Mirrors GitHub Actions "Instance AI Evals: Experiments" locally.

Options (same spirit as workflow_dispatch inputs):
  --model ID              Lane builder model (provider/model). Empty = image default.
  --model-url URL         N8N_INSTANCE_AI_MODEL_URL (required for custom/*).
  --suite SLUG            Offline suite under evaluations/data/suites/<slug>/
                          (default: model-comparison; also: model-comparison-large)
  --workflow-dir PATH     Override case directory (absolute or repo-relative).
                          Default: evaluations/data/suites/<suite>
  --tier NAME             Dataset split filter (e.g. pr, full)
  --filter SUBSTR         Case filename substring filter
  --iterations N          Iterations per case (default: 3)
  --experiment-name NAME  LangSmith experiment prefix
  --sandbox-provider P    n8n-sandbox (default) or daytona
  --lanes N               Parallel n8n containers 1-11 (default: 10, or 1 for baseten/*)
  --concurrency N         Eval scenario concurrency (default: 32, or 2 for baseten/*)
  --vertex-project ID     GCP project for vertex/*
  --vertex-location LOC   Vertex location (default: global)
  --start-port N          First host port (default: 5678; skips Node fetch-blocked ports)
  --image NAME            Docker image (default: n8nio/n8n:local)
  --build                 Build docker image before starting lanes
  --env-file PATH         Env file relative to repo root (default: .env.local)
  --dataset NAME          LangSmith dataset (default: instance-ai-workflow-evals)
  --baseline-prefix P     Baseline experiment prefix (default: instance-ai-baseline-)
  --skip-eval             Only start + seed + assert lanes
  --keep-containers       Leave containers running on exit
  -h, --help              Show this help

Examples:
  # Keyless OpenAI-compatible router (e.g. dedicated Kimi router)
  ./scripts/run-eval-experiment.sh \
    --model custom/Kimi-K3 \
    --model-url 'https://host/v1' \
    --suite model-comparison \
    --experiment-name model-comparison-kimi-k3-local \
    --lanes 2 --concurrency 4

  # Larger offline suite
  ./scripts/run-eval-experiment.sh --suite model-comparison-large --lanes 2 --concurrency 4

Required in env / --env-file:
  Anthropic key for verifier/mocks: ANTHROPIC_API_KEY | N8N_AI_ANTHROPIC_KEY | EVALS_ANTHROPIC_KEY
  Provider key for the lane model (unless custom/* + --model-url)
  For n8n-sandbox: nothing extra. For daytona: DAYTONA_API_KEY

Optional:
  LANGSMITH_API_KEY (+ LANGSMITH_ENDPOINT) — publish experiment; omit for local JSON/HTML only
  N8N_LICENSE_* / N8N_ENCRYPTION_KEY — if your image needs license activation

No LangTracer credentials are required — cases are loaded from disk.
EOF
}

log() { printf '[eval-experiment] %s\n' "$*"; }
die() { printf '[eval-experiment] ERROR: %s\n' "$*" >&2; exit 1; }

require_cmd() {
	command -v "$1" >/dev/null 2>&1 || die "Missing required command: $1"
}

# Read KEY=value from env file without printing the value. Prefers process env.
env_get() {
	local key="$1"
	local file="$2"
	if [[ -n "${!key:-}" ]]; then
		printf '%s' "${!key}"
		return 0
	fi
	[[ -f "$file" ]] || return 1
	local line
	line="$(grep -E "^${key}=" "$file" | tail -n1 || true)"
	[[ -n "$line" ]] || return 1
	local val="${line#*=}"
	# Strip matching single/double quotes
	if [[ "$val" =~ ^\"(.*)\"$ ]]; then val="${BASH_REMATCH[1]}"; fi
	if [[ "$val" =~ ^\'(.*)\'$ ]]; then val="${BASH_REMATCH[1]}"; fi
	printf '%s' "$val"
}

# First non-empty among env / env-file keys.
env_first() {
	local file="$1"
	shift
	local key val
	for key in "$@"; do
		val="$(env_get "$key" "$file" 2>/dev/null || true)"
		if [[ -n "$val" ]]; then
			printf '%s' "$val"
			return 0
		fi
	done
	return 1
}

port_in_use() {
	lsof -nP -iTCP:"$1" -sTCP:LISTEN >/dev/null 2>&1
}

is_node_fetch_blocked_port() {
	case "$1" in
		1 | 7 | 9 | 11 | 13 | 15 | 17 | 19 | 20 | 21 | 22 | 23 | 25 | 37 | 42 | 43 | 53 | 69 | 77 | 79 | 87 | 95 | 101 | 102 | 103 | 104 | 109 | 110 | 111 | 113 | 115 | 117 | 119 | 123 | 135 | 137 | 139 | 143 | 161 | 179 | 389 | 427 | 465 | 512 | 513 | 514 | 515 | 526 | 530 | 531 | 532 | 540 | 548 | 554 | 556 | 563 | 587 | 601 | 636 | 989 | 990 | 993 | 995 | 1719 | 1720 | 1723 | 2049 | 3659 | 4045 | 4190 | 5060 | 5061 | 6000 | 6566 | 6665 | 6666 | 6667 | 6668 | 6669 | 6679 | 6697)
			return 0
			;;
		*)
			return 1
			;;
	esac
}

remove_container_on_port() {
	local port="$1"
	local ids
	ids="$(docker ps -q --filter "publish=${port}")"
	[[ -n "$ids" ]] || return 1
	local id name
	for id in $ids; do
		name="$(docker inspect --format '{{.Name}}' "$id")"
		name="${name#/}"
		if [[ "$name" != n8n-eval-* ]]; then
			die "port ${port} is held by non-eval container(s): $(docker ps --filter "publish=${port}" --format '{{.Names}}' | tr '\n' ' ')"
		fi
	done
	log "removing existing eval container(s) on port ${port}"
	# shellcheck disable=SC2086
	docker rm -f $ids >/dev/null 2>&1 || true
	for _ in $(seq 1 20); do
		port_in_use "$port" || return 0
		sleep 0.5
	done
	return 1
}

allocate_lane_ports() {
	local count="$1"
	local start="$2"
	local port="$start"
	PORTS=()
	while ((${#PORTS[@]} < count)); do
		if ((port > 65535)); then
			die "could not allocate ${count} fetch-safe ports from ${start}"
		fi
		if is_node_fetch_blocked_port "$port"; then
			:
		elif port_in_use "$port"; then
			if remove_container_on_port "$port"; then
				PORTS+=("$port")
			else
				die "port ${port} in use by a non-docker process — stop it or use --start-port"
			fi
		else
			PORTS+=("$port")
		fi
		port=$((port + 1))
	done
}

wait_for_lane() {
	local port="$1"
	local timeout="${2:-120}"
	local i
	for ((i = 1; i <= timeout; i++)); do
		if curl -sf "http://localhost:${port}/healthz/readiness" >/dev/null 2>&1; then
			log "lane ready on port ${port} (${i}s)"
			return 0
		fi
		sleep 1
	done
	die "lane on port ${port} did not become ready within ${timeout}s"
}

# Resolve lane builder API key the same way CI does.
resolve_lane_api_key() {
	local model="$1"
	local model_url="$2"
	local file="$3"
	local key=""

	if [[ "$model" == custom/* ]]; then
		[[ -n "$model_url" ]] || die "model custom/* requires --model-url (OpenAI-compatible base ending in /v1)"
		printf ''
		return 0
	fi

	if [[ -n "$model_url" ]]; then
		key="$(env_first "$file" EVALS_AZURE_FOUNDRY_KEY N8N_INSTANCE_AI_MODEL_API_KEY || true)"
		[[ -n "$key" ]] || die "model-url is set but no Azure/Foundry key (EVALS_AZURE_FOUNDRY_KEY or N8N_INSTANCE_AI_MODEL_API_KEY). Use custom/* for keyless OpenAI-compatible endpoints."
		printf '%s' "$key"
		return 0
	fi

	case "$model" in
		openai/*)
			key="$(env_first "$file" EVALS_OPENAI_KEY OPENAI_API_KEY || true)"
			[[ -n "$key" ]] || die "model is openai/* but OPENAI_API_KEY / EVALS_OPENAI_KEY is empty"
			;;
		openrouter/*)
			key="$(env_first "$file" EVALS_OPENROUTER_KEY OPENROUTER_API_KEY || true)"
			[[ -n "$key" ]] || die "model is openrouter/* but OPENROUTER_API_KEY / EVALS_OPENROUTER_KEY is empty"
			;;
		xai/*)
			key="$(env_first "$file" EVALS_XAI_KEY XAI_API_KEY || true)"
			[[ -n "$key" ]] || die "model is xai/* but XAI_API_KEY / EVALS_XAI_KEY is empty"
			;;
		baseten/*)
			key="$(env_first "$file" EVALS_BASETEN_KEY BASETEN_API_KEY || true)"
			[[ -n "$key" ]] || die "model is baseten/* but BASETEN_API_KEY / EVALS_BASETEN_KEY is empty"
			;;
		fireworks/*)
			key="$(env_first "$file" EVALS_FIREWORKS_KEY FIREWORKS_API_KEY || true)"
			[[ -n "$key" ]] || die "model is fireworks/* but FIREWORKS_API_KEY / EVALS_FIREWORKS_KEY is empty"
			;;
		wafer/*)
			key="$(env_first "$file" EVALS_WAFER_KEY WAFER_API_KEY || true)"
			[[ -n "$key" ]] || die "model is wafer/* but WAFER_API_KEY / EVALS_WAFER_KEY is empty"
			;;
		morph/*)
			key="$(env_first "$file" EVALS_MORPH_KEY MORPH_API_KEY || true)"
			[[ -n "$key" ]] || die "model is morph/* but MORPH_API_KEY / EVALS_MORPH_KEY is empty"
			;;
		togetherai/*)
			key="$(env_first "$file" EVALS_TOGETHER_KEY TOGETHER_API_KEY || true)"
			[[ -n "$key" ]] || die "model is togetherai/* but TOGETHER_API_KEY / EVALS_TOGETHER_KEY is empty"
			;;
		vertex/*)
			# Vertex uses SA JSON, not a lane API key.
			printf ''
			return 0
			;;
		'' | anthropic/* | *)
			key="$(env_first "$file" EVALS_ANTHROPIC_KEY ANTHROPIC_API_KEY N8N_AI_ANTHROPIC_KEY N8N_INSTANCE_AI_MODEL_API_KEY || true)"
			[[ -n "$key" ]] || die "Need an Anthropic key for lane default / anthropic/* (EVALS_ANTHROPIC_KEY | ANTHROPIC_API_KEY | N8N_AI_ANTHROPIC_KEY)"
			;;
	esac
	printf '%s' "$key"
}

cleanup() {
	local status=$?
	if [[ "$KEEP_CONTAINERS" == true ]]; then
		log "keeping containers: ${CONTAINER_NAMES[*]:-none}"
		exit "$status"
	fi
	if [[ ${#CONTAINER_NAMES[@]:-0} -gt 0 ]]; then
		log "removing lane containers..."
		docker rm -f "${CONTAINER_NAMES[@]}" >/dev/null 2>&1 || true
	fi
	if [[ "$SANDBOX_STARTED" == true ]]; then
		log "cleaning sandbox service..."
		pnpm --filter n8n-containers services:clean >/dev/null 2>&1 || true
		docker network rm "$NETWORK_NAME" >/dev/null 2>&1 || true
	fi
	exit "$status"
}

# ---------------------------------------------------------------------------
# Parse args
# ---------------------------------------------------------------------------
# Read `--flag value` or `--flag=value` into the named variable, then shift.
# Usage: parse_opt VAR_NAME "$@" → sets VAR_NAME, updates positional params via return code:
# we mutate caller's $@ by echoing how many to shift... simpler: set a global.
OPT_SHIFTS=1
parse_opt_value() {
	local flag="$1"
	local arg="$2"
	local next="${3-}"
	if [[ "$arg" == *=* ]]; then
		OPT_VALUE="${arg#*=}"
		OPT_SHIFTS=1
	else
		[[ -n "$next" ]] || die "Missing value for ${flag}"
		OPT_VALUE="$next"
		OPT_SHIFTS=2
	fi
}

while [[ $# -gt 0 ]]; do
	case "$1" in
		--model|--model=*)
			parse_opt_value --model "$1" "${2-}"
			MODEL="$OPT_VALUE"
			shift "$OPT_SHIFTS"
			;;
		--model-url|--model-url=*)
			parse_opt_value --model-url "$1" "${2-}"
			MODEL_URL="$OPT_VALUE"
			shift "$OPT_SHIFTS"
			;;
		--suite|--suite=*)
			parse_opt_value --suite "$1" "${2-}"
			SUITE="$OPT_VALUE"
			shift "$OPT_SHIFTS"
			;;
		--workflow-dir|--workflow-dir=*)
			parse_opt_value --workflow-dir "$1" "${2-}"
			WORKFLOW_DIR="$OPT_VALUE"
			shift "$OPT_SHIFTS"
			;;
		--tier|--tier=*)
			parse_opt_value --tier "$1" "${2-}"
			TIER="$OPT_VALUE"
			shift "$OPT_SHIFTS"
			;;
		--filter|--filter=*)
			parse_opt_value --filter "$1" "${2-}"
			FILTER="$OPT_VALUE"
			shift "$OPT_SHIFTS"
			;;
		--iterations|--iterations=*)
			parse_opt_value --iterations "$1" "${2-}"
			ITERATIONS="$OPT_VALUE"
			shift "$OPT_SHIFTS"
			;;
		--experiment-name|--experiment-name=*)
			parse_opt_value --experiment-name "$1" "${2-}"
			EXPERIMENT_NAME="$OPT_VALUE"
			shift "$OPT_SHIFTS"
			;;
		--sandbox-provider|--sandbox-provider=*)
			parse_opt_value --sandbox-provider "$1" "${2-}"
			SANDBOX_PROVIDER="$OPT_VALUE"
			shift "$OPT_SHIFTS"
			;;
		--lanes|--lanes=*)
			parse_opt_value --lanes "$1" "${2-}"
			LANES="$OPT_VALUE"
			shift "$OPT_SHIFTS"
			;;
		--concurrency|--concurrency=*)
			parse_opt_value --concurrency "$1" "${2-}"
			EVAL_CONCURRENCY="$OPT_VALUE"
			shift "$OPT_SHIFTS"
			;;
		--vertex-project|--vertex-project=*)
			parse_opt_value --vertex-project "$1" "${2-}"
			VERTEX_PROJECT="$OPT_VALUE"
			shift "$OPT_SHIFTS"
			;;
		--vertex-location|--vertex-location=*)
			parse_opt_value --vertex-location "$1" "${2-}"
			VERTEX_LOCATION="$OPT_VALUE"
			shift "$OPT_SHIFTS"
			;;
		--start-port|--start-port=*)
			parse_opt_value --start-port "$1" "${2-}"
			START_PORT="$OPT_VALUE"
			shift "$OPT_SHIFTS"
			;;
		--image|--image=*)
			parse_opt_value --image "$1" "${2-}"
			IMAGE="$OPT_VALUE"
			shift "$OPT_SHIFTS"
			;;
		--build) BUILD_IMAGE=true; shift ;;
		--env-file|--env-file=*)
			parse_opt_value --env-file "$1" "${2-}"
			ENV_FILE="$OPT_VALUE"
			shift "$OPT_SHIFTS"
			;;
		--dataset|--dataset=*)
			parse_opt_value --dataset "$1" "${2-}"
			DATASET="$OPT_VALUE"
			shift "$OPT_SHIFTS"
			;;
		--baseline-prefix|--baseline-prefix=*)
			parse_opt_value --baseline-prefix "$1" "${2-}"
			BASELINE_PREFIX="$OPT_VALUE"
			shift "$OPT_SHIFTS"
			;;
		--skip-eval) SKIP_EVAL=true; shift ;;
		--keep-containers) KEEP_CONTAINERS=true; shift ;;
		-h | --help) usage; exit 0 ;;
		--)
			shift
			EVAL_ARGS+=("$@")
			break
			;;
		--*)
			# Unknown --flags belong to this script, not eval:instance-ai.
			die "Unknown flag: $1 (pass eval:instance-ai-only flags after -- )"
			;;
		*)
			EVAL_ARGS+=("$1")
			shift
			;;
	esac
done

# CI defaults: 10/32, baseten/* → 1/2
if [[ -z "$LANES" ]]; then
	if [[ "$MODEL" == baseten/* ]]; then LANES=1; else LANES=10; fi
fi
if [[ -z "$EVAL_CONCURRENCY" ]]; then
	if [[ "$MODEL" == baseten/* ]]; then EVAL_CONCURRENCY=2; else EVAL_CONCURRENCY=32; fi
fi

[[ "$LANES" =~ ^[0-9]+$ ]] || die "--lanes must be an integer"
((LANES >= 1 && LANES <= 11)) || die "--lanes must be 1-11 (got $LANES)"
[[ "$EVAL_CONCURRENCY" =~ ^[0-9]+$ ]] || die "--concurrency must be an integer"
[[ "$ITERATIONS" =~ ^[0-9]+$ ]] || die "--iterations must be an integer"
[[ "$SANDBOX_PROVIDER" == "n8n-sandbox" || "$SANDBOX_PROVIDER" == "daytona" ]] || \
	die "--sandbox-provider must be n8n-sandbox or daytona"

ENV_FILE_PATH="${REPO_ROOT}/${ENV_FILE}"
[[ -f "$ENV_FILE_PATH" ]] || die "Env file not found: $ENV_FILE_PATH"

require_cmd docker
require_cmd curl
require_cmd lsof
require_cmd pnpm
require_cmd jq

cd "$REPO_ROOT"

# ---------------------------------------------------------------------------
# Resolve secrets / config (values never logged)
# ---------------------------------------------------------------------------
LANE_API_KEY="$(resolve_lane_api_key "$MODEL" "$MODEL_URL" "$ENV_FILE_PATH")"
CLI_ANTHROPIC_KEY="$(env_first "$ENV_FILE_PATH" EVALS_ANTHROPIC_KEY ANTHROPIC_API_KEY N8N_AI_ANTHROPIC_KEY N8N_INSTANCE_AI_MODEL_API_KEY || true)"
[[ -n "$CLI_ANTHROPIC_KEY" ]] || die "Verifier/mocks need an Anthropic key (EVALS_ANTHROPIC_KEY | ANTHROPIC_API_KEY | N8N_AI_ANTHROPIC_KEY)"

LANGSMITH_API_KEY_VAL="$(env_first "$ENV_FILE_PATH" EVALS_LANGSMITH_API_KEY LANGSMITH_API_KEY || true)"
LANGSMITH_ENDPOINT_VAL="$(env_first "$ENV_FILE_PATH" EVALS_LANGSMITH_ENDPOINT LANGSMITH_ENDPOINT || true)"

# Resolve offline suite directory (no LangTracer).
if [[ -z "$WORKFLOW_DIR" ]]; then
	WORKFLOW_DIR="${EVAL_PKG_DIR}/evaluations/data/suites/${SUITE}"
elif [[ "$WORKFLOW_DIR" != /* ]]; then
	WORKFLOW_DIR="${REPO_ROOT}/${WORKFLOW_DIR}"
fi
if [[ "$SKIP_EVAL" != true ]]; then
	[[ -d "$WORKFLOW_DIR" ]] || die "Suite directory not found: ${WORKFLOW_DIR}
Available offline suites:
$(ls -1 "${EVAL_PKG_DIR}/evaluations/data/suites" 2>/dev/null | sed 's/^/  /' || echo '  (none)')"
	case_count="$(find "$WORKFLOW_DIR" -maxdepth 1 -name '*.json' | wc -l | tr -d ' ')"
	((case_count > 0)) || die "No case *.json files in ${WORKFLOW_DIR}"
	log "offline suite: ${SUITE} (${case_count} cases) → ${WORKFLOW_DIR}"
	if [[ -z "$LANGSMITH_API_KEY_VAL" ]]; then
		log "LANGSMITH_API_KEY not set — results will only be written locally (eval-results.json)"
	fi
fi

LICENSE_KEY="$(env_first "$ENV_FILE_PATH" N8N_LICENSE_ACTIVATION_KEY || true)"
LICENSE_CERT="$(env_first "$ENV_FILE_PATH" N8N_LICENSE_CERT || true)"
ENCRYPTION_KEY="$(env_first "$ENV_FILE_PATH" N8N_ENCRYPTION_KEY || true)"
DAYTONA_KEY="$(env_first "$ENV_FILE_PATH" DAYTONA_API_KEY || true)"
DAYTONA_URL="$(env_first "$ENV_FILE_PATH" DAYTONA_API_URL || true)"
DAYTONA_URL="${DAYTONA_URL:-https://app.daytona.io/api}"

VERTEX_SA_JSON=""
if [[ "$MODEL" == vertex/* ]]; then
	VERTEX_SA_JSON="$(env_first "$ENV_FILE_PATH" EVALS_VERTEX_SA_JSON N8N_INSTANCE_AI_VERTEX_CREDENTIALS || true)"
	[[ -n "$VERTEX_SA_JSON" ]] || die "model is vertex/* but EVALS_VERTEX_SA_JSON / N8N_INSTANCE_AI_VERTEX_CREDENTIALS is empty"
	if [[ -z "$VERTEX_PROJECT" ]]; then
		VERTEX_PROJECT="$(env_first "$ENV_FILE_PATH" EVALS_VERTEX_PROJECT N8N_INSTANCE_AI_VERTEX_PROJECT || true)"
	fi
	if [[ -z "$VERTEX_PROJECT" ]]; then
		VERTEX_PROJECT="$(printf '%s' "$VERTEX_SA_JSON" | jq -r '.project_id // empty')"
	fi
	[[ -n "$VERTEX_PROJECT" ]] || die "vertex/* requires --vertex-project or project_id in the SA JSON"
	VERTEX_LOCATION="${VERTEX_LOCATION:-global}"
fi

if [[ "$SANDBOX_PROVIDER" == "daytona" && -z "$DAYTONA_KEY" ]]; then
	die "sandbox-provider=daytona requires DAYTONA_API_KEY"
fi

if [[ "$BUILD_IMAGE" == true ]]; then
	log "building docker image ${IMAGE}..."
	INCLUDE_TEST_CONTROLLER=true pnpm build:docker
elif ! docker image inspect "$IMAGE" >/dev/null 2>&1; then
	die "docker image '${IMAGE}' not found — rerun with --build"
fi

allocate_lane_ports "$LANES" "$START_PORT"
BASE_URLS=()
for port in "${PORTS[@]}"; do
	BASE_URLS+=("http://localhost:${port}")
done
BASE_URL_CSV="$(IFS=,; printf '%s' "${BASE_URLS[*]}")"

trap cleanup EXIT

# ---------------------------------------------------------------------------
# Sandbox service (n8n-sandbox only)
# ---------------------------------------------------------------------------
# Reclaim leftovers from an interrupted prior run (network 409, stale lanes).
reclaim_eval_stack() {
	log "reclaiming leftover eval containers / sandbox / network (if any)..."
	local ids
	ids="$(docker ps -aq --filter "name=n8n-eval-" 2>/dev/null || true)"
	if [[ -n "$ids" ]]; then
		# shellcheck disable=SC2086
		docker rm -f $ids >/dev/null 2>&1 || true
	fi
	pnpm --filter n8n-containers services:clean >/dev/null 2>&1 || true
	# Compose project label cleanup can leave the named network behind.
	docker network rm "$NETWORK_NAME" >/dev/null 2>&1 || true
}

NETWORK_ARGS=()
SANDBOX_ARGS=()
if [[ "$SANDBOX_PROVIDER" == "n8n-sandbox" ]]; then
	reclaim_eval_stack
	log "starting sandbox service on network ${NETWORK_NAME}..."
	pnpm --filter n8n-containers services --services sandbox --network "$NETWORK_NAME" --name n8n-svc-sandbox
	SANDBOX_STARTED=true
	NETWORK_ARGS=(--network "$NETWORK_NAME")
	SANDBOX_ARGS=(
		-e N8N_INSTANCE_AI_SANDBOX_PROVIDER=n8n-sandbox
		-e N8N_SANDBOX_SERVICE_URL=http://sandbox-api:8080
		-e N8N_SANDBOX_SERVICE_API_KEY=n8n-sandbox-ci-key
	)
else
	SANDBOX_ARGS=(
		-e N8N_INSTANCE_AI_SANDBOX_PROVIDER=daytona
		-e N8N_INSTANCE_AI_SANDBOX_NAME_PREFIX="evals-local-$(whoami)"
		-e DAYTONA_API_URL="$DAYTONA_URL"
		-e DAYTONA_API_KEY="$DAYTONA_KEY"
	)
fi

MODEL_ARGS=()
if [[ -n "$MODEL" ]]; then
	MODEL_ARGS+=(-e N8N_INSTANCE_AI_MODEL="$MODEL")
fi
if [[ -n "$MODEL_URL" ]]; then
	MODEL_ARGS+=(-e N8N_INSTANCE_AI_MODEL_URL="$MODEL_URL")
fi
if [[ "$MODEL" == vertex/* ]]; then
	MODEL_ARGS+=(
		-e N8N_INSTANCE_AI_VERTEX_PROJECT="$VERTEX_PROJECT"
		-e N8N_INSTANCE_AI_VERTEX_LOCATION="$VERTEX_LOCATION"
		-e N8N_INSTANCE_AI_VERTEX_CREDENTIALS="$VERTEX_SA_JSON"
	)
fi

LICENSE_ARGS=()
[[ -n "$LICENSE_KEY" ]] && LICENSE_ARGS+=(-e N8N_LICENSE_ACTIVATION_KEY="$LICENSE_KEY")
[[ -n "$LICENSE_CERT" ]] && LICENSE_ARGS+=(-e N8N_LICENSE_CERT="$LICENSE_CERT")
[[ -n "$ENCRYPTION_KEY" ]] && LICENSE_ARGS+=(-e N8N_ENCRYPTION_KEY="$ENCRYPTION_KEY")

LANGSMITH_ARGS=()
if [[ -n "$LANGSMITH_API_KEY_VAL" ]]; then
	LANGSMITH_ARGS+=(
		-e LANGSMITH_TRACING=true
		-e LANGSMITH_API_KEY="$LANGSMITH_API_KEY_VAL"
		-e LANGSMITH_PROJECT=instance-ai-evals
	)
	[[ -n "$LANGSMITH_ENDPOINT_VAL" ]] && LANGSMITH_ARGS+=(-e LANGSMITH_ENDPOINT="$LANGSMITH_ENDPOINT_VAL")
fi

# ---------------------------------------------------------------------------
# Start lanes
# ---------------------------------------------------------------------------
log "starting ${LANES} lane(s) on ports: ${PORTS[*]}"
log "model=${MODEL:-<image default>} sandbox=${SANDBOX_PROVIDER} concurrency=${EVAL_CONCURRENCY}"
if [[ "$MODEL" == custom/* ]]; then
	log "custom/* → lane API key empty; CLI verifier/mocks still use Anthropic"
fi

for i in "${!PORTS[@]}"; do
	port="${PORTS[$i]}"
	name="n8n-eval-$((i + 1))"
	CONTAINER_NAMES+=("$name")

	if docker container inspect "$name" >/dev/null 2>&1; then
		log "removing stale container ${name}"
		docker rm -f "$name" >/dev/null 2>&1 || true
	fi

	docker run -d --name "$name" \
		"${NETWORK_ARGS[@]+"${NETWORK_ARGS[@]}"}" \
		--memory 2.5g --memory-swap 2.5g \
		--restart on-failure \
		--log-opt max-size=50m --log-opt max-file=2 \
		-e NODE_OPTIONS=--max-old-space-size=2048 \
		-e EXECUTIONS_DATA_PRUNE=true \
		-e EXECUTIONS_DATA_MAX_AGE=1 \
		-e E2E_TESTS=true \
		-e N8N_ENABLED_MODULES=instance-ai \
		-e N8N_AI_ENABLED=true \
		-e N8N_INSTANCE_AI_MODEL_API_KEY="$LANE_API_KEY" \
		-e N8N_AI_ASSISTANT_BASE_URL="" \
		-e N8N_INSTANCE_AI_SANDBOX_ENABLED=true \
		"${SANDBOX_ARGS[@]}" \
		"${MODEL_ARGS[@]+"${MODEL_ARGS[@]}"}" \
		"${LANGSMITH_ARGS[@]+"${LANGSMITH_ARGS[@]}"}" \
		"${LICENSE_ARGS[@]+"${LICENSE_ARGS[@]}"}" \
		-p "${port}:5678" \
		"$IMAGE" >/dev/null

	log "started ${name} → localhost:${port}"
done

for port in "${PORTS[@]}"; do
	wait_for_lane "$port" 120
done

# ---------------------------------------------------------------------------
# Seed + assert (CI parity)
# ---------------------------------------------------------------------------
log "seeding E2E users on all lanes..."
for port in "${PORTS[@]}"; do
	curl -sf -X POST "http://localhost:${port}/rest/e2e/reset" \
		-H "Content-Type: application/json" \
		-d "$RESET_PAYLOAD" >/dev/null
done

log "asserting sandbox + model on every lane..."
bad=0
for i in "${!PORTS[@]}"; do
	port="${PORTS[$i]}"
	lane="$((i + 1))"
	cookie="/tmp/n8n-eval-cookies-${port}.txt"
	rm -f "$cookie"
	curl -sf -X POST "http://localhost:${port}/rest/login" \
		-H "Content-Type: application/json" \
		-d '{"emailOrLdapLoginId":"nathan@n8n.io","password":"PlaywrightTest123"}' \
		-c "$cookie" -o /dev/null
	cfg="$(curl -sf -b "$cookie" "http://localhost:${port}/rest/instance-ai/settings" \
		| jq -r '.data | "\(.sandboxEnabled) \(.sandboxProvider)"')"
	if [[ "$cfg" != "true ${SANDBOX_PROVIDER}" ]]; then
		log "ERROR: lane ${lane} (port ${port}): expected 'true ${SANDBOX_PROVIDER}', got '${cfg}'"
		bad=$((bad + 1))
	else
		log "  lane ${lane}: sandbox ok"
	fi
	if [[ -n "$MODEL" ]]; then
		expected_model="${MODEL#*/}"
		effective="$(curl -sf -b "$cookie" "http://localhost:${port}/rest/instance-ai/preferences" \
			| jq -r '.data.modelName')"
		if [[ "$effective" != "$expected_model" ]]; then
			log "ERROR: lane ${lane} (port ${port}): expected model '${expected_model}', got '${effective}'"
			bad=$((bad + 1))
		else
			log "  lane ${lane}: model=${effective} ok"
		fi
	fi
done
((bad == 0)) || die "${bad} lane(s) misconfigured — aborting before eval"

if [[ "$SKIP_EVAL" == true ]]; then
	log "skip-eval set — lanes are up and asserted"
	log "base URLs: ${BASE_URL_CSV}"
	exit 0
fi

# ---------------------------------------------------------------------------
# Run evals (CI args)
# ---------------------------------------------------------------------------
BRANCH_NAME="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo local)"
REVISION_SHA="$(git rev-parse HEAD 2>/dev/null || echo unknown)"

log "running eval:instance-ai"
log "  suite=${SUITE} workflow-dir=${WORKFLOW_DIR}"
log "  tier=${TIER:-<none>} filter=${FILTER:-<none>}"
log "  iterations=${ITERATIONS} experiment=${EXPERIMENT_NAME:-<auto>}"
log "  base-url=${BASE_URL_CSV}"

cd "$EVAL_PKG_DIR"

# Match the CI eval step: verifier/mocks use Anthropic only. Pre-set these
# before dotenvx so a builder custom/* / model-url in .env.local cannot hijack
# createEvalAgent (EVAL_MODEL wins over MODEL; empty URL/headers stick).
export N8N_INSTANCE_AI_MODEL_API_KEY="$CLI_ANTHROPIC_KEY"
export N8N_INSTANCE_AI_EVAL_MODEL=anthropic/claude-sonnet-4-6
export N8N_INSTANCE_AI_MODEL_URL=""
export N8N_INSTANCE_AI_MODEL_HEADERS=""
export EVAL_MODAL_LLM_HEADERS=""
export LANGSMITH_REVISION_ID="$REVISION_SHA"
export LANGSMITH_BRANCH="$BRANCH_NAME"
if [[ -n "$LANGSMITH_API_KEY_VAL" ]]; then
	export LANGSMITH_TRACING=true
	export LANGSMITH_API_KEY="$LANGSMITH_API_KEY_VAL"
	export LANGSMITH_PROJECT=instance-ai-evals
	[[ -n "$LANGSMITH_ENDPOINT_VAL" ]] && export LANGSMITH_ENDPOINT="$LANGSMITH_ENDPOINT_VAL"
fi

ARGS=(
	--base-url "$BASE_URL_CSV"
	--concurrency "$EVAL_CONCURRENCY"
	--verbose
	--iterations "$ITERATIONS"
	--source disk
	--workflow-dir "$WORKFLOW_DIR"
	--dataset "$DATASET"
	--baseline-prefix "$BASELINE_PREFIX"
)
[[ -n "$FILTER" ]] && ARGS+=(--filter "$FILTER")
[[ -n "$TIER" ]] && ARGS+=(--tier "$TIER")
[[ -n "$EXPERIMENT_NAME" ]] && ARGS+=(--experiment-name "$EXPERIMENT_NAME")
if [[ ${#EVAL_ARGS[@]} -gt 0 ]]; then
	ARGS+=("${EVAL_ARGS[@]}")
fi

# dotenvx loads remaining knobs from .env.local; it does not override the
# exports above (CI-critical keys stay pinned).
if command -v dotenvx >/dev/null 2>&1; then
	dotenvx run -f "$ENV_FILE_PATH" -- pnpm eval:instance-ai "${ARGS[@]}"
else
	pnpm exec dotenvx run -f "$ENV_FILE_PATH" -- pnpm eval:instance-ai "${ARGS[@]}"
fi

if [[ ! -f "${EVAL_PKG_DIR}/eval-results.json" ]]; then
	die "Eval produced no eval-results.json — check logs above"
fi

log "done. results: ${EVAL_PKG_DIR}/eval-results.json"
log "report:       ${EVAL_PKG_DIR}/.data/workflow-eval-report.html"
