# MCP Workflow Evals in CI — Implementation Plan (handoff)

> **Status:** planning complete, implementation not started.
> **Goal:** Run the MCP-built workflow evaluations (`packages/cli/src/modules/mcp/`)
> in GitHub Actions, the way Instance AI evals already run. Today MCP evals are
> **local-only** and recorded in LangSmith by hand. Keep **build/eval
> parallelism** as a first-class concern (crucial for fast CI).
>
> This doc is self-contained so a fresh session can pick it up without prior
> chat context. File references include line numbers valid as of writing —
> re-grep if they drift.

---

## 1. TL;DR

- MCP evals are a **two-phase, manifest-decoupled** pipeline:
  1. **Build** — `eval:build-mcp-manifest` drives `claude -p` against n8n's MCP
     server; Claude builds workflows via `create_workflow_from_code` and the
     script writes `manifest.json` (slug → workflowId[]).
  2. **Eval** — `eval:instance-ai --prebuilt-workflows manifest.json` runs the
     **same** verifier as Instance AI, but fetches the prebuilt workflow by ID
     instead of building it.
- The builder is the **external Claude Code CLI**, not n8n's orchestrator. That
  is the whole difference from Instance AI evals (which build server-side).
- **Hard constraint:** the eval verifier in prebuilt mode is capped to **one
  n8n instance** (`index.ts:111-121` throws on multiple `--base-url`s) because a
  workflow built on one instance only exists in that instance's DB.
- **Chosen approach:** Phase 1 single-instance job → Phase 2 GitHub matrix
  sharding (each shard = self-contained build+eval on its own instance/runner).
  Matrix sharding needs **zero** changes to the eval CLI or build script.

---

## 2. Decisions (locked)

| # | Decision | Choice |
|---|----------|--------|
| 1 | Parallelization | **Phase 1 (single-instance) first, then Phase 2 (matrix sharding).** Not shared-DB multi-lane (Option C) for now. |
| 2 | Trigger | **Manual only** (`workflow_dispatch`) — no per-PR or scheduled runs in the first version (Claude build cost / Anthropic rate limits). `workflow_dispatch` only becomes usable once the workflow is on `master`. (A temporary `push`/`pull_request` smoke trigger was used during the PR to validate the pipeline, then removed — `pull_request` is flagged by Poutine's `untrusted_checkout_exec`, so a branch-scoped `push` is the safe temp trigger if you need to re-validate pre-merge.) |
| 3 | LangSmith | **Wired from the start** — dedicated `--dataset mcp-workflow-evals` + `--baseline-prefix mcp-baseline-` for isolation from the Instance AI dataset/baseline. |
| 4 | Claude↔MCP wiring | **Generate `~/.claude.json` in CI** (keep `build-mcp-manifest.ts` unchanged). Plus `~/.claude/settings.json` for headless MCP trust (see §6). |

**Rejected:** using the official `anthropics/claude-code-action`. It runs **one**
Claude session per step (SDK `query()`) with GitHub-output plumbing; our build
phase is a batch of N independent `(slug × iteration)` sessions aggregated into
a manifest, which `build-mcp-manifest.ts` already does (concurrency, retries,
JSON parsing, stats). The action would force one-job-per-build + a shared
external n8n. Keep it on the shelf only if we ever go one-Claude-session-per-job
with a shared DB. See §8 for the headless knobs we *did* learn from its source.

---

## 3. How Instance AI evals run in CI today (reference model)

Files:
- Trigger: `.github/workflows/ci-instance-ai-evals.yml` — PR open/reopen/ready
  (path-filtered) + `workflow_dispatch`. Calls the reusable workflow.
- Reusable job: `.github/workflows/test-evals-instance-ai.yml`.

Flow on a single Blacksmith runner (`blacksmith-4vcpu-ubuntu-2204`):
1. Checkout → `setup-nodejs` (`build-command: pnpm build`) → `load-n8n-docker`
   (cached `n8nio/n8n:local`, includes the test controller for `/rest/e2e/reset`).
2. `LANE_PORTS: '5678,...,5688'` → boots **11 n8n containers** (one per port),
   each with `instance-ai` enabled + sandbox wired. Waits on `/healthz/readiness`.
3. Seed owner per container via `POST /rest/e2e/reset`.
4. Assert sandbox enabled per lane.
5. `pnpm eval:instance-ai --base-url <11 URLs csv> --concurrency 32 --iterations N`.
6. Post PR comment from `eval-pr-comment.md`; capture+mask container logs;
   teardown; upload artifacts.

**Key parallelism fact:** the build runs *inside* each container (orchestrator +
sandbox). The eval CLI treats each base URL as a **lane** and a work-stealing
allocator (`cli/lane-allocator.ts`) spreads builds across lanes (capped at 4
builds/lane via `MAX_CONCURRENT_BUILDS`, `index.ts:81`). Build + verify for a
case happen on the **same** lane → nothing crosses instances.

Secrets used (reuse for MCP): `EVALS_ANTHROPIC_KEY`, `EVALS_LANGSMITH_API_KEY`,
`EVALS_LANGSMITH_ENDPOINT`, `N8N_LICENSE_ACTIVATION_KEY`, `N8N_LICENSE_CERT`,
`N8N_ENCRYPTION_KEY`.

---

## 4. How MCP evals differ (the two-phase model)

```
+-------------------------+   writes manifest.json   +--------------------------+   reads   +----------------------+
| eval:build-mcp-manifest | -----------------------> | output-dir/manifest.json | --------> | eval:instance-ai     |
| (claude -p drives MCP)  |   slug -> workflowId[]    |                          |           | --prebuilt-workflows |
+-------------------------+                           +--------------------------+           +----------------------+
```

### Build phase — `cli/build-mcp-manifest.ts`
- Spawns `claude -p <prompt> --model <m> --mcp-config <tempfile> --strict-mcp-config --allowedTools mcp__<server> --output-format json` (`runClaude`, ~line 319).
- Reads the MCP server block from `~/.claude.json` and re-stages it to a temp
  file (`stageMcpConfig`, ~line 263). Looks up project-scope under build-cwd /
  repo-root, falls back to **global `mcpServers[<name>]`**.
- Prompt = flattened conversation user-turns + "print `WORKFLOW_ID=<id>`"
  contract (`buildPromptFromConversation` ~line 386). Parsed by `tailWorkflowId`
  (~line 406). Retries up to `--max-attempts` (default 3).
- Concurrency: `-j` (parallel `claude` subprocesses, via `runWithConcurrency`).
  All subprocesses hit the **same single** n8n instance.
- Flags: `-n/--iterations` (builds per slug), `-j/--concurrency`, `--tier`,
  `--output-dir`, `--mcp-server` (default `"n8n-mcp (instance)"`), `--model`
  (default `claude-sonnet-4-6`), `--project-id`, `--workflow-dir`, `--build-cwd`,
  `--append`, `--max-attempts`, `--mcp-timeout-ms`, positional slugs.
- Output: `manifest.json`, `manifest-stats.json` (cost/turns/duration), `logs/`.
- Result-shape Zod schema (`claudeSessionSchema` ~line 303) parses `result`,
  `num_turns`, `total_cost_usd`, `duration_ms`, `subtype` — **matches** the
  Claude SDK/CLI result message exactly (verified against the action source).

### Eval phase — `cli/index.ts` + `harness/prebuilt-workflows.ts`
- `--prebuilt-workflows <path>` loads the manifest; `pickPrebuiltWorkflowId`
  rotates `iteration % ids.length`; `fetchPrebuiltBuild` GETs the workflow by ID
  and shapes it like a fresh build, then runs the normal Phase 1 (mock hints) +
  Phase 2 (LLM-mocked execution) + verify.
- **Single-instance cap:** `index.ts:111-121` throws if `--prebuilt-workflows`
  is combined with >1 `--base-url`. Parallelism in this phase = `--concurrency`
  (scenario executions against the one instance), not lanes.
- `--dataset` / `--baseline-prefix` isolate the LangSmith dataset + regression
  baseline (pass **both** or you get a "partial isolation" warning).

### Existing docs (read these)
- `packages/cli/src/modules/mcp/evaluations/README.md` — MCP quick reference,
  env file example, LangSmith recording, `mcp` tier, cleanup.
- `packages/@n8n/instance-ai/evaluations/README.md` — full framework (flags,
  prebuilt mode, regression detection, CI section).

---

## 5. CI setup requirements (what local runs get for free)

| Need | Local | CI must do |
|------|-------|-----------|
| Enable MCP access | UI toggle | **Enable via API _after_ the reset**, not via env. `PATCH /rest/mcp/settings {mcpAccessEnabled:true}` (owner has `mcp:manage`). ⚠️ The env path (`N8N_MCP_MANAGED_BY_ENV=true` + `N8N_MCP_ACCESS_ENABLED=true`, `mcp-settings.loader.ts:18`) only runs at **startup**, and `/rest/e2e/reset` truncates the `settings` table + clears the cache (`e2e.controller.ts:52,221`) **after** boot — wiping it. Also, the PATCH is refused while `mcpManagedByEnv=true`, so leave that env unset. |
| MCP modules loaded | default | `mcp` + `mcp-registry` are **default modules** (`packages/@n8n/backend-common/src/modules/module-registry.ts:41`). `N8N_ENABLED_MODULES=instance-ai` adds instance-ai for the verifier; defaults (incl. mcp) still load. |
| Builder tools | default true | `N8N_MCP_BUILDER_ENABLED` default `true` (`packages/@n8n/config/src/configs/endpoints.config.ts:162`). |
| MCP API key (JWT) | UI "copy key" | After `/rest/e2e/reset`: login → `GET /rest/mcp/api-key`. **First call on a fresh user returns the UNREDACTED key** (`mcp-api-key.service.ts:123` `getOrCreateApiKey`; controller `mcp.settings.controller.ts:52`). Mask it with `::add-mask::`. |
| Claude↔MCP wiring | hand-edited `~/.claude.json` | Generate it (see §6). Endpoint is `POST /mcp-server/http` (`mcp.controller.ts:110`), Bearer auth. |
| `claude` CLI | installed | `npm i -g @anthropic-ai/claude-code` + `ANTHROPIC_API_KEY` (reuse `EVALS_ANTHROPIC_KEY`). |
| Sandbox | required for orchestrator builds | **NOT needed.** MCP builder is Claude; verification (Phase 1/2) uses the execution engine, not the sandbox. Skip the sandbox service + all sandbox env + the per-lane sandbox assertion. Big simplification vs. Instance AI. |

Two LLM budgets share `EVALS_ANTHROPIC_KEY`:
- Build phase → Claude Code via `ANTHROPIC_API_KEY`.
- Verify phase → `N8N_INSTANCE_AI_MODEL_API_KEY` (set on the container).
- Set `N8N_AI_ASSISTANT_BASE_URL=""` on the container to hit Anthropic directly
  and avoid hosted-proxy per-tenant quota.

---

## 6. Headless Claude recipe (de-risks the main spike)

Learned from `anthropics/claude-code-action` source (`base-action/src/`):
it authenticates with `ANTHROPIC_API_KEY`, pre-authorizes tools via
`--allowedTools`, force-enables MCP trust via a settings file, and uses **no**
`--dangerously-skip-permissions`.

In CI, before the build step, write **two** files:

`~/.claude.json` (the block `build-mcp-manifest.ts` reads + onboarding flag):
```json
{
  "hasCompletedOnboarding": true,
  "mcpServers": {
    "n8n-local": {
      "type": "http",
      "url": "http://localhost:5678/mcp-server/http",
      "headers": { "Authorization": "Bearer <UNREDACTED_MCP_JWT>" }
    }
  }
}
```

`~/.claude/settings.json` (headless MCP trust):
```json
{ "enableAllProjectMcpServers": true }
```

Then run the build with `--mcp-server n8n-local`. The script already passes
`--mcp-config <temp> --strict-mcp-config --allowedTools mcp__n8n-local`, which is
the non-interactive recipe. Validate with a one-slug smoke run before scaling.

---

## 7. Phase 1 — single-instance MCP eval job

New files:
- `.github/workflows/ci-mcp-evals.yml` — trigger
- `.github/workflows/test-evals-mcp.yml` — reusable job

### Trigger (`ci-mcp-evals.yml`)
- `workflow_dispatch` inputs: `branch` (default `master`), `tier` (default
  `mcp`), `iterations` (default `3`, also used as build `-n`),
  `build-concurrency` (claude `-j`, default `3`), `eval-concurrency`
  (default `6`), `model` (default `claude-sonnet-4-6`), `experiment-name`
  (default `''`; set `mcp-baseline` to refresh the baseline).
- `schedule`: nightly cron (e.g. `0 3 * * *`).
- `concurrency: group: mcp-evals-${{ github.ref }}`, `cancel-in-progress: true`.

### Reusable job (`test-evals-mcp.yml`) — step sequence
1. Checkout + `setup-nodejs` (`build-command: pnpm build`) + `load-n8n-docker`.
2. Install Claude CLI: `npm i -g @anthropic-ai/claude-code`.
3. Boot **one** container (`-p 5678:5678`) with:
   ```
   E2E_TESTS=true
   N8N_ENABLED_MODULES=instance-ai
   N8N_AI_ENABLED=true
   N8N_INSTANCE_AI_MODEL_API_KEY=$EVALS_ANTHROPIC_KEY
   N8N_AI_ASSISTANT_BASE_URL=""
   N8N_LICENSE_ACTIVATION_KEY / N8N_LICENSE_CERT / N8N_ENCRYPTION_KEY
   ```
   Wait on `/healthz/readiness`. No sandbox. **Do NOT enable MCP via env** —
   the reset wipes it (see §5); enable via API in step 5.
4. Seed owner: `POST /rest/e2e/reset` (reuse the Instance AI payload:
   owner `nathan@n8n.io` / `PlaywrightTest123`).
5. Login → **enable MCP** (`PATCH /rest/mcp/settings {mcpAccessEnabled:true}`,
   post-reset) → fetch + mask MCP API key (`GET /rest/mcp/api-key`,
   `::add-mask::` the JWT).
6. Generate `~/.claude.json` + `~/.claude/settings.json` (see §6).
7. Build phase:
   ```
   ANTHROPIC_API_KEY=$EVALS_ANTHROPIC_KEY \
   pnpm --filter @n8n/instance-ai run eval:build-mcp-manifest \
     --tier mcp -n $ITERATIONS -j $BUILD_CONCURRENCY \
     --mcp-server n8n-local --model $MODEL \
     --output-dir /tmp/mcp-cohort
   ```
8. Eval phase (LangSmith on):
   ```
   pnpm --filter @n8n/instance-ai run eval:instance-ai \
     --base-url http://localhost:5678 \
     --tier mcp --prebuilt-workflows /tmp/mcp-cohort/manifest.json \
     --iterations $ITERATIONS --concurrency $EVAL_CONCURRENCY \
     --dataset mcp-workflow-evals --baseline-prefix mcp-baseline- \
     [--experiment-name $EXPERIMENT_NAME]
   ```
   Env: `N8N_INSTANCE_AI_MODEL_API_KEY`, `LANGSMITH_TRACING=true`,
   `LANGSMITH_ENDPOINT`/`LANGSMITH_API_KEY` (`EVALS_LANGSMITH_*`),
   `LANGSMITH_REVISION_ID=$GITHUB_SHA`, `LANGSMITH_BRANCH`.
9. Report: dispatch/schedule have **no PR**, so write `eval-pr-comment.md` to
   `$GITHUB_STEP_SUMMARY` (instead of a PR comment). Upload artifacts:
   `eval-results.json`, `eval-pr-comment.md`, `manifest.json`,
   `manifest-stats.json`, `.data/workflow-eval-report.html`, build `logs/`.
10. Capture+mask container logs (copy the masking pattern from
    `test-evals-instance-ai.yml`); teardown.

**First run must create the baseline:** dispatch once with
`experiment-name=mcp-baseline iterations=10`. Comparison is auto-skipped on the
baseline-creation run; later runs compare against `mcp-baseline-*`. The
`mcp-workflow-evals` dataset is created on first sync.

**Phase 1 needs zero TS changes** — the build script and eval CLI already
support single-instance/single-URL exactly as called here.

### Phase 1 TODO
- [x] `test-evals-mcp.yml` reusable job (boot 1 container → MCP enable → API key
      + Claude config → build → eval → summary → log capture → teardown →
      artifacts). Added a `filter` input (single-case smoke / debugging).
- [x] `ci-mcp-evals.yml` trigger — `workflow_dispatch` only (no `schedule`). The
      temporary smoke trigger has been **removed** (final state is dispatch-only).
- [x] Document the new workflow in `.github/WORKFLOWS.md` (explanatory note;
      no scheduled-jobs row since there's no schedule).
- [x] Validate workflows with `actionlint` (exit 0).
- [x] **Spike validated (smoke run green):** container boots (instance-ai, no
      sandbox), MCP enabled via API after reset, key mint works, Claude builds
      headless and emits `WORKFLOW_ID` (no trust/permission prompt), prebuilt eval
      scores it. `contact-form-automation` scored 60% at N=1 (2/5 fail on
      error-handling scenarios — expected builder variance, see §9).
- [x] **Validated:** `/rest/mcp/api-key` returns an unredacted JWT on the
      freshly-seeded owner.
- [ ] **Post-merge follow-up:** confirm the full `mcp` tier (23 cases) builds +
      evals end-to-end on one instance within `timeout-minutes: 120` (only a
      single case was run during the smoke).
- [ ] **Post-merge follow-up (not a gate):** create the initial `mcp-baseline`
      (dispatch on master with `experiment-name=mcp-baseline iterations=10`).
      Regression comparison is best-effort and auto-skipped until this exists.
- [ ] **Tune after first full run:** `build-concurrency` / `eval-concurrency` /
      timeout for the 4vcpu runner (current defaults 3 / 6 / 120m).

### Phase 1 — implementation notes (what landed)
- Files: `.github/workflows/test-evals-mcp.yml` (reusable),
  `.github/workflows/ci-mcp-evals.yml` (trigger).
- One container `n8n-eval-mcp` on port 5678, env: `E2E_TESTS=true`,
  `N8N_ENABLED_MODULES=instance-ai`, `N8N_AI_ENABLED=true`,
  `N8N_INSTANCE_AI_MODEL_API_KEY`, `N8N_AI_ASSISTANT_BASE_URL=""`, license +
  encryption secrets. **No sandbox.**
- **MCP enabled via API after reset, not env** (gotcha found in the first smoke
  run): `/rest/e2e/reset` truncates `settings` + clears cache, wiping any
  startup env-enable, so the step `Enable MCP, mint API key, write Claude config`
  does `PATCH /rest/mcp/settings {mcpAccessEnabled:true}` before building.
  Symptom when wrong: `claude` sessions return `subtype:success` with **no
  `WORKFLOW_ID`** (MCP server 403s → Claude has no tools).
- Login uses the default seeded owner (`nathan@n8n.io` / `PlaywrightTest123`) —
  the eval CLI defaults to these (`clients/n8n-client.ts:136`), so `--email` /
  `--password` are not passed.
- Cohort/output paths (under `packages/@n8n/instance-ai/`, working-directory of
  both build + eval steps): manifest at `eval-mcp-cohort/manifest.json`, eval
  outputs at `eval-results.json` / `eval-pr-comment.md` / `.data/…html`.
- Report: `eval-pr-comment.md` is written to `$GITHUB_STEP_SUMMARY` (no PR to
  comment on). Artifacts: results json, pr-comment md, html report, manifest,
  manifest-stats, build `logs/`.
- Eval step is `continue-on-error: true`; summary/log-capture/teardown/upload all
  `if: always()`.

### How to run / smoke-test

**`workflow_dispatch` only works once the workflow is on `master`** (GitHub
limitation). To smoke-test a NEW/changed version **before** it's on master, add a
**temporary branch-scoped `push` trigger** (not `pull_request` — that's flagged by
Poutine's `untrusted_checkout_exec` because a fork could run code with secrets):

```yaml
on:
  push:
    branches: [<your-branch>]   # TEMPORARY — remove before merge
  workflow_dispatch: { ... }
```

Force cheap smoke values for the push event via `with:` (e.g.
`filter: ${{ inputs.filter || (github.event_name == 'push' && 'contact-form-automation' || '') }}`),
then remove the `push:` trigger + those fallbacks before merge.

After the workflow is on `master`, dispatch any branch's version:

```bash
# Single-case smoke on a feature branch (pass BOTH --ref and -f branch=):
gh workflow run ci-mcp-evals.yml --ref <branch> \
  -f branch=<branch> -f filter=contact-form-automation \
  -f iterations=1 -f build-concurrency=1 -f eval-concurrency=2

# Full mcp tier:
gh workflow run ci-mcp-evals.yml --ref <branch> -f branch=<branch>

# Refresh the LangSmith baseline (run once on master at the pinned version):
gh workflow run ci-mcp-evals.yml --ref master -f experiment-name=mcp-baseline -f iterations=10

# Watch:
gh run list --workflow=ci-mcp-evals.yml -L 5
gh run watch <run-id> --exit-status
```

⚠️ The dispatch input `branch` defaults to `master`, so always pass **both**
`--ref <branch>` and `-f branch=<branch>` or the job checks out master's code.

---

## 8. Phase 2 — matrix parallelism

```
plan-shards (split mcp tier into M slug groups)
   -> shard 1 [boot+build+eval its slice]  -\
   -> shard 2 [boot+build+eval its slice]   -> merge (combine results -> summary)
   -> shard M [boot+build+eval its slice]  -/
```

- A `plan-shards` job emits a JSON matrix of slug groups (derive from the `mcp`
  tier file list).
- Each matrix job runs the **entire Phase 1 pipeline** for its slice — boot one
  container, build its slugs (positional args to `build-mcp-manifest`), eval its
  slugs (`--filter <slugs>`). **Self-contained**, so the single-instance guard
  (`index.ts:117`) is never violated. Uploads partial `eval-results.json`.
- A **merge job** downloads every shard's `eval-results.json`, concatenates
  `testCases`, recomputes the headline (`passAtK`/`passHatK`/`passRatePerIter`),
  renders one combined `$GITHUB_STEP_SUMMARY`. The JSON shape is stable
  (`index.ts:1145` `writeEvalResults`, the `report` object).

**Key Phase 2 design decision — LangSmith unification:** `evaluate()` creates a
distinct experiment per shard (one per `evaluate()` call). Options:
- (a) **Recommended v1:** each shard records its own `mcp-…` experiment; the
  merged summary + any regression is computed **locally** in the merge job from
  per-shard JSON. Regression is best-effort anyway and the baseline may not exist
  yet. Simplest.
- (b) Post-process shards into one combined LangSmith experiment (more work).

New code for Phase 2: just a small `eval:merge-results` script (read N JSONs →
combined summary + markdown). **No** changes to the build script or eval CLI.

### Phase 2 TODO
- [ ] `plan-shards` job: emit matrix of slug groups from the `mcp` tier.
- [ ] Parameterize `test-evals-mcp.yml` to accept a slug list (build positionals
      + eval `--filter`).
- [ ] `eval:merge-results` script: combine partial `eval-results.json` →
      headline + `$GITHUB_STEP_SUMMARY`.
- [ ] Decide LangSmith strategy (start with per-shard experiments, option a).
- [ ] Tune shard count vs. per-shard concurrency for cost/throughput.

---

## 9. Risks / open questions

1. **Headless Claude in CI (highest):** confirm `claude -p` runs
   non-interactively with the §6 files — no onboarding/trust/permission prompt.
   Mitigation in §6; validate with the one-slug spike before scaling.
2. **Cost & rate limits:** full `mcp` tier × iterations of Claude builds + verify
   LLM calls, both on `EVALS_ANTHROPIC_KEY`. `mcp` tier + nightly cadence bound
   it. `manifest-stats.json` reports build cost.
3. **Build preconditions:** some cases need in-session setup (data tables;
   MCP-registry nodes). A build failure is itself signal. The eval seeds the MCP
   registry automatically (`index.ts:153` `seedMcpRegistry`). See the MCP README
   "Build preconditions" / "Cleanup" sections. Consider a throwaway
   `--project-id` for clean teardown of side artifacts.
4. **Secret hygiene:** the MCP JWT is fetched at runtime — `::add-mask::` before
   any logging step; reuse the masking block from `test-evals-instance-ai.yml`.
5. **LangSmith baseline bootstrap:** until `mcp-baseline-*` exists, comparison is
   skipped (not an error). Create it explicitly (§7).

---

## 10. Key file reference index

Instance AI CI (model to copy):
- `.github/workflows/ci-instance-ai-evals.yml`
- `.github/workflows/test-evals-instance-ai.yml`

Eval CLI:
- `packages/@n8n/instance-ai/evaluations/cli/index.ts`
  - `:81` `MAX_CONCURRENT_BUILDS = 4`
  - `:111-121` single-base-url guard for `--prebuilt-workflows`
  - `:399-427` prebuilt fetch in `getOrBuild`
  - `:1128-1224` `writeEvalResults` (the `eval-results.json` shape)
- `packages/@n8n/instance-ai/evaluations/cli/build-mcp-manifest.ts` (build phase)
- `packages/@n8n/instance-ai/evaluations/cli/lane-allocator.ts`
- `packages/@n8n/instance-ai/evaluations/cli/lanes.ts`
- `packages/@n8n/instance-ai/evaluations/harness/prebuilt-workflows.ts`

MCP module:
- `packages/cli/src/modules/mcp/mcp.controller.ts:110` — `POST /mcp-server/http`
- `packages/cli/src/modules/mcp/mcp-api-key.service.ts:123` — `getOrCreateApiKey`
- `packages/cli/src/modules/mcp/mcp.settings.controller.ts:52` — `GET /rest/mcp/api-key`
- `packages/cli/src/instance-settings-loader/loaders/mcp-settings.loader.ts:18`
- `packages/@n8n/config/src/configs/instance-settings-loader.config.ts:117` — `N8N_MCP_MANAGED_BY_ENV`, `N8N_MCP_ACCESS_ENABLED`
- `packages/@n8n/config/src/configs/endpoints.config.ts:162` — `N8N_MCP_BUILDER_ENABLED`
- `packages/@n8n/backend-common/src/modules/module-registry.ts:41` — default modules

Docs:
- `packages/cli/src/modules/mcp/evaluations/README.md`
- `packages/@n8n/instance-ai/evaluations/README.md`

Headless Claude reference (external):
- `github.com/anthropics/claude-code-action` → `base-action/src/run-claude-sdk.ts`,
  `setup-claude-code-settings.ts`, `parse-sdk-options.ts`, `validate-env.ts`.

---

## 11. Commands cheat-sheet (local repro)

```bash
# Build a cohort (mcp tier), then eval it — mirrors the CI two phases.
dotenvx run -f .env.mcp-evals -- pnpm --filter @n8n/instance-ai run eval:build-mcp-manifest \
  --tier mcp -n 3 -j 3 --output-dir /tmp/n8n-mcp-cohort --mcp-server n8n-local

dotenvx run -f .env.mcp-evals -- pnpm --filter @n8n/instance-ai run eval:instance-ai \
  --base-url http://localhost:5678 --tier mcp \
  --prebuilt-workflows /tmp/n8n-mcp-cohort/manifest.json \
  --iterations 3 --concurrency 3 \
  --dataset mcp-workflow-evals --baseline-prefix mcp-baseline- \
  --output-dir /tmp/n8n-mcp-cohort-eval
```

`.env.mcp-evals` essentials: `N8N_ENABLED_MODULES=instance-ai`,
`N8N_AI_ENABLED=true`, `N8N_INSTANCE_AI_MODEL=anthropic/claude-sonnet-4-5-…`,
`N8N_INSTANCE_AI_MODEL_API_KEY=sk-ant-…`, `N8N_EVAL_EMAIL`, `N8N_EVAL_PASSWORD`,
optional `CONTEXT7_API_KEY`, optional `LANGSMITH_API_KEY`.
