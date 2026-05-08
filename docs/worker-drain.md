# Worker Drain Mechanism

## What It Does

The worker drain mechanism enables a running n8n worker (queue mode) to stop accepting new jobs without exiting. This allows in-flight executions to complete cleanly before the worker is removed from the cluster. It is designed for zero-downtime Kubernetes rolling deploys and KEDA-based autoscaling scenarios.

## Signal Behavior

The worker responds to Unix signals to control drain mode:

| Signal | Behavior |
|---|---|
| `SIGUSR2` | **Enter drain** — Pause local Bull queue consumption, readiness endpoint returns HTTP 503 with `{"status":"draining"}`, log drain progress. Process does not exit. |
| `SIGUSR1` | **Exit drain** — Resume local Bull queue consumption, readiness endpoint returns HTTP 200. Logs a warning and no-ops if not currently draining. |
| `SIGTERM` (default) | **Existing graceful shutdown** — Behavior unchanged when `N8N_WORKER_DRAIN_ON_SIGTERM=false` (default). |
| `SIGTERM` with `N8N_WORKER_DRAIN_ON_SIGTERM=true` | **Enter drain, then shutdown** — Automatically trigger drain first, wait up to half the graceful shutdown timeout for active jobs to finish, then proceed with the regular shutdown sequence. |

## Environment Variable

**`N8N_WORKER_DRAIN_ON_SIGTERM`** (default: `false`)

When set to `true`, SIGTERM automatically triggers drain mode before the graceful shutdown sequence begins. This is useful for Kubernetes rolling deploys where you want automatic drain behavior without needing external orchestration.

## Kubernetes Example

Use a preStop hook to send `SIGUSR2` to the worker when Kubernetes begins terminating a pod:

```yaml
lifecycle:
  preStop:
    exec:
      command: ["kill", "-USR2", "1"]
```

**How it works:**

1. Kubernetes initiates pod termination and runs the preStop hook.
2. `kill -USR2 1` sends SIGUSR2 to PID 1 (the worker process), putting it into drain mode.
3. The worker pauses queue consumption and marks itself NotReady (`/healthz/readiness` returns 503).
4. In-flight executions continue until they complete or the timeout expires.
5. After `terminationGracePeriodSeconds`, Kubernetes sends SIGTERM, which proceeds with graceful shutdown.

**Set `terminationGracePeriodSeconds` to a value larger than your longest-running workflow execution.** For example, if workflows typically run 5 minutes, set it to at least 300 seconds.

## Readiness Behavior During Drain

The `/healthz/readiness` endpoint reports the drain status:

- **Normal operation:** Returns HTTP 200 with `{"status":"ok"}`
- **Error state:** Returns HTTP 503 with `{"status":"error"}`
- **Draining:** Returns HTTP 503 with `{"status":"draining"}`

When draining, Kubernetes immediately marks the pod as NotReady, stopping new traffic. KEDA and similar autoscaling controllers use this signal to remove the worker from the pool or prevent new job assignments.

## Local-Only Pause

`SIGUSR2` only pauses the specific worker process that receives the signal. Other workers connected to the same Redis queue continue consuming jobs normally. This is intentional: you can drain workers one at a time for zero-downtime rolling deploys without halting the entire queue.

## Caveats

- **Node.js debugger conflict:** Node.js uses `SIGUSR1` to start its built-in debugger when the `--inspect` flag is active. Do not send `SIGUSR1` to a worker running with `--inspect`.
- **Worker instance type only:** Signal handlers are only registered on `worker` instance type. Main and webhook processes ignore these signals.
