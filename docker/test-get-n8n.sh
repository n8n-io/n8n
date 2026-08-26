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
# shellcheck disable=SC2329,SC2317  # teardown is invoked via trap (code differs by shellcheck version)
set -u

SCRIPT="$(cd "$(dirname "$0")" && pwd)/get-n8n.sh"
# Install from the working copy of the stack definition, not the published one
# on master — the harness must test this branch's compose file.
COMPOSE_SRC="$(cd "$(dirname "$0")" && pwd)/get-n8n-compose.yml"
export N8N_COMPOSE_URL="$COMPOSE_SRC"
E2E=0
[ "${1:-}" = "--e2e" ] && E2E=1

WORK="$(mktemp -d)"
FAILED=0

# Git Bash / MSYS (Windows CI) emulates POSIX but has no real file modes.
case "$(uname -s)" in
MINGW* | MSYS*) WINDOWS=1 ;;
*) WINDOWS=0 ;;
esac

pass() { printf 'ok - %s\n' "$1"; }
skip() { printf 'skip - %s\n' "$1"; }
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
check "searxng-settings.yml created" test -f "$WORK/a/searxng-settings.yml"
if [ "$WINDOWS" -eq 1 ]; then
	skip ".env is mode 600 (no POSIX file modes on Windows)"
else
	[ "$(find "$WORK/a/.env" -perm 0600)" = "$WORK/a/.env" ] && pass ".env is mode 600" || fail ".env is mode 600"
fi
check "compose.yml validates with generated .env" docker compose -f "$WORK/a/compose.yml" config -q
case "$(env_value "$WORK/a" N8N_VERSION)" in
[0-9]*.[0-9]*) pass "default install resolves a sane n8n version" ;;
*) fail "default install resolves a sane n8n version" ;;
esac

api_key="$(env_value "$WORK/a" SANDBOX_API_KEYS)"
runner_key="$(env_value "$WORK/a" SANDBOX_RUNNER_API_KEYS)"
[ "${#api_key}" -ge 32 ] && pass "sandbox API key generated" || fail "sandbox API key generated"
[ -n "$runner_key" ] && [ "$runner_key" != "$api_key" ] && pass "runner key generated and distinct" ||
	fail "runner key generated and distinct"
[ "$(env_value "$WORK/a" N8N_SANDBOX_SERVICE_API_KEY)" = "$api_key" ] &&
	pass "n8n sandbox key mirrors SANDBOX_API_KEYS" || fail "n8n sandbox key mirrors SANDBOX_API_KEYS"
[ "$(env_value "$WORK/a" SANDBOX_API_RUNNER_API_KEY)" = "$runner_key" ] &&
	pass "API-side runner key mirrors runner key" || fail "API-side runner key mirrors runner key"

# second install must not share secrets with the first
env N8N_DIR="$WORK/b" sh "$SCRIPT" --no-start >/dev/null 2>&1
b_key="$(env_value "$WORK/b" SANDBOX_API_KEYS)"
[ -n "$b_key" ] && [ "$b_key" != "$api_key" ] && pass "secrets unique per install" ||
	fail "secrets unique per install"

# idempotency: re-run leaves files byte-identical and tells the user the URL
before="$(cat "$WORK/a/.env" "$WORK/a/compose.yml" "$WORK/a/searxng-settings.yml")"
rerun_out="$(env N8N_DIR="$WORK/a" sh "$SCRIPT" 2>&1)" && pass "re-run on existing install is a no-op" ||
	fail "re-run on existing install is a no-op"
[ "$(cat "$WORK/a/.env" "$WORK/a/compose.yml" "$WORK/a/searxng-settings.yml")" = "$before" ] && pass "re-run leaves files untouched" ||
	fail "re-run leaves files untouched"
echo "$rerun_out" | grep -q 'http://localhost:5678' && pass "re-run tells the user where n8n runs" ||
	fail "re-run tells the user where n8n runs"

# stack definition versioning
[ -n "$(sed -n 's/^# compose-version: *//p' "$WORK/a/compose.yml")" ] &&
	pass "installed compose keeps the stack version marker" || fail "installed compose keeps the stack version marker"
echo "$rerun_out" | grep -q 'stack definition is now' && fail "up-to-date install gets no stack notice" ||
	pass "up-to-date install gets no stack notice"
sed 's/^# compose-version: .*/# compose-version: 999/' "$COMPOSE_SRC" >"$WORK/newer-compose.yml"
notice_out="$(env N8N_DIR="$WORK/a" N8N_COMPOSE_URL="$WORK/newer-compose.yml" sh "$SCRIPT" 2>&1)"
echo "$notice_out" | grep -q 'stack definition is now v999' && pass "re-run notices a newer stack definition" ||
	fail "re-run notices a newer stack definition"
check_not "unreachable stack definition fails" \
	env N8N_DIR="$WORK/nofetch" N8N_COMPOSE_URL="$WORK/does-not-exist.yml" sh "$SCRIPT" --no-start
check "failed fetch writes no config" test ! -e "$WORK/nofetch/compose.yml"

# version pinning
env N8N_DIR="$WORK/pin" sh "$SCRIPT" --version 2.31.4 --no-start >/dev/null 2>&1
[ "$(env_value "$WORK/pin" N8N_VERSION)" = "2.31.4" ] && pass "--version x.y.z pins in .env" ||
	fail "--version x.y.z pins in .env"

check_not "--upgrade without install fails" env N8N_DIR="$WORK/missing" sh "$SCRIPT" --upgrade

# malformed --version must fail before writing anything
check_not "rejects malformed --version" env N8N_DIR="$WORK/badver" sh "$SCRIPT" --version banana --no-start
check_not "rejects trailing-garbage --version" env N8N_DIR="$WORK/badver" sh "$SCRIPT" --version 2.3.4x --no-start
check_not "rejects two-component --version" env N8N_DIR="$WORK/badver" sh "$SCRIPT" --version 2.32 --no-start
check "malformed --version writes nothing" test ! -e "$WORK/badver"

# --upgrade --no-start bumps the pin but must not touch containers
env N8N_DIR="$WORK/stage" sh "$SCRIPT" --version 2.31.4 --no-start >/dev/null 2>&1
stage_out="$(env N8N_DIR="$WORK/stage" sh "$SCRIPT" --upgrade --version 2.32.0 --no-start 2>&1)" &&
	pass "--upgrade --no-start succeeds" || fail "--upgrade --no-start succeeds"
[ "$(env_value "$WORK/stage" N8N_VERSION)" = "2.32.0" ] && pass "--upgrade --no-start updates the pin" ||
	fail "--upgrade --no-start updates the pin"
echo "$stage_out" | grep -q "Not restarting" && pass "--upgrade --no-start skips the restart" ||
	fail "--upgrade --no-start skips the restart"

# refuses non-empty foreign directory
mkdir -p "$WORK/dirty" && touch "$WORK/dirty/keep"
check_not "refuses non-empty directory" env N8N_DIR="$WORK/dirty" sh "$SCRIPT"
check "foreign directory untouched" test -f "$WORK/dirty/keep"

# a pull rate-limit failure must print recovery advice, not a raw error.
# A fake docker on PATH passes the preflight checks and fails pulls the way
# Docker Hub's limit does; --upgrade reaches the pull without the port probe.
env N8N_DIR="$WORK/ratelimit" sh "$SCRIPT" --no-start >/dev/null 2>&1
mkdir -p "$WORK/shim"
cat >"$WORK/shim/docker" <<'EOF'
#!/bin/sh
case "$1 ${2:-}" in
"--version ") echo "Docker version 0.0.0-fake, build 0000000" ;;
"compose version") echo "2.99.0" ;;
"compose -f")
	case "$*" in
	*" up "* | *" pull"*)
		echo "Error response from daemon: toomanyrequests: You have reached your pull rate limit." >&2
		exit 1
		;;
	esac
	;;
esac
exit 0
EOF
chmod +x "$WORK/shim/docker"
ratelimit_out="$(env PATH="$WORK/shim:$PATH" N8N_DIR="$WORK/ratelimit" sh "$SCRIPT" --upgrade 2>&1)" &&
	fail "rate-limited run fails" || pass "rate-limited run fails"
echo "$ratelimit_out" | grep -q 'pull rate limit reached' && pass "rate-limit failure prints recovery advice" ||
	fail "rate-limit failure prints recovery advice"

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
	echo "$ps_out" | grep -q '^searxng running' && pass "searxng running" || fail "searxng running"
	echo "$ps_out" | grep -q '^runners running' && pass "task runners running" || fail "task runners running"

	check "n8n reaches sandbox-api" \
		docker compose -f "$E2E_DIR/compose.yml" exec -T n8n wget -qO- http://sandbox-api:8080/healthz
	docker compose -f "$E2E_DIR/compose.yml" exec -T n8n \
		wget -qO- 'http://searxng:8080/search?q=test&format=json' 2>/dev/null | grep -q '"results"' &&
		pass "searxng serves JSON search to n8n" || fail "searxng serves JSON search to n8n"
	docker compose -f "$E2E_DIR/compose.yml" logs sandbox-runner-1 2>/dev/null |
		grep -q 'registration stream established' &&
		pass "runner registered with sandbox-api" || fail "runner registered with sandbox-api"

	check_not "fresh install fails while port is taken" env N8N_DIR="$WORK/conflict" sh "$SCRIPT"

	# upgrade: only the N8N_VERSION line may change, and the new image must run.
	# Pin the target explicitly so the assertion is deterministic (a bare
	# --upgrade resolves the latest stable release at run time).
	target="$(sed -n 's/^FALLBACK_N8N_VERSION="\(.*\)"$/\1/p' "$SCRIPT")"
	cp "$E2E_DIR/.env" "$WORK/env-before"
	check "--upgrade succeeds" env N8N_DIR="$E2E_DIR" sh "$SCRIPT" --upgrade --version "$target"
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
