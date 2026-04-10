# Local Gateway — Backend Technical Specification

> Feature behaviour is defined in [local-gateway.md](./local-gateway.md).
> This document covers the backend implementation in
> `packages/cli/src/modules/instance-ai`.

---

## Table of Contents

1. [Component Overview](#1-component-overview)
2. [Authentication Model](#2-authentication-model)
3. [HTTP API](#3-http-api)
4. [Gateway Lifecycle](#4-gateway-lifecycle)
5. [Per-User Isolation](#5-per-user-isolation)
6. [Tool Call Dispatch](#6-tool-call-dispatch)
7. [Disconnect & Reconnect](#7-disconnect--reconnect)
8. [Module Settings](#8-module-settings)
9. [Session Model](#9-session-model)

---

## 1. Component Overview

The local gateway involves three runtime processes:

- **n8n server** — hosts the REST/SSE endpoints and orchestrates the AI agent.
- **computer-use daemon or local-gateway app** — runs on the user's local machine; executes tool calls.
- **Browser (frontend)** — initiates the connection and displays gateway status.

```mermaid
graph LR
    FE[Browser / Frontend]
    SRV[n8n Server]
    DAEMON[computer-use Daemon\nlocal machine]

    FE -- "POST /gateway/create-link\n(user auth)" --> SRV
    FE -- "GET /gateway/status\n(user auth)" --> SRV
    SRV -- "SSE push: instanceAiGatewayStateChanged\n(per-user)" --> FE

    DAEMON -- "POST /gateway/init  ➊\n(x-gateway-key, on connect & reconnect)" --> SRV
    DAEMON <-- "GET /gateway/events?apiKey=...  ➋\n(persistent SSE, tool call requests)" --> SRV
    DAEMON -- "POST /gateway/response/:id\n(x-gateway-key, per tool call)" --> SRV
    DAEMON -- "POST /gateway/disconnect\n(x-gateway-key, on shutdown)" --> SRV
```

> **➊ → ➋ ordering**: the daemon always calls `POST /gateway/init` before opening the SSE
> stream. The numbers indicate startup sequence, not request direction.

### Key classes

| Class | File | Responsibility |
|---|---|---|
| `LocalGatewayRegistry` | `filesystem/local-gateway-registry.ts` | Per-user state: tokens, session keys, timers, gateway instances |
| `LocalGateway` | `filesystem/local-gateway.ts` | Single-user MCP gateway: tool call dispatch, pending request tracking |
| `InstanceAiService` | `instance-ai.service.ts` | Thin delegation layer; exposes registry methods to the controller |
| `InstanceAiController` | `instance-ai.controller.ts` | HTTP endpoints; routes daemon requests to the correct user's gateway |

---

## 2. Authentication Model

The gateway uses two distinct authentication schemes for the two sides of the
connection.

### User-facing endpoints

Standard n8n session or API-key auth (`@Authenticated` / `@GlobalScope`).
The `userId` is taken from `req.user.id`.

### Daemon-facing endpoints (`skipAuth: true`)

These endpoints are not protected by the standard auth middleware. Instead,
they verify a **gateway API key** passed in one of two ways:

- `GET /gateway/events` — `?apiKey=<key>` query parameter (required for
  `EventSource`, which cannot set headers).
- All other daemon endpoints — `x-gateway-key` request header.

The key is resolved to a `userId` by `validateGatewayApiKey()` in the
controller:

```
1. If N8N_INSTANCE_AI_GATEWAY_API_KEY env var is set and matches → userId = 'env-gateway'
2. Otherwise look up the key in LocalGatewayRegistry.getUserIdForApiKey()
   - Matches pairing tokens (TTL: 5 min, one-time use)
   - Matches active session keys (persistent until explicit disconnect)
3. No match → ForbiddenError
```

Timing-safe comparison (`crypto.timingSafeEqual`) is used for the env-var
path to prevent timing attacks.

---

## 3. HTTP API

All paths are prefixed with `/api/v1/instance-ai`.

### User-facing

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/gateway/create-link` | User | Generate a pairing token; returns `{ token, command }` |
| `GET` | `/gateway/status` | User | Returns `{ connected, connectedAt, directory }` for the requesting user |

### Daemon-facing (`skipAuth`)

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/gateway/events` | API key (`?apiKey`) | SSE stream; emits tool call requests to the daemon |
| `POST` | `/gateway/init` | API key (`x-gateway-key`) | Daemon announces capabilities; swaps pairing token for session key |
| `POST` | `/gateway/response/:requestId` | API key (`x-gateway-key`) | Daemon delivers a tool call result or error |
| `POST` | `/gateway/disconnect` | API key (`x-gateway-key`) | Daemon gracefully terminates the connection |

#### POST `/gateway/create-link` — response

```typescript
{
  token: string;    // gw_<nanoid(32)> — pairing token for /gateway/init
  command: string;  // "npx @n8n/computer-use <baseUrl> <token>"
}
```

#### GET `/gateway/status` — response

```typescript
{
  connected: boolean;
  connectedAt: string | null;  // ISO timestamp
  directory: string | null;    // rootPath advertised by daemon
}
```

#### POST `/gateway/init` — request body

```typescript
// InstanceAiGatewayCapabilities
{
  rootPath: string;   // Filesystem root the daemon exposes
  tools: McpTool[];   // MCP tool definitions the daemon supports
}
```

Response: `{ ok: true, sessionKey: string }` on first connect.
Response: `{ ok: true }` when reconnecting with an active session key.

#### POST `/gateway/response/:requestId` — request body

```typescript
{
  result?: {
    content: Array<
      | { type: 'text'; text: string }
      | { type: 'image'; data: string; mimeType: string }
    >;
    isError?: boolean;
  };
  error?: string;
}
```

---

## 4. Gateway Lifecycle

### 4.1 Initial connection

```mermaid
sequenceDiagram
    participant FE as Browser
    participant SRV as n8n Server
    participant D as computer-use Daemon

    FE->>SRV: POST /gateway/create-link (user auth)
    SRV-->>FE: { token: "gw_...", command: "npx @n8n/computer-use ..." }

    Note over FE: User runs the command on their machine

    D->>SRV: POST /gateway/init (x-gateway-key: gw_...)
    Note over D: uploadCapabilities() — resolves tool definitions,<br/>then POSTs rootPath + McpTool[]
    Note over SRV: consumePairingToken(userId, token)<br/>Issues session key sess_...
    SRV-->>D: { ok: true, sessionKey: "sess_..." }
    Note over D: Stores session key, uses it for all<br/>subsequent requests instead of the pairing token

    D->>SRV: GET /gateway/events?apiKey=sess_... (SSE, persistent)
    Note over SRV: SSE connection held open,<br/>tool call requests streamed as events
    SRV-->>FE: push: instanceAiGatewayStateChanged { connected: true, directory }
```

### 4.2 Reconnection with existing session key

After the initial handshake the daemon persists the session key in memory.
On reconnect (e.g. after a transient network drop):

```mermaid
sequenceDiagram
    participant D as computer-use Daemon
    participant SRV as n8n Server

    D->>SRV: POST /gateway/init (x-gateway-key: sess_...)
    Note over SRV: Session key found → userId<br/>initGateway(userId, capabilities), no token consumed
    SRV-->>D: { ok: true }

    D->>SRV: GET /gateway/events?apiKey=sess_... (SSE, persistent)
    Note over SRV: SSE connection re-established
```

`generatePairingToken()` also short-circuits: if an active session key
already exists for the user it is returned directly, so a new pairing token
is never issued while a session is live.

### 4.3 Token & key lifecycle

```
generatePairingToken(userId)
│  Existing session key?  ──yes──▶  return session key
│  Valid pairing token?   ──yes──▶  return existing token
│  Otherwise             ──────▶  create gw_<nanoid>, register in reverse lookup

consumePairingToken(userId, token)
│  Validates token matches & is within TTL (5 min)
│  Deletes pairing token from reverse lookup
│  Creates sess_<nanoid>, registers in reverse lookup
└─▶ returns session key

clearActiveSessionKey(userId)
   Deletes session key from reverse lookup
   Nulls state (daemon must re-pair on next connect)
```

---

## 5. Per-User Isolation

All gateway state is held in `LocalGatewayRegistry`, which maintains two
maps:

```
userGateways: Map<userId, UserGatewayState>
apiKeyToUserId: Map<token|sessionKey, userId>   ← reverse lookup
```

`UserGatewayState` contains:

```typescript
interface UserGatewayState {
  gateway: LocalGateway;
  pairingToken: { token: string; createdAt: number } | null;
  activeSessionKey: string | null;
  disconnectTimer: ReturnType<typeof setTimeout> | null;
  reconnectCount: number;
}
```

**Isolation guarantees:**

- Daemon endpoints resolve a `userId` from `validateGatewayApiKey()` and
  operate exclusively on that user's `UserGatewayState`. No endpoint accepts
  a `userId` from the request body.
- `getGateway(userId)` creates state lazily; `findGateway(userId)` returns
  `undefined` if no state exists (used in `executeRun` to avoid allocating
  state for users who have never connected).
- Pairing tokens and session keys are globally unique (`nanoid(32)`) and
  never shared across users.
- `disconnectAll()` on shutdown iterates `userGateways.values()` and tears
  down every gateway in isolation.

---

## 6. Tool Call Dispatch

### 6.1 Normal tool call (no confirmation required)

When the AI agent needs to invoke a local tool the call flows through
`LocalGateway`:

```mermaid
sequenceDiagram
    participant A as AI Agent (Mastra tool)
    participant GW as LocalGateway
    participant SRV as Controller (SSE)
    participant D as computer-use Daemon

    A->>GW: callTool({ name, args })
    GW->>GW: generate requestId, create Promise (30 s timeout)
    GW->>SRV: emit "filesystem-request" via EventEmitter
    SRV-->>D: SSE event: { type: "filesystem-request", payload: { requestId, toolCall } }

    D->>D: execute tool locally
    D->>SRV: POST /gateway/response/:requestId { result }
    SRV->>GW: resolveRequest(userId, requestId, result)
    GW->>GW: resolve Promise, clear timeout
    GW-->>A: McpToolCallResult
```

If the daemon does not respond within 30 seconds the promise rejects and
the agent receives a tool-error event.

If the gateway disconnects while requests are pending, `LocalGateway.disconnect()`
rejects all outstanding promises immediately with `"Local gateway disconnected"`.

### 6.2 Tool call with resource-access confirmation

When a tool group operates in `Ask` mode and no stored rule matches the
resource, the daemon returns a `GATEWAY_CONFIRMATION_REQUIRED` error instead
of a result. The Mastra tool layer handles this by suspending the agent —
persisting its state to the database — and resuming it after the user
responds. This means the confirmation survives page reloads and server
restarts.

```mermaid
sequenceDiagram
    participant FE as Browser (Frontend)
    participant SRV as n8n Server
    participant DB as Database
    participant D as computer-use Daemon

    Note over SRV: First invocation — tool execute() called by Mastra
    SRV->>D: callTool({ name, args }) via LocalGateway
    D-->>SRV: { isError: true, content: ["GATEWAY_CONFIRMATION_REQUIRED::..."] }
    SRV->>SRV: parse GatewayConfirmationRequiredPayload
    SRV->>DB: suspend() — persist agent snapshot + confirmation payload
    SRV-->>FE: SSE confirmation-request event<br/>{ inputType: "resource-decision", resourceDecision: { resource, description, options: [...] } }

    FE->>FE: show GatewayResourceDecision panel
    Note over FE: User clicks a decision button (e.g. Allow for session)
    FE->>SRV: POST /confirm/:requestId { approved: true, resourceDecision: "allowForSession" }
    SRV->>DB: load agent snapshot, resume with resumeData

    Note over SRV: Second invocation — tool execute() called with resumeData
    SRV->>D: callTool({ name, args, _confirmation: "allowForSession" }) via LocalGateway
    D->>D: apply decision, execute tool
    D-->>SRV: { content: [...], isError: false }
    SRV-->>FE: SSE tool-result / text-delta events
```

**Key properties of this design:**

- Agent state is persisted to the database on suspension — the confirmation
  dialog survives page reloads and server restarts.
- The daemon returns `options` as a plain list of decision names (e.g.
  `["allowOnce", "allowForSession", "alwaysAllow", "denyOnce", "alwaysDeny"]`).
  The user's choice is sent back as the decision string directly — no token
  indirection.
- `_confirmation` is always stripped from LLM-provided args on the first-call
  path, so the agent cannot bypass the HITL flow by injecting a decision.
- If the user denies without providing a decision, `resumeData.resourceDecision`
  is absent and the tool returns an access-denied error to the agent
  without re-calling the daemon.

---

## 7. Disconnect & Reconnect

### Explicit disconnect (user or daemon-initiated)

`POST /gateway/disconnect`:
1. `clearDisconnectTimer(userId)` — cancels any pending grace timer.
2. `disconnectGateway(userId)` — marks gateway disconnected, rejects pending
   tool calls.
3. `clearActiveSessionKey(userId)` — removes session key from reverse lookup.
   The daemon must re-pair on the next connect.
4. Push notification sent to user: `instanceAiGatewayStateChanged { connected: false }`.

### Unexpected SSE drop (daemon crash / network loss)

Both sides react independently when the SSE connection drops.

**Daemon side** (`GatewayClient.connectSSE` — `onerror` handler):

1. Closes the broken `EventSource`.
2. Classifies the error:
   - **Auth error** (HTTP 403 / 500) → calls `reInitialize()`: re-uploads
     capabilities via `POST /gateway/init`, then reopens SSE. This handles
     the case where the server restarted and lost the session key.
     After 5 consecutive auth failures the daemon gives up and calls
     `onPersistentFailure()`.
   - **Any other error** → reopens SSE directly (session key is still valid).
3. Applies exponential backoff before each retry: `1s → 2s → 4s → … → 30s (cap)`.
4. Backoff and auth retry counter reset to zero on the next successful `onopen`.

**Server side** (`startDisconnectTimer` in `LocalGatewayRegistry`):

1. Starts a grace period before marking the gateway disconnected:
   - Grace period uses exponential backoff: `min(10s × 2^reconnectCount, 120s)`
   - `reconnectCount` increments each time the grace period expires.
2. If the daemon reconnects within the grace period:
   - `clearDisconnectTimer(userId)` cancels the timer.
   - `initGateway(userId, capabilities)` resets `reconnectCount = 0`.
3. If the grace period expires:
   - `disconnectGateway(userId)` marks the gateway disconnected and rejects
     pending tool calls.
   - The session key is **kept** — the daemon can still re-authenticate
     without re-pairing.
   - `onDisconnect` fires, sending `instanceAiGatewayStateChanged { connected: false }`.

```
Server grace period:
reconnectCount:  0       1       2       3    ...  n
grace period:   10 s   20 s   40 s   80 s  ...  120 s (cap)

Daemon retry delay:
retry:           1       2       3       4    ...  n
delay:           1 s     2 s     4 s     8 s  ...   30 s (cap)
```

---

## 8. Module Settings

`InstanceAiModule.settings()` returns global (non-user-specific) values to
the frontend. Gateway connection status is **not** included because it is
per-user.

```typescript
{
  enabled: boolean;                       // Model is configured and usable
  localGatewayDisabled: boolean;          // Admin/user opt-out flag
}
```

Per-user gateway state is delivered via two mechanisms:
- **Initial load** — `GET /gateway/status` (called on page mount).
- **Live updates** — targeted push notification `instanceAiGatewayStateChanged`
  sent only to the affected user via `push.sendToUsers(..., [userId])`.

---

## 9. Session Model

Tool group permission modes and the working directory are **session-scoped** —
they live in a `GatewaySession` object created at connect time and discarded
when the session ends.

### GatewaySession

`GatewaySession` is constructed from defaults (loaded from the settings file
and merged with any CLI/ENV overrides) and a reference to `SettingsStore` for
persistent rule delegation.

```typescript
class GatewaySession {
  constructor(
    defaults: { permissions: Record<ToolGroup, PermissionMode>; dir: string },
    settingsStore: SettingsStore,
  )

  // Mutable session settings — set by the confirmConnect prompt
  setPermissions(p: Record<ToolGroup, PermissionMode>): void
  setDir(dir: string): void

  // Read session settings
  get dir(): string
  getAllPermissions(): Record<ToolGroup, PermissionMode>
  getGroupMode(toolGroup: ToolGroup): PermissionMode  // includes filesystemRead→Write constraint

  // Permission check — used by GatewayClient for every tool call
  check(toolGroup: ToolGroup, resource: string): PermissionMode

  // Session-scoped allow rules — cleared on disconnect
  allowForSession(toolGroup: ToolGroup, resource: string): void
  clearSessionRules(): void

  // Persistent rules — delegate to SettingsStore
  alwaysAllow(toolGroup: ToolGroup, resource: string): void
  alwaysDeny(toolGroup: ToolGroup, resource: string): void

  // Flush pending writes on shutdown
  flush(): Promise<void>
}
```

### Permission check evaluation order

`check(toolGroup, resource)` evaluates rules in this order:

1. Persistent deny list → `'deny'` (absolute priority, even in Allow mode)
2. Persistent allow list → `'allow'`
3. Session allow set → `'allow'`
4. Group mode → result of `getGroupMode()` (includes cross-group constraints)

### Persistent rules

`alwaysAllow` / `alwaysDeny` resource rules still write through to the settings
file via `SettingsStore` so they persist across sessions.

### DaemonOptions.confirmConnect signature

```typescript
confirmConnect: (url: string, session: GatewaySession) => Promise<boolean> | boolean
```

The session is pre-seeded from defaults and passed to the `confirmConnect`
callback. The callback may mutate the session (e.g. via `setPermissions` /
`setDir`) before returning `true`. The daemon then uses the mutated session
for the duration of the connection.
