#!/bin/bash
# Test script to reproduce CAT-2506: devcontainer build failure
# This test validates that the devcontainer Dockerfile can be built successfully

set -e

TEST_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEVCONTAINER_DIR="$(dirname "$TEST_DIR")"
DOCKERFILE="$DEVCONTAINER_DIR/Dockerfile"

echo "Testing devcontainer Dockerfile build..."
echo "Dockerfile location: $DOCKERFILE"

# Test 1: Verify apk command is available in base image
echo "Test 1: Checking if apk is available in n8nio/base:24..."
if docker run --rm n8nio/base:24 sh -c "command -v apk" > /dev/null 2>&1; then
    echo "✓ Test 1 PASSED: apk is available"
else
    echo "✗ Test 1 FAILED: apk command not found in n8nio/base:24"
    echo "  This is expected to fail - reproducing CAT-2506"
    exit 1
fi

# Test 2: Try to run the apk add command that's in the Dockerfile
echo "Test 2: Attempting to run 'apk add' from Dockerfile..."
if docker run --rm n8nio/base:24 sh -c "apk add --no-cache --update openssh sudo shadow bash" > /dev/null 2>&1; then
    echo "✓ Test 2 PASSED: apk add succeeded"
else
    echo "✗ Test 2 FAILED: apk add command failed"
    echo "  Error: /bin/sh: apk: not found"
    exit 1
fi

# Test 3: Try to build the devcontainer Dockerfile
echo "Test 3: Attempting to build devcontainer Dockerfile..."
if docker build -t test-devcontainer:cat-2506 -f "$DOCKERFILE" "$DEVCONTAINER_DIR" > /tmp/docker-build.log 2>&1; then
    echo "✓ Test 3 PASSED: Dockerfile built successfully"
    docker rmi test-devcontainer:cat-2506 > /dev/null 2>&1
else
    echo "✗ Test 3 FAILED: Dockerfile build failed"
    echo "  Build log (last 20 lines):"
    tail -20 /tmp/docker-build.log
    exit 1
fi

# Test 4: Check for pnpm conflict
echo "Test 4: Verifying pnpm is not already installed..."
if docker run --rm n8nio/base:24 sh -c "command -v pnpm" > /dev/null 2>&1; then
    echo "✗ Test 4 WARNING: pnpm is already installed in base image"
    echo "  This will cause 'npm install -g pnpm' to fail with EEXIST"
else
    echo "✓ Test 4 PASSED: pnpm is not pre-installed"
fi

# Test 5: Check for getconf availability (needed by VS Code server)
echo "Test 5: Verifying getconf is available..."
if docker run --rm n8nio/base:24 sh -c "command -v getconf" > /dev/null 2>&1; then
    echo "✓ Test 5 PASSED: getconf is available"
else
    echo "✗ Test 5 WARNING: getconf not found"
    echo "  VS Code server requires getconf (from libc-utils package)"
fi

echo ""
echo "All tests completed."
