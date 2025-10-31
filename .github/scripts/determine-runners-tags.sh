#!/bin/bash
set -euo pipefail

# Script to determine Docker tags for runners images (Alpine and distroless variants)
#
# Usage: determine-runners-tags.sh RELEASE_TYPE N8N_VERSION_TAG GHCR_BASE DOCKER_BASE PLATFORM GITHUB_OUTPUT
#
# Example:
#   determine-runners-tags.sh \
#     "stable" \
#     "1.123.0" \
#     "ghcr.io/n8n-io/runners" \
#     "n8nio/runners" \
#     "amd64" \
#     "$GITHUB_OUTPUT"
#
# Output (written to GITHUB_OUTPUT):
#   Alpine variant:
#     tags=ghcr.io/n8n-io/runners:1.123.0-amd64, n8nio/runners:1.123.0-amd64
#     ghcr_platform_tag=ghcr.io/n8n-io/runners:1.123.0-amd64
#     dockerhub_platform_tag=n8nio/runners:1.123.0-amd64
#     primary_ghcr_manifest_tag=ghcr.io/n8n-io/runners:1.123.0
#
#   Distroless variant:
#     tags_distroless=ghcr.io/n8n-io/runners:1.123.0-distroless-amd64, n8nio/runners:1.123.0-distroless-amd64
#     ghcr_platform_tag_distroless=ghcr.io/n8n-io/runners:1.123.0-distroless-amd64
#     dockerhub_platform_tag_distroless=n8nio/runners:1.123.0-distroless-amd64
#     primary_ghcr_manifest_tag_distroless=ghcr.io/n8n-io/runners:1.123.0-distroless

RELEASE_TYPE="${1:?Missing RELEASE_TYPE argument}"
N8N_VERSION_TAG="${2:?Missing N8N_VERSION_TAG argument}"
GHCR_BASE="${3:?Missing GHCR_BASE argument}"
DOCKER_BASE="${4:?Missing DOCKER_BASE argument}"
PLATFORM="${5:?Missing PLATFORM argument}"
GITHUB_OUTPUT="${6:?Missing GITHUB_OUTPUT argument}"

generate_tags() {
  local VARIANT_SUFFIX="$1"
  local OUTPUT_FILE="$2"

  local GHCR_TAGS_FOR_PUSH=""
  local DOCKER_TAGS_FOR_PUSH=""
  local PRIMARY_GHCR_MANIFEST_TAG_VALUE=""

  case "$RELEASE_TYPE" in
    "stable")
      PRIMARY_GHCR_MANIFEST_TAG_VALUE="${GHCR_BASE}:${N8N_VERSION_TAG}${VARIANT_SUFFIX}"
      GHCR_TAGS_FOR_PUSH="${PRIMARY_GHCR_MANIFEST_TAG_VALUE}-${PLATFORM}"
      DOCKER_TAGS_FOR_PUSH="${DOCKER_BASE}:${N8N_VERSION_TAG}${VARIANT_SUFFIX}-${PLATFORM}"
      ;;
    "nightly")
      PRIMARY_GHCR_MANIFEST_TAG_VALUE="${GHCR_BASE}:nightly${VARIANT_SUFFIX}"
      GHCR_TAGS_FOR_PUSH="${PRIMARY_GHCR_MANIFEST_TAG_VALUE}-${PLATFORM}"
      DOCKER_TAGS_FOR_PUSH="${DOCKER_BASE}:nightly${VARIANT_SUFFIX}-${PLATFORM}"
      ;;
    "branch")
      PRIMARY_GHCR_MANIFEST_TAG_VALUE="${GHCR_BASE}:${N8N_VERSION_TAG}${VARIANT_SUFFIX}"
      GHCR_TAGS_FOR_PUSH="${PRIMARY_GHCR_MANIFEST_TAG_VALUE}-${PLATFORM}"
      DOCKER_TAGS_FOR_PUSH=""
      ;;
    "dev"|*)
      if [[ "$N8N_VERSION_TAG" == pr-* ]]; then
        PRIMARY_GHCR_MANIFEST_TAG_VALUE="${GHCR_BASE}:${N8N_VERSION_TAG}${VARIANT_SUFFIX}"
        GHCR_TAGS_FOR_PUSH="${PRIMARY_GHCR_MANIFEST_TAG_VALUE}-${PLATFORM}"
        DOCKER_TAGS_FOR_PUSH=""
      else
        PRIMARY_GHCR_MANIFEST_TAG_VALUE="${GHCR_BASE}:dev${VARIANT_SUFFIX}"
        GHCR_TAGS_FOR_PUSH="${PRIMARY_GHCR_MANIFEST_TAG_VALUE}-${PLATFORM}"
        DOCKER_TAGS_FOR_PUSH="${DOCKER_BASE}:dev${VARIANT_SUFFIX}-${PLATFORM}"
      fi
      ;;
  esac

  local ALL_TAGS="${GHCR_TAGS_FOR_PUSH}"
  if [[ -n "$DOCKER_TAGS_FOR_PUSH" ]]; then
    ALL_TAGS="${ALL_TAGS}\n${DOCKER_TAGS_FOR_PUSH}"
  fi

  {
    echo "tags<<EOF"
    echo -e "$ALL_TAGS"
    echo "EOF"
    echo "ghcr_platform_tag=${GHCR_TAGS_FOR_PUSH}"
    echo "dockerhub_platform_tag=${DOCKER_TAGS_FOR_PUSH}"
  } >> "$OUTPUT_FILE"

  # Only output manifest tags from the first platform to avoid duplicates
  if [[ "$PLATFORM" == "amd64" ]]; then
    echo "primary_ghcr_manifest_tag=${PRIMARY_GHCR_MANIFEST_TAG_VALUE}" >> "$OUTPUT_FILE"
  fi
}

# Reads outputs from a temp file and appends them to GITHUB_OUTPUT with _distroless suffix
# Transforms variable names: tags -> tags_distroless, ghcr_platform_tag -> ghcr_platform_tag_distroless
transform_and_append_distroless_outputs() {
  local TEMP_FILE="$1"

  while IFS= read -r line; do
    if [[ "$line" == "tags<<EOF" ]]; then
      echo "tags_distroless<<EOF" >> "$GITHUB_OUTPUT"
    elif [[ "$line" =~ ^(ghcr_platform_tag|dockerhub_platform_tag|primary_ghcr_manifest_tag)= ]]; then
      key="${line%%=*}"
      value="${line#*=}"
      echo "${key}_distroless=${value}" >> "$GITHUB_OUTPUT"
    else
      # Pass through EOF markers and tag content
      echo "$line" >> "$GITHUB_OUTPUT"
    fi
  done < "$TEMP_FILE"
}

# Generate tags for Alpine variant (no suffix)
generate_tags "" "$GITHUB_OUTPUT"

# Generate tags for distroless variant
DISTROLESS_OUTPUT=$(mktemp)
generate_tags "-distroless" "$DISTROLESS_OUTPUT"
transform_and_append_distroless_outputs "$DISTROLESS_OUTPUT"
rm "$DISTROLESS_OUTPUT"
