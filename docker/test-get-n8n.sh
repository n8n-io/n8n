#!/bin/sh
#
# Test harness for get-n8n.sh. Requires docker + compose v2 (like the script).
#
#   sh docker/test-get-n8n.sh          # fast checks only (no containers started)
#   sh docker/test-get-n8n.sh --e2e    # also boot the full stack and test upgrade
#
# Runs in a temp dir; e2e uses ports/volumes of a real install, so don't run it
# next to a live get-n8n.sh setup.
#
# shellcheck disable=SC2015  # `<assert> && pass || fail` is safe: pass never fails
# shellcheck disable=SC2329  # teardown is invoked via trap
set -u

SCRIPT="$(cd "$(dirname "$0")" && pwd)/get-n8n.sh"
E2E=0
[ "${1:-}" = "--e2e" ] && E2E=1

WORK="$(mktemp -d)"
FAILED=0

pass() { printf 'ok - %s\n' "$1"; }
fail() {
	printf 'FAIL - %s\n' "$1" >&2
	FAILED=1
}
check() { # check <description> <command...>
	desc="$1"
	shift
	if "$@" >/dev/null 2>&1; then pass "$desc"; else fail "$desc"; fi
}
check_not() {
	desc="$1"
	shift
	if "$@" >/dev/null 2>&1; then fail "$desc"; else pass "$desc"; fi
}

env_value() { sed -n "s/^$2=//p" "$1/.env"; }

teardown() {
	[ -f "$1/compose.yml" ] && docker compose -f "$1/compose.yml" down -v --remove-orphans >/dev/null 2>&1
	return 0
}

# --- fast checks -------------------------------------------------------------

cd "$WORK" || exit 1

sh "$SCRIPT" --version | grep -q '^get-n8n.sh v' && pass "--version prints script version" ||
	fail "--version prints script version"
sh "$SCRIPT" --help | grep -q 'Usage:' && pass "--help prints usage" ||
	fail "--help prints usage"
check_not "unknown flag fails" sh "$SCRIPT" --bogus

# fresh --no-start install
check "--no-start install succeeds" env N8N_DIR="$WORK/a" sh "$SCRIPT" --no-start
check "compose.yml created" test -f "$WORK/a/compose.yml"
check ".env created" test -f "$WORK/a/.env"
[ "$(find "$WORK/a/.env" -perm 0600)" = "$WORK/a/.env" ] && pass ".env is mode 600" || fail ".env is mode 600"
check "compose.yml validates with generated .env" docker compose -f "$WORK/a/compose.yml" config -q

api_key="$(env_value "$WORK/a" SANDBOX_API_KEYS)"
runner_key="$(env_value "$WORK/a" SANDBOX_RUNNER_API_KEYS)"
[ "${#api_key}" -ge 32 ] && pass "sandbox API key generated" || fail "sandbox API key generated"
[ -n "$runner_key" ] && [ "$runner_key" != "$api_key" ] && pass "runner key generated and distinct" ||
	fail "runner key generated and distinct"
[ "$(env_value "$WORK/a" N8N_INSTANCE_AI_SANDBOX_API_KEY)" = "$api_key" ] &&
	pass "n8n sandbox key mirrors SANDBOX_API_KEYS" || fail "n8n sandbox key mirrors SANDBOX_API_KEYS"
[ "$(env_value "$WORK/a" SANDBOX_API_RUNNER_API_KEY)" = "$runner_key" ] &&
	pass "API-side runner key mirrors runner key" || fail "API-side runner key mirrors runner key"

# second install must not share secrets with the first
env N8N_DIR="$WORK/b" sh "$SCRIPT" --no-start >/dev/null 2>&1
[ "$(env_value "$WORK/b" SANDBOX_API_KEYS)" != "$api_key" ] && pass "secrets unique per install" ||
	fail "secrets unique per install"

# idempotency: re-run leaves files byte-identical
before="$(cat "$WORK/a/.env" "$WORK/a/compose.yml")"
check "re-run on existing install is a no-op" env N8N_DIR="$WORK/a" sh "$SCRIPT"
[ "$(cat "$WORK/a/.env" "$WORK/a/compose.yml")" = "$before" ] && pass "re-run leaves files untouched" ||
	fail "re-run leaves files untouched"

# version pinning
env N8N_DIR="$WORK/pin" sh "$SCRIPT" --version 2.31.4 --no-start >/dev/null 2>&1
[ "$(env_value "$WORK/pin" N8N_VERSION)" = "2.31.4" ] && pass "--version x.y.z pins in .env" ||
	fail "--version x.y.z pins in .env"

check_not "--upgrade without install fails" env N8N_DIR="$WORK/missing" sh "$SCRIPT" --upgrade

# refuses non-empty foreign directory
mkdir -p "$WORK/dirty" && touch "$WORK/dirty/keep"
check_not "refuses non-empty directory" env N8N_DIR="$WORK/dirty" sh "$SCRIPT"
check "foreign directory untouched" test -f "$WORK/dirty/keep"

# truncated download must execute nothing
mkdir -p "$WORK/trunc" && cd "$WORK/trunc" || exit 1
head -c 1000 "$SCRIPT" | sh >/dev/null 2>&1
[ -z "$(ls -A "$WORK/trunc")" ] && pass "truncated script executes nothing" ||
	fail "truncated script executes nothing"
cd "$WORK" || exit 1

# --- e2e ---------------------------------------------------------------------

if [ "$E2E" -eq 1 ]; then
	E2E_DIR="$WORK/e2e"
	trap 'teardown "$E2E_DIR"; rm -rf "$WORK"' EXIT INT TERM

	# install the previous release so --upgrade below is a real version change
	if env N8N_DIR="$E2E_DIR" sh "$SCRIPT" --version 2.31.4; then
		pass "fresh install boots and reaches /healthz"
	else
		fail "fresh install boots and reaches /healthz"
		docker compose -f "$E2E_DIR/compose.yml" ps -a || true
		docker compose -f "$E2E_DIR/compose.yml" logs --tail 30 || true
	fi

	ps_out="$(docker compose -f "$E2E_DIR/compose.yml" ps -a --format '{{.Service}} {{.State}} {{.ExitCode}}')"
	echo "$ps_out" | grep -q '^sandbox-certs exited 0' && pass "sandbox-certs completed" || fail "sandbox-certs completed"
	echo "$ps_out" | grep -q '^sandbox-api running' && pass "sandbox-api running" || fail "sandbox-api running"
	echo "$ps_out" | grep -q '^sandbox-runner-1 running' && pass "sandbox-runner running" || fail "sandbox-runner running"
	echo "$ps_out" | grep -q '^n8n running' && pass "n8n running" || fail "n8n running"

	check "n8n reaches sandbox-api" \
		docker compose -f "$E2E_DIR/compose.yml" exec -T n8n wget -qO- http://sandbox-api:8080/healthz
	docker compose -f "$E2E_DIR/compose.yml" logs sandbox-runner-1 2>/dev/null |
		grep -q 'registration stream established' &&
		pass "runner registered with sandbox-api" || fail "runner registered with sandbox-api"

	check_not "fresh install fails while port is taken" env N8N_DIR="$WORK/conflict" sh "$SCRIPT"

	# upgrade: only the N8N_VERSION line may change, and the new image must run
	target="$(sed -n 's/^DEFAULT_N8N_VERSION="\(.*\)"$/\1/p' "$SCRIPT")"
	cp "$E2E_DIR/.env" "$WORK/env-before"
	check "--upgrade succeeds" env N8N_DIR="$E2E_DIR" sh "$SCRIPT" --upgrade
	diff "$WORK/env-before" "$E2E_DIR/.env" >"$WORK/env.diff" 2>&1 || true
	if [ "$(grep -c '^[<>]' "$WORK/env.diff")" = "2" ] &&
		grep -q '^< N8N_VERSION=2.31.4$' "$WORK/env.diff" &&
		grep -q "^> N8N_VERSION=${target}\$" "$WORK/env.diff"; then
		pass "--upgrade changes only N8N_VERSION"
	else
		fail "--upgrade changes only N8N_VERSION"
		cat "$WORK/env.diff" >&2
	fi
	docker compose -f "$E2E_DIR/compose.yml" ps n8n --format '{{.Image}}' | grep -q ":${target}\$" &&
		pass "n8n container runs upgraded image" || fail "n8n container runs upgraded image"
else
	trap 'rm -rf "$WORK"' EXIT INT TERM
	echo "(e2e skipped — pass --e2e to boot the full stack)"
fi

[ "$FAILED" -eq 0 ] && echo "ALL TESTS PASSED" || echo "TESTS FAILED" >&2
exit "$FAILED"
