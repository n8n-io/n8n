# Post-build verification

How to verify, judge coverage, and claim success after `build-workflow`.
Read after a direct build when `verificationReadiness` requires action.

## Contents

- verify-built-workflow vs executions
- Publishing and testing
- After build-workflow succeeds
- Coverage and nodesNotReached
- Claiming success

## verify-built-workflow vs executions

**Publishing is never required for testing.** Both `executions(action="run")` and
`verify-built-workflow` inject `inputData` as the trigger's output — the workflow
does not need to be active. Form, webhook, chat, and other event-based triggers
are all testable while the workflow is unpublished. Never publish a workflow as a
precondition for running it.

For workflows produced by `build-workflow`, **always verify with
`verify-built-workflow`, never with raw `executions(action="run")`.** It reuses
the build outcome simulation plan, mocked credentials, and temporary pin data, so
destructive nodes are pinned and it is safe to call repeatedly. A raw
`executions(action="run")` runs the workflow live with no pin data, and on a
workflow you just verified it surfaces a redundant run-approval prompt to the
user right after verification already executed the workflow. For follow-up
requests like "verify again", call `verify-built-workflow` with `workflowId` even
if the original `workItemId` is not in context. For alternate deterministic
scenarios, pass `fixtureOverrides` keyed by simulated node name instead of trying
to force data through the trigger.

**Reserve `executions(action="run")` for runs the user explicitly asked for**
(e.g. "run it now", "execute it against my real data"). Never call it on your own
to re-test, expand coverage, or "prove the full chain" of a workflow you just
built or verified: re-run `verify-built-workflow` (with `fixtureOverrides` to
reach an unverified branch) instead, or report the partial coverage and let the
user decide whether to run it.

If `fixtureOverrides` is rejected with `invalid_fixture_override`, the target
node was not classified as simulated in the build outcome. Do not retry the same
override. If that node's data controls a branch that needs verification and you
have the source file, load `workflow-builder`, declare representative `output`
fixtures on the controlling upstream node, rebuild the same workflow, and verify
again.

For trigger `inputData` shapes, read `trigger-input-data-shapes.md`.

## After build-workflow succeeds

1. Read `workflowId`, `workItemId`, `triggerNodes`, `verificationReadiness`,
   `setupRequirement`, and `postBuildFlow` from the tool output. If the output
   is missing a `workflowId`, explain that the build did not submit.
   - Before treating a saved workflow as done, inspect the persisted workflow
     with `workflows(action="get-as-code", workflowId)` or read the bound
     workspace source file, and compare the actual graph to the user's requested
     outcome. Build/save success only means a workflow was saved; it does not
     prove the saved workflow is good.
   - If the persisted workflow is missing the requested outcome, has an obvious
     dead-end draft shape, or the verification evidence is weak, load the
     `workflow-builder` skill and patch the same workflow with `build-workflow`
     using the existing `workflowId` and `workItemId`; then inspect and verify
     again.
   - If `verificationReadiness.status === "already_verified"`, treat the
     workflow as verified and do **not** call `verify-built-workflow` again.
   - If `verificationReadiness.status === "ready"`, call
     `verify-built-workflow` with the `workflowId`, the `workItemId` when you
     have it, and the trigger-appropriate `inputData` shape.
   - If `verificationReadiness.status === "needs_setup"`, call
     `workflows(action="setup")` with the workflowId so the user can configure it
     through the inline setup card in the AI Assistant panel.
   - If `verificationReadiness.status === "not_verifiable"`, do not infer
     lower-level verification conditions; use the readiness guidance to give a
     clear warning or manual-test note. This is a warning completion state, not
     a verified state and not an infinite blocker.
2. Judge coverage, not just status. A `verify-built-workflow` result with
   `success: true` but a non-empty `nodesNotReached` is **partial** evidence:
   the execution ended early (see `lastNodeExecuted` and `coverageNote`) and
   the listed nodes — including any planned simulations — never ran.
   - Most common cause: a lookup/query node returned zero items (n8n stops
     downstream nodes on empty item lists). If the dead-end is a Data Table
     lookup, insert a matching test row with `data-tables(action="insert-rows")`,
     re-run `verify-built-workflow`, and delete the test row afterwards.
   - If you cannot seed the data source, report honestly: name which nodes
     were verified and which were not, and tell the user the unreached part
     needs a manual test. Do not start a live `executions(action="run")`
     yourself to reach those nodes; offer the user a test instead. Never claim
     end-to-end verification when `nodesNotReached` is non-empty.
   - If the unreached nodes sit behind IF/Switch logic controlled by a live or
     nondeterministic upstream node, and alternate-branch verification is part
     of this turn's goal, first try one source-file repair: add representative
     `output` fixtures to that upstream node, rebuild the same workflow, and
     re-run `verify-built-workflow` with `fixtureOverrides`. Only fall back to a
     manual-test note when you cannot safely patch the source or the repair
     budget is exhausted.
   - Relay `simulationNote` (nodes whose output was simulated) to the user
     whenever it is present.
3. After verification handling, if `setupRequirement.status === "required"` and
   setup has not already run for this build, call `workflows(action="setup")`
   with the workflowId.
4. When `workflows(action="setup")` opens the inline setup card, the card is the
   user-visible surface. Do not tell the user to open the editor, use the canvas,
   or click a Setup button; the user does not need to navigate anywhere.
5. When `workflows(action="setup")` returns `deferred: true`, respect the user's
   decision — do not retry with `credentials(action="setup")` or any other
   setup tool. The user chose to set things up later.
6. After setup completes or is applied, follow `post-build-live-test-follow-up.md`
   when the latest verification evidence used mocks or simulations. If this
   follow-up is due, ask only that question now; do not also ask about the error
   workflow in the same response.
7. For a direct new primary workflow, follow `post-build-error-workflow-follow-up.md`
   after the mocked live-test follow-up is no longer pending for this workflow.
   If no mocked live-test follow-up is due, ask about the error workflow before
   any generic testing prompt. Do not replace this explicit opt-in with a generic
   "add anything else?", publish, or test question.
8. Ask the user if they want to test the workflow (skip this if
   `verify-built-workflow` already proved it works end-to-end with full
   coverage). If you need to ask about both generic testing and an error
   workflow, ask the error-workflow opt-in first and leave generic testing as a
   later follow-up unless the user already requested testing.
9. Only call `workflows(action="publish")` when the user explicitly asks to
   publish. Never publish automatically.

## Claiming success

Do not tell the user a workflow is "fixed", "verified", "tested", "working", or
has "no errors" unless this turn has a passing `verify-built-workflow` or
`executions(action="run")` that exercised the path being claimed. A successful
`build-workflow`/save, a static `workflows(action="validate")`, or your own
narration are NOT execution evidence. For a produced artifact (a file, generated
document, or Code-node output), read the real output before calling it complete;
do not infer correctness from the fact that a node ran. If you could not run the
failing path or inspect the artifact, say so plainly — "I couldn't verify X
because Y" — and name what is unconfirmed. An honest "could not verify" beats an
unverified success claim.
