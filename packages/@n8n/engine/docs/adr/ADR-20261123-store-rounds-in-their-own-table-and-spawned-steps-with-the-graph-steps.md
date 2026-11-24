# Store rounds in their own table and spawned steps with the graph steps

Date: 2026-11-23

Status: Active

Decision Owner: Core Execution

Source: https://linear.app/n8n/issue/CET-648

## Context

With ADR-20261123-steps-declare-actions-that-the-engine-runs-as-steps, one step row runs many
rounds, and each round can spawn steps. The terms in this record come from that record.

The table `workflow_step_execution` holds one row for each node and iteration of an execution, with
a unique index on the three. The `outputs` column means "the step settled", and successors and
expressions read it. The engine overwrites `wait_declaration` and `resume_cause` on each wait and
resume. The completion count, fail-fast, the expression data loader and successor planning read
this table and expect each row to be the run of a graph node. The engine stores outputs and
derives inputs.

## Decision

1. **Each round that does not end with outputs is one row in a new table, `workflow_step_round`.**
   The primary key is the step id and the round number. The row holds the execution id, the
   actions (which the engine reads) and the round payload (which the engine does not read). For a
   round with actions, one transaction writes the row, suspends the step and creates one queued
   spawned step for each action. So the execution never shows a round without its spawned steps.
   The transaction also locks the execution row and checks under the lock that the execution has
   not ended. If it has ended, the transaction writes nothing, so a round never adds spawned steps
   to an execution that has ended. A round that ends with outputs writes no row and settles the
   step as any step does. A round without actions is written as a round with actions is, with an
   empty list of actions and no spawned step. So a crash before the continue leaves a waiting
   step, which reconciliation wakes. A duplicate write does nothing.
2. **A round row should hold only what is new in that round.** The engine builds the continuation
   from all round rows and their spawned steps: each action's outcome is its spawned step's outputs
   or error. A round without actions has no outcomes. The node rebuilds its whole conversation from
   the continuation. An outcome is stored only once, in its spawned step. The engine does not
   enforce this rule, and a v1 node behind the shim does not follow it: its round payload repeats
   the earlier rounds.
3. **Spawned steps live in `workflow_step_execution`.** A `kind` column tells a graph step, a
   spawned step and a recorded step apart
   (ADR-20261123-record-sub-node-runs-as-settled-steps). A spawned step also has its declaring
   step's id, the round and its position in the round. These three are its key. A recorded step
   has its key in the same three columns. The call id is optional data of the action, in the round
   row. A check constraint ties these columns to `kind`. The unique index on node and iteration
   applies to graph steps only. A second unique index on kind, declaring step, round and position
   applies to spawned steps and recorded steps.
4. **A spawned step's node is the action's target node. Its iteration is the declaring step's
   iteration.** Its declaring step can be a graph step or another spawned step. Its v1 run index
   is its call order among the spawned steps of the same node, by round and then by position.
5. **A spawned step stores no input.** The engine derives it from the declaring step's gathered
   input item for the action and from the action's arguments. A spawned step sees expressions as
   its declaring step does, in the same loop pass.
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
- **Write the rows of a round in a fixed order, without one transaction.** Rejected. The order
  would be: recorded steps, round row, status, spawned steps. A crash before the status change
  would need no new repair, because the step would still be `running` and reconciliation would
  fail it. A crash between the status change and the spawned steps would need a new detector, and
  the wake repair would have to compare the spawned steps with the actions of the round. The
  status change and the insert of the spawned steps would each need the lock on the execution
  row, so each would be a transaction in any case. One transaction for all writes costs no more
  and has no state in between.
- **Tell spawned steps apart by a null declaring step id.** Rejected. An explicit `kind` makes each
  filter visible in the code.

## Consequences

- A graph-only query that forgets the filter breaks without an error. Tests that the completion
  count and fail-fast ignore spawned steps guard the most important ones.
- The step table and its indexes grow with each action. Workflows without agents share that table.
- To continue a step, the engine reads all its round rows and their spawned steps. That cost grows
  with the number of rounds. Each spawned step reads its declaring step's full input to take one
  item.
- For a v1 node behind the shim, the stored round payloads grow with the square of the number of
  rounds. The node's iteration limit and the engine's round cap bound it. Storing the payloads
  without repetition is deferred.
- Round payloads and outputs stay inline. Large agent runs make rows large until large step data
  moves out of the database, which is a separate decision.
- A round payload must be JSON. The node serialises its own state.
- Only graph steps follow from the graph. A spawned step follows from a round row.
- The live execution status never reads `waiting` between a round and its spawned steps, because
  queued spawned steps exist as soon as the declaring step waits. Nor does it between the last
  settled action and the continue, because the engine wakes the declaring step first.

## Links

RFC: -

Documentation: https://github.com/n8n-io/n8n/pull/43694

Related ADRs: ADR-20261123-steps-declare-actions-that-the-engine-runs-as-steps, ADR-20261123-attach-sub-nodes-to-the-graph-outside-its-edges, ADR-20261123-record-sub-node-runs-as-settled-steps
