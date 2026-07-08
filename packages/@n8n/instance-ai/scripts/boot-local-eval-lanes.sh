#!/usr/bin/env bash
# Boots N additional LOCAL-PROCESS n8n eval lanes from the branch's existing
# build (no docker) and seeds an owner on each, then prints the comma-separated
# --base-url string for the eval CLI. Complements scripts/run-eval-lanes.sh,
# which boots docker lanes from the n8nio/n8n:local image — use that once a
# branch image exists; use this for fast iteration right after `pnpm build`.
#
#   ./scripts/boot-local-eval-lanes.sh [count] [start-port]   # default 2 lanes from :5682
#   ./scripts/boot-local-eval-lanes.sh --teardown             # quit lanes + free ports
#
# Each lane: screen session n8n-lane-<port>, throwaway user folder under /tmp,
# its own runners broker port (port+1), agents+instance-ai modules enabled.
# The eval needs LANGSMITH_API_KEY set (the work-stealing allocator only runs
# on the LangSmith path; the direct loop pins each case to one lane).
set -euo pipefail

REPO_ROOT=$(git rev-parse --show-toplevel)
SEED='{"owner":{"email":"nathan@n8n.io","password":"PlaywrightTest123","firstName":"Nathan","lastName":"Owner"},"members":[],"admin":{"email":"admin@n8n.io","password":"PlaywrightTest123","firstName":"Ada","lastName":"Admin"},"chat":{"email":"chat@n8n.io","password":"PlaywrightTest123","firstName":"Chat","lastName":"User"}}'

if [[ "${1:-}" == "--teardown" ]]; then
	for session in $(screen -ls 2>/dev/null | grep -oE '[0-9]+\.n8n-lane-[0-9]+' || true); do
		port="${session##*-}"
		pid=$(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)
		[[ -n "$pid" ]] && kill "$pid" 2>/dev/null || true
		screen -S "$session" -X quit 2>/dev/null || true
		echo "stopped lane :$port"
	done
	exit 0
fi

COUNT="${1:-2}"
START_PORT="${2:-5682}"
PORTS=()

for i in $(seq 0 $((COUNT - 1))); do
	PORT=$((START_PORT + i * 2))
	BROKER=$((PORT + 1))
	if lsof -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
		echo "port $PORT already in use — skipping boot (will still seed/report it)"
	else
		screen -dmS "n8n-lane-$PORT" bash -lc "cd '$REPO_ROOT/packages/cli/bin' && npx dotenvx run -f ../../../.env.local -- env N8N_PORT=$PORT N8N_USER_FOLDER=/tmp/n8n-eval-lane-$PORT E2E_TESTS=true N8N_RUNNERS_BROKER_PORT=$BROKER N8N_ENABLED_MODULES=agents,instance-ai node ./n8n start > /tmp/n8n-lane-$PORT.log 2>&1"
		echo "booting lane :$PORT (screen n8n-lane-$PORT, log /tmp/n8n-lane-$PORT.log)"
	fi
	PORTS+=("$PORT")
done

for PORT in "${PORTS[@]}"; do
	for _ in $(seq 1 60); do
		if curl -sf -o /dev/null --max-time 2 "http://localhost:$PORT/healthz"; then break; fi
		sleep 2
	done
	curl -sf -o /dev/null --max-time 2 "http://localhost:$PORT/healthz" || {
		echo "lane :$PORT failed to become healthy — check /tmp/n8n-lane-$PORT.log" >&2
		exit 1
	}
	# A fresh instance can 200 on healthz before the e2e controller is ready —
	# retry the seed and fail loudly (-f) instead of swallowing a bad response.
	seeded=false
	for _ in $(seq 1 10); do
		if curl -sf -X POST "http://localhost:$PORT/rest/e2e/reset" -H 'Content-Type: application/json' -d "$SEED" >/dev/null; then
			seeded=true
			break
		fi
		sleep 3
	done
	if [[ "$seeded" != true ]]; then
		echo "lane :$PORT seeding failed — check /tmp/n8n-lane-$PORT.log" >&2
		exit 1
	fi
	curl -sf -X POST "http://localhost:$PORT/rest/login" -H 'Content-Type: application/json' \
		-d '{"emailOrLdapLoginId":"nathan@n8n.io","password":"PlaywrightTest123"}' >/dev/null ||
		{ echo "lane :$PORT login check failed after seeding" >&2; exit 1; }
	echo "lane :$PORT healthy + seeded (login verified)"
done

BASE_URLS=$(printf ",http://localhost:%s" "${PORTS[@]}")
echo
echo "lanes ready. Append your primary instance and pass to the eval CLI, e.g.:"
echo "  --base-url http://localhost:5680${BASE_URLS} --concurrency $(((COUNT + 1) * 3))"
