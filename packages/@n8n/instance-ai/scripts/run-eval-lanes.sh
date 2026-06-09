#!/usr/bin/env bash
#
# Spin up N local n8n eval lanes and run eval:instance-ai against them.
#
# Usage:
#   ./scripts/run-eval-lanes.sh --instance-count 5
#   ./scripts/run-eval-lanes.sh 5 --tier pr --verbose
#   ./scripts/run-eval-lanes.sh --instance-count 3 --build -- --filter contact-form
#
# Requires:
#   - docker
#   - dotenvx (pnpm exec dotenvx works)
#   - n8nio/n8n:local image (build with: INCLUDE_TEST_CONTROLLER=true pnpm build:docker)
#   - .env.local at repo root with N8N_INSTANCE_AI_MODEL_API_KEY (+ optional N8N_EVAL_*)
#
set -euo pipefail

# ---------------------------------------------------------------------------
# Defaults
# ---------------------------------------------------------------------------
INSTANCE_COUNT=""
START_PORT=6678
IMAGE="n8nio/n8n:local"
BUILD_IMAGE=false
SKIP_EVAL=false
KEEP_CONTAINERS=false
EVAL_CONCURRENCY="" # auto = instance-count * 4
EVAL_ITERATIONS=1
EVAL_TIER=""
ENV_FILE=".env.local"
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
EVAL_ARGS=()
CONTAINER_NAMES=()

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
usage() {
	cat <<'EOF'
Usage: run-eval-lanes.sh [--instance-count N] [options] [-- eval-args...]

Options:
  --instance-count N  Number of n8n instances / ports to open (required)
  --start-port N      First host port to try (default: 6678; skips Node fetch-blocked ports)
  --image NAME        Docker image (default: n8nio/n8n:local)
  --build             Build docker image before starting lanes
  --env-file PATH     Env file relative to repo root (default: .env.local)
  --concurrency N     Eval scenario concurrency (default: instance-count * 4)
  --iterations N      Eval iterations per case (default: 3)
  --tier NAME         Eval tier filter (default: none; use "pr" for PR suite)
  --skip-eval         Only start + seed lanes; do not run evals
  --keep-containers   Do not remove containers on exit
  -h, --help          Show this help

Everything after `--` is passed straight to eval:instance-ai
(e.g. --filter foo, --keep-workflows, --exclude bar).

Examples:
  ./scripts/run-eval-lanes.sh --instance-count 5
  ./scripts/run-eval-lanes.sh 5 --build --tier pr --verbose
  ./scripts/run-eval-lanes.sh --instance-count 3 -- --filter contact-form --keep-workflows
EOF
}

log() {
	printf '[eval-lanes] %s\n' "$*"
}

die() {
	printf '[eval-lanes] ERROR: %s\n' "$*" >&2
	exit 1
}

require_cmd() {
	command -v "$1" >/dev/null 2>&1 || die "Missing required command: $1"
}

port_in_use() {
	lsof -nP -iTCP:"$1" -sTCP:LISTEN >/dev/null 2>&1
}

# Node's fetch() (undici) refuses a fixed set of "bad" ports. The eval CLI
# uses fetch for every n8n REST call, so lane ports must not land on them.
# See: https://fetch.spec.whatwg.org/#port-blocking
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

allocate_lane_ports() {
	local count="$1"
	local start="$2"
	local port="$start"
	local max_port=65535

	PORTS=()
	while ((${#PORTS[@]} < count)); do
		if ((port > max_port)); then
			die "could not allocate ${count} fetch-safe ports from ${start} (stopped at ${max_port})"
		fi
		if is_node_fetch_blocked_port "$port"; then
			log "skipping port ${port} (blocked by Node fetch)"
		elif port_in_use "$port"; then
			die "port ${port} is already in use — stop the existing process or pick --start-port"
		else
			PORTS+=("$port")
		fi
		port=$((port + 1))
	done
}

wait_for_lane() {
	local port="$1"
	local timeout="${2:-120}"
	for ((i = 1; i <= timeout; i++)); do
		if curl -sf "http://localhost:${port}/healthz/readiness" >/dev/null 2>&1; then
			log "lane ready on port ${port} (${i}s)"
			return 0
		fi
		sleep 1
	done
	die "lane on port ${port} did not become ready within ${timeout}s"
}

load_env_var() {
	local key="$1"
	local file="$2"
	[[ -f "$file" ]] || die "Env file not found: $file"
	local line
	line="$(grep -E "^${key}=" "$file" | tail -n1 || true)"
	[[ -n "$line" ]] || die "Missing ${key} in ${file}"
	printf '%s' "${line#*=}"
}

dotenvx_run() {
	if command -v dotenvx >/dev/null 2>&1; then
		dotenvx run -f "$ENV_FILE_PATH" -- "$@"
	else
		pnpm exec dotenvx run -f "$ENV_FILE_PATH" -- "$@"
	fi
}

cleanup() {
	local status=$?
	if [[ "$KEEP_CONTAINERS" == true ]]; then
		log "keeping containers: ${CONTAINER_NAMES[*]:-none}"
		exit "$status"
	fi

	if [[ ${#CONTAINER_NAMES[@]:-0} -gt 0 ]]; then
		log "removing containers..."
		docker rm -f "${CONTAINER_NAMES[@]}" >/dev/null 2>&1 || true
	fi
	exit "$status"
}

# ---------------------------------------------------------------------------
# Parse args
# ---------------------------------------------------------------------------
while [[ $# -gt 0 ]]; do
	case "$1" in
		--instance-count)
			INSTANCE_COUNT="${2:-}"
			shift 2
			;;
		--start-port)
			START_PORT="${2:-}"
			shift 2
			;;
		--image)
			IMAGE="${2:-}"
			shift 2
			;;
		--build)
			BUILD_IMAGE=true
			shift
			;;
		--env-file)
			ENV_FILE="${2:-}"
			shift 2
			;;
		--concurrency)
			EVAL_CONCURRENCY="${2:-}"
			shift 2
			;;
		--iterations)
			EVAL_ITERATIONS="${2:-}"
			shift 2
			;;
		--tier)
			EVAL_TIER="${2:-}"
			shift 2
			;;
		--skip-eval)
			SKIP_EVAL=true
			shift
			;;
		--keep-containers)
			KEEP_CONTAINERS=true
			shift
			;;
		-h | --help)
			usage
			exit 0
			;;
		--)
			shift
			EVAL_ARGS+=("$@")
			break
			;;
		[0-9]*)
			INSTANCE_COUNT="$1"
			shift
			;;
		*)
			EVAL_ARGS+=("$1")
			shift
			;;
	esac
done

[[ -n "$INSTANCE_COUNT" ]] || {
	usage
	die "--instance-count is required"
}
[[ "$INSTANCE_COUNT" =~ ^[0-9]+$ ]] || die "--instance-count must be a positive integer"
((INSTANCE_COUNT >= 1)) || die "--instance-count must be >= 1"
[[ "$START_PORT" =~ ^[0-9]+$ ]] || die "--start-port must be a number"
((START_PORT >= 1 && START_PORT <= 65535)) || die "invalid --start-port"

if [[ -z "$EVAL_CONCURRENCY" ]]; then
	EVAL_CONCURRENCY=$((INSTANCE_COUNT * 4))
fi

ENV_FILE_PATH="${REPO_ROOT}/${ENV_FILE}"
EVAL_PKG_DIR="${REPO_ROOT}/packages/@n8n/instance-ai"
RESET_PAYLOAD='{"owner":{"email":"nathan@n8n.io","password":"PlaywrightTest123","firstName":"Eval","lastName":"Owner"},"admin":{"email":"admin@n8n.io","password":"PlaywrightTest123","firstName":"Admin","lastName":"User"},"members":[],"chat":{"email":"chat@n8n.io","password":"PlaywrightTest123","firstName":"Chat","lastName":"User"}}'

PORTS=()
BASE_URLS=()

allocate_lane_ports "$INSTANCE_COUNT" "$START_PORT"

for port in "${PORTS[@]}"; do
	BASE_URLS+=("http://localhost:${port}")
done

BASE_URL_CSV="$(IFS=,; printf '%s' "${BASE_URLS[*]}")"

# ---------------------------------------------------------------------------
# Preflight
# ---------------------------------------------------------------------------
require_cmd docker
require_cmd curl
require_cmd lsof
require_cmd pnpm

cd "$REPO_ROOT"

API_KEY="$(load_env_var N8N_INSTANCE_AI_MODEL_API_KEY "$ENV_FILE_PATH")"
[[ -n "$API_KEY" ]] || die "N8N_INSTANCE_AI_MODEL_API_KEY is empty"

if [[ "$BUILD_IMAGE" == true ]]; then
	log "building docker image ${IMAGE}..."
	INCLUDE_TEST_CONTROLLER=true pnpm build:docker
elif ! docker image inspect "$IMAGE" >/dev/null 2>&1; then
	die "docker image '${IMAGE}' not found — rerun with --build"
fi

trap cleanup EXIT

# ---------------------------------------------------------------------------
# Start lanes
# ---------------------------------------------------------------------------
log "starting ${INSTANCE_COUNT} lane(s) on ports: ${PORTS[*]}"

for port in "${PORTS[@]}"; do
	name="n8n-eval-${port}"
	CONTAINER_NAMES+=("$name")

	docker run -d --name "$name" \
		-e E2E_TESTS=true \
		-e N8N_ENABLED_MODULES=instance-ai \
		-e N8N_AI_ENABLED=true \
		-e N8N_INSTANCE_AI_MODEL_API_KEY="$API_KEY" \
		-e N8N_AI_ASSISTANT_BASE_URL="" \
		-p "${port}:5678" \
		"$IMAGE" >/dev/null

	log "started container ${name}"
done

for port in "${PORTS[@]}"; do
	wait_for_lane "$port" 120
done

# ---------------------------------------------------------------------------
# Seed owner on every lane
# ---------------------------------------------------------------------------
log "seeding credentials/users on all lanes..."

for port in "${PORTS[@]}"; do
	curl -sf -X POST "http://localhost:${port}/rest/e2e/reset" \
		-H "Content-Type: application/json" \
		-d "$RESET_PAYLOAD" >/dev/null
	log "seeded port ${port}"
done

# ---------------------------------------------------------------------------
# Run evals
# ---------------------------------------------------------------------------
if [[ "$SKIP_EVAL" == true ]]; then
	log "skip-eval set — lanes are up and seeded"
	log "base URLs: ${BASE_URL_CSV}"
	exit 0
fi

[[ -d "$EVAL_PKG_DIR" ]] || die "eval package not found: ${EVAL_PKG_DIR}"

log "running eval:instance-ai"
log "  lanes:       ${INSTANCE_COUNT}"
log "  base-url:    ${BASE_URL_CSV}"
log "  concurrency: ${EVAL_CONCURRENCY}"
log "  iterations:  ${EVAL_ITERATIONS}"
log "  tier:        ${EVAL_TIER:-<none>}"

cd "$EVAL_PKG_DIR"

ARGS=(
	pnpm eval:instance-ai
	--base-url "$BASE_URL_CSV"
	--concurrency "$EVAL_CONCURRENCY"
	--iterations "$EVAL_ITERATIONS"
	--verbose
)

if [[ -n "$EVAL_TIER" ]]; then
	ARGS+=(--tier "$EVAL_TIER")
fi

if [[ ${#EVAL_ARGS[@]} -gt 0 ]]; then
	ARGS+=("${EVAL_ARGS[@]}")
fi

dotenvx_run "${ARGS[@]}"
