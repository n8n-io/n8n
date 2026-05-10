# PubSub-Based Worker Drain Trigger (K8s preStop)

## TL;DR
> **Summary**: Replace SIGUSR drain toggling with targeted PubSub commands and expose a main-side drain endpoint for Kubernetes preStop usage.
> **Deliverables**:
> - PubSub command map + type union updates for `drain-worker` and `resume-worker`
> - Worker drain service event handlers for targeted commands
> - Main-side `POST /orchestration/worker/:workerId/drain` endpoint protected by `workersView:manage`
> - Backward-compatible SIGUSR handling behind a config flag
> - Tests + docs update from signal-driven to API-driven drain flow
> **Effort**: Medium
> **Parallel**: YES - 3 waves
> **Critical Path**: 1 → 2 → 4 → 7

## Context
### Original Request
- Replace `kill -USR2 <pid>` drain trigger with main-published targeted Redis PubSub command.
- Add `drain-worker` and `resume-worker` command entries and types.
- Wire worker handlers with `@OnPubSubEvent` in `worker-drain.service.ts`.
- Remove or gate `SIGUSR1/SIGUSR2` handlers in `worker.ts`.
- Add main-side drain trigger endpoint publishing targeted command to worker host ID.

### Interview Summary
- Route locked: `POST /orchestration/worker/:workerId/drain`.
- Auth locked: `@GlobalScope('workersView:manage')`.
- Public API scope locked to **drain-only** for Kubernetes preStop; no public resume endpoint.
- Backward compatibility locked: keep SIGUSR handlers but gate them behind a config flag.

### Metis Review (gaps addressed)
- Added guardrail to decide command dispatch immediacy (debounce vs immediate behavior).
- Added explicit assumption validation for `workerId === hostId` targeting semantics.
- Added docs migration work item because current docs explicitly describe SIGUSR preStop behavior.
- Added edge-case acceptance criteria for unknown worker targets and repeated drain requests.

## Work Objectives
### Core Objective
Implement a robust API-driven drain pathway so orchestration can place a specific worker into drain mode before termination, without relying on POSIX signals.

### Deliverables
- Drain/resume command schema integrated into PubSub command contract.
- Worker-side drain/resume command handlers aligned with existing worker-status event pattern.
- Orchestration endpoint that publishes targeted drain commands to the specified worker host ID.
- Feature-flagged SIGUSR compatibility behavior.
- Updated tests and operator docs for k8s preStop usage.

### Definition of Done (verifiable conditions with commands)
- `pnpm --filter n8n test packages/cli/src/scaling/__tests__/worker-status.service.test.ts`
- `pnpm --filter n8n test packages/cli/src/scaling/__tests__/worker-drain.service.test.ts`
- `pnpm --filter n8n test packages/cli/src/scaling/__tests__/worker-server.test.ts`
- `pnpm --filter n8n test packages/cli/src/controllers/__tests__`
- `pnpm --filter n8n typecheck`

### Must Have
- Targeted publish uses `targets: [workerId]` and worker-only handler execution.
- Endpoint requires authenticated global scope `workersView:manage`.
- Signal fallback is configurable and disabled by default.
- Verification includes unknown target, repeated drain, and non-worker instance guard.

### Must NOT Have (guardrails, AI slop patterns, scope boundaries)
- No new public resume endpoint in this change.
- No readiness/SIGTERM shutdown redesign.
- No broad worker-control API expansion beyond drain.
- No permission model redesign beyond endpoint scope selection.
- No implicit assumptions about worker IDs without test coverage.

## Verification Strategy
> ZERO HUMAN INTERVENTION - all verification is agent-executed.
- Test decision: tests-after (Jest package tests + typecheck)
- QA policy: Every task includes agent-executed happy path + edge/failure scenario
- Evidence: `.sisyphus/evidence/task-{N}-{slug}.{ext}`

## Execution Strategy
### Parallel Execution Waves
> Target: 5-8 tasks per wave. <3 per wave (except final) = under-splitting.
> Extract shared dependencies as Wave-1 tasks for max parallelism.

Wave 1: Contract + config foundations (Tasks 1-3)
Wave 2: Worker + API implementation (Tasks 4-7)
Wave 3: Tests + docs hardening (Tasks 8-10)

### Dependency Matrix (full, all tasks)
- 1 blocks 4, 7, 8
- 2 blocks 4, 8
- 3 blocks 6, 9
- 4 blocks 8
- 5 blocks 7, 8
- 6 blocks 9
- 7 blocks 9
- 8 blocks 10
- 9 blocks 10

### Agent Dispatch Summary (wave → task count → categories)
- Wave 1 → 3 tasks → quick / unspecified-low
- Wave 2 → 4 tasks → unspecified-high / quick
- Wave 3 → 3 tasks → unspecified-high / writing

## TODOs
> Implementation + Test = ONE task. Never separate.
> EVERY task MUST have: Agent Profile + Parallelization + QA Scenarios.

- [x] 1. Add drain/resume command entries to PubSub command map

  **What to do**: Add `'drain-worker': never` and `'resume-worker': never` to `PubSubCommandMap` in the worker command section. Add both to immediate command dispatch set so preStop drain is not debounced.
  **Must NOT do**: Do not modify worker-response map; do not change unrelated command payload shapes.

  **Recommended Agent Profile**:
  - Category: `quick` - Reason: local, low-surface contract update
  - Skills: `[]` - no specialized skill required
  - Omitted: [`n8n:protect-endpoints`] - endpoint security is handled in Task 7

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 4, 7, 8 | Blocked By: none

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `packages/cli/src/scaling/pubsub/pubsub.event-map.ts:4-210` - canonical command registry
  - Pattern: `packages/cli/src/scaling/pubsub/pubsub.event-map.ts:49-57` - existing worker command grouping
  - API/Type: `packages/cli/src/scaling/pubsub/publisher.service.ts:69-82` - command publish + metadata stamping
  - API/Type: `packages/cli/src/scaling/constants.ts:28-34` - `IMMEDIATE_COMMANDS` registry location
  - API/Type: `packages/cli/src/scaling/pubsub/subscriber.service.ts:156-176` - target filtering behavior
  - Test: `packages/cli/src/scaling/pubsub/__tests__/publisher.service.test.ts:62-110` - publish-command assertion style

  **Acceptance Criteria** (agent-executable only):
  - [ ] `PubSubCommandMap` contains `drain-worker` and `resume-worker` with `never` payload.
  - [ ] `drain-worker` and `resume-worker` are included in immediate command processing path (no debounce delay).
  - [ ] Existing command map entries remain unchanged.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: PubSub command map registration
    Tool: Bash
    Steps: Run `pnpm --filter n8n test packages/cli/src/scaling/pubsub/__tests__/publisher.service.test.ts packages/cli/src/scaling/pubsub/__tests__/pubsub.registry.test.ts`
    Expected: Tests pass and include assertions covering new command registration/handling path
    Evidence: .sisyphus/evidence/task-1-pubsub-map.txt

  Scenario: Non-target command behavior unaffected
    Tool: Bash
    Steps: Run `pnpm --filter n8n test packages/cli/src/scaling/__tests__/worker-status.service.test.ts`
    Expected: No regressions in existing worker-status command flow
    Evidence: .sisyphus/evidence/task-1-pubsub-map-error.txt
  ```

  **Commit**: YES | Message: `feat(cli): add pubsub drain and resume worker commands` | Files: `packages/cli/src/scaling/pubsub/pubsub.event-map.ts`, `packages/cli/src/scaling/constants.ts`

- [x] 2. Extend PubSub command type aliases and `Command` union

  **What to do**: Add `DrainWorker` and `ResumeWorker` aliases using `ToCommand<...>` and include both in the exported `Command` union.
  **Must NOT do**: Do not change existing `_ToCommand` generic contract or worker response typing.

  **Recommended Agent Profile**:
  - Category: `quick` - Reason: type-only update with narrow blast radius
  - Skills: `[]` - no specialized skill required
  - Omitted: [`n8n:spec-driven-development`] - no spec file involved

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 4, 8 | Blocked By: none

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `packages/cli/src/scaling/pubsub/pubsub.types.ts:21-37` - `_ToCommand` contract
  - Pattern: `packages/cli/src/scaling/pubsub/pubsub.types.ts:41-68` - command alias declaration style
  - Pattern: `packages/cli/src/scaling/pubsub/pubsub.types.ts:71-98` - `Command` union composition
  - Test: `packages/cli/src/scaling/__tests__/worker-status.service.test.ts:7-99` - union-driven command mocking pattern

  **Acceptance Criteria** (agent-executable only):
  - [ ] `DrainWorker` and `ResumeWorker` aliases compile without casts.
  - [ ] Both aliases are present in the `Command` union export.
  - [ ] `pnpm --filter n8n typecheck` passes for package scope.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Type-level integration
    Tool: Bash
    Steps: Run `pnpm --filter n8n typecheck`
    Expected: No TypeScript errors from pubsub command union
    Evidence: .sisyphus/evidence/task-2-pubsub-types.txt

  Scenario: Missing union entry regression check
    Tool: Bash
    Steps: Run `pnpm --filter n8n test packages/cli/src/scaling/__tests__/worker-status.service.test.ts`
    Expected: Tests fail if a command type is missing from union (guarding accidental omission)
    Evidence: .sisyphus/evidence/task-2-pubsub-types-error.txt
  ```

  **Commit**: YES | Message: `feat(cli): add drain worker command types` | Files: `packages/cli/src/scaling/pubsub/pubsub.types.ts`

- [x] 3. Add config-gated SIGUSR compatibility switch for worker drain signals

  **What to do**: Introduce a new scaling config boolean `workerDrainSignalsEnabled` mapped to env var `N8N_WORKER_DRAIN_SIGNALS_ENABLED` with default `false`; use it as the sole gate for SIGUSR handler registration in worker bootstrap.
  **Must NOT do**: Do not alter `drainOnSigterm` semantics; do not change graceful shutdown timing defaults.

  **Recommended Agent Profile**:
  - Category: `unspecified-low` - Reason: cross-file config + bootstrap wiring
  - Skills: `[]` - no specialized skill required
  - Omitted: [`n8n:protect-endpoints`] - non-HTTP task

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 6, 9 | Blocked By: none

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `packages/@n8n/config/src/configs/scaling-mode.config.ts:119-125` - existing env-to-config mapping style
  - Pattern: `packages/cli/src/commands/worker.ts:118-126` - current SIGUSR registration site
  - Pattern: `packages/cli/src/commands/worker.ts:197-217` - SIGTERM drain path (must remain untouched)
  - API/Type: `packages/cli/src/commands/base-command.ts:119-120` - termination signal wiring context

  **Acceptance Criteria** (agent-executable only):
  - [ ] New config key exists with env var `N8N_WORKER_DRAIN_SIGNALS_ENABLED` and default `false`.
  - [ ] SIGUSR handlers are only registered when config is true.
  - [ ] SIGTERM drain behavior remains unchanged.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Signals disabled by default
    Tool: Bash
    Steps: Run worker bootstrap unit tests with default env
    Expected: No SIGUSR handler registration unless flag enabled
    Evidence: .sisyphus/evidence/task-3-signal-flag.txt

  Scenario: Backward compatibility enabled
    Tool: Bash
    Steps: Run tests with `N8N_WORKER_DRAIN_SIGNALS_ENABLED=true`
    Expected: SIGUSR1/SIGUSR2 handlers register and invoke drain/resume methods
    Evidence: .sisyphus/evidence/task-3-signal-flag-error.txt
  ```

  **Commit**: YES | Message: `feat(cli): gate worker drain signals behind config` | Files: `packages/@n8n/config/src/configs/scaling-mode.config.ts`, `packages/cli/src/commands/worker.ts`


- [x] 8. Extend scaling unit tests for new command wiring and worker handlers

  **What to do**: Update/add tests in scaling test suites to cover command map presence, command type usage, publish payload, and worker handler invocation for drain/resume.
  **Must NOT do**: Do not rely on brittle string snapshots for command map order; assert semantic presence/behavior.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: multi-surface behavioral tests
  - Skills: `[]` - no specialized skill required
  - Omitted: [`n8n:reproduce-bug`] - this is feature coverage, not bug repro

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: 10 | Blocked By: 1, 2, 4, 5

  **References** (executor has NO interview context - be exhaustive):
  - Test: `packages/cli/src/scaling/pubsub/__tests__/publisher.service.test.ts:62-110` - publish command stamping/publish assertions
  - Test: `packages/cli/src/scaling/__tests__/worker-status.service.test.ts:7-99` - service command publish assertions
  - Test: `packages/cli/src/scaling/__tests__/worker-drain.service.test.ts:23-98` - drain/resume service behavior tests
  - Pattern: `packages/cli/src/scaling/pubsub/subscriber.service.ts:156-176` - target filtering behavior to mirror in tests
  - Pattern: `packages/cli/src/scaling/pubsub/pubsub.event-map.ts:49-57` - worker command section

  **Acceptance Criteria** (agent-executable only):
  - [ ] Tests assert `drain-worker` publish payload includes `targets:[workerId]`.
  - [ ] Tests assert worker handler executes `enterDrain()` on drain command.
  - [ ] Tests assert resume handler remains internal-only (no public route dependency).

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Full scaling test pass
    Tool: Bash
    Steps: Run `pnpm --filter n8n test packages/cli/src/scaling/pubsub/__tests__/publisher.service.test.ts packages/cli/src/scaling/__tests__/worker-status.service.test.ts packages/cli/src/scaling/__tests__/worker-drain.service.test.ts`
    Expected: All suites pass with new command coverage
    Evidence: .sisyphus/evidence/task-8-scaling-tests.txt

  Scenario: Target mismatch edge case
    Tool: Bash
    Steps: Add/execute test where command target does not equal local hostId
    Expected: Handler path is not invoked on non-target worker
    Evidence: .sisyphus/evidence/task-8-scaling-tests-error.txt
  ```

  **Commit**: YES | Message: `test(cli): cover pubsub worker drain command flow` | Files: `packages/cli/src/scaling/__tests__/worker-status.service.test.ts`, `packages/cli/src/scaling/__tests__/worker-drain.service.test.ts`

- [x] 9. Add controller/runtime tests for drain endpoint + signal compatibility gate

  **What to do**: Add/extend controller tests for authorized/unauthorized drain endpoint calls and worker command tests for signal flag on/off behavior.
  **Must NOT do**: Do not couple endpoint tests to Redis runtime; mock service publisher calls.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: mixed API and bootstrap behavior validation
  - Skills: [`n8n:protect-endpoints`] - verify access control assertions
  - Omitted: [`playwright`] - backend API/unit coverage only

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: 10 | Blocked By: 3, 6, 7

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `packages/cli/src/controllers/orchestration.controller.ts:1-25` - endpoint surface under test
  - Pattern: `packages/cli/src/commands/worker.ts:118-126` - signal registration behavior under test
  - Pattern: `packages/cli/src/commands/worker.ts:197-217` - unchanged SIGTERM path assertions
  - Test: `packages/cli/src/scaling/__tests__/worker-server.test.ts:306-331` - drain runtime behavior reference

  **Acceptance Criteria** (agent-executable only):
  - [ ] Endpoint test validates 202 + service invocation for authorized user.
  - [ ] Endpoint tests validate both unauthenticated (401) and no-scope (403) failures.
  - [ ] Endpoint tests validate unlicensed-worker-view short-circuit behavior.
  - [ ] Worker tests validate helper-based SIGUSR decision matrix for (`inTest`, flag).

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Endpoint authorization matrix
    Tool: Bash
    Steps: Run `pnpm --filter n8n test packages/cli/src/controllers/__tests__`
    Expected: Authorized path succeeds; unauthenticated=401; missing-scope=403; unlicensed short-circuits
    Evidence: .sisyphus/evidence/task-9-endpoint-auth.txt

  Scenario: Signal compatibility matrix
    Tool: Bash
    Steps: Run worker command tests covering helper matrix: (`inTest=true,false`) x (`flag=true,false`)
    Expected: Registration true only when `inTest=false` and flag=true
    Evidence: .sisyphus/evidence/task-9-signal-matrix-error.txt
  ```

  **Commit**: YES | Message: `test(cli): verify drain endpoint auth and signal compatibility` | Files: `packages/cli/src/controllers/__tests__/orchestration.controller.test.ts` (new), `packages/cli/src/commands/__tests__/worker.test.ts`

- [x] 10. Update operator docs from signal preStop to API-driven drain trigger

  **What to do**: Update worker drain documentation to prefer calling main API drain endpoint from preStop workflow; document optional SIGUSR compatibility flag as legacy fallback.
  **Must NOT do**: Do not document public resume endpoint; do not remove SIGTERM drain guidance.

  **Recommended Agent Profile**:
  - Category: `writing` - Reason: docs clarity + migration messaging
  - Skills: `[]` - no specialized skill required
  - Omitted: [`n8n:content-design`] - operator docs, not UI copy

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: none | Blocked By: 8, 9

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `docs/worker-drain.md:1` - current signal-based operational guidance
  - Pattern: `packages/cli/src/controllers/orchestration.controller.ts:1-25` - endpoint source of truth
  - API/Type: `packages/@n8n/config/src/configs/scaling-mode.config.ts:119-125` - related drain config docs style

  **Acceptance Criteria** (agent-executable only):
  - [ ] Docs describe API-driven drain call with route + auth requirement.
  - [ ] Docs clearly mark SIGUSR path as optional compatibility fallback via flag.
  - [ ] Docs do not introduce resume endpoint instructions.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Documentation consistency check
    Tool: Bash
    Steps: Search docs for `SIGUSR2` and ensure primary flow now references `/orchestration/worker/:workerId/drain`
    Expected: API-driven flow is primary; signal path labeled compatibility-only
    Evidence: .sisyphus/evidence/task-10-docs.txt

  Scenario: Scope mismatch prevention
    Tool: Bash
    Steps: Verify docs mention `workersView:manage` requirement for endpoint caller
    Expected: No stale `orchestration:read` guidance for drain action
    Evidence: .sisyphus/evidence/task-10-docs-error.txt
  ```

  **Commit**: YES | Message: `docs(cli): document api-based worker drain prestop flow` | Files: `docs/worker-drain.md`


- [x] 4. Implement worker-side PubSub drain/resume handlers in `WorkerDrainService`

  **What to do**: Add `@OnPubSubEvent('drain-worker', { instanceType: 'worker' })` and `@OnPubSubEvent('resume-worker', { instanceType: 'worker' })` methods that call `enterDrain()` and `exitDrain()` respectively; preserve existing local guard behavior.
  **Must NOT do**: Do not duplicate drain logic outside `enterDrain/exitDrain`; do not publish commands from worker handlers.

  **Recommended Agent Profile**:
  - Category: `unspecified-low` - Reason: service-level event wiring with existing methods
  - Skills: `[]` - no specialized skill required
  - Omitted: [`n8n:protect-endpoints`] - not an HTTP task

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 8 | Blocked By: 1, 2

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `packages/cli/src/scaling/worker-status.service.ee.ts:47-57` - canonical worker `@OnPubSubEvent` pattern
  - Pattern: `packages/cli/src/scaling/worker-drain.service.ts:26-36,38-48` - existing drain/resume methods to call
  - Pattern: `packages/cli/src/scaling/pubsub/__tests__/pubsub.registry.test.ts:20-38` - registry/decorator discovery behavior
  - Test: `packages/cli/src/scaling/__tests__/worker-drain.service.test.ts:23-98` - worker drain service test style

  **Acceptance Criteria** (agent-executable only):
  - [ ] Worker-only handlers exist for both commands and call respective methods.
  - [ ] Handler invocation is no-op on main instances due to `instanceType: 'worker'`.
  - [ ] Existing drain/resume method side-effects remain unchanged.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Drain command enters drain
    Tool: Bash
    Steps: Run `pnpm --filter n8n test packages/cli/src/scaling/__tests__/worker-drain.service.test.ts`
    Expected: Handler path calls pause queue flow and marks worker as draining
    Evidence: .sisyphus/evidence/task-4-worker-handlers.txt

  Scenario: Resume command while not draining
    Tool: Bash
    Steps: Run same test with edge-case fixture where worker is not draining
    Expected: No crash; logs/guards show graceful no-op semantics
    Evidence: .sisyphus/evidence/task-4-worker-handlers-error.txt
  ```

  **Commit**: YES | Message: `feat(cli): handle pubsub drain commands in worker drain service` | Files: `packages/cli/src/scaling/worker-drain.service.ts`, `packages/cli/src/scaling/__tests__/worker-drain.service.test.ts`

- [x] 5. Add orchestration service method to publish targeted drain command

  **What to do**: Add a main-side service method (in existing worker-status/orchestration service surface) that publishes `{ command: 'drain-worker', targets: [workerId] }` via `publisher.publishCommand`, where `workerId` is explicitly the worker host ID.
  **Must NOT do**: Do not publish `resume-worker` from public path; do not use broadcast publish without `targets`.

  **Recommended Agent Profile**:
  - Category: `quick` - Reason: constrained service wiring change
  - Skills: `[]` - no specialized skill required
  - Omitted: [`n8n:protect-endpoints`] - endpoint decoration handled in Task 7

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 7, 8 | Blocked By: 1

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `packages/cli/src/scaling/worker-status.service.ee.ts:23-30` - command publish style from main
  - Pattern: `packages/cli/src/scaling/worker-status.service.ee.ts:39-40,50,66` - `workerId` UI field maps to worker `senderId/hostId`
  - API/Type: `packages/cli/src/scaling/pubsub/publisher.service.ts:69-82` - `publishCommand` contract
  - API/Type: `packages/cli/src/scaling/pubsub/subscriber.service.ts:169-176` - target filtering by hostId
  - Test: `packages/cli/src/scaling/__tests__/worker-status.service.test.ts:7-99` - service test/mocking pattern

  **Acceptance Criteria** (agent-executable only):
  - [ ] Service method accepts `workerId` and publishes `drain-worker` with `targets: [workerId]`.
  - [ ] Service method does not publish `resume-worker`.
  - [ ] Contract test documents and verifies that API `workerId` equals PubSub target hostId.
  - [ ] Method is covered by unit tests asserting exact publish payload.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Targeted drain publish payload
    Tool: Bash
    Steps: Run `pnpm --filter n8n test packages/cli/src/scaling/__tests__/worker-status.service.test.ts`
    Expected: Assertion verifies `publishCommand({ command:'drain-worker', targets:[workerId] })`
    Evidence: .sisyphus/evidence/task-5-drain-publish.txt

  Scenario: Unknown workerId still publishes targeted command
    Tool: Bash
    Steps: Execute unit test with non-existent `workerId` input
    Expected: Service still publishes targeted command; delivery filtering handles absence
    Evidence: .sisyphus/evidence/task-5-drain-publish-error.txt
  ```

  **Commit**: YES | Message: `feat(cli): publish targeted drain-worker command` | Files: `packages/cli/src/scaling/worker-status.service.ee.ts`, `packages/cli/src/scaling/__tests__/worker-status.service.test.ts`

- [x] 6. Gate SIGUSR handlers in worker bootstrap with new config flag

  **What to do**: Wrap `process.on('SIGUSR2'...)` and `process.on('SIGUSR1'...)` registration in `worker.ts` behind `config.getEnv('queue.bull.workerDrainSignalsEnabled')` (or equivalent injected config property) from Task 3, and extract the registration decision into a testable helper method so Jest can verify behavior despite `if (!inTest)` runtime guard.
  **Must NOT do**: Do not remove SIGTERM/SIGINT termination handlers; do not alter drain budget behavior.

  **Recommended Agent Profile**:
  - Category: `unspecified-low` - Reason: small runtime wiring change with behavioral impact
  - Skills: `[]` - no specialized skill required
  - Omitted: [`n8n:protect-endpoints`] - non-HTTP path

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 9 | Blocked By: 3

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `packages/cli/src/commands/worker.ts:118-126` - current SIGUSR registration block
  - Pattern: `packages/cli/src/commands/worker.ts:197-217` - termination drain flow that must remain unchanged
  - API/Type: `packages/@n8n/config/src/configs/scaling-mode.config.ts:119-125` - scaling config key style

  **Acceptance Criteria** (agent-executable only):
  - [ ] With default config, SIGUSR handlers are not attached.
  - [ ] With compatibility flag enabled, SIGUSR handlers are attached and call drain methods.
  - [ ] Helper-method unit tests validate registration decision matrix (`inTest` x flag).
  - [ ] SIGTERM flow still calls `enterDrain()` + `waitForActiveJobsToFinish(...)` unchanged.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Default runtime behavior
    Tool: Bash
    Steps: Run `pnpm --filter n8n test packages/cli/src/commands/__tests__/worker.test.ts` with decision-helper test matrix
    Expected: Matrix proves registration disabled by default and when `inTest=true`
    Evidence: .sisyphus/evidence/task-6-sigusr-gate.txt

  Scenario: Compatibility mode behavior
    Tool: Bash
    Steps: Run same test suite with helper-case flag true + `inTest=false`
    Expected: Matrix proves SIGUSR1/SIGUSR2 registration decision is true only in compatibility mode
    Evidence: .sisyphus/evidence/task-6-sigusr-gate-error.txt
  ```

  **Commit**: YES | Message: `chore(cli): make worker drain signals opt-in` | Files: `packages/cli/src/commands/worker.ts`, `packages/cli/src/commands/__tests__/worker.test.ts`

- [x] 7. Add `POST /orchestration/worker/:workerId/drain` endpoint with `workersView:manage`

  **What to do**: Add route in orchestration controller; decorate with `@GlobalScope('workersView:manage')`; keep existing worker-view license gate (`licenseService.isWorkerViewLicensed()`); accept `workerId` via `@Param('workerId')`; call service method from Task 5; return 202 Accepted with empty body.
  **Must NOT do**: Do not add resume endpoint; do not use `orchestration:read`; do not bypass service layer.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: security-sensitive API surface change
  - Skills: [`n8n:protect-endpoints`] - ensure correct RBAC decorator usage
  - Omitted: [`n8n:design-system`] - backend-only task

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 9 | Blocked By: 1, 5

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `packages/cli/src/controllers/orchestration.controller.ts:1-25` - existing orchestration route style
  - Pattern: `packages/cli/src/controllers/orchestration.controller.ts:18-23` - `@GlobalScope` usage
  - API/Type: `packages/@n8n/permissions/src/roles/scopes/global-scopes.ee.ts:52-97` - scope definitions incl. `workersView:manage`
  - Pattern: `packages/cli/src/modules/data-table/data-table.controller.ts:141-148` - `@Param` string extraction pattern
  - Test: `packages/cli/src/modules/instance-registry/__tests__/instance-registry.controller.test.ts` - controller-level authorization and route test style

  **Acceptance Criteria** (agent-executable only):
  - [ ] Endpoint exists at `POST /orchestration/worker/:workerId/drain`.
  - [ ] Endpoint is guarded by `@GlobalScope('workersView:manage')`.
  - [ ] Endpoint applies worker-view license gate parity with `/orchestration/worker/status`.
  - [ ] Endpoint calls service publish method with exact `workerId` from route param.
  - [ ] Response code is 202 and does not expose worker internals.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Authorized drain request
    Tool: Bash
    Steps: Run controller test file covering authenticated caller with manage scope
    Expected: 202 response and service called with route workerId
    Evidence: .sisyphus/evidence/task-7-drain-endpoint.txt

  Scenario: Unauthorized caller
    Tool: Bash
    Steps: Run same tests for caller without `workersView:manage`
    Expected: Access denied (403/authorization failure) and no publish call
    Evidence: .sisyphus/evidence/task-7-drain-endpoint-error.txt

  Scenario: Worker view not licensed
    Tool: Bash
    Steps: Run controller tests with `licenseService.isWorkerViewLicensed()` returning false
    Expected: Endpoint short-circuits without publish call (parity with status endpoint behavior)
    Evidence: .sisyphus/evidence/task-7-drain-endpoint-license.txt
  ```

  **Commit**: YES | Message: `feat(cli): add orchestration drain worker endpoint` | Files: `packages/cli/src/controllers/orchestration.controller.ts`, `packages/cli/src/controllers/__tests__/orchestration.controller.test.ts` (new)


## Final Verification Wave (MANDATORY — after ALL implementation tasks)
> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.
> **Do NOT auto-proceed after verification. Wait for user's explicit approval before marking work complete.**
> **Never mark F1-F4 as checked before getting user's okay.** Rejection or user feedback -> fix -> re-run -> present again -> wait for okay.
- [x] F1. Plan Compliance Audit — oracle
- [x] F2. Code Quality Review — unspecified-high
- [x] F3. Real Manual QA — unspecified-high (+ playwright if UI)
- [x] F4. Scope Fidelity Check — deep

## Commit Strategy
- Commit 1: PubSub contracts + worker handlers + signal-flag wiring.
- Commit 2: Orchestration endpoint + service wiring + authorization.
- Commit 3: Tests + docs migration.

## Success Criteria
- Drain command can be published to one target worker and only that worker enters drain.
- API-driven preStop path is documented and test-covered.
- Backward compatibility path exists but is opt-in via config.
- All listed tests and typecheck pass without manual intervention.
