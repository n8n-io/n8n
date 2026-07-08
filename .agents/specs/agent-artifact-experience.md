# Agent Artifact Experience

## Summary

Instance AI should treat n8n Agents as first-class artifacts, alongside workflows
and data tables. When the assistant starts building an agent and `create_agent`
succeeds, the new agent appears in the artifacts panel immediately. Selecting it
opens an artifact preview in the side panel that reuses the existing agent UI,
including the builder header, Preview button, Publish controls, overflow actions,
and all main tabs. The only part omitted from the artifact surface is the
agent-builder chat column, because the active Instance AI thread is already the
chat surface.

The implementation should mostly be frontend work. The backend/shared contract
needs only enough metadata for Instance AI to identify agent artifacts from
agent-builder tool activity.

## Goals

- Show an agent artifact as soon as the agent exists, before the full config is
  complete.
- Keep the artifact updated as Instance AI writes config, tools, skills, tasks,
  channels, knowledge, sessions, settings, and publish state.
- Reuse the main agent UI instead of building a separate lightweight preview.
- Preserve existing workflow and data-table artifact behavior.
- Keep old thread hydration quiet: historical artifacts should reappear in the
  panel without auto-opening the preview.
- Keep the change deployable incrementally behind the existing Instance AI and
  Agents feature gates.

## Non-Goals

- Replacing the standalone agent builder route.
- Adding a second agent-builder chat inside the artifact preview.
- Reworking the agent-builder backend persistence model.
- Supporting multiple active agent-builder targets per Instance AI thread.
- Redesigning the artifacts panel layout.

## Existing Context

Instance AI currently derives artifact entries from message attachments,
sub-agent `targetResource`, and tool-call results in
`packages/frontend/editor-ui/src/features/ai/instanceAi/useResourceRegistry.ts`.
Those entries are consumed by `useCanvasPreview.ts`,
`InstanceAiArtifactsPanel.vue`, timeline cards, markdown resource linking, and
preview tab rendering. Today the artifact types promoted into the panel and
preview are `workflow` and `data-table`.

Agent building is already integrated into Instance AI through the
`agent_builder` router tool and `create_agent`. The created target is persisted
in thread metadata by
`packages/@n8n/instance-ai/src/tools/agent-builder/agent-target-binding.ts`, so
follow-up turns keep editing the same agent. `AgentBuilderView.vue` already has
the full agent builder shell, the builder chat column, the editor column, header,
preview route, and publish/version actions.

## User Experience

When the assistant calls `agent_builder({ action: "create_agent" })` and the
result is successful, the artifacts panel adds a row for the agent immediately:

- Icon: robot.
- Label: the created agent name.
- Link target: the normal agent route for modifier-click or fallback navigation.
- Normal click: opens the Instance AI artifact preview side panel.

The artifact preview should look like the existing agent builder UI, not a
summary card. It includes:

- Agent header with project breadcrumb or equivalent compact context.
- Preview button.
- Publish/unpublish/revert controls.
- Overflow menu actions that are already available in the builder.
- Agent, Knowledge, Sessions, Settings, and any other configured main tabs.
- Existing forms, modals, credential selectors, tool/skill/task editors, and
  knowledge upload surfaces.

The artifact preview omits:

- The `AgentBuilderChatColumn`.
- The separate agent preview chat route as the default body. The Preview button
  may still open the existing agent preview flow, matching current agent UI
  behavior.

As Instance AI continues building, the same artifact remains selected and
refreshes. If the artifact is open while config changes land, the visible editor
state should update without the user needing to close and reopen the preview.

## Data Contract

Extend the shared Instance AI resource model to support `agent`.

`agentSpawnedTargetResourceSchema` in
`packages/@n8n/api-types/src/schemas/instance-ai.schema.ts` should allow:

```ts
type InstanceAiTargetResource = {
	type: 'workflow' | 'data-table' | 'credential' | 'agent' | 'other';
	id?: string;
	name?: string;
	projectId?: string;
};
```

`projectId` is optional for backward compatibility, but agent artifacts should
carry it whenever available. The artifact preview needs both `agentId` and
`projectId`.

Agent-builder tool results should expose stable artifact metadata:

```ts
type AgentBuilderArtifactResult = {
	ok: true;
	agentId: string;
	projectId: string;
	name: string;
	updatedAt?: string;
	versionId?: string;
};
```

`create_agent` should return `projectId` in addition to the existing `agentId`
and `name`. Other mutating agent-builder actions do not need to adopt a new
wrapper immediately, but the frontend registry should be able to extract agent
metadata from any successful result that includes `agentId` and either
`projectId` or an already-known project for that agent.

## Frontend Architecture

### Resource Registry

Update `ResourceEntry` to include `agent`:

```ts
type ResourceEntry = {
	type: 'workflow' | 'credential' | 'data-table' | 'agent';
	id: string;
	name: string;
	projectId?: string;
	createdAt?: string;
	updatedAt?: string;
	archived?: boolean;
};
```

Add `agent_builder` to the registry extraction path. The registry should:

- Record a produced agent when `agent_builder` action `create_agent` returns
  `ok: true`.
- Preserve the original artifact entry and merge later metadata by `id`.
- Update the name if later config snapshots or tool results expose a new name.
- Index agents by name for markdown linking only after they are produced by the
  current thread.
- Ignore passive `list_agents` results for produced artifacts, but index them by
  name for explicit resource lookup, mirroring workflow list behavior.

### Artifact Panel

Update `InstanceAiArtifactsPanel.vue` to render `agent` entries in the artifacts
section:

- Icon: `robot`.
- `href`: `/projects/:projectId/agents/:agentId` when `projectId` exists.
- Fallback `href`: `/home/agents` or the closest existing agents list route.
- Normal click: prevent navigation and call an injected `openAgentPreview`
  handler.

The panel should still render workflows and data tables exactly as today.

Update timeline artifact rendering in `agentTimeline.utils.ts`, `AgentTimeline`,
and `AgentActivityTree` so completed agent-builder activity can show the same
agent artifact card as the artifacts panel. Timeline clicks should use the same
preview-opening path as panel clicks.

### Preview Tabs

Rename or generalize the canvas preview composable only if it materially improves
clarity. A small additive change to `useCanvasPreview.ts` is acceptable:

- `ArtifactTab.type` becomes `'workflow' | 'data-table' | 'agent'`.
- Add `activeAgentId` and `activeAgentProjectId`.
- Add `openAgentPreview(agentId, projectId)`.
- Add an agent icon mapping.
- Provide `openAgentPreview` from `InstanceAiThreadView.vue` beside the existing
  workflow and data-table preview handlers.
- Render `InstanceAiAgentPreview.vue` when the active artifact tab is an agent.
- Auto-open live agent artifacts on `create_agent`, but skip auto-open while
  hydrating historical messages.
- Refresh the active agent artifact when later agent-builder tool calls mutate
  the same agent.

If the implementation makes this composable feel too broad, split the generic
artifact tab state into `useArtifactPreview` and keep workflow-specific
execution refresh logic in a workflow helper. That split is optional for the
first implementation.

### Agent Artifact Preview

Create `InstanceAiAgentPreview.vue` under
`packages/frontend/editor-ui/src/features/ai/instanceAi/components/`.

Responsibilities:

- Receive `projectId`, `agentId`, and a `refreshKey`.
- Render the existing agent builder surface in artifact mode.
- Keep the agent editor interactive according to existing agent permissions.
- Reuse existing modals and stores from the agents module.
- Refresh agent/config data when `refreshKey` changes.
- Avoid creating a nested Instance AI chat experience.

Preferred composition is to refactor `AgentBuilderView.vue` so its reusable
builder shell can be mounted by both routes and the artifact:

```text
AgentBuilderView.vue
  - owns route/query/session behavior
  - passes mode="builder" or mode="preview" into shared shell

AgentBuilderShell.vue
  - owns loading, fetches, header, editor tabs, publish/actions, modals
  - accepts mode="builder" | "artifact"
  - hides AgentBuilderChatColumn when mode="artifact"
  - can receive projectId/agentId as props instead of route-only state

InstanceAiAgentPreview.vue
  - thin adapter from artifact tab props to AgentBuilderShell mode="artifact"
```

This avoids duplicating the large agent-builder setup in Instance AI while also
keeping route-specific preview chat logic out of the artifact.

## Backend and Shared Types

The backend changes should remain narrow:

- Add `agent` to `agentSpawnedTargetResourceSchema`.
- Include `projectId` in the `create_agent` tool result.
- Ensure any explicit agent-builder sub-agent spawn uses
  `targetResource: { type: 'agent', id, name, projectId }` when the target is
  already known.
- Do not add new REST endpoints for the artifact preview unless a missing agent
  API capability is discovered during implementation.

The existing agent REST APIs, config APIs, session APIs, publish APIs, knowledge
APIs, and modal flows should be reused by the artifact shell.

## State and Refresh Behavior

Agent artifacts are keyed by `agentId`.

Creation:

1. `create_agent` succeeds.
2. Registry records `{ type: 'agent', id: agentId, projectId, name }`.
3. Live thread preview auto-opens the agent artifact unless the thread is
   hydrating.

Updates:

1. `build_agent`, `create_skill`, `create_task`, custom tool creation, channel
   configuration, and related mutations complete.
2. Registry merges updated metadata if present.
3. `refreshKey` increments when the active artifact's agent was mutated.
4. `InstanceAiAgentPreview` refreshes agent/config data.

Historical load:

1. Registry reconstructs produced agent artifacts from persisted messages and
   target metadata.
2. The artifacts panel displays them.
3. Preview remains closed unless the user opens an artifact.

Permissions:

- Artifact editing follows the same `useAgentPermissions(projectId)` checks as
  the normal builder.
- If the user lacks update permission, the editor opens read-only using existing
  `canEditAgent` handling.
- If the user lacks read permission or the agent was deleted, show the existing
  agent load error treatment inside the artifact panel body.

## Telemetry

Add or reuse telemetry events for:

- Agent artifact displayed after Instance AI creates an agent.
- User opens an agent artifact from the artifacts panel or timeline card.
- User clicks Preview from the agent artifact.
- User publishes from the agent artifact.

Do not duplicate existing agent-builder telemetry for config edits; the shared
shell should continue emitting the same events.

## Testing

Unit tests:

- `useResourceRegistry.test.ts`
  - records an agent artifact from `agent_builder` `create_agent`.
  - updates an existing agent artifact name from later metadata.
  - does not promote `list_agents` results into produced artifacts.
- `useCanvasPreview.test.ts`
  - includes agent tabs.
  - opens agent preview from live creation.
  - skips auto-open during hydration.
  - refreshes active agent preview after relevant mutations.
- `InstanceAiArtifactsPanel.test.ts`
  - renders agent rows with robot icon and correct label.
  - calls injected `openAgentPreview` on normal click.
  - keeps modifier-click navigation intact.
- Agent shell tests
  - artifact mode hides `AgentBuilderChatColumn`.
  - artifact mode renders header and `AgentBuilderEditorColumn`.
  - artifact mode passes publish and preview actions through.

E2E test:

- Add a Playwright case under Instance AI artifacts coverage:
  - Ask Instance AI to build a simple agent.
  - Wait for the agent artifact row.
  - Open it.
  - Assert the side panel shows the agent editor tabs, Preview button, Publish
    control, and no agent-builder chat column.
  - Assert a later assistant update refreshes the open artifact name or visible
    config.

## Rollout

Ship behind existing Instance AI and Agents module availability. No separate
feature flag is required unless the shared shell refactor becomes large enough
to warrant staged rollout.

If the backend contract lands before the artifact preview, the frontend should
be able to safely ignore `agent` resources until support is enabled. If the
frontend lands first, registry extraction should require concrete `agentId` and
`projectId` before rendering an openable preview.

## Implementation TODO

- [ ] Extend shared `targetResource` and relevant frontend resource types with
      `agent`.
- [ ] Return `projectId` from `create_agent` tool results.
- [ ] Register produced agent artifacts from `agent_builder` tool calls.
- [ ] Render agent entries in the artifacts panel and timeline cards.
- [ ] Extend artifact preview tab state to support active agent artifacts.
- [ ] Refactor the agent builder UI into a reusable shell with an artifact mode.
- [ ] Add `InstanceAiAgentPreview.vue` as the Instance AI adapter.
- [ ] Wire refresh behavior for active agent artifacts after agent-builder
      mutations.
- [ ] Add unit tests for registry, preview tabs, artifact panel, and agent shell.
- [ ] Add Instance AI Playwright coverage for building and opening an agent
      artifact.
