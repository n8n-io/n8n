# Devcontainer Tests

This directory contains regression tests for the n8n devcontainer setup.

## Running Tests

```bash
# Run the devcontainer build test
./.devcontainer/__tests__/devcontainer-build.test.sh
```

## Test: devcontainer-build.test.sh

Reproduces and validates the fix for **CAT-2506**: devcontainer build failure due to missing `apk` in base image.

### Issue Summary

The `.devcontainer/Dockerfile` fails to build because:
1. `apk` package manager was removed from `n8nio/base:24` (line 29 in `docker/images/n8n-base/Dockerfile`: `apk del apk-tools`)
2. The devcontainer Dockerfile attempts to use `apk add` on line 3
3. Additional issues: duplicate `pnpm` installation and missing `getconf` (from `libc-utils`)

### Tests Performed

1. **Test 1**: Verify `apk` is available in base image
2. **Test 2**: Validate `apk add` command works
3. **Test 3**: Build the complete devcontainer Dockerfile
4. **Test 4**: Check for pnpm installation conflicts
5. **Test 5**: Verify `getconf` availability (VS Code requirement)

### Expected Failure

This test is **expected to fail** until CAT-2506 is fixed. The failure reproduces the exact error reported:

```
/bin/sh: apk: not found
```

### Prerequisites

- Docker installed and running
- Access to `n8nio/base:24` image
