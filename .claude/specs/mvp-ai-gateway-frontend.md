# n8n AI Gateway — Frontend Specification

## Overview

This document captures the frontend architecture and implementation details for
the n8n AI Gateway MVP. It complements the [product specification](./mvp-ai-gateway.md)
and [backend specification](./mvp-ai-gateway-backend.md).

The frontend manages the AI Gateway settings UI, the Pinia store for gateway
state, and the canvas auto-connect logic that creates and wires the dedicated
`lmChatN8nAiGateway` node when AI Agent nodes are placed.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Canvas (useCanvasOperations)                               │
│                                                             │
│  addNode() ──► autoCreateGatewayLlmNode()                   │
│                    │                                        │
│                    ▼                                        │
│           getGatewayLlmNodeData()                           │
│           (useAIGatewayDefaults.ts)                         │
│                    │                                        │
│                    ▼                                        │
│           Creates lmChatN8nAiGateway node                   │
│           + n8nAiGatewayApi credential                      │
│           + connects to AI Agent                            │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  Settings (SettingsAIGatewayView.vue)                       │
│                                                             │
│  Category selector ──► aiGateway.store.setCategory()        │
│  Model selector ──► aiGateway.store.setModel()              │
│                                                             │
│  Reads from: GET /rest/ai-gateway/settings                  │
│  Writes to:  PUT /rest/ai-gateway/settings                  │
└─────────────────────────────────────────────────────────────┘
```

---

## Key Files

| File | Purpose |
|------|---------|
| `packages/frontend/editor-ui/src/features/ai/gateway/aiGateway.store.ts` | Pinia store for gateway state (enabled, category, model, usage) |
| `packages/frontend/editor-ui/src/features/ai/gateway/useAIGatewayDefaults.ts` | Canvas helpers: auto-create gateway node, apply defaults |
| `packages/frontend/editor-ui/src/features/ai/gateway/SettingsAIGatewayView.vue` | Settings page UI at `/settings/ai-gateway` |
| `packages/frontend/@n8n/i18n/src/locales/en.json` | i18n strings (keyed under `settings.aiGateway.*` and `workflowSettings.aiGateway*`) |

---

## Pinia Store: `aiGateway.store.ts`

### State

| Field | Type | Default | Purpose |
|-------|------|---------|---------|
| `initialized` | `boolean` | `false` | One-time init flag |
| `enabled` | `boolean` | `false` | Whether gateway is enabled |
| `selectedCategory` | `AiGatewayModelCategory` | `'balanced'` | Current global category |
| `selectedModel` | `string` | `'openai/gpt-4.1-mini'` | Resolved model for current category |
| `availableModels` | `AIGatewayModel[]` | `[]` | All models from OpenRouter |
| `categories` | `CategoryDefinition[]` | `[]` | Category definitions from backend |
| `usage` | `AiGatewayUsageResponse \| null` | `null` | Usage stats |

### Key Methods

- `initialize()` — fetches settings, categories, models from backend
- `setCategory(category)` / `setModel(model)` — update selection
- `updateDefaultCategory(category)` — `PUT /rest/ai-gateway/settings`
- `resolveModelForCategory(category)` — maps category to model ID

### Removed (previously needed for provider-specific mapping)

- ~~`PROVIDER_NODE_MAP`~~ — no longer needed; all gateway nodes use `lmChatN8nAiGateway`
- ~~`resolveProviderKey(modelId)`~~ — no longer needed
- ~~`getProviderNodeMappingForModel(modelId)`~~ — no longer needed

---

## Canvas Auto-Connect: `useAIGatewayDefaults.ts`

### `getGatewayLlmNodeData(workflowSettings?)`

Returns the node data for creating a gateway LLM node. Always returns the
dedicated `lmChatN8nAiGateway` type regardless of the selected model's provider.

```typescript
{
  type: '@n8n/n8n-nodes-langchain.lmChatN8nAiGateway',
  parameters: {},
  credentials: {
    n8nAiGatewayApi: { id: null, name: 'n8n AI Gateway' },
  },
}
```

No model parameter is set — the node resolves the model at execution time.

### `applyAIGatewayDefaultsToLlmNode(node, workflowSettings?)`

Applies gateway defaults to a newly-created `lmChatN8nAiGateway` node. Sets
the `n8nAiGatewayApi` credential if not already set.

### `autoCreateGatewayLlmNode(parentNode, parentDescription, options)`

Called from `useCanvasOperations.addNode()` when a node with an
`ai_languageModel` input is created (e.g. AI Agent). Creates the gateway node
and connects it.

### Flow

1. User adds AI Agent (or any node with `ai_languageModel` input)
2. `addNode()` runs `autoCreateGatewayLlmNode()` if gateway is enabled
3. `getGatewayLlmNodeData()` returns `lmChatN8nAiGateway` node data
4. `addNode()` creates the gateway node with `isAutoAdd: true`
5. `createConnection()` connects the gateway node output to the parent's
   `ai_languageModel` input

---

## Settings Page: `SettingsAIGatewayView.vue`

Route: `/settings/ai-gateway`

### Sections

1. **Model Category** — dropdown with categories (Balanced, Cheapest, Fastest,
   Best Quality, Reasoning, Manual). Changing this calls
   `store.updateDefaultCategory()`.
2. **Model** — shows the resolved model for the current category. In Manual
   mode, shows a searchable dropdown of all available models.
3. **Usage** (future) — credits remaining, credits used, trend chart.

---

## i18n Keys

All under `packages/frontend/@n8n/i18n/src/locales/en.json`:

- `settings.aiGateway` — sidebar label
- `settings.aiGateway.title` — page title
- `settings.aiGateway.description` — page subtitle
- `settings.aiGateway.category.label` / `.description` — category selector
- `settings.aiGateway.model.label` / `.description` / `.placeholder` — model selector
- `settings.aiGateway.category.balanced` / `.cheapest` / `.fastest` / `.best-quality` / `.reasoning` / `.manual` — category labels
- `workflowSettings.aiGatewayCategory` / `.tooltip` / `.default` — workflow override
- `workflowSettings.aiGatewayModel` / `.tooltip` — workflow model override

---

## Implementation TODO

### Settings Page

- [x] Settings page with category and model selection
- [x] Pinia store with backend API integration
- [x] i18n strings for all UI text
- [x] Settings sidebar entry and route
- [ ] Usage overview section (credits remaining, used, trend)
- [ ] Workflow settings category override UI

### Canvas Auto-Connect

- [x] ~~`getGatewayLlmNodeData()` maps provider to node type~~ → Replaced
- [x] `getGatewayLlmNodeData()` returns `lmChatN8nAiGateway` directly (no provider mapping)
- [x] `applyAIGatewayDefaultsToLlmNode()` simplified for gateway node (no model param)
- [x] `autoCreateGatewayLlmNode()` in `useCanvasOperations.addNode()`
- [x] `n8nAiGatewayApi` credential auto-set

### Store

- [x] Category/model state from backend API
- [x] Remove `PROVIDER_NODE_MAP` and provider-to-node mapping logic
- [x] Remove `getProviderNodeMappingForModel()` and `getProviderNodeMapping()`
