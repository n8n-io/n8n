## Node groups

A node group is a named visual frame around nodes on the canvas. It has no execution
semantics — nothing about how the workflow runs depends on it — but it is how the user reads
the workflow, so it is part of the deliverable, not decoration. Declare one with `.group(name, members, options?)`
on the workflow; members are the node handles (the `const` from `node(...)`), the same
way connections reference nodes:

```typescript
const fetch = node({ /* ... name: 'Fetch data' */ });
const transform = node({ /* ... name: 'Transform' */ });
export default workflow('id', 'My workflow')
  .add(fetch)
  .to(transform)
  .group('Ingestion', [fetch, transform], {
    description: 'Pulls the CRM contacts and normalizes them',
  });
```

`description` is what the user sees while the group is collapsed, so always set one —
anything past 145 characters is cut off. The grouping guidance
covers what it should say.

When editing an existing workflow, **keep the `.group(...)` calls and their descriptions
intact** unless the change is specifically about grouping.

The rules below MUST be followed. Agent save tools drop an invalid group from the saved
workflow and report a warning naming what was invalid. A warning never means the stage should
stay ungrouped: fix what it reports — a duplicate name, a member that does not exist, a
boundary the rules reject — and build again. Never re-emit the same invalid group.

Rules:
- **No trigger nodes.** Trigger nodes cannot be part of a group.
- **One connected section with a single entry and exit.** The connectable members must form a single connected section of the graph — reachable from one another, not two unrelated islands — where at most one member takes main input from outside the group and has no predecessor inside, and at most one member sends main output outside it and has no successor inside (the one exception: a closed loop whose only exit is the loop node) — so a gate cannot hold only its dead end. The limit is on members facing outward, not on connections: several connections may reach that one entry member, and several may leave that one exit member. Sticky notes may accompany the selection without participating in connectivity, and a sticky-only group is valid.
- **Keep AI sub-nodes with their Agent.** If an AI Agent is in a group, its language-model, tool, and memory sub-nodes belong in the same group — put them either all inside the group or all outside it, never split. A model/tool/memory connection must not cross the group boundary.
- **One group per node.** A node can belong to at most one group at a time.
- **Unique identity.** Group names and ids must be unique within the workflow.
- **Non-empty.** A group needs at least one node.

Prefer grouping a linear range of nodes — they read most clearly — but that is a
readability guideline, not a rule the server enforces.
