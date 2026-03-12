# n8n AI Gateway — Backend Specification

## Overview

This document captures the backend architecture and implementation decisions for the
n8n AI Gateway MVP. It complements the [product specification](./mvp-ai-gateway.md)
with concrete technical design.

LLM nodes call OpenRouter directly using credentials auto-provisioned by the
gateway module (OpenRouter API key + base URL). The backend provides admin
endpoints for the frontend (settings, model categories, model listing, usage)
and uses the `@openrouter/sdk` for typed OpenRouter API access. No local HTTP
proxy sits in the execution path for MVP.

---

## Architecture

```
Execution Engine (LLM nodes)              Frontend
        │                                     │
        │ credential: n8nAiGatewayApi        │ session auth
        │ (apiKey + url → OpenRouter)        │
        │                                     │
        ▼                                     ▼
  OpenRouter API                    ┌──────────────────────┐
  (direct from node)                │  ai-gateway module   │
                                    │                      │
                                    │  Admin Controller    │
                                    │  /rest/ai-gateway/*  │
                                    │       │              │
                                    │       ▼              │
                                    │  AiGatewayService    │
                                    │       │              │
                                    │       ├── ModelService│
                                    │       ├── UsageService│
                                    │       └── Credential  │
                                    │           provisioning│
                                    └───────┬──────────────┘
                                            │
                                            ▼
                                    OpenRouter API
                                    (@openrouter/sdk)
```

**Execution path**: The `lmChatN8nAiGateway` node (or existing LLM nodes with
gateway credential) gets the OpenRouter API key and base URL from the
auto-provisioned credential. LangChain's `ChatOpenAI` calls OpenRouter directly.
Model category resolution happens at the node level using the shared
`resolveAiGatewayModel()` function from `@n8n/api-types`. No local HTTP hop,
no SSE passthrough, no internal auth tokens.

**Admin path**: The admin controller serves the frontend with settings, model
categories, available models, and usage statistics. It uses `@openrouter/sdk`
for typed model listing with caching.

---

## Design Decisions

### 1. Direct execution (no proxy in MVP)

LLM nodes call OpenRouter directly via the auto-provisioned credential. This
eliminates SSE streaming passthrough, internal auth tokens, and an entire
controller. A proxy layer can be introduced later when a cloud gateway
materializes — by then we'll know the actual contract it needs.

### 2. Dedicated gateway sub-node + credential support

A new `lmChatN8nAiGateway` sub-node is the primary integration. It uses the
auto-provisioned `n8nAiGatewayApi` credential and resolves the model category
to a concrete OpenRouter model ID at execution time (via `resolveAiGatewayModel()`
from `@n8n/api-types`). The node has no user-facing model selection — it reads
the category from workflow settings or the global default.

Existing LLM nodes (LmChatOpenAi, LmChatAnthropic, etc.) also accept
`n8nAiGatewayApi` as an alternative credential type for power-user scenarios
where a specific provider node + gateway routing is desired.

### 3. Auto-provisioned credential

The gateway module creates/updates a managed credential at startup containing
the OpenRouter API key and base URL from environment variables. Users simply
select "n8n AI Gateway" from the credential dropdown. No manual configuration.

### 4. Shared model resolution

The category-to-model mapping and `resolveAiGatewayModel()` function live in
`@n8n/api-types` so both the backend module and LLM nodes can import them.
Nodes send a category name (e.g., `balanced`) as the model parameter and resolve
it to a concrete OpenRouter model ID (e.g., `openai/gpt-4.1-nano`) before
calling `ChatOpenAI`.

### 5. OpenRouter SDK for admin features

The `@openrouter/sdk` package provides typed access to the OpenRouter API for
model listing, with potential future use for credits and analytics. It is
ESM-only and dynamically imported.

---

## API Endpoints

All endpoints are on the admin controller with standard session auth.

### `GET /rest/ai-gateway/settings`

Returns current gateway configuration.

```json
{
  "enabled": true,
  "defaultCategory": "balanced"
}
```

### `PUT /rest/ai-gateway/settings`

Updates gateway configuration. Accepts partial updates.

```json
{
  "defaultCategory": "fastest"
}
```

### `GET /rest/ai-gateway/model-categories`

Lists all model categories with their current model mappings.

```json
[
  {
    "id": "balanced",
    "label": "Balanced",
    "description": "Good quality at reasonable cost",
    "model": "openai/gpt-4.1-nano"
  }
]
```

### `GET /rest/ai-gateway/models`

Lists available models from OpenRouter (for "Manual" model selection).
Uses `@openrouter/sdk` with a 5-minute cache.

### `GET /rest/ai-gateway/usage`

Returns usage statistics for the current period (in-memory for MVP).

```json
{
  "totalRequests": 142,
  "totalInputTokens": 45200,
  "totalOutputTokens": 12800,
  "byCategory": {
    "balanced": { "requests": 98, "inputTokens": 31000, "outputTokens": 8500 }
  }
}
```

---

## Module Structure

```
packages/cli/src/modules/ai-gateway/
├── ai-gateway.module.ts              # @BackendModule entrypoint
├── ai-gateway.config.ts              # @Config with env vars
├── ai-gateway.service.ts             # Core service (credential provisioning, SDK model listing)
├── ai-gateway-model.service.ts       # Model category resolution
├── ai-gateway-usage.service.ts       # In-memory usage tracking
├── ai-gateway.controller.ts          # Admin endpoints (settings, categories, models, usage)
├── ai-gateway.constants.ts           # Category mappings (also in @n8n/api-types)
└── __tests__/
    ├── ai-gateway.service.test.ts
    ├── ai-gateway-model.service.test.ts
    └── ai-gateway-usage.service.test.ts
```

---

## Configuration

Environment variables (`@Config` class):

| Variable | Type | Default | Description |
|---|---|---|---|
| `N8N_AI_GATEWAY_ENABLED` | boolean | `false` | Enable the AI Gateway module |
| `N8N_AI_GATEWAY_OPENROUTER_API_KEY` | string | `''` | OpenRouter API key |
| `N8N_AI_GATEWAY_OPENROUTER_BASE_URL` | string | `https://openrouter.ai/api/v1` | OpenRouter base URL |
| `N8N_AI_GATEWAY_DEFAULT_CATEGORY` | string | `balanced` | Default model category |

---

## Model Category Mappings

Hardcoded for MVP, later configurable via remote config. Defined in both
`@n8n/api-types` (for nodes) and the cli constants file.

| Category | OpenRouter Model ID | Intent |
|---|---|---|
| `balanced` | `openai/gpt-4.1-nano` | Good quality at reasonable cost |
| `cheapest` | `openai/gpt-4.1-nano` | Minimize token spend |
| `fastest` | `google/gemini-2.0-flash-001` | Lowest latency |
| `best-quality` | `anthropic/claude-sonnet-4` | Maximum capability |
| `reasoning` | `openai/o4-mini` | Complex multi-step tasks |

If the `model` field does not match a category name, it is passed through as a
concrete OpenRouter model ID (the "Manual" mode).

---

## Credential Type

### Definition

```
Name:        n8nAiGatewayApi
DisplayName: n8n AI Gateway
Properties:  apiKey, url
```

### Auto-Provisioning

On module init, `AiGatewayService.provisionCredential()`:

1. Reads the OpenRouter API key from the `N8N_AI_GATEWAY_OPENROUTER_API_KEY` env var
2. Reads the base URL from `N8N_AI_GATEWAY_OPENROUTER_BASE_URL` (default: `https://openrouter.ai/api/v1`)
3. Creates or updates a managed, global credential of type `n8nAiGatewayApi`
4. The credential appears in LLM node credential dropdowns

### Node Integration

**Primary path — dedicated gateway node (`lmChatN8nAiGateway`):**

1. Calls `this.getCredentials('n8nAiGatewayApi')` → receives `{ apiKey, url }`
2. Reads the model category from execution context (workflow settings override
   or global default, passed as `defaultCategory` in the credential data)
3. Resolves category using `resolveAiGatewayModel()` from `@n8n/api-types`
4. Creates `ChatOpenAI({ apiKey, model: resolvedModel, configuration: { baseURL: url } })`

**Secondary path — existing provider nodes with gateway credential:**

Existing LLM nodes also accept `n8nAiGatewayApi` in their `credentials` array.
When selected, the node configures `ChatOpenAI` with the OpenRouter base URL
and API key. The model is set explicitly by the user in the node UI.

---

## Usage Tracking

### MVP: In-Memory

Track per-request usage in memory:

```typescript
interface UsageRecord {
  timestamp: Date;
  workflowId?: string;
  executionId?: string;
  category: string;
  resolvedModel: string;
  inputTokens: number;
  outputTokens: number;
}
```

Records are kept in an array (capped at 10,000). The usage endpoint aggregates
them on read. Data is lost on restart — acceptable for MVP.

### Future: Database

Add an `ai_gateway_usage` entity and migration for persistent tracking.

---

## Error Handling

Errors from OpenRouter are surfaced directly to the node execution (since nodes
call OpenRouter directly). The admin endpoints handle their own errors:

| Scenario | Response | HTTP Status |
|---|---|---|
| Gateway disabled | Module does not initialize | N/A |
| OpenRouter API key missing | Credential not provisioned | N/A |
| SDK model listing fails | `{ error: "..." }` | 502 |

When credits are exhausted (future), the error from OpenRouter propagates to
the node execution as a workflow error with a clear message.

---

## Testing Strategy

### Unit Tests (Jest)

- `AiGatewayModelService`: category resolution, passthrough for unknown categories
- `AiGatewayService`: config state, credential provisioning, SDK model listing with cache
- `AiGatewayUsageService`: tracking, aggregation, extraction

### Future: Proxy Layer

When a cloud gateway is introduced, a proxy controller can be added back to
establish the HTTP contract. The current architecture makes this additive — the
credential URL changes from OpenRouter to the cloud gateway, and a proxy
controller handles the forwarding.
