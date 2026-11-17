# Record sub-node runs as settled steps

Date: 2026-11-17

Status: Active

Decision Owner: Core Execution

Source: https://linear.app/n8n/issue/CET-649

## Context

Some sub-nodes run inside their root node's step, for example the chat model and the memory of an
AI Agent (ADR-20261117-attach-sub-nodes-to-the-graph-outside-its-edges, decision 2). In engine v1,
each call of such a sub-node is a run of its node, with its output and its token usage. The logs
show these runs under the agent.

In engine v2, these sub-nodes are graph nodes, but no step runs them, so nothing stores their
runs. The step table `workflow_step_execution` holds graph steps and spawned steps, and a `kind`
column tells them apart
(ADR-20261117-store-rounds-in-their-own-table-and-spawned-steps-with-the-graph-steps). The engine
stores outputs and derives inputs.

## Decision

1. **Each call of a sub-node that runs inside its root's step is one row in the step table.** The
   row has a third kind, `recorded`. It names the sub-node and its declaring step, which is the
   step that made the call.
2. **A recorded step is inserted already settled.** The engine never queues, claims or runs it.
   The executor returns the recorded runs with each step result, and the engine writes them with
   that result. The key of a recorded step is its declaring step and a sequence number.
3. **A recorded step stores outputs only.** For a chat model, that is the LLM response with its
   token usage. The input, such as the prompt, is not stored.
4. **Every query that counts, plans or continues steps filters on an explicit kind.** So these
   queries never see a recorded step. This extends decision 6 of the storage record.

## Alternatives Considered

- **A separate table for recorded runs.** Rejected. It needs its own read path, its own deletion
  and its own live events.
- **A JSON column on the declaring step's row.** Rejected. The engine would write the whole value
  again in every round.
- **Store the input too.** Rejected. It breaks the rule that the engine stores outputs only. The
  engine cannot derive the input either, because the node builds the prompt in memory.

## Consequences

- The read path shows chat model and memory runs and their token usage under the root node, as
  engine v1 does.
- The exact prompt of a model call is not shown. The read path can later show what the prompt was
  built from, or the node can build it again on demand.
- The step table grows with each LLM call and each memory call.
- The check constraint on the step table covers the third kind.
- Recorded steps are deleted with their execution, as all step rows are.

## Links

RFC: -

Documentation: https://github.com/n8n-io/n8n/pull/43694

Related ADRs: ADR-20261117-attach-sub-nodes-to-the-graph-outside-its-edges, ADR-20261117-store-rounds-in-their-own-table-and-spawned-steps-with-the-graph-steps, ADR-20261117-steps-declare-actions-that-the-engine-runs-as-steps
