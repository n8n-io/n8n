## Initialized

## 2026-05-09 Task: exploration-summary
- PubSub command insertion point: `packages/cli/src/scaling/pubsub/pubsub.event-map.ts:49-57`.
- Immediate command registry: `packages/cli/src/scaling/constants.ts:25-34`.
- Publish routing: `packages/cli/src/scaling/pubsub/publisher.service.ts:69-81`.
- Target/self filtering: `packages/cli/src/scaling/pubsub/subscriber.service.ts:169-175`.
- Best tests for Task 1/5: `packages/cli/src/scaling/pubsub/__tests__/publisher.service.test.ts`, `packages/cli/src/scaling/pubsub/__tests__/pubsub.registry.test.ts`, `packages/cli/src/scaling/__tests__/worker-status.service.test.ts`.
- SIGUSR registration site: `packages/cli/src/commands/worker.ts:120-127`, gated by `if (!inTest)`.
- Preserve SIGTERM drain path: `packages/cli/src/commands/worker.ts:197-218` and base command termination handling in `packages/cli/src/commands/base-command.ts`.

## 2026-05-09 Task: drain-worker/resume-worker verification
- `drain-worker` and `resume-worker` are immediate at publish time via `IMMEDIATE_COMMANDS`, so `publishCommand()` now emits them with `debounce: false`.
- `pubsub.registry.test.ts` can exercise the new worker command names directly through `@OnPubSubEvent` handlers.
- In this environment, `pnpm` was not on PATH; `corepack pnpm` worked for verification.

## 2026-05-09 Task: pubsub.types alias follow-up
- Added `DrainWorker` and `ResumeWorker` aliases to `packages/cli/src/scaling/pubsub/pubsub.types.ts` and placed them in the worker-command section of the exported `Command` union.
- `pubsub.registry.test.ts` also depends on `@n8n/decorators`' published `PubSubEventName` union, so the same worker names had to be added there to fully clear the new name errors.
- `pubsub` targeted tests stayed green after the type-only changes.

## 2026-05-09 Task: worker drain signal config gate
- Added `workerDrainSignalsEnabled` next to `drainOnSigterm` in `packages/@n8n/config/src/configs/scaling-mode.config.ts`, mapped from `N8N_WORKER_DRAIN_SIGNALS_ENABLED` with a default of `false`.
- `packages/cli/src/commands/worker.ts` now uses that flag as the only guard for SIGUSR1/SIGUSR2 registration and keeps the SIGTERM drain path in `onTerminationSignal()` unchanged.
- Extracting the registration block into `registerWorkerDrainSignalHandlers()` made it possible to test the SIGUSR behavior directly without driving the full worker bootstrap path.

## 2026-05-09 Task: worker drain pubsub handlers
- packages/cli/src/scaling/worker-drain.service.ts now follows the worker-side PubSub handler pattern from worker-status.service.ee.ts: worker-only @OnPubSubEvent methods that only delegate to existing service logic.
- Handler coverage in packages/cli/src/scaling/__tests__/worker-drain.service.test.ts verifies drain-worker calls enterDrain() and resume-worker calls exitDrain() without duplicating local guard behavior.

## 2026-05-09 Task: worker-status drain publish method
- Added `WorkerStatusService.drainWorker(workerId)` in `packages/cli/src/scaling/worker-status.service.ee.ts`.
- It publishes `drain-worker` with `targets: [workerId]`, so the API `workerId` maps directly to the PubSub hostId target key.
- Targeted Jest and `corepack pnpm --filter n8n typecheck` both passed after the change.

## 2026-05-09 Task: orchestration drain endpoint
- `packages/cli/src/controllers/orchestration.controller.ts` keeps worker-view license parity by reusing the same early `licenseService.isWorkerViewLicensed()` return pattern as `/orchestration/worker/status` before delegating.
- The new `POST /orchestration/worker/:workerId/drain` route is intentionally thin: it reads `workerId` from `@Param`, calls `workerStatusService.drainWorker(workerId)`, and returns `202` with an empty body so the controller does not expose worker internals.
- Because `orchestration` is not a registered `setupTestServer()` endpoint group in `packages/cli` integration helpers, controller coverage here combines direct behavior tests with `ControllerRegistryMetadata` assertions for auth-required and exact `workersView:manage` scope wiring.

## 2026-05-09 Task: worker bootstrap signal gate matrix
- `packages/cli/src/commands/worker.ts` now evaluates SIGUSR handler registration through `shouldRegisterWorkerDrainSignalHandlers()`, which keeps the `inTest` + `workerDrainSignalsEnabled` decision directly testable.
- The only runtime-allowed registration case is now `inTest=false` with `workerDrainSignalsEnabled=true`; the existing `onTerminationSignal()` SIGTERM/SIGINT behavior was preserved unchanged.
- `packages/cli/src/commands/__tests__/worker.test.ts` now covers the full decision matrix and still verifies the `process.on()` registrations separately from the gating logic.

## 2026-05-09 Task: scaling targeted drain subscriber coverage
- The strongest surface for the remaining Task 8 gap was `packages/cli/src/scaling/pubsub/__tests__/subscriber.service.test.ts`, because target filtering happens in `Subscriber.parseMessage()` before the event bus dispatches any worker command handlers.
- Added one semantic test there proving a `drain-worker` command with `targets` that exclude the local `hostId` does not emit a pubsub event, which covers the non-target worker edge without snapshots or a new harness.
- Existing coverage in `worker-status.service.test.ts` and `worker-drain.service.test.ts` still provides the explicit assertions for `targets: [workerId]` publishing and `enterDrain()` handler delegation.

## 2026-05-09 Task: drain endpoint runtime auth coverage
- The strongest runtime auth harness for `POST /orchestration/worker/:workerId/drain` is a new integration test under `packages/cli/test/integration/controllers/`, not the direct controller unit test in `src/controllers/__tests__`.
- Adding a minimal `orchestration` endpoint group to `setupTestServer()` lets the real auth middleware enforce 401/403 while `WorkerStatusService` and `License` remain mocked, keeping the test isolated from Redis/pubsub.

## 2026-05-09 Task: operator docs api-first drain flow
- `docs/worker-drain.md` now treats `POST /orchestration/worker/:workerId/drain` as the primary preStop trigger and calls out the required `workersView:manage` scope.
- The doc keeps `SIGTERM` drain behavior intact and moves `SIGUSR1` and `SIGUSR2` guidance into a compatibility-only section behind `N8N_WORKER_DRAIN_SIGNALS_ENABLED`.
