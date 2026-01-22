#!/bin/bash
set -e

# --- CONFIG ---
AWS_REGION="ap-south-1"
ACCOUNT_ID="883658082279"
REPO_NAME="valyx/nathan"
VERSION="1.0.0"

# --- INSTALL DEPENDENCIES ---
echo "📦 Installing dependencies..."
pnpm install --frozen-lockfile

# --- BUILD N8N APPLICATION ---
echo "🔨 Building n8n application..."
node scripts/build-n8n.mjs

# --- LOGIN TO ECR ---
echo "🔑 Logging in to AWS ECR..."
aws ecr get-login-password --region $AWS_REGION \
  | docker login --username AWS --password-stdin ${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com

# --- ENABLE BUILDX ---
echo "⚙️ Setting up Docker Buildx..."
docker buildx create --use --name n8n-builder || true
docker buildx use n8n-builder

# --- TAGS ---
LATEST_TAG="${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${REPO_NAME}:latest"
SHA_TAG="${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${REPO_NAME}:$(git rev-parse --short HEAD)"
SEMVER_TAG="${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${REPO_NAME}:${VERSION}"
CACHE_TAG="${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${REPO_NAME}:buildcache"

echo "🏷️ Tags:"
echo " - $LATEST_TAG"
echo " - $SHA_TAG"
echo " - $SEMVER_TAG"

# --- BUILD AND PUSH N8N ---
echo "📦 Building and pushing n8n Docker image..."
docker buildx build \
  --platform linux/arm64 \
  --file docker/images/n8n/Dockerfile \
  --cache-from=type=registry,ref=$CACHE_TAG \
  --cache-to=type=registry,ref=$CACHE_TAG,mode=max \
  -t $LATEST_TAG \
  -t $SHA_TAG \
  -t $SEMVER_TAG \
  --push \
  .

echo "✅ n8n build and push complete!"

# --- BUILD AND PUSH RUNNERS (optional) ---
RUNNERS_REPO_NAME="valyx/nathan-runners"
RUNNERS_LATEST_TAG="${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${RUNNERS_REPO_NAME}:latest"
RUNNERS_SHA_TAG="${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${RUNNERS_REPO_NAME}:$(git rev-parse --short HEAD)"
RUNNERS_SEMVER_TAG="${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${RUNNERS_REPO_NAME}:${VERSION}"
RUNNERS_CACHE_TAG="${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${RUNNERS_REPO_NAME}:buildcache"

echo "📦 Building and pushing runners Docker image..."
docker buildx build \
  --platform linux/arm64 \
  --file docker/images/runners/Dockerfile \
  --cache-from=type=registry,ref=$RUNNERS_CACHE_TAG \
  --cache-to=type=registry,ref=$RUNNERS_CACHE_TAG,mode=max \
  -t $RUNNERS_LATEST_TAG \
  -t $RUNNERS_SHA_TAG \
  -t $RUNNERS_SEMVER_TAG \
  --push \
  .

echo "✅ All builds and pushes complete!"
