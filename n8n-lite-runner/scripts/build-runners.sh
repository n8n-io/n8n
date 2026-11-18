#!/usr/bin/env bash
# Builds the n8n-lite runners that n8n reads from N8N_LITE_RUNNER_DIR.
#
# The script writes one file per target into the output folder:
#   n8n-lite-runner-linux-arm64
#   n8n-lite-runner-linux-x64
#   n8n-lite-runner-darwin-arm64
#
# The Linux runners are static musl binaries, so they run on any Linux distribution.
# The darwin runner needs the macOS SDK, so the script runs only on macOS.
#
# Requirements: rustup, zig and cargo-zigbuild (brew install zig cargo-zigbuild).
#
# Usage: scripts/build-runners.sh [output folder, default: dist/runners]
set -euo pipefail

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "error: the darwin-arm64 runner can only be built on macOS" >&2
  exit 1
fi

out="${1:-dist/runners}"
mkdir -p "$out"
out="$(cd "$out" && pwd)"
cd "$(dirname "$0")/.."

# Each entry: the target name that n8n uses, the Rust target, the cargo command.
targets=(
  "linux-arm64 aarch64-unknown-linux-musl zigbuild"
  "linux-x64 x86_64-unknown-linux-musl zigbuild"
  "darwin-arm64 aarch64-apple-darwin build"
)

for entry in "${targets[@]}"; do
  read -r name triple command <<<"$entry"
  rustup target add "$triple" >/dev/null
  cargo "$command" --release --locked --target "$triple"
  cp "target/$triple/release/n8n-mini" "$out/n8n-lite-runner-$name"
  echo "built $out/n8n-lite-runner-$name"
done
