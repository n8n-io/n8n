# Terminal push event delivery guarantee

## Guarantee

**At-least-once delivery of terminal execution events across a client
disconnect that spans the finish.** If a manual execution finishes while the
editor is disconnected (laptop sleep, deploy, network blip), the terminal event
is re-delivered on reconnect without a manual refresh.

Terminal events:

- `executionFinished` — the run reached a completed/terminal status
  (`success`, `error`, `crashed`, `canceled`).
- `executionWaiting` — the run is waiting (Wait/Form node). Terminal *for the
  spinner*: canvas goes from "executing" to idle.

Non-terminal, high-volume streaming events (`nodeExecuteBefore`,
`nodeExecuteAfter`, `nodeExecuteAfterData`) remain **best-effort**. Their final
state is backfilled by the terminal replay plus the frontend reconcile. We do
not make the whole event stream durable.

## Why this is cheap: the durable log already exists

The durable log is the **execution row**. Terminal state is persisted around the
finish regardless of push; the push is a best-effort nudge on top. So this is
not a new message queue — it is "on reconnect, re-deliver terminal truth from
the DB the client missed."

Consequently Lane 1 (REST reconcile on reconnect) and Lane 3 (this push replay)
are the **same idempotent consumer with two producers**.

## Mechanism

### 1. Additive envelope metadata

Terminal events carry an optional `meta` alongside `type`/`data`:

```jsonc
{
  "type": "executionFinished",
  "data": { "executionId": "...", "workflowId": "...", "status": "success" },
  "meta": {
    "eventId": "…",      // per-emission id, for dedup/telemetry
    "ts": "…",           // server emit time, ISO-8601 (server clock only)
    "replayed": true     // present only on a reconnect re-delivery
  }
}
```

Backward-compatible **both directions**: old clients ignore `meta`; a new client
tolerates its absence from an old server. Built by `createTerminalEventMeta()`
so the live-push and replay paths emit an identically shaped envelope.

### 2. WebSocket reconnect handshake (bidirectional transport)

On reconnect, before consuming live events, the client sends:

```jsonc
{ "type": "resume", "data": { "awaiting": ["<executionId>"] } }
```

`awaiting` is the set of executions the client still shows as running — derived
from the single tracked execution on the canvas, so **0-or-1 in practice**
(capped at 50 defensively). For each id the server reads the execution row and:

- **already terminal** → re-delivers the terminal event with `meta.replayed = true`;
- **still running** (`new` / `running` / `unknown`) → sends nothing (live events resume);
- **unknown / pruned** → sends nothing (client falls back to a full REST reconcile);
- **not readable by the requesting user** → sends nothing.

The server then closes the handshake with `{ "type": "resumeComplete", "data": {
"replayed": [...] } }` so the client knows catch-up is done. `replayed` lists the
ids that were re-delivered (informational; the client dedups by `executionId`
regardless).

Implemented in `executions/execution-push-resume.service.ts`, wired for
WebSocket only (`server.ts`, inside the `push.isBidirectional` block).

### 3. SSE (unidirectional transport)

SSE has no client→server channel and emits no `id:` line, so there is no
server-side resume. Recovery **degrades to the frontend REST reconcile**
(`getActiveExecutions` diff), which carries the delivery guarantee on SSE.

## What this deliberately does NOT add

- **No server-side buffer or replay journal** — nothing to size, trim, or leak.
  `awaiting` is 0-or-1 and the durability is the DB.
- **No required acks** — a client MAY ack for telemetry, but a missing ack never
  loses a terminal event; the DB is the durability.
- **No sequence counters, no cross-main shared state.** The client carries the
  id, `pushRef` is stable across reconnects, and the execution row is shared, so
  a reconnect that lands on a **different main** still resolves correctly.

## Client idempotency contract (normative)

- **Idempotency key = `executionId`.** A terminal event/reconcile for an
  execution the client is not tracking is a no-op.
- **Convergent:** the same `(executionId, status)` yields the same final state
  regardless of source (live push / replay / `executionRecovered` / REST
  reconcile) or arrival count. Duplicate toasts are suppressed via `meta.replayed`.
- **Terminal is absorbing per `executionId`:** a late live event must not
  resurrect a cleared spinner.

## Scope boundaries

- **Manual (editor) executions only.** Terminal push is gated on `pushRef`;
  production/trigger runs have no editor session, so they are out by construction.
- **Pending window is out of scope.** When the run has started but no
  `executionId` is assigned yet, there is no id to place in `awaiting[]` and none
  for reconcile to match. That time-bound backstop belongs to the stale-state
  lane, not here.
- `source` (AI-assistant attribution) is omitted on replay — it is not persisted
  for this path and the client keys on `executionId`.

## Failure modes → detection → recovery

| Failure | Detected by | Recovery |
| --- | --- | --- |
| Finish push dropped while client offline | client still shows running on reconnect | `resume` → DB read → terminal event replayed |
| `resume` id already pruned from DB | absent from DB lookup | client falls back to full REST reconcile |
| Disconnect longer than the client's guard window | client-side timer | client does a full reconcile instead of/alongside replay |
| Client on SSE (no upstream channel) | transport is unidirectional | REST reconcile carries the guarantee |
| DB read fails during resume | error reporter | handshake aborts for that batch; client's reconcile backstop still heals |
| Reconnect lands on a different main | — (no per-main state needed) | shared DB + stable `pushRef` + client-carried id resolve it |

## Observability

`ExecutionPushResumeService` logs each resume under the `push` scope with the
`awaiting` and `replayed` counts; DB-read failures are sent to the error
reporter. `eventId` on the envelope is the correlation handle for delivery
telemetry (delivered / replayed).
