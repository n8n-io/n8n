# Instance AI E2E Testing Plan

## Context

The instance AI feature is a multi-agent AI system (built on **Mastra**) at `/instance-ai` that lets users chat with an AI agent capable of creating workflows, managing credentials, running executions, and more. **No E2E tests exist for it today.** The goal is to build a comprehensive Playwright E2E test suite that gives confidence the feature works end-to-end and catches regressions.

---

## Hybrid Testing Strategy

We use **two complementary approaches**:

### 1. Proxy record/replay — for core smoke tests (full-stack)

Following the proven **chat-hub pattern** (`@capability:proxy`), a small set of tests run against the **real backend** with recorded Anthropic API responses. This validates the full pipeline: frontend → instance-ai controller → Mastra agent → Anthropic API (recorded) → SSE events → frontend rendering.

- Recordings stored in `expectations/instance-ai/`
- Requires container mode (`@capability:proxy`)
- Re-record when system prompts or tool definitions change intentionally
- **Covers:** basic chat response, simple tool call flow, thread persistence after response

### 2. Synthetic SSE mocks — for edge cases (deterministic)

For scenarios that need precise control over event sequences, we build **synthetic SSE event streams** at the Playwright HTTP level via `page.route()`. This tests "does the UI correctly handle this specific event pattern?" without needing a real LLM.

- Deterministic — immune to prompt/model changes
- Fast — no container needed, runs locally
- **Covers:** HITL confirmations (approve/deny), error states, cancel flow, sub-agent delegation trees, plan rendering, thread management

### Why hybrid?

| Approach | Full-stack? | Deterministic? | Fast? | Re-record? |
|----------|-------------|----------------|-------|------------|
| Proxy    | Yes         | Recorded       | No (container) | On intentional changes |
| Synthetic| FE only     | Yes            | Yes (local)    | Never |

The proxy tests catch integration bugs (e.g., broken controller, wrong event format from Mastra). The synthetic tests catch UI rendering bugs with precise, repeatable scenarios. Together they provide comprehensive coverage.

---

## Endpoints to intercept (synthetic tests only)

| Endpoint | Method | Mock Response |
|----------|--------|---------------|
| `/rest/instance-ai/events/:threadId` | GET | SSE event stream (`text/event-stream`) |
| `/rest/instance-ai/chat/:threadId` | POST | `{ data: { runId } }` |
| `/rest/instance-ai/chat/:threadId/cancel` | POST | `{ data: { ok: true } }` |
| `/rest/instance-ai/confirm/:requestId` | POST | `{ data: { ok: true } }` |
| `/rest/instance-ai/threads` | GET | Thread list JSON |
| `/rest/instance-ai/threads/:threadId/messages` | GET | Historical messages JSON |
| `/rest/instance-ai/threads/:threadId/status` | GET | Thread status JSON |
| `/rest/module-settings` | GET | `{ 'instance-ai': { enabled: true, ... } }` |

---

## Anti-Flakiness Strategy

### 1. Deterministic synthetic mocks
SSE events are pre-baked with fixed IDs, fixed text, and fixed timing. Zero non-determinism.

### 2. Wait-for patterns — never `waitForTimeout`
- `await expect(locator).toBeVisible()` — auto-retries
- `waitForResponseComplete()` — waits for send button to reappear (streaming ended)
- `page.waitForResponse()` / `page.waitForRequest()` — waits for specific API calls

### 3. Identity-based assertions — never count-based
```typescript
// GOOD: identity-based
await expect(page.getByTestId('instance-ai-assistant-message')).toContainText('Hello!');
// BAD: count-based (fragile in parallel)
await expect(page.getByTestId('instance-ai-assistant-message')).toHaveCount(1);
```

### 4. Unique IDs per test — `nanoid()`
Every test generates unique `runId`, `agentId`, `toolCallId` via `nanoid()`.

### 5. Route scoping — per-page, auto-cleaned
`page.route()` is scoped to the page instance and auto-cleaned when the page closes. Each test gets a fresh page via the `n8n` fixture.

### 6. No server-side state (synthetic tests)
All endpoints mocked at HTTP level → no database rows created → zero cleanup needed.

### 7. Proxy tests are isolated (proxy tests)
Proxy tests use `@capability:proxy` with container isolation. Recorded responses are deterministic replays.

---

## Test Data Cleanup Strategy

- **Synthetic tests**: No cleanup needed. All API calls intercepted by `page.route()` before reaching the server. Thread IDs are client-generated UUIDs that never reach the backend.
- **Proxy tests**: Follow the chat-hub pattern — container isolation handles cleanup. Each worker gets a fresh environment.

---

## SSE Interception: Approach & Fallback (synthetic tests)

### Primary: `page.route()` with pre-baked SSE body
```typescript
await page.route('**/instance-ai/events/**', async (route) => {
  await route.fulfill({
    status: 200,
    contentType: 'text/event-stream; charset=UTF-8',
    headers: { 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
    body: sseBody,  // Plain string, NOT JSON.stringify()
  });
});
```

`setupRequirements` intercepts **cannot** be used for SSE (forces `JSON.stringify()`, defaults to `application/json`).

### Fallback: `addInitScript` with MockEventSource
If `page.route()` doesn't trigger `EventSource.onmessage` correctly, fall back to replacing `EventSource` at the browser level (same pattern as unit tests in `instanceAi.store.test.ts`).

### POC verification step (Phase 0)
Before the full suite, write one minimal test to verify `page.route()` intercepts EventSource. De-risks the entire plan.

---

## Implementation Plan

### Phase 0: POC — Verify SSE interception works
Single throwaway test: intercept SSE endpoint → navigate → send message → assert assistant message appears.

### Phase 1: Add data-test-ids to frontend components

**Files to modify:**

1. **`packages/frontend/editor-ui/src/features/ai/instanceAi/InstanceAiView.vue`**
   - `data-testid="instance-ai-container"` on root `.container` div

2. **`packages/frontend/editor-ui/src/features/ai/instanceAi/components/InstanceAiEmptyState.vue`**
   - `data-testid="instance-ai-empty-state"` on container
   - `data-testid="instance-ai-suggestion-card"` on each suggestion button

3. **`packages/frontend/editor-ui/src/features/ai/instanceAi/components/InstanceAiMessage.vue`**
   - `data-testid="instance-ai-user-message"` on `.userBubble` div
   - `data-testid="instance-ai-assistant-message"` on `.assistantWrapper` div

4. **`packages/frontend/editor-ui/src/features/ai/shared/components/ChatInputBase.vue`**
   - `data-testid="instance-ai-send-button"` on send button (v-else N8nIconButton)
   - `data-testid="instance-ai-stop-button"` on stop button (v-if="isStreaming" N8nIconButton)

5. **`packages/frontend/editor-ui/src/features/ai/instanceAi/components/InstanceAiThreadList.vue`**
   - `data-testid="instance-ai-thread-list"` on `.container` div
   - `data-testid="instance-ai-new-thread-button"` on N8nButton
   - `data-testid="instance-ai-thread-item"` on each `.threadItem` div

6. **`packages/frontend/editor-ui/src/features/ai/instanceAi/components/InstanceAiToolCall.vue`**
   - `data-testid="instance-ai-tool-call"` on CollapsibleRoot
   - `data-testid="instance-ai-confirm-approve"` on approve button
   - `data-testid="instance-ai-confirm-deny"` on deny button

7. **`packages/frontend/editor-ui/src/features/ai/instanceAi/components/InstanceAiStatusBar.vue`**
   - `data-testid="instance-ai-status-bar"` on `.bar` div

### Phase 2: Create test infrastructure

#### 2a. SSE event factories and test requirements

**New file: `packages/testing/playwright/config/instance-ai-fixtures.ts`**

- `sseFrame(id, data)` — formats `id: N\ndata: JSON\n\n`
- `buildSimpleChatSSE(text, opts?)` — `run-start` → `text-delta` → `run-finish`
- `buildToolCallSSE(toolName, args, result, opts?)` — `tool-call` + `tool-result`
- `buildToolErrorSSE(toolName, args, error, opts?)` — `tool-call` + `tool-error`
- `buildHITLConfirmationSSE(requestId, message, opts?)` — `confirmation-request` (run suspended)
- `buildPostApprovalSSE(opts?)` — continuation after HITL
- `buildErrorSSE(errorMessage, opts?)` — `error` + `run-finish` error
- `buildPlanSSE(plan, opts?)` — `plan-update`
- `buildDelegationSSE(parentAgent, childAgent, opts?)` — `agent-spawned` + child + `agent-completed`
- `instanceAiEnabledRequirements` — `TestRequirements` with module settings

Event shapes conform to `instanceAiEventSchema` from `@n8n/api-types`.

#### 2b. Page object

**New file: `packages/testing/playwright/pages/InstanceAiPage.ts`**

Extends `BasePage`. Locators for all test IDs + actions:
- `sendMessage(text)` — fill textarea + click send
- `waitForResponseComplete(timeout?)` — wait for assistant message + send button visible

#### 2c. Wire into test infrastructure

- **`packages/testing/playwright/pages/n8nPage.ts`** — add `readonly instanceAi: InstanceAiPage`
- **`packages/testing/playwright/helpers/NavigationHelper.ts`** — add `toInstanceAi()`

#### 2d. Mock setup composable

**New file: `packages/testing/playwright/composables/InstanceAiComposer.ts`**

`setupInstanceAiMocks(page, sseBody)` — sets up all `page.route()` intercepts for synthetic tests.

#### 2e. Proxy test fixtures (chat-hub pattern)

**New file: `packages/testing/playwright/tests/e2e/instance-ai/fixtures.ts`**

```typescript
export const instanceAiProxyConfig = {
  capability: {
    services: ['proxy'],
    env: { /* instance-ai env config if needed */ }
  }
} as const;
```

Recordings go in `packages/testing/playwright/expectations/instance-ai/`.

### Phase 3: Write tests

All tests in `packages/testing/playwright/tests/e2e/instance-ai/`.

#### Proxy tests (full-stack, `@capability:proxy`)

**`smoke.spec.ts`** (2-3 tests)
```
should send a basic message and receive an AI response
  → Real backend, recorded Anthropic response, assert assistant message appears

should render a tool call from a real agent response
  → Send prompt that triggers a tool call, assert tool call accordion visible

should persist thread across page reload
  → Send message, reload page, assert thread + messages still visible
```

#### Synthetic tests (deterministic, local)

**`basic-chat.spec.ts`** (4 tests)
```
should show empty state when navigating to /instance-ai
should send a message and receive a streaming response
should show suggestion cards and allow clicking one
should show thread in sidebar after conversation
```

**`tool-calls.spec.ts`** (3 tests)
```
should render tool call with loading state then completed result
should render tool call with error state
should expand tool call to show arguments and result
```

**`hitl-confirmation.spec.ts`** (2 tests)
```
should show confirmation prompt and approve action
should show confirmation prompt and deny action
```

**`thread-management.spec.ts`** (3 tests)
```
should create a new thread via sidebar button
should switch between threads
should delete a thread
```

**`cancel-run.spec.ts`** (1 test)
```
should show stop button during streaming and cancel on click
```

**`error-handling.spec.ts`** (3 tests)
```
should display error when run fails
should handle message send failure gracefully
should recover from SSE connection error
```

**`plan-rendering.spec.ts`** (1 test)
```
should render plan update events as a plan card
```

**`sub-agents.spec.ts`** (2 tests)
```
should render delegated sub-agent in agent tree
should render agent tree with nested tool calls
```

### Phase 4: Verification

1. Lint & typecheck frontend: `pushd packages/frontend/editor-ui && pnpm lint && pnpm typecheck && popd`
2. Lint & typecheck Playwright: `pushd packages/testing/playwright && pnpm lint && pnpm typecheck && popd`
3. Janitor: `pnpm --filter=n8n-playwright janitor --file=tests/e2e/instance-ai/*.spec.ts --verbose`
4. Run synthetic tests locally: `pnpm --filter=n8n-playwright test:local tests/e2e/instance-ai/ --reporter=list 2>&1 | tail -50`
5. Run proxy tests (requires container): `pnpm --filter=n8n-playwright test:container:sqlite --grep "Instance AI.*smoke" --reporter=list 2>&1 | tail -50`

---

## Key Files Reference

| Purpose | Path |
|---------|------|
| SSE event schema (source of truth) | `packages/@n8n/api-types/src/schemas/instance-ai.schema.ts` |
| Frontend store (SSE connection) | `packages/frontend/editor-ui/src/features/ai/instanceAi/instanceAi.store.ts` |
| Event reducer (SSE → state) | `packages/frontend/editor-ui/src/features/ai/instanceAi/instanceAi.reducer.ts` |
| Main view component | `packages/frontend/editor-ui/src/features/ai/instanceAi/InstanceAiView.vue` |
| Shared input component | `packages/frontend/editor-ui/src/features/ai/shared/components/ChatInputBase.vue` |
| Tool call component | `packages/frontend/editor-ui/src/features/ai/instanceAi/components/InstanceAiToolCall.vue` |
| Chat-hub proxy fixtures (pattern) | `packages/testing/playwright/tests/e2e/chat-hub/fixtures.ts` |
| Chat-hub expectations (pattern) | `packages/testing/playwright/expectations/chat-hub/` |
| n8nPage hub | `packages/testing/playwright/pages/n8nPage.ts` |
| Navigation helper | `packages/testing/playwright/helpers/NavigationHelper.ts` |

## Technical Notes

- **SSE URL**: `${baseUrl}/instance-ai/events/${tid}` where `baseUrl` = `/rest`
- **`page.route()` intercepts EventSource** (HTTP GET under the hood)
- **Pre-baked SSE**: All events at once via `route.fulfill()`. Browser EventSource parser processes each frame individually.
- **Module settings**: `GET /rest/module-settings` (separate from `/rest/settings`). Must intercept for synthetic tests.
- **Thread IDs**: Client-generated UUIDs via `uuidv4()`.
- **Proxy recordings**: Capture outbound Anthropic `/v1/messages` calls, same as chat-hub.
