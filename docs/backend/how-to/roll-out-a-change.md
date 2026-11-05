---
title: Roll out a change
audience: Backend engineers who ship a change behind a flag or watch it in production
tier: 3
last_reviewed: 2026-11-05
contact: ivov
---

# Roll out a change

A change that passes CI can still fail on real workflows, under real load. This page shows the signals that a running n8n gives you, and a procedure to turn a change on step by step. It also lists what a revert leaves behind.

[Observability and audit](../subsystems/observability.md) explains the event and metric code. [Cloud coupling points](../cloud-coupling.md#the-toggle-systems) explains the toggle systems in more detail.

## Turn on the signals

Most signals are off by default. To try the commands on this page, start the local cluster from [Run queue mode locally](run-queue-mode-locally.md).

### Metrics

`N8N_METRICS=true` adds `GET /metrics` in the Prometheus format. Mains and webhook processes serve it on their HTTP port. A worker serves it on its worker server port, which needs `QUEUE_HEALTH_CHECK_ACTIVE=true`.

With only `N8N_METRICS=true`, you get these families:

- Node.js and process metrics, for example `n8n_process_resident_memory_bytes` and `n8n_nodejs_eventloop_lag_p99_seconds`.
- `n8n_workflow_execution_duration_seconds`, a histogram with the labels `status` and `mode`.
- `n8n_version_info`, `n8n_active_workflow_count`, and, on mains, `n8n_instance_role_leader`.

Other families need their own flag. These are the most useful for backend changes:

| Flag | Metrics | Use it for |
|---|---|---|
| `N8N_METRICS_INCLUDE_QUEUE_METRICS` | `n8n_scaling_mode_queue_jobs_*` | Queue depth, failed jobs, and missed completions in queue mode |
| `N8N_METRICS_INCLUDE_DB_POOL_METRICS` | `n8n_db_pool_*` | Requests that wait for a database connection |
| `N8N_METRICS_INCLUDE_API_ENDPOINTS` | `n8n_http_request_duration_seconds` | Request latency. Add the `N8N_METRICS_INCLUDE_API_*_LABEL` flags to split it by path, method, and status code |
| `N8N_METRICS_INCLUDE_MESSAGE_EVENT_BUS_METRICS` | A counter for each event bus event, for example `n8n_workflow_failed_total` | Counts of workflow, node, and queue events |
| `N8N_METRICS_INCLUDE_SCHEDULER_METRICS` | `n8n_scheduler_*` | The durable scheduler |

`packages/@n8n/config/src/configs/endpoints.config.ts` lists every flag.

> [!WARNING]
> Each main counts the queue metrics on its own. In multi-main, use `max` across mains, not `sum`.

### Health endpoints

| Endpoint | Returns 200 when |
|---|---|
| `/healthz` | The HTTP server is up. It checks nothing else |
| `/healthz/readiness` | The database is connected and migrated, and startup is complete. On a worker, Redis must also be connected |

A main does not check Redis for readiness, even in queue mode. A worker serves both endpoints only with `QUEUE_HEALTH_CHECK_ACTIVE=true`.

### Logs

| Variable | Values |
|---|---|
| `N8N_LOG_LEVEL` | `error`, `warn`, `info`, `debug` |
| `N8N_LOG_OUTPUT` | `console`, `file`, or both, separated by a comma |
| `N8N_LOG_FORMAT` | `text`, or `json` for a log shipper |
| `N8N_LOG_SCOPES` | A list of scopes, for example `scaling,pubsub,multi-main-setup,redis` |

`LOG_SCOPES` in the `@n8n/config` package lists all scopes. The scope filter works only at `N8N_LOG_LEVEL=debug` or with `N8N_LOG_FORMAT=json`. It also hides every line that has no scope. For example, the worker startup recovery logs its warning with no scope, so a filter for `scaling` does not show it.

### The event log

Each process writes its events to a file in the n8n folder, for example `~/.n8n/n8nEventLog.log` on a main and `~/.n8n/n8nEventLog-worker.log` on a worker. Each line is one JSON message, for example `n8n.node.started`. The file exists with or without a license. A license is necessary only to send events to log streaming destinations.

Follow the file to see events as they happen:

```bash
docker exec drills-n8n-main-1 sh -c 'tail -f ~/.n8n/n8nEventLog.log'
```

### Traces and errors

- `N8N_OTEL_ENABLED=true` sends OpenTelemetry traces for workflow and node executions. By default, n8n traces only production executions. The `otel` module README lists the settings.
- `N8N_SENTRY_DSN` sends errors to Sentry. Without it, errors go only to the logs.

## Choose the switch

Each toggle system changes at its own speed. Know the speed before you plan the steps, because it sets how fast you can turn the change off.

| System | Takes effect | To turn it off |
|---|---|---|
| PostHog feature flag | After up to 10 min on the backend, because each process caches flags for each user. In the editor, at the next login or page load | Change the flag in PostHog, then wait for the cache |
| `N8N_FEATURE_FLAG_OVERRIDES` or a dedicated `N8N_..._ENABLED` variable | At the next restart | Change the variable and restart |
| `N8N_ENV_FEAT_*` variable | At the next restart | Unset the variable and restart |
| License flag `feat:*` or `quota:*` | At once on each process, after a `reload-license` pubsub command | Change the license |
| Module enablement | At the next restart | Change `N8N_ENABLED_MODULES` or `N8N_DISABLED_MODULES` and restart |

Three PostHog facts affect a rollout:

- **An instance with `N8N_DIAGNOSTICS_ENABLED=false` never gets PostHog flags.** Only the env overrides apply there.
- **PostHog evaluates a flag for each user**, with the id `<instance id>#<user id>`. Two users on one instance can get different values in a percentage rollout.
- **Each process has its own cache.** For up to 10 min after a change, a main and a worker can disagree.

The `experiments` skill in `.agents/skills/experiments/SKILL.md` covers how to create a PostHog flag. A new flag starts disabled. Do not turn on a rollout as part of the code change.

## Plan the steps

Write the plan before you turn the flag on. Decide the steps, the time at each step, and the signals that stop the rollout. A decision that you make after you see the data is easy to bend.

A good start is 1%, 10%, 50%, and 100%. Keep each step for at least one full weekday, because some defects show only under peak load. These numbers are a starting point, not a rule. Use smaller steps for a change to the execution path, and larger steps for a change that only the editor shows.

## Watch the signals

**Success signals** show that the change does its job. Use the telemetry events of your feature, and split them by the `User is part of experiment` event.

**Stop signals** show that the change does harm. Pick no more than a dozen. For a backend change, start with these:

| Signal | Metric or source |
|---|---|
| Execution failure ratio, for each mode | `n8n_workflow_execution_duration_seconds_count{status="failed"}` against the total |
| Crashed executions | The `crashed` status, and `n8n_scaling_mode_queue_jobs_completion_missed` in queue mode |
| Event loop lag | `n8n_nodejs_eventloop_lag_p99_seconds` |
| Memory | `n8n_process_resident_memory_bytes` |
| Queue depth | `n8n_scaling_mode_queue_jobs_waiting` |
| Database pool | `n8n_db_pool_*` requests that wait |

Compare the group with the change against a control group at the same time. An aggregate hides a small group: a 20% error rate on 5% of instances shows as 1% in the total. Crashes are rare at 1%, so set an absolute limit next to each relative one.

> [!NOTE]
> A backend event with no `user_id` does not reach PostHog. If your group looks empty, check that your events carry a user.

## Roll back

When a stop signal fires, roll back first and find the cause second. Turn the flag off. If the code itself is wrong, revert it and release.

A revert does not undo everything. Before you ship, check each item below against your change:

- **Migrations stay applied.** Old code ignores a migration that it does not know. To undo one, run `n8n db:revert` before the downgrade. See [Write a database migration](write-a-database-migration.md#know-how-n8n-runs-migrations).
- **Rows in a new format stay.** Old code must already read them. Ship the reader one release before the writer.
- **Settings rows and state that a `reload-*` command loaded stay.**
- **Operator overrides stay.** An env variable that forces a flag on keeps it on after you turn the flag off in PostHog.
- **The PostHog cache keeps the old value** for up to 10 min.
- **Telemetry events and browser storage stay.** For example, a dismissed banner stays dismissed.
- **External effects stay.** An identity provider, a webhook caller, or a third-party API can see the change and react to it.

Next to each new gate, write one comment that says what turning it off does. The SCIM opt-in in `packages/cli/src/modules/scim/scim-opt-in.ts` is a good example.

When the rollout reaches 100%, remove the flag. Create the removal ticket when you create the flag.

## Self-check

1. You turn off a PostHog flag. When does a main stop using the new code?
   - A. At once.
   - B. Within about 10 min.
   - C. At the next restart.
2. A self-hosted instance has `N8N_DIAGNOSTICS_ENABLED=false`. Your PostHog rollout is at 100%. Does the instance get the change?
   - A. Yes.
   - B. No, unless an env override turns it on.
   - C. Only for the owner.
3. Your change adds a migration and writes rows in a new format. You revert the code. What stays?
   - A. Nothing.
   - B. The migration and the rows.
   - C. Only the rows.

<details>
<summary>Answers</summary>

1. B. Each process caches flags for 10 min for each user.
2. B. With diagnostics off, n8n does not call PostHog, and only the env overrides apply.
3. B. Old code does not undo migrations, and the rows stay in the new format.

</details>

## Read more

- [Google SRE workbook: Canary releases](https://sre.google/workbook/canarying-releases/)
- [Google SRE book: Reliable product launches at scale](https://sre.google/sre-book/reliable-product-launches/)
- [Martin Fowler: Feature toggles](https://martinfowler.com/articles/feature-toggles.html)
