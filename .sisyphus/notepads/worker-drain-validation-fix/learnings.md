2026-05-09: Worker drain docs must point Kubernetes preStop at the main n8n REST API, not the worker-local server. Verified route shape from `@RestController('/orchestration')` plus the default REST mount, so the public default path is `/rest/orchestration/worker/:workerId/drain`. The worker server only exposes worker-local endpoints like health checks, not orchestration drain routes.

- `WorkerDrainService.enterDrain()` now needs an in-flight promise guard so concurrent drain signals share one pause attempt and only set `draining` after `pauseLocalQueue()` resolves.
- In this shell, `pnpm` was unavailable directly; `corepack pnpm` worked for the targeted unit test run.
- Targeted verification for `worker-drain.service.test.ts`, package typecheck, and docs regression grep all passed with exit code 0.
