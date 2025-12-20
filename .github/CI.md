# CI Pipeline Documentation

This document describes the CI checks that run on pull requests and when they pass/fail.

## PR Checks Overview

| Check | Runs When | Pass Condition | Blocks Merge |
|-------|-----------|----------------|--------------|
| **Install & Build** | Always (non-python changes) | Build completes successfully | Yes |
| **Unit Tests** | Always (non-python changes) | All tests pass | Yes |
| **Typecheck** | Always (non-python changes) | No TypeScript errors | Yes |
| **Lint** | Always (non-python changes) | No linting errors | Yes |
| **E2E Tests** | Always (non-python changes) | All Playwright tests pass | Yes |
| **Bundle Analysis** | Frontend changes | Informational (see below) | No |
| **Code Coverage** | Always | Coverage doesn't drop >0.5% | Yes |

## Bundle Analysis (Codecov)

We use [Codecov Bundle Analysis](https://docs.codecov.com/docs/javascript-bundle-analysis) to track frontend bundle size changes.

### What It Measures

- **Total bundle size**: All files in `packages/frontend/editor-ui/dist/`
- **Gzip estimate**: Compressed transfer size
- **Module count**: Number of JS modules

### Configuration

Located in `codecov.yml`:

```yaml
bundle_analysis:
  status: warning       # Shows warning on PR if threshold exceeded
  warning_threshold: 1% # ~330KB increase triggers warning

comment:
  require_bundle_changes: bundle_increase  # Only comments on increases
  bundle_change_threshold: 100Kb           # Minimum change to report
```

### Understanding the Numbers

| Metric | Description |
|--------|-------------|
| **Total size (33 MB)** | Entire dist folder - includes all lazy-loaded chunks |
| **Gzip size (8.7 MB)** | Estimated compressed size |
| **Initial load (~6 MB)** | What users actually download on first page |

The total size is larger than initial load because of **code splitting** - many chunks are only loaded when users navigate to specific pages.

### When to Investigate

- Bundle size increase >100KB without adding new features
- New dependencies that increase bundle size
- Accidental inclusion of dev dependencies in production
- Warning status triggered (>1% / ~330KB increase)

## Code Coverage (Codecov)

### Thresholds

- **Project coverage**: Must not drop more than 0.5%
- **Nodes packages**: Must not decrease at all (0% threshold)

### Flags

| Flag | Scope |
|------|-------|
| `backend-unit` | Backend unit tests |
| `backend-integration` | Backend integration tests |
| `nodes-unit` | Node package tests |
| `frontend` | Frontend unit tests |
| `frontend-e2e` | E2E test coverage |

## E2E Tests (Playwright + Currents)

E2E tests run via Playwright with results reported to [Currents](https://currents.dev).

### Test Categories

- **UI tests**: Standard browser-based tests
- **Isolated tests**: Tests requiring database reset (`@db:reset`)
- **Container tests**: Tests requiring specific infrastructure (`@capability:*`)

### Running Locally

```bash
# Run all local tests
pnpm --filter=n8n-playwright test:local

# Run specific test
pnpm --filter=n8n-playwright test:local --grep="test name"
```

## Workflow Files

| File | Purpose |
|------|---------|
| `ci-pull-requests.yml` | Main PR checks |
| `ci-master.yml` | Post-merge checks |
| `playwright-test-ci.yml` | E2E test orchestration |
| `units-tests-reusable.yml` | Reusable unit test workflow |

## Debugging Failed Checks

### Build Failures
```bash
pnpm build > build.log 2>&1
tail -50 build.log
```

### Test Failures
```bash
# Unit tests - run from package directory
cd packages/cli && pnpm test

# E2E tests - view report
pnpm --filter=n8n-playwright exec playwright show-report
```

### Type Errors
```bash
pnpm typecheck
```

### Lint Errors
```bash
pnpm lint
# Auto-fix
pnpm lint:fix
```
