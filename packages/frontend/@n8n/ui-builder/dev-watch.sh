#!/usr/bin/env bash
#
# Live-edit @n8n/ui-builder against an already-running `n8n-dev --watch`
# instance for this worktree.
#
# `n8n-dev --watch` only gives the backend hot reload; it serves editor-ui's
# prebuilt dist, with no Vite/HMR. There are two independent surfaces this
# script keeps fresh instead:
#
#   1. Runtime bundle (ui-runtime.js/.css) for the published Orders demo page
#      (/webhook/orders-app), viewed through n8n-dev's own port. Rebuilt in
#      place by `vite build --watch`; this package's own closeBundle plugin
#      (vite.config.mts) copies the output into editor-ui's dist/static on
#      every rebuild. That alone is NOT enough to reach the browser though:
#      `generateStaticAssets()` (packages/cli/src/commands/start.ts) copies
#      editor-ui/dist into a frozen per-instance cache dir
#      (`instanceSettings.staticCacheDir`) once at boot, and server.ts mounts
#      that cache dir's express.static BEFORE editor-ui/dist's — so post-boot
#      edits to editor-ui/dist are never actually served, only a full
#      instance restart re-copies them. This script also mirrors
#      ui-runtime.js/.css straight into staticCacheDir on every rebuild, so a
#      browser refresh of the demo tab picks it up with no CLI restart.
#
#   2. NDV editor pane (the panel inside the node's parameter UI). It's
#      imported by editor-ui via a Vite alias straight to this package's src
#      (packages/frontend/editor-ui/vite.config.mts), so it only gets real
#      HMR under editor-ui's own Vite dev server — never under n8n-dev's
#      served dist or staticCacheDir. This script starts that dev server
#      separately, pointed at this worktree's actual n8n-dev API port instead
#      of the port 5678 hardcoded into editor-ui's own `serve` script.
#      Mirroring editor-ui's own dist/index.html + JS/CSS into staticCacheDir
#      too (making NDV live-edit reachable via n8n-dev's port as well) would
#      need a full editor-ui BUILD on every change, not just this dev server —
#      too slow to be worth it here. NDV live-editing still requires :8080.
#
# Assumes `n8n-dev --watch` (or `demo/start.sh`, which starts it) is ALREADY
# running for this worktree; this script only reads its port, it does not
# start, stop, or otherwise manage it. Run demo/start.sh first.
#
# Usage:
#   ./dev-watch.sh        (Ctrl-C stops all watchers)

set -euo pipefail -m

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"
UI_BUILDER_DIR="$SCRIPT_DIR"
EDITOR_UI_DIR="$REPO_ROOT/packages/frontend/editor-ui"
EDITOR_UI_PORT="${EDITOR_UI_PORT:-8080}"

command -v n8n-dev >/dev/null 2>&1 || {
	echo "dev-watch: n8n-dev not found on PATH (see ~/Workspace/n8n-dev)" >&2
	exit 1
}

# `n8n-dev url` resolves the instance for the *current* worktree from $PWD, so
# ask it from the repo root rather than trusting wherever this script was
# invoked from.
API_URL="$(cd "$REPO_ROOT" && n8n-dev url)" || {
	echo "dev-watch: could not resolve this worktree's n8n-dev instance/port." >&2
	echo "           Is 'n8n-dev --watch' running for this worktree?" >&2
	exit 1
}
case "$API_URL" in
http*) ;;
*)
	echo "dev-watch: unexpected 'n8n-dev url' output: $API_URL" >&2
	exit 1
	;;
esac

# `n8n-dev url` only computes this worktree's *deterministic* port -- it
# succeeds even when nothing is listening there yet, so it cannot tell us
# whether an instance is actually running. Ask the instance itself instead.
if ! curl -fsS -o /dev/null --max-time 3 "$API_URL/healthz"; then
	echo "dev-watch: $API_URL is not answering (n8n-dev url resolves a port," >&2
	echo "           not a running instance)." >&2
	echo "           Run demo/start.sh first, then re-run this script." >&2
	exit 1
fi

# editor-ui's vite.config.mts bakes N8N_PORT (defaulting to 5678 if unset)
# into the served index.html as window.BASE_PATH, which vue-router uses as
# its base -- independently of VUE_APP_URL_BASE_API below. Without this, the
# dev server on :$EDITOR_UI_PORT silently routes against localhost:5678
# instead of this worktree's actual port, which looks like nothing works.
N8N_PORT="${API_URL##*:}"

echo "Detected n8n-dev instance: $API_URL"

# Resolve this worktree's staticCacheDir the same way n8n-dev + n8n itself do:
#   - n8n-dev names each worktree's instance dir by a sanitized basename of
#     the monorepo root (resolve_instance in n8n-dev-lib.sh), and points the
#     main process's N8N_USER_FOLDER at <instance dir>/main.
#   - InstanceSettingsConfig derives n8nFolder from N8N_USER_FOLDER, and
#     InstanceSettings.staticCacheDir is <n8nFolder's parent>/.cache/n8n/public
#     (packages/core/src/instance-settings/instance-settings.ts), i.e.
#     N8N_USER_FOLDER/.cache/n8n/public.
# This mirrors n8n-dev's *default* main name ("main"); a custom
# `n8n-dev --name`, or a manually-set N8N_USER_FOLDER, would need
# STATIC_CACHE_DIR overridden explicitly.
N8N_DEV_DATA_DIR="${N8N_DEV_DATA_DIR:-$HOME/.n8n-dev}"
# printf '%s' first strips basename's trailing newline before it reaches tr --
# otherwise tr -c (which complements the allowed set) treats that newline as
# "not in the set" and replaces it with a literal trailing underscore, same
# fix n8n-dev-lib.sh's own resolve_instance applies to the identical pattern.
INSTANCE_SLUG="$(printf '%s' "$(basename "$REPO_ROOT")" | tr -c 'a-zA-Z0-9_-' '_')"
STATIC_CACHE_DIR="${STATIC_CACHE_DIR:-$N8N_DEV_DATA_DIR/instances/$INSTANCE_SLUG/main/.cache/n8n/public}"

if [[ ! -d "$STATIC_CACHE_DIR/static" ]]; then
	echo "dev-watch: staticCacheDir not found at $STATIC_CACHE_DIR/static" >&2
	echo "           (derived from worktree '$INSTANCE_SLUG' -- override with" >&2
	echo "           STATIC_CACHE_DIR= if this instance uses a non-default" >&2
	echo "           --name or N8N_USER_FOLDER)." >&2
	echo "           It's created by n8n on first boot -- is the instance actually up?" >&2
	exit 1
fi

echo "Detected staticCacheDir: $STATIC_CACHE_DIR"

declare -a job_pids=()

cleanup() {
	echo
	echo "Stopping watchers..."
	for pid in "${job_pids[@]:-}"; do
		# `set -m` gives each background job its own process group (pgid ==
		# its pid), so signaling the negated pid reaches the whole group —
		# pnpm's script runner *and* the vite process it spawns underneath —
		# not just the top-level pnpm process.
		kill -TERM -- "-$pid" 2>/dev/null || kill "$pid" 2>/dev/null || true
	done
	wait 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "Starting runtime bundle watcher (@n8n/ui-builder build:bundle --watch)..."
(
	cd "$UI_BUILDER_DIR"
	# Same as the "build:bundle" script (cross-env INCLUDE_VUE=true vite build)
	# plus --watch, called directly rather than via `pnpm run ... -- --watch`:
	# pnpm's arg-forwarding embeds a literal "--" before the forwarded args in
	# the command it runs, which is one extra thing to trust vite's CLI parser
	# with for no benefit here.
	export INCLUDE_VUE=true
	pnpm exec vite build --watch
) &
job_pids+=("$!")

echo "Starting staticCacheDir mirror (ui-runtime.js/.css -> $STATIC_CACHE_DIR/static)..."
(
	src_dir="$EDITOR_UI_DIR/dist/static"
	dest_dir="$STATIC_CACHE_DIR/static"
	last_js="" last_css=""
	# No fswatch/inotify-equivalent assumed present -- poll mtimes and copy on
	# change. Cheap (two stat calls a second) and dependency-free.
	while true; do
		for name in ui-runtime.js ui-runtime.css; do
			src="$src_dir/$name"
			[[ -f "$src" ]] || continue
			mtime="$(stat -f %m "$src" 2>/dev/null || stat -c %Y "$src" 2>/dev/null || echo "")"
			var="last_${name##*.}"
			if [[ "$mtime" != "${!var}" ]]; then
				cp "$src" "$dest_dir/$name"
				printf -v "$var" '%s' "$mtime"
			fi
		done
		sleep 1
	done
) &
job_pids+=("$!")

echo "Starting editor-ui Vite dev server (NDV pane HMR) on :$EDITOR_UI_PORT..."
(
	cd "$EDITOR_UI_DIR"
	export VUE_APP_URL_BASE_API="${API_URL}/"
	export N8N_PORT
	pnpm exec vite --host 0.0.0.0 --port "$EDITOR_UI_PORT" --strictPort dev
) &
job_pids+=("$!")

# All three jobs above are backgrounded: a failed vite (e.g. --strictPort
# losing a race, or a build error) exits that subshell almost immediately but
# doesn't surface until the final `wait`, well after we've already claimed
# success. Give them a moment, then check all are still alive before saying
# so.
sleep 2
dead=0
for pid in "${job_pids[@]}"; do
	kill -0 "$pid" 2>/dev/null || dead=1
done
if [[ "$dead" -eq 1 ]]; then
	echo "dev-watch: a watcher exited immediately -- see output above for the error" >&2
	echo "           (common cause: port $EDITOR_UI_PORT already in use)." >&2
	exit 1
fi

cat <<EOF

All watchers running.

  NDV editor pane (live HMR):
    http://localhost:$EDITOR_UI_PORT
    Open a workflow with a UI Builder node through THIS url, not n8n-dev's own
    port -- edits under src/ hot-reload here. Mirroring editor-ui's own build
    into staticCacheDir would need a full editor-ui build per change (too slow
    to be worth it), so NDV live-editing still requires :8080, not :18178-style
    ports.

  Runtime app page:
    $API_URL/webhook/orders-app
    Viewed through n8n-dev's own port, as usual. The bundle watcher rebuilds
    ui-runtime.js/.css in place on every save and copies it into editor-ui's
    dist; the mirror watcher above then copies it into this instance's frozen
    staticCacheDir ($STATIC_CACHE_DIR/static), which is what n8n-dev's port
    actually serves -- just refresh that tab, no restart or republish needed.

Ctrl-C to stop all watchers.
EOF

wait
