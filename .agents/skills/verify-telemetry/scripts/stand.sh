#!/usr/bin/env bash
# Local stand for verifying telemetry, audit events and Prometheus counters. See ../SKILL.md.
set -euo pipefail

SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPTS_DIR="$SKILL_DIR/scripts"
REPO_ROOT="$(git -C "$SKILL_DIR" rev-parse --show-toplevel)"
STAND_DIR="${N8N_STAND_DIR:-/tmp/n8n-telemetry-stand}"
STAND_DIR="${STAND_DIR%/}"
PORT="${N8N_STAND_PORT:-5678}"
CAPTURE_PORT="${N8N_STAND_CAPTURE_PORT:-4545}"
OIDC_PORT="${N8N_STAND_OIDC_PORT:-8765}"
BASE_URL="http://localhost:$PORT"
HOME_DIR="$STAND_DIR/home"
COOKIES="$STAND_DIR/cookies.txt"

usage() {
	cat <<USAGE
Usage: stand.sh <command>
  up [feat:a,feat:b]    start the capture server and n8n in the background; the list fakes licensed features
  run [feat:a,feat:b]   same, but n8n stays in the foreground (for a launch config or preview)
  owner                 create the instance owner (or sign in again) and save the session cookie
  api-key <scopes>      create a public API key with these comma-separated scopes and save it
  oidc-stub             start an HTTPS OIDC discovery stub; run it before 'up'
  evidence <name>...    print the evidence block for audit names (n8n.audit.*) and telemetry event names
  logs [lines]          tail the n8n log
  down                  stop n8n, the capture server and the stub
  reset                 down, then delete the stand directory
Env: N8N_STAND_DIR=$STAND_DIR N8N_STAND_PORT=$PORT N8N_STAND_CAPTURE_PORT=$CAPTURE_PORT N8N_STAND_OIDC_PORT=$OIDC_PORT
USAGE
}

die() {
	echo "stand: $*" >&2
	exit 1
}

require_build() {
	[ -f "$REPO_ROOT/packages/cli/dist/commands/start.js" ] ||
		die "no build found: run 'pnpm build > build.log 2>&1' in $REPO_ROOT first"
}

port_free() {
	if command -v lsof > /dev/null 2>&1; then
		! lsof -nP -iTCP:"$1" -sTCP:LISTEN > /dev/null 2>&1
	else
		return 0
	fi
}

pid_alive() {
	[ -f "$1" ] && kill -0 "$(cat "$1")" 2> /dev/null
}

export_env() {
	export N8N_USER_FOLDER="$HOME_DIR"
	export N8N_PORT="$PORT"
	export N8N_SECURE_COOKIE=false
	export N8N_LOG_LEVEL="${N8N_LOG_LEVEL:-info}"
	export N8N_DIAGNOSTICS_ENABLED=true
	export N8N_DIAGNOSTICS_CONFIG_BACKEND="stand;http://127.0.0.1:$CAPTURE_PORT"
	export N8N_DIAGNOSTICS_CONFIG_FRONTEND="stand;http://127.0.0.1:$CAPTURE_PORT"
	export N8N_DIAGNOSTICS_POSTHOG_API_KEY=stand
	export N8N_DIAGNOSTICS_POSTHOG_API_HOST="http://127.0.0.1:$CAPTURE_PORT"
	export N8N_METRICS=true
	export N8N_METRICS_INCLUDE_MESSAGE_EVENT_BUS_METRICS=true
	export N8N_METRICS_INCLUDE_DEFAULT_METRICS=false
	export N8N_VERSION_NOTIFICATIONS_ENABLED=false
	export N8N_STAND_LICENSE_FEATURES="${1:-}"
	export NODE_OPTIONS="${NODE_OPTIONS:+$NODE_OPTIONS }--require=$SCRIPTS_DIR/license-preload.cjs"
	if [ -f "$STAND_DIR/oidc/cert.pem" ]; then
		export NODE_EXTRA_CA_CERTS="$STAND_DIR/oidc/cert.pem"
	fi
}

start_capture() {
	mkdir -p "$STAND_DIR"
	if pid_alive "$STAND_DIR/capture.pid"; then
		return
	fi
	port_free "$CAPTURE_PORT" || die "port $CAPTURE_PORT is busy; set N8N_STAND_CAPTURE_PORT"
	nohup node "$SCRIPTS_DIR/capture-server.cjs" "$CAPTURE_PORT" "$STAND_DIR/capture.log" > "$STAND_DIR/capture.out" 2>&1 &
	echo $! > "$STAND_DIR/capture.pid"
}

wait_ready() {
	# /healthz answers before the app is up ("n8n is starting up"), so wait for real settings JSON.
	local i body
	for i in $(seq 1 150); do
		body=$(curl -sf "$BASE_URL/rest/settings" 2> /dev/null || true)
		case "$body" in
			*'"userManagement"'*) return 0 ;;
		esac
		sleep 1
	done
	die "n8n did not become ready in 150 s; see $STAND_DIR/n8n.log"
}

print_summary() {
	cat <<SUMMARY
stand up: $BASE_URL
  n8n log:      $STAND_DIR/n8n.log
  audit events: $HOME_DIR/.n8n/n8nEventLog.log
  telemetry:    $STAND_DIR/capture.log
  metrics:      $BASE_URL/metrics
  features:     ${1:-none}
next: stand.sh owner, trigger the action, stand.sh evidence <names>
SUMMARY
}

cmd_up() {
	local features="${1:-}"
	require_build
	start_oidc_stub
	port_free "$PORT" || die "port $PORT is busy: 'stand.sh down', or set N8N_STAND_PORT"
	mkdir -p "$HOME_DIR"
	start_capture
	export_env "$features"
	(
		cd "$REPO_ROOT/packages/cli"
		nohup ./bin/n8n start > "$STAND_DIR/n8n.log" 2>&1 &
		echo $! > "$STAND_DIR/n8n.pid"
	)
	wait_ready
	print_summary "$features"
}

cmd_run() {
	local features="${1:-}"
	require_build
	start_oidc_stub
	mkdir -p "$HOME_DIR"
	start_capture
	export_env "$features"
	echo "stand (foreground): $BASE_URL | audit $HOME_DIR/.n8n/n8nEventLog.log | telemetry $STAND_DIR/capture.log"
	cd "$REPO_ROOT/packages/cli"
	exec ./bin/n8n start
}

cmd_owner() {
	local creds="$STAND_DIR/owner.json"
	local email password code
	umask 077
	if [ -f "$creds" ]; then
		email=$(node -p 'JSON.parse(require("fs").readFileSync(process.argv[1], "utf8")).email' "$creds")
		password=$(node -p 'JSON.parse(require("fs").readFileSync(process.argv[1], "utf8")).password' "$creds")
	else
		email="owner@stand.local"
		password="Stand$(openssl rand -hex 4)Pw1"
		printf '{"email":"%s","password":"%s"}\n' "$email" "$password" > "$creds"
	fi
	rm -f "$COOKIES"
	code=$(curl -s -c "$COOKIES" -o "$STAND_DIR/owner-setup.out" -w '%{http_code}' -H 'Content-Type: application/json' \
		-d "{\"email\":\"$email\",\"firstName\":\"Stand\",\"lastName\":\"Owner\",\"password\":\"$password\"}" \
		"$BASE_URL/rest/owner/setup")
	if [ "$code" != "200" ]; then
		code=$(curl -s -c "$COOKIES" -o "$STAND_DIR/login.out" -w '%{http_code}' -H 'Content-Type: application/json' \
			-d "{\"emailOrLdapLoginId\":\"$email\",\"password\":\"$password\"}" "$BASE_URL/rest/login")
		[ "$code" = "200" ] || die "owner setup and sign-in both failed (HTTP $code); try 'stand.sh reset'"
	fi
	echo "owner session saved: use 'curl -b $COOKIES ...' (credentials in $creds; do not paste them anywhere)"
}

cmd_api_key() {
	local scopes="${1:-}"
	[ -n "$scopes" ] || die "usage: stand.sh api-key <scope,scope,...>, for example saml:manage,oidc:manage"
	[ -f "$COOKIES" ] || die "run 'stand.sh owner' first"
	local body key
	body=$(node -p 'JSON.stringify({ label: "stand", expiresAt: null, scopes: process.argv[1].split(",").map((s) => s.trim()).filter(Boolean) })' "$scopes")
	key=$(curl -s -b "$COOKIES" -H 'Content-Type: application/json' -d "$body" "$BASE_URL/rest/api-keys" |
		node -p 'const r = JSON.parse(require("fs").readFileSync(0, "utf8")); r.data?.rawApiKey ?? ""')
	[ -n "$key" ] || die "API key creation failed; check the owner session and the scope names"
	umask 077
	printf '%s' "$key" > "$STAND_DIR/api-key.txt"
	echo "API key saved: use 'curl -H \"X-N8N-API-KEY: \$(cat $STAND_DIR/api-key.txt)\" $BASE_URL/api/v1/...'"
}

# Starts the discovery stub when the certificate exists, i.e. after 'oidc-stub' opted in once.
start_oidc_stub() {
	[ -f "$STAND_DIR/oidc/cert.pem" ] || return 0
	if pid_alive "$STAND_DIR/oidc/stub.pid"; then
		return 0
	fi
	port_free "$OIDC_PORT" || die "port $OIDC_PORT is busy; set N8N_STAND_OIDC_PORT"
	nohup python3 -I "$SCRIPTS_DIR/oidc-discovery-stub.py" "$OIDC_PORT" "$STAND_DIR/oidc/cert.pem" "$STAND_DIR/oidc/key.pem" \
		> "$STAND_DIR/oidc/stub.out" 2>&1 &
	echo $! > "$STAND_DIR/oidc/stub.pid"
}

cmd_oidc_stub() {
	mkdir -p "$STAND_DIR/oidc"
	if [ ! -f "$STAND_DIR/oidc/cert.pem" ]; then
		openssl req -x509 -newkey rsa:2048 -nodes -keyout "$STAND_DIR/oidc/key.pem" -out "$STAND_DIR/oidc/cert.pem" \
			-days 7 -subj "/CN=127.0.0.1" -addext "subjectAltName=IP:127.0.0.1" > /dev/null 2>&1 ||
			die "openssl could not create the certificate"
	fi
	start_oidc_stub
	echo "OIDC discovery endpoint: https://127.0.0.1:$OIDC_PORT/.well-known/openid-configuration"
	echo "start n8n after this ('stand.sh down', then 'up') so it trusts $STAND_DIR/oidc/cert.pem; later 'up' calls restart the stub"
}

cmd_evidence() {
	[ $# -gt 0 ] || die "usage: stand.sh evidence <n8n.audit.name | \"Telemetry event name\">..."
	node "$SCRIPTS_DIR/evidence.mjs" --stand-dir "$STAND_DIR" --base-url "$BASE_URL" --repo "$REPO_ROOT" "$@"
}

cmd_logs() {
	tail -n "${1:-50}" "$STAND_DIR/n8n.log"
}

stop_pid() {
	# Wait for the process to exit, so the next 'up' finds the ports free.
	if [ -f "$1" ]; then
		local pid i
		pid=$(cat "$1")
		if kill "$pid" 2> /dev/null; then
			for i in $(seq 1 30); do
				kill -0 "$pid" 2> /dev/null || break
				sleep 1
			done
			if kill -0 "$pid" 2> /dev/null; then
				kill -9 "$pid" 2> /dev/null || true
			fi
		fi
		rm -f "$1"
	fi
}

cmd_down() {
	stop_pid "$STAND_DIR/n8n.pid"
	stop_pid "$STAND_DIR/capture.pid"
	stop_pid "$STAND_DIR/oidc/stub.pid"
	echo "stand down"
}

cmd_reset() {
	cmd_down
	rm -rf "$STAND_DIR"
	echo "removed $STAND_DIR"
}

case "${1:-}" in
	up) shift; cmd_up "$@" ;;
	run) shift; cmd_run "$@" ;;
	owner) cmd_owner ;;
	api-key) shift; cmd_api_key "$@" ;;
	oidc-stub) cmd_oidc_stub ;;
	evidence) shift; cmd_evidence "$@" ;;
	logs) shift; cmd_logs "$@" ;;
	down) cmd_down ;;
	reset) cmd_reset ;;
	*) usage; exit 2 ;;
esac
