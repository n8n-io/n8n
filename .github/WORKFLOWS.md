# GitHub Actions & CI/CD Documentation

Complete reference for n8n's `.github/` folder.

---

## Folder Structure

```
.github/
├── WORKFLOWS.md                          # This document
├── CODEOWNERS                            # Team ownership for PR reviews
├── pull_request_template.md              # PR description template
├── pull_request_title_conventions.md     # Title format rules (Angular)
├── actionlint.yml                        # Workflow linter config
├── docker-compose.yml                    # DB services for local testing
├── test-metrics/
│   └── playwright.json                   # E2E performance baselines
├── ISSUE_TEMPLATE/
│   ├── config.yml                        # Routes to community/security
│   └── 01-bug.yml                        # Structured bug report form
├── scripts/                              # Automation scripts
│   ├── bump-versions.mjs                 # Calculate next version
│   ├── update-changelog.mjs              # Generate CHANGELOG
│   ├── trim-fe-packageJson.js            # Strip frontend devDeps
│   ├── ensure-provenance-fields.mjs      # Add license/author fields
│   ├── validate-docs-links.js            # Check documentation URLs
│   └── docker/
│       ├── docker-tags.mjs               # Generate image tags
│       └── docker-config.mjs             # Build context config
├── actions/                              # Custom composite actions
│   ├── setup-nodejs/                     # pnpm + Node + Turbo cache
│   └── docker-registry-login/            # GHCR + DockerHub auth
└── workflows/                            # GitHub Actions workflows
```

---

## Architecture Overview

```
┌────────────────────────────────────────────────────────────────────────────┐
│                          n8n CI/CD ARCHITECTURE                            │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  TRIGGERS                     PIPELINES                      OUTPUTS       │
│  ────────                     ─────────                      ───────       │
│                                                                            │
│  ┌──────────┐    ┌──────────────────────────────────┐    ┌────────────┐   │
│  │    PR    │───▶│  ci-pull-requests.yml            │───▶│   Checks   │   │
│  └──────────┘    │  ├─ build + paths-filter         │    │    Gate    │   │
│                  │  ├─ unit-test (reusable)         │    └────────────┘   │
│  ┌──────────┐    │  ├─ typecheck                    │                     │
│  │   Push   │───▶│  ├─ lint (reusable)              │    ┌────────────┐   │
│  │  master  │    │  ├─ e2e-tests (reusable)         │───▶│  Coverage  │   │
│  └──────────┘    │  └─ security (if .github/**)     │    └────────────┘   │
│                  └──────────────────────────────────┘                     │
│                                                                            │
│  ┌──────────┐    ┌──────────────────────────────────┐    ┌────────────┐   │
│  │  Merge   │───▶│  release-publish.yml             │───▶│    NPM     │   │
│  │release/* │    │  ├─ publish-to-npm               │    ├────────────┤   │
│  └──────────┘    │  ├─ publish-to-docker-hub        │───▶│   Docker   │   │
│                  │  ├─ create-github-release        │    ├────────────┤   │
│                  │  ├─ create-sentry-release        │───▶│   Sentry   │   │
│                  │  └─ generate-sbom                │    ├────────────┤   │
│                  └──────────────────────────────────┘───▶│    SBOM    │   │
│                                                          └────────────┘   │
│  ┌──────────┐    ┌──────────────────────────────────┐                     │
│  │ Schedule │───▶│  Nightly/Weekly Jobs             │    ┌────────────┐   │
│  │  (cron)  │    │  ├─ docker-build-push (nightly)  │───▶│   Images   │   │
│  └──────────┘    │  ├─ test-benchmark-nightly       │───▶│  Metrics   │   │
│                  │  ├─ test-workflows-nightly       │    └────────────┘   │
│                  │  └─ test-e2e-coverage-weekly     │                     │
│                  └──────────────────────────────────┘                     │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## Quick Reference

| Prefix     | Purpose                                 |
|------------|-----------------------------------------|
| `test-`    | Testing (E2E, unit, visual, benchmarks) |
| `ci-`      | Continuous integration                  |
| `util-`    | Utilities (notifications, sync, Claude) |
| `build-`   | Build processes                         |
| `release-` | Release automation                      |
| `sec-`     | Security scanning                       |
| Other      | Docker, SBOM, patch releases            |

---

## PR Title Conventions

Commits drive changelog generation. Follow Angular convention:

```
Format: <type>(<scope>): <summary>

Types:   feat | fix | perf | test | docs | refactor | build | ci | chore
Scopes:  API | benchmark | core | editor | * Node (optional)

Examples:
  feat(editor): Add dark mode toggle
  fix(Slack Node): Handle rate limiting correctly
  perf(core): Optimize workflow execution by 20%
  refactor: Migrate to TypeScript strict mode (no-changelog)

Breaking Changes:  Add "BREAKING CHANGE:" footer with migration guide
Deprecations:      Add "DEPRECATED:" footer with update path
Skip Changelog:    Add "(no-changelog)" to PR title
```

See `pull_request_title_conventions.md` for full spec.

---

## What Runs When You Open a PR

### Flow Diagram

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                            PR OPENED / UPDATED                               │
└─────────────────────────────────────┬────────────────────────────────────────┘
                                      │
          ┌───────────────────────────┴───────────────────────┐
          ▼                                                   ▼
┌───────────────────────────┐                     ┌───────────────────────────┐
│  ci-pull-requests.yml     │                     │  ci-check-pr-title.yml    │
│  (main orchestrator)      │                     │  (validates title format) │
└─────────────┬─────────────┘                     └───────────────────────────┘
              │
              ▼
┌───────────────────────────┐
│  install-and-build        │
│  └─ paths-filter          │──────────────────────────────────────────┐
└─────────────┬─────────────┘                                          │
              │                                                        │
              │ [if non-Python files changed]                          │ [if .github/** changed]
              │                                                        │
    ┌─────────┼─────────┬─────────────┬─────────────┐                  │
    │         │         │             │             │                  │
    ▼         ▼         ▼             ▼             ▼                  ▼
┌───────┐ ┌───────┐ ┌───────┐ ┌────────────┐ ┌────────────┐   ┌────────────┐
│ unit  │ │ type  │ │ lint  │ │  e2e-tests │ │  security  │   │  security  │
│ test  │ │ check │ │       │ │            │ │  checks    │   │  checks    │
└───┬───┘ └───┬───┘ └───┬───┘ └─────┬──────┘ └─────┬──────┘   └─────┬──────┘
    │         │         │           │              │                │
    │         │         │     ┌─────┴─────┐        │                │
    │         │         │     ▼           ▼        │                │
    │         │         │  Internal    Fork PR     │                │
    │         │         │  14 shards   6 shards    │                │
    │         │         │  Docker      SQLite      │                │
    │         │         │                          │                │
    └─────────┴─────────┴──────────┬───────────────┴────────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────────┐
                    │       required-checks        │
                    │        (merge gate)          │
                    └──────────────────────────────┘
```

### Path-Filtered Workflows

These only run if specific files changed:

| Files Changed                                                          | Workflow                    | Branch     |
|------------------------------------------------------------------------|-----------------------------|------------|
| `packages/@n8n/task-runner-python/**`                                  | `ci-python.yml`             | any        |
| `packages/cli/src/databases/**`, `*.entity.ts`, `*.repository.ts`      | `test-db-postgres-mysql.yml`| any        |
| `packages/frontend/@n8n/storybook/**`, design-system, chat             | `test-visual-storybook.yml` | master     |
| `docker/images/n8n-base/Dockerfile`                                    | `build-base-image.yml`      | any        |
| `**/package.json`, `**/turbo.json`                                     | `build-windows.yml`         | master     |
| `packages/@n8n/ai-workflow-builder.ee/evaluations/programmatic/python/**` | `test-evals-python.yml`  | any        |
| `packages/@n8n/benchmark/**`                                           | `build-benchmark-image.yml` | master     |
| `packages/cli/src/public-api/**/*.{css,yaml,yml}`                      | `util-sync-api-docs.yml`    | master     |

### On PR Review

| Event                      | Workflow                    | Condition                    |
|----------------------------|-----------------------------|------------------------------|
| Review approved            | `test-visual-chromatic.yml` | + design files changed       |
| Comment with `@claude`     | `util-claude.yml`           | mention in any comment       |
| Any review                 | `util-notify-pr-status.yml` | not community-labeled        |

### On PR Close/Merge

| Event                      | Workflow                    |
|----------------------------|-----------------------------|
| PR closed (any)            | `util-notify-pr-status.yml` |
| PR merged to `release/*`   | `release-publish.yml`       |

### Manual Triggers (PR Comments)

| Command            | Workflow                     | Permissions         |
|--------------------|------------------------------|---------------------|
| `/build-unit-test` | `ci-manual-unit-tests.yml`   | admin/write/maintain|
| `/test-workflows`  | `test-workflows-callable.yml`| admin/write/maintain|

**Why:** Re-run tests without pushing commits. Useful for flaky test investigation.

### Other Manual Workflows

| Workflow                  | Purpose                                                 |
|---------------------------|---------------------------------------------------------|
| `util-data-tooling.yml`   | SQLite/PostgreSQL export/import validation (manual)     |

---

## Workflow Call Graph

Shows which workflows call which reusable workflows:

```
CALLER                             REUSABLE WORKFLOW
───────────────────────────────────────────────────────────────────────────────

ci-pull-requests.yml
    ├──────────────────────────▶  test-unit-reusable.yml
    ├──────────────────────────▶  test-linting-reusable.yml
    ├──────────────────────────▶  test-e2e-ci-reusable.yml
    │                                 └──────────▶  test-e2e-reusable.yml
    └──────────────────────────▶  sec-ci-reusable.yml
                                      └──────────▶  sec-poutine-reusable.yml

ci-master.yml
    ├──────────────────────────▶  test-unit-reusable.yml
    └──────────────────────────▶  test-linting-reusable.yml

release-publish.yml
    ├──────────────────────────▶  docker-build-push.yml
    │                                 └──────────▶  security-trivy-scan-callable.yml
    └──────────────────────────▶  sbom-generation-callable.yml

test-workflows-nightly.yml
    └──────────────────────────▶  test-workflows-callable.yml

PR Comment Dispatchers (triggered by /command in PR comments):
build-unit-test-pr-comment.yml
    └──────────────────────────▶  ci-manual-unit-tests.yml

test-workflows-pr-comment.yml
    └──────────────────────────▶  test-workflows-callable.yml
```

---

## Release Lifecycle

```
┌────────────────────────────────────────────────────────────────────────────┐
│                           RELEASE LIFECYCLE                                │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  STAGE 1: Create Release PR                                                │
│  ───────────────────────────                                               │
│  Trigger: Manual workflow_dispatch                                         │
│                                                                            │
│  release-create-pr.yml                                                     │
│  ├─ bump-versions.mjs ────────▶ Calculate X.Y.Z                            │
│  ├─ update-changelog.mjs ─────▶ Generate CHANGELOG                         │
│  └─ Create PR: release-pr/X.Y.Z → release/X.Y.Z                            │
│                                                                            │
│  Inputs:                                                                   │
│  ├─ release-type: patch │ minor │ major │ experimental │ premajor          │
│  └─ base-branch: default master                                            │
│                          │                                                 │
│                          ▼                                                 │
│  STAGE 2: CI Validation                                                    │
│  ───────────────────────                                                   │
│  ci-pull-requests.yml runs full suite                                      │
│  ├─ NO ci-check-pr-title.yml (skipped for release branches)                │
│  └─ NO test-visual-chromatic.yml (skipped)                                 │
│                          │                                                 │
│                          ▼ [Merge PR]                                      │
│  STAGE 3: Publish                                                          │
│  ───────────────                                                           │
│  release-publish.yml (triggered on merge to release/*)                     │
│  ├─ publish-to-npm                                                         │
│  │   ├─ trim-fe-packageJson.js ───▶ Strip devDeps                          │
│  │   ├─ ensure-provenance-fields.mjs ───▶ Add license fields               │
│  │   └─ npm publish (tag: rc or latest)                                    │
│  ├─ publish-to-docker-hub ────────▶ docker-build-push.yml                  │
│  │   └─ Multi-arch: amd64 + arm64                                          │
│  ├─ create-github-release                                                  │
│  ├─ create-sentry-release (sourcemaps)                                     │
│  ├─ generate-sbom ────────────────▶ sbom-generation-callable.yml           │
│  │   └─ CycloneDX + Cosign signing                                         │
│  └─ trigger-release-note (stable only)                                     │
│                          │                                                 │
│                          ▼                                                 │
│  STAGE 4: Channel Promotion (optional)                                     │
│  ──────────────────────────────────────                                    │
│  Trigger: Manual release-push-to-channel.yml                               │
│  ├─ beta ─────▶ npm tags: next, beta                                       │
│  └─ stable ───▶ npm tags: latest, stable                                   │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

### Other Release Workflows

| Workflow                         | Trigger            | Purpose                                        |
|----------------------------------|--------------------|------------------------------------------------|
| `release-standalone-package.yml` | Manual dispatch    | Release individual packages (@n8n/codemirror-lang, @n8n/create-node, etc.) |
| `create-patch-release-branch.yml`| Manual dispatch    | Cherry-pick commits for patch releases         |

---

## Fork vs Internal PR

| Aspect             | Internal PR                      | Fork PR                 |
|--------------------|----------------------------------|-------------------------|
| E2E Runner         | `blacksmith-2vcpu-ubuntu-2204`   | `ubuntu-latest`         |
| E2E Mode           | `docker-build` (multi-main)      | `local` (SQLite)        |
| E2E Shards         | 14 + 2                           | 6 + 2                   |
| Test Command       | `test:container:multi-main:*`    | `test:local:*`          |
| Secrets            | Full access                      | None                    |
| Currents Recording | Yes                              | No                      |
| Failure Artifacts  | No                               | Yes                     |

**Why:** Fork PRs cannot access repository secrets. Local mode with SQLite provides feedback without paid services.

---

## ci-master.yml

Runs on push to `master` or `1.x`:

```
Push to master/1.x
├─ build-github (populate cache)
├─ unit-test (matrix: Node 20.x, 22.x, 24.3.x)
│   └─ Coverage only on 22.x
├─ lint
└─ notify-on-failure (Slack #alerts-build)
```

---

## Scheduled Jobs

| Schedule (UTC)            | Workflow                          | Purpose                  |
|---------------------------|-----------------------------------|--------------------------|
| Daily 00:00               | `docker-build-push.yml`           | Nightly Docker images    |
| Daily 00:00               | `test-db-postgres-mysql.yml`      | Database compatibility   |
| Daily 00:00               | `test-e2e-performance-reusable.yml`| Performance E2E         |
| Daily 00:00               | `test-visual-storybook.yml`       | Storybook deploy         |
| Daily 00:00               | `test-visual-chromatic.yml`       | Visual regression        |
| Daily 00:00               | `util-check-docs-urls.yml`        | Doc link validation      |
| Daily 01:30, 02:30, 03:30 | `test-benchmark-nightly.yml`      | Performance benchmarks   |
| Daily 02:00               | `test-workflows-nightly.yml`      | Workflow tests           |
| Daily 05:00               | `test-benchmark-destroy-nightly.yml`| Cleanup benchmark env  |
| Monday 00:00              | `util-update-node-popularity.yml` | Node usage stats         |
| Monday 02:00              | `test-e2e-coverage-weekly.yml`    | Weekly E2E coverage      |
| Saturday 22:00            | `test-evals-ai.yml`               | AI workflow evals        |

---

## Custom Actions

Composite actions in `.github/actions/`:

| Action                   | Purpose                                      | Used By            |
|--------------------------|----------------------------------------------|--------------------|
| `setup-nodejs`           | pnpm + Node.js + Turbo cache + Docker (opt)  | Most CI workflows  |
| `docker-registry-login`  | GHCR + DockerHub + DHI authentication        | Docker workflows   |

### setup-nodejs

```yaml
inputs:
  node-version:        # default: '22.x'
  enable-docker-cache: # default: 'false' (Blacksmith Buildx)
  build-command:       # default: 'pnpm build'
```

### docker-registry-login

```yaml
inputs:
  login-ghcr:       # default: 'true'
  login-dockerhub:  # default: 'false'
  login-dhi:        # default: 'false'
```

---

## Reusable Workflows

Workflows with `workflow_call` trigger:

| Workflow                           | Inputs                                        | Purpose               |
|------------------------------------|-----------------------------------------------|-----------------------|
| `test-unit-reusable.yml`           | `ref`, `nodeVersion`, `collectCoverage`       | Unit tests            |
| `test-linting-reusable.yml`        | `ref`, `nodeVersion`                          | ESLint                |
| `test-e2e-reusable.yml`            | `branch`, `test-mode`, `shards`, `runner`     | Core E2E executor     |
| `test-e2e-ci-reusable.yml`         | `branch`                                      | E2E orchestrator      |
| `test-e2e-docker-pull-reusable.yml`| `branch`, `n8n_version`                       | E2E with pulled image |
| `test-workflows-callable.yml`      | `git_ref`, `compare_schemas`                  | Workflow tests        |
| `ci-check-eligibility-reusable.yml`| (internal)                                    | PR eligibility checks |
| `docker-build-push.yml`            | `n8n_version`, `release_type`, `push_enabled` | Docker build          |
| `sec-ci-reusable.yml`              | `ref`                                         | Security orchestrator |
| `sec-poutine-reusable.yml`         | `ref`                                         | Poutine scanner       |
| `security-trivy-scan-callable.yml` | `image_ref`                                   | Trivy scan            |
| `sbom-generation-callable.yml`     | `n8n_version`, `release_tag_ref`              | SBOM generation       |

---

## Scripts

Scripts in `.github/scripts/`:

### Release Scripts

| Script                        | Purpose                    | Called By               |
|-------------------------------|----------------------------|-------------------------|
| `bump-versions.mjs`           | Calculate next version     | `release-create-pr.yml` |
| `update-changelog.mjs`        | Generate CHANGELOG         | `release-create-pr.yml` |
| `trim-fe-packageJson.js`      | Strip frontend devDeps     | `release-publish.yml`   |
| `ensure-provenance-fields.mjs`| Add license/author fields  | `release-publish.yml`   |

### Docker Scripts

| Script                  | Purpose           | Called By              |
|-------------------------|-------------------|------------------------|
| `docker/docker-config.mjs`| Build context   | `docker-build-push.yml`|
| `docker/docker-tags.mjs`  | Image tags      | `docker-build-push.yml`|

### Validation Scripts

| Script                  | Purpose           | Called By                 |
|-------------------------|-------------------|---------------------------|
| `validate-docs-links.js`| Check doc URLs    | `util-check-docs-urls.yml`|

---

## CODEOWNERS

Team ownership mappings in `CODEOWNERS`:

| Path Pattern                                                 | Team                       |
|--------------------------------------------------------------|----------------------------|
| `packages/@n8n/db/src/migrations/`                           | @n8n-io/migrations-review  |
| `packages/frontend/editor-ui/data/node-popularity.json`      | @n8n-io/catalysts          |

---

## Runner Selection

| Runner                              | vCPU | Use Case                    |
|-------------------------------------|------|-----------------------------|
| `ubuntu-slim`                       | 1    | Gate jobs (required-checks) |
| `ubuntu-latest`                     | 2    | Simple jobs, fork PR E2E    |
| `blacksmith-2vcpu-ubuntu-2204`      | 2    | Standard builds, E2E shards |
| `blacksmith-4vcpu-ubuntu-2204`      | 4    | Unit tests, typecheck, lint |
| `blacksmith-8vcpu-ubuntu-2204`      | 8    | E2E coverage (weekly)       |
| `blacksmith-4vcpu-ubuntu-2204-arm`  | 4    | ARM64 Docker builds         |

### Selection Guidelines

**`ubuntu-slim`** - Status check aggregation, gate/required-check jobs, notifications

**`ubuntu-latest`** - Simple build verification, scheduled maintenance, PR comment handlers, release tagging, Docker manifest creation, any job where speed is not critical

**`blacksmith-2vcpu-ubuntu-2204`** - Initial build/install (benefits from Blacksmith caching), database integration tests (I/O bound), Chromatic/Storybook builds

**`blacksmith-4vcpu-ubuntu-2204`** - Unit tests (parallelized), linting (parallel file processing), typechecking (CPU-intensive), E2E test shards

**`blacksmith-8vcpu-ubuntu-2204`** - Heavy parallel workloads, full E2E coverage runs

---

## Security

### Poutine (Supply Chain)

- **Runs on:** PR changes to `.github/**`
- **Detects:** Exposed secrets, insecure workflow configs
- **Output:** SARIF to GitHub Security tab

### Trivy (Container)

- **Runs on:** stable/nightly/rc Docker builds
- **Scans:** n8n image, runners image
- **Output:** Slack `#notify-security-scan-outputs` (all), `#mission-security` (critical)

### SBOM

- **Runs on:** release-publish
- **Format:** CycloneDX JSON
- **Signing:** Cosign keyless (GitHub OIDC)
- **Attached to:** GitHub Release

---

## Secrets

### By Category

| Category            | Secrets                                                     |
|---------------------|-------------------------------------------------------------|
| Package Publishing  | `NPM_TOKEN`, `DOCKER_USERNAME`, `DOCKER_PASSWORD`           |
| Notifications       | `SLACK_WEBHOOK_URL`, `QBOT_SLACK_TOKEN`                     |
| Code Quality        | `CODECOV_TOKEN`, `CHROMATIC_PROJECT_TOKEN`, `CURRENTS_RECORD_KEY` |
| Error Tracking      | `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_*_PROJECT`       |
| Cloud/CDN           | `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`             |
| GitHub Automation   | `N8N_ASSISTANT_APP_ID`, `N8N_ASSISTANT_PRIVATE_KEY`         |
| Benchmarking        | `BENCHMARK_ARM_*`, `N8N_BENCHMARK_LICENSE_CERT`             |
| AI/Evals            | `ANTHROPIC_API_KEY`, `EVALS_LANGSMITH_*`                    |

### Scoping

- **`secrets: inherit`** - passes all secrets to reusable workflows
- **Explicit passing** - for minimal exposure
- **Environment: `benchmarking`** - Azure OIDC credentials

---

## Future Vision

### Redundancy Review

Comment triggers (`/build-unit-test`, `/test-workflows`) are workarounds.

Long-term: Main CI should be reliable enough to not need these.

### Workflow Testability

- Tools like `act` for local testing
- Unit tests for `.github/scripts/*.mjs`
- Validation with `actionlint`
