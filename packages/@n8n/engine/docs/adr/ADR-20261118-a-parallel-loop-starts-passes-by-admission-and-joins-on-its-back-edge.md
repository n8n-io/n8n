# A parallel loop starts passes by admission and joins on its back-edge

Date: 2026-11-18

Status: Active

Decision Owner: Core Execution

## Context

A loop in engine v2 is a batch node and one marked back-edge. Each pass is a step of the batch
node, and each pass has one step for each member of the loop body. A pass takes its slice of
items from its own pass number, so the passes do not depend on each other for their input.

The back-edge connects the body of pass `i` to the batch node of pass `i + 1`. This makes the
passes run one after another. The terminal pass reads what each pass returned and fires the done
slot.

Users want to process the batches of a loop at the same time, with a limit on how many run at
once. The settlement rules require that the fate of each step is a function of the step rows, so
that racing planners and reconciliation reach the same answer.

## Decision

A batch node can run its passes in parallel, with a max concurrency `K`. In a parallel loop, the
back-edge does not start the next pass. Two rules replace it:

1. **Admission.** Data pass `p` can exist if `p < N` and `p < settledBodies + K`. `N` is the
   number of data passes. `settledBodies` is the number of passes whose back-edge source has
   settled.
2. **Join.** The terminal pass `N` can exist when every data pass has a settled body. It collects
   what each pass returned, in pass order.

Both rules read only the step rows, so racing planners create the same rows. A planner that reads
stale rows sees fewer settled bodies, so it can admit fewer passes but never more than `K` at a
time. The planner that reads last sees every settled body, so the loop cannot stall.

Pass 0 records `N` on its step row. The planner reads `N` from that row and never reads item
payloads.

A body that returns nothing adds nothing to the done slot. It does not end the loop.

A node in a parallel loop can read only its own pass. A read of another pass fails the step.

## Alternatives Considered

**One splitter step that fans out every pass.** The batch node would run once and create the
body steps of all passes. We rejected it because a body step would read slice `p` of one step
instead of the loop slot of pass `p`. Every edge rule, the completion count, and the run data
for the editor would need a second shape of loop.

**Create every pass at once, with a status that waits for admission.** We rejected it because
it adds a step status that every store query, the reconciliation, and the completion count must
know. Admission from counts needs no new status.

**Let the planner read the item list to find `N`.** We rejected it because the planner reads
step summaries only. An item list can be large, and the planner reads it on every settlement.

**Admit the next pass when a pass completes, without `N`.** The planner would create pass
`p + 1` when pass `p` fills its loop slot. We rejected it because the terminal pass would then
start before the other bodies finish, and it would read incomplete results.

## Consequences

- A parallel loop has the same step rows as a sequential loop: `N + 1` batch node steps and `N`
  body steps for each member. The completion count and the terminal pass lookup do not change.
- The step table has a `loop_pass_count` column. Only batch node steps of a parallel loop write
  it.
- Each settlement of a batch node step or a back-edge source step in a parallel loop runs one
  count query. The query does not read payloads.
- The two modes differ when a body returns nothing. A sequential loop ends, and a parallel loop
  continues.
- Expressions that read another pass, for example with `$runIndex`, fail in a parallel loop.
  Their value would depend on timing.
- The max concurrency is a limit for one loop. The step workers of the engine set the limit for
  all executions.

## Links

RFC: -

Documentation: -

Related ADRs: -
