# Worker Drain State and Documentation Fix

## TL;DR
> **Summary**: Both reported issues are valid. Fix worker drain state so a failed queue pause never makes the worker report draining, and correct the Kubernetes preStop documentation so it calls a reachable main n8n REST endpoint instead of worker-local localhost.
> **Deliverables**:
> - Regression-tested `WorkerDrainService.enterDrain()` failure behavior.
> - Updated worker drain documentation with correct orchestration endpoint target and local alternatives.
> - Targeted tests/typecheck evidence.
> **Effort**: Quick
> **Parallel**: YES - 1 implementation wave + final verification wave
> **Critical Path**: Task 1 → targeted package verification → final review agents

## Context
### Original Request
- Validate and fix the issue in `packages/cli/src/scaling/worker-drain.service.ts` where `enterDrain()` sets `this.draining = true` before `pauseLocalQueue()` without rollback on failure.
- Validate and fix the issue in `docs/worker-drain.md` where the Kubernetes preStop example calls `http://127.0.0.1:5678/orchestration/worker/${N8N_WORKER_ID}/drain` from a worker pod even though the route is not mounted on the worker server.

### Interview Summary
- Both issues were validated against code.
- User selected **tests-after** as the test strategy.
- Prometheus is planning only; implementation must be performed by `/start-work`.

### Metis Review (gaps addressed)
- Confirmed this is a bounded bugfix/docs-fix.
- Guardrail: do **not** add a worker-local orchestration endpoint to make the existing docs work.
- Guardrail: do **not** redesign the drain lifecycle/state machine beyond the minimal consistency/concurrency guard needed for `enterDrain()`.
- Guardrail: use the actual REST base path. `ControllerRegistry` mounts regular `@RestController` routes under `/${globalConfig.endpoints.rest}/${metadata.basePath}` at `packages/cli/src/controller.registry.ts:50-58`; default public path is `/rest/orchestration/worker/:workerId/drain`, not bare `/orchestration/...`.
- Edge case addressed: concurrent `enterDrain()` calls while queue pause is pending must not call `pauseLocalQueue()` twice or allow callers to receive false success on a failed pause.
- Edge case addressed: if `pauseLocalQueue()` partially succeeds then rejects, the service must keep `draining=false` and propagate the failure; do not attempt automatic resume unless existing Bull semantics prove a partial pause needs it.

## Work Objectives
### Core Objective
Ensure worker drain state reflects actual local queue intake state, and ensure docs tell Kubernetes users to call the drain route on the main n8n REST API rather than on a worker-local server.

### Deliverables
- Code change in `packages/cli/src/scaling/worker-drain.service.ts`.
- Unit tests in `packages/cli/src/scaling/__tests__/worker-drain.service.test.ts`.
- Documentation change in `docs/worker-drain.md`.
- Optional route/mounting guard tests only if the executor finds existing assertions insufficient after inspection.

### Definition of Done (verifiable conditions with commands)
- From `packages/cli`: `pnpm test:unit -- src/scaling/__tests__/worker-drain.service.test.ts` passes.
- From `packages/cli`: `pnpm typecheck` passes.
- From repo root: `grep -n "127.0.0.1:5678/orchestration/worker" docs/worker-drain.md` returns no matches.
- From repo root: `grep -n "/rest/orchestration/worker" docs/worker-drain.md` returns the corrected preStop example or explanatory text.

### Must Have
- `enterDrain()` must reject if `pauseLocalQueue()` rejects.
- After a rejected `pauseLocalQueue()`, `service.isDraining()` must remain `false`.
- After a rejected `pauseLocalQueue()`, `watchForActiveJobsToFinish()` must not start polling; verify by asserting `scalingService.getRunningJobsCount` is not called.
- Repeated `enterDrain()` after successful drain remains idempotent and does not pause twice.
- Concurrent `enterDrain()` calls while pause is pending share the same in-flight pause and call `pauseLocalQueue()` once.
- Worker readiness remains unchanged except for the corrected state: `packages/cli/src/scaling/worker-server.ts:146-149` should report `draining` only when `WorkerDrainService.isDraining()` is true.
- Docs must state the orchestration endpoint is served by the main n8n REST API and must be reachable from the worker pod.

### Must NOT Have (guardrails, AI slop patterns, scope boundaries)
- Do not add any route to `WorkerServer`.
- Do not change `ScalingService.pauseLocalQueue()` / `resumeLocalQueue()` semantics.
- Do not change license/scope enforcement for `OrchestrationController.drainWorker()`.
- Do not introduce `any`; follow n8n TypeScript guidelines.
- Do not add broad Kubernetes deployment guidance beyond this drain endpoint correction and immediate alternatives.
- Do not rename or reword security-sensitive artifacts as vulnerability language; this is functional drain-state consistency.

## Verification Strategy
> ZERO HUMAN INTERVENTION - all verification is agent-executed.
- Test decision: tests-after + Jest unit tests in `packages/cli`.
- QA policy: Every task has agent-executed scenarios.
- Evidence: `.sisyphus/evidence/task-{N}-{slug}.{ext}`.

## Execution Strategy
### Parallel Execution Waves
> Target: small bounded fix; two implementation tasks can run in parallel because code and docs touch independent files.

Wave 1:
- Task 1 `[quick]`: Fix `WorkerDrainService.enterDrain()` state consistency and regression tests.
- Task 2 `[writing]`: Correct worker drain docs endpoint guidance and verify route facts.

Wave 2:
- Task 3 `[quick]`: Run targeted verification and add optional route/mounting guard tests only if Task 2 found an untested route assumption that can be cheaply locked down.

### Dependency Matrix (full, all tasks)
| Task | Depends On | Blocks |
|---|---|---|
| 1. Worker drain state consistency | None | 3 |
| 2. Worker drain docs correction | None | 3 |
| 3. Targeted verification and optional guard tests | 1, 2 | Final Verification Wave |

### Agent Dispatch Summary (wave → task count → categories)
| Wave | Count | Categories |
|---|---:|---|
| 1 | 2 | quick, writing |
| 2 | 1 | quick |
| Final | 4 | oracle, unspecified-high, unspecified-high, deep |

## TODOs
> Implementation + Test = ONE task. Never separate.
> EVERY task MUST have: Agent Profile + Parallelization + QA Scenarios.

- [x] 1. Worker drain state consistency

  **What to do**:
  1. Edit `packages/cli/src/scaling/worker-drain.service.ts`.
  2. Add a private in-flight drain guard, e.g. `private enterDrainPromise?: Promise<void>;`, to preserve concurrency/idempotency while avoiding premature `draining=true`.
  3. Implement `enterDrain()` semantics exactly:
     - `this.assertWorker();`
     - If `this.draining` is true, return resolved/no-op.
     - If an enter-drain promise exists, return that promise.
     - Log `[Worker] Drain signal received. Stopping new job intake.` once per new drain attempt.
     - Create/store an async promise that awaits `this.scalingService.pauseLocalQueue()` first.
     - Only after pause resolves, set `this.draining = true` and start `void this.watchForActiveJobsToFinish()`.
     - In `finally`, clear the in-flight promise.
     - If pause rejects, propagate the rejection and leave `this.draining = false`.
  4. Keep `exitDrain()` behavior unchanged unless TypeScript requires referencing the new property; do not make `exitDrain()` resume an unpaused queue.
  5. Update `packages/cli/src/scaling/__tests__/worker-drain.service.test.ts` with tests-after regression coverage:
     - `pauseLocalQueue` rejection rejects `enterDrain()` and leaves `isDraining()` false.
     - Rejection does not start active-job polling: `expect(scalingService.getRunningJobsCount).not.toHaveBeenCalled()`.
     - Concurrent `enterDrain()` calls while the first pause is pending call `pauseLocalQueue()` once and both resolve/reject consistently.
     - Existing idempotency test after successful drain still passes.

  **Must NOT do**:
  - Do not set `this.draining = true` before `pauseLocalQueue()` resolves.
  - Do not swallow `pauseLocalQueue()` errors.
  - Do not add retries or queue resume compensation unless existing Bull API evidence proves it is required.
  - Do not alter `waitForActiveJobsToFinish()` or readiness endpoint behavior.

  **Recommended Agent Profile**:
  - Category: `quick` - Reason: small, localized TypeScript bugfix and tests in one package.
  - Skills: [] - no specialized n8n skill required; follow `AGENTS.md` TypeScript/testing rules.
  - Omitted: [`n8n:protect-endpoints`] - no endpoint code is being added or changed.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: [3] | Blocked By: []

  **References** (executor has NO interview context - be exhaustive):
  - Root cause: `packages/cli/src/scaling/worker-drain.service.ts:37-47` - current `enterDrain()` sets `draining=true` before pausing local queue.
  - State reader: `packages/cli/src/scaling/worker-drain.service.ts:23-25` - readiness ultimately reads this via `isDraining()`.
  - Queue API: `packages/cli/src/scaling/scaling.service.ts:169-176` - local pause/resume implementation.
  - Readiness behavior: `packages/cli/src/scaling/worker-server.ts:146-149` - `draining` response depends only on `isDraining()`.
  - Existing tests: `packages/cli/src/scaling/__tests__/worker-drain.service.test.ts:42-76` - `enterDrain()` tests.
  - Existing idempotency: `packages/cli/src/scaling/__tests__/worker-drain.service.test.ts:63-68`.
  - Existing mock defaults: `packages/cli/src/scaling/__tests__/worker-drain.service.test.ts:13-20`.

  **Acceptance Criteria** (agent-executable only):
  - [ ] `pnpm test:unit -- src/scaling/__tests__/worker-drain.service.test.ts` passes from `packages/cli`.
  - [ ] A test proves `pauseLocalQueue.mockRejectedValueOnce(error)` causes `await expect(service.enterDrain()).rejects.toThrow(error)` and `expect(service.isDraining()).toBe(false)`.
  - [ ] A test proves `scalingService.getRunningJobsCount` is not called when pause rejects.
  - [ ] A test proves two concurrent `service.enterDrain()` calls during a pending pause call `pauseLocalQueue` exactly once.
  - [ ] Existing tests for successful drain, idempotency, resume, and non-worker assertion still pass.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Successful drain remains idempotent
    Tool: Bash
    Steps: pushd packages/cli >/dev/null; pnpm test:unit -- src/scaling/__tests__/worker-drain.service.test.ts --runInBand; popd >/dev/null
    Expected: Jest exits 0; existing idempotency test confirms pauseLocalQueue called once across two successful enterDrain() calls.
    Evidence: .sisyphus/evidence/task-1-worker-drain-state-success.log

  Scenario: Pause failure does not report draining
    Tool: Bash
    Steps: pushd packages/cli >/dev/null; pnpm test:unit -- src/scaling/__tests__/worker-drain.service.test.ts --runInBand; popd >/dev/null
    Expected: Jest exits 0; new regression test confirms rejected pause leaves isDraining() false and no active-job polling occurs.
    Evidence: .sisyphus/evidence/task-1-worker-drain-state-failure.log
  ```

  **Commit**: NO | Message: `fix(cli): keep worker drain state consistent` | Files: [`packages/cli/src/scaling/worker-drain.service.ts`, `packages/cli/src/scaling/__tests__/worker-drain.service.test.ts`]

- [x] 2. Worker drain docs correction

  **What to do**:
  1. Edit `docs/worker-drain.md` only.
  2. Replace the Kubernetes preStop example URL that currently targets `http://127.0.0.1:5678/orchestration/worker/${N8N_WORKER_ID}/drain`.
  3. Document that the drain API is exposed by the main n8n REST API, not the worker server.
  4. Use a variable-based example that avoids hardcoding localhost and includes the REST base path, e.g.:
     - `${N8N_MAIN_URL}` for the main n8n URL reachable from the worker pod.
     - `${N8N_REST_ENDPOINT:-rest}` for the REST base path.
     - Final URL shape: `${N8N_MAIN_URL}/${N8N_REST_ENDPOINT:-rest}/orchestration/worker/${N8N_WORKER_ID}/drain`.
  5. Keep the `Authorization: Bearer ${N8N_API_TOKEN}` header in the example unless implementation evidence shows another supported auth method is required.
  6. Add one short explanatory note below the example: if the worker pod cannot reach the main n8n REST API during `preStop`, use `N8N_WORKER_DRAIN_ON_SIGTERM=true` or the legacy local `SIGUSR2` preStop fallback documented below.
  7. Ensure “How it works” step 2 says the hook calls the main n8n REST API, which publishes the targeted drain request to the worker.

  **Must NOT do**:
  - Do not claim the worker-local health server serves `/rest/orchestration/...`.
  - Do not remove the existing legacy SIGUSR2 example.
  - Do not change the required scope or license statements unless implementation code changes prove they are wrong.
  - Do not add broad Kubernetes manifests, Helm chart changes, or deployment restructuring.

  **Recommended Agent Profile**:
  - Category: `writing` - Reason: documentation-only correction grounded in code references.
  - Skills: [] - no specialized content-design needed; this is technical docs correction.
  - Omitted: [`n8n:content-design`] - no product UI copy or i18n strings.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: [3] | Blocked By: []

  **References** (executor has NO interview context - be exhaustive):
  - Incorrect docs: `docs/worker-drain.md:17-32` - preStop example currently calls worker-local localhost without `/rest`.
  - Main controller route: `packages/cli/src/controllers/orchestration.controller.ts:8,27-38` - `@RestController('/orchestration')` + `@Post('/worker/:workerId/drain')`.
  - REST mounting: `packages/cli/src/controller.registry.ts:50-58` - non-root RestControllers mount under `/${globalConfig.endpoints.rest}/${metadata.basePath}`.
  - Main server imports controller: `packages/cli/src/server.ts:44`.
  - Worker server mounted endpoints: `packages/cli/src/scaling/worker-server.ts:111-143` - only health, overwrites, metrics.
  - Readiness docs tie-in: `docs/worker-drain.md:75-83` - readiness status during drain.

  **Acceptance Criteria** (agent-executable only):
  - [ ] `docs/worker-drain.md` no longer contains `127.0.0.1:5678/orchestration/worker`.
  - [ ] `docs/worker-drain.md` contains `/rest/orchestration/worker/${N8N_WORKER_ID}/drain` or `${N8N_REST_ENDPOINT:-rest}/orchestration/worker/${N8N_WORKER_ID}/drain`.
  - [ ] `docs/worker-drain.md` explicitly states the endpoint must be called on a main n8n REST API URL reachable from the worker pod.
  - [ ] `docs/worker-drain.md` keeps required scope `workersView:manage` and Worker View license note.
  - [ ] `docs/worker-drain.md` preserves local fallback guidance for `N8N_WORKER_DRAIN_ON_SIGTERM=true` and legacy `SIGUSR2`.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Correct main REST endpoint documented
    Tool: Bash
    Steps: grep -n "/rest/orchestration/worker\|N8N_REST_ENDPOINT" docs/worker-drain.md
    Expected: Command exits 0 and shows the corrected main REST URL example.
    Evidence: .sisyphus/evidence/task-2-worker-drain-docs-success.log

  Scenario: Worker-local broken endpoint removed
    Tool: Bash
    Steps: if grep -n "127.0.0.1:5678/orchestration/worker" docs/worker-drain.md; then exit 1; fi
    Expected: Command exits 0 because the broken worker-local orchestration URL is absent.
    Evidence: .sisyphus/evidence/task-2-worker-drain-docs-error.log
  ```

  **Commit**: NO | Message: `docs(cli): correct worker drain endpoint example` | Files: [`docs/worker-drain.md`]

- [x] 3. Targeted verification and optional route guard tests

  **What to do**:
  1. Run the targeted worker drain unit tests after Task 1.
  2. Run `pnpm typecheck` from `packages/cli`.
  3. Verify docs grep checks from Task 2.
  4. Inspect whether existing tests already prove the docs route assumptions:
     - `packages/cli/src/controllers/__tests__/orchestration.controller.test.ts:50-67` proves auth/scope metadata for controller method.
     - `packages/cli/src/scaling/__tests__/worker-server.test.ts:170-186` proves worker server mounts selected endpoints and no posts when overwrites disabled, but does not explicitly assert no orchestration route.
  5. Add optional cheap guard tests only if they can be expressed without brittle internals:
     - In `worker-server.test.ts`, assert `app.post` is not called with a path matching `/orchestration/worker` during worker server init.
     - In `orchestration.controller.test.ts`, assert route metadata path/base if existing metadata APIs expose it stably.
  6. Do not add optional tests if they require unstable internal decorator assumptions; record skipped rationale in evidence.

  **Must NOT do**:
  - Do not add integration/e2e tests for this quick bugfix unless targeted unit tests cannot verify behavior.
  - Do not run full repo `pnpm test` or full repo `pnpm build` unless targeted verification exposes cross-package type changes.
  - Do not use `--updateSnapshot` or modify unrelated snapshots.

  **Recommended Agent Profile**:
  - Category: `quick` - Reason: targeted verification and optional small unit guard tests.
  - Skills: [] - standard package-local Jest/typecheck commands.
  - Omitted: [`playwright`] - no browser/UI behavior involved.

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: [Final Verification Wave] | Blocked By: [1, 2]

  **References** (executor has NO interview context - be exhaustive):
  - Package scripts: `packages/cli/package.json:21-23` - `test`, `test:unit`, `test:integration` commands.
  - Worker server route mounting: `packages/cli/src/scaling/worker-server.ts:111-143`.
  - Existing worker server tests: `packages/cli/src/scaling/__tests__/worker-server.test.ts:170-186`.
  - Existing orchestration controller tests: `packages/cli/src/controllers/__tests__/orchestration.controller.test.ts:23-67`.
  - REST mounting implementation: `packages/cli/src/controller.registry.ts:50-58`.

  **Acceptance Criteria** (agent-executable only):
  - [ ] From `packages/cli`, `pnpm test:unit -- src/scaling/__tests__/worker-drain.service.test.ts --runInBand` exits 0.
  - [ ] From `packages/cli`, `pnpm typecheck` exits 0.
  - [ ] From repo root, docs grep success/failure checks from Task 2 pass.
  - [ ] If optional route guard tests are added, their targeted Jest command exits 0.
  - [ ] Evidence files include command, exit code, and relevant output tail.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Targeted package verification passes
    Tool: Bash
    Steps: pushd packages/cli >/dev/null; pnpm test:unit -- src/scaling/__tests__/worker-drain.service.test.ts --runInBand; pnpm typecheck; popd >/dev/null
    Expected: Both commands exit 0.
    Evidence: .sisyphus/evidence/task-3-targeted-verification-success.log

  Scenario: Docs regression grep catches old URL
    Tool: Bash
    Steps: if grep -n "127.0.0.1:5678/orchestration/worker" docs/worker-drain.md; then exit 1; fi
    Expected: Command exits 0; old worker-local orchestration URL is absent.
    Evidence: .sisyphus/evidence/task-3-docs-regression-error.log
  ```

  **Commit**: NO | Message: `test(cli): cover worker drain route assumptions` | Files: [`packages/cli/src/scaling/__tests__/worker-server.test.ts`, `packages/cli/src/controllers/__tests__/orchestration.controller.test.ts`] only if optional tests are added

## Final Verification Wave (MANDATORY — after ALL implementation tasks)
> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.
> **Do NOT auto-proceed after verification. Wait for user's explicit approval before marking work complete.**
> **Never mark F1-F4 as checked before getting user's okay.** Rejection or user feedback -> fix -> re-run -> present again -> wait for okay.
- [x] F1. Plan Compliance Audit — oracle
  - Verify only planned files changed.
  - Verify source fix satisfies failure, success, idempotency, and concurrency acceptance criteria.
  - Verify no worker-local orchestration endpoint was added.
- [x] F2. Code Quality Review — unspecified-high
  - Review TypeScript clarity, no `any`, no unnecessary state machine complexity, no swallowed errors.
  - Confirm tests are deterministic and do not leave unresolved promises/timers.
- [x] F3. Real Manual QA — unspecified-high
  - Execute targeted package commands and docs grep checks.
  - Capture evidence under `.sisyphus/evidence/`.
- [x] F4. Scope Fidelity Check — deep
  - Confirm implementation fixes only the two validated issues.
  - Confirm docs accurately distinguish main REST API drain from local signal/SIGTERM alternatives.

## Commit Strategy
- Do not commit unless the user explicitly requests a commit.
- If asked to commit after successful verification, prefer one neutral commit: `fix(cli): keep worker drain state consistent`.
- Include docs in the same commit because both changes fix the same worker drain operational flow.

## Success Criteria
- Both validated issues are resolved with no source changes outside `packages/cli/src/scaling/worker-drain.service.ts`, its targeted tests, `docs/worker-drain.md`, and optional route guard tests.
- A failed local queue pause cannot make worker readiness report `draining`.
- The Kubernetes preStop example points to a reachable main n8n REST API URL with the `/rest` base path by default.
- Targeted Jest and package typecheck pass.
- Final verification agents approve and user explicitly confirms completion.
