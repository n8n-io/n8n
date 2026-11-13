#!/usr/bin/env bash
# Builds the code sandbox image (spike).
#
# Usage: docker/images/code-sandbox/build.sh [image-tag]
#   SANDBOX_SERVICE_DIR  checkout of n8n-sandbox-service (default: ../n8n-sandbox-service-opus)
#
# Run `pnpm build --filter=@n8n/code-runtime...` first.
set -euo pipefail
cd "$(dirname "$0")/../../.."

TAG="${1:-n8n-code-sandbox:local}"
SANDBOX_SERVICE_DIR="${SANDBOX_SERVICE_DIR:-../n8n-sandbox-service-opus}"
N8N_VERSION="$(node -p "require('./packages/cli/package.json').version")"

start=$(date +%s)
rm -rf dist/code-runtime
NODE_ENV=production DOCKER_BUILD=true pnpm --filter=@n8n/code-runtime \
	--prod --config.inject-workspace-packages=true --config.package-import-method=copy \
	deploy --no-optional dist/code-runtime

docker build \
	--build-context "sandbox-service=${SANDBOX_SERVICE_DIR}" \
	--build-arg "N8N_VERSION=${N8N_VERSION}" \
	-f docker/images/code-sandbox/Dockerfile \
	-t "${TAG}" .

end=$(date +%s)
echo "Built ${TAG} in $((end - start)) s"
docker image inspect "${TAG}" --format 'Image size: {{.Size}} bytes'
