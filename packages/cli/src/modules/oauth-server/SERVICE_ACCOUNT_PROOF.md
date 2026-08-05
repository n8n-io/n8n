# Agent ↔ service-account identity proof (Track 3)

An internal construct — an **Agent** — is given a durable, verifiable identity and
lets it **self-authenticate at runtime**: it mints a short-lived OAuth token *as its
own service account* and crosses a real n8n-owned boundary (an MCP Server Trigger)
as itself, audience-isolated, with an audit trail on both ends.

This is the runbook for the whole story. The earlier Track-2 flow (mint a token from
a *demo-seeded* credential and call an MCP surface by hand) still works and is kept
verbatim as [§6](#6-track-2-curl-mechanics-still-valid) — Track 3 replaces the
demo-seeded credential with a **real provisioned-agent service account**.

Defaults assumed: base `http://localhost:5678`, SQLite at `~/.n8n/database.sqlite`.
The OAuth controllers are root-level, so there is **no `/rest/` prefix** on `/oauth/*`
or `/mcp-server/*`; the REST API (agents, impersonation, credentials) *is* under
`/rest/`.

## Environment flags

| Flag | Why |
| --- | --- |
| `N8N_ENV_FEAT_SERVICE_ACCOUNTS=true` | Gates all of Track 3: agent→SA provisioning, the reversible client secret, and the runtime mint hook. Everything below is a no-op without it. |
| `N8N_MCP_MANAGED_BY_ENV=true` + `N8N_MCP_ACCESS_ENABLED=true` | Turn on the **instance** MCP server (`/mcp-server/http`). Only needed for the Track-2 instance-MCP subsection; a per-workflow MCP Trigger (`/mcp/<path>`) is just an active workflow and does not need them. |

```bash
N8N_ENV_FEAT_SERVICE_ACCOUNTS=true \
N8N_MCP_MANAGED_BY_ENV=true N8N_MCP_ACCESS_ENABLED=true \
pnpm dev
```

The client secret is stored with reversible encryption (n8n's `Cipher`, the same key
that protects every other credential) rather than bcrypt, because the runtime must
present the secret outbound to mint. There is **no data migration** — Track 2 is
unshipped, so any pre-existing dev rows / the demo seed are simply re-created.

---

## 1. Durable anchor — provision an agent, get a service account for free

Create an agent in a project (owner/admin session). With the flag on, `create`
**eagerly provisions a 1:1 service-account User + a `service_account_credential`**
in one transaction; agents created before this change are backfilled lazily on
first autonomous run.

```bash
# projectId = your personal (or team) project id
curl -s -X POST "http://localhost:5678/rest/projects/$PROJECT_ID/agents/v2" \
  -H 'Content-Type: application/json' -b cookies.txt \
  -d '{"name":"Proof Agent"}'
```

See what was provisioned. `serviceAccountUserId` is not exposed on the agents API
(it is server-internal), so for the proof read it straight from the DB:

```bash
sqlite3 ~/.n8n/database.sqlite \
  "SELECT id, serviceAccountUserId FROM agents ORDER BY createdAt DESC LIMIT 1;"

# The SA is a passwordless User of type 'serviceAccount', named agent:<agentId>
sqlite3 ~/.n8n/database.sqlite \
  "SELECT id, email, firstName FROM \"user\" WHERE id = '<serviceAccountUserId>';"

# Its client credential (clientId visible; the secret is encrypted at rest)
sqlite3 ~/.n8n/database.sqlite \
  "SELECT clientId, userId FROM service_account_credential WHERE userId = '<serviceAccountUserId>';"
```

The auto-provisioned credential's raw secret is **never surfaced** — only the runtime
decrypts it (via `Cipher`) to mint. To reproduce a mint *by hand* (§4), issue a
*second*, throwaway credential for the same SA user, which returns the raw secret once:

```bash
SA_USER_ID='<serviceAccountUserId>'
curl -s -X POST http://localhost:5678/rest/service-account-credentials \
  -H 'Content-Type: application/json' -b cookies.txt \
  -d "{\"userId\":\"$SA_USER_ID\",\"label\":\"manual proof\"}"
# → { "clientId": "...", "clientSecret": "<shown once>" , ... }
```

## 2. Validation tool — impersonate the agent's SA, see what it can touch

Track 1's impersonation answers "what can this identity actually reach?". Start an
impersonation session for the agent's SA (requires `serviceAccount:impersonate`; a
human operator only — SA→SA is blocked):

```bash
curl -s -X POST http://localhost:5678/rest/impersonation \
  -H 'Content-Type: application/json' -b cookies.txt -c sa-cookies.txt \
  -d "{\"serviceAccountId\":\"$SA_USER_ID\"}"
```

Now, *as the SA* (using `sa-cookies.txt`), list what the identity owns/sees — its
personal project, and any credentials/workflows shared with it:

```bash
curl -s http://localhost:5678/rest/projects       -b sa-cookies.txt   # SA's projects
curl -s http://localhost:5678/rest/credentials     -b sa-cookies.txt   # credentials it can touch
```

Fresh agent SAs start least-privileged (their own personal project only). End the
session with `DELETE /rest/impersonation`.

## 3. The inbound surface — a protected MCP Server Trigger

Import the fixture
`packages/testing/playwright/workflows/mcp-trigger/mcp-trigger-n8n-oauth2-agent-proof.json`
(an **MCP Server Trigger v2**, `authentication=n8nOAuth2`, `requireExecuteAccess=false`,
path `agent-proof`, exposing one `echo` tool) and **activate** it. Its resource URL —
the audience tokens must carry — is:

```
{webhookBaseUrl}/{endpoints.mcp}/{path}  →  http://localhost:5678/mcp/agent-proof
```

## 4. Self-authentication across a real boundary

**How the agent does it autonomously.** Add an `McpClientTool` to the agent's config
with `authentication: n8nInternalOAuth2` and `endpointUrl` =
`http://localhost:5678/mcp/agent-proof`. `n8nInternalOAuth2` is an **identity-less
marker** credential — no stored secret, no hard reference to a specific SA. On *each*
tool call the runtime:

1. reads the **acting service-account user id** threaded onto the execution from
   server-side context (never from node input),
2. recovers that SA's client credential and decrypts the secret,
3. makes a **real HTTP `client_credentials` self-call** to this instance's own
   `/oauth/token`, with `resource` auto-derived from the outbound target URL, and
4. injects `Authorization: Bearer <token>` into the MCP call.

The MCP Server Trigger then verifies the token, audience-locked to `/mcp/agent-proof`,
and admits the agent's SA. (Do not wire a live LLM for the proof — the fixture in §3
is the inbound half; the McpClientTool wiring above is the outbound half.)

**The manual curl equivalent** (using the throwaway credential from §1):

```bash
RESOURCE='http://localhost:5678/mcp/agent-proof'
TOKEN=$(curl -s -X POST http://localhost:5678/oauth/token \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d grant_type=client_credentials -d client_id="$CLIENT_ID" -d client_secret="$CLIENT_SECRET" \
  --data-urlencode "resource=$RESOURCE" \
  | python3 -c 'import sys,json;print(json.load(sys.stdin)["access_token"])')

BODY='{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"curl","version":"1.0"}}}'

# with token → 200 initialize result (auth passed, bound to the agent SA)
curl -i -X POST http://localhost:5678/mcp/agent-proof \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -H 'Accept: application/json, text/event-stream' -d "$BODY"
```

**Audience isolation.** A token whose `aud` is `/mcp/agent-proof` is rejected at any
other surface. Mint a second token for a different resource (or reuse an instance-MCP
token) and call `/mcp/agent-proof` with it → **401 `invalid_token`**.

This whole path — provision → recover secret → HTTP mint → verify at own audience →
reject at a different audience — is proven in-process and over the real HTTP boundary
by the integration tests:

- `packages/cli/src/modules/oauth-server/__tests__/agent-service-account-mint.api.test.ts`
  (in-process exchange), and
- `packages/cli/src/modules/oauth-server/__tests__/agent-mint-hook.api.test.ts`
  (the real `InternalOAuth2MintService.mintForUser` HTTP self-call against a live
  test server, plus the audit assertions below).

## 5. Audit trail

Both ends emit through `EventService` into the standard audit relay (no custom logger):

- **mint** — `service-account-token-minted { sub, clientId, aud, outcome }`, emitted by
  `InternalOAuth2MintService` on the self-call.
- **verify** — `service-account-token-verified { sub, aud, outcome }`, emitted by
  `OAuthTokenService.verifyOAuthAccessToken` at the inbound gate.

A successful crossing produces one *minted* row (`outcome: 'success'`, `sub` = the
agent SA) and one matching *verified* row for the same `sub`/`aud`. The audience-
isolation rejection produces a *verified* `outcome: 'failure'`.

---

## 6. Track-2 curl mechanics (still valid)

The original inbound M2M flow, unchanged. Mint from a credential via
`grant_type=client_credentials`, then call an MCP surface. Nothing here is new
runtime — the mint path and MCP verification already exist.

### Demo-seeded credential

`N8N_SEED_DEMO_SERVICE_ACCOUNT=true` inserts a fixed credential owned by the instance
owner on startup (no-op if it already exists): **`client_id=demo-client`,
`client_secret=demo-secret`**. Off by default; never enable in production. To create
real credentials instead, use `POST /rest/service-account-credentials` (§1).

### Call the instance MCP server

`resource` is **required** and becomes the token `aud`; it must equal the URL you call.
MCP Streamable-HTTP requires `Accept: application/json, text/event-stream`.

```bash
RESOURCE='http://localhost:5678/mcp-server/http'
TOKEN=$(curl -s -X POST http://localhost:5678/oauth/token \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d grant_type=client_credentials -d client_id=demo-client -d client_secret=demo-secret \
  --data-urlencode "resource=$RESOURCE" \
  | python3 -c 'import sys,json;print(json.load(sys.stdin)["access_token"])')

BODY='{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"curl","version":"1.0"}}}'

# no token → 401 + WWW-Authenticate: Bearer
curl -i -X POST http://localhost:5678/mcp-server/http \
  -H 'Content-Type: application/json' -H 'Accept: application/json, text/event-stream' -d "$BODY"

# with token → 200 initialize result (auth passed)
curl -i -X POST http://localhost:5678/mcp-server/http \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -H 'Accept: application/json, text/event-stream' -d "$BODY"
```

(Basic-auth variant: `-u demo-client:demo-secret`, drop the two `-d client_*`.)
client_credentials mints with empty scopes, so a `200` on `initialize` is the clean
auth-pass signal; a later `tools/list` authenticates but returns few scope-gated tools.

---

## Design for later (not built)

The mint path is shaped so it can later target an **external** OAuth2 token endpoint:
the `n8nInternalOAuth2` marker credential would grow a `tokenUrl`/scope, and
`InternalOAuth2MintService` would post there instead of the hardcoded instance
endpoint. Delegated / on-behalf-of tokens (carrying the triggering human alongside the
agent) are also out of scope.

## Security notes

- **At-rest downgrade (info disclosure):** `clientSecret` moved bcrypt → reversible
  AES. Justified — n8n itself must present the secret outbound; consistent with how
  *all* n8n credentials are stored (the instance key is already the crown jewel).
  Inbound verify stays constant-time (`crypto.timingSafeEqual`).
- **Elevation of privilege:** the marker credential mints "as whoever is running me."
  The acting identity comes **only** from server-side execution context (the threaded
  agent SA), never from node input. Tokens are audience-locked to the exact target URL.
- **Least privilege / audience:** auto-derived `aud` = the exact target URL, so a token
  is usable only against the surface being called (isolation enforced at verify time).

## Gotchas

- `resource` mismatch vs the endpoint → `401 invalid_token`.
- Instance MCP server disabled → `403` / `insufficient_scope` even with a valid token.
- MCP Trigger node below v2 with `n8nOAuth2` → hard `401`.
- `N8N_MCP_MANAGED_BY_ENV=true` blocks the REST/UI MCP-settings toggle (expected).
- Inline agents (`inline:*`, no persisted row) have no SA → the mint hook errors
  clearly; only persisted agents self-authenticate.
