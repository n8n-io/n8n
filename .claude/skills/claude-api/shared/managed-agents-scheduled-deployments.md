# Managed Agents - Scheduled Deployments

A **scheduled deployment** runs an agent on a recurring cron schedule - each firing creates a session autonomously. Use it for predictable-cadence work: nightly triage, weekly compliance scans, hourly monitors.

Requires the `managed-agents-2026-04-01` beta header (the SDK sets it automatically for `client.beta.deployments.*` / `client.beta.deployment_runs.*` calls).

## Create a deployment

A deployment bundles everything a session needs (agent, environment, optional files / GitHub / memory stores / vaults) plus a `schedule` and the `initial_events` that kick off each run:

- `agent` and `environment_id` are required - same shapes as `sessions.create` (see `shared/managed-agents-core.md`). A deployment targeting a **self-hosted** environment can attach `memory_store` resources (SDK worker required - `shared/managed-agents-self-hosted-sandboxes.md` § Memory stores); `file` and `github_repository` resources need a cloud environment. The Console deployment form doesn't offer memory stores for self-hosted environments - attach them via the API/SDK.
- `initial_events` must contain at least one starting event - a `user.message` **or** a `user.define_outcome`. Same default as sessions: a scheduled run whose job is one deliverable (the weekly report, the compliance scan's findings file, a dataset) starts with `user.define_outcome` plus a drafted starter rubric (`shared/managed-agents-outcomes.md`); use `user.message` when the run is conversational or has no checkable output. A run whose work is changing records in outside systems (filing, escalating or closing tickets) also starts with `user.message`, since there is no artifact for the grader to score; a run that produces a report, a dataset or a PR keeps its outcome, even if it then emails or posts it. (A deployment's `initial_events` also accepts `system.message`, which a session's does not.)
- `schedule` takes a cron `expression` and an IANA `timezone`. Minute-level granularity is the maximum.

```bash
curl -fsSL https://api.anthropic.com/v1/deployments \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "anthropic-beta: managed-agents-2026-04-01" \
  -H "content-type: application/json" \
  -d @- <<EOF
{
  "name": "Weekly compliance scan",
  "agent": "$AGENT_ID",
  "environment_id": "$ENVIRONMENT_ID",
  "initial_events": [
    {"type": "user.message", "content": [{"type": "text", "text": "Run the weekly compliance scan."}]}
  ],
  "schedule": {
    "type": "cron",
    "expression": "0 20 * * 5",
    "timezone": "America/New_York"
  }
}
EOF
```

```python
deployment = client.beta.deployments.create(
    name="Weekly compliance scan",
    agent=agent.id,
    environment_id=environment.id,
    initial_events=[
        {
            "type": "user.message",
            "content": [{"type": "text", "text": "Run the weekly compliance scan."}],
        },
    ],
    schedule={
        "type": "cron",
        "expression": "0 20 * * 5",
        "timezone": "America/New_York",
    },
)
```

The response is a deployment object (`depl_` ID prefix). Check `schedule.upcoming_runs_at` - the next fire times - to confirm the schedule parses the way you intended:

```json
{
  "id": "depl_01xyz",
  "status": "active",
  "paused_reason": null,
  "schedule": {
    "type": "cron",
    "expression": "0 20 * * 5",
    "timezone": "America/New_York",
    "last_run_at": null,
    "upcoming_runs_at": ["2026-05-09T00:00:00Z", "2026-05-16T00:00:00Z", "2026-05-23T00:00:00Z"]
  }
}
```

`upcoming_runs_at` reflects the exact configured schedule, but **execution is jittered to distribute load: up to 15% of the interval between runs, floored at 5 seconds and capped at 9 minutes.** An hourly deployment can therefore fire up to 9 minutes late; don't build a downstream deadline that assumes the listed timestamp. Maximum **1000 scheduled deployments per organization** (contact Anthropic support for more).

### Cron and timezone semantics

- **Expression:** standard POSIX cron (`minute hour day-of-month month day-of-week`).
- **Timezone:** IANA identifier (e.g. `"America/Los_Angeles"`).
- **DST:** literal wall-clock matching - `"0 20 * * *"` in `America/New_York` fires at 8:00 PM local regardless of EST/EDT.

> Warning: **DST edge:** wall-clock times that don't exist on a spring-forward day (e.g. 2AM) are **skipped**; times that occur twice on a fall-back day **fire twice**. Schedule outside the 1-3AM local window, or use UTC, when missed or duplicate executions are unacceptable.

## Deployment budgets

A deployment accepts the same `budget` object as a session (`{type: "limit", max_list_cost: {amount, currency}}` - minor-unit cents string, `USD` only; see `shared/managed-agents-core.md` § Session budgets). The cap is **copied onto each session at fire time**, and that session then behaves exactly like any budgeted session.

Deployment budget update semantics differ from a session's:

- `budget` is accepted on **create and update** - it is not create-only.
- `budget: null` on update **clears** it, and a cleared budget **can be re-added later** - there is no one-way door.
- A change applies **from the next fired session** - sessions already running keep the cap they were created with (change those via their own session update).

## Deployment runs

Every trigger attempt - successful or not - writes a **deployment run** record (`drun_` prefix), so you can audit failures independent of the session lifecycle. A successful run carries the created `session_id`; follow that session via the event stream (`shared/managed-agents-events.md`) or webhooks (`shared/managed-agents-webhooks.md`) as usual. No client is attached when a run fires, so answer calls that pause for approval (`auto` with no determination, or `always_ask`, the MCP default) from a `session.status_idled` webhook handler, or the run waits indefinitely. A failed run carries an `error` whose `type` explains why session creation was rejected.

```python
# All runs for a deployment
for run in client.beta.deployment_runs.list(deployment_id=deployment.id):
    print(run.created_at, run.session_id or run.error.type)

# Failures only
for run in client.beta.deployment_runs.list(deployment_id=deployment.id, has_error=True):
    print(run.created_at, run.error.type, run.error.message)
```

```typescript
for await (const run of client.beta.deploymentRuns.list({
  deployment_id: deployment.id,
  has_error: true,
})) {
  console.log(run.created_at, run.error?.type, run.error?.message);
}
```

Raw HTTP: `GET /v1/deployment_runs?deployment_id=...&has_error=true`. To retrieve a single run by ID, `GET /v1/deployment_runs/{deployment_run_id}` (SDK: `client.beta.deployment_runs.retrieve(run_id)`) - a `deployment_run.*` webhook event carries the run ID as its `data.id`.

A failed run looks like:

```json
{
  "type": "deployment_run",
  "id": "drun_01abc124",
  "deployment_id": "depl_01xyz",
  "trigger_context": { "type": "schedule", "scheduled_at": "2026-05-09T00:00:00Z" },
  "session_id": null,
  "error": { "type": "environment_archived", "message": "environment `env_01abc` is archived" },
  "agent": { "type": "agent", "id": "agent_01ghi789", "version": 3 },
  "created_at": "2026-05-09T00:00:01Z"
}
```

Error types include `environment_archived`, `agent_archived`, `vault_not_found`, `session_rate_limited`, and `service_unavailable`.

The outcome of each **scheduled** run (started/succeeded/failed) and each deployment lifecycle change (created/updated/paused/unpaused/archived/deleted) is also delivered as a webhook event - see `shared/managed-agents-webhooks.md` for the `deployment.*` and `deployment_run.*` event types - so you can react without polling. Manual runs do **not** emit `deployment_run.*` webhook events.

## Lifecycle: pause / unpause / archive

| Operation | SDK | Effect |
|---|---|---|
| Pause | `client.beta.deployments.pause(id)` | Suppresses scheduled triggers go-forward. Sessions already running continue. **Manual runs are still permitted while paused.** Sets `paused_reason: {"type": "manual"}`. |
| Unpause | `client.beta.deployments.unpause(id)` | Resumes from the next scheduled occurrence. **Missed triggers are not backfilled.** Clears `paused_reason`. |
| Archive | `client.beta.deployments.archive(id)` | **Terminal** - the schedule stops and the deployment can no longer be modified. Use pause for anything reversible. |

Raw HTTP: `POST /v1/deployments/{deployment_id}/pause` (likewise `/unpause`, `/archive`).

### Failure behavior

- **Rate-limited:** recorded immediately as a `session_rate_limited` run, **no retry** - the schedule simply tries again at the next occurrence. (Rate limits on API calls *inside* a session are handled by the session itself.)
- **Other failed runs** (e.g. `environment_archived`, `vault_not_found`, `service_unavailable`): the run records the `error.type` - monitor runs and fix the referenced resource, or pause the deployment.
- **Agent archived:** the deployment is automatically **archived** (terminal) in the same operation. **Agent deleted:** the next scheduled trigger detects the missing agent and archives the deployment then. Either way no deployment run is recorded, and no further sessions are created.

## Manual runs

`POST /v1/deployments/{deployment_id}/run` (SDK: `client.beta.deployments.run(id)`) creates a session immediately and writes a run with `trigger_context.type: "manual"`. Use it to **test a deployment before committing to the schedule** - and remember it works even while the deployment is paused.
