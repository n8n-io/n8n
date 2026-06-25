# Instance AI Verification Handoff Cleanup

Status: Implemented

## Context

This branch fixes several related Instance AI workflow-loop issues:

- Plan approval can schedule planned tasks, then the foreground orchestrator must stop instead of continuing inline and building the same workflow.
- Workflow verification can re-run from a `workflowId` by resolving the latest build outcome.
- Verification supports deterministic fixture overrides for simulated nodes.
- Verification pin data should be available during execution but should not leave unreached simulated nodes looking executed in persisted execution data.
- The Instance AI workflow preview needs to avoid showing stale AI verification output over a human-started execution.

The behavior is now covered by evals, but the implementation is hard to follow because small state-machine concepts are spread across streaming, orchestration context, workflow-loop state, execution adapter logic, and Vue component state.

## Problem

The branch currently has four main sources of complexity:

1. **Run handoff state is threaded manually.**
   A mutable `{ reason?: ... }` object is created in `InstanceAiService`, passed through suspended state and orphan rebuilds, exposed through `OrchestrationContext.requestRunTermination`, checked by the stream runner, then checked again by terminal response handling.

2. **The verification tool handler is doing too much.**
   `verify-built-workflow` resolves build outcomes, validates fixture overrides, builds pin data, runs the workflow, computes coverage, classifies remediation, persists state, emits telemetry, and formats the tool response in one long path.

3. **Execution adapter pin-data handling is inline and stateful.**
   Workflow pin data, verification pin data, trigger input pin data, telemetry mock-source metadata, execution data setup, and post-run pruning are built in the middle of `executionService.run()`.

4. **The Instance AI preview component owns execution lifecycle details.**
   `InstanceAiWorkflowPreview.vue` now tracks latest AI executions, superseded executions, push events, and stale-result protection directly inside the component.

## Goals

- Preserve existing behavior and passing evals.
- Make the plan-approval handoff a named concept instead of an ad hoc termination flag.
- Make stream stopping semantics explicit: stop after publishing the tool result that requested handoff.
- Keep verification behavior deterministic and safe:
  - optional `workItemId` resolves from latest submitted build outcome for `workflowId`;
  - fixture overrides only target nodes already classified as simulated;
  - destructive/user-action nodes are pinned during verification;
  - unreached simulated nodes are reported as partial coverage;
  - unreached verification-only pin data is pruned from persisted execution data.
- Move pure decision logic into small, directly tested helpers.
- Keep UI execution preview state separate from the Vue component's rendering concerns.

## Non-Goals

- Do not redesign the workflow-loop scheduler.
- Do not change eval expectations beyond wording-only cleanup.
- Do not alter external tool schemas unless the cleanup materially improves clarity.
- Do not reintroduce `resultData.simulation`; persisted execution pin data remains the source for preview labels.
- Do not publish workflows automatically or change setup routing behavior.

## Proposed Design

### 1. Add an Orchestrator Run Control Helper

Introduce a small helper that owns foreground/resume handoff state.

Suggested file:

`packages/@n8n/instance-ai/src/runtime/orchestrator-run-control.ts`

Suggested shape:

```ts
export type OrchestratorRunHandoffReason = 'planned-tasks-scheduled';

export interface OrchestratorRunControlState {
	handoffReason?: OrchestratorRunHandoffReason;
}

export interface OrchestratorRunControl {
	readonly state: OrchestratorRunControlState;
	requestHandoff(reason: OrchestratorRunHandoffReason): void;
	getStopReason(): OrchestratorRunHandoffReason | undefined;
	shouldEmitTerminalOutcome(): boolean;
}
```

Integration:

- `InstanceAiService` creates `runControl = createOrchestratorRunControl(orchestrationContext)`.
- The helper attaches the orchestration-context callback as `requestRunHandoff`.
- Rename related types from `OrchestrationRunTermination*` to
  `OrchestratorRunHandoff*`.
- Suspended state stores only `runControl.state`.
- Resume and orphan rebuild recreate a control helper from the stored state.
- Terminal-response suppression checks `runControl.shouldEmitTerminalOutcome()` or a stop reason returned by the stream result.

This keeps mutable handoff state in one helper and prevents service code from directly mutating or interpreting raw `{ reason?: ... }` objects.

### 2. Make Stream Stop Semantics Explicit

Replace the generic boolean `shouldTerminate` naming with "stop after current chunk" semantics.

Suggested stream context:

```ts
stopSignal?: () => { reason: string } | undefined;
```

Suggested result addition:

```ts
stopReason?: OrchestratorRunHandoffReason;
```

Behavior:

- The stream consumes and publishes the current chunk first.
- Then it checks `stopSignal`.
- If a reason is present, it flushes redacted buffered output and returns `status: 'completed'` with `stopReason`.
- The caller uses `stopReason` to suppress terminal fallback text.

`OrchestratorRunControl` owns requesting the stop; the stream result reports
that it actually stopped and why. This removes the double interpretation where
both the stream and `InstanceAiService` independently read the same mutable
state.

### 3. Split Verification Into Focused Helpers

Keep the public `verify-built-workflow` tool schema stable, but move internal steps into focused helpers.

Suggested files:

- `packages/@n8n/instance-ai/src/tools/orchestration/verification/resolve-target.ts`
- `packages/@n8n/instance-ai/src/tools/orchestration/verification/prepare-run.ts`
- `packages/@n8n/instance-ai/src/tools/orchestration/verification/finalize-result.ts`

Suggested responsibilities:

| Helper | Responsibility |
| --- | --- |
| `resolveVerificationTarget()` | Validate context, resolve `workItemId` from input or latest build outcome for `workflowId`, load loop state, apply terminal-remediation short-circuit. |
| `prepareVerificationRun()` | Validate fixture overrides, merge build outcome fixtures, return `verificationPinData` and simulated node metadata. |
| `analyzeVerificationResult()` | Compute reached names, simulated nodes reached, nodes not reached, success status, coverage note, and simulation note. |
| `persistVerificationOutcome()` | Best-effort update of build outcome, terminal verdict, and remediation telemetry. |

The tool handler should read as:

```ts
const target = await resolveVerificationTarget(input, context);
if (target.kind === 'blocked') return target.result;

const prepared = prepareVerificationRun(target.buildOutcome, target.input.fixtureOverrides);
if (prepared.kind === 'blocked') return prepared.result;

const run = await context.domainContext.executionService.run(...);
const analyzed = analyzeVerificationResult(target, prepared, run);
await persistVerificationOutcome(target, analyzed);

return formatVerificationToolResult(target, prepared, analyzed);
```

This turns the current long handler into a readable workflow and makes unit tests less brittle.

### 4. Extract Instance AI Run Pin-Data Planning

Move pin-data merging and cleanup planning out of `InstanceAiAdapterService.run()`.

Suggested file:

`packages/cli/src/modules/instance-ai/instance-ai-run-pin-data.ts`

This should live in the CLI adapter package. `@n8n/instance-ai` decides which
nodes should be simulated and returns SDK-shaped verification fixtures; the CLI
adapter owns conversion to runtime `IPinData`, trigger execution setup, persisted
execution cleanup, and `ExecutionPersistence` access.

Suggested shape:

```ts
export interface InstanceAiRunPinDataPlan {
	runPinData?: IPinData;
	nonVerificationPinData: IPinData;
	verificationPinData: IPinData;
	mockDataSources: WorkflowExecutionMockDataSource[];
	triggerItems?: INodeExecutionData[];
}

export function buildInstanceAiRunPinDataPlan(args: {
	workflowPinData: IPinData;
	verificationPinData?: Record<string, unknown[]>;
	inputData?: Record<string, unknown>;
	triggerNode?: INode;
}): InstanceAiRunPinDataPlan;
```

Adapter usage:

- Build the plan once before `workflowRunner.run()`.
- Use the plan to populate `runData.pinData`, `runData.executionData`, `runData.startNodes`, and telemetry metadata.
- Pass the same plan to `pruneUnreachedVerificationPinData()`.

Cleanup behavior:

- Preserve workflow-level pin data.
- Preserve trigger-input pin data.
- Remove verification-only pin data for nodes that did not execute.
- Keep verification pin data for nodes that actually executed, because it represents the data used by the run.

### 5. Move Preview Execution State Into a Composable

Move the Instance AI preview execution lifecycle logic out of the component.

Suggested file:

`packages/frontend/editor-ui/src/features/ai/instanceAi/composables/useInstanceAiWorkflowPreviewExecution.ts`

Suggested responsibilities:

- Track latest fetched AI execution.
- Track AI execution IDs superseded by human-started runs.
- Listen for `executionStarted` and decide whether to reset active execution state.
- Fetch and apply `executionResult` only when it still belongs to the displayed workflow and is not stale.
- Expose `restoreExecutionResult()` for `WorkflowCanvasHost` reloads.

`InstanceAiWorkflowPreview.vue` should mostly wire props, provide editor capability, render `WorkflowCanvasHost`, and call the composable.

### 6. Keep Skill Guidance Minimal

The skill markdown changes should stay focused on behavior that models must follow:

- after `create-tasks`, stop visible narration and wait for follow-up;
- build-workflow follow-up stops after save;
- verification follow-up verifies from obligation payload;
- partial coverage must not be called fully verified.

Avoid turning skill files into implementation documentation. Implementation details belong in code/specs/tests.

## Implementation TODO

- [x] Add `orchestrator-run-control.ts` with direct unit tests.
- [x] Replace raw `OrchestrationRunTerminationState` plumbing with run-control state.
- [x] Rename context callback from `requestRunTermination` to `requestRunHandoff`; do not keep a compatibility alias unless TypeScript reveals a real external boundary.
- [x] Rename related termination types to handoff language.
- [x] Change stream stop callback/result naming to "stop after current chunk" semantics.
- [x] Update initial, resumed, and orphan-rebuilt stream paths to use the helper.
- [x] Extract verification target resolution, run preparation, result analysis, and persistence helpers.
- [x] Move fixture override validation into `prepareVerificationRun()`.
- [x] Extract Instance AI run pin-data planning and pruning helpers from `InstanceAiAdapterService`.
- [x] Add focused unit tests for pin-data planning and unreached verification pin pruning.
- [x] Move Instance AI preview execution lifecycle logic into a composable.
- [x] Keep the new eval fixtures unchanged unless the refactor exposes overly brittle wording.

## Verification Plan

Run the existing targeted unit tests that cover the touched paths:

- `packages/@n8n/instance-ai/src/runtime/__tests__/resumable-stream-executor.test.ts`
- `packages/@n8n/instance-ai/src/tools/orchestration/__tests__/verify-built-workflow.tool.test.ts`
- `packages/@n8n/instance-ai/src/tools/orchestration/__tests__/plan.tool.test.ts`
- `packages/@n8n/instance-ai/src/workflow-loop/__tests__/workflow-task-service.test.ts`
- `packages/cli/src/modules/instance-ai/__tests__/instance-ai.adapter.service.test.ts`
- `packages/frontend/editor-ui/src/features/ai/instanceAi/__tests__/InstanceAiWorkflowPreview.test.ts`
- `packages/frontend/editor-ui/src/features/ai/instanceAi/__tests__/canvasPreview.utils.test.ts`

Run the evals that describe the bug class:

- `workflow-verification-loop-repro`
- `weather-slack-branch-verification`
- `plan-approval-handoff-verification`

Before committing, run package-level typecheck/lint for touched packages.

## Acceptance Criteria

- Plan approval creates a structured plan card and does not build before approval.
- After plan approval, the foreground orchestrator stops after publishing the approved `create-tasks` tool result.
- The planned build follow-up builds exactly once.
- The verification follow-up verifies exactly once unless explicitly re-run by user or repair logic.
- Partial coverage is reported as partial coverage, not full verification.
- Verification fixture overrides cannot target non-simulated nodes.
- Persisted execution data does not show unreached verification-only pin data.
- Human-started executions in the Instance AI preview are not overwritten by stale AI verification results.
- The branch passes the three regression evals listed above.

## Open Questions

- [x] The stream result should expose `stopReason?: OrchestratorRunHandoffReason`. `OrchestratorRunControl` requests the stop, and the stream result is the authoritative evidence that the stream actually stopped early.
- [x] Rename `requestRunTermination` to `requestRunHandoff` now. The current name is internal plumbing and is misleading; avoid a compatibility alias unless implementation reveals a real integration boundary.
- [x] Pin-data planning should live in the CLI adapter package. `@n8n/instance-ai` remains responsible for deciding what to simulate; CLI remains responsible for translating that into runtime execution state and pruning persisted execution pin data.
