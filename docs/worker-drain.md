# Worker Drain Mechanism

## What It Does

The worker drain mechanism lets a running n8n worker in queue mode stop accepting new jobs without exiting right away. In-flight executions can finish cleanly before the worker is removed from the cluster.

## Recommended Drain Flow

Use the orchestration API as the primary drain trigger for Kubernetes preStop hooks and similar operator automation:

- **Route:** `POST /rest/orchestration/worker/:workerId/drain` by default, or `POST /${N8N_REST_ENDPOINT}/orchestration/worker/:workerId/drain` when a custom REST base path is configured
- **Required scope:** `workersView:manage`
- **License requirement:** Worker View must be licensed

The drain action is asynchronous and returns HTTP `202` after the worker drain request is accepted.

## Kubernetes preStop Example

Use a preStop hook that calls the main n8n REST API drain endpoint for the current worker before Kubernetes sends `SIGTERM`. The drain API is exposed by the main n8n REST API, not by the worker server.

```yaml
lifecycle:
  preStop:
    exec:
      command:
        - /bin/sh
        - -c
        - |
          curl -X POST \
            -H "Authorization: Bearer ${N8N_API_TOKEN}" \
            "${N8N_MAIN_URL}/${N8N_REST_ENDPOINT:-rest}/orchestration/worker/${N8N_WORKER_ID}/drain"
```

If the worker pod can't reach the main n8n REST API during `preStop`, use `N8N_WORKER_DRAIN_ON_SIGTERM=true` or the legacy local `SIGUSR2` fallback documented below.

How it works:

1. Kubernetes starts pod termination and runs the preStop hook.
2. The hook calls the main n8n REST API at `POST /rest/orchestration/worker/:workerId/drain`, or the configured `/${N8N_REST_ENDPOINT}` base path, which publishes the targeted drain request to the worker.
3. The worker pauses queue consumption and marks itself NotReady, `/healthz/readiness` returns HTTP 503 with `{"status":"draining"}`.
4. In-flight executions continue until they complete or the shutdown timeout expires.
5. Kubernetes then sends `SIGTERM`, which continues the normal graceful shutdown flow.

Set `terminationGracePeriodSeconds` higher than your longest-running workflow execution.

## SIGTERM Drain Guidance

`SIGTERM` behavior is unchanged unless you enable `N8N_WORKER_DRAIN_ON_SIGTERM=true`.

| Signal | Behavior |
|---|---|
| `SIGTERM` with `N8N_WORKER_DRAIN_ON_SIGTERM=false` | Existing graceful shutdown behavior. |
| `SIGTERM` with `N8N_WORKER_DRAIN_ON_SIGTERM=true` | Enter drain first, wait up to half the graceful shutdown timeout for active jobs to finish, then continue the regular shutdown sequence. |

This is useful when you want drain-on-termination behavior without an external drain trigger.

## Legacy Signal Compatibility

Signal-based drain remains available as a compatibility fallback when `N8N_WORKER_DRAIN_SIGNALS_ENABLED=true`.

| Signal | Behavior |
|---|---|
| `SIGUSR2` | Enter drain mode for the local worker process. |
| `SIGUSR1` | Exit drain mode for the local worker process. |

Use this only if you still rely on signal-driven automation. New preStop flows should call the orchestration API instead.

### Legacy preStop Example

```yaml
lifecycle:
  preStop:
    exec:
      command: ["kill", "-USR2", "1"]
```

## Readiness Behavior During Drain

The `/healthz/readiness` endpoint reports the drain status:

- **Normal operation:** HTTP 200 with `{"status":"ok"}`
- **Error state:** HTTP 503 with `{"status":"error"}`
- **Draining:** HTTP 503 with `{"status":"draining"}`

When draining, Kubernetes marks the pod as NotReady so it stops receiving new work.

## Local-Only Pause

Signal-based drain only pauses the specific worker process that receives the signal. Other workers connected to the same Redis queue keep consuming jobs.

## Caveats

- **Node.js debugger conflict:** Node.js uses `SIGUSR1` to start its built-in debugger when `--inspect` is active.
- **Worker instance type only:** Signal handlers are only registered on `worker` instance type.
