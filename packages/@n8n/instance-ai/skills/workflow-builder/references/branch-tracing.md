# Branch Tracing And Workflow Design

Use this reference before saving workflows with branching, merging, multi-item
data, AI agents, or helper workflows.

## Trace The Graph

- Trace every branch from producer to consumer before saving.
- IF outputs must use `.onTrue()` / `.onFalse()`.
- Switch outputs must use zero-based `.onCase(index, target)`.
- Merge inputs must use `.input(0)` / `.input(1)`, and the merge mode must match
  the expected data shape.
- Linear chains should use `.to(nextNode)`.

Trace data shape, not just node existence. If a node formats `subject`,
`message`, `rows`, or similar fields, make sure the downstream sender/writer
receives that exact item shape on the same branch.

## Data Shape Rules

- For empty item lists, let the workflow emit zero items. Do not add
  `alwaysOutputData: true` or redundant IF gates just to keep downstream nodes
  alive.
- Use `executeOnce: true` when one node should run once for many input items,
  such as sending a summary notification or generating a report.
- Pick the right control-flow primitive: `filter` for dropping items, `IF` for
  two real branches, `switch` for many keyed branches, and `splitInBatches` for
  per-item side effects.
- Name AI tools by the action they perform. Set explicit concise snake_case tool
  names such as `get_email`, `add_labels`, or `mark_as_read`.

## Modular Workflows

For complex systems, prefer the approved plan's decomposition over inventing a
large single workflow. If the plan contains helper workflow tasks followed by a
main workflow task:

- Build helper workflows as callable sub-workflows with a strict input contract
  and a clear returned output shape.
- Use an `executeWorkflowTrigger` node for each helper workflow's entry point.
- When building the main workflow, read dependency outcomes from the
  `<planned-task-follow-up>` task list and reference each helper by its
  `outcome.workflowId` in `executeWorkflow` nodes.
- Keep simple workflows as one workflow. Do not create extra workflows unless
  the approved plan or the user's request calls for modular composition.

Patch from tool evidence. Use validation errors, build outcomes, execution
evidence, and verifier findings as the repair source; do not patch from a vague
guess when the evidence points to an input-shape or setup issue.
