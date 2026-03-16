## Summary

Overhaul the instance-ai multi-agent transcript system to fix three interrelated UX problems:

1. **Indistinguishable agent cards** — When multiple workflow builders run simultaneously, each shows "Building workflow" with no way to tell them apart. Now each agent card shows a subtitle derived from the task description (e.g. "Fetch HN top stories and email digest").

2. **Hidden sub-agent text** — Text content between tool calls exists in the trace but was filtered out in the UI. The `isRoot` guard that suppressed sub-agent text is removed. A new unified `AgentTimeline` component renders the full chronological timeline (text + tool calls + child agents) for any agent, replacing the duplicated iteration logic across 5 card components.

3. **SSE thread confusion** — On long operations, the main thread would sometimes show sub-agent updates, resolving only after refresh. Root cause: auto-follow-up runs created new messages instead of merging, the mid-run replay guard could misidentify sub-agent events as root agents, and `loadThreadStatus()` injected background tasks without timeline entries.

### Architecture changes

**Shared event reducer** (`@n8n/api-types`): One state machine used by both frontend (live SSE updates) and backend (snapshot building), eliminating drift between `agent-tree-builder.ts` and `instanceAi.reducer.ts`. Uses normalized flat state (`agentsById`, `parentByAgentId`, `toolCallsById`) with no depth limit — replaces the old "root + immediate children" lookup.

**messageGroupId-first routing**: Each user turn generates a stable `messageGroupId`. All auto-follow-up runs within the same turn share this ID. The frontend routes events by resolving `runId → messageGroupId → message`, so late events from any run in a multi-step follow-up chain (A→B→C) always reach the correct assistant bubble.

**run-sync bootstrap**: On SSE connect/reconnect, the backend emits one `run-sync` control frame per live message group (outside the replay cursor model). Each frame carries the full agent tree built from all runs in the group, plus the `runIds[]` array so the frontend can rebuild its routing table. This replaces the fragile mid-run replay heuristic and the `loadThreadStatus()` tree patching.

**In-place tree patching**: `syncAgentTree()` patches existing Vue-reactive objects for property-only changes (tool `isLoading`, agent `status`) and only falls back to full tree replacement for structural changes. This fixes tool loading state not updating in real-time.

### Key files

| Area | Files |
|------|-------|
| Shared reducer | `@n8n/api-types/src/schemas/agent-run-reducer.ts` (new) |
| Schema enrichment | `@n8n/api-types/src/schemas/instance-ai.schema.ts` |
| Backend tools | `build-workflow-agent.tool.ts`, `data-table-agent.tool.ts`, `research-with-agent.tool.ts`, `delegate.tool.ts` |
| Event bus | `event-bus.interface.ts`, `in-process-event-bus.ts` |
| SSE + service | `instance-ai.controller.ts`, `instance-ai.service.ts` |
| Snapshot persistence | `agent-tree-snapshot.ts`, `message-parser.ts` |
| Frontend reducer | `instanceAi.reducer.ts`, `instanceAi.store.ts` |
| UI components | `AgentTimeline.vue` (new), `AgentActivityTree.vue`, `BuilderCard.vue`, `DataTableCard.vue`, `ResearchCard.vue`, `AgentNodeSection.vue` |

## Related Linear tickets, Github issues, and Community forum posts

<!-- Add Linear ticket link here -->

## Review / Merge checklist

- [x] PR title and summary are descriptive. ([conventions](../blob/master/.github/pull_request_title_conventions.md))
- [ ] [Docs updated](https://github.com/n8n-io/n8n-docs) or follow-up ticket created.
- [x] Tests included.
  - 37 shared reducer tests (group replay, deep nesting, concurrent builders, multi-run chains)
  - 35 frontend reducer tests (messageGroupId merging, alias routing, state preservation)
  - 4 store tests including multi-group reconnect regression
  - 14 backend tree builder tests
  - 9 snapshot storage tests
