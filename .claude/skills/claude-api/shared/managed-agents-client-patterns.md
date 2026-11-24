# Managed Agents - Common Client Patterns

Patterns you'll write on the client side when driving a Managed Agent session, grounded in working SDK examples.

Code samples are TypeScript - other languages follow the same shape; see `{lang}/managed-agents/README.md` (cURL and C#: `curl/managed-agents.md`) for equivalents.

---

## 1. Lossless stream reconnect

**Problem:** SSE has no replay. If the connection drops mid-session, a naive reconnect re-opens the stream from "now" and you silently miss every event emitted in between.

**Solution:** on reconnect, fetch the full event history via `events.list()` *before* consuming the live stream, and dedupe on event ID as the live stream catches up.

```ts
const seenEventIds = new Set<string>()
const stream = await client.beta.sessions.events.stream(session.id)

// Stream is now open and buffering server-side. Read history first.
for await (const event of client.beta.sessions.events.list(session.id)) {
  seenEventIds.add(event.id)
  handle(event)
}

// Tail the live stream. Dedupe only gates handle() - terminal checks must run
// even for already-seen events, or a terminal event that was in the history
// response gets skipped by `continue` and the loop never exits.
for await (const event of stream) {
  if (!seenEventIds.has(event.id)) {
    seenEventIds.add(event.id)
    handle(event)
  }
  if (event.type === 'session.status_terminated') break
  if (event.type === 'session.status_idle' && event.stop_reason.type !== 'requires_action') break
}
```

---

## 2. `processed_at` - queued vs processed

Every event on the stream carries `processed_at` (ISO 8601), set when the event finishes processing. For client-sent events (`user.message`, `user.interrupt`, `user.tool_confirmation`) it's `null` while the event is queued behind earlier ones, and populated once the agent processes it - so the same event appears on the stream twice, once with `null` and once with a timestamp. (Exception: a `user.interrupt` sent while the session is paused at its budget is accepted and ignored - it never appears at all; see `shared/managed-agents-events.md` § Reaching a session budget.)

**Three event types skip the queued phase:** `user.define_outcome`, `user.custom_tool_result`, and `user.tool_result` are processed on receipt and echoed back with `processed_at` already populated. A pending -> acknowledged UI that assumes "first sighting is always `null`" will never clear for these - treat a populated `processed_at` on first sighting as immediately acknowledged.

```ts
for await (const event of stream) {
  if (event.type === 'user.message') {
    if (event.processed_at == null) onQueued(event.id)
    else onProcessed(event.id, event.processed_at)
  }
}
```

Use this to drive pending -> acknowledged UI state for anything you send. How you map a locally-rendered optimistic message to the server-assigned `event.id` is application-specific (typically via the return value of `events.send()` or FIFO ordering).

---

## 3. Interrupt a running session

Send `user.interrupt` as a normal event. The session keeps running until it reaches a safe boundary, then goes idle.

```ts
await client.beta.sessions.events.send(session.id, {
  events: [{ type: 'user.interrupt' }],
})

// Drain until the session is truly done - see Pattern 5 for the full gate.
for await (const event of stream) {
  if (event.type === 'session.status_terminated') break
  if (
    event.type === 'session.status_idle' &&
    event.stop_reason.type !== 'requires_action'
  ) break
}
```

Reference: `interrupt.ts` - sends the interrupt the moment it sees `span.model_request_start`, drains to idle, then verifies via `sessions.retrieve()`.

---

## 4. `tool_confirmation` round-trip

When a call evaluates to `ask` - the tool has `permission_policy: { type: 'always_ask' }`, or it has `{ type: 'auto' }` and the server reached no determination - the `agent.tool_use` / `agent.mcp_tool_use` event carries `evaluated_permission === 'ask'` and the session goes idle waiting for a decision. Respond with `user.tool_confirmation`.

```ts
for await (const event of stream) {
  if ((event.type === 'agent.tool_use' || event.type === 'agent.mcp_tool_use') && event.evaluated_permission === 'ask') {
    await client.beta.sessions.events.send(session.id, {
      events: [{
        type: 'user.tool_confirmation',
        tool_use_id: event.id,         // not a toolu_ id - use event.id
        result: (await approve(event)) ? 'allow' : 'deny', // you write approve(): ask a person or apply your own rule; deny when unattended
        // deny_message: '...',        // optional, only with result: 'deny'
      }],
    })
  }
}
```

Key points:
- `tool_use_id` is `event.id` (typically `sevt_...`), **not** a `toolu_...` ID.
- `result` is `'allow' | 'deny'`. Use `deny_message` to tell the model *why* you denied - it gets surfaced back to the agent.
- Multiple pending tools: respond once per `agent.tool_use` / `agent.mcp_tool_use` event with `evaluated_permission === 'ask'`.
- Gate on `evaluated_permission === 'ask'`, not on the policy you configured - it covers `always_ask` and `auto`-indeterminate alike. Calls the server **denies** under `auto` (`evaluated_permission === 'deny'`, `evaluation.evaluated_permission.reason_code === 'high_risk'`) never enter this flow: the agent gets an error tool result and the session keeps running; sending a confirmation for one is a 400.
- Log `event.evaluation` for audit (`type` + `reason_code`), and tolerate a `type` or `reason_code` you don't recognize - branch on known values, pass unknown ones through.

Reference: `tool-permissions.ts`.

---

## 5. Correct idle-break gate

Do not break on `session.status_idle` alone. The session goes idle transiently - e.g. between parallel tool executions, while waiting for a `user.tool_confirmation`, or while awaiting a `user.custom_tool_result`. Break when idle with a non-`requires_action` `stop_reason` (terminal, or `budget_reached` - resumable only by a budget update, so break unless you intend to change or remove the budget), or on `session.status_terminated`.

```ts
for await (const event of stream) {
  handle(event)
  if (event.type === 'session.status_terminated') break
  if (event.type === 'session.status_idle') {
    if (event.stop_reason.type === 'requires_action') continue // waiting on you - handle it
    break // end_turn, retries_exhausted, or budget_reached - see list below
  }
}
```

`stop_reason.type` values on `session.status_idle`:
- `requires_action` - agent is waiting on a client-side event (tool confirmation, custom tool result). Handle it, don't break. **Self-hosted exception:** if the session went `requires_action`-idle with no pending `agent.tool_use` / `agent.mcp_tool_use` (`ask`) or `agent.custom_tool_use` to answer, the worker failed the claimed work item (typically a memory-store mount error, logged only on the worker host). Don't `continue` forever on that - surface it, fix the host, and send `user.interrupt` to re-queue the work (`shared/managed-agents-self-hosted-sandboxes.md` § Memory stores -> Troubleshooting).
- `retries_exhausted` - terminal failure. Break, then check `sessions.retrieve()` for the error state.
- `end_turn` - normal completion.
- `budget_reached` - the session hit its spend cap and paused. Not terminal and not resumable by any event: change (typically raise) or remove the session's `budget` to resume, or treat it as done. A `session.usage` event with the final cost immediately precedes this idle. See `shared/managed-agents-core.md` § Session budgets.

---

## 6. Post-idle status-write race

The SSE stream emits `session.status_idle` slightly before the session's queryable status reflects it. Clients that break on idle and immediately call `sessions.delete()` or `sessions.archive()` will intermittently 400 with "cannot delete/archive while running."

Poll before cleanup:

```ts
let s
for (let i = 0; i < 10; i++) {
  s = await client.beta.sessions.retrieve(session.id)
  if (s.status !== 'running') break
  await new Promise(r => setTimeout(r, 200))
}
if (s?.status !== 'running') {
  await client.beta.sessions.archive(session.id)
} // else: still running after 2s - don't archive, let it settle or escalate
```

---

## 7. Stream-first, then send

Always open the stream **before** sending the kickoff event. Otherwise the agent may process the event and emit the first events before your consumer is attached, and you'll miss them.

```ts
const stream = await client.beta.sessions.events.stream(session.id)
await client.beta.sessions.events.send(session.id, {
  events: [{ type: 'user.message', content: [{ type: 'text', text: 'Hello' }] }],
})
for await (const event of stream) { /* ... */ }
```

The `Promise.all([stream, send])` shape works too, but stream-first is simpler and has the same effect - the stream starts buffering the moment it's opened.

---

## 8. File-mount gotchas

**The mounted resource has a different `file_id` than the file you uploaded.** Session creation makes a session-scoped copy.

```ts
const uploaded = await client.beta.files.upload({ file })
// uploaded.id         -> the original file
const session = await client.beta.sessions.create({
  /* ... */
  resources: [{ type: 'file', file_id: uploaded.id, mount_path: '/data.csv' }],
})
// session.resources[0].file_id !== uploaded.id  <- different IDs
```

Delete the original via `files.delete(uploaded.id)`; the session-scoped copy is garbage-collected with the session. `mount_path` must be absolute - see `shared/managed-agents-environments.md`.

---

## 9. Secrets for non-MCP APIs and CLIs - keep them host-side via custom tools

**Problem:** you want the agent to call a third-party API or run a CLI that needs a secret (API key, token, service-account credential), but you can't or don't want to hand the secret to a vault.

**First check:** for cloud environments, the first-class answer is now a vault `environment_variable` credential - the agent's shell sees an opaque placeholder and the real secret is substituted at egress. See `shared/managed-agents-tools.md` -> Vaults. Use this pattern instead when that doesn't fit: **self-hosted sandboxes** (env-var credentials not yet supported there), clients that reject the placeholder via local format validation, secrets that must never leave your infrastructure, or calls that need host-side binaries.

**Solution:** move the authenticated call to your side. Declare a custom tool on the agent; when the agent emits `agent.custom_tool_use`, your orchestrator (the process reading the SSE stream) executes the call with its own credentials and responds with `user.custom_tool_result`. The container never sees the key.

```ts
// Agent template: declare the tool, no credentials
tools: [{ type: 'custom', name: 'linear_graphql', input_schema: { /* query, vars */ } }]

// Orchestrator: handle the call with host-side creds
for await (const event of stream) {
  if (event.type === 'agent.custom_tool_use' && event.name === 'linear_graphql') {
    const result = await linear.request(event.input.query, event.input.vars) // host's key
    await client.beta.sessions.events.send(session.id, {
      events: [{
        type: 'user.custom_tool_result',
        custom_tool_use_id: event.id,
        content: [{ type: 'text', text: JSON.stringify(result) }],
      }],
    })
  }
}
```

Same shape works for `gh` CLI, local eval scripts, or anything else that needs host-side auth or binaries.

**Security note:** this does not expose a public endpoint. `agent.custom_tool_use` arrives on the SSE stream your orchestrator already holds open with your Anthropic API key, and `user.custom_tool_result` goes back via `events.send()` under the same key. Your orchestrator is a client, not a server - nothing unauthenticated is listening.

**Do not embed API keys in the system prompt or user messages as a workaround.** Prompts and messages are stored in the session's event history, returned by `events.list()`, and included in compaction summaries - a secret placed there is durably persisted and readable via the API for the life of the session.
