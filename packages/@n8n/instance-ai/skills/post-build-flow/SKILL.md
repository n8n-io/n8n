---
name: post-build-flow
description: >-
  Handles workflow verification and setup after build-workflow succeeds, or when
  the message contains workflow-verification-follow-up or workflow-setup-required.
  Load after direct builds, when verificationReadiness requires action, or on
  orchestrator verify/setup follow-up turns.
recommended_tools:
  - ask-user
  - verify-built-workflow
  - workflows
  - build-workflow
  - executions
---

# Post-Build Flow

Use this skill after `build-workflow` succeeds on a direct orchestrator build,
especially when the build result contains `postBuildFlow.required: true`, or when
the current message contains `<workflow-verification-follow-up>` or
`<workflow-setup-required>`.

For trigger `inputData` shapes, read
`knowledge-base/reference/trigger-input-data-shapes.md` in the sandbox workspace
when available, or load this skill's `references/trigger-input-data-shapes.md`
linked file.

## Verification follow-up

When the current message contains `<workflow-verification-follow-up>`, verify
immediately from the payload's `obligation` — do not acknowledge first. If the
obligation is `ready_to_verify` or `verifying`, call `verify-built-workflow`. Do
**not** call `workflows(action="setup")` in this turn and do **not** declare the
workflow finished if `outcome.setupRequirement.status === "required"` — setup is
routed automatically as a separate `<workflow-setup-required>` step after
verification.

## Setup follow-up

When the current message contains `<workflow-setup-required>`, your first action
is to call `workflows(action="setup")` with the `workflowId` from the payload. Do
not verify, do not ask, do not write a message first — the inline setup card in
the AI Assistant panel is the user-visible surface. If it returns `deferred:
true`, respect the user's choice and do not retry with any other setup tool.
After setup completes or is applied, follow
[Mocked verification live-test follow-up](#mocked-verification-live-test-follow-up)
if the payload or prior verification evidence says mocked credentials,
simulated node output, fixture overrides, temporary pin data, or another mocked
input was used.

## Publishing and testing

**Publishing is never required for testing.** Both `executions(action="run")` and
`verify-built-workflow` inject `inputData` as the trigger's output — the
workflow does not need to be active. Form, webhook, chat, and other event-based
triggers are all testable while the workflow is unpublished. Never publish a
workflow as a precondition for running it.

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
6. After setup completes or is applied, follow
   [Mocked verification live-test follow-up](#mocked-verification-live-test-follow-up)
   when the latest verification evidence used mocks or simulations. If this
   follow-up is due, ask only that question now; do not also ask about the error
   workflow in the same response.
7. For a direct new primary workflow, follow
   [Error workflow follow-up](#error-workflow-follow-up) after the mocked
   live-test follow-up is no longer pending for this workflow. If no mocked
   live-test follow-up is due, ask about the error workflow before any generic
   testing prompt. Do not replace this explicit opt-in with a generic "add
   anything else?", publish, or test question.
8. Ask the user if they want to test the workflow (skip this if
   `verify-built-workflow` already proved it works end-to-end with full
   coverage). If you need to ask about both generic testing and an error
   workflow, ask the error-workflow opt-in first and leave generic testing as a
   later follow-up unless the user already requested testing.
9. Only call `workflows(action="publish")` when the user explicitly asks to
   publish. Never publish automatically.

## Error workflow follow-up

This follow-up comes after the mocked verification live-test follow-up when that
follow-up is due, and before generic "want to test it?" prompts. For a direct
new primary workflow, ask about the error workflow after the user answers,
declines, or defers any pending live/no-mock testing question. If no mocked
live-test follow-up is due, ask about the error workflow first.

If you just built an Error Trigger workflow because the user opted into adding
one for a known target workflow, do not ask whether to build another error
workflow. Continue the publish-before-assign flow for the target workflow:
ask whether to publish the error workflow and set it on that target workflow,
then publish and assign only after the user approves.

After saving and handling verification/setup for a direct new primary workflow,
ask once whether the user wants to build an error workflow for that workflow.
Use `ask-user` with a yes/no choice or a concise visible question. Do **not**
create an error workflow before the user opts in.

The opt-in must explicitly mention an error workflow and the target workflow
name. A generic follow-up like "Want me to add anything else?", "Want me to
publish it?", or "Want to test it?" does not satisfy this step.

Skip this follow-up when:

- The workflow you just built is itself an error workflow or starts with an
  Error Trigger.
- The build is a supporting workflow, repair, small edit, planned-task
  subtask, or workflow-level settings patch.
- The user already asked for an error workflow in the original request, already
  declined one, or the target workflow already has the desired error workflow
  set.

If the user says yes:

1. Load `workflow-builder` and build a separate error workflow using the user's
   requested notification destination. Keep the error workflow scoped to the
   target workflow the user opted in for.
2. Do not ask whether this new error workflow needs its own error workflow.
3. The error workflow must be published before it can be assigned. If the user
   has not already asked you to publish and attach it, ask whether to publish it
   and set it as the error workflow for the named target workflow. When the user
   agrees, call `workflows(action="publish")` for the error workflow and let the
   HITL approval card handle confirmation.
4. After publish succeeds, set the original workflow's workflow-level
   `settings.errorWorkflow` to the **error workflow's workflowId**. Do not use
   the published `activeVersionId`, workflow name, a placeholder, or a local SDK
   id. If you have the original source file, edit it; otherwise call
   `workflows(action="get-as-code", workflowId)` for the original workflow,
   write the returned code to a `.workflow.ts` file, add
   `.settings({ errorWorkflow: '<published-error-workflow-id>' })`, and call
   `build-workflow` for the original workflow. The workflow edit approval card
   is the HITL surface for this assignment.
5. Summarize the result with explicit per-workflow language: this error
   workflow was assigned only to the named target workflow. Mention that n8n has
   no global or instance-wide error workflow setting only when the user
   explicitly asked about, requested, or referenced global/instance-wide error
   workflow behavior.

## Mocked verification live-test follow-up

After workflow setup completes or is applied, if the latest verification for
that workflow used mocked credentials, simulated node output, fixture overrides,
temporary pin data, or another mocked input, ask whether the user wants a live
test without mocks. Do not run the live test automatically.

This follow-up has priority over the error-workflow opt-in for a direct new
primary workflow. If both follow-ups are due, ask about the live/no-mock test
first and ask the error-workflow question only after the user has answered,
declined, or deferred the live/no-mock test follow-up.

If the user agrees, use the explicit live execution path (`executions(action="run")`
for a direct live run) and report the result separately from the earlier mocked
verification. If the user declines or defers, state what remains untested and do
not claim live end-to-end verification.

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

## Credentials before build

Call `credentials(action="list")` first to know what's available. Build the
workflow immediately — the builder preserves explicit valid credentials and
auto-mocks missing or unselected ones. Do not ask whether to build now and set up
credentials later; building first and routing setup after verification is the
default path. Workflow verification is automatic from the build outcome; the
orchestrator handles workflow setup after verification when the saved workflow
still has mocked credentials or placeholders.

**Trust the build outcome over your own source file.** When `build-workflow`
returns `resolvedCredentialsByNode` (or `setupRequirement.status ===
"not_required"`), the saved workflow is already connected to existing
credentials — even if your source used an unresolved `newCredential()` call.
Do not ask the user to connect those credentials, do not offer the setup card
for them, and do not describe them as missing; at most mention which existing
credential is being used. Route credential setup only when the build outcome
reports mocked credentials or `setupRequirement.status === "required"`.

**Ask once when a service has multiple credentials of the same type.** If
`credentials(action="list")` shows more than one entry of the type a requested
integration needs (e.g. two `openAiApi` accounts, three Google Calendar
accounts), use `ask-user` with a single-select to let the user pick one before
building, and use the chosen credential name in the workflow code. Exception: the
user already named the credential in their message — use it directly. With a
single candidate, auto-apply and do not ask.

**Ask which auth type to use when a service supports more than one.**
`credentials(action="setup")` opens a picker locked to a single `credentialType`
— the user cannot switch auth types from there. So when
`credentials(action="search-types")` returns more than one auth option for a
service (e.g. `notionApi` and `notionOAuth2Api`, or `slackApi` and
`slackOAuth2Api`), use `ask-user` with a single-select to let the user pick the
auth type before calling `credentials(action="setup")`. List OAuth2 first and
present it as the recommended option. Exception: the user has clearly indicated
an auth type (e.g. "api key", "oauth", "personal token") — map it to the matching
`credentialType` and use it directly without asking.
