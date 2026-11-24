# Managed Agents - Events & Steering

## Events

### Sending Events

Send events to a session via `POST /v1/sessions/{id}/events`.

| Event Type                | When to Send                                        |
| ------------------------- | --------------------------------------------------- |
| `user.message`            | Send a user message |
| `user.interrupt`          | Interrupt the agent while it's running |
| `user.tool_confirmation`  | Approve/deny a tool call that paused for approval (`always_ask`, or `auto` when the server reached no determination) |
| `user.custom_tool_result` | Provide result for a custom tool call |
| `user.define_outcome`     | Start a rubric-graded iterate loop - see `shared/managed-agents-outcomes.md` |
| `system.message`          | Append privileged system-level context for this turn and every turn after it; see § Adding system context mid-session |

#### Adding system context mid-session (`system.message`)

The `system` field on the agent definition sets the top-level system prompt and is fixed for the session's lifetime. A `system.message` event **appends** to the session's system context as a `role: "system"` turn - it does not replace that prompt. The content applies to the accompanying turn and all subsequent turns. Use it for a different persona, revised constraints, or runtime-fetched context that should shape behavior going forward:

```python
client.beta.sessions.events.send(
    session.id,
    events=[
        {
            "type": "system.message",
            "content": [
                {"type": "text", "text": "The user's current timezone is America/New_York."},
            ],
        },
    ],
)
```

Constraints:

- **Model-gated: Claude Fable 5.1, Claude Mythos 5.1, Claude Fable 5, Claude Mythos 5, Claude Opus 5.5, Claude Opus 5, Claude Opus 4.8, Claude Sonnet 5.5, and Claude Haiku 5.5 (not Claude Sonnet 5).** Only the agent's **primary** model is checked - `system.message` lands on the primary thread only, so subagent models are not considered. On an unsupported primary model the event is rejected with a `model_does_not_support_mid_conversation_system` validation error.
- **While the session is idle with `stop_reason: requires_action`** (blocked on `user.custom_tool_result` / `user.tool_confirmation`), a `system.message` is accepted **only when it trails a tool result event in the same request**. Sent on its own - or alongside a `user.message` - it is rejected until the pending tool events are resolved.
- `content` accepts 1-1000 text items.

### Receiving Events

Three methods:

1. **Streaming (SSE)**: `GET /v1/sessions/{id}/events/stream` - real-time Server-Sent Events. **Long-lived** - the server sends periodic heartbeats to keep the connection alive.
2. **Polling**: `GET /v1/sessions/{id}/events` - paginated event list (query params: `limit` default 1000, `page`). **Returns immediately** - this is a plain paginated GET, not a long-poll.
3. **Webhooks**: Anthropic POSTs session state transitions to your HTTPS endpoint - thin payloads (IDs only), HMAC-signed, Console-registered. See `shared/managed-agents-webhooks.md`.

**No-code inspection - the Console session viewer** (Console sidebar -> **Managed Agents** -> **Sessions**; Developers and Admins only). Point users here for debugging before they parse the stream themselves: a session list (ID, name, status, agent, tokens in/out, cost; filter by status/created, search by ID); a **timeline minimap** with one lane per thread in multiagent sessions; the **transcript** grouped by model request (thinking, tool calls with inputs/results, streaming text) with a **Filter events** box (matches ID, type, tool name, or text; Enter steps between matches) and copy/download-as-JSON (filtered export when a filter is active); and an **Inspector** side panel (toggle with `d`) with five tabs - **Session** (details, metadata, cumulative-cost chart vs. budget), **Events** (raw events in server order, JSON per event, plus a **Deltas** view for messages that streamed while the page was open), **Tools** (every configured tool with call counts, failures, median duration; jump to any call), **Resources** (mounted files, repos, memory stores with per-session memory changes, `/mnt/session/outputs` files, skills under `/workspace/skills`), **Threads** (status, context size, cost per thread; context-size chart for the current thread; switch threads). Deep-link with `?event={event_id}` on the session URL - handy to include in error reports alongside the Console link from `shared/managed-agents-core.md`.

All **persisted** events carry `id`, `type`, and `processed_at` (ISO 8601), set when the event finishes processing. On events you send, `processed_at` is `null` while the event is still queued behind earlier ones - **except** `user.define_outcome`, `user.custom_tool_result`, and `user.tool_result`, which are processed on receipt and echoed back with `processed_at` already populated. The stream-only `event_start` / `event_delta` preview events (see § Live previews) carry only the `id` of the event they preview.

> Warning: **Robust polling (raw HTTP).** If you bypass the SDK and roll your own poll loop, don't rely on `requests` or `httpx` timeouts as wall-clock caps - they're **per-chunk** read timeouts, reset every time a byte arrives. A trickling response (heartbeats, a wedged chunked-encoding body, a misbehaving proxy) can keep the call blocked indefinitely even with `timeout=(5, 60)` or `httpx.Timeout(120)`. Neither library has a "total wall-clock" timeout built in. For a hard deadline: track `time.monotonic()` at the loop level and break/cancel if a single request exceeds your budget (e.g. via a watchdog thread, or `asyncio.wait_for()` around async httpx). **Prefer the SDK** - `client.beta.sessions.events.stream()` and `client.beta.sessions.events.list()` handle timeout + retry sanely.
>
> If `GET /v1/sessions/{id}/events` (paginated) ever hangs after headers, you've likely hit `GET /v1/sessions/{id}/events/stream` by mistake or a server-side stall - report it; don't treat it as a client-config problem.

### Event Types (Received)

Event types use dot notation, grouped by namespace:

| Event Type | Description |
| --- | --- |
| `agent.message` | Agent text output |
| `agent.thinking` | Progress signal that the agent is thinking - it does **not** carry the thinking content |
| `agent.tool_use` | Agent used a built-in tool (`agent_toolset_20260401`). Carries `evaluated_permission` (`allow`/`ask`/`deny`) and usually `evaluation` - see `shared/managed-agents-tools.md` § `evaluated_permission` and `evaluation` |
| `agent.tool_result` | Result from a built-in tool |
| `agent.mcp_tool_use` | Agent used an MCP tool. Carries `evaluated_permission` and usually `evaluation`, same as `agent.tool_use` |
| `agent.mcp_tool_result` | Result from an MCP tool |
| `agent.custom_tool_use` | Agent invoked a custom tool - session goes idle, you respond with `user.custom_tool_result` |
| `agent.thread_context_compacted` | Conversation context was compacted |
| `session.status_idle` | Agent has finished the current task, and is awaiting input. It's either waiting for input to continue working via a `user.message`, blocked awaiting a `user.custom_tool_result` or `user.tool_confirmation`, or paused because the session budget cap was reached. The `stop_reason` attached contains more information about why the Agent has stopped working. |
| `session.status_running` | Session has starting running, and the Agent is actively doing work. |
| `session.status_rescheduled` | Session is (re)scheduling after a retryable error has occurred, ready to be picked up by the orchestration system. |
| `session.status_terminated` | Session ended and is irreversibly unusable - **on completion or on error**, not error-only. |
| `session.updated` | A session update changed at least one field - carries only the changed fields (a budget removal carries `budget: null`) |
| `session.usage` | Snapshot of the session's cumulative usage and tracked list cost - see § Reaching a session budget below |
| `session.error` | Error occurred during processing |
| `span.model_request_start` | Model inference started |
| `span.model_request_end` | Model inference completed |
| `span.outcome_evaluation_start` / `_ongoing` / `_end` | Grader progress for outcome-oriented sessions - see `shared/managed-agents-outcomes.md` |
| `session.thread_created` | Subagent thread spawned (multiagent), an advisor consultation started (thread name `anthropic.advisor`), or a workflow run created a thread (`workflow_run_id` is the run's id, and `null` on any other thread) - see `shared/managed-agents-multiagent.md` |
| `session.thread_status_running` / `_idle` / `_rescheduled` / `_terminated` | Thread status transitions - mostly seen in multiagent sessions, but a single-agent session's primary thread also emits `_idle` when pausing at a session budget (§ Reaching a session budget). `_idle` carries `stop_reason`. |
| `agent.thread_message_sent` / `_received` | Cross-thread message, carries `to_session_thread_id` / `from_session_thread_id` (multiagent) |
| `workflow_run.created` / `.status_running` / `.status_idle` / `.status_ended` / `.phase_started` / `.phase_ended` / `.error` | A workflow run was created, is running or idle, or ended (with `result`), or one of its phases started or ended, or the server reports an error of a run or a start it refused - see `shared/managed-agents-multiagent.md` § Dynamic workflows |

The stream also echoes back user-sent events (`user.message`, `user.interrupt`, `user.tool_confirmation`, `user.tool_result`, `user.custom_tool_result`, `user.define_outcome`) - except a `user.interrupt` sent while the session is paused at its budget, which is accepted and ignored and never appears (§ Reaching a session budget).

Stream-only delta preview events (`event_start`, `event_delta`) are the one exception to the `{domain}.{action}` naming convention - see § Live previews below; they never appear in `GET /v1/sessions/{id}/events`.

---

## Live previews

By default, assistant text reaches the stream as buffered `agent.message` events - emitted only after the model request that produced them finishes. **Live previews** let you render that text incrementally while the model is still generating. The buffered `agent.message` is always the authoritative record; a client that ignores previews still receives a complete, correct stream. The wire format is **not** Messages-API streaming: the delta type is `content_delta`, not `content_block_delta`, so Messages-API accumulator code does not carry over unchanged.

**Opt in per stream connection** by adding the `event_deltas[]` query parameter, repeated once per event type to preview. Accepted values: `agent.message`, `agent.thinking` - any other value returns a 400, as does a request with more than 100 values. **Both stream endpoints accept it:** the session-level stream (`GET /v1/sessions/{id}/events/stream`) and each session thread's own stream (`GET /v1/sessions/{sid}/threads/{tid}/stream`). In a shell, quote the URL or percent-encode the brackets as `%5B%5D` - bare `[]` is a glob pattern.

**Previews are thread-scoped.** A connection previews only the thread it is reading. A child thread's previews are delivered on that child's stream and are *never* cross-posted to the session-level stream, whose previews stay scoped to the primary thread. To watch a subagent's text as the model generates it, open that subagent's thread stream - see `shared/managed-agents-multiagent.md`. Run one accumulator instance per connection.

```python
stream = client.beta.sessions.events.stream(
    session_id=session.id,
    event_deltas=["agent.message"],
)
```

When a previewed event begins, the stream emits an `event_start` carrying the upcoming event's `type` and `id`; for `agent.message` it's followed by `event_delta` events carrying incremental text:

```json
{"type": "event_start", "event": {"type": "agent.message", "id": "sevt_01abc..."}}
{"type": "event_delta", "event_id": "sevt_01abc...", "delta": {"type": "content_delta", "index": 0, "content": {"type": "text", "text": "Here is the summary"}}}
```

`event_start` and `event_delta` have no `id` or `processed_at` of their own - the only identifier they carry is the `id` of the event they preview. For `agent.thinking`, **only** the `event_start` is emitted (a "thinking has started" signal) - no deltas follow, and the buffered `agent.thinking` that concludes the preview carries no thinking content either. It is a progress signal, not a content carrier; there is nothing to read out of it.

**Accumulate-and-reconcile pattern.** Treat the preview as a scratch buffer keyed by `(event_id, index)`. On `event_start`, create an empty entry for the announced `id`. On each `event_delta`, append `delta.content.text` to `(event_id, delta.index)` and render the running text. When the buffered `agent.message` arrives, match it by `id`, **discard the accumulated preview**, and render the message's content instead. The identifiers always line up: `event_start.event.id`, every `event_delta.event_id`, and the buffered event's `id` are the same value. On a normal turn the order is fixed: `session.status_running` -> `span.model_request_start` -> `event_start` -> `event_delta`* -> buffered `agent.message` -> `span.model_request_end`. If the turn errors or is interrupted the buffered event may never arrive, but `span.model_request_end` still does - close any unreconciled preview when you see it. Python/TypeScript/Go SDKs ship an accumulator helper that implements this; in other SDKs apply the manual pattern to the generated event types.

**Two guarantees the pattern relies on:** concatenating a preview's deltas in arrival order, keyed by `(event_id, index)`, yields a *prefix* of `content[index].text` in the buffered event (a prefix, not necessarily the whole text - deltas may be shed under load); and a connection emits at most one `event_start` per `event_id`, with the buffered event as the last thing that connection delivers for that `id`.

**Limitations:**
- **Best effort** - under load the server may shed deltas for an event; you receive a contiguous prefix and then no further deltas for that event. The buffered `agent.message` still arrives complete. Never treat an accumulated preview as final.
- **No replay on reconnect** - deltas are delivered only to the connection that opted in, while it's open; this holds for the session-level stream and each thread stream alike. A connection opened after a model request started receives no deltas for that in-flight event. After a drop, follow the consolidation pattern in § Reconnecting after a dropped stream - the history fetch returns any buffered events emitted during the gap; missed deltas cannot be re-requested.
- **One thread, text only** - previews cover assistant text on the thread the connection is reading. Tool use, tool results, MCP results, and activity on any *other* thread are never previewed on that connection.
- **Never persisted** - `event_start` / `event_delta` exist only on the live SSE stream, never in `GET /v1/sessions/{id}/events` or any thread's event history.

**Troubleshooting:**

| You see | What it means |
| --- | --- |
| Buffered events but no `event_start` / `event_delta` | This connection didn't opt in (`event_deltas[]` is per connection, not per session), or the turn ran on a different thread. List `GET /v1/sessions/{sid}/threads` to find which one ran. |
| 404 on the stream URL | Wrong path or ID, or the request carries no managed-agents beta header - the thread endpoints are beta-gated, so without it they don't exist. The thread path is `/threads/{tid}/stream`, **not** `/threads/{tid}/events/stream` (which doesn't exist) and not `/events/stream` (session level only). |
| 400 naming `event_deltas` | Only `agent.message` and `agent.thinking` are accepted, max 100 values. |

---

## Steering Patterns

Practical patterns for driving a session via the events surface.

### Stream-first ordering

**Open the stream before sending events.** The stream only delivers events that occur *after* it's opened - it does not replay current state or historical events. If you send a message first and open the stream second, early events (including fast status transitions) arrive buffered in a single batch and you lose the ability to react to them in real time.

```ts
// Correct - stream and send concurrently
const [response] = await Promise.all([
  streamEvents(sessionId),   // opens SSE connection
  sendMessage(sessionId, text),
]);

// Wrong - events before stream opens arrive as a single buffered batch
await sendMessage(sessionId, text);
const response = await streamEvents(sessionId);
```

**For full history,** use `GET /v1/sessions/{id}/events` (paginated list) - the stream only gives you live events from connection onward.

### Reconnecting after a dropped stream

**The SSE stream has no replay.** If your connection drops (httpx read timeout, network blip) and you reconnect, you only get events emitted *after* reconnection. Any events emitted during the gap are lost from the stream.

**The consolidation pattern:** on every (re)connect, overlap the stream with a history fetch and dedupe by event ID:

```python
def connect_with_consolidation(client, session_id):
    # 1. Open the SSE stream first
    stream = client.beta.sessions.events.stream(session_id=session_id)

    # 2. Fetch history to cover any gap
    history = client.beta.sessions.events.list(
        session_id=session_id,
    )

    # 3. Yield history first, then stream - dedupe by event.id
    seen = set()
    for ev in history.data:
        seen.add(ev.id)
        yield ev
    for ev in stream:
        if ev.id not in seen:
            seen.add(ev.id)
            yield ev
```

### Message queuing

**You don't have to wait for a response before sending the next message.** User events are queued server-side and processed in order. This is useful for chat bridges where the user sends rapid follow-ups:

```ts
// All three go into one session; agent processes them in order
await sendMessage(sessionId, "Summarize the README");
await sendMessage(sessionId, "Actually also check the CONTRIBUTING guide");
await sendMessage(sessionId, "And compare the two");
// Stream once - agent responds to all three as a coherent turn
```

Events can be sent up to the Session at any time. There is no need to wait on a specific session status to enqueue new events via `client.beta.sessions.events.send()`. Two exceptions: while a call is waiting on you (`stop_reason: requires_action`) or the session is paused at its budget (`budget_reached`), only settle events are accepted - a `user.message` there is a 400. See § Reaching a session budget.

### Interrupt

A `user.interrupt` event **jumps the queue** (ahead of any pending user messages) and forces the session into `idle`. Exception: while the session is paused at its budget, an interrupt is accepted and ignored - it is never persisted and changes nothing (§ Reaching a session budget). Use this for "stop" / "nevermind" / "cancel" commands:

```ts
await client.beta.sessions.events.send(sessionId, {
  events: [{ type: 'user.interrupt' }],
});
```

The agent stops mid-task. It does not see the interrupt as a message - it just halts. Send a follow-up `user` event to explain what to do instead. If an outcome is active, the interrupt also marks `span.outcome_evaluation_end.result: "interrupted"` (see `shared/managed-agents-outcomes.md`) - though not at a budget pause, where the interrupt is accepted and ignored (see § Reaching a session budget).

**The interrupted turn ends with `stop_reason: end_turn`** - the same value a turn that finishes on its own carries. There is no interruption-specific stop reason, so a drain loop can't distinguish the two from `stop_reason` alone; track that you sent the interrupt.

**Against an already-`idle` session an interrupt is normally a no-op.** The exception is a session on a self-hosted environment whose worker failed the claimed work item (a memory-store mount error, for instance): it sits `idle` with `stop_reason: requires_action` and no error event, and `user.interrupt` re-queues the work for the next worker claim (`shared/managed-agents-self-hosted-sandboxes.md` § Memory stores -> Troubleshooting).

**In a multiagent session, omitting `session_thread_id` interrupts every non-archived thread, including the primary** - it is not primary-only; with dynamic workflows, `shared/managed-agents-multiagent.md` § Dynamic workflows -> Interrupting with runs open says what it does to runs. Pass `session_thread_id` to stop one thread. See `shared/managed-agents-multiagent.md`.

> **Note**: Interrupt events may have empty IDs in the current implementation. When troubleshooting, use the `processed_at` timestamp along with surrounding event IDs. (Not applicable to an interrupt sent at the budget cap - that event is never persisted, so there is nothing to locate.)

### Reaching a session budget

A session created with a budget (see `shared/managed-agents-core.md` § Session budgets) pauses instead of overspending. Before every model request the platform checks whether consumed list cost has reached the cap and pauses the thread if it has, and the session goes idle with `stop_reason: budget_reached` rather than terminating. On the stream, the pause arrives as three events, in order:

1. `session.thread_status_idle` with `stop_reason: budget_reached`, for each thread as it pauses. When a thread's final request both crosses the cap and finishes its turn, that thread reports `stop_reason: end_turn` while the session still reports `budget_reached` - key on the **session-level** `stop_reason`, not thread-level ones, to detect the pause.
2. `session.usage` - a snapshot of the session's cumulative usage and tracked list cost.
3. `session.status_idle` with `stop_reason: budget_reached`. The `session.usage` event always immediately precedes this idle.

While at the cap the session accepts **only settle events** (`user.tool_confirmation`, `user.tool_result`, `user.custom_tool_result`, `user.interrupt`); anything that starts new work, including `user.message`, is a 400 naming that list. A `user.interrupt` sent while the session is paused at its budget (all threads paused at the cap) is accepted and ignored: it does not appear in the event list and changes nothing. Raise or remove the budget to continue. When one thread waits on a tool ask and another is paused at the cap, the session-level `stop_reason` is `requires_action`, not `budget_reached` - settling the ask doesn't trigger a model request, so respond as usual. With a workflow run open, see `shared/managed-agents-multiagent.md` § Dynamic workflows: an interrupt at the cap ends no run (the budget has already paused them), and each run the budget pauses gets `workflow_run.status_idle`, then `workflow_run.status_running` when it resumes.

**No event you send resumes a session paused at its cap.** Update the session's budget instead: change it to a value above the consumed list cost (higher or lower than the old cap), or remove it with `"budget": null`. An accepted update resumes the paused work automatically.

**`session.usage`** carries the session's cumulative token totals, `list_cost` (`{amount, currency}`, rounded to the nearest cent), `active_seconds` (concurrent-thread overlap counted once - the figure runtime cost is priced on), `server_tool_use` counts (`web_search_requests`, and `web_fetch_requests` - informational, currently always 0 since web fetch is not metered), and an echo of the session's `budget` when one is set. It appears in the events list and the session stream - a stream reader sees the final cost of the work that hit the cap without an extra fetch; child threads' own streams do not carry it. The same totals live on the session object's `usage` field, and each thread's own `usage` carries per-thread `list_cost` and `active_seconds` - but per-thread costs do **not** sum to the session total: the session figure additionally includes session running time and each figure is rounded independently, so the session figure is the authoritative one. To enforce a spend limit, set a budget rather than polling usage and interrupting the session yourself - the platform's gate runs before each model request.

### Event payloads

some events carry useful metadata beyond the status change itself:

`session.status_idle` - includes a `stop_reason` field which elaborates on why the session stopped and what type of further action is required by the user.
```json
{
  "id": "sevt_456",
  "processed_at": "2026-04-07T04:27:43.197Z",
  "stop_reason": {
    "event_ids": [
      "sevt_123"
    ],
    "type": "requires_action"
  },
  "type": "status_idle"
}
```

`span.model_request_end` contains a `model_usage` field for cost tracking and efficiency analysis:

```json
{
  "type": "span.model_request_end",
  "id": "sevt_456",
  "is_error": false,
  "model_request_start_id": "sevt_123",
  "model_usage": {
    "cache_creation_input_tokens": 0,
    "cache_read_input_tokens": 6656,
    "input_tokens": 3571,
    "output_tokens": 727
  },
  "processed_at": "2026-04-07T04:11:32.189Z"
}
```

**`agent.thread_context_compacted`** - emitted when the conversation history was summarized to fit context. Includes `pre_compaction_tokens` so you know how much was squeezed:

```json
{
  "id": "sevt_abc123",
  "processed_at": "2026-03-24T14:05:15.787Z",
  "type": "agent.thread_context_compacted"
}
```

### Archive

When done with a session, archive it to free resources:

```ts
await client.beta.sessions.archive(sessionId);
```

> Archiving a **session** is routine cleanup - sessions are per-run and disposable. **Do not generalize this to agents or environments**: those are persistent, reusable resources, and archiving them is permanent (no unarchive; new sessions cannot reference them). See `shared/managed-agents-overview.md` -> Common Pitfalls.


