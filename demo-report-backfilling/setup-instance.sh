#!/usr/bin/env bash
# Off camera, once. Creates a fresh n8n home with one workflow.
# `import:workflow` runs the migrations, so no first boot is needed.
set -euo pipefail
source "$(dirname "$0")/env.sh"

rm -rf "$N8N_USER_FOLDER"
mkdir -p "$N8N_USER_FOLDER"

"$N8N_REPO/packages/cli/bin/n8n" import:workflow --input="$DEMO_DIR/demo-workflow.json"

echo
echo "n8n home ready at $N8N_USER_FOLDER"
sql "SELECT id, name FROM workflow_entity;"
