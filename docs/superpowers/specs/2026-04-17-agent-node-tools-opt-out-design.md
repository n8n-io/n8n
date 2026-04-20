# Per-agent toggle for the built-in node tool chain

**Status:** Approved (2026-04-17) — revised to opt-in default on 2026-04-20

## Summary

The agent runtime currently attaches the built-in node tool chain
(`search_nodes`, `get_node_types`, `list_credentials`, `run_node_tool`) to every
agent unconditionally via `AgentsService.attachNodeTools`. This spec adds a
per-agent setting so an agent author can enable the chain. The setting lives
in the agent's JSON config, defaults to **disabled**, and surfaces as a toggle
in the existing Tools panel of the agent editor.

## Goals

- Give agent authors a per-agent on/off switch for the built-in node tool chain.
- Default to **disabled** — authors opt in explicitly when they want the chain.
- Keep the toggle close to where authors already manage tools.
- Leave room to extend the setting later (e.g. per-tool granularity, filters)
  without another schema break.

## Non-goals

- A global/instance-level kill switch. (May be revisited; not in this scope.)
- Splitting the chain into "discover-only" vs "execute" modes. The chain is a
  single unit in this iteration.
- Changing how the catalog itself is initialized or cached.

## Design

### Schema change — `AgentJsonConfig`

Add a new optional field under the existing `config` block in
[`agent-json-config.ts`](../../../packages/cli/src/modules/agents/json-config/agent-json-config.ts):

```ts
config: z
  .object({
    thinking: ThinkingConfigSchema.optional(),
    toolCallConcurrency: z.number().int().min(1).max(20).optional(),
    requireToolApproval: z.boolean().optional(),
    nodeTools: z
      .object({
        enabled: z.boolean(),
      })
      .optional(),
  })
  .optional(),
```

**Shape rationale:** an object (`{ enabled }`) rather than a flat
`nodeToolsEnabled: boolean`. This is forward-compatible — if we later need
per-tool flags, filters, or limits, they slot in alongside `enabled` without
another breaking change.

**Defaulting rule:** absence means disabled. The runtime check is

```ts
const nodeToolsEnabled = config.config?.nodeTools?.enabled === true;
```

Only an explicit `nodeTools: { enabled: true }` enables the chain; every other
shape (no `config` block, no `nodeTools` key, `nodeTools: {}`, or
`nodeTools: { enabled: false }`) leaves the chain off.

### Backend gate

[`AgentsService.attachNodeTools`](../../../packages/cli/src/modules/agents/agents.service.ts)
gains a single guard. The agent's parsed config is already available at the
call site (it lives on `agentEntity.schema`), so the method takes the resolved
flag — keeping the service ignorant of schema shape:

```ts
private attachNodeTools(
  agent: agents.Agent,
  projectId: string,
  credentialProvider: CredentialProvider,
  enabled: boolean,
): void {
  if (!enabled) return;
  agent.tool(this.agentsToolsService.getRuntimeTools(credentialProvider, projectId));
}
```

The single caller (`fromSchema`) reads the flag from `agentEntity.schema` and
passes it through. `AgentsToolsService` is not modified — the gate lives at
the wiring point, not inside the tool factory.

The catalog still warms at module startup, so flipping the toggle on while the
process is running takes effect on the next agent run without an init delay.

### Frontend toggle

[`AgentToolsPanel.vue`](../../../packages/frontend/editor-ui/src/features/agents/components/AgentToolsPanel.vue)
gains a toggle row at the top of the panel, above the existing custom/workflow
tool list. The row contains:

- **Title:** "Built-in node tools"
- **Description:** "Let the agent search the n8n node catalog and execute
  nodes on demand."
- **Toggle:** standard design-system switch, bound to
  `config.config?.nodeTools?.enabled === true`.

When the user flips the toggle, the panel emits the existing
`update:config` event with the merged partial:

```ts
emit('update:config', {
  config: {
    ...(props.config?.config ?? {}),
    nodeTools: { enabled: newValue },
  },
});
```

The parent (`AgentSettingsSidebar` / `AgentBuilderView`) already persists
config edits the same way it handles other settings — no new persistence path.

i18n keys live in `@n8n/i18n` alongside the other agent panel strings.

### Behavior matrix

| Scenario                                  | Effect                             |
| ----------------------------------------- | ---------------------------------- |
| Existing agent, schema has no `nodeTools` | Tools not attached (new default)   |
| New agent created today                   | Tools not attached                 |
| Author enables toggle                     | Tools attached on next run         |
| Author disables toggle                    | Tools not attached on next run     |

No DB migration is required: the agent schema lives in the agent's JSON
`schema` column, and the change is additive. Note that existing agents that
were relying on the unconditionally-attached tool chain will need to opt in
explicitly to restore previous behavior.

## Testing

**Backend**

- `agent-json-config.test.ts` — `AgentJsonConfigSchema` accepts the new
  `nodeTools` shapes (absent, `{}`, `{ enabled: true }`, `{ enabled: false }`)
  and rejects bad shapes (`nodeTools: true`, `nodeTools: { enabled: 'yes' }`).
- `agents.service.test.ts` — assert that the agent built by `fromSchema` has
  the node tools attached when the flag is absent or `true`, and not attached
  when it is `false`. (Uses the existing test infrastructure that mocks
  `AgentsToolsService`.)

**Frontend**

- `AgentToolsPanel.spec.ts` — toggle reflects the current config value;
  flipping the toggle emits `update:config` with the merged
  `config.nodeTools.enabled`; toggling on an agent whose `config` block is
  absent doesn't drop existing siblings.

## Out of scope / open questions

- A global instance-level setting (env var or admin toggle) is intentionally
  deferred. If we need it later, it composes cleanly: instance-disabled
  short-circuits before the per-agent check.
- Telemetry on toggle changes is not included; can be added later if we want
  adoption signal.

## Files touched (estimated)

- `packages/cli/src/modules/agents/json-config/agent-json-config.ts` — schema
- `packages/cli/src/modules/agents/agents.service.ts` — gate
- `packages/cli/src/modules/agents/__tests__/*` — tests
- `packages/cli/src/modules/agents/json-config/__tests__/*` — tests (if absent,
  add)
- `packages/frontend/editor-ui/src/features/agents/components/AgentToolsPanel.vue`
  — toggle row
- `packages/frontend/editor-ui/src/features/agents/components/__tests__/AgentToolsPanel.spec.ts`
  — test
- `packages/@n8n/i18n/src/locales/en.json` — strings
