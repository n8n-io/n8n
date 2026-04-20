# Instance flag for the "Built-in node tools" agent feature

**Status:** Approved (2026-04-20)

## Summary

The per-agent "Built-in node tools" toggle (see
[2026-04-17-agent-node-tools-opt-out-design.md](./2026-04-17-agent-node-tools-opt-out-design.md))
is currently available on every instance that has the agents module enabled.
This spec adds an instance-level flag that hides the toggle in the UI and,
through that, prevents anyone from enabling the node-tool chain on an agent.
The flag is off by default and controlled via a new env var.

## Goals

- Give an instance operator a single env var to gate visibility of the
  built-in node tools toggle and, by extension, the chain itself.
- Follow the existing module-settings pattern (env var → config → module
  `settings()` → `FrontendModuleSettings` → `settingsStore` → component).
- No departure from existing patterns: no PostHog, no backend flag service,
  no per-user rollout. Flip per instance.

## Non-goals

- Per-user / per-project flag. Instance-wide only.
- Backend kill switch that refuses to execute the chain even if an agent has
  `nodeTools.enabled: true` set. Not needed because there's no UI to set it
  without the flag on; agents that already have the flag set from a previous
  enabled window keep working at runtime.
- Global runtime feature flag service (nothing in the codebase does this
  today).

## Design

### Env var and config

Extend [`AgentsConfig`](../../../packages/@n8n/config/src/configs/agents.config.ts):

```ts
@Config
export class AgentsConfig {
  @Env('N8N_AGENTS_CHECKPOINT_TTL')
  checkpointTtlSeconds: number = 345600;

  /**
   * Feature flag: surface the "Built-in node tools" toggle in the agent
   * editor. When disabled (default), the toggle is hidden and no new agent
   * can opt in to the node-tool chain.
   */
  @Env('N8N_AGENTS_NODE_TOOLS_ENABLED')
  nodeToolsEnabled: boolean = false;
}
```

### Module settings

In [`agents.module.ts`](../../../packages/cli/src/modules/agents/agents.module.ts),
inject `AgentsConfig` and expose the flag through `settings()`:

```ts
async settings() {
  const config = Container.get(AgentsConfig);
  return {
    enabled: true,
    nodeTools: { enabled: config.nodeToolsEnabled },
  };
}
```

The nested `nodeTools: { enabled }` shape (rather than a flat
`nodeToolsEnabled`) mirrors how other modules expose feature-scoped blocks
(`chat-hub.enabled`, `insights.summary`, etc.) and leaves room to add
related fields without another breaking change.

### API types

Extend
[`FrontendModuleSettings`](../../../packages/@n8n/api-types/src/frontend-settings.ts):

```ts
/**
 * Client settings for the agents module.
 */
agents?: {
  nodeTools: { enabled: boolean };
};
```

### Frontend

Add a computed to
[`settings.store.ts`](../../../packages/frontend/editor-ui/src/app/stores/settings.store.ts),
matching the `isChatFeatureEnabled` pattern:

```ts
const isAgentNodeToolsEnabled = computed(
  () =>
    isModuleActive('agents') &&
    moduleSettings.value.agents?.nodeTools?.enabled === true,
);
```

Export it from the store.

Gate the toggle row in
[`AgentToolsPanel.vue`](../../../packages/frontend/editor-ui/src/features/agents/components/AgentToolsPanel.vue):

```vue
<div v-if="isAgentNodeToolsEnabled" :class="$style.toggleRow">
  …existing toggle row…
</div>
```

Derive `isAgentNodeToolsEnabled` inside the component via
`useSettingsStore().isAgentNodeToolsEnabled`.

### Backend runtime

No change. The existing `isNodeToolsEnabled(config.config)` predicate
continues to gate `attachNodeToolChain`. With the flag off there is no UI
path to set `config.nodeTools.enabled = true`, so the predicate returns
`false` for every new and existing agent. Agents persisted with
`enabled: true` during a window when the flag was on continue to run as
before — a deliberate choice so disabling the flag doesn't yank capability
out from under existing agents mid-session.

### Behavior matrix

| Env var               | Existing agent, `config.nodeTools.enabled: true` | New agent, user tries to enable |
| --------------------- | ------------------------------------------------ | ------------------------------- |
| unset / `false`       | Still runs the chain at runtime                  | Toggle not visible; can't enable |
| `true`                | Still runs the chain                             | Toggle visible; behaves as before |

## Testing

**Frontend**

- Extend
  [`AgentToolsPanel.test.ts`](../../../packages/frontend/editor-ui/src/features/agents/__tests__/AgentToolsPanel.test.ts):
  stub `useSettingsStore` to return `isAgentNodeToolsEnabled: true` / `false`.
  Assert the toggle renders / doesn't render under each condition. The
  existing toggle-behavior tests keep running under the `true` path.

**Backend**

- No new tests. `AgentsConfig` is declarative; `settings()` is a one-liner
  wiring. Module-settings pipeline is already covered elsewhere.

## Rollout

1. Ship with the flag defaulting to `false`. No user sees the toggle.
2. Instance operators who want to dogfood set
   `N8N_AGENTS_NODE_TOOLS_ENABLED=true`.
3. Remove the flag (collapse to unconditional enabling) when the feature
   graduates. The removal is a one-commit change: drop the env var, the
   config field, the `settings()` entry, the `FrontendModuleSettings` type,
   the `settingsStore` computed, and the `v-if` on the toggle row. The
   per-agent `nodeTools.enabled` field in the agent config stays regardless.

## Files touched (estimate)

- `packages/@n8n/config/src/configs/agents.config.ts` — new env-var field
- `packages/cli/src/modules/agents/agents.module.ts` — surface via `settings()`
- `packages/@n8n/api-types/src/frontend-settings.ts` — `agents?: { … }` entry
- `packages/frontend/editor-ui/src/app/stores/settings.store.ts` — computed
- `packages/frontend/editor-ui/src/features/agents/components/AgentToolsPanel.vue`
  — `v-if` on the toggle row
- `packages/frontend/editor-ui/src/features/agents/__tests__/AgentToolsPanel.test.ts`
  — new cases
