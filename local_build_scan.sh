#!/bin/bash
set -e

# --- Configuration ---
APP_VERSION_TAG="1.97.0"
NODE_VERSION_ARG="20"
N8N_RELEASE_TYPE_ARG="stable"
LAUNCHER_VERSION_ARG="1.1.2"

DOCKERFILE_PATH="./docker/images/n8n/Dockerfile"
IMAGE_BASE_NAME="n8n-local"
IMAGE_TAG="dev"
FULL_IMAGE_NAME="${IMAGE_BASE_NAME}:${IMAGE_TAG}"

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
TRIVY_REPORT_FILE="trivy_report_${IMAGE_BASE_NAME}_${IMAGE_TAG}_${TIMESTAMP}.txt"
BUILD_CONTEXT="."
COMPILED_APP_DIR="./compiled_app_output"

# --- Platform Detection ---
LOCAL_ARCH=$(uname -m)
DEFAULT_TARGET_PLATFORM=""
DEFAULT_BUILDER_PLATFORM=""
if [[ "${LOCAL_ARCH}" == "arm64" || "${LOCAL_ARCH}" == "aarch64" ]]; then
  DEFAULT_TARGET_PLATFORM="linux/arm64"
  DEFAULT_BUILDER_PLATFORM="linux/arm64"
else
  DEFAULT_TARGET_PLATFORM="linux/amd64"
  DEFAULT_BUILDER_PLATFORM="linux/amd64"
fi
TARGET_PLATFORM_ARG="${OVERRIDE_TARGET_PLATFORM:-$DEFAULT_TARGET_PLATFORM}"
BUILDER_PLATFORM_ARG="${OVERRIDE_BUILDER_PLATFORM:-$DEFAULT_BUILDER_PLATFORM}"

# --- Tool Checks ---
for tool in pnpm jq node docker trivy; do
  if ! command -v $tool &> /dev/null; then
    echo "Error: $tool could not be found. Please install it."
    exit 1
  fi
done

echo "===== Local n8n Build, Dockerize & Scan ====="
echo "INFO: Dockerfile: ${DOCKERFILE_PATH}"
echo "INFO: Output Image: ${FULL_IMAGE_NAME}"
echo "INFO: Artifacts Dir: ${COMPILED_APP_DIR}"
echo "-----------------------------------------------"

# 0. Clean Previous Build Output
echo "INFO: Cleaning previous output directory: ${COMPILED_APP_DIR}..."
rm -rf "${COMPILED_APP_DIR}"
echo "-----------------------------------------------"

# 1. Local Application Pre-build & Cleanup
echo "INFO: Starting local application pre-build..."
pnpm install --frozen-lockfile
pnpm build

echo "INFO: Performing pre-deploy cleanup on package.json files..."
ALL_PKG_JSONS=$(find . -name "package.json" \
                    -not -path "./node_modules/*" \
                    -not -path "*/node_modules/*" \
                    -not -path "./${COMPILED_APP_DIR#./}/*" \
                    -type f) || true
for FILE in $ALL_PKG_JSONS; do cp "$FILE" "$FILE.bak"; done

if [ -f "./package.json" ]; then
    jq 'del(.pnpm.patchedDependencies)' "./package.json" > "./package.json.tmp" && mv "./package.json.tmp" "./package.json"
fi
node .github/scripts/trim-fe-packageJson.js

echo "INFO: Creating pruned production deployment in '${COMPILED_APP_DIR}'..."
mkdir -p "${COMPILED_APP_DIR}"
NODE_ENV=production DOCKER_BUILD=true \
  pnpm --filter=n8n --prod --no-optional --legacy deploy "${COMPILED_APP_DIR}"

for FILE in $ALL_PKG_JSONS; do if [ -f "$FILE.bak" ]; then mv "$FILE.bak" "$FILE"; fi; done

echo "INFO: Local pre-build complete. Size of ${COMPILED_APP_DIR}: $(du -sh ${COMPILED_APP_DIR} | cut -f1)"
echo "-----------------------------------------------"

# 2. Build Docker Image
echo "INFO: Building Docker image: ${FULL_IMAGE_NAME}..."
docker build \
  --build-arg NODE_VERSION=${NODE_VERSION_ARG} \
  --build-arg N8N_VERSION=${APP_VERSION_TAG} \
  --build-arg N8N_RELEASE_TYPE=${N8N_RELEASE_TYPE_ARG} \
  --build-arg LAUNCHER_VERSION=${LAUNCHER_VERSION_ARG} \
  --build-arg TARGETPLATFORM=${TARGET_PLATFORM_ARG} \
  --build-arg BUILDER_PLATFORM_ARG=${BUILDER_PLATFORM_ARG} \
  -t "${FULL_IMAGE_NAME}" \
  -f "${DOCKERFILE_PATH}" \
  "${BUILD_CONTEXT}"
IMAGE_SIZE_BYTES=$(docker image inspect ${FULL_IMAGE_NAME} --format='{{.Size}}')
IMAGE_SIZE_MB=$(awk "BEGIN {printf \"%.2fMB\", ${IMAGE_SIZE_BYTES}/1024/1024}")
echo "INFO: Docker build completed."
echo "-----------------------------------------------"

# 3. Trivy Vulnerability Scan
echo "INFO: Scanning image ${FULL_IMAGE_NAME} with Trivy for all severities..."
trivy image --scanners vuln --quiet "${FULL_IMAGE_NAME}" > "${TRIVY_REPORT_FILE}" || true
echo "INFO: Trivy scan complete. Full report of findings: ${TRIVY_REPORT_FILE}"
echo "-----------------------------------------------"

# --- Final Output ---
echo ""
echo "================ FINAL SUMMARY ================"
echo "✅ Docker Image Built: ${FULL_IMAGE_NAME}"
echo "📏 Image Size: ${IMAGE_SIZE_MB}"
echo ""
echo "🛡️ Trivy Scan - Vulnerabilities Found:"
if [ -s "${TRIVY_REPORT_FILE}" ] && ! grep -q 'Total: 0 (UNKNOWN: 0, LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0)' "${TRIVY_REPORT_FILE}"; then
	echo "  Trivy report file has content, but no standard vulnerability table found. Please check:"
	echo "  ${TRIVY_REPORT_FILE}"
else
	echo "  No vulnerabilities found. 🎉"
fi
echo "  (Full Trivy quiet output saved to: ${TRIVY_REPORT_FILE})"
echo ""
echo "🚀 To Run This Image Locally:"
echo "   First, create a persistent volume (if you haven't already):"
echo "     docker volume create ${IMAGE_BASE_NAME}_data"
echo ""
echo "   Then, run the container:"
echo "     docker run -it --rm --name ${IMAGE_BASE_NAME}_instance -p 5678:5678 -v ${IMAGE_BASE_NAME}_data:/home/node/.n8n ${FULL_IMAGE_NAME}"
echo "============================================="