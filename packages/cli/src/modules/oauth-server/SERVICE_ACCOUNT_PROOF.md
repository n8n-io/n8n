# Service-account `client_credentials` → MCP proof

Track 2 (inbound M2M auth). Mint an OAuth token from a service-account credential
via `grant_type=client_credentials`, then call an MCP surface with it. Nothing here
is new runtime — the mint path and MCP verification already exist; this is a runbook.

Defaults assumed: base `http://localhost:5678`, SQLite at `~/.n8n/database.sqlite`.
The OAuth controllers are root-level, so there is **no `/rest/` prefix** on `/oauth/*`
or `/mcp-server/*`.

## 1. Start n8n (instance MCP enabled + demo credential seeded)

```bash
N8N_MCP_MANAGED_BY_ENV=true N8N_MCP_ACCESS_ENABLED=true \
N8N_SEED_DEMO_SERVICE_ACCOUNT=true \
pnpm dev
```

- `N8N_MCP_MANAGED_BY_ENV=true` + `N8N_MCP_ACCESS_ENABLED=true` turn on the instance MCP
  server (its `authorize()` gate checks MCP is enabled).
- `N8N_SEED_DEMO_SERVICE_ACCOUNT=true` inserts a fixed credential owned by the instance
  owner on startup (no-op if it already exists): **`client_id=demo-client`,
  `client_secret=demo-secret`**. Off by default; never enable in production.

To create real credentials instead, use the REST API (owner/admin):
`POST /rest/service-account-credentials` with `{ "userId": "<id>", "label": "<label>" }`
→ returns `clientSecret` **once**.

## 2. Mint a token (instance MCP audience)

`resource` is **required** and becomes the token `aud`; it must equal the URL you call.

```bash
RESOURCE='http://localhost:5678/mcp-server/http'
TOKEN=$(curl -s -X POST http://localhost:5678/oauth/token \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d grant_type=client_credentials -d client_id=demo-client -d client_secret=demo-secret \
  --data-urlencode "resource=$RESOURCE" \
  | python3 -c 'import sys,json;print(json.load(sys.stdin)["access_token"])')
```

(Basic-auth variant: `-u demo-client:demo-secret`, drop the two `-d client_*`.)

## 3. Call the instance MCP server

MCP Streamable-HTTP requires `Accept: application/json, text/event-stream`.

```bash
BODY='{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"curl","version":"1.0"}}}'

# no token → 401 + WWW-Authenticate: Bearer
curl -i -X POST http://localhost:5678/mcp-server/http \
  -H 'Content-Type: application/json' -H 'Accept: application/json, text/event-stream' -d "$BODY"

# with token → 200 initialize result (auth passed)
curl -i -X POST http://localhost:5678/mcp-server/http \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -H 'Accept: application/json, text/event-stream' -d "$BODY"
```

client_credentials mints with empty scopes, so a `200` on `initialize` is the clean
auth-pass signal; a later `tools/list` authenticates but returns few scope-gated tools.

## 4. Call a dummy-workflow MCP Trigger

Create a workflow with a single **MCP Server Trigger at typeVersion 2** (`n8nOAuth2`
mode is v2-only): `authentication=n8nOAuth2`, `path=proof`, and either keep the workflow
owned by the seeded owner (owner has `workflow:execute`) or set `requireExecuteAccess=false`.
**Activate** it. Its resource URL is `{webhookBaseUrl}/{endpoints.mcp}/{path}` =
`http://localhost:5678/mcp/proof`.

```bash
TOKEN2=$(curl -s -X POST http://localhost:5678/oauth/token \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d grant_type=client_credentials -d client_id=demo-client -d client_secret=demo-secret \
  --data-urlencode 'resource=http://localhost:5678/mcp/proof' \
  | python3 -c 'import sys,json;print(json.load(sys.stdin)["access_token"])')

curl -i -X POST http://localhost:5678/mcp/proof \
  -H "Authorization: Bearer $TOKEN2" \
  -H 'Content-Type: application/json' -H 'Accept: application/json, text/event-stream' -d "$BODY"
```

Audience isolation: reusing `$TOKEN` (aud = instance MCP) against `/mcp/proof` → **401**.

## Gotchas
- `resource` mismatch vs the endpoint → `401 invalid_token`.
- MCP server disabled → `403` / `insufficient_scope` even with a valid token.
- MCP Trigger node below v2 with `n8nOAuth2` → hard `401`.
- `N8N_MCP_MANAGED_BY_ENV=true` blocks the REST/UI MCP-settings toggle (expected).
