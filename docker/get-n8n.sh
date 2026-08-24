#!/bin/sh
#
# get-n8n.sh — one-script setup for a self-hosted n8n instance (docker compose).
#
# Usage:
#   curl -fsSL https://get.n8n.io | sh
#   curl -fsSL https://get.n8n.io | sh -s -- --upgrade
#
# Prefer to inspect before running?
#   curl -fsSL https://get.n8n.io -o get-n8n.sh && less get-n8n.sh && sh get-n8n.sh
#
# Source: https://github.com/n8n-io/n8n/blob/master/docker/get-n8n.sh
set -eu

SCRIPT_VERSION="1.2.0"
# The version to install is derived from the latest stable GitHub release in
# resolve_n8n_version(); this fallback only applies when that lookup fails.
FALLBACK_N8N_VERSION="2.32.0"
N8N_DIR="${N8N_DIR:-./n8n}"
N8N_PORT=5678
SOURCE_URL="https://github.com/n8n-io/n8n/blob/master/docker/get-n8n.sh"
# The stack definition lives next to this script in the repo and is downloaded
# at install time. A plain filesystem path also works (used by the test
# harness to install from a working copy).
COMPOSE_SOURCE="${N8N_COMPOSE_URL:-https://raw.githubusercontent.com/n8n-io/n8n/master/docker/get-n8n-compose.yml}"
COMPOSE_HISTORY_URL="https://github.com/n8n-io/n8n/commits/master/docker/get-n8n-compose.yml"
DOCS_HOSTING_URL="https://docs.n8n.io/hosting/"

UPGRADE=0
NO_START=0
REQUESTED_VERSION=""

say() { printf '%s\n' "$*"; }
ok() { printf '\342\234\223 %s\n' "$*"; }
fail() {
	printf 'Error: %s\n' "$*" >&2
	exit 1
}

usage() {
	cat <<EOF
get-n8n.sh v${SCRIPT_VERSION} — set up a self-hosted n8n instance with docker compose.

Usage: get-n8n.sh [options]
       curl -fsSL https://get.n8n.io | sh -s -- [options]

Options:
  --version [x.y.z]  Without a value: print script version and the n8n version
                     that would be installed (latest stable). With a value:
                     install (or, with --upgrade, upgrade to) that n8n version.
  --upgrade          Upgrade an existing install: updates the N8N_VERSION line
                     in .env, pulls images and restarts. Never touches any
                     other configuration or secrets.
  --no-start         Write the configuration files but don't start n8n.
  --help             Show this help.

Environment:
  N8N_DIR            Install directory (default: ./n8n)

For production-grade setups (TLS, Postgres, queue mode) see:
  ${DOCS_HOSTING_URL}
EOF
}

parse_args() {
	while [ $# -gt 0 ]; do
		case "$1" in
			--version)
				if [ $# -gt 1 ] && [ "${2#-}" = "$2" ]; then
					valid_n8n_version "$2" ||
						fail "invalid --version '$2' — expected a release version like 2.32.0"
					REQUESTED_VERSION="$2"
					shift
				else
					say "get-n8n.sh v${SCRIPT_VERSION} (installs the latest stable n8n, currently $(resolve_n8n_version))"
					exit 0
				fi
				;;
			--upgrade) UPGRADE=1 ;;
			--no-start) NO_START=1 ;;
			--help | -h)
				usage
				exit 0
				;;
			*)
				usage >&2
				fail "unknown option: $1"
				;;
		esac
		shift
	done
}

check_deps() {
	command -v docker >/dev/null 2>&1 || fail "Docker is not installed.
  Install it first:
    Linux / WSL:   curl -fsSL https://get.docker.com | sh
                   then: sudo usermod -aG docker \$USER && re-open your shell
    macOS:         https://docs.docker.com/desktop/setup/install/mac-install/
    Windows:       https://docs.docker.com/desktop/setup/install/windows-install/
                   (enable your distro under Settings > Resources > WSL integration)
  Podman, Colima and other Docker-compatible engines work too: install the
  'docker' CLI with the compose plugin and point DOCKER_HOST at their socket."

	docker compose version >/dev/null 2>&1 || fail "Docker Compose v2 plugin is not available.
  ('docker compose version' failed — the legacy 'docker-compose' binary is not supported.)
  See https://docs.docker.com/compose/install/"

	docker info >/dev/null 2>&1 || fail "The Docker daemon is not running (or DOCKER_HOST points at a dead socket).
  Start Docker (e.g. open Docker Desktop, or 'sudo systemctl start docker') and re-run.
  Podman/Colima users: make sure the machine/socket is running, e.g.
  'podman machine start' or 'colima start', and DOCKER_HOST points at it."

	ok "Docker found ($(docker --version | awk '{print $3}' | tr -d ','))"
	ok "Docker Compose found ($(docker compose version --short 2>/dev/null))"
}

# Prints the content of a URL (or plain file path) to stdout.
fetch() {
	case "$1" in
	*://*)
		if command -v curl >/dev/null 2>&1; then
			curl -fsSL --max-time 10 "$1" 2>/dev/null
		elif command -v wget >/dev/null 2>&1; then
			wget -qO- -T 10 "$1" 2>/dev/null
		else
			return 2
		fi
		;;
	*) cat "$1" 2>/dev/null ;;
	esac
}

# Returns 0 if an HTTP GET against $1 gets any response at all.
http_get() {
	if command -v curl >/dev/null 2>&1; then
		curl -sf -o /dev/null --max-time 3 "$1"
	elif command -v wget >/dev/null 2>&1; then
		wget -q -O /dev/null -T 3 "$1" 2>/dev/null
	else
		return 2
	fi
}

port_in_use() {
	# In use only when something actually answers. Refusals AND timeouts count
	# as free: Windows firewalls/WSL drop instead of refusing, which made the
	# old "anything but refused" check a false positive. --noproxy keeps a
	# corporate proxy from answering on 127.0.0.1's behalf. Ambiguous cases
	# fall through to the container healthcheck, which surfaces real conflicts.
	if command -v curl >/dev/null 2>&1; then
		rc=0
		curl -s -o /dev/null --noproxy '*' --max-time 2 "http://127.0.0.1:${N8N_PORT}/" 2>/dev/null || rc=$?
		# rc 0 = HTTP response; 52/56 = connection accepted but no/broken reply.
		[ "$rc" -eq 0 ] || [ "$rc" -eq 52 ] || [ "$rc" -eq 56 ]
	elif command -v wget >/dev/null 2>&1; then
		rc=0
		wget -q -O /dev/null --no-proxy -T 2 "http://127.0.0.1:${N8N_PORT}/" 2>/dev/null || rc=$?
		# rc 0 = OK response; 8 = server issued an error response.
		[ "$rc" -eq 0 ] || [ "$rc" -eq 8 ]
	else
		return 1
	fi
}

gen_secret() {
	if command -v openssl >/dev/null 2>&1; then
		openssl rand -hex 24
	else
		od -An -tx1 -N24 /dev/urandom | tr -d ' \n'
	fi
}

# Exactly three dot-separated numeric components (e.g. 2.32.0).
valid_n8n_version() {
	case "$1" in
	*[!0-9.]* | *.*.*.* | .* | *. | *..*) return 1 ;;
	[0-9]*.[0-9]*.[0-9]*) return 0 ;;
	*) return 1 ;;
	esac
}

# Latest stable n8n version from GitHub releases; FALLBACK_N8N_VERSION covers
# offline/API failures. Installs stay pinned in .env — never a floating tag,
# which would silently upgrade (and run DB migrations) on any container recreate.
resolve_n8n_version() {
	releases_url="https://api.github.com/repos/n8n-io/n8n/releases/latest"
	v="$(fetch "$releases_url" | sed -n 's/.*"tag_name": *"n8n@\([0-9][0-9.]*\)".*/\1/p' | head -n1)"
	if valid_n8n_version "$v"; then
		printf '%s\n' "$v"
	else
		printf '%s\n' "$FALLBACK_N8N_VERSION"
	fi
}

write_env() {
	sandbox_api_key="$(gen_secret)"
	runner_key="$(gen_secret)"
	registration_token="$(gen_secret)"
	cat >"${N8N_DIR}/.env" <<EOF
# Generated by get-n8n.sh v${SCRIPT_VERSION}. Keep this file out of version control.

# n8n version to run. 'get-n8n.sh --upgrade' updates this line and nothing else.
N8N_VERSION=${INSTALL_VERSION}

# Code-node user code (JavaScript and Python) runs in the separate 'runners'
# container. The broker binds 0.0.0.0 so that container can reach it — its
# port (5679) stays private to the compose network.
N8N_RUNNERS_MODE=external
N8N_RUNNERS_BROKER_LISTEN_ADDRESS=0.0.0.0
N8N_RUNNERS_AUTH_TOKEN=$(gen_secret)

# Web search for the AI assistant runs through the bundled SearXNG service.
# Optionally set a Brave Search API key instead — it takes priority.
INSTANCE_AI_BRAVE_SEARCH_API_KEY=
N8N_INSTANCE_AI_SEARXNG_URL=http://searxng:8080
SEARXNG_SECRET=$(gen_secret)

N8N_INSTANCE_AI_SANDBOX_ENABLED=true
N8N_INSTANCE_AI_SANDBOX_PROVIDER=n8n-sandbox
N8N_INSTANCE_AI_SANDBOX_IMAGE=ghcr.io/n8n-io/n8n-sandbox-service-sandbox:latest
N8N_INSTANCE_AI_SANDBOX_API_URL=http://sandbox-api:8080
N8N_SANDBOX_SERVICE_URL=http://sandbox-api:8080

# Sandbox service secrets — generated uniquely for this install.
# The API and runner sides must agree, so each secret appears twice.
#
# Must match a value in SANDBOX_API_KEYS above — this is how n8n authenticates
# to the sandbox.
SANDBOX_API_KEYS=${sandbox_api_key}
N8N_SANDBOX_SERVICE_API_KEY=${sandbox_api_key}

SANDBOX_API_RUNNER_REGISTRATION_TOKEN=${registration_token}
SANDBOX_RUNNER_REGISTRATION_TOKEN=${registration_token}

SANDBOX_API_RUNNER_API_KEY=${runner_key}
SANDBOX_RUNNER_API_KEYS=${runner_key}
EOF
	chmod 600 "${N8N_DIR}/.env"
}

# The stack definition is maintained in the repo (COMPOSE_SOURCE) and
# versioned via its '# compose-version: N' line. It is downloaded once at
# install time; after that the local copy belongs to the user.
compose_version() { sed -n 's/^# compose-version: *//p' | head -n1; }

write_compose() {
	if ! fetch "$COMPOSE_SOURCE" >"${N8N_DIR}/compose.yml.tmp" ||
		! grep -q '^services:' "${N8N_DIR}/compose.yml.tmp"; then
		rm -f "${N8N_DIR}/compose.yml.tmp"
		fail "could not download the stack definition from
  ${COMPOSE_SOURCE}
  Check your network connection and re-run."
	fi
	mv "${N8N_DIR}/compose.yml.tmp" "${N8N_DIR}/compose.yml"
}

# Existing installs keep their compose.yml untouched, so when the published
# stack definition has moved on, say so instead of silently rewriting it.
# Best-effort: stays quiet if offline or if the user removed the version line.
check_compose_freshness() {
	[ -f "${N8N_DIR}/compose.yml" ] || return 0
	installed="$(compose_version <"${N8N_DIR}/compose.yml")"
	[ -n "$installed" ] || return 0
	latest="$(fetch "$COMPOSE_SOURCE" | compose_version)"
	[ -n "$latest" ] && [ "$latest" != "$installed" ] || return 0
	say ""
	say "Note: the n8n stack definition is now v${latest}; this install was generated"
	say "from v${installed}. get-n8n.sh never rewrites an existing compose.yml."
	say "To review what changed: ${COMPOSE_HISTORY_URL}"
}

write_searxng_settings() {
	# The stock image serves HTML only; n8n's web search needs the JSON API.
	cat >"${N8N_DIR}/searxng-settings.yml" <<'EOF'
# Generated by get-n8n.sh. SearXNG configuration for the n8n AI assistant.
use_default_settings: true
search:
  formats:
    - html
    - json
EOF
}

compose() {
	docker compose -f "${N8N_DIR}/compose.yml" "$@"
}

# Docker Hub's anonymous pull rate limit is a common first-run failure, so
# turn it into recovery advice instead of a raw error dump. Consumes the log.
check_rate_limit() {
	grep -qiE 'toomanyrequests|rate ?limit' "$1" || return 0
	rm -f "$1"
	fail "Docker Hub pull rate limit reached — your configuration in ${N8N_DIR} is
  unaffected. Wait about an hour, then start n8n with:
    docker compose -f ${N8N_DIR}/compose.yml up -d
  Or 'docker login' with a Docker Hub account to raise the limit and re-run."
}

# Pull attached to the terminal so compose renders its in-place progress bars
# (capturing the output would drop compose into plain line mode). On failure,
# retry quietly to get the error text for classification — a rate-limited pull
# fails again instantly, a transient blip just succeeds on the retry.
compose_pull() {
	compose pull && return 0
	log="$(mktemp)"
	if compose pull -q >"$log" 2>&1; then
		rm -f "$log"
		return 0
	fi
	check_rate_limit "$log"
	rm -f "$log"
	fail "pulling images failed — see the output above; check your network and re-run."
}

# Quiet on success — compose's per-container status lines are only shown
# when something went wrong.
compose_checked() {
	log="$(mktemp)"
	if compose "$@" >"$log" 2>&1; then
		rm -f "$log"
		return 0
	fi
	cat "$log" >&2
	check_rate_limit "$log"
	rm -f "$log"
	fail "starting n8n failed — check 'docker compose -f ${N8N_DIR}/compose.yml logs'."
}

do_upgrade() {
	if [ ! -f "${N8N_DIR}/.env" ] || [ ! -f "${N8N_DIR}/compose.yml" ]; then
		fail "no existing install found in ${N8N_DIR} — run without --upgrade to install."
	fi

	target="${REQUESTED_VERSION:-$(resolve_n8n_version)}"
	current="$(sed -n 's/^N8N_VERSION=//p' "${N8N_DIR}/.env")"
	if [ -n "$current" ]; then
		# .env is user state: --upgrade edits exactly this one line, nothing else.
		sed "s/^N8N_VERSION=.*/N8N_VERSION=${target}/" "${N8N_DIR}/.env" >"${N8N_DIR}/.env.tmp"
		mv "${N8N_DIR}/.env.tmp" "${N8N_DIR}/.env"
		chmod 600 "${N8N_DIR}/.env"
	else
		printf 'N8N_VERSION=%s\n' "$target" >>"${N8N_DIR}/.env"
	fi
	ok "n8n version: ${current:-unset} -> ${target}"
	check_compose_freshness

	if [ "$NO_START" -eq 1 ]; then
		say ""
		say "Not restarting (--no-start). To apply the upgrade:"
		say "  docker compose -f ${N8N_DIR}/compose.yml pull && docker compose -f ${N8N_DIR}/compose.yml up -d"
		exit 0
	fi

	say "Pulling images..."
	compose_pull
	compose_checked up -d --quiet-pull
	ok "Restarted with n8n ${target}"
}

wait_for_n8n() {
	printf 'Waiting for n8n to become ready (first boot pulls images and runs migrations) '
	waited=0
	while [ "$waited" -lt 180 ]; do
		if http_get "http://127.0.0.1:${N8N_PORT}/healthz"; then
			printf '\n'
			return 0
		fi
		printf '.'
		sleep 3
		waited=$((waited + 3))
	done
	printf '\n'
	return 1
}

print_summary() {
	cat <<EOF

n8n is running at: http://localhost:${N8N_PORT}
Data stored in:    ${N8N_DIR} (Docker volume: n8n-data)
Config files:      ${N8N_DIR}/compose.yml, ${N8N_DIR}/.env

To stop:      docker compose -f ${N8N_DIR}/compose.yml down
To upgrade:   curl -fsSL https://get.n8n.io | sh -s -- --upgrade
To uninstall: docker compose -f ${N8N_DIR}/compose.yml down -v && rm -rf ${N8N_DIR}   # DELETES all n8n data

Security notes:
  - Only port ${N8N_PORT} (n8n) should ever be reachable from the internet.
  - The sandbox runner is privileged Docker-in-Docker — never publish its ports.

This setup is meant to try n8n locally. For production (TLS, Postgres, queue
mode) see ${DOCS_HOSTING_URL}

get-n8n.sh v${SCRIPT_VERSION} — source: ${SOURCE_URL}

Open http://localhost:${N8N_PORT} in your browser to get started.
EOF
}

main() {
	parse_args "$@"
	check_deps

	if [ -f "${N8N_DIR}/compose.yml" ] || [ -f "${N8N_DIR}/.env" ]; then
		if [ "$UPGRADE" -eq 1 ]; then
			do_upgrade
			wait_for_n8n || fail "n8n did not become ready — check 'docker compose -f ${N8N_DIR}/compose.yml logs n8n'."
			print_summary
			exit 0
		fi
		say "Found an existing install in ${N8N_DIR} — leaving it untouched."
		say ""
		if http_get "http://127.0.0.1:${N8N_PORT}/healthz"; then
			say "n8n is already running at: http://localhost:${N8N_PORT}"
		else
			say "To start it: docker compose -f ${N8N_DIR}/compose.yml up -d"
			say "Once started, n8n runs at: http://localhost:${N8N_PORT}"
		fi
		say "To upgrade:  curl -fsSL https://get.n8n.io | sh -s -- --upgrade"
		check_compose_freshness
		exit 0
	fi
	[ "$UPGRADE" -eq 0 ] || fail "no existing install found in ${N8N_DIR} — run without --upgrade to install."

	if [ -d "${N8N_DIR}" ] && [ -n "$(ls -A "${N8N_DIR}")" ]; then
		fail "${N8N_DIR} exists and is not empty — refusing to write into it.
  Pick another directory with: N8N_DIR=./some-dir sh get-n8n.sh"
	fi
	if [ "$NO_START" -eq 0 ] && port_in_use; then
		fail "something is already listening on port ${N8N_PORT} — stop it first, or use --no-start
  and adjust the port mapping in ${N8N_DIR}/compose.yml before starting."
	fi

	INSTALL_VERSION="${REQUESTED_VERSION:-$(resolve_n8n_version)}"
	mkdir -p "${N8N_DIR}"
	write_compose
	ok "Created ${N8N_DIR}/compose.yml"
	write_searxng_settings
	ok "Created ${N8N_DIR}/searxng-settings.yml"
	write_env
	ok "Created ${N8N_DIR}/.env (unique secrets generated)"

	if [ "$NO_START" -eq 1 ]; then
		say ""
		say "Not starting (--no-start). When ready:"
		say "  docker compose -f ${N8N_DIR}/compose.yml up -d"
		exit 0
	fi

	say "Pulling images (this can take a few minutes on first run)..."
	compose_pull
	compose_checked up -d --quiet-pull
	ok "Started n8n ${INSTALL_VERSION} and sandbox services"
	wait_for_n8n || fail "n8n did not become ready — check 'docker compose -f ${N8N_DIR}/compose.yml logs n8n'."
	print_summary
}

# main is called on the last line so a truncated download executes nothing.
main "$@"
