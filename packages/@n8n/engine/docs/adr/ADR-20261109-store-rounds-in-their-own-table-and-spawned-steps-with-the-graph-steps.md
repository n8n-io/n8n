# Store rounds in their own table and spawned steps with the graph steps

Date: 2026-11-09

Status: Active

Decision Owner: Core Execution

Source: https://linear.app/n8n/issue/CET-648

## Context

With ADR-20261109-steps-declare-actions-that-the-engine-runs-as-steps, one step row runs many
rounds, and each round can spawn steps. The terms in this record come from that record.

The table `workflow_step_execution` holds one row for each node and iteration of an execution, with
a unique index on the three. The `outputs` column means "the step settled", and successors and
expressions read it. The engine overwrites `wait_declaration` and `resume_cause` on each wait and
resume. The completion count, fail-fast, the expression data loader and successor planning read
this table and expect each row to be the run of a graph node. The engine stores outputs and
derives inputs.

## Decision

1. **Each round is one row in a new table, `workflow_step_round`.** The primary key is the step id
   and the round number. The row holds the execution id, the actions (which the engine reads) and
   the round payload (which the engine does not read). For a round with actions, one transaction
   writes the row, suspends the step and creates one queued spawned step for each action. So the
   execution never shows a round without its spawned steps. A round that ends with outputs settles
   the step as any step does. A duplicate write does nothing.
2. **A round row holds only what is new in that round.** The engine builds the continuation from all
   round rows and their spawned steps: each action's outcome is its spawned step's outputs or error.
   The node rebuilds its whole conversation from the continuation. An outcome is stored only once,
   in its spawned step.
3. **Spawned steps live in `workflow_step_execution`.** A `kind` column tells a graph step from a
   spawned step. A spawned step also has its declaring step's id, the round and the call id. A check
   constraint ties these columns to `kind`. The unique index on node and iteration applies to graph
   steps only. A second unique index on declaring step, round and call id applies to spawned steps.
4. **A spawned step's node is the action's target node. Its iteration is the declaring step's
   iteration.** Its declaring step can be a graph step or another spawned step.
5. **A spawned step stores no input.** The engine derives it from the declaring step's gathered
   input item for the action and from the action's arguments.
6. **Every query that must see graph steps only is a named store method that filters on `kind`.**
   No caller writes the filter itself.
7. **Round rows and spawned steps are deleted with their execution.**

## Alternatives Considered

- **A separate table for spawned steps.** Rejected. Graph-only queries would stay correct by
  construction, but a spawned step needs the whole step lifecycle: claim, status changes, waits,
  resume requests, cancellation, live status and events. Each of these would have to handle two
  tables. The parent of a spawned step or of a sub-execution could then be in either table.
- **One row for each action instead of each round.** Rejected. A round also holds data that
  belongs to no action, such as the assistant's text and its reasoning.
- **Keep the rounds in the step row's existing columns.** Rejected. `outputs` means "settled", and
  the engine overwrites `wait_declaration` and `resume_cause` on each round.
- **Store the whole conversation in one value that grows with each round.** Rejected. Each tool
  result would be stored twice, and the stored data would grow faster than the conversation.
- **Tell spawned steps apart by a null declaring step id.** Rejected. An explicit `kind` makes each
  filter visible in the code.

## Consequences

- A graph-only query that forgets the filter breaks without an error. Tests that the completion
  count and fail-fast ignore spawned steps guard the most important ones.
- The step table and its indexes grow with each action. Workflows without agents share that table.
- To continue a step, the engine reads all its round rows and their spawned steps. That cost grows
  with the number of rounds.
- Round payloads and outputs stay inline. Large agent runs make rows large until large step data
  moves out of the database, which is a separate decision.
- A round payload must be JSON. The node serialises its own state.
- Only graph steps follow from the graph. A spawned step follows from a round row.
- The live execution status never reads `waiting` between a round and its spawned steps, because
  queued spawned steps exist as soon as the declaring step waits. Nor does it between the last
  settled action and the continue, because the engine wakes the declaring step first.

## Links

RFC: -

Documentation: -

Related ADRs: ADR-20261109-steps-declare-actions-that-the-engine-runs-as-steps, ADR-20261109-attach-sub-nodes-to-the-graph-outside-its-edges
