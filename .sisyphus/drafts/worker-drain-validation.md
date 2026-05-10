# Draft: Worker Drain Validation

## Requirements (confirmed)
- Validate whether the current branch approach is the best way to implement graceful shutdown of worker nodes.
- Ensure docs explain the current problem and tradeoffs.
- Provide a local validation test plan, preferably with an E2E path that can replicate worker drain behavior.

## Technical Decisions
- Planning mode only: Prometheus will not edit implementation or docs outside `.sisyphus/`.
- Architecture verdict: local queue pause + readiness 503 + active-job wait is directionally correct, but current branch should not merge until blockers are fixed.
- Recommended Kubernetes guidance: `N8N_WORKER_DRAIN_ON_SIGTERM=true` should be the primary pod-termination path; orchestration API is for explicit operator/admin drain; SIGUSR is legacy/manual fallback.

## Research Findings
- `packages/cli/src/scaling/worker-drain.service.ts:37-47`: `enterDrain()` sets `draining=true` before `pauseLocalQueue()` succeeds, allowing split-brain drain state if pause rejects.
- `packages/cli/src/scaling/worker-server.ts:146-149`: readiness reports HTTP 503 `{status:'draining'}` solely from `workerDrainService.isDraining()`.
- `packages/cli/src/controllers/orchestration.controller.ts:8,27-38`: drain route is mounted on main/web API as `POST /orchestration/worker/:workerId/drain`.
- `packages/cli/src/scaling/worker-server.ts:111-143`: worker-local server mounts health, overwrites, and metrics only; no orchestration route.
- `packages/testing/playwright/package.json`: supports `pnpm test:container:queue`.
- `packages/testing/containers/services/n8n.ts`: starts worker containers with command `worker`, exposes worker port `5679`, enables `QUEUE_HEALTH_CHECK_ACTIVE=true`, and sets `EXECUTIONS_MODE=queue` when workers are present.
- `packages/testing/containers/services/redis.ts`: Redis is automatically provisioned for queue mode.
- `packages/testing/playwright/tests/infrastructure/instance-registry/cluster-membership.spec.ts`: shows `test.use({ capability: { mains, workers } })` and `api.getClusterInfo()` to discover worker `hostId`.

## Local/E2E Test Plan Notes
- Best automated E2E shape: create an infrastructure Playwright spec with `mains: 1`, `workers: 1`, discover worker `hostId` from `/rest/instance-registry`, discover worker readiness URL from `n8nContainer.findContainers(/n8n-worker-1/)` mapped port `5679`, POST `/orchestration/worker/:hostId/drain` on main, then assert worker readiness changes from HTTP 200 to HTTP 503 `{status:'draining'}`.
- Best local manual replication shape: run Redis + main + worker in queue mode, verify worker readiness 200, call drain on main API with valid owner auth and worker hostId, verify worker readiness 503, then verify the old documented worker-local orchestration URL fails.

## Open Questions
- Whether to turn this validation into a full `.sisyphus/plans/*.md` execution plan.

## Scope Boundaries
- INCLUDE: validation, root-cause analysis, local manual replication plan, automated E2E test plan.
- EXCLUDE: direct code, docs, or test implementation by Prometheus.
