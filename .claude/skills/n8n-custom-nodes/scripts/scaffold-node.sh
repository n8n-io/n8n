#!/usr/bin/env bash
#
# scaffold-node.sh — Scaffolds a new n8n node from templates.
#
# Usage:
#   ./scaffold-node.sh <ServiceName> <serviceName> [nodes-base-path]
#
# Example:
#   ./scaffold-node.sh Acme acme /home/user/n8n/packages/nodes-base
#
# This creates:
#   nodes/Acme/
#     Acme.node.ts
#     Acme.node.json
#     GenericFunctions.ts
#     types.ts
#     test/
#       Acme.node.test.ts
#   credentials/
#     AcmeApi.credentials.ts
#
set -euo pipefail

SERVICE_PASCAL="${1:?Usage: scaffold-node.sh <ServiceName> <serviceName> [nodes-base-path]}"
SERVICE_CAMEL="${2:?Usage: scaffold-node.sh <ServiceName> <serviceName> [nodes-base-path]}"
SERVICE_LOWER=$(echo "$SERVICE_CAMEL" | tr '[:upper:]' '[:lower:]')
NODES_BASE="${3:-packages/nodes-base}"

SKILL_DIR="$(cd "$(dirname "$0")/.." && pwd)"
TEMPLATES="$SKILL_DIR/templates"

NODE_DIR="$NODES_BASE/nodes/$SERVICE_PASCAL"
CRED_DIR="$NODES_BASE/credentials"
TEST_DIR="$NODE_DIR/test"

echo "Scaffolding n8n node: $SERVICE_PASCAL"
echo "  Node directory:  $NODE_DIR"
echo "  Credential dir:  $CRED_DIR"
echo ""

# Create directories
mkdir -p "$NODE_DIR" "$TEST_DIR" "$CRED_DIR"

# Helper: copy template with replacements
copy_template() {
  local src="$1"
  local dst="$2"

  if [ -f "$dst" ]; then
    echo "  SKIP (exists): $dst"
    return
  fi

  sed \
    -e "s/__ServiceName__/${SERVICE_PASCAL}/g" \
    -e "s/__serviceName__/${SERVICE_CAMEL}/g" \
    -e "s/__serviceNameApi__/${SERVICE_CAMEL}Api/g" \
    -e "s/__servicename__/${SERVICE_LOWER}/g" \
    "$src" > "$dst"

  echo "  CREATE: $dst"
}

# Scaffold node files
copy_template "$TEMPLATES/nodes/ProgrammaticNode.ts"  "$NODE_DIR/${SERVICE_PASCAL}.node.ts"
copy_template "$TEMPLATES/nodes/GenericFunctions.ts"   "$NODE_DIR/GenericFunctions.ts"
copy_template "$TEMPLATES/nodes/types.ts"              "$NODE_DIR/types.ts"

# Scaffold metadata
sed \
  -e "s/__ServiceName__/${SERVICE_PASCAL}/g" \
  -e "s/__serviceName__/${SERVICE_CAMEL}/g" \
  -e "s/__servicename__/${SERVICE_LOWER}/g" \
  "$TEMPLATES/nodes/NodeMetadata.json" > "$NODE_DIR/${SERVICE_PASCAL}.node.json" \
  && echo "  CREATE: $NODE_DIR/${SERVICE_PASCAL}.node.json" \
  || echo "  SKIP: metadata"

# Scaffold credential
copy_template "$TEMPLATES/credentials/ApiKeyCredential.ts" "$CRED_DIR/${SERVICE_PASCAL}Api.credentials.ts"

# Scaffold test
copy_template "$TEMPLATES/tests/UnitTest.ts" "$TEST_DIR/${SERVICE_PASCAL}.node.test.ts"

echo ""
echo "Done! Next steps:"
echo "  1. Add an SVG icon at: $NODE_DIR/${SERVICE_LOWER}.svg"
echo "  2. Register in $NODES_BASE/package.json:"
echo "     n8n.nodes: \"dist/nodes/${SERVICE_PASCAL}/${SERVICE_PASCAL}.node.js\""
echo "     n8n.credentials: \"dist/credentials/${SERVICE_PASCAL}Api.credentials.js\""
echo "  3. Implement your API logic in GenericFunctions.ts"
echo "  4. Run: pushd $NODES_BASE && pnpm typecheck && pnpm test ${SERVICE_PASCAL} && popd"
