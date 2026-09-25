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
# Failure-path tests must not prompt for (or send) a failure report.
export DO_NOT_TRACK=1
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

# The sandbox service pin the script writes to .env and expects in compose.yml.
SANDBOX_PIN="$(sed -n 's/^SANDBOX_VERSION="\(.*\)"$/\1/p' "$SCRIPT")"

# Recreates what stack definition v1 wrote: fixed sandbox image tags and an
# http runner URL. Installs made from it need the --upgrade migration.
# shellcheck disable=SC2016  # matches the literal ${N8N_SANDBOX_VERSION}
legacy_compose() { # legacy_compose <compose-file>  (stdout)
	sed -e 's|n8n-sandbox-service-api:\${N8N_SANDBOX_VERSION}|n8n-sandbox-service-api:1.2.0|' \
		-e 's|n8n-sandbox-service-runner-dind:\${N8N_SANDBOX_VERSION}|n8n-sandbox-service-runner-dind:1.2.0|' \
		-e 's|n8n-sandbox-service-sandbox:\${N8N_SANDBOX_VERSION}|n8n-sandbox-service-sandbox:latest|' \
		-e 's|SANDBOX_RUNNER_HTTP_BASE_URL: https://|SANDBOX_RUNNER_HTTP_BASE_URL: http://|' \
		-e 's|^# compose-version: .*|# compose-version: 1|' "$1"
}
# A v1 install also has no N8N_SANDBOX_VERSION line in .env.
strip_sandbox_pin() { # strip_sandbox_pin <install-dir>
	grep -v '^N8N_SANDBOX_VERSION=' "$1/.env" >"$1/.env.v1" && mv "$1/.env.v1" "$1/.env"
}

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
sh "$SCRIPT" --help | grep -q 'DO_NOT_TRACK' && pass "--help documents DO_NOT_TRACK" ||
	fail "--help documents DO_NOT_TRACK"
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

# sandbox images follow one pin in .env; compose.yml carries no tags of its own
[ -n "$SANDBOX_PIN" ] && [ "$(env_value "$WORK/a" N8N_SANDBOX_VERSION)" = "$SANDBOX_PIN" ] &&
	pass "install pins N8N_SANDBOX_VERSION to the script's pin" || fail "install pins N8N_SANDBOX_VERSION to the script's pin"
check_not "compose.yml hard-codes no sandbox image tag" grep -E 'n8n-sandbox-service-[a-z-]+:[0-9a-z]' "$WORK/a/compose.yml"
resolved="$(docker compose -f "$WORK/a/compose.yml" config 2>/dev/null)"
for img in api runner-dind sandbox; do
	echo "$resolved" | grep -q "n8n-sandbox-service-${img}:${SANDBOX_PIN}\$" &&
		pass "compose resolves the ${img} image to the sandbox pin" || fail "compose resolves the ${img} image to the sandbox pin"
done

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
echo "$rerun_out" | grep -q 'To uninstall: docker compose' && pass "re-run shows the uninstall command" ||
	fail "re-run shows the uninstall command"

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

# --upgrade migrates a v1 install: the pin moves into .env, compose.yml loses
# its hard-coded tags and otherwise stays as it was.
legacy_compose "$COMPOSE_SRC" >"$WORK/legacy-compose.yml"
env N8N_DIR="$WORK/legacy" N8N_COMPOSE_URL="$WORK/legacy-compose.yml" sh "$SCRIPT" --version 2.31.4 --no-start >/dev/null 2>&1
strip_sandbox_pin "$WORK/legacy"
check "v1 install fixture has hard-coded sandbox tags" grep -q 'n8n-sandbox-service-api:1.2.0' "$WORK/legacy/compose.yml"
legacy_out="$(env N8N_DIR="$WORK/legacy" sh "$SCRIPT" --upgrade --version 2.32.0 --no-start 2>&1)" &&
	pass "--upgrade --no-start on a v1 install succeeds" || fail "--upgrade --no-start on a v1 install succeeds"
echo "$legacy_out" | grep -q 'sandbox service images pinned to fixed tags' &&
	pass "--upgrade tells the user the fixed sandbox tags were replaced" ||
	fail "--upgrade tells the user the fixed sandbox tags were replaced"
echo "$legacy_out" | grep -q 'runner URL now uses https' &&
	pass "--upgrade tells the user the runner URL changed" || fail "--upgrade tells the user the runner URL changed"
[ "$(env_value "$WORK/legacy" N8N_SANDBOX_VERSION)" = "$SANDBOX_PIN" ] &&
	pass "--upgrade adds N8N_SANDBOX_VERSION to a v1 .env" || fail "--upgrade adds N8N_SANDBOX_VERSION to a v1 .env"
check_not "--upgrade removes hard-coded sandbox tags" grep -E 'n8n-sandbox-service-[a-z-]+:[0-9a-z]' "$WORK/legacy/compose.yml"
grep -q 'SANDBOX_RUNNER_HTTP_BASE_URL: https://sandbox-runner-1:8080' "$WORK/legacy/compose.yml" &&
	pass "--upgrade switches the runner URL to https" || fail "--upgrade switches the runner URL to https"
grep -v '^#' "$WORK/legacy/compose.yml" >"$WORK/migrated.stripped"
grep -v '^#' "$COMPOSE_SRC" >"$WORK/current.stripped"
cmp -s "$WORK/migrated.stripped" "$WORK/current.stripped" &&
	pass "migrated v1 compose.yml matches the current stack definition" ||
	fail "migrated v1 compose.yml matches the current stack definition"
check "migrated compose.yml validates" docker compose -f "$WORK/legacy/compose.yml" config -q
cp "$WORK/legacy/compose.yml" "$WORK/legacy-compose-migrated"
second_out="$(env N8N_DIR="$WORK/legacy" sh "$SCRIPT" --upgrade --version 2.32.0 --no-start 2>&1)" &&
	pass "second --upgrade succeeds" || fail "second --upgrade succeeds"
cmp -s "$WORK/legacy-compose-migrated" "$WORK/legacy/compose.yml" &&
	pass "second --upgrade leaves a migrated compose.yml untouched" || fail "second --upgrade leaves a migrated compose.yml untouched"
echo "$second_out" | grep -q 'Updated compose.yml' && fail "second --upgrade prints no compose.yml notice" ||
	pass "second --upgrade prints no compose.yml notice"

# images the user pointed elsewhere are not the script's to move
# shellcheck disable=SC2016
sed 's|ghcr.io/n8n-io/n8n-sandbox-service-api:${N8N_SANDBOX_VERSION}|docker.io/n8nio/n8n-sandbox-service-api:1.3.0|' \
	"$COMPOSE_SRC" >"$WORK/custom-compose.yml"
env N8N_DIR="$WORK/custom" N8N_COMPOSE_URL="$WORK/custom-compose.yml" sh "$SCRIPT" --version 2.31.4 --no-start >/dev/null 2>&1
check "--upgrade with user-chosen images succeeds" env N8N_DIR="$WORK/custom" sh "$SCRIPT" --upgrade --version 2.32.0 --no-start
check "--upgrade leaves user-chosen sandbox images alone" grep -q 'docker.io/n8nio/n8n-sandbox-service-api:1.3.0' "$WORK/custom/compose.yml"

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

# failure-report consent: a reportable failure on a terminal must prompt, send
# the failed step only on an explicit yes, and send nothing on the default No.
# Needs a pty, so run the script under script(1); its syntax differs between
# util-linux and BSD/macOS, and Git Bash has neither. The curl shim records
# telemetry calls and fails everything else the way an offline curl would.
if [ "$WINDOWS" -eq 0 ] && command -v script >/dev/null 2>&1; then
	cat >"$WORK/shim/curl" <<EOF
#!/bin/sh
case "\$*" in
*rudderstack*) echo "\$*" >>"$WORK/consent.log" ;;
esac
exit 6
EOF
	chmod +x "$WORK/shim/curl"
	run_with_tty() { # run_with_tty <answer> <cmd...>
		answer="$1"
		shift
		if script --version 2>/dev/null | grep -q util-linux; then
			{
				sleep 1
				printf '%s\n' "$answer"
				sleep 4
			} | script -qec "$*" /dev/null
		else
			{
				sleep 1
				printf '%s\n' "$answer"
				sleep 4
			} | script -q /dev/null "$@"
		fi
	}
	rm -f "$WORK/consent.log"
	run_with_tty y env "PATH=$WORK/shim:$PATH" DO_NOT_TRACK= N8N_DIR="$WORK/ratelimit" \
		sh "$SCRIPT" --upgrade --version 2.32.0 >/dev/null 2>&1
	grep -q '"event":"install_failed".*"step":"docker-hub-rate-limit"' "$WORK/consent.log" 2>/dev/null &&
		pass "consented failure report carries the failed step" ||
		fail "consented failure report carries the failed step"
	rm -f "$WORK/consent.log"
	run_with_tty '' env "PATH=$WORK/shim:$PATH" DO_NOT_TRACK= N8N_DIR="$WORK/ratelimit" \
		sh "$SCRIPT" --upgrade --version 2.32.0 >/dev/null 2>&1
	[ ! -s "$WORK/consent.log" ] && pass "declined failure report sends nothing" ||
		fail "declined failure report sends nothing"
else
	skip "failure-report consent tests (need script(1) for a pty)"
fi

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

	# install the previous release from stack definition v1, so --upgrade below
	# is a real n8n version change and a real sandbox migration (1.2.0 + http)
	legacy_compose "$COMPOSE_SRC" >"$WORK/e2e-legacy-compose.yml"
	if env N8N_DIR="$E2E_DIR" N8N_COMPOSE_URL="$WORK/e2e-legacy-compose.yml" sh "$SCRIPT" --version 2.31.4; then
		pass "fresh install boots and reaches /healthz"
	else
		fail "fresh install boots and reaches /healthz"
		docker compose -f "$E2E_DIR/compose.yml" ps -a || true
		docker compose -f "$E2E_DIR/compose.yml" logs --tail 30 || true
	fi

	strip_sandbox_pin "$E2E_DIR"
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

	# upgrade: only the version lines may change, and the new images must run.
	# Pin the target explicitly so the assertion is deterministic (a bare
	# --upgrade resolves the latest stable release at run time).
	target="$(sed -n 's/^FALLBACK_N8N_VERSION="\(.*\)"$/\1/p' "$SCRIPT")"
	cp "$E2E_DIR/.env" "$WORK/env-before"
	check "--upgrade succeeds" env N8N_DIR="$E2E_DIR" sh "$SCRIPT" --upgrade --version "$target"
	diff "$WORK/env-before" "$E2E_DIR/.env" >"$WORK/env.diff" 2>&1 || true
	if [ "$(grep -c '^[<>]' "$WORK/env.diff")" = "3" ] &&
		grep -q '^< N8N_VERSION=2.31.4$' "$WORK/env.diff" &&
		grep -q "^> N8N_VERSION=${target}\$" "$WORK/env.diff" &&
		grep -q "^> N8N_SANDBOX_VERSION=${SANDBOX_PIN}\$" "$WORK/env.diff"; then
		pass "--upgrade changes only the version lines in .env"
	else
		fail "--upgrade changes only the version lines in .env"
		cat "$WORK/env.diff" >&2
	fi
	docker compose -f "$E2E_DIR/compose.yml" ps n8n --format '{{.Image}}' | grep -q ":${target}\$" &&
		pass "n8n container runs upgraded image" || fail "n8n container runs upgraded image"
	for svc in sandbox-api sandbox-runner-1; do
		docker compose -f "$E2E_DIR/compose.yml" ps "$svc" --format '{{.Image}}' | grep -q ":${SANDBOX_PIN}\$" &&
			pass "${svc} runs the pinned sandbox image after upgrade" || fail "${svc} runs the pinned sandbox image after upgrade"
	done
	docker compose -f "$E2E_DIR/compose.yml" logs sandbox-runner-1 2>/dev/null |
		grep -q 'registration stream established' &&
		pass "runner re-registered after upgrade" || fail "runner re-registered after upgrade"
	check "n8n reaches sandbox-api after upgrade" \
		docker compose -f "$E2E_DIR/compose.yml" exec -T n8n wget -qO- http://sandbox-api:8080/healthz
else
	trap 'rm -rf "$WORK"' EXIT INT TERM
	echo "(e2e skipped — pass --e2e to boot the full stack)"
fi

[ "$FAILED" -eq 0 ] && echo "ALL TESTS PASSED" || echo "TESTS FAILED" >&2
exit "$FAILED"
