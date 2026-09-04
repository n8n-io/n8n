# GitHub Actions & CI/CD Documentation

Complete reference for n8n's `.github/` folder.

---

## Folder Structure

```
.github/
├── WORKFLOWS.md                          # This document
├── CI-TELEMETRY.md                       # Telemetry & metrics guide
├── CODEOWNERS                            # Temporary, side by side with OWNERS during the trial
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
│   ├── owners/                           # Owners scripts (the OWNERS file lives at the repo root)
│   ├── bump-versions.mjs                 # Calculate next version
│   ├── update-changelog.mjs              # Generate CHANGELOG
│   ├── trim-fe-packageJson.js            # Strip frontend devDeps
│   ├── ensure-provenance-fields.mjs      # Add license/author fields
│   ├── validate-docs-links.js            # Check documentation URLs
│   ├── send-build-stats.mjs              # Turbo build telemetry → webhook
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
| `packages/cli/src/databases/**`, `*.entity.ts`, `*.repository.ts`      | `test-db.yml`               | any        |
| `packages/frontend/@n8n/storybook/**`, design-system, chat             | `release-storybook.yml` | master     |
| `docker/images/n8n-base/Dockerfile`                                    | `build-base-image.yml`      | any        |
| `**/package.json`, `**/turbo.json`                                     | `build-windows.yml`         | master     |
| `packages/@n8n/ai-workflow-builder.ee/evaluations/programmatic/python/**` | `test-evals-python.yml`  | any        |
| `packages/@n8n/benchmark/**`                                           | `build-benchmark-image.yml` | master     |
| `packages/cli/src/public-api/**/*.yml`, `packages/cli/src/public-api/**/*.yaml`, `packages/cli/src/public-api/**/*.css`, `packages/cli/src/public-api/v1/openapi-gen/**/*.ts`, `packages/cli/scripts/build.mjs`, `packages/cli/package.json` | `util-publish-api-schema.yml` | master   |
| `packages/@n8n/instance-ai/src/**`, `packages/@n8n/instance-ai/skills/**`, `packages/@n8n/instance-ai/knowledge-base/**`, `packages/@n8n/instance-ai/evaluations/**`, `packages/cli/src/modules/instance-ai/**`, `packages/core/src/execution-engine/eval-mock-helpers.ts`, `packages/@n8n/agents/src/**` | `ci-instance-ai-evals.yml` | on PR `opened` / `reopened` / `ready_for_review` |
| `docker/get-n8n.sh`, `docker/get-n8n-compose.yml`, `docker/test-get-n8n.sh` | `test-get-n8n.yml`          | any        |

### On PR Review

| Event                      | Workflow                    | Condition                                            |
|----------------------------|-----------------------------|------------------------------------------------------|
| Review approved            | `release-chromatic.yml` | + design files changed                               |
| Any review                 | `util-notify-pr-status.yml` | not community-labeled                                |

**Why Instance AI evals fire once per PR state-change, not per push:** the
workflow eval is the most expensive job in PR CI (LLM-bound builds). Running it
on every push made cost untenable; firing on every review approval cascaded
through the dismiss-stale-on-push → re-approve loop, which also blew up.
The current trigger fires once per `opened` / `reopened` / `ready_for_review`
on a non-fork PR touching the eval surface, and runs the `pr` test-case dataset
(a small set of high-reliability, capability-diverse cases) instead of the full
suite. Test cases are pulled at run time from the LangTracer suite
`baseline` — the source of truth; CI has no disk fallback (local runs
keep `--source disk` for authoring). To
re-run after pushing a fix, dispatch `ci-instance-ai-evals.yml` with the PR
number (optionally `tier: full` for broader coverage) — results post back to
the PR. The lighter `test-evals-discovery.yml` still runs on every push as part
of `ci-pull-requests.yml`.

**`ci-instance-ai-evals.yml` is the PR gate; `test-evals-instance-ai.yml` is
the lab bench.** The gate deliberately exposes only PR re-runs. Anything that
isn't PR gating — baselines, model experiments, arbitrary branch runs — goes
through `test-evals-instance-ai.yml`'s own dispatch form ("Instance AI
Evals: Experiments"): full knob set (branch, filter, tier, suite,
iterations, experiment-name, model, model-url, model-key, reasoning-effort, supports-structured-outputs), no per-PR cancellation (dispatches run in parallel, e.g. concurrent
model-comparison arms), and SHA-keyed docker cache hits on master. Evals never
run on fork PRs: the event trigger gates on `head.repo.fork`, and the `pr`
re-run path refuses fork PRs in `resolve` (dispatched runs carry secrets).

**MCP workflow evals (`ci-mcp-evals.yml`) are manual only (`workflow_dispatch`),
never per-PR or scheduled.** They reuse the Instance AI verifier but build each
workflow through the instance MCP server by driving the `claude` CLI, which adds
Anthropic build cost on top of the verifier — too expensive to run
automatically. The job boots `lanes` n8n containers on one runner and runs a
single `eval:instance-ai --build-via-mcp` process: each case is built by driving
its lane's own MCP server with `claude`, then verified on that same lane
(work-stealing across lanes, capped per-lane). One process → one experiment in
the isolated `mcp-workflow-evals` LangSmith dataset, so there is no shard/merge
step. Dispatch from the Actions tab (set `experiment-name=mcp-baseline` to
refresh the baseline, `filter=<slug>` to run a single case, or `lanes` to widen
parallelism). See the `--build-via-mcp` section in
`packages/@n8n/instance-ai/evaluations/README.md`.

### On PR Close/Merge

| Event                              | Workflow                       |
|------------------------------------|--------------------------------|
| PR closed (any)                    | `util-notify-pr-status.yml`    |
| PR merged to `release/*`           | `release-publish.yml`          |
| PR closed with `codespace-preview` | `util-codespace-preview.yml`   |

### Manual Triggers (PR Comments)

| Command            | Workflow                     | Permissions         |
|--------------------|------------------------------|---------------------|
| `/test-workflows`  | `test-workflows-callable.yml`| admin/write/maintain|

**Why:** Re-run tests without pushing commits. Useful for flaky test investigation.

### Label Triggers

| Label                | Workflow                       | Effect                                          |
|----------------------|--------------------------------|-------------------------------------------------|
| `codespace-preview`  | `util-codespace-preview.yml`   | Runs the PR in a Codespace, comments the URL    |

**Why:** A reviewer gets a running instance of the PR without a Docker build or a
cloud deploy. The workflow calls `scripts/preview.mjs`, which keeps one codespace
for each PR (display name `preview/pr-<number>`) and shares port 5678 with the
organization. A later push serves the new head in the same box. Removing the
label, or closing the PR, deletes the box.

Only a PR from a branch in this repository is eligible: a codespace token is
scoped to `n8n-io/n8n` and cannot check out a fork head.

#### The `CODESPACE_PREVIEW_TOKEN` secret

The job needs `CODESPACE_PREVIEW_TOKEN`, a **fine-grained** personal access token,
held in the `codespaces` environment. Set the resource owner to `n8n-io` and limit
repository access to `n8n-io/n8n`. Grant these repository permissions:

| Permission | Level | What it unlocks |
|---|---|---|
| Metadata | Read | Mandatory, selected for you |
| Codespaces | Read and write | Create, list and delete a box |
| Codespaces metadata | Read | `GET .../codespaces/machines`, which resolves the machine type |
| Codespaces lifecycle admin | Read and write | Start a stopped box, which is what `gh codespace ssh` does |
| Contents | Read | Read the repository |
| Pull requests | Read | `gh pr view`, to resolve the head ref and SHA |

`Codespaces metadata` is a **different permission** from `Codespaces`. Without it
the run fails with `HTTP 403: Resource not accessible by personal access token` on
the `machines` endpoint, after the org billing check has already printed a tick —
so the failure looks unrelated to permissions.

An organization owner may have to approve the token. It stays pending until then.

No other credential can do this:

- `GITHUB_TOKEN` has no Codespaces access.
- A GitHub App **installation** token cannot create a codespace at all. The
  Codespaces API belongs to a user, not to an installation.
- A **classic** token is refused by org policy:
  `` `n8n-io` forbids access via a personal access token (classic) ``. So no
  combination of classic scopes works, whatever the API reference says about the
  `codespace` scope.

The environment keeps the token away from every other workflow: only a job that
names `codespaces` can read it. **The environment must allow every branch.** A
`pull_request` run has the ref `refs/pull/<n>/merge`, which no deployment branch
policy matches, so a branch rule would block every preview. Add required
reviewers only if a click for each preview is acceptable.

The codespace belongs to whoever owns the token, and shows up in that account's
codespace list. Billing still goes to the organization, because the repository is
organization-owned and has a Codespaces budget. A service account is therefore
better than a person's account for quota attribution, though the token is scoped
to one repository either way.

The job checks out the base branch, never the PR head, so a PR cannot supply the
script that reads that token.

### Other Manual Workflows

| Workflow                    | Purpose                                                 |
|-----------------------------|---------------------------------------------------------|
| `util-data-tooling.yml`     | SQLite/PostgreSQL export/import validation (manual)     |
| `util-probe-registry.yml`   | Diagnose slow npm metadata fetches (temporary)          |

---

## Workflow Call Graph

Shows which workflows call which reusable workflows:

```
CALLER                             REUSABLE WORKFLOW
───────────────────────────────────────────────────────────────────────────────

ci-pull-requests.yml
    ├──────────────────────────▶  test-unit-reusable.yml
    ├──────────────────────────▶  test-linting-reusable.yml
    ├──────────────────────────▶  test-e2e-reusable.yml
    └──────────────────────────▶  sec-ci-reusable.yml
                                      └──────────▶  sec-poutine-reusable.yml

ci-master.yml
    ├──────────────────────────▶  test-unit-reusable.yml
    ├──────────────────────────▶  test-linting-reusable.yml
    └──────────────────────────▶  test-single-instance-npm.yml

release-publish.yml
    ├──────────────────────────▶  docker-build-push.yml
    │                                 └──────────▶  security-trivy-scan-callable.yml
    └──────────────────────────▶  sbom-generation-callable.yml

test-workflows-nightly.yml  (manual dispatch only — nightly schedule disabled, DEVP-544)
    └──────────────────────────▶  test-workflows-callable.yml

PR Comment Dispatchers (triggered by /command in PR comments):
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
│  └─ NO release-chromatic.yml (skipped)                                 │
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

### Recovering a failed release

If the pipeline publishes `n8n@X.Y.Z` to npm and then fails, that version is
burned — npm versions are immutable. Recovery depends on how far it got:

| Failure point | Recovery |
|---|---|
| Before `n8n` reached npm | **Re-run failed jobs** on the original run. Sub-packages publish before `n8n` and `pnpm publish -r` skips versions already on npm, so a retry is safe. |
| After `n8n` reached npm | Dispatch **`release-recreate-failed-release.yml`** with `failed-version: X.Y.Z`. |

`release-recreate-failed-release.yml` checks out `release/X.Y.Z`, bumps only the
root and `packages/cli` versions to `X.Y.(Z+1)`, pushes `release/X.Y.(Z+1)` from
the same commit, and opens an auto-merging `release-pr/X.Y.(Z+1)`. Merging it
fires `release-publish.yml` as normal — `release-publish.yml` has no
`workflow_dispatch`, so a release PR is the only way to re-drive it.

Only those two `package.json` files move: the root version drives every publish
output (git tag, Docker tags, GitHub Release, SBOM) and `packages/cli` drives
the runtime `N8N_VERSION`. Every other package keeps its version, so the publish
step skips the ones already on npm and publishes whichever ones the failed run
never reached.

It refuses to run unless `n8n@X.Y.Z` is on npm and `n8n@X.Y.(Z+1)` is not. That
check fails closed: if the registry can't be reached, the run stops rather than
guessing. Dispatch with `force: true` to skip it.

The burned version stays on npm. Deprecate it by hand once the re-release is
out: `npm deprecate n8n@X.Y.Z "Failed release, use X.Y.(Z+1)"`.

### Other Release Workflows

| Workflow                                  | Trigger         | Purpose                                        |
|-------------------------------------------|-----------------|------------------------------------------------|
| `release-standalone-package.yml`           | Manual dispatch | Release individual packages (@n8n/codemirror-lang, @n8n/create-node, etc.) |
| `release-create-patch-pr.yml`              | Manual dispatch | Open a patch release PR for one track          |
| `release-recreate-failed-release.yml`      | Manual dispatch | Re-release a version whose publish failed after it reached npm |

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
├─ unit-test (matrix: Node 22.23.2, 24.18.1)
│   └─ Coverage only on 24.18.1
├─ lint
├─ verify-single-instance-npm (advisory; packages changed by this push)
└─ notify-on-failure (Slack #alerts-build)
```

---

## Scheduled Jobs

| Schedule (UTC)            | Workflow                          | Purpose                  |
|---------------------------|-----------------------------------|--------------------------|
| Hourly :00                | `sec-sync-public-to-private.yml`  | Mirror public → private  |
| Daily 03:00               | `sec-sync-bundle-branches.yml`    | Merge the base into `bundle/*` |
| Daily 00:00               | `docker-build-push.yml`           | Nightly Docker images    |
| Daily 00:00               | `test-db.yml`                     | Database compatibility   |
| Daily 00:00               | `test-e2e-performance-reusable.yml`| Performance E2E         |
| Daily 00:00               | `release-storybook.yml`       | Storybook deploy         |
| Daily 00:00               | `release-chromatic.yml`       | Visual regression        |
| Daily 00:00               | `util-check-docs-urls.yml`        | Doc link validation      |
| Daily 01:30, 02:30, 03:30 | `test-benchmark-nightly.yml`      | Performance benchmarks   |
| Daily 02:00               | `test-get-n8n.yml`                | get.n8n.io installer health |
| Daily 02:00               | `test-e2e-pc-nightly.yml`         | E2E on the `-pc` image   |
| Daily 05:00               | `test-benchmark-destroy-nightly.yml`| Cleanup benchmark env  |
| Daily 06:00               | `util-sync-master-to-3x.yml`      | Replay 3.x onto master (v3) |
| Daily 08:00               | `build-v3-nightly.yml`            | Nightly v3 Docker images |
| Monday 00:00              | `util-update-node-popularity.yml` | Node usage stats         |
| Monday 02:00              | `test-e2e-coverage-weekly.yml`    | Weekly E2E coverage      |
| Saturday 22:00            | `test-evals-ai.yml`               | AI workflow evals        |
| 1st of month 04:00        | `util-refresh-cubic-schema.yml`   | Refresh vendored cubic schema |

---

## v3 development (master + 3.x)

During the v3 release window, `master` carries normal feature work (behind opt-in
flags) and the long-lived `3.x` branch carries breaking changes. `util-sync-master-to-3x.yml`
syncs daily by **replaying the `3.x`-only commits onto `master` and force-pushing `3.x`**, so a
clean sync adds no commit and nothing is squashed. What it pushes is always verified to be
exactly the tree a merge of `3.x` and `master` produces, and marker-free. Conflicts confined
to mechanical, tool-generated files (the pnpm lockfile, bot-maintained data files — see
`MECHANICAL_PATHS` in `sync-master-to-3x.mjs`) are auto-resolved during the replay; the tree
check then applies to every path except those files. On a real code conflict `3.x` is left
untouched and a draft PR carrying the conflict markers (labeled `automation:v3-sync`, with
mechanical files pre-resolved) is opened on `sync/master-to-3x`, naming both ends of the
conflict — the breaking-commit authors and the `master` commits that touched the same files
— via `sync-conflict-owners.mjs`, posting to `#alerts-v3-sync` and pausing further syncs
until it is resolved and merged normally. Delete/modify conflicts have no markers to carry,
so they are resolved toward `3.x` and listed as an explicit decision in the PR body.
`build-v3-nightly.yml` publishes `n8nio/n8n:v3-nightly[-<date>]` images from `3.x`
by calling `docker-build-push.yml` with `ref: 3.x` + `date_tag`. On Mondays it also
retags that run's n8n + runners manifests as a release candidate (by digest on GHCR, so
the RC is exactly what was built), giving a self-consistent set to trial. Any manual run
can promote too via the `force_rc` dispatch input, several times a day: each publish
claims the next free `v3-rc-<date>.N` as its immutable tag and moves the floating `v3-rc`
and `v3-rc-<date>` onto it. The counter is derived by probing the registry, and the job
is serialized on a `v3-rc-tagging` concurrency group so two runs can't claim one number.

See **[`DEVELOPING_V3.md`](./DEVELOPING_V3.md)** for the full model.

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
  node-version:        # default: '24.18.1'
  enable-docker-cache: # default: 'false' (Blacksmith Buildx)
  docker-cache-key:    # required when enable-docker-cache is true
  build-command:       # default: 'pnpm build'
```

The Blacksmith layer cache lives on a sticky disk identified by
`docker-cache-key`, and commits are last-writer-wins. Splitting the key per
image would avoid that, but Blacksmith currently never populates a
newly created sticky disk - it stays at 0 bytes however many runs commit to it,
while the build reports a successful commit. Every job therefore shares the
`n8n-io/n8n` key, which is the only disk that actually retains layers. Revisit
once new-disk retention works.

### docker-registry-login

```yaml
inputs:
  login-ghcr:       # default: 'true'
  login-dockerhub:  # default: 'false'
  login-dhi:        # default: 'false'
```

### External actions

Actions consumed from other n8n-io repositories, SHA-pinned like any third-party
action:

| Action                            | Purpose                                                                       | Used By            |
|-----------------------------------|-------------------------------------------------------------------------------|--------------------|
| `n8n-io/github-actions/cla-check` | CLA signature check: `CLA Check` commit status, in-place PR comment, `cla-signed` label | `ci-cla-check.yml` |

Behaviour changes belong in that repo; bumping the pin here is what picks them up.
A `/cla-check` comment on a PR re-runs the check without a push.

---

## Reusable Workflows

Workflows with `workflow_call` trigger:

| Workflow                           | Inputs                                        | Purpose               |
|------------------------------------|-----------------------------------------------|-----------------------|
| `test-unit-reusable.yml`           | `ref`, `nodeVersion`, `collectCoverage`       | Unit tests            |
| `test-linting-reusable.yml`        | `ref`, `nodeVersion`                          | ESLint                |
| `test-e2e-reusable.yml`            | `branch`, `test-mode`, `shards`, `runner`     | Core E2E executor     |
| `test-workflows-callable.yml`      | `git_ref`, `compare_schemas`                  | Workflow tests        |
| `docker-build-push.yml`            | `n8n_version`, `release_type`, `push_enabled`, `ref`, `date_tag` | Docker build |
| `sec-ci-reusable.yml`              | `ref`                                         | Security orchestrator |
| `sec-poutine-reusable.yml`         | `ref`                                         | Poutine scanner       |
| `security-trivy-scan-callable.yml` | `image_ref`                                   | Trivy scan            |
| `sbom-generation-callable.yml`     | `n8n_version`, `release_tag_ref`              | SBOM generation       |
| `test-single-instance-npm.yml`     | `scope`, `base-ref`, `base-branch`, `blocking`, `timeout-minutes` | Dependency duplication |

---

## Scripts

Scripts in `.github/scripts/`:

### Release Scripts

| Script                        | Purpose                    | Called By               |
|-------------------------------|----------------------------|-------------------------|
| `bump-versions.mjs`           | Calculate next version     | `release-create-pr.yml` |
| `update-changelog.mjs`        | Generate CHANGELOG         | `release-create-pr.yml` |
| `prepare-rerelease.mjs`       | Bump root + cli for a re-release | `release-recreate-failed-release.yml` |
| `trim-fe-packageJson.js`      | Strip frontend devDeps     | `release-publish.yml`   |
| `ensure-provenance-fields.mjs`| Add license/author fields  | `release-publish.yml`   |

### Docker Scripts

| Script                  | Purpose           | Called By              |
|-------------------------|-------------------|------------------------|
| `docker/docker-config.mjs`| Build context   | `docker-build-push.yml`|
| `docker/docker-tags.mjs`  | Image tags      | `docker-build-push.yml`|
| `docker/kafka-native-smoke-check.mjs`| Verify librdkafka binary loads in built image | `docker-build-push.yml`|
| `docker/assert-manifest-format.mjs`| Assert a merged manifest is an OCI image index with the expected platforms | `docker-build-push.yml`|
| `docker/should-smoke-build.mjs`| Narrow the `pnpm-workspace.yaml` smoke trigger to native dependency pins | `docker-build-smoke.yml`|

### Validation Scripts

| Script                  | Purpose           | Called By                 |
|-------------------------|-------------------|---------------------------|
| `validate-docs-links.js`| Check doc URLs    | `util-check-docs-urls.yml`|
| `send-build-stats.mjs`  | Build telemetry   | `setup-nodejs` action     |
| `db-test-matrix.mjs`    | DB test matrix from `postgres-versions.json` | `ci-pull-requests.yml` |
| `quality/check-cubic-config.mjs` | Validate `cubic.yaml` against the vendored cubic schema; enforce its silent agent/character limits. `--refresh` re-pulls the schema | `test-workflow-scripts-reusable.yml`, `util-refresh-cubic-schema.yml` |
| `probe-registry.mjs`    | Registry path throughput probe (temporary) | `util-probe-registry.yml` |

### Preview Scripts

| Script                          | Purpose                                                                 | Called By                      |
|---------------------------------|-------------------------------------------------------------------------|--------------------------------|
| `codespace-preview.mjs`         | Map a `pull_request` event onto a preview operation, comment the result  | `util-codespace-preview.yml`   |
| `../../scripts/preview.mjs`     | One codespace for each PR: `up`, `refresh`, `down`, `ls`. `--json` for CI | `codespace-preview.mjs`, developers |

`scripts/preview.mjs` is also the developer entry point (`pnpm preview up <pr>`).
In `--json` mode it prints one object on stdout and sends all progress to stderr,
so a workflow can read the URL from a run that also streams an in-box build log.

### Branch Replay Scripts

Both keep a long-lived branch that is "base + its own commits" in sync by rebasing those
commits onto the base and force-pushing, sharing the merge-tree content guard that makes the
rewrite safe.

| Script                     | Purpose                                                              | Called By                          |
|----------------------------|----------------------------------------------------------------------|------------------------------------|
| `branch-replay.mjs`        | Shared primitives: merge-tree, tree guard, marker scan               | the two scripts below              |
| `sync-master-to-3x.mjs`    | master → `3.x`, rebased; auto-resolves mechanical files, opens a conflict PR | `util-sync-master-to-3x.yml`       |
| `sync-bundle-branch.mjs`   | base → `bundle/*` in n8n-private, merged; fail-loud, never resolves conflicts | `sec-sync-bundle-branches.yml`   |

### Slack Scripts

See [Slack Notifications](#slack-notifications) for the calling pattern.

| Script                          | Purpose                                                                       |
|---------------------------------|-------------------------------------------------------------------------------|
| `slack/notify.mjs`              | CLI + `sendSlackMessage` export. POSTs `chat.postMessage`, fails on `ok:false`. |
| `slack/build-trivy-blocks.mjs`  | `--blocks trivy` — vulnerability digest                                       |

---

## Telemetry

CI metrics are collected via webhooks to n8n, then stored in BigQuery for analysis.

See **[CI-TELEMETRY.md](CI-TELEMETRY.md)** for:
- Common data points (git, CI context, runner info)
- Existing implementations (build stats, container stack)
- How to add new telemetry
- BigQuery schema patterns and queries

---

## OWNERS

Team ownership lives in the top-level `OWNERS` file (this replaces the
GitHub-native `CODEOWNERS` file; see the transition note below). The scripts
that consume it live in `.github/scripts/owners/`. Line format:

```
<pattern> <@org/team> [required]
```

Patterns are a catch-all (`*`), a directory prefix (`packages/x/`), or an
exact file path. Matching is last-match-wins, so specific rules must come
after general rules.

The format is strict, enforced by `node .github/scripts/owners/owners.mjs --check`:

- Tokens on a line come in a fixed order: pattern, one team, then options
  such as `required`.
- Directory patterns end with `/` and must be existing directories; all other
  patterns must be existing files. Duplicate patterns are rejected.

Team existence is not checked by `--check` (it needs an org read token, which
fork PRs do not have); a separate workflow covers it (DEVP-891).

The file drives four workflows:

| Workflow                          | Purpose                                                                  |
|-----------------------------------|--------------------------------------------------------------------------|
| `ci-owners-validation.yml`        | Validates OWNERS (syntax, dead paths) via `owners.mjs --check` |
| `ci-owners-review-recommendations.yml` | Advisory PR comment: reviewer teams, line stats, required reviews    |
| `ci-owners-assign-reviewers.yml`  | Opt-in reviewer auto-assignment (label-triggered)                        |
| `ci-owners-required-reviews.yml`  | Enforces `required` entries via the "Required Reviews" commit status     |

### Required reviews

An entry with the `required` option makes team approval mandatory: when a PR
changes a file whose winning entry carries `required`, a member of each listed
team must approve the PR. `ci-owners-required-reviews.yml` evaluates this on
PR changes and review events, and reports a commit status
named **Required Reviews** on the head SHA. The ruleset for `master` must list
that status as a required check for the block to take effect. Merge-queue runs
report success on the queue head without re-evaluating: a PR cannot enter the
queue unless the status is green on its head, and the queue does not change
approvals.

The workflow reads OWNERS and its scripts from the base branch only, so a PR
cannot lift its own review requirement.

### Transition from CODEOWNERS

During a trial period, `.github/CODEOWNERS` stays in place next to OWNERS:
GitHub's native code-owner enforcement keeps gating merges while the
"Required Reviews" status runs side by side. The two must agree — CODEOWNERS
holds exactly the `required` entries of OWNERS (plus the OWNERS file itself)
and must not gain new entries; new ownership goes into OWNERS. After the
trial, delete `.github/CODEOWNERS`, remove "Require review from Code Owners"
from the master ruleset, and delete this section (tracked in DEVP-887).

---

## Runner Selection

| Runner                              | vCPU | Use Case                    |
|-------------------------------------|------|-----------------------------|
| `ubuntu-slim`                       | 1    | Gate jobs (required-checks) |
| `ubuntu-latest`                     | 2    | Simple jobs, fork PR E2E    |
| `blacksmith-2vcpu-ubuntu-2204`      | 2    | Standard builds, E2E shards |
| `blacksmith-4vcpu-ubuntu-2204`      | 4    | Unit tests, typecheck, lint |
| `blacksmith-8vcpu-ubuntu-2204`      | 8    | Heavy parallel workloads    |
| `blacksmith-8vcpu-ubuntu-2204-arm`  | 8    | ARM64 Docker builds         |

### Selection Guidelines

**`ubuntu-slim`** - Status check aggregation, gate/required-check jobs, notifications

**`ubuntu-latest`** - Simple build verification, scheduled maintenance, PR comment handlers, release tagging, Docker manifest creation, any job where speed is not critical

**`blacksmith-2vcpu-ubuntu-2204`** - Initial build/install (benefits from Blacksmith caching), database integration tests (I/O bound), Chromatic/Storybook builds

**`blacksmith-4vcpu-ubuntu-2204`** - Unit tests (parallelized), linting (parallel file processing), typechecking (CPU-intensive), E2E test shards

**`blacksmith-8vcpu-ubuntu-2204`** - Heavy parallel workloads

### Runner Provider Toggle

The `RUNNER_PROVIDER` repository variable controls runner selection across workflows:

| Value | Behavior |
|-------|----------|
| (unset) | Use Blacksmith runners (default) |
| `github` | Use GitHub-hosted `ubuntu-latest` |

**Note:** When set to `github`, all jobs use `ubuntu-latest` regardless of any runner inputs or defaults specified in reusable workflows. GitHub runners have fewer vCPUs (2 vs 4), so jobs may run slower.

---

## Security

### Why We Do This

Supply chain security ensures artifacts haven't been tampered with. We provide three types of signed attestations:

```
                    ATTESTATION (signed statement)
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
         ▼                 ▼                 ▼
    PROVENANCE           SBOM              VEX

    "Trust the           "Know the         "Understand
     build"               contents"          the risk"
```

| Attestation | Question It Answers |
|-------------|--------------------------------|
| **Provenance** | "Can we trust this artifact came from n8n's CI and wasn't tampered with?" |
| **SBOM** | "What dependencies are inside?" (license compliance, vulnerability scanning) |
| **VEX** | "The scanner found CVE-X - does it actually affect us or is it a false positive?" |

**How they relate:**
- **SBOM** is the ingredients list - input for both license checks AND security scanning
- **VEX** is the security triage output - "we investigated CVE-X, here's our assessment"
- **Provenance** proves the SBOM and VEX came from our CI, not an attacker

---

### Poutine (Supply Chain)

- **Runs on:** PR changes to `.github/**`
- **Detects:** Exposed secrets, insecure workflow configs
- **Output:** SARIF to GitHub Security tab

### Trivy (Container)

- **Runs on:** stable/nightly/rc Docker builds
- **Scans:** n8n image, runners image
- **Output:** GitHub Actions step summary (`$GITHUB_STEP_SUMMARY`) and run logs

### SBOM

There are two, with different subjects and different consumers. They are not duplicates.

| | Release SBOM | Image SBOM |
|---|---|---|
| **Job** | `generate-and-attach-sbom` (`sbom-generation-callable.yml`) | `sbom-attestation` (`docker-build-push.yml`) |
| **Scans** | the deployed npm closure in `compiled/` (`cdxgen -t pnpm`) | each pushed image, by digest (`syft`) |
| **Covers** | npm only | OS packages **and** npm, as laid down in the image |
| **Signing** | GitHub Attestation API, subject `./package.json` | `cosign attest`, subject = image digest |
| **Output** | `sbom-source.cdx.json`, `THIRD_PARTY_LICENSES.md`, `vex.openvex.json` on the GitHub Release | attestation in the registry beside the image |
| **Consumer** | humans — legal/license compliance; backs `/third-party-licenses` | machines — `cosign verify-attestation`, admission control |

Format is CycloneDX JSON 1.6 for both. Each pipeline pins the schema version, so a
scanner upgrade cannot change the shape of a signed artifact without a visible diff.

The two use different scanners on purpose. The release SBOM runs `cdxgen -t pnpm` over the
resolved pnpm closure with `FETCH_LICENSE=true`, because a lockfile scan has no package files
to read licenses from. The image SBOM runs `syft` over the pushed image, which resolves
licenses from the LICENSE files on disk and so needs no network at all.

The image job used to run `cdxgen -t docker --profile license-compliance`. That profile sets
`FETCH_LICENSE=true` and nothing else, so it made one sequential npm registry call per
component — roughly 3,700 per release, about half the job's runtime. syft resolves the same
licenses locally in a fraction of the time, and catalogues more of the image besides.

A/B any scanner change against the current output before shipping it. The gate only enforces
`pkg:npm/`, so a change can silently degrade PyPI or OS license coverage while CI stays green.
Compare the licenses resolved per component, not just the component counts.

`enrich-sbom.mjs --drop-phantom-npm` removes scan artefacts that would otherwise assert
components the image does not contain: nested test/fixture `package.json` and `exports`
subpaths. It reads the component's source path from either scanner's property name (`SrcFile`
for cdxgen, `syft:location:0:path` for syft) and treats syft's `version: "UNKNOWN"` the same as
a missing version.

Packages whose license cannot be resolved from disk go in
`scripts/licenses/license-overrides.json` with a verified `source` citation — the upstream
LICENSE file, not registry metadata.

### SLSA L3 Provenance

SLSA (Supply-chain Levels for Software Artifacts) Level 3 provides cryptographic proof of build integrity.

| Artifact | Generator | Level |
|----------|-----------|-------|
| Docker images | `slsa-framework/slsa-github-generator` | L3 |
| npm packages | `NPM_CONFIG_PROVENANCE=true` | L3 |

**Docker provenance** uses the SLSA GitHub Generator as a reusable workflow (not an action). This is required for L3 because provenance must be generated in an isolated environment the build can't tamper with.

```yaml
# IMPORTANT: Must use semantic version tags (@vX.Y.Z), NOT commit SHAs.
# The slsa-verifier requires tagged versions to verify authenticity.
uses: slsa-framework/slsa-github-generator/.github/workflows/generator_container_slsa3.yml@v2.1.0
```

**Verify provenance:**
```bash
# Docker
slsa-verifier verify-image ghcr.io/n8n-io/n8n:VERSION \
  --source-uri github.com/n8n-io/n8n

# npm
npm audit signatures n8n@VERSION
```

### VEX (Vulnerability Exploitability eXchange)

VEX documents which CVEs actually affect n8n vs false positives from scanners.

- **File:** `security/vex.openvex.json`
- **Format:** OpenVEX (broad scanner compatibility - Trivy, Docker Scout, etc.)
- **Attached to:** GitHub Release, Docker image attestations
- **Used by:** Trivy scans (via `security/trivy.yaml`)

**VEX Status Types:**
| Status | Meaning |
|--------|---------|
| `not_affected` | CVE doesn't impact n8n (code not reachable, etc.) |
| `affected` | CVE impacts n8n, tracking fix |
| `fixed` | CVE was present, now fixed |
| `under_investigation` | Assessing impact |

**Verify VEX attestation:**
```bash
cosign verify-attestation --type openvex \
  --certificate-identity-regexp '.*github.com/n8n-io/n8n.*' \
  --certificate-oidc-issuer https://token.actions.githubusercontent.com \
  ghcr.io/n8n-io/n8n:VERSION
```

**Adding a CVE statement to security/vex.openvex.json:**
```json
{
  "statements": [
    {
      "vulnerability": { "name": "CVE-2024-XXXXX" },
      "products": [{ "@id": "pkg:github/n8n-io/n8n" }],
      "status": "not_affected",
      "justification": "vulnerable_code_not_in_execute_path",
      "statement": "n8n does not use the affected code path in this dependency"
    }
  ]
}
```

### Public ↔ private sync (bundle branches)

Embargoed security work happens in `n8n-io/n8n-private`. `sec-sync-public-to-private.yml`
runs hourly there (and on `workflow_dispatch` with `force` for conflict recovery),
mirroring public `master` and `1.x` into private with `reset --hard` +
`--force-with-lease` — skipping a branch when private is ahead, ignoring `chore: Bundle`
commits when judging "ahead". A skipped branch, or a hard failure, is reported to
`#alerts-build`: a non-`chore: Bundle` commit on private `master`/`1.x` leaves the mirror
stuck every hour until it is removed or a `force` dispatch overwrites it. Fixes are never
committed to private `master`/`1.x` directly: `ci-restrict-private-merges.yml` requires
PRs into them to come from the long-lived integration
branches `bundle/2.x` and `bundle/1.x` (a `bundle/2.x` merge is
backported to `bundle/1.x` by `util-backport-bundle.yml`). Once a bundle branch is merged
into private `master`/`1.x` as a `chore: Bundle/*` PR, `sec-publish-fix.yml` /
`sec-publish-fix-1x.yml` cherry-pick that commit onto a fresh branch in the public repo and
open the PR there. That PR **must stay a single-parent squash** — the publish step is a bare
`git cherry-pick` of `HEAD`, which aborts on a merge commit. A `chore: Bundle/*` PR whose
*Required Checks* go red holds back every fix batched into it, so `ci-pull-requests.yml`
posts to `#alerts-build` when that gate fails on a PR opened *from* `bundle/2.x` or
`bundle/1.x` (link only, no PR title, since the branch is embargoed).

`sec-sync-bundle-branches.yml` keeps those branches current, daily plus whenever a PR is
merged into one (and on `workflow_dispatch`). It **merges the base into** the bundle branch
via [`scripts/sync-bundle-branch.mjs`](scripts/sync-bundle-branch.mjs) and pushes without
forcing. Every push is verified to carry exactly the tree a merge of the two sides would
produce (`git merge-tree`); a mismatch, or a conflict marker, fails the run instead of pushing.

**`bundle/*` is append-only — never rebase it, never force-push it.** These branches receive
PRs, and rewriting a branch that receives PRs orphans the copies of its commits that the open
PR branches already contain: every such PR's merge base regresses to an old base commit, so
GitHub shows it carrying everyone else's fixes, in the commit list *and* in the diff (which
can then trip required checks like *PR Size Limit*). It compounds — each refresh between
rewrites picks up another duplicate generation of the same fixes and starts conflicting with
itself. To refresh a fix branch, use GitHub's **Update branch** button or
`git merge origin/bundle/2.x`; squash-merging a fix *into* the bundle branch leaves every
sibling PR's merge base untouched, which is why only a rewrite breaks this.

The costs of merging are deliberate and paid for: a merge commit per run, and fixes that have
already been published staying in the branch's log (the old rebase dropped them as empty
commits). Neither reaches anything downstream, because a bundle publishes as one squashed
commit taken from the tree rather than the history — the `chore: Bundle/*` PR's **diff** stays
exactly the pending fixes even when its commit list does not. For a list of what a bundle
actually carries, read the fix PRs merged into the branch since the last cut, not
`base..bundle`. A lower cadence than the base's is fine too: a base push never re-triggered
CI on the fix PRs, so syncing more often bought them nothing.

There is **one job per bundle branch**. A conflict is detected from the merge tree before the
working tree is touched, so the branch is left exactly as it was, that job **fails** (no
green runs hiding a stalled branch) and `#alerts-security` gets a run link — while the other
branch still syncs. Recovery is deliberate: merge the base into the branch locally, resolve,
push, then re-run the workflow — and that resolution then lives in the merge commit instead of
being re-litigated on every later run. The sync never resolves a conflict itself, unlike
`util-sync-master-to-3x.yml`.

See **[`../AGENTS.md`](../AGENTS.md)** ("Security Fix Hygiene") for the naming rules that
keep the vulnerability out of public branch names, commits, and test descriptions.

---

## Slack Notifications

All workflows post via `.github/scripts/slack/notify.mjs` — a direct `fetch` to `chat.postMessage` that exits non-zero on any Slack error. No third-party action; no silent swallowing.

```yaml
notify-on-failure:
  runs-on: ubuntu-latest
  needs: [build]
  if: ${{ always() && contains(needs.*.result, 'failure') }}
  steps:
    - uses: actions/checkout@de0fac2e4500dabe0009e67214ff5f5447ce83dd # v6.0.2
      with:
        sparse-checkout: .github/scripts/slack
        sparse-checkout-cone-mode: false
    - name: Notify Slack
      env:
        SLACK_TOKEN: ${{ secrets.QBOT_SLACK_TOKEN }}
      run: |
        node .github/scripts/slack/notify.mjs \
          --channel '#alerts-build' \
          --text 'Build failed - ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}'
```

If notify is a step inside an existing checked-out job, skip the `checkout` and gate with step-level `if: failure()` instead.

> `if: failure()` at the **step** level of a dedicated notify job is a no-op when a `needs:` dependency fails (the job is skipped before steps evaluate). Always gate the **job** with `if: ${{ always() && contains(needs.*.result, 'failure') }}`.

**Rich payloads (Block Kit):** add `build-<name>-blocks.mjs` whose default export returns a blocks array, then pass `--blocks <name>` plus any workflow-specific args. Builders read repo / run context from `GITHUB_*` runner env vars. Kebab-case flags become camelCase keys for the builder (`--image-ref` → `imageRef`).

| Token                        | Bot            | Channels                                                    |
|------------------------------|----------------|-------------------------------------------------------------|
| `QBOT_SLACK_TOKEN`           | QBot           | Default — engineering / build / security                    |
| `RELEASE_HELPER_SLACK_TOKEN` | Release Helper | `#releases` (C036AELNMV0)                                   |

Adding a new channel requires inviting the bot first; the first run otherwise fails loudly with `not_in_channel`. Private-repo workflows (`sec-publish-fix*.yml`, `sec-sync-public-to-private.yml`, and the bundle-PR alert in `ci-pull-requests.yml`) need `QBOT_SLACK_TOKEN` set in `n8n-io/n8n-private`; the scripts themselves are mirrored by `sec-sync-public-to-private.yml`.

---

## Secrets

### By Category

| Category            | Secrets                                                     |
|---------------------|-------------------------------------------------------------|
| Package Publishing  | `NPM_TOKEN`, `DOCKER_USERNAME`, `DOCKER_PASSWORD`           |
| Notifications       | `QBOT_SLACK_TOKEN`, `RELEASE_HELPER_SLACK_TOKEN`            |
| Code Quality        | `CODECOV_TOKEN`, `CHROMATIC_PROJECT_TOKEN`, `CURRENTS_RECORD_KEY` |
| Error Tracking      | `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_*_PROJECT`       |
| Cloud/CDN           | `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`             |
| GitHub Automation   | `N8N_ASSISTANT_APP_ID`, `N8N_ASSISTANT_PRIVATE_KEY`         |
| Benchmarking        | `BENCHMARK_ARM_*`, `N8N_BENCHMARK_LICENSE_CERT`             |
| AI/Evals            | `EVALS_ANTHROPIC_KEY`, `EVALS_OPENAI_KEY`, `EVALS_OPENROUTER_KEY`, `EVALS_XAI_KEY`, `EVALS_BASETEN_KEY`, `EVALS_FIREWORKS_KEY`, `EVALS_TOGETHER_KEY`, `EVALS_DATABRICKS_KEY`, `EVALS_MODAL_KEY`, `EVALS_LYCEUM_KEY`, `EVALS_AZURE_FOUNDRY_KEY`, `EVALS_VERTEX_KEY`, `EVALS_VERTEX_PROJECT_ID`, `EVALS_VERTEX_LOCATION`, `EVALS_LANGSMITH_*` |

### Scoping

- **`secrets: inherit`** - passes all secrets to reusable workflows
- **Explicit passing** - for minimal exposure
- **Environment: `benchmarking`** - Azure OIDC credentials

---

## Future Vision

### Redundancy Review

Comment trigger (`/test-workflows`) is a workaround.

Long-term: Main CI should be reliable enough to not need these.

### Workflow Testability

- Tools like `act` for local testing
- Unit tests for `.github/scripts/*.mjs`
- Validation with `actionlint`
