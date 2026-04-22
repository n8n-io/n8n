# Agents — Frontend Telemetry Design

**Date:** 2026-04-21
**Status:** Design approved, ready for planning
**Scope:** Instrument the agents feature in `editor-ui` with RudderStack telemetry events so we can answer product questions about agent creation, iteration, and publishing.

## Context

n8n's frontend telemetry goes through RudderStack via `useTelemetry()` ([packages/frontend/editor-ui/src/app/plugins/telemetry/index.ts](../../packages/frontend/editor-ui/src/app/plugins/telemetry/index.ts)). PostHog is used for feature flags, not event tracking. Existing builder-style features (text-to-workflow in [builder.store.ts](../../packages/frontend/editor-ui/src/features/ai/assistant/builder.store.ts), InstanceAI in [instanceAi.store.ts](../../packages/frontend/editor-ui/src/features/ai/instanceAi/instanceAi.store.ts)) already use this same plumbing — we follow their conventions.

The backend OpenTelemetry module ([packages/cli/src/modules/otel/](../../packages/cli/src/modules/otel/)) is unrelated to this work.

## Goals

Track user actions in the agents feature:

- Creating a new agent (button or dropdown click)
- Submitting a message to the builder agent (build mode) or the agent being built (test mode)
- Publishing / unpublishing
- Adding triggers (Slack, Telegram integrations)
- Adding tools
- Manually editing the agent config via settings panels

We want to reconstruct "which agent configuration was active when the user did X" without sending full instructions text on every event.

## Non-goals

- Backend OpenTelemetry / distributed tracing
- Sending raw user instructions content (privacy)
- Tracking server-side agent execution

## Design

### Composable

New file: `packages/frontend/editor-ui/src/features/agents/composables/useAgentTelemetry.ts`

A thin wrapper around `useTelemetry()` that exposes typed methods for each event. All event-name strings, property shapes, and hashing logic live here. Components and stores call the composable; they never call `track()` directly for agent events.

### Agent config fingerprint

Triggers live outside `AgentJsonConfig` (they're integrations managed via `connectIntegration` / `disconnectIntegration` per-type: `slack`, `telegram`). The fingerprint below is built from `AgentJsonConfig` + the integration status map maintained by [AgentIntegrationsPanel.vue](../../packages/frontend/editor-ui/src/features/agents/components/AgentIntegrationsPanel.vue).

```ts
type AgentConfigFingerprint = {
  instructions_hash: string;      // SHA-256 of instructions, hex, first 16 chars
  instructions_length: number;
  tools: string[];                // tool identifiers, sorted
  triggers: string[];             // connected integration types, sorted (e.g. ['slack'])
  memory: { enabled: boolean; storage: 'n8n' | 'sqlite' | 'postgres' } | null;
  model: string | null;
  config_version: string;         // SHA-256 of the above JSON, hex, first 16 chars
};
```

- `instructions_hash` computed via `crypto.subtle.digest('SHA-256', ...)` — instructions text never leaves the browser.
- `config_version` is a stable key for joining events that refer to the same configuration state.

### Common properties

Every agent event also carries:

- `agent_id: string`
- `session_id: string` — `useRootStore().pushRef`, matching the pattern from `builder.store.ts` (`trackingSessionId = rootStore.pushRef`). Lets analytics group events per browser session.
- `status: 'draft' | 'production'` — derived from `agent.publishedVersion` (null → draft, present → production). Omitted on `User clicked new agent` because no agent exists yet.

### Events

| Event name | Trigger | Extra properties |
|---|---|---|
| `User clicked new agent` | "New agent" button or dropdown option clicked | `source: 'button' \| 'dropdown'` |
| `User submitted message to agent` | Chat submit in agent builder or agent test chat | `message_hash`, `message_length`, `mode: 'build' \| 'test'`, `agent_config: AgentConfigFingerprint` |
| `User edited agent config` | Config change via a settings panel (not via the builder chat) | `part: 'instructions' \| 'model' \| 'memory' \| 'tools' \| 'triggers' \| 'name' \| 'description'`, `config_version: string` |
| `User added trigger to agent` | Integration connected via `AgentIntegrationsPanel` | `trigger_type: 'slack' \| 'telegram'`, `triggers: string[]` (full connected set after add) |
| `User added tools to agent` | Tool added via tools panel | `tool_added: string`, `tools: string[]` (full list after add) |
| `User published agent` | Publish succeeds in `useAgentPublish.publish` | `config_version: string` |
| `User unpublished agent` | Unpublish succeeds in `useAgentPublish.unpublish` | — |

Standard RudderStack properties (`version_cli`, `posthog_session_id`, identified user) are added automatically by `Telemetry.track()`.

### Mode derivation

The chat panel's `endpoint` prop is `'build' | 'chat'` ([AgentChatPanel.vue](../../packages/frontend/editor-ui/src/features/agents/components/AgentChatPanel.vue)). For telemetry we map:

- `endpoint === 'build'` → `mode: 'build'` (talking to the builder agent)
- `endpoint === 'chat'` → `mode: 'test'` (chatting with the agent being built)

### `User edited agent config` — manual vs builder-driven

The builder chat can rewrite the config via `onConfigUpdated`. We track the **user-initiated** edit path only:

- Fire from the settings panels' `update:config` emission handlers (e.g. in `AgentBuilderView.vue` where the panels bubble up)
- Do NOT fire when `onConfigUpdated` from `useAgentChatStream` runs — those are changes made by the builder agent, separately covered by the `User submitted message to agent` event

To distinguish the two call paths, the `update:config` handler in the builder view calls the telemetry method with the `part` derived from which keys changed in `Partial<AgentJsonConfig>`. The builder-stream handler does not call it.

### Add vs remove

The spec intentionally tracks adds (`User added trigger`, `User added tools`) rather than every removal. Removals are still captured implicitly by `User edited agent config` with `part: 'tools'` or `part: 'triggers'`, because the settings-panel remove actions go through the same `update:config` path.

### Privacy

- `message` (submitted prompt): never sent raw; only SHA-256 hash (first 16 hex chars) + length
- `instructions`: never sent raw, only hash + length
- Tools / triggers / memory storage: identifiers, not user data

### Testing

Unit tests colocated with the composable:

- One test per event method asserting the correct event name and payload shape
- A test that `instructions_hash` is stable for identical input and changes when input changes
- A test that `config_version` changes when any fingerprint input changes
- Mocks `useTelemetry()` — no real network calls

## Open questions

None at this time.

## Out of scope / future work

- Backend correlation via OTel browser SDK
- Session-level umbrella event (`Agent builder journey`) — considered, left out for now to keep the surface flat; can be added later if analytics needs it
