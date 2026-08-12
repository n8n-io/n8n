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
#      (packages/frontend/editor-ui/vite.config.mts), so a real editor-ui
#      BUILD (not just this package's own bundle) picks up ui-builder source
#      edits. This script runs `vite build --watch` for editor-ui itself and,
#      on every completed rebuild, mirrors the whole freshly-built dist/ into
#      staticCacheDir -- the same frozen cache dir n8n-dev's own port serves
#      from (see point 1). That mirror has to redo the placeholder
#      substitution `generateStaticAssets()` normally does at boot
#      (packages/cli/src/commands/start.ts): editor-ui's build emits
#      %CONFIG_TAGS%, /{{BASE_PATH}}/ (plus its two URL-encoded forms) and
#      {{REST_ENDPOINT}} unresolved in index.html and in every built .js/.css
#      (vite's `base` bakes the BASE_PATH placeholder into every asset URL and
#      into a JS constant). This script resolves those placeholders once, at
#      startup, by reading the values `generateStaticAssets()` already
#      resolved into staticCacheDir's *existing* index.html at boot, then
#      reapplies them to each fresh build before mirroring. No second port:
#      the NDV pane updates live through n8n-dev's own port, same as the
#      runtime bundle above.
#
#      `vite build --watch` does NOT do a real incremental rebuild here: in
#      this vite 8 (rolldown) + sass-embedded combination, every rebuild
#      after the first crashes the process (`sass-embedded` spawn EBADF while
#      re-transforming every .scss module at once -- an upstream watch-mode
#      bug, not something fixable from this script). So this watcher runs
#      `vite build --watch` under a restart loop: a crash just means the next
#      edit gets a fresh COLD build instead of a true incremental one.
#      Measured end-to-end (edit -> crash -> restart -> cold build -> mirror
#      -> visible through n8n-dev's port): ~10-13s. Not fast, but it is a
#      single port, no restart, no second dev server.
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

if [[ ! -f "$STATIC_CACHE_DIR/index.html" ]]; then
	echo "dev-watch: no index.html in staticCacheDir ($STATIC_CACHE_DIR)." >&2
	echo "           generateStaticAssets() writes this at boot -- is the instance actually up?" >&2
	exit 1
fi

echo "Detected staticCacheDir: $STATIC_CACHE_DIR"

# generateStaticAssets() (packages/cli/src/commands/start.ts) already resolved
# these placeholders into staticCacheDir's *current* index.html once, at this
# instance's boot -- extract the resolved values back out so the editor-ui
# build watcher below can reapply the same substitution to its own fresh
# builds, without needing this script to reimplement GlobalConfig lookups.
CACHED_INDEX="$STATIC_CACHE_DIR/index.html"
CONFIG_TAGS_VALUE="$(sed -n '/favicon.ico/,/prefers-color-scheme.css/p' "$CACHED_INDEX" | sed '1d;$d')"
REST_ENDPOINT_VALUE="$(printf '%s' "$CONFIG_TAGS_VALUE" | sed -n 's/.*rest-endpoint" content="\([^"]*\)".*/\1/p' | base64 -d)"
BASE_PATH_VALUE="$(sed -n 's#.*<script src="\(.*\)static/base-path\.js".*#\1#p' "$CACHED_INDEX")"

if [[ -z "$CONFIG_TAGS_VALUE" ]]; then
	echo "dev-watch: couldn't extract the config-tags meta from $CACHED_INDEX -- did" >&2
	echo "           editor-ui's index.html template change? See generateStaticAssets()" >&2
	echo "           in packages/cli/src/commands/start.ts for what this needs to match." >&2
	exit 1
fi

export CONFIG_TAGS_VALUE REST_ENDPOINT_VALUE BASE_PATH_VALUE

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

echo "Starting editor-ui build watcher (NDV pane, mirrored into staticCacheDir)..."
(
	cd "$EDITOR_UI_DIR"
	# Same base config `pnpm build` uses (see package.json's "build" script),
	# plus --watch. VUE_APP_PUBLIC_PATH must stay the literal "/{{BASE_PATH}}/"
	# placeholder -- it becomes vite's `base`, which is what bakes that
	# placeholder into every emitted asset URL and into the BASE_PATH JS
	# constant for mirror_editor_ui_build() below to resolve afterwards.
	export VUE_APP_PUBLIC_PATH="/{{BASE_PATH}}/"
	export NODE_OPTIONS="--max-old-space-size=8192"

	mirror_editor_ui_build() {
		local tmp
		tmp="$(mktemp -d)"
		cp -a "$EDITOR_UI_DIR/dist/." "$tmp/"
		# Apply the same placeholder substitution generateStaticAssets() does
		# at boot (packages/cli/src/commands/start.ts): BASE_PATH (+ its two
		# URL-encoded forms) across index.html and every built .js/.css, then
		# the index.html-only tags. Values come from CONFIG_TAGS_VALUE /
		# REST_ENDPOINT_VALUE / BASE_PATH_VALUE, exported above.
		find "$tmp" -type f \( -name '*.html' -o -name '*.js' -o -name '*.css' \) -print0 |
			xargs -0 perl -pi -e '
				s#\Q/{{BASE_PATH}}/\E#$ENV{BASE_PATH_VALUE}#g;
				s#\Q/%7B%7BBASE_PATH%7D%7D/\E#$ENV{BASE_PATH_VALUE}#g;
				s#\Q/%257B%257BBASE_PATH%257D%257D/\E#$ENV{BASE_PATH_VALUE}#g;
			'
		perl -pi -e '
			s#\Q%CONFIG_TAGS%\E#$ENV{CONFIG_TAGS_VALUE}#g;
			s#\Q{{REST_ENDPOINT}}\E#$ENV{REST_ENDPOINT_VALUE}#g;
		' "$tmp/index.html"
		# --delete-after: new files land fully before anything stale is
		# removed, so a request mid-sync sees either the old set intact or
		# the new set intact -- never a page referencing an asset that's
		# already gone.
		#
		# --exclude=/types/ is load-bearing, not cosmetic: staticCacheDir also
		# holds types/{nodes,node-versions,credentials}.json, written once at
		# boot by FrontendService.generateTypes() (packages/cli/src/services/
		# frontend.service.ts) -- NOT part of editor-ui's dist/, so $tmp never
		# contains a types/ dir. Without this exclude, --delete-after treats
		# staticCacheDir's types/ as stale and deletes it on every rebuild
		# cycle (i.e. continuously while this watcher runs). The editor UI
		# fetches those files on every load/reload, so once deleted the
		# instance can't serve a working UI until a full restart regenerates
		# them at boot -- which this watcher would then delete again within
		# one rebuild cycle. rsync leaves excluded paths alone under
		# --delete-after (does not delete them), so this protects the
		# directory without disabling cleanup of anything editor-ui actually
		# owns.
		rsync -a --delete-after --exclude=/types/ "$tmp/" "$STATIC_CACHE_DIR/"
		rm -rf "$tmp"
	}

	# `vite build --watch` for editor-ui does NOT give real incremental
	# rebuilds in this vite 8 (rolldown) + sass-embedded setup: every rebuild
	# after the first crashes the process (sass-embedded spawn EBADF while
	# re-transforming every .scss module at once on a full watch rebuild --
	# an upstream watch-mode bug). Wrap it in a restart loop instead: a crash
	# just costs the next edit a fresh cold build rather than a fast
	# incremental one. Measured end-to-end (edit -> crash -> restart -> cold
	# build -> mirror -> visible through n8n-dev's port): ~10-13s.
	# `|| true` on the pipeline: this subshell inherits the top-level `set -e`,
	# and vite exits nonzero on the sass-embedded crash described above --
	# without neutralizing that, `errexit` would kill this loop (and this
	# whole backgrounded job) on the very first crash instead of restarting.
	while true; do
		pnpm exec vite build --watch 2>&1 | while IFS= read -r line; do
			printf '%s\n' "$line"
			case "$line" in
			"built in"*) mirror_editor_ui_build ;;
			esac
		done || true
		echo "editor-ui build watcher exited -- restarting in 1s..." >&2
		sleep 1
	done
) &
job_pids+=("$!")

# All three jobs above are backgrounded: a failed vite (e.g. a build error)
# exits that subshell almost immediately but doesn't surface until the final
# `wait`, well after we've already claimed success. Give them a moment, then
# check all are still alive before saying so.
sleep 2
dead=0
for pid in "${job_pids[@]}"; do
	kill -0 "$pid" 2>/dev/null || dead=1
done
if [[ "$dead" -eq 1 ]]; then
	echo "dev-watch: a watcher exited immediately -- see output above for the error" >&2
	exit 1
fi

cat <<EOF

All watchers running.

  NDV editor pane:
    $API_URL
    Same URL as everything else -- no second port. Open a workflow with a UI
    Builder node here; edits under src/ show up after the next editor-ui
    rebuild (~10-13s: the watcher restarts on every rebuild, see the comment
    at the top of this script), then a plain browser refresh.

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
