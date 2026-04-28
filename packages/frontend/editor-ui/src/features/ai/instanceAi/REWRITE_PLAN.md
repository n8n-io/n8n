# Instance AI Workflow Setup — Frontend Rewrite Plan

## Context

Full rewrite of the Instance AI "Workflow Setup" frontend under
`packages/frontend/editor-ui/src/features/ai/instanceAi/`. The existing
implementation is a 1,225-line monolithic component backed by five composables
(~1,240 LOC) and a utils file (~117 LOC), with ~3,050 LOC of unit tests plus
two Playwright e2e specs.

The rewrite happens on a feature branch; each numbered PR below merges into
that branch. `master` is unaffected until the whole feature branch is merged.

## Files being replaced

Under `packages/frontend/editor-ui/src/features/ai/instanceAi/`:

- `components/InstanceAiWorkflowSetup.vue` (1,225 LOC — main)
- `instanceAiWorkflowSetup.utils.ts` (117 LOC)
- `composables/useSetupCards.ts` (434 LOC)
- `composables/useSetupActions.ts` (353 LOC)
- `composables/useCredentialGroupSelection.ts` (186 LOC)
- `composables/useSetupCardParameters.ts` (146 LOC)
- `composables/useCredentialTesting.ts` (122 LOC)
- `__tests__/InstanceAiWorkflowSetup.test.ts`
- `__tests__/instanceAiWorkflowSetup.utils.test.ts`
- `__tests__/composableIntegration.test.ts`
- `__tests__/useSetupCards.test.ts`
- `__tests__/useCredentialTesting.test.ts`
- `__tests__/useCredentialGroupSelection.test.ts`

Under `packages/testing/playwright/`:

- `tests/e2e/instance-ai/instance-ai-workflow-setup.spec.ts` (48 LOC)
- `tests/e2e/instance-ai/instance-ai-workflow-setup-actions.spec.ts` (240 LOC)
- `pages/InstanceAiPage.ts` — remove the "Workflow Setup" section (~75 LOC of
  `getWorkflowSetup*` methods); the rest of the file is shared and stays.

**Not touched:**

- `packages/@n8n/api-types/src/schemas/instance-ai.schema.ts` — wire-format
  types (`InstanceAiWorkflowSetupNode`, `InstanceAiCredentialFlow`) stay as-is.
- `instanceAi.store.ts` — not consumed for setup data (`setupRequests` flow
  through props, not through store state).
- `packages/testing/playwright/tests/e2e/instance-ai/fixtures.ts` — shared
  across all instance-ai specs.
- `components/ConfirmationFooter.vue` — shared by six other instance-ai
  components (`InstanceAiCredentialSetup`, `DomainAccessApproval`,
  `GatewayResourceDecision`, `InstanceAiQuestions`,
  `InstanceAiConfirmationPanel`, `PlanReviewPanel`). Reuse in the rewrite.

**Only external consumer of the component:** `InstanceAiConfirmationPanel.vue`
in the same feature directory. No imports from outside
`features/ai/instanceAi/`. No feature flag gating.

## Explicitly out of scope

- **Credential testing** — no background test, no status icons, no gating on
  test results.
- **Trigger testing** — no "Test trigger" button, no listening callout, no
  trigger test result handling.

## PR breakdown

### PR 1 — Delete legacy FE

Remove the existing component, composables, utils, their unit tests, the two
Playwright specs for this flow, and the workflow-setup page-object methods in
`InstanceAiPage.ts`. Leave a minimal placeholder component so
`InstanceAiConfirmationPanel.vue` still renders. The feature branch is
intentionally non-functional after this PR.

### PR 2 — Credentials-only setup

- New directory structure with a pure model layer (card derivation +
  credential grouping — no parameter or group-display logic yet)
- Wizard navigation: prev/next, step counter, auto-advance on card completion
- Single-card rendering with credential select and create
- Credential store listeners:
  - `createNewCredential` → auto-select for the active target
  - `deleteCredential` → clear the selection
- Apply flow + terminal states: `applying`, `applied`, `partially applied`,
  `deferred`
- Error banner with retry
- "Later" button (defers setup)
- No-renderable-cards auto-apply fallback (when
  `setupRequests.length > 0 && cards.length === 0`)
- Unit tests

**Working after this PR:** workflows whose setup is purely credential
selection on single-node cards.

### PR 3 — Parameters

- `ParameterInputList` integration, parameter value tracking, completion
  detection
- `onMounted` workflow + node-type prefetch that runs
  `NodeHelpers.getNodeParameters` to apply hidden parameter defaults, then
  hydrates `workflowDocumentStore`. **This is load-bearing**: without default
  resolution, `displayOptions`-gated credentials fail and load-options
  requests surface as "Credentials not found."
- Expression context provider for the current card
- Unit tests

**Working after this PR:** any single-node workflow — credentials + params
end-to-end.

### PR 4 — Grouping

- Grouped display (parent + subnode sections)
- Per-section `ExpressionContextProvider`
- Group-level completion logic
- Unit tests

**Working after this PR:** AI-agent-style grouped workflows — full parity
with the current wizard minus the dropped testing features.

### PR 5 — Confirm mode

- `allPreResolved` condensed summary UI with "Review details" toggle that
  opens the full wizard
- Unit tests

**Working after this PR:** complete feature, with the nicer UX shortcut for
pre-resolved cases.

### PR 6 — Rebuild Playwright e2e

Rebuild the two specs deleted in PR 1 plus the `getWorkflowSetup*` methods in
`InstanceAiPage.ts`. Optional in the sense that the feature can ship without
it, but recommended since CI had e2e coverage before the rewrite.

## Test strategy

- Unit tests added per PR for new model / composables / components.
- The existing ~3,050 LOC of unit tests is deleted in PR 1 — accepted
  coverage gap while the rewrite is in progress.
- E2E coverage rebuilt in PR 6.
