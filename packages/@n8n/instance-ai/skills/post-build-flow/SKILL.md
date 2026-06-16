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

## After build-workflow succeeds

1. Read `workflowId`, `workItemId`, `triggerNodes`, `verificationReadiness`, and
   `setupRequirement` from the tool output. If the output is missing a
   `workflowId`, explain that the build did not submit.
   - Before treating a saved workflow as done, inspect the persisted workflow
     with `workflows(action="get-json", workflowId)` and compare the actual
     graph to the user's requested outcome. Build/save success only means a
     workflow was saved; it does not prove the saved workflow is good.
   - If the persisted workflow is missing the requested outcome, has an obvious
     dead-end draft shape, or the verification evidence is weak, load the
     `workflow-builder` skill and patch the same workflow with `build-workflow`
     using the existing `workflowId` and `workItemId`; then inspect and verify
     again.
   - If `verificationReadiness.status === "already_verified"`, treat the
     workflow as verified and do **not** call `verify-built-workflow` again.
   - If `verificationReadiness.status === "ready"`, call
     `verify-built-workflow` with the `workItemId` / `workflowId` and the
     trigger-appropriate `inputData` shape.
   - If `verificationReadiness.status === "needs_setup"`, call
     `workflows(action="setup")` with the workflowId so the user can configure it
     through the inline setup card in the AI Assistant panel.
   - If `verificationReadiness.status === "not_verifiable"`, do not infer
     lower-level verification conditions; use the readiness guidance to give a
     clear warning or manual-test note. This is a warning completion state, not
     a verified state and not an infinite blocker.
2. After verification handling, if `setupRequirement.status === "required"` and
   setup has not already run for this build, call `workflows(action="setup")`
   with the workflowId.
3. When `workflows(action="setup")` opens the inline setup card, the card is the
   user-visible surface. Do not tell the user to open the editor, use the canvas,
   or click a Setup button; the user does not need to navigate anywhere.
4. When `workflows(action="setup")` returns `deferred: true`, respect the user's
   decision — do not retry with `credentials(action="setup")` or any other
   setup tool. The user chose to set things up later.
5. Ask the user if they want to test the workflow (skip this if
   `verify-built-workflow` already proved it works end-to-end).
6. Only call `workflows(action="publish")` when the user explicitly asks to
   publish. Never publish automatically.

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
