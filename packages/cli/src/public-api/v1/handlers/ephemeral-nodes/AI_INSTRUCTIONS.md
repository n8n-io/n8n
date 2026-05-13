# n8n Ephemeral Node Execution — AI Instructions

Single-doc reference for an external LLM (Claude, ChatGPT, etc.) to drive
n8n's Public API for running one node at a time without saving a workflow.

## What this is

Three Public API endpoints that let you:

1. List the credentials your API key can use.
2. List the n8n nodes you can run.
3. Run one node with parameters, credentials, and input data.

The node runs in the API key owner's personal project. No workflow is saved;
no execution row is written. Same safety rails as n8n's internal agent
runtime: trigger nodes blocked, only `usableAsTool` nodes (plus a small
provider whitelist) allowed, `sendAndWait`/`dispatchAndWait` blocked.

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
GET /credentials                  → pick { id, name } per required cred type
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
      "exampleParameters": { "url": "https://api.example.com", "method": "GET" },
      "requiredCredentialTypes": [],
      "inputDataShape": {}
    }
  ],
  "nextCursor": null
}
```

Fields:

- `nodeType`, `nodeTypeVersion` — pass through to execute verbatim.
- `requiredCredentialTypes` — credential `type` values you must resolve via
  `GET /credentials`.
- `exampleParameters` — minimum-viable `nodeParameters` payload. Use as a
  starting shape; mutate values for the task.
- `inputDataShape` — optional JSON-Schema-like hint for `inputData` rows.

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

Match each `requiredCredentialTypes[i]` to a credential whose `type` equals
it. Keep `id` and `name`; you need both.

### `POST /api/v1/ephemeral-nodes/execute`

Request body:

```json
{
  "nodeType": "n8n-nodes-base.slack",
  "nodeTypeVersion": 2.3,
  "nodeParameters": {
    "resource": "message",
    "operation": "post",
    "channel": "#general",
    "text": "hello"
  },
  "credentials": {
    "slackApi": { "id": "R2DjclaysHbqn778", "name": "My Slack" }
  },
  "inputData": [{ "userId": 1 }]
}
```

Field rules:

- `nodeType` (string, required) — from discovery.
- `nodeTypeVersion` (number, required) — from discovery. Must match what
  discovery returned; arbitrary versions will be rejected.
- `nodeParameters` (object, required) — keys depend on the node. Start from
  `exampleParameters`.
- `credentials` (object, optional) — keyed by credential **type** (e.g.
  `slackApi`), value is `{ id, name }` from `GET /credentials`. Omit if the
  node has no `requiredCredentialTypes`.
- `inputData` (array of objects, optional) — rows the node iterates over.
  Each object becomes one item's `json`. Default: `[]`.

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
| 400 | Request rejected before execution. | Unknown `nodeType`; trigger node; `sendAndWait`/`dispatchAndWait` operation; credential not accessible; credential type mismatch. |
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
- One node per request. To chain nodes, call execute multiple times and pass
  the previous response's `data` as the next `inputData`.

## Minimal worked example

```bash
# 1. Find a node.
curl -s -H "X-N8N-API-KEY: $KEY" \
  "$N8N/api/v1/ephemeral-nodes?nodeType=n8n-nodes-base.httpRequest" \
  | jq '.data[0] | {nodeType, nodeTypeVersion, requiredCredentialTypes}'
# → { "nodeType": "n8n-nodes-base.httpRequest", "nodeTypeVersion": 4.2, "requiredCredentialTypes": [] }

# 2. No credentials needed → run it.
curl -s -X POST \
  -H "X-N8N-API-KEY: $KEY" -H "Content-Type: application/json" \
  "$N8N/api/v1/ephemeral-nodes/execute" \
  -d '{
    "nodeType": "n8n-nodes-base.httpRequest",
    "nodeTypeVersion": 4.2,
    "nodeParameters": { "url": "https://httpbin.org/get", "method": "GET" }
  }' | jq '{status, sample: .data[0]}'
```
