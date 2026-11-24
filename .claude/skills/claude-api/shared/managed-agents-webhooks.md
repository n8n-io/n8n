# Managed Agents - Webhooks

Anthropic can POST to your HTTPS endpoint when a Managed Agents resource changes state - an alternative to holding an SSE stream or polling. Payloads are **thin** (event type + resource IDs only); on receipt, fetch the resource for current state. Every delivery is HMAC-signed.

> **Direction matters.** This page covers *Anthropic -> you* notifications about session/vault state. It does **not** cover *third-party -> you* webhooks that *trigger* a session (e.g. a GitHub push handler that calls `sessions.create()`) - that's ordinary application code on your side with no Anthropic-specific wire format.

---

## Register an endpoint (Console only)

Console -> **Manage -> Webhooks**. There is no programmatic endpoint-management API yet. Secret rotation is supported from the same page.

| Field | Constraint |
|---|---|
| URL | HTTPS on port 443, publicly resolvable hostname |
| Event types | Subscribe per `data.type` - an endpoint receives only the types it is subscribed to |
| Signing secret | `whsec_`-prefixed, 32 bytes, **shown once at creation** - store it |

---

## Verify the signature

Every delivery carries the `webhook-id`, `webhook-timestamp`, and `webhook-signature` headers. **Use the SDK's `client.beta.webhooks.unwrap()`** - it verifies the signature, rejects payloads more than ~5 minutes old, and returns the parsed event. It reads the `whsec_` secret from `ANTHROPIC_WEBHOOK_SIGNING_KEY`. Pass the headers through untouched; don't hand-roll verification against a single `X-Webhook-Signature` header, which is not the wire format.

```python
import anthropic
from flask import Flask, request

client = anthropic.Anthropic()  # reads ANTHROPIC_WEBHOOK_SIGNING_KEY from env
app = Flask(__name__)


@app.route("/webhook", methods=["POST"])
def webhook():
    try:
        event = client.beta.webhooks.unwrap(
            request.get_data(as_text=True),
            headers=dict(request.headers),
        )
    except Exception:
        return "invalid signature", 400

    if event.id in seen_event_ids:  # dedupe retries - id is per-event, not per-delivery
        return "", 204
    seen_event_ids.add(event.id)

    match event.data.type:
        case "session.status_idled":
            session = client.beta.sessions.retrieve(event.data.id)
            notify_user(session)
        case "vault_credential.refresh_failed":
            alert_oncall(event.data.id)

    return "", 204
```

Pass the **raw request body** to `unwrap()` - frameworks that re-serialize JSON (Express `.json()`, Flask `.get_json()`) change the bytes and break the MAC. For other languages, look up the `beta.webhooks.unwrap` binding in the SDK repo (`shared/live-sources.md`); don't hand-roll verification.

---

## Payload envelope

```json
{
  "type": "event",
  "id": "whe_9d5c1f7e...",
  "created_at": "2026-03-18T14:05:22Z",
  "data": {
    "type": "session.status_idled",
    "id": "session_01XYZ...",
    "organization_id": "8a3d2f1e-...",
    "workspace_id": "c7b0e4d9-..."
  }
}
```

Switch on `data.type`, fetch the resource by `data.id`, return any **2xx** to acknowledge. `created_at` is when the *event occurred*, not when the delivery was attempted - the `webhook-timestamp` header is the clock for the attempt (see Delivery behavior).

The top-level `id` is the same value as the `webhook-id` header, and it is per *event*, not per delivery - every retry carries it unchanged. Dedupe on it.

---

## Supported `data.type` values

| `data.type` | Fires when |
|---|---|
| `session.status_scheduled` | Session created and ready to accept events |
| `session.status_run_started` | Agent execution kicked off (every transition to `running`) |
| `session.status_idled` | Agent awaiting input (tool approval, custom tool result, or next message) - or paused at its session budget. The webhook payload is thin - list the session's events and check the latest `session.status_idle` event's `stop_reason` (the session object itself has no `stop_reason` field): if it is `budget_reached`, further `user.message` events return a 400 and only a budget change/removal resumes the session (`shared/managed-agents-core.md` § Session budgets) |
| `session.status_rescheduled` | A transient error occurred; the session is retrying automatically |
| `session.status_terminated` | Session ended - **on completion or on error**, not error-only |
| `session.thread_created` | Multiagent: coordinator opened a new subagent thread, or the session's advisor is being consulted (`shared/managed-agents-multiagent.md` -> Advisor) |
| `session.thread_idled` | Child threads only: a subagent thread is waiting for input - or paused because the session reached its budget cap. When the whole session pauses at the cap, a `session.status_idled` webhook also fires and the stream's `session.status_idle` event carries `stop_reason: budget_reached` - unless another thread is waiting on a tool ask, which outranks the cap at the session level (`shared/managed-agents-core.md` § Session budgets). |
| `session.thread_terminated` | A thread ended - child completed its work, or the thread was archived. **Child threads only**; the primary thread's end surfaces as `session.status_terminated` |
| `session.outcome_evaluation_ended` | Outcome grader finished one iteration |
| `session.updated` | Session properties changed (name, configuration) |
| `session.deleted` | Session permanently deleted - no object left to fetch; treat the event itself as final |
| `vault.archived` | Vault was archived |
| `vault.created` | Vault was created |
| `vault.deleted` | Vault was deleted - a `vault_credential.deleted` also fires per underlying credential. No object left to fetch; treat the event itself as final |
| `vault_credential.archived` | Credential archived, directly or via vault archival |
| `vault_credential.created` | Vault credential was created |
| `vault_credential.deleted` | Credential deleted, directly or via vault deletion. No object left to fetch; treat the event itself as final |
| `vault_credential.refresh_failed` | MCP OAuth vault credential failed to refresh |
| `agent.created` | Agent created |
| `agent.updated` | A new agent version was published. Updates that do not create a new version do **not** fire this. |
| `agent.archived` | Agent archived |
| `agent.deleted` | Agent permanently deleted - no object left to fetch; treat the event itself as final |
| `deployment.created` | Scheduled deployment created |
| `deployment.updated` | Deployment properties changed (e.g. schedule edited) |
| `deployment.paused` | Deployment paused - by request, or automatically when a scheduled run fails with a **non-recoverable** error (archived agent, missing environment). Recoverable failures, including rate limits, do **not** auto-pause. |
| `deployment.unpaused` | Deployment unpaused; schedule resumes |
| `deployment.archived` | Deployment archived - directly, or as a result of agent archival/deletion |
| `deployment.deleted` | Deployment permanently deleted - no object left to fetch; treat the event itself as final |
| `deployment_run.started` | A **scheduled** run started. Manual runs do **not** emit `deployment_run.*` events. |
| `deployment_run.succeeded` | Scheduled run created its session. Same `data.id` (the run ID) as the run's `.started` event - fetch the deployment run for its `session_id`, then subscribe to the session events to follow the work. |
| `deployment_run.failed` | Scheduled run did not create a session. Same `data.id` as the run's `.started` event - fetch the deployment run for `error.type` / `error.message`. |
| `environment.created` | Environment created |
| `environment.updated` | Environment updated with at least one changed field. A no-op update emits nothing. |
| `environment.archived` | Environment archived. Re-archiving an already-archived environment emits nothing. |
| `environment.deleted` | Environment deleted, including delete of an already-archived one. No object left to fetch; treat the event itself as final |
| `memory_store.created` | Memory store created - by you, or by an Anthropic-operated process that clones one of your stores |
| `memory_store.archived` | Memory store archived. Re-archiving an already-archived store emits nothing. |
| `memory_store.deleted` | Memory store deleted, including delete of an already-archived one. Cascades to its memories and versions **without** per-memory events - this single event is the signal. No object left to fetch; treat it as final |

> **There is deliberately no `memory_store.updated`.** Individual memories and memory versions emit no webhook events at all, and neither do an environment's self-hosted work items. If you need per-memory change tracking, poll the memory-versions endpoints (`shared/managed-agents-memory.md`).

> These are **webhook** `data.type` values - a separate namespace from SSE event types (`session.status_idle`, `span.outcome_evaluation_end`, etc. in `shared/managed-agents-events.md`). Don't reuse SSE constants in webhook handlers.

---

## Delivery behavior & pitfalls

- **Duplicates.** An endpoint can receive the same event more than once; every attempt carries the same top-level `event.id` (= the `webhook-id` header). Dedupe on it.
- **Subscription scope.** An event reaches only endpoints subscribed to its type **at the moment it is emitted**. An event emitted while nothing was subscribed is never delivered, and subscribing later does not backfill - subscribe before you need the type.
- **No ordering guarantee.** Events are not delivered in occurrence order: `session.status_idled` may arrive before `session.outcome_evaluation_ended`, and a `.deleted` can arrive before the `.archived` for the same resource. **Drive state from the resource you fetch, not from arrival order.**
- **Retries: up to three attempts** per endpoint per event, with jittered exponential backoff between 5 and 120 seconds. A response that triggers auto-disable is never retried. **After the last attempt fails the event is dropped** - not queued, and with no signal that it was lost. Webhooks are not a durable log: if you must observe every transition, reconcile by listing or fetching the resource.
- **`webhook-timestamp` is re-stamped on every attempt**, so retries don't fail the SDK's five-minute freshness check. It times the *delivery attempt*; use the payload's `created_at` for when the event occurred.
- **Auto-disable - three triggers**, each setting `disabled_reason`, all reversible from Console (events emitted while disabled are **not** replayed):
  - A `3xx` response. Redirects are never followed; disables immediately, on the first attempt. Reason: `auto-disabled: endpoint URL returned a redirect (3xx)`.
  - The URL resolves to a non-public IP at connect time. Disables immediately. Reason: `auto-disabled: endpoint URL resolved to an invalid address`.
  - Continuous failure for a sustained period. Reason: `auto-disabled after sustained delivery failures`. **The trigger is duration, not a delivery count** - a single `2xx` resets the window, so one flaky event can't disable the endpoint.
- **Thin payload is intentional.** Don't expect `stop_reason` (list the session's events for that - the session object has no `stop_reason` field), `outcome_evaluations`, credential secrets, etc. on the webhook body - fetch the resource.
