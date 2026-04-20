# AGENT-25 — Builder / Test toggle in Agent header

**Branch:** `agent-25-feature-builder-agent-toggle-and-iteration`
**Scope:** Frontend-only. Backend already supports iterating on the builder agent — today there is simply no UI path into it after initial creation.

## Problem

Today the builder agent is only reachable during the one-shot initial build flow in `AgentBuilderView.vue` (`mode = 'building'`). Once an agent is built, the user is dropped into chat mode (`endpoint="chat"`) with no way back to the builder. The backend has always supported builder iteration (`AgentChatPanel` already accepts `endpoint: 'build' | 'chat'`), so this is purely a missing frontend control.

## Goal

Add a two-segment toggle to the agent header that lets the user switch the chat panel between the **Build** endpoint (iterating with the builder agent, persisted DB history) and the **Test** endpoint (testing the current agent, ephemeral local messages).

Out of scope for this ticket:
- Emphasizing the JSON / code configuration section visually (mentioned in original brief; deferred to a follow-up).
- Changing the home screen's send behavior.
- Changing the initial-build (`'building'` mode) flow.
- Touching the existing `new-chat` button.

## Design

### Placement

Inside `AgentBuilderView.vue`'s `mainHeaderRight` block, the toggle is inserted **left** of the existing `new-chat` button (which remains unchanged). Resulting order:

```
[Build | Test]  [new-chat]  [settings]  [⋯]
```

The toggle is rendered only when `mode === 'chat'`. Hidden in `home` and `building` modes.

### Control

A two-segment control labeled **Build** | **Test**, icons reusing the empty-state icon vocabulary already in `AgentChatPanel`:

- **Build** — `wand-sparkles`
- **Test** — `message-square`

Visually consistent with the existing `toggleBtn` / `toggleBtnActive` pattern in `AgentBuilderView.vue`. Active segment uses `toggleBtnActive` styling.

`data-testid="agent-chat-mode-toggle"` on the control; each segment gets `data-testid="agent-chat-mode-build"` / `"agent-chat-mode-test"` for Playwright.

Disabled while a response is streaming — to keep the state transition unambiguous and avoid mid-stream aborts. `AgentChatPanel` already emits `update:streaming`; add a local `isChatStreaming = ref(false)` in `AgentBuilderView`, wire `@update:streaming="isChatStreaming = $event"` on the chat panel, and use it to disable both toggle segments.

### Behavior — keyed remount (approach B)

Add local state in `AgentBuilderView`:

```ts
type ChatMode = 'build' | 'test';
const chatMode = ref<ChatMode>('test');
```

Wire it into the existing `AgentChatPanel` render in `mode === 'chat'`:

```vue
<AgentChatPanel
  :key="chatMode"
  :project-id="projectId"
  :agent-id="agentId"
  mode="inline"
  :endpoint="chatMode === 'build' ? 'build' : 'chat'"
  :initial-message="initialPrompt"
  @config-updated="onConfigUpdated"
  @update:streaming="isChatStreaming = $event"
/>
```

The `:key="chatMode"` binding causes Vue to fully unmount and remount the panel on flip, so each side runs its own `onMounted` path:

- `build` → `loadBuilderHistory()` pulls persisted messages from the DB.
- `test` → starts with an empty ephemeral message list.

No changes are needed inside `AgentChatPanel`.

### Defaults & transitions

- On entering `chat` mode from `home` (via `startChat`) or from `building` (via `onBuildDone`) — `chatMode` is reset to `'test'`. This matches today's behavior: the user lands in test chat after sending from home or finishing the initial build.
- On clicking the existing `new-chat` button (which sets `mode = 'home'`) — `chatMode` is unaffected; it resets to `'test'` the next time `chat` mode is entered.
- `initialPrompt` continues to only apply to the first mount; since remount runs when the key changes, flipping the toggle won't re-fire an initial prompt (confirmed: `onMounted` in `AgentChatPanel` only sends `initialMessage` if set, and we don't set it on user-initiated flips).

### Telemetry

One new event on flip:

```ts
telemetry.track('User switched agent chat mode', {
  agent_id: agentId.value,
  mode: chatMode.value, // 'build' | 'test'
});
```

### i18n

New keys in `@n8n/i18n`:

- `agents.builder.chatMode.build` → `Build`
- `agents.builder.chatMode.test` → `Test`
- `agents.builder.chatMode.ariaLabel` → `Switch between builder and agent chat`

## Files touched

- `packages/frontend/editor-ui/src/features/agents/views/AgentBuilderView.vue` — add `chatMode` state, render the toggle in `mainHeaderRight`, bind `:key` and `:endpoint` on `AgentChatPanel`, reset to `'test'` in `startChat`/`onBuildDone`/`initialize`.
- `packages/@n8n/i18n/src/locales/en.json` — three new keys above.

No new components needed — the toggle is simple enough to inline inside `AgentBuilderView.vue`'s template using the existing `toggleBtn`/`toggleBtnActive` classes. (If other views later need the same control, extract to `AgentChatModeToggle.vue` then.)

## Testing

- **Unit / component** — none required beyond existing coverage; the toggle is trivial state and a `:key` binding.
- **Playwright** — add one flow to an existing agent-builder spec: build an agent, land in test chat, flip to Build, assert the chat panel remounts with builder history loaded, flip back to Test, assert an empty chat. Uses `data-testid` hooks defined above.

## Non-goals & follow-ups

- Preserving test-chat local state across toggle flips — intentionally skipped. Today's behavior already discards test chat on `new-chat` / navigation; aligning with that is simpler and no worse. If users complain, upgrade to the dual-instance `v-show` approach (C).
- JSON / code configuration emphasis — tracked separately.
