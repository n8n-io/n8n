# Worker Drain Mechanism — Implementation Plan

## Requirements Summary

Add a drain mode to n8n queue-mode workers so a running worker can stop accepting new jobs without exiting, allowing in-flight executions to finish cleanly. Triggered by Unix signals and reflected on the readiness endpoint, so a Kubernetes / KEDA orchestrator can scale a worker down without dropping jobs. Three signals total:

- **SIGUSR2** → enter drain mode (pause local Bull consumption, flip readiness to 503)
- **SIGUSR1** → exit drain mode (resume local Bull consumption, readiness back to 200)
- **SIGTERM** with `N8N_WORKER_DRAIN_ON_SIGTERM=true` → enter drain first, then proceed with existing graceful shutdown (default `false`, no behavior change)

Scope is restricted to the `worker` instance type. Main and webhook processes are unaffected.

## Research Findings (anchored)

| Concern | Location | Note |
|---|---|---|
| Bull version | `packages/cli/package.json:147` | `"bull": "4.16.4"` — supports `pause(isLocal, doNotWaitActive)` and `resume(isLocal)` |
| Existing local-pause call | `packages/cli/src/scaling/scaling.service.ts:165` | `await this.queue.pause(true, true)` (already in use for shutdown) |
| Worker SIGTERM/SIGINT registration | `packages/cli/src/commands/base-command.ts:119-120` | `process.once('SIG*', this.onTerminationSignal(signal))` — handler is `protected` and overridable |
| Worker shutdown sequence | `base-command.ts:343-369` → `ScalingService.stop()` (`scaling.service.ts:156-190`) | Already pauses queue + waits for `getRunningJobsCount()` to reach 0 on worker stop |
| Readiness endpoint | `packages/cli/src/scaling/worker-server.ts:119-121, 144-155` | Returns 200/503 from DB + Redis + `fullyReady` |
| Worker init lifecycle | `packages/cli/src/commands/worker.ts:77-134` (`init`), `182-215` (`run`) | `WorkerServer` constructed in `run`; `ScalingService` constructed in `initScalingService` |
| Existing scaling tests | `packages/cli/src/scaling/__tests__/scaling.service.test.ts:206, 222` | Already verifies `queue.pause(true, true)` |
| Existing readiness tests | `packages/cli/src/scaling/__tests__/worker-server.test.ts:213-297` | Pattern for capturing express handler and asserting status |
| Config home for new env var | `packages/@n8n/config/src/configs/scaling-mode.config.ts:110-125` (`BullConfig`) | n8n no longer has `packages/cli/src/config/schema.ts` — env vars use `@Env(...)` decorators |
| Graceful shutdown timeout source | `base-command.ts:76-78`, `scaling-mode.config.ts:121` | `gracefulShutdownTimeoutInS` from `generic.gracefulShutdownTimeout` (default 30s) |

## Architectural Decision

A new `@Service()` class **`WorkerDrainService`** owns the drain state. It is:
- the single source of truth for `isDraining`
- injected into `WorkerServer` so the readiness handler can read state
- driven by the `Worker` command's signal handlers (and optionally its overridden `onTerminationSignal`)
- a thin coordinator over `ScalingService` (for `pause/resume`) and `JobProcessor` (for active count via `ScalingService.getRunningJobsCount()`)

Why a dedicated service rather than a flag on `WorkerServer` or `ScalingService`:
- `WorkerServer` is constructed conditionally (only if any endpoint is enabled) — drain state must outlive that.
- Putting the flag on `ScalingService` would bleed worker-process-only concerns into a service shared by main/webhook.
- The user constraint "Keep the drain state isolated to the worker command" is best satisfied by a discrete worker-scoped service.

`ScalingService` gets two **minimal** public passthroughs (`pauseLocalQueue` / `resumeLocalQueue`) — the only place where queue.pause/resume can live, since the queue handle is private to that service. No other state moves into ScalingService or JobProcessor.

## Acceptance Criteria

All criteria are testable via the new unit tests (no integration env required).

1. **Drain on SIGUSR2 (worker only)**
   - On a worker process, `process.emit('SIGUSR2')` calls `ScalingService.pauseLocalQueue()` exactly once and sets `WorkerDrainService.isDraining()` to `true`.
   - Logs exactly `[Worker] Drain signal received. Stopping new job intake.` via `this.logger.info`.
   - Begins polling running-job count; when 0, logs exactly `[Worker] Drain complete. No active executions remaining.`.
   - The process does NOT exit (no `process.exit`, no `shutdownService.shutdown` call).
   - On main / webhook processes, SIGUSR2 is not registered — emitting it has no effect.

2. **Resume on SIGUSR1 (worker only)**
   - When `isDraining()` is `true`: calls `ScalingService.resumeLocalQueue()`, sets the flag to `false`, logs `[Worker] Resume signal received. Accepting new jobs.`.
   - When `isDraining()` is `false`: does not call `resume`; logs a warning (`[Worker] Resume signal received but worker is not draining. No-op.`).
   - On main / webhook processes, SIGUSR1 is not registered.

3. **Readiness during drain**
   - `GET /healthz/readiness` returns HTTP 503 with body `{ "status": "draining" }` whenever `WorkerDrainService.isDraining()` is `true`, even if DB and Redis are healthy.
   - When `isDraining()` is `false`, response is identical to current behavior (200 if ready, 503 with `{status: "error"}` if DB/Redis/fullyReady fails).

4. **`N8N_WORKER_DRAIN_ON_SIGTERM` env var**
   - New `@Env('N8N_WORKER_DRAIN_ON_SIGTERM')` boolean on `BullConfig` in `scaling-mode.config.ts`, default `false`.
   - When `false` (default): SIGTERM behavior is byte-for-byte identical to today (no calls to `WorkerDrainService` happen during SIGTERM, no readiness flip). Verified by snapshot of existing test still passing.
   - When `true`: on SIGTERM the worker (a) sets `isDraining = true` (readiness 503), (b) pauses local queue, (c) waits for running jobs to reach zero or for `gracefulShutdownTimeoutInS` to elapse, (d) then proceeds with the existing shutdown via `super.onTerminationSignal('SIGTERM')`. The internal force-shutdown timer in `base-command.onTerminationSignal` still fires at `gracefulShutdownTimeoutInS` from when shutdown begins, so we use a smaller drain wait budget (default `gracefulShutdownTimeoutInS / 2`, capped) to leave runway for shutdown teardown. (See "Risks & Mitigations" for rationale and bounds.)

5. **No regressions for non-worker processes**
   - The `start` command and `webhook` command (which extend `BaseCommand`) do not register SIGUSR1/SIGUSR2 handlers.
   - The existing `WorkerServer` constructor assertion (`instanceType === 'worker'`) is unchanged.
   - Existing tests in `scaling.service.test.ts` and `worker-server.test.ts` continue to pass without modification (added tests are additive).

6. **No new dependencies**
   - `pnpm-lock.yaml` diff contains zero new packages.

## Implementation Steps

### Step 1 — Add env var to BullConfig

**File:** `packages/@n8n/config/src/configs/scaling-mode.config.ts`

Inside class `BullConfig` (around line 121, near the deprecated `gracefulShutdownTimeout`), add:

```ts
/** Whether SIGTERM on a worker should first enter drain mode (pause queue, mark readiness 503, wait for active jobs) before the regular shutdown sequence. Useful for Kubernetes rolling deploys. */
@Env('N8N_WORKER_DRAIN_ON_SIGTERM')
drainOnSigterm: boolean = false;
```

**Acceptance:** `globalConfig.queue.bull.drainOnSigterm` is typed `boolean` and defaults to `false`. Existing config tests (in `packages/@n8n/config/src/configs/__tests__/`) continue to pass; add an entry to whichever snapshot/listing test enumerates envs (search for `QUEUE_WORKER_TIMEOUT` to find the right one).

### Step 2 — Expose minimal pause/resume helpers on ScalingService

**File:** `packages/cli/src/scaling/scaling.service.ts`

After the existing private `pauseQueue()` (line 164-167), add two public methods restricted to worker:

```ts
/** Pause local queue consumption for this worker only. Other workers on the same Redis queue are unaffected. */
async pauseLocalQueue() {
    this.assertWorker();
    this.assertQueue();
    await this.queue.pause(true, true);
    this.logger.debug('Local worker queue paused');
}

/** Resume local queue consumption for this worker only. */
async resumeLocalQueue() {
    this.assertWorker();
    this.assertQueue();
    await this.queue.resume(true);
    this.logger.debug('Local worker queue resumed');
}
```

**Note:** Do NOT call `assertWorker` / `assertQueue` reflectively from outside; they remain private. The new methods are the only public surface.

**Acceptance:** Calling either on a non-worker instance throws `UnexpectedError`; calling before `setupQueue` throws `UnexpectedError`. Verified by added tests in `scaling.service.test.ts`.

### Step 3 — Create WorkerDrainService

**New file:** `packages/cli/src/scaling/worker-drain.service.ts`

```ts
import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { InstanceSettings, sleep } from 'n8n-core';
import { UnexpectedError } from 'n8n-workflow';

import { ScalingService } from './scaling.service';

@Service()
export class WorkerDrainService {
    private draining = false;

    /** Polling interval (ms) for the post-drain "no active executions" signal. */
    private readonly pollIntervalMs = 500;

    constructor(
        private readonly logger: Logger,
        private readonly scalingService: ScalingService,
        private readonly instanceSettings: InstanceSettings,
    ) {
        this.logger = this.logger.scoped('scaling');
    }

    isDraining(): boolean {
        return this.draining;
    }

    /** Enter drain mode: pause local queue, flip flag, then asynchronously poll for active jobs to reach zero. Idempotent. */
    async enterDrain(): Promise<void> {
        this.assertWorker();
        if (this.draining) return;

        this.draining = true;
        this.logger.info('[Worker] Drain signal received. Stopping new job intake.');

        await this.scalingService.pauseLocalQueue();

        // Fire-and-forget watcher — does not block the signal handler.
        void this.watchForActiveJobsToFinish();
    }

    /** Exit drain mode: resume local queue, flip flag. Logs a warning and no-ops if not currently draining. */
    async exitDrain(): Promise<void> {
        this.assertWorker();
        if (!this.draining) {
            this.logger.warn('[Worker] Resume signal received but worker is not draining. No-op.');
            return;
        }

        await this.scalingService.resumeLocalQueue();
        this.draining = false;
        this.logger.info('[Worker] Resume signal received. Accepting new jobs.');
    }

    /** Block until all active jobs have finished or the deadline expires. Used by the SIGTERM-drain flow. */
    async waitForActiveJobsToFinish(deadlineMs: number): Promise<void> {
        const start = Date.now();
        while (this.scalingService.getRunningJobsCount() > 0) {
            if (Date.now() - start >= deadlineMs) return;
            await sleep(this.pollIntervalMs);
        }
    }

    private async watchForActiveJobsToFinish(): Promise<void> {
        while (this.draining && this.scalingService.getRunningJobsCount() > 0) {
            await sleep(this.pollIntervalMs);
        }
        if (this.draining) {
            this.logger.info('[Worker] Drain complete. No active executions remaining.');
        }
    }

    private assertWorker() {
        if (this.instanceSettings.instanceType !== 'worker') {
            throw new UnexpectedError('WorkerDrainService is only valid on a worker instance');
        }
    }
}
```

**Why the watcher is fire-and-forget:** Signal handlers must return promptly. Polling the running-job count happens in the background; the "Drain complete" log fires when it reaches zero. If the user issues SIGUSR1 before active jobs finish, `draining` flips to false and the watcher exits its loop without logging "Drain complete" (correct: drain was cancelled).

**Why a separate `waitForActiveJobsToFinish`:** the SIGTERM-drain path needs to await job completion synchronously (with a deadline), while the SIGUSR2 watcher is fire-and-forget. Two methods keeps both clean.

### Step 4 — Wire readiness endpoint to drain state

**File:** `packages/cli/src/scaling/worker-server.ts`

Inject `WorkerDrainService` (constructor) and modify `readiness` to short-circuit when draining:

```ts
// added import
import { WorkerDrainService } from './worker-drain.service';

// in constructor parameters (append at end to avoid reordering existing params)
private readonly workerDrainService: WorkerDrainService,

// modified readiness handler
private async readiness(_req: express.Request, res: express.Response) {
    if (this.workerDrainService.isDraining()) {
        return res.status(503).send({ status: 'draining' });
    }

    const { connectionState } = this.dbConnection;
    const isReady =
        connectionState.connected &&
        connectionState.migrated &&
        this.redisClientService.isConnected() &&
        this.fullyReady;

    return isReady
        ? res.status(200).send({ status: 'ok' })
        : res.status(503).send({ status: 'error' });
}
```

**Why append the constructor param at the end:** preserves DI ordering for any code that constructs `WorkerServer` manually (rare; only test code does, and we update it).

### Step 5 — Register signal handlers and (optional) SIGTERM override in Worker

**File:** `packages/cli/src/commands/worker.ts`

Two changes:

(a) **Inject `WorkerDrainService` and register SIGUSR1/SIGUSR2** in `init()` after the call to `super.init()` (so base-class SIGTERM/SIGINT registration has already happened):

```ts
// new imports (alphabetized into existing block)
import { WorkerDrainService } from '@/scaling/worker-drain.service';

// new private field
private workerDrainService: WorkerDrainService;

// inside init(), after super.init() and after initScalingService()
this.workerDrainService = Container.get(WorkerDrainService);

if (!inTest) {
    process.on('SIGUSR2', () => {
        void this.workerDrainService.enterDrain();
    });
    process.on('SIGUSR1', () => {
        void this.workerDrainService.exitDrain();
    });
}
```

Use `process.on` (not `process.once`) so a worker can be drained, resumed, and re-drained without restart.

The `inTest` guard mirrors the existing pattern at `worker.ts:201`.

(b) **Optional SIGTERM-drain hook** — override `onTerminationSignal` from `base-command.ts:343`:

```ts
// override in Worker class
protected onTerminationSignal(signal: string) {
    const baseHandler = super.onTerminationSignal(signal);

    if (signal !== 'SIGTERM' || !this.globalConfig.queue.bull.drainOnSigterm) {
        return baseHandler;
    }

    return async () => {
        if (this.shutdownService.isShuttingDown()) return baseHandler();

        // Cap the drain budget so we still leave runway for the shutdown teardown.
        const drainBudgetMs = Math.floor(this.gracefulShutdownTimeoutInS * 1000 * 0.5);

        try {
            await this.workerDrainService.enterDrain();
            await this.workerDrainService.waitForActiveJobsToFinish(drainBudgetMs);
        } catch (error) {
            this.logger.error('Drain-on-SIGTERM failed; proceeding with regular shutdown', { error });
        }

        await baseHandler();
    };
}
```

**Why call `super.onTerminationSignal(signal)` at all:** it captures the existing closure with its `forceShutdownTimer` and shutdown-service orchestration, so we don't duplicate that logic.

**Why the 0.5 multiplier:** the base handler arms a force-shutdown timer at `gracefulShutdownTimeoutInS` from when it begins. If we burn the entire budget in drain, the base handler has zero runway for `shutdownService.waitForShutdown()` and teardown. Half-and-half is a defensible default; we will surface this as a tunable later if needed.

**Why we still need `enterDrain()` here even though `ScalingService.stop()` will pause again:** `ScalingService.stop()` runs after `shutdownService.shutdown()` is called by `super.onTerminationSignal`. The whole point of drain-on-SIGTERM is to flip readiness to 503 *before* shutdown begins, so K8s sees "not ready" and stops sending work earlier. The double-pause is harmless (idempotent on Bull).

### Step 6 — Add tests

#### 6a. WorkerDrainService unit tests

**New file:** `packages/cli/src/scaling/__tests__/worker-drain.service.test.ts`

Cover:
- `enterDrain` on worker: calls `scalingService.pauseLocalQueue`, sets `isDraining()` true, logs the exact info message.
- `enterDrain` is idempotent: second call does not call pause again.
- `enterDrain` on non-worker: throws `UnexpectedError` (mock `instanceSettings.instanceType = 'main'`).
- `exitDrain` when draining: calls `resumeLocalQueue`, sets flag false, logs info.
- `exitDrain` when not draining: does not call resume, logs warning (no-op).
- `waitForActiveJobsToFinish` returns when count hits 0; respects deadline.
- `watchForActiveJobsToFinish` (indirectly via `enterDrain`): logs "Drain complete" once running count reaches 0. Use `jest.useFakeTimers()` and a stubbed `getRunningJobsCount` that returns 2 → 1 → 0 over polls.

#### 6b. ScalingService new methods

**File:** `packages/cli/src/scaling/__tests__/scaling.service.test.ts` (extend existing file)

Add a `describe('pauseLocalQueue / resumeLocalQueue', ...)` block:
- On worker: `pauseLocalQueue` calls `queue.pause(true, true)`.
- On worker: `resumeLocalQueue` calls `queue.resume(true)`.
- On main: each throws `UnexpectedError` (asserts the worker guard).

#### 6c. WorkerServer readiness during drain

**File:** `packages/cli/src/scaling/__tests__/worker-server.test.ts` (extend existing file)

- Add `workerDrainService` to the `newWorkerServer` factory and to `WorkerServer` constructor calls.
- New tests inside the existing `describe('readiness', ...)` block:
  - When `workerDrainService.isDraining()` returns `true`, status is 503 and body is `{ status: 'draining' }` (even with DB+Redis healthy and `markAsReady()` called).
  - When `isDraining()` returns `false`, status is 200 (preserves existing test).
  - The ordering matters: drain check is short-circuit first, asserted by leaving DB disconnected and asserting `{ status: 'draining' }` (not `{ status: 'error' }`).

#### 6d. Worker SIGTERM-drain integration (lightweight)

**File:** new `packages/cli/src/commands/__tests__/worker.test.ts` (or extend if one exists — check first)

We don't need a full Worker harness. Instead, unit-test the `onTerminationSignal` override in isolation:
- Construct a Worker, stub `globalConfig.queue.bull.drainOnSigterm = true`, stub `workerDrainService.enterDrain` and `waitForActiveJobsToFinish`, stub `super.onTerminationSignal` via spy on `BaseCommand.prototype`.
- Call the returned handler. Assert: enterDrain called, waitForActiveJobsToFinish called with `drainBudgetMs ≈ gracefulShutdownTimeoutInS * 1000 / 2`, then base handler is invoked.
- With `drainOnSigterm = false`: returned handler is the base handler (assert reference equality on `super.onTerminationSignal`'s return value).
- With `signal !== 'SIGTERM'`: same as `drainOnSigterm = false`.

### Step 7 — Documentation

**New file:** `docs/worker-drain.md`

Sections (per the user's prompt):
- **What it does** — the three goals (KEDA scale-down, rolling deploys, manual maintenance).
- **Signal behavior table:**

  | Signal | Behavior |
  |---|---|
  | `SIGUSR2` | Enter drain — pause local Bull consumption, readiness 503, log progress, do not exit |
  | `SIGUSR1` | Exit drain — resume local Bull consumption, readiness 200; warning if not draining |
  | `SIGTERM` (drain disabled, default) | Existing graceful shutdown unchanged |
  | `SIGTERM` with `N8N_WORKER_DRAIN_ON_SIGTERM=true` | Drain first, wait up to half of graceful shutdown timeout, then proceed with regular shutdown |

- **Env var**: `N8N_WORKER_DRAIN_ON_SIGTERM` (default `false`).
- **Kubernetes preStop example:**

  ```yaml
  lifecycle:
    preStop:
      exec:
        command: ["kill", "-USR2", "1"]
  ```

- **Readiness behavior during drain** — body changes from `{ "status": "ok" }` / `{ "status": "error" }` to `{ "status": "draining" }`. K8s will mark the pod NotReady; KEDA-style controllers can use this as the cue to scale down.
- **Local-only pause caveat** — `queue.pause(true, true)` only stops *this* worker; other workers on the same Redis queue continue consuming.

### Step 8 — Skip CHANGELOG.md

The repo's `CHANGELOG.md` is auto-generated from Angular-format PR titles (every entry in the existing file links back to a PR). No manual edit is needed. The PR title becomes the changelog line.

**Proposed PR title:** `feat(core): Add worker drain mode via SIGUSR1/SIGUSR2 signals`

## Verification Steps

Run from each affected package directory (per `AGENTS.md`):

1. `cd packages/@n8n/config && pnpm typecheck && pnpm test` — config schema change.
2. `cd packages/cli && pnpm test src/scaling/__tests__/worker-drain.service.test.ts` — new service.
3. `cd packages/cli && pnpm test src/scaling/__tests__/scaling.service.test.ts` — pause/resume helpers + existing tests still pass.
4. `cd packages/cli && pnpm test src/scaling/__tests__/worker-server.test.ts` — readiness drain branch + existing readiness tests pass.
5. `cd packages/cli && pnpm test src/commands/__tests__/worker.test.ts` — SIGTERM override.
6. `cd packages/cli && pnpm typecheck && pnpm lint` — full package check.
7. From repo root, before PR: `pnpm build > build.log 2>&1 && tail -n 20 build.log` — verify no cross-package type breakage from the `@n8n/config` addition.

Manual smoke test (optional, requires local queue mode):

```sh
# Terminal A
N8N_WORKER_SERVER_ADDRESS=127.0.0.1 QUEUE_HEALTH_CHECK_ACTIVE=true \
  pnpm --filter n8n start worker

# Terminal B
curl -s http://127.0.0.1:5678/healthz/readiness   # → {"status":"ok"}
kill -USR2 <worker-pid>
curl -s http://127.0.0.1:5678/healthz/readiness   # → {"status":"draining"} HTTP 503
kill -USR1 <worker-pid>
curl -s http://127.0.0.1:5678/healthz/readiness   # → {"status":"ok"}
```

## Risks & Mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| `process.on('SIGUSR2')` collides with Node's debugger trigger | Low (Node only listens for SIGUSR1 by default for debugger; we own SIGUSR2) | Use `SIGUSR2` for drain (the user's spec) and `SIGUSR1` for resume — Node's debugger uses SIGUSR1 only when `--inspect` flag is set, which is not the case in production worker images. Document this in `docs/worker-drain.md`. |
| `queue.pause(true, true)` semantics differ from expected | Low | Already in production use at `scaling.service.ts:165`; existing tests pin behavior at `scaling.service.test.ts:206`. We verify Bull v4.16.4 signature (`pause(isLocal?, doNotWaitActive?): Promise<void>`) via the existing call site. |
| Drain-on-SIGTERM exhausts full budget, leaving none for shutdown teardown | Medium | Cap drain wait at 50% of `gracefulShutdownTimeoutInS`; the base handler still arms a hard force-quit timer at the full timeout from when shutdown begins. |
| Watcher continues polling forever if running count never reaches 0 (e.g., a stuck job) | Low | Watcher exits when `draining` flips to `false` (SIGUSR1 or process exit). No memory growth — single in-flight async function. |
| Tests construct `WorkerServer` with a new constructor param ordering | Medium (existing test code) | Append the new `workerDrainService` param to the end of the constructor signature to avoid reordering, and update both the in-test factory `newWorkerServer()` and any `mockInstance` calls accordingly. |
| `process.on` is registered every time `init()` runs (unlikely in real life, possible in tests) | Low | Use `process.on` once with a guard (`!inTest`); commands run once per process. The existing SIGTERM/SIGINT in base-command use `process.once` for the same single-invocation reason. |
| Env var addition requires a snapshot test update | Low | Search `packages/@n8n/config` for any test that enumerates `BullConfig` fields or env var lists; update accordingly when adding `drainOnSigterm`. |
| Changelog auto-generation could miss the entry | Low | The Angular-format PR title (`feat(core): ...`) is what the auto-generator picks up. We confirm the type is `feat` (per `pull_request_title_conventions.md` "appears in changelog: ✅"). |

## Out of Scope

Explicitly NOT in this PR (mention in the PR description as follow-ups):

- A POST endpoint to trigger drain via HTTP (signals are cleaner for K8s preStop hooks).
- Tunable drain wait budget (we ship a fixed 50% split; expose if a user reports it too tight/loose).
- A drain-status field on `/metrics` Prometheus output (could be added later via `PrometheusMetricsService`).
- Cancelling a running job during drain (drain by definition lets jobs finish; killing them is what SIGTERM is for).

## File Change Summary

| File | Type | Purpose |
|---|---|---|
| `packages/@n8n/config/src/configs/scaling-mode.config.ts` | modify | Add `N8N_WORKER_DRAIN_ON_SIGTERM` env on `BullConfig` |
| `packages/cli/src/scaling/scaling.service.ts` | modify | Add `pauseLocalQueue()` and `resumeLocalQueue()` public methods |
| `packages/cli/src/scaling/worker-drain.service.ts` | new | `@Service()` holding drain state + watcher |
| `packages/cli/src/scaling/worker-server.ts` | modify | Inject `WorkerDrainService`, branch readiness on `isDraining()` |
| `packages/cli/src/commands/worker.ts` | modify | Register SIGUSR1/SIGUSR2; override `onTerminationSignal` for SIGTERM-drain |
| `packages/cli/src/scaling/__tests__/worker-drain.service.test.ts` | new | Unit tests for the new service |
| `packages/cli/src/scaling/__tests__/scaling.service.test.ts` | modify | Add tests for new pause/resume helpers |
| `packages/cli/src/scaling/__tests__/worker-server.test.ts` | modify | Add `workerDrainService` mock + drain-branch readiness tests |
| `packages/cli/src/commands/__tests__/worker.test.ts` | new (or extend if exists) | Test the SIGTERM override |
| `docs/worker-drain.md` | new | Feature documentation |
