---
name: n8n:run-n8n-node
description: >-
  Runs a single n8n node against a live n8n instance via the Public API — no
  workflow saved, no execution row written. Use when the user asks to test a
  node, hit an integration once (HTTP request, Slack message, DB query),
  prototype a node call before wiring it into a workflow, or perform a
  one-off action against a third-party service (send a Slack message, post
  to Notion, query Postgres, call an API, etc.) using credentials they
  already have configured in n8n — so the LLM reuses the stored n8n
  credential instead of asking the user for tokens or API keys.
allowed-tools: Bash(curl:*), Bash(jq:*), Read
---

# Run an n8n node via the Public API

Execute one node against a remote n8n instance using the ephemeral-node
endpoints. No workflow is persisted; the node runs in the API key owner's
personal project.

## Prerequisites

Environment:

- `N8N_API_URL` — base URL (e.g. `https://n8n.example.com`)
- `N8N_API_KEY` — Public API key with scopes `ephemeralNode:read`,
  `ephemeralNode:execute`, and `credential:list` (add `project:list` only if
  the key needs cross-project access — personal-project use does not).

If either is missing, ask the user to set them before continuing.

## Flow

Always follow this order. Skipping discovery is the most common reason an
execute call fails with "unknown node type" or "credential not accessible".

1. **List runnable nodes** — `GET /ephemeral-nodes` to pick `nodeType` +
   `nodeTypeVersion`. Filter by `?nodeType=…` once you know it.
2. **List credentials** — `GET /credentials` to find `{ id, name, type }` for
   any credential the node needs. Match by `type` to the node's
   `requiredCredentialTypes`.
3. **Execute** — `POST /ephemeral-nodes/execute` with the resolved
   `nodeType`, `nodeTypeVersion`, `nodeParameters`, optional `credentials`,
   and optional `inputData`.

Never guess `nodeType` strings or credential IDs. Always read them from the
discovery endpoints first.

## Endpoints

### 1. Discover nodes

```bash
curl -s -H "X-N8N-API-KEY: $N8N_API_KEY" \
  "$N8N_API_URL/api/v1/ephemeral-nodes" | jq
```

Each item:

```json
{
  "nodeType": "n8n-nodes-base.httpRequest",
  "nodeTypeVersion": 4.2,
  "displayName": "HTTP Request",
  "description": "Makes an HTTP request and returns the response data",
  "category": "Core Nodes",
  "exampleParameters": { "url": "https://api.example.com", "method": "GET" },
  "requiredCredentialTypes": []
}
```

Filter:

```bash
curl -s -H "X-N8N-API-KEY: $N8N_API_KEY" \
  "$N8N_API_URL/api/v1/ephemeral-nodes?nodeType=n8n-nodes-base.slack" | jq
```

Paginate with `?cursor=…&limit=…` if `nextCursor` is non-null.

### 2. Discover credentials

```bash
curl -s -H "X-N8N-API-KEY: $N8N_API_KEY" \
  "$N8N_API_URL/api/v1/credentials" | jq '.data[] | {id, name, type}'
```

Match each `requiredCredentialTypes[i]` from step 1 to a credential whose
`type` equals it. Keep the `id` and `name` — both go into the execute body.

### 3. Execute

```bash
curl -s -X POST \
  -H "X-N8N-API-KEY: $N8N_API_KEY" \
  -H "Content-Type: application/json" \
  "$N8N_API_URL/api/v1/ephemeral-nodes/execute" \
  -d '{
    "nodeType": "n8n-nodes-base.httpRequest",
    "nodeTypeVersion": 4.2,
    "nodeParameters": {
      "url": "https://api.example.com/users",
      "method": "GET"
    }
  }' | jq
```

With a credential:

```bash
curl -s -X POST \
  -H "X-N8N-API-KEY: $N8N_API_KEY" \
  -H "Content-Type: application/json" \
  "$N8N_API_URL/api/v1/ephemeral-nodes/execute" \
  -d '{
    "nodeType": "n8n-nodes-base.slack",
    "nodeTypeVersion": 2.3,
    "nodeParameters": {
      "resource": "message",
      "operation": "post",
      "channel": "#general",
      "text": "hello from the public API"
    },
    "credentials": {
      "slackApi": { "id": "R2DjclaysHbqn778", "name": "My Slack" }
    }
  }' | jq
```

Pass row-shaped input the node should iterate over:

```json
"inputData": [{ "userId": 1 }, { "userId": 2 }]
```

## Response shape

```json
{ "status": "success", "data": [{ "statusCode": 200, "body": "..." }] }
```

```json
{ "status": "error", "data": [], "error": "Request failed with status 404" }
```

`status: "error"` still returns HTTP 200 — the node ran but failed (e.g. a
remote API returned an error). HTTP 400 means the **request** was rejected
(unknown node type, trigger node, blacklisted operation, invalid
credentials). 401/403 mean the API key lacks scope.

## Constraints

- Trigger nodes are rejected.
- Operations `sendAndWait` and `dispatchAndWait` are rejected.
- Only nodes returned by `GET /ephemeral-nodes` are executable.
- Credentials must be accessible to the API key's personal project.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| 400 `Node is not usable as a tool` | Node not in the catalogue. | Re-run `GET /ephemeral-nodes`; pick a listed one. |
| 400 `Trigger nodes cannot be executed standalone` | You picked a trigger. | Pick a non-trigger node. |
| 400 `Credential ... is not accessible` | Credential belongs to another project. | Use a credential from `GET /credentials` for this API key. |
| 400 `Credential ... has type ... but the node expects ...` | Credential type mismatch. | Match `requiredCredentialTypes[i]` to credential `type` exactly. |
| 403 | Key missing `ephemeralNode:read` or `ephemeralNode:execute`. | Regenerate the key with the right scopes. |

## Output format

When reporting back to the user, summarise:

1. Which node ran (`nodeType@version`).
2. Whether it succeeded (`status`).
3. A compact view of `data` (one or two rows; truncate long bodies).

Do not dump the full response unless asked.
