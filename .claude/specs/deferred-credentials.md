# Deferred Credentials for Instance AI Builder

## Goal

Replace the credential-first builder gate with a deferred flow that minimizes
user friction. The user only faces a credential prompt after the workflow is
already built and structurally verified — and only for the credentials that
were actually missing.

## Current Flow (before this change)

```
list-credentials (silent)
  → setup-credentials (BLOCKS: 3-button picker — Use Selected / Skip / Deny)
  → build-workflow-with-agent
  → verify (run-workflow)
  → done
```

The blocking credential picker fires before the user sees anything built.
Mock pin data is injected into `json.pinData` and persisted in the saved
workflow.

## Proposed Flow (minimum friction)

```
list-credentials (silent — builds credentialMap from available credentials)
  → build-workflow-with-agent (auto-resolves available, auto-mocks missing)
  → verify-built-workflow (runs with sidecar pin data, never persisted)
  → IF mocked credentials exist:
      setup-credentials in finalize mode (first user interaction)
      → apply-workflow-credentials (atomic mutation)
  → done
```

**Three cases by friction level:**

| Case | User interaction before build | After verification |
|------|---|----|
| All credentials available | None (auto-resolved) | None — done |
| Some missing, user finalizes | None | Finalize picker: "Apply credentials" / "Later" |
| Some missing, user defers | None | User clicks "Later" — workflow saved without credentials, no mock pin data |

The user never sees a credential prompt unless credentials are actually
missing AND the workflow has been successfully verified. This is maximum
deferral.

## Architecture Changes

### 1. System prompt update

**File:** `packages/@n8n/instance-ai/src/agent/system-prompt.ts`

Replace the current credential rule:

```
Current: "If any required credentials are missing, you MUST call
setup-credentials before building"

New: "Build the workflow immediately. The builder auto-resolves available
credentials and auto-mocks missing ones. After verification succeeds with
mocked credentials, call setup-credentials with credentialFlow.stage='finalize'
to let the user add real credentials."
```

Remove the instruction to call `setup-credentials` before building. The
orchestrator still calls `list-credentials` early (to populate the
credentialMap for the builder), but does not gate building on credential setup.

### 2. Verification data isolation (`resolveCredentials` refactor)

**File:** `packages/@n8n/instance-ai/src/tools/workflows/submit-workflow.tool.ts`

**Current behavior:** Tier 3 (mock) injects pin data directly into
`json.pinData[nodeName]` and deletes the credential key from the node. The
mock pin data is saved with the workflow.

**New behavior:** Tier 3 produces sidecar data instead of mutating `json`:

```typescript
interface CredentialResolutionResult {
  /** Node names whose credentials were mocked. */
  mockedNodeNames: string[];
  /** Deduplicated credential types that were mocked. */
  mockedCredentialTypes: string[];
  /** Map of node name → credential types that were mocked on that node. */
  mockedCredentialsByNode: Record<string, string[]>;
  /** Pin data for verification only — NEVER written to workflow JSON. */
  verificationPinData: Record<string, Array<Record<string, unknown>>>;
}
```

Changes in Tier 3 resolution:
- Still `delete creds[key]` (remove unresolved credential from node).
- Instead of `json.pinData[nodeName] = [{ _mockedCredential: key }]`, populate
  `verificationPinData[nodeName]` and `mockedCredentialsByNode[nodeName]`.
- **Never mutate `json.pinData`** for mocked credentials.
- Preserve any existing real user/SDK pin data in `json.pinData` untouched.

Extract `resolveCredentials` into a shared module
(`packages/@n8n/instance-ai/src/tools/workflows/resolve-credentials.ts`) so
both `submit-workflow.tool.ts` and `build-workflow.tool.ts` use the same
function.

### 3. `WorkflowBuildOutcome` schema extension

**File:** `packages/@n8n/instance-ai/src/workflow-loop/workflow-loop-state.ts`

Add two new fields to `workflowBuildOutcomeSchema`:

```typescript
/** Map of node name → credential types that were mocked on that node. */
mockedCredentialsByNode: z.record(z.array(z.string())).optional(),
/** Verification-only pin data — scoped to this build, never persisted to workflow. */
verificationPinData: z.record(z.array(z.record(z.unknown()))).optional(),
```

These fields flow through the existing `WorkItemRecord.lastBuildOutcome`
storage path in `workflow-loop-storage.ts` — no storage changes needed.

### 4. `done` action guidance update

**File:** `packages/@n8n/instance-ai/src/tools/orchestration/report-verification-verdict.tool.ts`

Update `actionToGuidance` for the `done` action:

```typescript
case 'done': {
  if (action.mockedCredentialTypes?.length) {
    const types = action.mockedCredentialTypes.join(', ');
    return (
      `Workflow verified successfully with temporary mock data. ` +
      `Call \`setup-credentials\` with types [${types}] and pass ` +
      `credentialFlow stage "finalize" to let the user add real credentials. ` +
      `Include the workItemId so apply-workflow-credentials can find the ` +
      `mocked node mapping.`
    );
  }
  return `Workflow verified successfully. Report completion to the user.` +
    (action.workflowId ? ` Workflow ID: ${action.workflowId}` : '');
}
```

This makes finalization deterministic — the orchestrator doesn't infer
whether to prompt, it's told by the controller.

### 5. New tool: `verify-built-workflow`

**File:** `packages/@n8n/instance-ai/src/tools/orchestration/verify-built-workflow.tool.ts`

Purpose: Run a built workflow using verification-only pin data without
persisting that data to the workflow.

```typescript
inputSchema: z.object({
  workItemId: z.string(),
  workflowId: z.string(),
})

outputSchema: z.object({
  executionId: z.string().optional(),
  success: z.boolean(),
  error: z.string().optional(),
})
```

Implementation:
1. Load `lastBuildOutcome` from workflow loop storage by `workItemId`.
2. Extract `verificationPinData` from the build outcome.
3. Merge verification pin data with any existing real pin data on the
   workflow (verification data takes precedence for mocked nodes only).
4. Execute the workflow with merged pin data via `workflowService.execute()`,
   passing pin data as an execution parameter (not saved to workflow JSON).
5. Return execution result.

The orchestrator calls this instead of `run-workflow` when the build outcome
has mocked credentials. The system prompt guidance for the `verify` action
should be updated to instruct: "If the build has mockedCredentialTypes, use
`verify-built-workflow`. Otherwise use `run-workflow`."

Update the `verify` action guidance in `report-verification-verdict.tool.ts`:

```typescript
case 'verify':
  return (
    `VERIFY: Run workflow ${action.workflowId}. ` +
    `If the build had mocked credentials, use \`verify-built-workflow\` ` +
    `with the workItemId. Otherwise use \`run-workflow\`. ` +
    `If it fails, use \`debug-execution\` to diagnose. ` +
    `Then call \`report-verification-verdict\` with your findings.`
  );
```

### 6. `setup-credentials` finalize mode

**File:** `packages/@n8n/instance-ai/src/tools/credentials/setup-credentials.tool.ts`

Add optional `credentialFlow` to the tool's **input schema**:

```typescript
credentialFlow: z.object({
  stage: z.enum(['generic', 'finalize']),
}).optional()
```

- `generic` (default): Current behavior — called when user manually requests
  credential setup or before building in the old flow.
- `finalize`: Called after verification with mocked credentials. Same
  suspend/resume mechanics, but the suspend payload includes
  `credentialFlow: { stage: 'finalize' }` so the frontend renders different
  copy and buttons.

Changes to the suspend payload:

```typescript
// Add to suspendSchema:
credentialFlow: z.object({
  stage: z.enum(['generic', 'finalize']),
}).optional()
```

Changes to the resume handling:
- In finalize mode, if `resumeData.approved === false` (user clicked "Later"),
  return `{ success: false, reason: 'User deferred credential setup.' }`
  (no mock option — finalize mode doesn't offer mocking).
- In finalize mode, `resumeData.mockCredentials` is ignored (should not be
  sent by frontend).

The `credentialFlow` field is passed through to the
`confirmationRequestPayload` via the existing `suspend` → SSE event flow.
The `confirmationRequestPayloadSchema` in `instance-ai.schema.ts` needs a
new optional field.

### 7. Shared API/type additions

**File:** `packages/@n8n/api-types/src/schemas/instance-ai.schema.ts`

Add `credentialFlow` to the confirmation request payload so the frontend can
render the right UI:

```typescript
// Add to confirmationRequestPayloadSchema:
credentialFlow: z.object({
  stage: z.enum(['generic', 'finalize']),
}).optional()
```

Add to `InstanceAiToolCallState.confirmation`:

```typescript
credentialFlow?: { stage: 'generic' | 'finalize' };
```

The `InstanceAiConfirmResponse` type does not need a new `credentialAction`
field — the existing `approved` + `credentials` semantics are sufficient:
- Finalize "Apply credentials": `approved: true, credentials: { type: id }`
- Finalize "Later": `approved: false` (no `mockCredentials`)

### 8. New tool: `apply-workflow-credentials`

**File:** `packages/@n8n/instance-ai/src/tools/workflows/apply-workflow-credentials.tool.ts`

Purpose: Atomically apply real credentials to nodes that were previously
mocked, in a single workflow update.

```typescript
inputSchema: z.object({
  workItemId: z.string().describe('Work item that tracked the mocked build'),
  workflowId: z.string(),
  credentials: z.record(z.string()).describe('Map of credentialType → credentialId'),
})

outputSchema: z.object({
  success: z.boolean(),
  appliedNodes: z.array(z.string()).optional(),
  error: z.string().optional(),
})
```

Implementation:
1. Load `lastBuildOutcome.mockedCredentialsByNode` from workflow loop storage.
2. Load the workflow via `workflowService.get(workflowId)`.
3. For each node in `mockedCredentialsByNode`:
   - For each mocked credential type on that node:
     - Look up the selected credential ID from `input.credentials[type]`.
     - Resolve credential `{ id, name }` via `credentialService.get(id)`.
     - Set `node.credentials[type] = { id, name }`.
   - Skip nodes where the credential type is NOT in `mockedCredentialsByNode`
     (never overwrite existing real credentials).
4. Save the workflow once via `workflowService.update()`.
5. Clear `mockedCredentialsByNode` and `verificationPinData` from the stored
   build outcome (cleanup).
6. Return `{ success: true, appliedNodes: [...nodeNames] }`.

Error handling:
- If a credential ID from `input.credentials` no longer exists (deleted
  between selection and application), return an error. The orchestrator can
  re-prompt via `setup-credentials` in finalize mode.

### 9. Frontend: `InstanceAiCredentialSetup.vue` stage-aware rendering

**File:** `packages/frontend/editor-ui/src/features/ai/instanceAi/components/InstanceAiCredentialSetup.vue`

Read `credentialFlow` from the confirmation data (passed via props or from
the tool call's confirmation state).

**Generic stage (current behavior):**
- Header: "Select or create credentials: {types}"
- Buttons: "Deny" | "Skip for now" | "Use Selected"
- All three actions available.

**Finalize stage:**
- Header: i18n key `instanceAi.credential.finalize.header`
  ("Your workflow is verified. Add credentials to make it production-ready.")
- Credential picker rows: same `CredentialPicker` component, same behavior.
- Buttons: "Later" (secondary) | "Apply credentials" (primary, enabled when
  all selected).
- No "Deny" button. No "Skip for now" / mock option.
- "Later" sends `confirmAction(requestId, false)`.
- "Apply credentials" sends `confirmAction(requestId, true, undefined, credentials)`.
- Submitted state shows:
  - Success: check icon + "Credentials applied"
  - Later: arrow icon + "Deferred — add credentials later"

Add new i18n keys to `@n8n/i18n`:
- `instanceAi.credential.finalize.header`
- `instanceAi.credential.finalize.applyCredentials`
- `instanceAi.credential.finalize.later`
- `instanceAi.credential.finalize.applied`
- `instanceAi.credential.finalize.deferred`

### 10. Frontend reducer: pass `credentialFlow` through

**File:** `packages/frontend/editor-ui/src/features/ai/instanceAi/instanceAi.reducer.ts`

In the `confirmation-request` event handler, pass `credentialFlow` from the
event payload into the tool call's `confirmation` state:

```typescript
tc.confirmation = {
  requestId,
  severity,
  message,
  credentialRequests,
  projectId,
  inputType,
  domainAccess,
  credentialFlow,  // NEW
};
```

### 11. Builder outcome propagation

**File:** `packages/@n8n/instance-ai/src/tools/orchestration/build-workflow-agent.tool.ts`

The `WorkflowBuildOutcome` constructed from the builder's submit result
already includes `mockedNodeNames` and `mockedCredentialTypes`. Extend it
to also include the new fields:

```typescript
const outcome: WorkflowBuildOutcome = {
  // ...existing fields...
  mockedCredentialsByNode: submitResult.mockedCredentialsByNode,
  verificationPinData: submitResult.verificationPinData,
};
```

This requires `submit-workflow` to return these fields, which it will after
the `resolveCredentials` refactor (change 2).

### 12. Editor state sync after `apply-workflow-credentials`

When `apply-workflow-credentials` completes for the currently open workflow,
the frontend needs to update its local workflow state. This happens through
the existing event flow:

1. `apply-workflow-credentials` calls `workflowService.update()`.
2. The workflow service emits a `workflow-updated` event.
3. The editor's workflow store already listens for this event and refreshes.

If this existing path is insufficient (e.g., the event doesn't fire for
backend-initiated updates), add an explicit `workflowUpdated` SSE event from
the `apply-workflow-credentials` tool after the update completes. The frontend
handler calls `workflowsStore.fetchWorkflow(workflowId)`.

## Data Flow Diagram

```
User: "Build a workflow that sends Gmail messages to Slack"

Orchestrator
  │
  ├─ list-credentials()
  │    → { gmailOAuth2: {id: "c1", name: "My Gmail"}, slackApi: undefined }
  │    → credentialMap: { gmailOAuth2 → c1 }
  │    → (slackApi missing — no prompt, proceed to build)
  │
  ├─ build-workflow-with-agent(task, credentialMap)
  │    │
  │    └─ Builder sub-agent
  │         └─ submit-workflow(code)
  │              └─ resolveCredentials(json, credentialMap)
  │                   ├─ Gmail node: Tier 1 → resolved from map (c1)
  │                   └─ Slack node: Tier 3 → mocked
  │                        delete creds.slackApi
  │                        verificationPinData.SlackNode = [{ _mockedCredential: "slackApi" }]
  │                        mockedCredentialsByNode.SlackNode = ["slackApi"]
  │              └─ Save workflow (NO mock pin data in JSON)
  │              └─ Return { workflowId, mockedCredentialTypes: ["slackApi"],
  │                          verificationPinData: {...}, mockedCredentialsByNode: {...} }
  │
  ├─ WorkflowBuildOutcome stored in lastBuildOutcome
  │
  ├─ verify-built-workflow(workItemId, workflowId)
  │    → loads verificationPinData from lastBuildOutcome
  │    → executes workflow with sidecar pin data
  │    → returns executionId
  │
  ├─ report-verification-verdict(verified)
  │    → done action with mockedCredentialTypes: ["slackApi"]
  │    → guidance: "Call setup-credentials in finalize mode for slackApi"
  │
  ├─ setup-credentials([slackApi], credentialFlow: { stage: "finalize" })
  │    → suspend with finalize UI
  │    → [User sees: "Your workflow is verified. Add Slack credentials."]
  │    → [Buttons: "Apply credentials" | "Later"]
  │    → User selects credential → resume with { approved: true, credentials: { slackApi: "c2" } }
  │    → returns { success: true, credentials: { slackApi: "c2" } }
  │
  ├─ apply-workflow-credentials(workItemId, workflowId, { slackApi: "c2" })
  │    → loads mockedCredentialsByNode from lastBuildOutcome
  │    → sets SlackNode.credentials.slackApi = { id: "c2", name: "Work Slack" }
  │    → saves workflow once
  │    → clears verification context
  │    → returns { success: true, appliedNodes: ["SlackNode"] }
  │
  └─ "Your workflow is ready! Gmail → Slack with real credentials."
```

## Backward Compatibility

- `setup-credentials` in generic mode (no `credentialFlow` or
  `credentialFlow.stage === 'generic'`) behaves exactly as today. Existing
  manual credential setup calls are unaffected.
- The `InstanceAiConfirmResponse` type is unchanged — `approved` +
  `credentials` + `mockCredentials` semantics are preserved.
- `WorkflowBuildOutcome` additions (`mockedCredentialsByNode`,
  `verificationPinData`) are optional fields — existing stored outcomes
  continue to work.
- `resolveCredentials` callers that don't use the new return fields
  continue to work (the function still deletes unresolved credential keys
  from nodes, which is the essential side effect).
- Frontend renders generic mode by default when `credentialFlow` is
  absent — existing confirmation events render as before.

## Test Plan

### Tool/unit tests

1. **`resolveCredentials` refactor:**
   - Available credentials resolve from map (Tier 1) — no verification pin
     data generated.
   - Missing credentials produce `verificationPinData` entry and
     `mockedCredentialsByNode` entry but do NOT mutate `json.pinData`.
   - Existing real pin data in `json.pinData` is preserved untouched.
   - Mixed scenario: some resolved, some mocked — correct fields for each.

2. **`verify-built-workflow`:**
   - Loads verification pin data from stored build outcome.
   - Merges verification pin data with existing real pin data (verification
     wins for mocked nodes only).
   - Never mutates stored workflow JSON.
   - Returns execution result.

3. **`apply-workflow-credentials`:**
   - Applies selected credentials only to nodes in `mockedCredentialsByNode`.
   - Preserves existing real credentials on non-mocked nodes.
   - Single workflow update call (not per-node).
   - Clears verification context after apply.
   - Returns error if credential ID no longer exists.

4. **`setup-credentials` finalize mode:**
   - Finalize suspend payload includes `credentialFlow: { stage: 'finalize' }`.
   - Resume with `approved: false` returns deferred reason (not mock).
   - Resume with `approved: true` returns credentials normally.
   - `mockCredentials: true` is ignored in finalize mode.

5. **`report-verification-verdict` guidance:**
   - `done` action with `mockedCredentialTypes` returns finalize guidance.
   - `done` action without `mockedCredentialTypes` returns standard completion.
   - `verify` action mentions `verify-built-workflow` for mocked builds.

### Workflow loop tests

1. Build outcome with mocked credentials carries `verificationPinData` and
   `mockedCredentialsByNode` through `WorkflowBuildOutcome`.
2. `done` action preserves `mockedCredentialTypes` from state.
3. Rebuild/patch cycles overwrite previous verification context with latest
   build outcome.
4. State transition: `done` with mocked credentials does NOT change phase
   behavior — phase still transitions to `done`. The finalize prompt is
   orchestrator-side, not controller-side.

### Frontend tests

1. `InstanceAiCredentialSetup` renders generic mode (3 buttons) when
   `credentialFlow` is absent.
2. `InstanceAiCredentialSetup` renders finalize mode (2 buttons: "Apply
   credentials" / "Later") when `credentialFlow.stage === 'finalize'`.
3. Finalize "Apply credentials" sends `confirmAction(requestId, true, ..., credentials)`.
4. Finalize "Later" sends `confirmAction(requestId, false)`.
5. Submitted state shows correct icon/text for finalize mode.

### End-to-end scenarios

1. **All credentials available:** Build → verify → done. No credential
   prompt at any point.
2. **Missing credentials, user finalizes:** Build (auto-mock) → verify →
   finalize picker → apply → done. Saved workflow has real credentials, no
   mock pin data.
3. **Missing credentials, user defers:** Build (auto-mock) → verify →
   finalize picker → "Later" → done. Saved workflow has no credentials for
   mocked nodes, no mock pin data. Completion message states it was
   validated with mock data.
4. **Modification flow with newly missing credentials:** Same as scenario 2
   but with `source: 'modify'`.
5. **Manual credential setup still works:** User says "set up my Slack
   credentials" → `setup-credentials` in generic mode → picker UI → done.
   Unchanged from current behavior.

## Out of Scope

- Multiple credentials of the same type within one builder flow (same as
  current limitation).
- Automatic live re-run after credentials are applied (orchestrator can
  offer, but doesn't auto-trigger).
- Org-level policy to force credential setup before building (can be added
  later via the `credentialFlow` field).
- Changes to the `build-workflow` direct tool (low-level, rarely called
  directly — only `build-workflow-with-agent` is updated).

## Implementation TODO

- [x] `workflow-loop-state.ts` — Add `mockedCredentialsByNode` and `verificationPinData` to `WorkflowBuildOutcome`
- [x] `instance-ai.schema.ts` — Add `credentialFlow` to confirmation request payload and `InstanceAiToolCallState`
- [x] `resolve-credentials.ts` — NEW: extracted shared `resolveCredentials` with sidecar verification data
- [x] `submit-workflow.tool.ts` — Use new `resolveCredentials`, propagate new fields in output and attempt
- [x] `build-workflow.tool.ts` — Import from new `resolve-credentials` module
- [x] `build-workflow-agent.tool.ts` — Propagate `mockedCredentialsByNode` and `verificationPinData` to outcome
- [x] `setup-credentials.tool.ts` — Add `credentialFlow` to input/suspend schema, handle finalize resume
- [x] `report-verification-verdict.tool.ts` — Update `done` and `verify` guidance for mocked credentials
- [x] `instance-ai.service.ts` — Update service-level `done` and `verify` guidance
- [x] `verify-built-workflow.tool.ts` — NEW: runs workflow with sidecar verification pin data
- [x] `apply-workflow-credentials.tool.ts` — NEW: atomic credential application to mocked nodes
- [x] `system-prompt.ts` — Update credential rules (deferred flow)
- [x] `tools/index.ts` — Register new tools
- [x] `types.ts` — Add `getWorkItemBuildOutcome` and `updateWorkItemBuildOutcome` to `OrchestrationContext`
- [x] `instance-ai.adapter.service.ts` — Support `pinData` override in execution service `run`
- [x] `agent-run-reducer.ts` — Pass `credentialFlow` through to confirmation state
- [x] `InstanceAiCredentialSetup.vue` — Stage-aware rendering (generic vs finalize)
- [x] `InstanceAiToolCall.vue` — Pass `credentialFlow` prop to credential setup component
- [x] `en.json` — New i18n keys for finalize stage
- [x] `api-types/index.ts` — Export `InstanceAiCredentialFlow` and `credentialFlowSchema`
- [x] Update existing `resolve-credentials.test.ts` — Verify sidecar behavior

## File Change Summary

| File | Change |
|------|--------|
| `packages/@n8n/instance-ai/src/agent/system-prompt.ts` | Remove "must call setup-credentials before building" rule, add deferred credential guidance |
| `packages/@n8n/instance-ai/src/tools/workflows/submit-workflow.tool.ts` | Refactor `resolveCredentials` to return sidecar `verificationPinData` instead of mutating `json.pinData` |
| `packages/@n8n/instance-ai/src/tools/workflows/resolve-credentials.ts` | **NEW** — extracted shared `resolveCredentials` function |
| `packages/@n8n/instance-ai/src/workflow-loop/workflow-loop-state.ts` | Add `mockedCredentialsByNode` and `verificationPinData` to `WorkflowBuildOutcome` |
| `packages/@n8n/instance-ai/src/tools/orchestration/report-verification-verdict.tool.ts` | Update `done` and `verify` guidance for mocked credentials |
| `packages/@n8n/instance-ai/src/tools/orchestration/verify-built-workflow.tool.ts` | **NEW** — runs workflow with sidecar verification pin data |
| `packages/@n8n/instance-ai/src/tools/workflows/apply-workflow-credentials.tool.ts` | **NEW** — atomic credential application to mocked nodes |
| `packages/@n8n/instance-ai/src/tools/credentials/setup-credentials.tool.ts` | Add optional `credentialFlow` to input/suspend schema, handle finalize resume |
| `packages/@n8n/instance-ai/src/tools/orchestration/build-workflow-agent.tool.ts` | Propagate `mockedCredentialsByNode` and `verificationPinData` to build outcome |
| `packages/@n8n/api-types/src/schemas/instance-ai.schema.ts` | Add `credentialFlow` to confirmation request payload and `InstanceAiToolCallState` |
| `packages/frontend/editor-ui/src/features/ai/instanceAi/components/InstanceAiCredentialSetup.vue` | Stage-aware rendering (generic vs finalize) |
| `packages/frontend/editor-ui/src/features/ai/instanceAi/instanceAi.reducer.ts` | Pass `credentialFlow` through to confirmation state |
| `packages/@n8n/i18n` | New i18n keys for finalize stage copy |
