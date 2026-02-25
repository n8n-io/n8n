# Chat & Streaming

How a user message becomes a streamed AI response, end to end.

## Why SSE?

Instance AI uses **Server-Sent Events** as its streaming wire format. This is
the 2026 industry standard — every major AI provider and framework uses it:

| Provider / Framework | Streaming Format |
|---------------------|-----------------|
| OpenAI API | `text/event-stream` with `data: [DONE]` |
| Anthropic API | `text/event-stream` with typed events |
| Google Gemini API | `text/event-stream` |
| Vercel AI SDK 6 | SSE with `data:` lines |
| Mastra | SSE-compatible chunks natively |

**Key advantages over the previous NDJSON approach:**

1. **DevTools visibility** — Chrome/Firefox DevTools have built-in SSE viewers.
   NDJSON over `application/octet-stream` appeared as opaque binary data. SSE
   events are parsed and displayed with their type and payload, making
   development and debugging dramatically easier.

2. **Typed events** — The `event:` field lets the protocol itself declare chunk
   types (`event: text-delta`, `event: tool-call`, `event: error`). With NDJSON,
   the type was buried inside the JSON payload.

3. **Keep-alive mechanism** — SSE comments (`: ping`) serve as built-in
   keep-alive signals. During long tool calls (e.g., running a workflow), the
   backend sends periodic pings to prevent proxy/CDN timeouts. NDJSON had no
   equivalent.

4. **Ecosystem convention** — The `data: [DONE]` termination sentinel matches
   OpenAI and Vercel AI SDK conventions. Anyone familiar with those APIs will
   immediately understand our stream format.

5. **Client disconnect detection** — The controller listens for `res.on('close')`
   and stops iteration, preventing wasted computation. The previous NDJSON
   implementation streamed into the void on disconnect.

6. **Error semantics** — `event: error` is a standard SSE pattern. The frontend
   can handle errors at the protocol level rather than inspecting JSON payloads.

> **Note**: We use `fetch()` + manual SSE parsing (not the native `EventSource`
> API) because `EventSource` only supports GET requests and we need POST with a
> JSON body. The manual parser is ~40 lines in `sseStreamRequest()` — no
> external dependencies needed.


## Request Lifecycle

```mermaid
sequenceDiagram
    participant User
    participant Frontend as Vue Store
    participant API as sseStreamRequest()
    participant Controller as InstanceAiController
    participant Service as InstanceAiService
    participant Agent as Mastra Agent
    participant Memory as Memory (3-tier)

    User->>Frontend: types message, presses Cmd+Enter
    Frontend->>Frontend: append user message to store
    Frontend->>Frontend: create assistant stub (isStreaming=true)
    Frontend->>API: sendInstanceAiMessage(threadId, message)
    API->>Controller: POST /instance-ai/chat/:threadId
    Controller->>Controller: set streaming headers, flushHeaders()
    Controller->>Service: sendMessage(user, threadId, message)
    Service->>Service: createContext(user) via adapter
    Service->>Service: createInstanceAgent(options)
    Service->>Agent: agent.stream(message, resourceId, threadId)
    Agent->>Memory: load recent messages + working memory
    Memory-->>Agent: conversation context
    loop Tool calls & text generation
        Agent-->>Service: fullStream chunks (async iterable)
        Service-->>Controller: yield chunk
        Controller-->>API: event: type\ndata: JSON\n\n
        API-->>Frontend: onChunk(chunk)
        Frontend->>Frontend: handleChunk() dispatch
    end
    Controller-->>API: data: [DONE]\n\n
    API-->>Frontend: onDone()
    Frontend->>Frontend: mark assistant message isStreaming=false
```

## Streaming Protocol

Responses stream as **Server-Sent Events (SSE)** over `text/event-stream`. Each
chunk is an SSE event with an `event:` type and `data:` payload containing a
JSON object with a `type` field that determines how the frontend processes it.

This follows the 2026 industry standard used by OpenAI, Anthropic, Google, and
Vercel AI SDK. See [Decision #4](../../decisions.md#4-server-sent-events-sse-streaming)
for the rationale and benefits over the previous NDJSON approach.

### SSE Format

Each chunk is written as:

```
event: <chunk.type>
data: <JSON object>

```

The stream terminates with `data: [DONE]\n\n`. Keep-alive comments (`: ping`)
are sent every 15 seconds during long tool calls to prevent proxy timeouts.

### Chunk Types

| Type | Payload | Description |
|------|---------|-------------|
| `text-delta` | `{ text: string }` | Incremental text token from the model |
| `reasoning-delta` | `{ text: string }` | Incremental reasoning/thinking token |
| `tool-call` | `{ toolCallId, toolName, args }` | Agent is invoking a tool |
| `tool-result` | `{ toolCallId, result, isError? }` | Tool execution completed |
| `tool-error` | `{ toolCallId, error }` | Tool execution failed |
| `error` | `{ content: string }` | Agent-level or system error (SSE `event: error`) |
| `finish` | _(none)_ | Alternative stream-end signal |

### Example Raw Stream

```
event: reasoning-delta
data: {"type":"reasoning-delta","payload":{"text":"The user wants to list"}}

event: reasoning-delta
data: {"type":"reasoning-delta","payload":{"text":" their workflows..."}}

: ping

event: tool-call
data: {"type":"tool-call","payload":{"toolCallId":"tc_1","toolName":"list-workflows","args":{"limit":10}}}

event: tool-result
data: {"type":"tool-result","payload":{"toolCallId":"tc_1","result":{"workflows":[{"id":"1","name":"My Workflow","active":true}]}}}

event: text-delta
data: {"type":"text-delta","payload":{"text":"You have 1 workflow"}}

event: text-delta
data: {"type":"text-delta","payload":{"text":": **My Workflow** (active)."}}

data: [DONE]
```

## HTTP Response

### Headers

The controller sets these headers before streaming begins:

```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
X-Accel-Buffering: no
```

| Header | Why |
|--------|-----|
| `Content-Type: text/event-stream` | Standard SSE content type — enables DevTools SSE viewer |
| `Cache-Control: no-cache` | Prevents intermediary caching of partial responses |
| `Connection: keep-alive` | Keeps the TCP connection open for the full stream |
| `X-Accel-Buffering: no` | Disables nginx proxy buffering for real-time delivery |

Headers are flushed immediately with `res.flushHeaders()` so the client can
start receiving chunks before the full response is ready.

### Per-Chunk Flushing

After each chunk is written, the controller calls `res.flush?.()` to push it
through any compression or proxy middleware immediately.

## Abort / Cancellation

The store creates an `AbortController` per request. When the user clicks the
stop button:

1. `stopStreaming()` calls `abortController.abort()`
2. The `fetch` request in `sseStreamRequest()` is cancelled
3. The `onError` handler receives an `AbortError` (which is silently ignored)
4. The last assistant message is marked `isStreaming = false`

On the backend, the controller listens for `res.on('close')` to detect client
disconnect and breaks out of the stream iteration, preventing wasted computation.

## Error Handling

### Network Errors

If the fetch fails or the connection drops, `onError` fires with the network
error. The store appends a user-visible error message to the assistant bubble.

### Pre-Headers Errors

If the controller encounters an error before `flushHeaders()` is called
(e.g. missing message body), it returns a standard JSON error response:

```json
{ "message": "Message is required" }
```

with HTTP status 400 or 500.

### Post-Headers Errors

If an error occurs after headers are already sent (stream in progress), the
controller writes an SSE error event and ends the stream:

```
event: error
data: {"type":"error","content":"An error occurred"}
```

### Tool Errors

When a tool execution fails, the agent emits a `tool-error` or `tool-result`
chunk with `isError: true`. The frontend renders the error inside the
collapsible tool call card with a warning icon and danger-colored output.

## Related Docs

- [Frontend Module](../../internals/frontend-module.md) — component breakdown and store details
- [Backend Module](../../internals/backend-module.md) — controller and service implementation
- [Tool System](../tools/) — what happens inside tool calls
