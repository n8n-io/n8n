# Mandatory Outcome on Empty Input

Use when a downstream node must run even though an upstream node can emit 0
items — a source returns no rows, every row is filtered out, or both.

Recognize this by execution semantics, not by wording: if a node must run once
per trigger and produce its output even when upstream is empty — because it
aggregates its whole input, or is a terminal effect that must happen every run —
this case applies, even if the user did not say so. A node that should only act
when matching items exist is the opposite — let the empty case stop it.

## Why the default is not enough

By default a node that outputs **0 items** stops its branch; downstream nodes do
not run. That is correct for per-item work, where 0 items means nothing to do.
It is wrong when a specific downstream node must still run on the empty case.

## Two empty cases fail at different nodes

This is the part that is easy to get wrong: the branch can become empty in two
places, and fixing one does not fix the other.

| Case | Where items become 0 | Fix |
|------|----------------------|-----|
| Empty fetch | the fetch/query node returns `[]` | `alwaysOutputData: true` on the **fetch** node |
| All filtered | rows arrive but every one is dropped | `alwaysOutputData: true` on the **filter** (or in-code filter) |
| Both possible | fetch can be empty *and* the filter can drop everything | `alwaysOutputData: true` on **both** |

A Code node that handles `count === 0` does **not** help when the fetch returned
`[]`, because that Code node never runs.

## Walk the whole chain — do not stop at the nearest node

From the must-run node, trace upstream to the trigger and set
`alwaysOutputData: true` on **every** node that can emit 0 items, not just the
most obvious one:

- A source/fetch/query/list/search node returns an array that can be empty
  (`[]` = 0 items) **even when the request succeeds**. This is the one most
  often missed — set it here first.
- A filter (or IF in filter mode) can drop every row — set it here too.

With both set, an empty source emits one synthetic item, the filter passes or
drops it and still emits one synthetic item, so the must-run node always runs.
Setting it on only one node leaves the other path silently empty.

## Mechanism

`alwaysOutputData: true` is a node **setting** (in the SDK `config`, not a
parameter). When the node would emit 0 items, n8n injects one synthetic
`{ json: {} }` item so the branch continues.

- Apply it on **every node before the action node** that can emit zero items.
- Do **not** set it on the formatter or action node — a node that receives 0
  items never runs, so it cannot "always output".
- Downstream Code/formatters must treat the synthetic item as non-data (e.g.
  skip items missing an expected field).

## Anti-patterns

- `alwaysOutputData` only on the filter when the fetch can return `[]`.
- `alwaysOutputData` on the action node — it still needs an input item to run.

## Related

- `skills/workflow-builder/references/workflow-control-flow.md` — control-flow
  rules and the walk-the-chain check.
