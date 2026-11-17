# Steps declare actions that the engine runs as steps

Date: 2026-11-17

Status: Active

Decision Owner: Core Execution

Source: https://linear.app/n8n/issue/CET-648

## Context

This record uses these terms:

- **Declaring step:** a step whose node asks the engine to run other nodes for it, for example
  an AI Agent that asks for tool calls.
- **Action:** one such request, for example one tool call.
- **Round:** one run of the declaring step's node. A round ends with outputs or with actions. For
  an agent, a round is one LLM call.
- **Turn:** in the AI Agent code, one user message and the agent's whole answer to it. A turn
  takes one or more rounds: every round but the last ends with actions. The engine does not know
  turns. It stores and counts rounds.
- **Spawned step:** the step that runs one action.

In engine v1, the AI Agent node runs one LLM round for each call of `execute`. When the LLM asks
for tools, the node returns an `EngineRequest`. Engine v1 runs each tool node and then calls
`execute` again with an `EngineResponse` that holds the results. Approvals by a human (HITL
tools), nested agents and sub-workflow tools use the same path.

Engine v2 plans steps only for nodes in the graph. An LLM decides at run time which tools run, how
often, and with which arguments. A step result can hold outputs, a wait, or a sub-execution. The
shim refuses an `EngineRequest`, so an agent with tools fails.

## Decision

1. **A step can declare actions.** This is a fourth kind of step result, next to outputs, a wait
   and a sub-execution. Each action names a target node, its position in the round, the input
   item it belongs to, opaque arguments and opaque metadata. It can carry a call id, which the
   engine hands back to the node and never reads. The declaration also carries an opaque round
   payload. The engine never reads what an action or a payload means. Only a node that accepts
   action targets can declare actions
   (ADR-20261117-attach-sub-nodes-to-the-graph-outside-its-edges, decision 5). Any other node
   that declares actions fails its step. The shim turns a v1 `EngineRequest` into actions.
2. **The engine runs each action as a spawned step in the same execution.** A spawned step has the
   full step lifecycle. It can complete, fail, wait for a deadline or a resume request, declare its
   own actions, or declare a sub-execution. It follows the retry settings of its node. Its outcome
   never plans graph successors. The step that records a round does not announce its spawned steps
   itself. It tells the orchestration side, which announces them as it announces graph successors.
3. **A step that waits for its actions is `waiting`, as a step that awaits a sub-execution is.**
   The engine writes this wait itself. The wait names the round, and it has no deadline and no
   resume binding. So no resume request and no deadline can end it. Only the engine ends it. The
   engine announces `step:waiting` only for a wait that something outside the execution ends: a
   deadline or a resume request. A wait for actions or for a sub-execution is not announced.
4. **The engine continues the declaring step when every action of the round has settled.** To
   continue is to run the node again, with the same inputs as the first round plus a continuation.
   The continuation lists every earlier round in order, each with its payload and the outcome of
   each of its actions. The engine derives the continuation from stored rows. It never stores it.
   The last action that settles wakes the declaring step once, the way a finished sub-execution
   wakes its parent: only if the declaring step is still `waiting`. A step that was cancelled with
   its execution is not woken.
5. **A failed action is data, unless its error is marked fatal.** Its error goes into the
   continuation, with its name and details. It does not fail the declaring step or the execution.
   The node decides what the error means. A fatal error fails the declaring step, and so the
   execution, and the engine cancels the other actions of the round. The engine reads only the
   flag. The shim marks an error fatal when the target node has an explicit on-error setting of
   "stop workflow", and for its own "not supported on engine v2" errors.
6. **A continue runs node code. A resume after a deadline or a resume request does not.** The rule
   of ADR-20260902-steps-declare-waits stays true for waits. A continue is the second case that
   runs node code again, after the sub-execution resume of
   ADR-20261020-run-a-sub-workflow-as-its-own-execution.
7. **All rounds share one step row and one iteration.** `step:started` is published when a step
   first runs, and again only after a wait that was announced with `step:waiting`. A resume from a
   wait for actions or for a sub-execution publishes nothing. So the editor shows one run of the
   node, as engine v1 does. A retry or a timeout of a declaring step applies to one round, and the
   time it waits for its actions does not count. The declaring step's graph successors run only
   after its final outputs.
8. **The engine and the shim know no AI library.** All AI knowledge stays in the node. The node
   counts its own rounds (for example `maxIterations`). The engine caps the number of rounds and
   spawned steps in one execution. A step that goes over the cap fails. The engine checks a cap
   with a count, so the caps are soft: rounds that run at the same time can exceed a cap slightly.
9. **A round can have no actions.** The engine records the round with an error and continues the
   node at once, because no spawned step exists to wake it. The continuation carries the error
   with that round, and the node decides what it means. The shim hands a v1 node an empty
   response, as engine v1 does.
10. **A step that has declared actions cannot declare a wait or a sub-execution.** Such a step
    fails. A spawned step can still wait or call a sub-workflow.

```mermaid
sequenceDiagram
  participant E as Engine
  participant A as Declaring step (agent)
  participant T as Spawned steps (tools)
  E->>A: run round 0 with the gathered inputs
  A-->>E: actions [search(a), search(b)] and a round payload
  E->>E: record the round, set the agent step to waiting
  E->>T: run one spawned step for each action
  T-->>E: each one settles (an error is data)
  E->>E: last action settled: wake the agent step once
  E->>A: continue with the same inputs and the continuation
  A-->>E: final outputs
  E->>E: plan the agent step's graph successors
```

## Alternatives Considered

- **One sub-execution for each action.** Rejected, mainly because tool parameters use expressions
  such as `$('Webhook').item.json.email`. Those read the steps of the current execution, and a
  sub-execution has only its own steps. Also, the sub-execution path starts stored workflows, which
  a tool node is not. An execution for each tool call costs much more than a step, and it shows in
  the executions list. A sub-execution is still right for a tool that calls a stored workflow.
- **One kind of declaration for actions and sub-executions.** Rejected. A sub-execution is an
  execution, with its own graph, admittance, retention and cancellation. A failed sub-execution
  makes the node throw, and a failed action is data. They share only the suspend and continue
  mechanics.
- **Run the whole agent loop inside one step.** Rejected. A HITL tool cannot pause one tool call,
  the step holds a worker for the whole agent run, and tool runs do not appear as steps.
- **A new step status for waits that only the engine ends.** Rejected. A step that awaits a
  sub-execution is already `waiting` (ADR-20261020-run-a-sub-workflow-as-its-own-execution), and
  one status for both keeps the status machine and its consumers as they are. The wait declaration
  already tells an engine-internal wait from a wait for something outside the execution.
- **Put the results into the declaring step's resume cause or its inputs.** Rejected. Many actions
  settle at the same time and would race on one column, a later resume overwrites the cause, and
  inputs that change for each round would change what `$json` and paired items see.
- **Add one step row or one iteration for each round.** Rejected. Expressions such as `$('Agent')`
  and `$runIndex`, and loop passes, would see each round as a run of the node. Engine v1 also keeps
  one run index for all rounds.
- **A failed action is always data.** Rejected. A tool that the user set to stop the workflow
  would not stop it, and a tool that engine v2 does not support would read as a success.
- **Fail a step whose round has no actions, or let the shim run the node again in process.**
  Rejected. Failing the step stops an agent that engine v1 lets recover. A run inside the shim
  takes the decision away from the node, and it is a round that the engine neither stores nor
  counts.

## Consequences

- The number of steps in an execution no longer follows from the graph. Every rule that counts
  graph steps, or keys a step by node and iteration, must leave spawned steps out or handle them
  apart: the completion count, fail-fast, the final status, the expression data loader, successor
  planning and the read path. Without that, an execution can end early, a failed action can fail
  the execution, and two calls of one tool overwrite each other.
- Expressions cannot read the outputs of a spawned step, as in engine v1, where a tool's output
  is not on its `main` output.
- A `waiting` step does not always wait for something outside the execution. The `step:waiting`
  event already tells the two apart. Other code that reacts to a waiting step, for example to
  close a chat stream, must read its wait declaration.
- A crash during a round repeats one LLM call. The answer can differ, and stream chunks can repeat.
- Two open approvals in one execution need step-bound resume tokens
  (ADR-20260904-a-derived-token-authorizes-a-resume-request).
- The actions of one round can run in any order. The continuation lists their outcomes in the
  order that the node declared them.
- The wake must see every settlement of the round. Two actions that settle at the same time must
  not both miss it, because nothing from outside can end the wait. The engine wakes the declaring
  step before it refreshes the live status of the execution.
- A crash can leave a round stuck in two windows: after the round commits and before its spawned
  steps are announced, and after the last action settles and before the wake. Reconciliation
  repairs both, not a wider transaction. It announces stale queued spawned steps again, and it
  wakes a waiting declaring step whose round's actions have all settled.
- An engine error before the run leaves a spawned step `running`, as it does a graph step.
  Reconciliation fails a stale running spawned step, and that failure wakes the declaring step.
- A tool that calls a stored workflow fails until a record allows its node type to call a
  sub-workflow (ADR-20261020-run-a-sub-workflow-as-its-own-execution, decision 3). The converter
  and `@n8n/workflow-engine-check` reject the tool types that engine v2 does not support.
- Cancelling an execution cancels its pending spawned steps. A spawned step that already runs
  finishes, as a graph step does, until steps can be aborted.
- The continuation grows with each round. The node's own round limit and the engine cap bound it.
- A node can move from one AI library to another without a change in the engine or the shim.

## Links

RFC: -

Documentation: https://github.com/n8n-io/n8n/pull/43694

Related ADRs: ADR-20260902-steps-declare-waits, ADR-20261020-run-a-sub-workflow-as-its-own-execution, ADR-20260904-a-derived-token-authorizes-a-resume-request, ADR-20261117-attach-sub-nodes-to-the-graph-outside-its-edges
