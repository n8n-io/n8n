# Streaming Protocol

## Overview

Instance AI uses a streaming protocol to deliver agent responses to the frontend
in real-time. The protocol is designed for minimal time-to-first-token and
progressive rendering of text, reasoning, and tool call results.

## Transport

- **Endpoint**: `POST /instance-ai/chat/:threadId`
- **Request body**: `{ "message": "user's message" }`
- **Response format**: Newline-delimited JSON (NDJSON)
- **Content-Type**: `application/octet-stream`

### Response Headers

```
Content-Type: application/octet-stream
Cache-Control: no-cache
Connection: keep-alive
X-Accel-Buffering: no
```

`X-Accel-Buffering: no` disables nginx/reverse proxy buffering so chunks are
delivered immediately.

## Chunk Types

Each line in the response is a JSON object with a `type` field:

### `text-delta`

Incremental text from the agent's response.

```json
{"type":"text-delta","payload":{"text":"You have 3 active workflows."}}
```

The frontend appends `payload.text` to the current message's `content`.

### `reasoning-delta`

Incremental reasoning/thinking from the agent (if the model supports it).

```json
{"type":"reasoning-delta","payload":{"text":"Let me check the workflow list..."}}
```

The frontend appends `payload.text` to the current message's `reasoning`.

### `tool-call`

The agent is invoking a tool. Sent before the tool executes.

```json
{
  "type": "tool-call",
  "payload": {
    "toolCallId": "tc_abc123",
    "toolName": "list-workflows",
    "args": {"limit": 10}
  }
}
```

The frontend adds a new entry to the message's `toolCalls` array with
`isLoading: true`.

### `tool-result`

A tool has completed successfully.

```json
{
  "type": "tool-result",
  "payload": {
    "toolCallId": "tc_abc123",
    "result": {"workflows": [{"id": "1", "name": "My Workflow", "active": true}]}
  }
}
```

The frontend updates the matching `toolCall` entry: sets `result` and
`isLoading: false`.

### `tool-error`

A tool has failed.

```json
{
  "type": "tool-error",
  "payload": {
    "toolCallId": "tc_abc123",
    "error": "Workflow not found"
  }
}
```

The frontend updates the matching `toolCall` entry: sets `isError: true` and
`isLoading: false`.

### `error`

A system-level error occurred during streaming.

```json
{"type":"error","content":"An error occurred"}
```

### `done`

The stream is complete.

```json
{"type":"done"}
```

The frontend sets `isStreaming: false` on the current message.

## Typical Stream Sequence

```
← {"type":"reasoning-delta","payload":{"text":"Let me look up..."}}
← {"type":"tool-call","payload":{"toolCallId":"tc_1","toolName":"list-workflows","args":{}}}
← {"type":"tool-result","payload":{"toolCallId":"tc_1","result":{...}}}
← {"type":"text-delta","payload":{"text":"You have 3 workflows:\n"}}
← {"type":"text-delta","payload":{"text":"1. **Email Digest** (active)\n"}}
← {"type":"text-delta","payload":{"text":"2. **Slack Alerts** (active)\n"}}
← {"type":"text-delta","payload":{"text":"3. **Data Sync** (inactive)"}}
← {"type":"done"}
```

## Abort Support

The frontend can abort a streaming request using an `AbortController`. When
aborted, the HTTP connection is closed and the agent stops processing.

```typescript
const abortController = new AbortController();
sendInstanceAiMessage(context, threadId, message, onChunk, onDone, onError, abortController.signal);

// To cancel:
abortController.abort();
```

## Future: Rich Component Rendering

Currently all tool results are rendered as structured data. The planned rich
component system will extend the protocol so tools can declare a `renderType`,
allowing the frontend to render domain-specific components (execution views,
workflow previews, etc.) instead of generic JSON. See [vision.md](./vision.md)
for details.
