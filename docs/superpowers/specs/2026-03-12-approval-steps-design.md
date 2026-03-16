# Approval Steps — End-to-End Design

## Summary

Make approval steps work end-to-end: transpiler marks them correctly, engine
pauses execution at approval nodes, events are emitted to the UI via SSE, and
the frontend shows approve/decline buttons with token-based authorization.

## Current State

**What exists and works:**
- Database: `StepStatus.WaitingApproval`, `StepType.Approval`, `approvalToken` column
- Event bus: `StepWaitingApprovalEvent` type defined, status-to-event mapping exists
- API: `POST /approve` endpoint with atomic CAS update
- Broadcaster: Forwards all events via SSE to connected clients
- Frontend: Approval buttons in StepCard and WorkspaceView, purple node color on canvas, `approveStep()` in execution store

**What's broken:**
- Transpiler sets `type: 'step'` even when `stepType === 'approval'`
- Step processor has no approval-specific handling — approval steps execute and complete like regular steps
- `step:waiting_approval` event is never emitted
- `/approve` endpoint replaces step output instead of merging with approval decision
- No approval token generation or validation
- Integration tests manually set step status via raw SQL to work around the gaps

## Design

### 1. Transpiler — Set node type

**File:** `transpiler.service.ts` (~line 1685)

Change node type assignment from:
```typescript
type: step.isBatch ? 'batch' : 'step',
```
To:
```typescript
type: step.isBatch ? 'batch' : (step.stepType === 'approval' ? 'approval' : 'step'),
```

The transpiler already copies `stepType` to `config.stepType`. This change makes the node `type` field match, so the step processor can dispatch on it — same pattern as sleep and batch nodes.

### 2. Step Processor — Approval node handling

**File:** `step-processor.service.ts`, insert between sleep handler (line 151) and batch handler (line 153)

When `node.type === 'approval'`:

1. Emit `step:started`
2. Load and execute the step function (returns approval context data)
3. Generate a UUID approval token via `crypto.randomUUID()`
4. Update step execution: `status = waiting_approval`, `output = functionResult`, `approvalToken = token`
5. Emit `step:waiting_approval` with `approvalToken` in the event payload
6. Return (execution paused — waits for human decision)

Unlike sleep nodes (no function), approval steps run their function body to produce context data (e.g., `{ message: "Approve expense: $5000?" }`). Unlike regular steps, they pause after execution instead of completing.

### 3. Approve Endpoint — Token validation and output merging

**File:** `step-execution.controller.ts`

Two changes:

**Token validation:** Request body changes from `{ approved: boolean }` to `{ approved: boolean, token: string }`. The WHERE clause adds token check:
```sql
WHERE id = :id AND status = 'waiting_approval' AND approvalToken = :token
```
Missing or wrong token results in 400 or 409 respectively.

**Output merging:** Before updating, load the step's current output (the approval context from the step function) and merge with the approval decision:
```typescript
const mergedOutput = { ...existingOutput, approved };
```
This preserves the step function's return value while adding the `approved` field. The example workflow accesses both `approval.message` and `approval.approved`.

### 4. Event Delivery — No changes needed

The Broadcaster subscribes to all events via `eventBus.onAny()` and forwards any event with `executionId` to SSE clients. The `step:waiting_approval` event carries `executionId`, so it's automatically delivered.

The execution store's SSE handler already refreshes steps on any `step:*` event, which triggers UI re-render with the approval buttons.

### 5. Frontend — Token storage and auto-selection

**Execution store (`execution.store.ts`):**
- Add a `Map<string, string>` to store `stepExecutionId -> approvalToken` from SSE events
- When a `step:waiting_approval` event arrives via SSE, store the token
- Update `approveStep(stepId, approved, token)` to include the token in the request

**WorkspaceView (`WorkspaceView.vue`):**
- On `step:waiting_approval` SSE event, auto-set `selectedStepId` to the approval step so the detail panel opens with buttons visible
- Pass the stored token when calling `handleApproveStep()`

**StepCard (`StepCard.vue`):**
- Accept token prop and pass it through the `approve` emit

### 6. Integration Tests — Engine-driven flow

**File:** `test/integration/approval.test.ts`

Remove the manual SQL workaround in `createApprovalScenario()`. Instead:
- Use `stepType: 'approval'` in workflow code
- Wait for `step:waiting_approval` event (which now fires from the engine)
- Extract the approval token from the event
- Use the token in `/approve` requests

Updated test cases:
- **Engine pauses at approval step:** Verify step has `status = waiting_approval` and output contains the step function's return value
- **Token validation:** Verify wrong/missing token is rejected
- **Approve resumes execution:** Verify merged output and successor step execution
- **Decline branches correctly:** Verify `approved: false` triggers the correct branch
- **Existing tests** (idempotency, cancellation, validation) remain with minor updates

## Files Changed

| Layer | File | Change |
|-------|------|--------|
| Transpiler | `transpiler.service.ts` | Set `type: 'approval'` when `stepType === 'approval'` |
| Step Processor | `step-processor.service.ts` | Add `node.type === 'approval'` handler with token generation |
| API | `step-execution.controller.ts` | Token validation + output merging |
| Frontend Store | `execution.store.ts` | Store tokens from SSE, pass in approve calls |
| Frontend View | `WorkspaceView.vue` | Auto-select approval step, pass token |
| Frontend Card | `StepCard.vue` | Accept and forward token prop |
| Tests | `approval.test.ts` | Remove SQL workaround, test real engine flow |

## Not in scope

- Transpiler splitting into prepare + approval nodes (Notion design — can layer on later)
- Variable capture / scope analysis across approval boundaries
- Role-based authorization (who can approve) — deferred to n8n auth integration
- Approval timeout / auto-reject mechanism
- External approval via email/link (token enables this later)
- Removal of old sleep error-based flow (`SleepRequestedError`)
