---
name: post-build-flow
description: >-
  Handles workflow verification and setup after build-workflow succeeds, or when
  the message contains workflow-verification-follow-up or workflow-setup-required.
  Load after direct builds, when verificationReadiness requires action, or on
  orchestrator verify/setup follow-up turns.
recommended_tools:
  - verify-built-workflow
  - workflows
  - build-workflow
  - executions
---

# Post-Build Flow

Use this skill after `build-workflow` succeeds on a direct orchestrator build, or
when the current message contains `<workflow-verification-follow-up>` or
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

When the current message contains `<workflow-setup-required>`, your only action is
to call `workflows(action="setup")` with the `workflowId` from the payload. Do
not verify, do not ask, do not write a message first — the inline setup card in
the AI Assistant panel is the user-visible surface. If it returns `deferred:
true`, respect the user's choice and do not retry with any other setup tool.

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

1. Read `workflowId`, `workItemId`, `triggerNodes`, `verificationReadiness`, and
   `setupRequirement` from the tool output. If the output is missing a
   `workflowId`, explain that the build did not submit.
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
6. Ask the user if they want to test the workflow (skip this if
   `verify-built-workflow` already proved it works end-to-end with full
   coverage).
7. Only call `workflows(action="publish")` when the user explicitly asks to
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

## Credentials before build

Call `credentials(action="list")` first to know what's available. Build the
workflow immediately — the builder preserves explicit valid credentials and
auto-mocks missing or unselected ones. Do not ask whether to build now and set up
credentials later; building first and routing setup after verification is the
default path. Workflow verification is automatic from the build outcome; the
orchestrator handles workflow setup after verification when the saved workflow
still has mocked credentials or placeholders.

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
