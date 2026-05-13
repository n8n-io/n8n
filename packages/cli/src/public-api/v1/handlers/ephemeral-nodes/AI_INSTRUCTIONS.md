# n8n Ephemeral Node Execution — AI Instructions

Single-doc reference for an external LLM (Claude, ChatGPT, etc.) to drive
n8n's Public API for running one node at a time without saving a workflow.

## What this is

Three Public API endpoints that let you:

1. List the credentials your API key can use.
2. List the n8n nodes you can run.
3. Run one node with parameters, credentials, and input data.

The node runs in the API key owner's personal project. No workflow is saved;
no execution row is written. The public API exposes a curated allowlist —
smaller than n8n's full node catalogue — and applies the same safety rails
as the internal agent runtime: trigger / polling / webhook nodes blocked,
`sendAndWait` / `dispatchAndWait` operations blocked, only `usableAsTool`
nodes (plus a small provider whitelist) allowed.

## Auth

All requests:

```
X-N8N-API-KEY: <key>
```

Required scopes on the key:

| Endpoint | Scope |
|---|---|
| `GET /ephemeral-nodes` | `ephemeralNode:read` |
| `POST /ephemeral-nodes/execute` | `ephemeralNode:execute` |
| `GET /credentials` | `credential:list` |

## Canonical flow

Always run discovery before execute. Do not invent `nodeType` strings or
credential IDs — read them from the responses below.

```
GET /ephemeral-nodes              → pick { nodeType, nodeTypeVersion }
GET /credentials                  → pick { id, name } matching one of the
                                     node's supportedCredentialTypes
POST /ephemeral-nodes/execute     → run the node
```

## Endpoints

### `GET /api/v1/ephemeral-nodes`

Query: `?nodeType=<string>&cursor=<string>&limit=<int>` (all optional).

Response:

```json
{
  "data": [
    {
      "nodeType": "n8n-nodes-base.httpRequest",
      "nodeTypeVersion": 4.2,
      "displayName": "HTTP Request",
      "description": "Makes an HTTP request and returns the response data",
      "category": "Core Nodes",
      "supportedCredentialTypes": ["httpBearerAuth"]
    }
  ],
  "nextCursor": null
}
```

Fields:

- `nodeType` — pass through to execute verbatim.
- `nodeTypeVersion` — the node's `defaultVersion` (or its highest supported
  version when none is set). Pass through verbatim.
- `supportedCredentialTypes` — credential `type` values the node accepts.
  The node typically uses one at a time; pick one that matches a credential
  from `GET /credentials`.
- `category` — optional; omitted when the node declares neither codex
  categories nor a group.

Only nodes returned here are executable. The catalogue is a curated
allowlist; anything else is rejected with HTTP 400.

### `GET /api/v1/credentials`

Response (relevant fields):

```json
{
  "data": [
    { "id": "R2DjclaysHbqn778", "name": "My Slack", "type": "slackApi" }
  ],
  "nextCursor": null
}
```

Pick a credential whose `type` matches one of the node's
`supportedCredentialTypes`. Keep `id` and `name`; you need both.

### `POST /api/v1/ephemeral-nodes/execute`

Request body:

```json
{
  "nodeType": "n8n-nodes-base.linear",
  "nodeTypeVersion": 1,
  "nodeParameters": {
    "resource": "issue",
    "operation": "get",
    "issueId": "ABC-123"
  },
  "credentials": {
    "linearApi": { "id": "R2DjclaysHbqn778", "name": "My Linear" }
  },
  "inputData": [{ "userId": 1 }]
}
```

Field rules:

- `nodeType` (string, required) — from discovery. Must be on the public
  allowlist or the request is rejected with 400.
- `nodeTypeVersion` (number, required) — use the value discovery returned.
- `nodeParameters` (object, required) — keys depend on the node; consult
  n8n's node documentation for the exact shape.
- `credentials` (object, optional) — keyed by credential **type** (e.g.
  `linearApi`), value is `{ id, name }` from `GET /credentials`. Omit if
  the node has no `supportedCredentialTypes`.
- `inputData` (array of objects, optional) — rows the node iterates over.
  Each object becomes one item's `json`. **If omitted, the node fires once
  against a single empty input item** — fine for most one-shot action
  calls.

Response (HTTP 200):

```json
{ "status": "success", "data": [ { "...": "..." } ] }
```

```json
{ "status": "error", "data": [], "error": "Request failed with status 404" }
```

`status: "error"` is still a 200 — the **node** failed, the request was
valid. Treat this as a tool-call failure to retry or surface, not an HTTP
error.

## Error shapes

| HTTP | Meaning | Common causes |
|---|---|---|
| 200 + `status: "success"` | Node ran, returned data. | — |
| 200 + `status: "error"` | Node ran but errored. | Bad parameters, upstream API 4xx/5xx. |
| 400 | Request rejected before execution. | `nodeType` not on the allowlist; trigger node; `sendAndWait`/`dispatchAndWait` operation; credential not accessible; credential type mismatch. |
| 401 | Missing or invalid API key. | — |
| 403 | API key missing required scope. | Add `ephemeralNode:read`/`ephemeralNode:execute`/`credential:list`. |

400 responses have the shape:

```json
{ "message": "Trigger nodes cannot be executed standalone" }
```

## Rules

- Always call discovery before execute. Do not guess `nodeType` or
  `nodeTypeVersion`.
- A node not present in `GET /ephemeral-nodes` cannot be run. Do not retry
  with a different version — pick a listed node.
- Credentials are scoped to the API key's personal project. A credential not
  returned by `GET /credentials` cannot be used here.
- The credential's `type` must match one of the node's
  `supportedCredentialTypes` exactly.
- One node per request. To chain nodes, call execute multiple times and
  pass the previous response's `data` as the next `inputData`.

## Minimal worked example

```bash
# 1. Find a node.
curl -s -H "X-N8N-API-KEY: $KEY" \
  "$N8N/api/v1/ephemeral-nodes?nodeType=n8n-nodes-base.httpRequest" \
  | jq '.data[0] | {nodeType, nodeTypeVersion, supportedCredentialTypes}'
# → { "nodeType": "n8n-nodes-base.httpRequest", "nodeTypeVersion": 4.2, "supportedCredentialTypes": ["httpBearerAuth"] }

# 2. No credential needed for this URL → omit `credentials`. `inputData`
# is also omitted, so the node fires once.
curl -s -X POST \
  -H "X-N8N-API-KEY: $KEY" -H "Content-Type: application/json" \
  "$N8N/api/v1/ephemeral-nodes/execute" \
  -d '{
    "nodeType": "n8n-nodes-base.httpRequest",
    "nodeTypeVersion": 4.2,
    "nodeParameters": { "url": "https://httpbin.org/get", "method": "GET" }
  }' | jq '{status, sample: .data[0]}'
```
