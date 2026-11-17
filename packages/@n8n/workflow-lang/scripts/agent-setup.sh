#!/usr/bin/env bash
# Prepares an agent worktree of the compiled engine PoC: puts it on the integration branch and links the
# installed and built packages of the main checkout, so no install and no build is necessary.
#
#   packages/@n8n/workflow-lang/scripts/agent-setup.sh [main checkout]
#
# Run it from the root of the worktree. It prints the tip that the worktree is on.
set -euo pipefail
MAIN=${1:-$(git worktree list --porcelain | awk '/^worktree /{print $2; exit}')}
BRANCH=poc/compiled-workflow-engine
here=$(pwd -P)
[ "$here" != "$(cd "$MAIN" && pwd -P)" ] || { echo "agent-setup: run this in a worktree, not in the main checkout" >&2; exit 2; }

if [ -z "$(git status --short | grep -v '^??' || true)" ]; then
	git merge -q --ff-only "$BRANCH" 2> /dev/null || git reset -q --hard "$BRANCH" 2> /dev/null ||
		echo "agent-setup: could not move to $BRANCH; make a branch from it with: git checkout -b <name> $BRANCH" >&2
fi

link() {
	[ -e "$MAIN/$1" ] || return 0
	[ -e "$1" ] || [ -L "$1" ] || { mkdir -p "$(dirname "$1")"; ln -s "$MAIN/$1" "$1"; }
}
link node_modules
for p in packages/@n8n/workflow-lang packages/@n8n/workflow-fallback-host packages/@n8n/node-engine-compatibility \
	packages/nodes-base packages/core packages/workflow packages/cli packages/@n8n/task-runner; do
	link "$p/node_modules"
	[ "$p" = packages/@n8n/workflow-lang ] || link "$p/dist"
done
echo "agent-setup: $(git log --oneline -1 | cut -c1-70)"
