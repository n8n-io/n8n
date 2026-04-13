# Filesystem Access for Instance AI

> **ADR**: ADR-025 (gateway protocol), ADR-027 (auto-connect UX)
> **Status**: Implemented — gateway-only architecture via `@n8n/computer-use` daemon
> **Depends on**: ADR-002 (interface boundary)

## Problem

The instance AI builds workflows generically. When a user says "sync my users
to HubSpot", the agent guesses the data shape. If it could read the user's
actual code — API routes, schemas, configs — it would build workflows that fit
the project precisely.

## Architecture Overview

Filesystem access is provided exclusively through the **gateway protocol** —
a lightweight daemon (`@n8n/computer-use`) runs on the user's machine and
bridges file access to the n8n server via SSE.

```
┌─────────────────────────────────┐
│         AI Agent Tools          │
│  (created from MCP server)      │
└──────────────┬──────────────────┘
               │ calls
┌──────────────▼──────────────────┐
│  LocalMcpServer                 │  ← interface boundary
│  (getAvailableTools, callTool)  │
└──────────────┬──────────────────┘
               │ implemented by
               ▼
         LocalGateway
         (@n8n/computer-use daemon)
```

The gateway protocol provides filesystem access via a lightweight daemon
running on the user's machine.

The protocol is simple:
1. **Daemon connects** to `GET /instance-ai/gateway/events` (SSE)
2. **Server publishes** `filesystem-request` events when the agent needs files
3. **Daemon reads** the file from local disk
4. **Daemon POSTs** the result to `POST /instance-ai/gateway/response/:requestId`

```
Agent calls readFile("src/index.ts")
  → LocalGateway publishes filesystem-request to SSE subscriber
  → Daemon receives event, reads file from disk
  → Daemon POSTs content to /instance-ai/gateway/response/:requestId
  → Gateway resolves pending Promise → tool gets FileContent back
```

The `@n8n/computer-use` CLI daemon is one implementation of this protocol. Any
application that speaks SSE + HTTP POST can serve as a gateway — a Mac app,
an Electron desktop app, a VS Code extension, or a mobile companion.

**Authentication**: Gateway endpoints use a shared API key
(`N8N_INSTANCE_AI_GATEWAY_API_KEY`) or a one-time pairing token that gets
upgraded to a session key on init (see [Authentication](#authentication) below).

---

## Service Interface

Defined in `packages/@n8n/instance-ai/src/types.ts`:

```typescript
interface LocalMcpServer {
  getAvailableTools(): McpTool[];
  getToolsByCategory(category: string): McpTool[];
  callTool(req: McpToolCallRequest): Promise<McpToolCallResult>;
}
```

The `localMcpServer` field in `InstanceAiContext` is **optional** — when no
gateway is connected, filesystem tools are not registered with the agent.

---

## Tools

Tools are **dynamically created** from the MCP server's advertised capabilities
when a gateway is connected. See `create-tools-from-mcp-server.ts`.

---

## Frontend UX (ADR-027)

The `LocalGatewaySection` component has 3 states:

| State | Condition | UI |
|-------|-----------|-----|
| **Connected** | `isGatewayConnected` | Green indicator with connected host and capabilities |
| **Connecting** | `isDaemonConnecting` | Spinner: "Connecting..." |
| **Setup needed** | Default | `npx @n8n/computer-use` command + copy button + waiting spinner |

### Auto-connect flow

The user runs `npx @n8n/computer-use` and everything connects automatically. No
URLs, no tokens, no buttons.

```mermaid
sequenceDiagram
    participant UI as Frontend (browser)
    participant Daemon as computer-use daemon (localhost:7655)
    participant Server as n8n Backend

    UI->>Daemon: GET localhost:7655/health (polling every 5s)
    Daemon-->>UI: 200 OK
    UI->>Server: Request pairing token
    Server-->>UI: One-time token (5-min TTL)
    UI->>Daemon: POST localhost:7655/connect (token + server URL)
    Daemon->>Server: SSE subscribe + upload directory tree
    Server-->>Daemon: Session key (token consumed)
    Server-->>UI: Push: gateway connected
    Note over UI: UI → "Connected"
```

The browser mediates the pairing — it is the only component with network
access to both the local daemon (`localhost:7655`) and the n8n server. The
pairing token is ephemeral (5-min TTL, single-use), and once consumed, all
subsequent communication uses a session key.

### Auto-connect by deployment scenario

#### Self-hosted (bare metal / Docker / Kubernetes)

Whether n8n runs on bare metal or inside a container, it **cannot** directly
read files from the user's project directory. The gateway bridge is required.

```mermaid
sequenceDiagram
    participant Browser as Browser (host)
    participant Daemon as computer-use daemon (host:7655)
    participant Server as n8n server (container)

    Note over Browser,Daemon: 1. User starts daemon
    Daemon->>Daemon: npx @n8n/computer-use (scans project dir)

    Note over Browser,Daemon: 2. Browser detects daemon
    Browser->>Daemon: GET localhost:7655/health (polling every 5s)
    Daemon-->>Browser: 200 OK

    Note over Browser,Server: 3. Pairing
    Browser->>Server: Request pairing token
    Server-->>Browser: One-time token (5-min TTL)
    Browser->>Daemon: POST localhost:7655/connect (token + server URL)

    Note over Daemon,Server: 4. Daemon connects to server
    Daemon->>Server: SSE subscribe + upload directory tree
    Server-->>Daemon: Session key (token consumed)
    Server-->>Browser: Push: gateway connected
    Note over Browser: UI → "Connected"
```

**Why this works:** the browser is the only component that can see **both** the
daemon (`localhost:7655` on the host) and the n8n server (container network or
mapped port). It brokers the pairing between the two.

#### Cloud (n8n Cloud)

The flow is **identical** to the Docker/K8s path. The n8n server is remote,
so the gateway bridge is required.

```mermaid
sequenceDiagram
    participant Browser as Browser (user's machine)
    participant Daemon as computer-use daemon (localhost:7655)
    participant Cloud as n8n Cloud server

    Browser->>Daemon: GET localhost:7655/health
    Daemon-->>Browser: 200 OK
    Browser->>Cloud: Request pairing token
    Cloud-->>Browser: One-time token
    Browser->>Daemon: POST localhost:7655/connect (token + cloud URL)
    Daemon->>Cloud: SSE subscribe (outbound HTTPS)
    Cloud-->>Daemon: Session key
    Cloud-->>Browser: Push: gateway connected
    Note over Browser: UI → "Connected"
```

**Key difference from Docker self-hosted:** the daemon connects **outbound**
to the cloud server over standard HTTPS. No ports need to be exposed, no
firewall rules — SSE is a regular outbound connection.

#### Deployment summary

| Deployment | Access path | Daemon needed? | User action |
|------------|-------------|----------------|-------------|
| Self-hosted | Gateway bridge | Yes | `npx @n8n/computer-use` on host |
| n8n Cloud | Gateway bridge | Yes | `npx @n8n/computer-use` on local machine |

Alternatively, setting `N8N_INSTANCE_AI_GATEWAY_API_KEY` on both the n8n
server and the daemon skips the pairing flow entirely — useful for permanent
daemon setups or headless environments.

### Filesystem toggle

The UI includes a toggle switch to temporarily disable filesystem access
without disconnecting the gateway. This calls `POST /filesystem/toggle` and
the agent stops receiving filesystem tools until re-enabled.

---

## Gateway Protocol

The protocol has three phases:

```mermaid
sequenceDiagram
    participant Client as Client (user's machine)
    participant GW as Gateway (n8n server)
    participant Agent as AI Agent

    Note over Client,GW: Phase 1: Connect
    Client->>GW: Subscribe via SSE
    Client->>GW: Upload initial state (directory tree)
    GW-->>Client: Session key

    Note over Agent,Client: Phase 2: Serve requests
    Agent->>GW: Operation request
    GW-->>Client: SSE event with request ID + operation + args
    Client->>Client: Execute locally
    Client->>GW: POST response with request ID
    GW-->>Agent: Result

    Note over Client,GW: Phase 3: Disconnect
    Client->>GW: Graceful disconnect
    GW->>GW: Clean up pending requests
```

- **SSE for push**: the server publishes operation requests to the client as events
- **HTTP POST for responses**: the client posts results back, keyed by request ID
- **Timeout per request**: 30 seconds; pending requests are rejected on disconnect
- **Keep-alive pings**: every 15 seconds to detect stale connections
- **Exponential backoff**: auto-reconnect from 1s up to 30s max

### Endpoint reference

| Step | Method | Path | Auth | Body |
|------|--------|------|------|------|
| Connect | `GET` | `/instance-ai/gateway/events?apiKey=<token>` | API key query param | — (SSE stream) |
| Init | `POST` | `/instance-ai/gateway/init` | `X-Gateway-Key` header | `{ rootPath, tree: [{path, type, sizeBytes}], treeText }` |
| Respond | `POST` | `/instance-ai/gateway/response/:requestId` | `X-Gateway-Key` header | `{ data }` or `{ error }` |
| Create link | `POST` | `/instance-ai/gateway/create-link` | Session auth (cookie) | — |
| Status | `GET` | `/instance-ai/gateway/status` | Session auth (cookie) | — |
| Disconnect | `POST` | `/instance-ai/gateway/disconnect` | `X-Gateway-Key` header | — |
| Toggle FS | `POST` | `/instance-ai/filesystem/toggle` | Session auth (cookie) | — |

### SSE event format

```json
{
  "type": "filesystem-request",
  "payload": {
    "requestId": "gw_abc123",
    "operation": "read-file",
    "args": { "filePath": "src/index.ts", "maxLines": 500 }
  }
}
```

Operations: `read-file` and `search-files`. Tree/list operations are served
from the cached directory tree uploaded during init — no round-trip needed.

### Authentication

Two options:
- **Static**: Set `N8N_INSTANCE_AI_GATEWAY_API_KEY` env var on the n8n server.
  The static key is used for all requests — no pairing/session upgrade.
- **Dynamic (pairing → session key)**:
  1. `POST /instance-ai/gateway/create-link` (requires session auth) →
     returns `{ token, command }`. The token is a **one-time pairing token**
     (5-min TTL).
  2. Daemon calls `POST /instance-ai/gateway/init` with the pairing token →
     server consumes the token and returns `{ ok: true, sessionKey }`.
  3. All subsequent requests (SSE, response) use the **session key** instead
     of the consumed pairing token.

```
create-link → pairingToken (5 min TTL, single-use)
                 │
                 ▼
            gateway/init  ──► consumed → sessionKey issued
                                            │
                                            ▼
                                  SSE + response use sessionKey
```

This prevents token replay: the pairing token is visible in terminal output
and `ps aux`, but it becomes useless after the first successful `init` call.
All key comparisons use `timingSafeEqual()` to prevent timing attacks.

---

## Extending the Gateway: Building Custom Clients

The gateway protocol is **client-agnostic** — `@n8n/computer-use` is just one
implementation. Any application that speaks the protocol can serve as a
filesystem provider: a desktop app (Electron, Tauri), a VS Code extension,
a Go binary, a mobile companion, etc.

Any client that implements three interactions is a valid gateway client:
1. **Subscribe**: open an SSE connection to receive operation requests
2. **Initialize**: upload initial state (for filesystem: the directory tree)
3. **Respond**: handle each request locally and POST the result back

### What you do NOT need to change

- **No agent changes** — tools call the interface, not the transport
- **No gateway changes** — `LocalGateway` is protocol-level
- **No controller changes** — endpoints are client-agnostic
- **No frontend changes** — unless you want auto-connect (see below)

### Optional: auto-connect support

The frontend probes `http://127.0.0.1:7655/health` every 5s to auto-detect
a running daemon. To support this for a custom client:

1. Listen on port 7655 (or any port, but 7655 gets auto-detected)
2. Respond to `GET /health` with `200 OK`
3. Accept `POST /connect` with `{ url, token }` — then use those to connect
   to the gateway endpoints above

If your client has its own auth/connection flow (e.g., a desktop app that
talks to n8n directly), you can skip auto-connect entirely and call the
gateway endpoints with your own token.

No changes are needed on the n8n server. The protocol, auth, and lifecycle
are client-agnostic.

---

## Security

| Layer | Protection |
|-------|-----------|
| Read-only | No write methods on interface |
| File size | 512 KB max per read |
| Line limits | 200 default, 500 max per read |
| Binary detection | Null-byte check in first 8 KB |
| Directory containment | `path.resolve()` + `fs.realpath()` when basePath is set |
| Auth | Timing-safe key comparison (`timingSafeEqual()`) |
| Pairing token | One-time use, 5-min TTL, consumed on init |
| Session key | Server-issued, replaces pairing token after init |
| Request timeout | 30s per gateway round-trip |
| Keep-alive | 15s ping interval to detect stale connections |

### Directory exclusions

The daemon excludes common non-essential directories from the tree scan:

`node_modules`, `.git`, `dist`, `build`, `.next`, `.nuxt`, `__pycache__`,
`.cache`, `.turbo`, `coverage`, `.venv`, `venv`, `.idea`, `.vscode`,
`.output`, `.svelte-kit`

### Entry count caps

| Component | Max entries | Default depth |
|-----------|-------------|---------------|
| Tree scanner (daemon) | 10,000 | 8 |

The daemon scans broadly (10,000 entries, depth 8) because it uploads
the full tree on init for cached queries.

---

## Configuration

| Env var | Default | Purpose |
|---------|---------|---------|
| `N8N_INSTANCE_AI_GATEWAY_API_KEY` | none | Static auth key for gateway (skips pairing flow) |

No env vars needed for most deployments. The browser auto-connects the daemon
via the pairing flow.

See `docs/configuration.md` for the full configuration reference.

---

## Package Structure

| Package | Responsibility |
|---------|----------------|
| `@n8n/instance-ai` | Agent core: service interfaces, tool definitions, data shapes. Framework-agnostic, zero n8n dependencies. |
| `packages/cli/.../instance-ai/` | n8n backend: HTTP endpoints, gateway singleton, event bus. |
| `@n8n/computer-use` | Reference gateway client: standalone CLI daemon. HTTP server, SSE client, local file reader, directory scanner. Independently installable via npx. |

### Tree scanner behavior

The reference daemon (`@n8n/computer-use`) scans the user's project directory on
startup:

- **Algorithm**: Breadth-first, broad top-level coverage before descending
  into deeply nested paths
- **Depth limit**: 8 levels (default)
- **Entry cap**: 10,000
- **Sort order**: Directories first, then files, alphabetical within each group
- **Excluded directories**: node_modules, .git, dist, build, coverage,
  \_\_pycache\_\_, .venv, venv, .vscode, .idea, .next, .nuxt, .cache, .turbo,
  .output, .svelte-kit
