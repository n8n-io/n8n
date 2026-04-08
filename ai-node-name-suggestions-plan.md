# AI Node Name Suggestions on Save

## Context

Node names on the canvas often remain as defaults ("HTTP Request", "IF", "Code1", etc.) which makes workflows hard to understand at a glance. This feature adds a background AI check after each save that evaluates node names and suggests better ones when the current name poorly describes what the node does. Suggestions appear as non-blocking toasts that users can accept or dismiss.

## Strategy

Send ALL nodes to the AI and let it decide which need renaming. Use a per-workflow cache of node fingerprints (hash of id+name+params) to avoid re-evaluating nodes that haven't changed. Cache expires after 24h.

This approach has two advantages over the previous "default-name filter" strategy:
1. Nodes that were renamed but whose configuration later changed get re-evaluated
2. The AI gets rich parameters (generic extractor, not hardcoded keys) to make better naming decisions

**Design decision — no connections:** Nodes act individually enough that workflow graph context doesn't meaningfully improve naming. Keeping the payload simple reduces token cost and complexity.

## AI Credentials

Uses the **Builder API Proxy** via the AI Assistant SDK. This requires:
- A valid n8n license with `feat:aiAssistant` enabled
- `N8N_AI_ASSISTANT_BASE_URL` configured (points to n8n's cloud AI service)
- No user-managed API keys — auth is handled automatically via the license certificate

The `AiService` (`packages/cli/src/services/ai.service.ts`) initializes lazily and manages the `AiAssistantClient` lifecycle, including license cert refresh.

### Why Builder API Proxy (not `askAi`)

The `askAi()` SDK method has hard constraints that make it unusable for this feature:
- **600-character question limit** — too small to include node parameters
- **`forNode` must be `"code"` or `"transform"`** — server-side validation rejects other values

The **Builder API Proxy** is what Instance AI and the AI Workflow Builder already use for freeform LLM calls. It exposes an Anthropic-compatible API at `{baseUrl}/anthropic/v1` with proxy-managed auth tokens.

**Important:** Do NOT import `@ai-sdk/anthropic` or the `ai` (Vercel AI SDK) package directly in `AiService`. Those dependencies belong in higher-level orchestration services (e.g. `InstanceAiService`, `@n8n/agents`). For simple one-shot LLM calls, use a raw `fetch` to the proxy's Anthropic Messages API:

```typescript
const client = await this.getClient();
const token = await client.getBuilderApiProxyToken({ id: user.id }, { userMessageId: nanoid() });

const response = await fetch(client.getApiProxyBaseUrl() + '/anthropic/v1/messages', {
  method: 'POST',
  headers: {
    Authorization: `${token.tokenType} ${token.accessToken}`,
    'Content-Type': 'application/json',
    'anthropic-version': '2023-06-01',
  },
  body: JSON.stringify({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  }),
});
```

## Implementation Plan

### 1. API Types (`packages/@n8n/api-types`)

**File: `src/dto/ai/ai-suggest-node-names-request.dto.ts`**
- Zod schema with array of node summaries: `{ currentName, nodeType, displayName, parameters? }`
- Max 50 nodes per request
- Response type exported: `AiNodeNameSuggestion = { currentName, suggestedName, reason }`

### 2. Backend Endpoint

**File: `packages/cli/src/controllers/ai.controller.ts`**
- `POST /ai/suggest-node-names` endpoint
- License-gated with `@Licensed('feat:aiAssistant')`
- Rate limited (20 req/min)
- Delegates to `AiService.suggestNodeNames()`

**File: `packages/cli/src/services/ai.service.ts`**
- `suggestNodeNames(payload, user)` method
- Constructs a prompt listing each node's type, current name, and all significant parameters
- Instructs the LLM to evaluate all nodes and suggest renames for any with generic/default names
- Prompt explicitly forbids including raw parameter values or parenthetical info in suggested names
- Requests structured JSON response, parses into `AiNodeNameSuggestion[]`
- Uses `max_tokens: 2048` to handle larger responses

### 3. Frontend API Client

**File: `packages/frontend/editor-ui/src/features/ai/assistant/assistant.api.ts`**
- `suggestNodeNames(ctx, payload)` function calling `POST /ai/suggest-node-names`

### 4. Frontend Composable (core logic)

**File: `packages/frontend/editor-ui/src/features/ai/nodeNameSuggestions/useNodeNameSuggestions.ts`**

Main function: `checkNodeNamesAfterSave()`
1. **Guard**: Skip if AI assistant not enabled
2. **Cache**: Per-workflow fingerprint cache (`Map<workflowId, { fingerprints: Set<string>, timestamp }>`)
   - Fingerprint = hash of `node.id + node.name + JSON.stringify(node.parameters)`
   - Evict entries older than 24h
3. **Filter**: Compute fingerprints for ALL nodes, send only those not in cache
4. **Guard**: Skip if no changed nodes
5. **Throttle**: Skip if last check was < 30s ago
6. **Extract params**: Generic extractor — include any parameter value whose serialized form is <= 500 chars, cap at 20 keys per node
7. **Call API**: Send changed nodes + workflow name
8. **Cache update**: After response, add all sent fingerprints to cache
9. **Show results**: Display suggestions via toast (single) or modal (multiple)

### 5. Suggestions Modal (for multiple suggestions)

**File: `packages/frontend/editor-ui/src/features/ai/nodeNameSuggestions/NodeNameSuggestionsModal.vue`**
- Vertical stacked layout per suggestion: name row (wraps), reason below, buttons below
- Uses `N8nText` component for all text styling (bold, color, size)
- Per-row "Accept" / "Skip" buttons with proper spacing
- "Accept All" / "Dismiss" footer buttons

### 6. Wire Into Save Flow

**File: `packages/frontend/editor-ui/src/app/composables/useWorkflowSaving.ts`**
- After save, fire-and-forget `checkNodeNamesAfterSave()` (non-blocking)

### 7. i18n & Constants

- `packages/frontend/@n8n/i18n/src/locales/en.json` — keys under `aiNodeNames.*`
- `packages/frontend/editor-ui/src/app/constants/durations.ts` — `AI.NODE_NAME_CHECK: 30_000`
- `packages/frontend/editor-ui/src/app/constants/modals.ts` — `NODE_NAME_SUGGESTIONS_MODAL`

## Key Files

| File | Action |
|------|--------|
| `packages/@n8n/api-types/src/dto/ai/ai-suggest-node-names-request.dto.ts` | Create |
| `packages/cli/src/controllers/ai.controller.ts` | Modify — add endpoint |
| `packages/cli/src/services/ai.service.ts` | Modify — add `suggestNodeNames()` |
| `packages/frontend/editor-ui/src/features/ai/assistant/assistant.api.ts` | Modify — add API fn |
| `packages/frontend/editor-ui/src/features/ai/nodeNameSuggestions/useNodeNameSuggestions.ts` | Create |
| `packages/frontend/editor-ui/src/features/ai/nodeNameSuggestions/NodeNameSuggestionsModal.vue` | Create |
| `packages/frontend/editor-ui/src/app/composables/useWorkflowSaving.ts` | Modify — hook call |
| `packages/frontend/editor-ui/src/app/constants/modals.ts` | Modify — add constant |
| `packages/frontend/editor-ui/src/app/constants/durations.ts` | Modify — add constant |
| `packages/frontend/@n8n/i18n/src/locales/en.json` | Modify — add i18n keys |

## Reuse

- **`canvasOperations.renameNode()`** (`useCanvasOperations.ts:344`) — handles all rename side effects (connections, expressions, undo history)
- **`useToast().showToast()`** — existing toast with action pattern
- **`AiAssistantClient` via Builder API Proxy** — existing AI Assistant SDK, license-authenticated via certificate (no user API keys needed)
- **`settingsStore.isAiAssistantEnabled`** — frontend license check to gate the feature
- **`AiService.getClient()`** — lazy-initializing client with automatic license cert refresh

## Local Testing Setup

```bash
N8N_LICENSE_ACTIVATION_KEY=<your-key>
N8N_LICENSE_TENANT_ID=<your-tenant-id>
N8N_AI_ASSISTANT_BASE_URL=https://ai-assistant.n8n.io
```

This activates a license with `feat:aiAssistant` at runtime and points to the cloud AI service.

## Verification

1. **Typecheck**: `pnpm typecheck` in `packages/cli` and `packages/frontend/editor-ui`
2. **Manual test**: Create workflow with default-named nodes, save, verify suggestions appear. Save again without changes — verify no API call (cache hit). Change a node's parameters, save — verify that node gets re-evaluated.
3. **Edge cases**: No API call when all fingerprints are cached, throttle prevents rapid repeated calls, cache eviction after 24h
