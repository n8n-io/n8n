# Group as a first-class node

Status: in progress. Feature flag: `group-node` (front end) /
`N8N_GROUP_NODE_ENABLED` (back end). The old `nodeGroups` path stays the default
until the flag is on by default and the migration is proven.

## Why

Today a canvas group is a render-only entity. It is an entry in
`workflow.nodeGroups`, and the editor draws it as a synthetic VueFlow node. The
execution engine never sees it. The group borrows one member node as its
connection boundary. Two limits come from that borrowing:

- A group must have exactly one entry node and one exit node.
- A group cannot hold a trigger node.
- A group cannot be empty, because there is no member to borrow.

This design makes the group a real node. The group owns its ports, so it does
not borrow a member. All three limits go away.

## Model

A group is a node in `workflow.nodes`:

```jsonc
{
  "id": "g1",
  "name": "End",                    // the user-facing TITLE
  "type": "n8n-nodes-base.group",
  "typeVersion": 1,
  "position": [640, 200],
  "parameters": {
    "objective": "extract transform and load", // the DESCRIPTION on the card
  },
}
```

Members are ordinary nodes that carry `parentId`:

```jsonc
{ "id": "n1", "name": "Extract", "type": "...", "parentId": "g1" }
```

This is a **flat** interior. There is no sub-graph nested inside the group
node. The interior is "every node whose `parentId` is this group's id".

Consequences:

- A group is **empty** when no node points at it. Nothing else marks emptiness.
- **Nesting** is free: a group node can itself carry a `parentId`.
- No member is special. There is no placeholder and no borrowed boundary.
- The connection shape does not change. The group has ports, so a connection to
  a group is an ordinary connection to a node.

`workflow.nodeGroups` stays for the old path. When the flag is on, the loader
migrates `nodeGroups` into group nodes (see Migration).

## Boundary semantics

The group has one main input and one main output. The interior is hidden behind
them. Two rules define the boundary. They are stated once here and implemented
once, in the engine.

### Interior entry and exit

Within a group's interior:

- An **entry** node is an interior node with no incoming main connection from
  inside the same group.
- An **exit** node is an interior node with no outgoing main connection to
  another node inside the same group.

A trigger inside a group is an entry node that also has no incoming boundary
edge. Nothing special is needed for it.

### Fan-in: one group input to many interior entries

The group's input can reach more than one entry node. The default is an
**implicit merge on the way in**: every item that arrives on the group's input
is delivered to **every** interior entry node, unchanged. Each entry node gets
its own copy of the same input branch.

This is a broadcast, not a round-robin and not a split. A group with three
entry nodes and one input item runs all three entry nodes with that one item.

### Collect: many interior exits to one group output

The group's output can be fed by more than one exit node. The default is an
**implicit collect on the way out**: the group's output is the concatenation of
the items produced by every interior exit node, in the interior's execution
order.

This matches how a Merge node in `append` mode behaves, and it is the only
semantics that does not need a user-facing choice.

### Empty interior

An empty group forwards its input to its output unchanged. It is a no-op. This
falls out of the two rules above: with no entry nodes the input has nowhere to
go, so it goes straight to the output.

## Where the engine change lives

Constraint: the boundary is resolved **once**, not at each call site. The old
design resolved group boundaries at 23 separate places, and that is the failure
mode to avoid.

The resolution happens in the `Workflow` class, when it builds its connection
indices. The engine's execution loop, the runner, webhooks, workers,
sub-workflows, partial runs, and the editor's expression resolution all read
those indices, so all of them inherit the behaviour with no change of their own.

Concretely, `Workflow` keeps the authored graph and derives an **execution
graph** from it:

| Authored edge | Execution edge |
|---|---|
| `A -> group G` | `A -> each entry node of G` (fan-in broadcast) |
| `group G -> B` | `each exit node of G -> B` (collect) |
| `A -> empty group G -> B` | `A -> B` (pass-through) |

The group node itself never runs. It has no execute function that touches data.
It is a boundary marker, in the same family as a sticky note: present in
`nodes`, never a step in the run.

Two properties make this safe:

- **Idempotent.** Deriving the execution graph twice gives the same graph.
- **Transitive.** A group whose entry node is itself a group resolves through
  both boundaries, so nesting needs no extra code.

Because the rewrite happens where connections are indexed, the execution loop
in `workflow-execute.ts` still sees a flat graph of runnable nodes. Its
`addNodeToBeExecuted` fan-in logic already waits for every input of a node with
several inputs, so the collect semantics reuses it rather than duplicating it.

## Validation

The old rules that existed only because a member had to stand in as the
boundary are removed:

- single entry
- single exit
- no trigger in a group

The rules that replace them:

1. **Boundary.** An interior node connects to other interior nodes of the same
   group, or to the group's own ports. It never connects past the boundary
   directly to a node outside the group.
2. **`parentId` refers to a group.** The id must name a node of type
   `n8n-nodes-base.group` that exists in the same workflow.
3. **Acyclic.** Following `parentId` from any node must reach a node with no
   `parentId`. A group cannot contain itself, directly or through a chain.
4. **One innermost group per node.** `parentId` is a single value, so this holds
   by construction. The check is that it is not an array and not a list.

The AI sub-node rule stays: a model, tool, or memory connection must not cross a
group boundary.

## Migration

Direction: `nodeGroups` -> group nodes. One migration, reversible.

For each entry in `workflow.nodeGroups`:

1. Create a group node. Its `name` is the entry's `name`. Its
   `parameters.objective` is the entry's `description`. Its `id` is the entry's
   `id`, so existing references stay valid. Its `position` is the top-left of
   the members' bounding box, less the header height.
2. Set `parentId` to the group's id on every node named in `nodeIds`.
3. Re-point every connection that crossed the group boundary:
   - An incoming edge `X -> M`, where `M` is a member and `X` is not, becomes
     `X -> group`.
   - An outgoing edge `M -> Y`, where `M` is a member and `Y` is not, becomes
     `group -> Y`.
   - An edge between two members is left alone.
4. Leave `nodeGroups` in place. The new path ignores it. The old path still
   reads it, so a downgrade keeps working.

The migration must round-trip: a workflow in the old format renders and executes
the same after conversion. A group is never dropped on load. If an entry names a
node that does not exist, the missing id is skipped and the group is still
created, because losing the group loses the user's work.

The reverse direction, for a downgrade, reads the group nodes and rebuilds
`nodeGroups` entries. It is lossy only for the cases the old format cannot
express: an empty group, a multi-entry or multi-exit interior, a trigger in a
group, and nesting. Those groups are dropped from `nodeGroups` and their members
are ungrouped, which is the safe failure: the nodes and the connections survive.

## Canvas

The group card draws the group's **own** handles. Edges attach to them in every
state. Collapsed and expanded differ only in how the interior is drawn, never in
how the edges are wired. There is no placeholder to hide and no frame special
case.

The card is the POC's card, unchanged in look and in gesture: an editable title,
an EMPTY badge when the interior has no nodes, a collapse chevron when it does,
the description inline under the title, click-to-edit with Save and Cancel, and
a centered "+" in the body of an empty card.

One new visual: where a boundary edge enters the interior, it fans to the
interior entry nodes.
