#!/usr/bin/env bash
#
# Compiles native/*.cpp + the vendored PCRE2 submodule to wasm. Not meant to
# be run directly -- use `pnpm build:wasm` (scripts/wasm/build.mjs), which
# picks Docker (recommended, reproducible) or a local emsdk install
# automatically. This script just does the actual emcmake/cmake build once
# a matching emcc is already on PATH.
#
# Do NOT use a third-party emsdk image (e.g. trzeci/emscripten): it is
# unmaintained and pins an ancient PCRE2/Emscripten combination with no CI to
# catch drift. Bump .emsdk-version deliberately (check
# https://github.com/emscripten-core/emsdk/releases) rather than tracking
# "latest".

set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/../.."

if ! command -v emcc >/dev/null 2>&1; then
  echo "error: emcc not found on PATH. Run 'pnpm build:wasm' instead of this script directly." >&2
  exit 1
fi

PINNED_VERSION="$(cat .emsdk-version)"
ACTUAL_VERSION="$(emcc --version | head -n1 | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -n1 || true)"

if [[ -n "${ACTUAL_VERSION}" && "${ACTUAL_VERSION}" != "${PINNED_VERSION}" ]]; then
  echo "warning: active emcc is ${ACTUAL_VERSION}, pinned version is ${PINNED_VERSION}. Continuing, but the build may not be reproducible." >&2
fi

BUILD_DIR="build"
OUT_DIR="src/generated"

if [[ ! -f "vendor/pcre2/CMakeLists.txt" ]]; then
  echo "==> Initializing vendor/pcre2 submodule"
  git submodule update --init --recursive
fi

echo "==> Configuring (emcmake cmake -B ${BUILD_DIR})"
# No explicit -G: the official emscripten/emsdk Docker image doesn't ship
# Ninja, only Make, so let CMake pick its default generator (Unix Makefiles)
# rather than hard-failing on the documented, recommended build path.
emcmake cmake -B "${BUILD_DIR}"

echo "==> Building"
cmake --build "${BUILD_DIR}"

WASM_FILE="${BUILD_DIR}/pcre2_wrapper.wasm"
JS_FILE="${BUILD_DIR}/pcre2_wrapper.js"

if [[ ! -f "${WASM_FILE}" || ! -f "${JS_FILE}" ]]; then
  echo "error: expected build output not found (${WASM_FILE}, ${JS_FILE})" >&2
  exit 1
fi

mkdir -p "${OUT_DIR}"
cp "${WASM_FILE}" "${JS_FILE}" "${OUT_DIR}/"

echo "==> Done. Output copied to ${OUT_DIR}/"
echo "    ${OUT_DIR}/$(basename "${WASM_FILE}")"
echo "    ${OUT_DIR}/$(basename "${JS_FILE}")"
echo
echo "NOTE: ${OUT_DIR}/ is committed to the repo (see .gitignore comment)."
echo "Review the diff and commit the updated files."
