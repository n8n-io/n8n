# Build Lifecycle

The canonical workflow-building lifecycle is: save the workflow, verify/test it
with the data available, patch and re-verify fixable errors until verified or
blocked by the repair guard, then route setup after verification when real
credentials or setup values are still needed.

## Save

- Save with `workflows(action="create"|"update")`. Validation success proves the
  graph can be saved; it does not prove the workflow works.
- Only set `temporary: true` on `workflows(action="create")` for scratch or
  intermediate drafts that should be archived automatically. Omit it for final
  user-visible workflows, including approved helper workflows.
- If `workflows(action="create"|"update")` returns validation errors, patch and
  retry in the same turn. Do not narrate transient validation failures that you
  can repair.
- After a create succeeds, refine the same workflow with
  `workflows(action="update")` using the returned `workflowId` (or `patches`).
  Never re-create to add or fix nodes — re-creating leaves a duplicate the
  checkpoint will not verify.

## Verification Routing

The `verificationReadiness` / `setupRequirement` statuses below are internal
routing signals. Never put them, or their enum values, in visible text — when a
status needs explaining, translate it into a plain sentence about the user's
goal (e.g. "This trigger can't be auto-tested, so run it once after setup," not
"verificationReadiness: not_verifiable").

Use the saved build outcome as the routing source:

- If `outcome.verificationReadiness.status === "already_verified"`, treat the
  workflow as verified and do not call `verify-built-workflow` again.
- If `outcome.verificationReadiness.status === "ready"`, verify with
  `verify-built-workflow` using `outcome.workItemId`, `outcome.workflowId`, and
  trigger-appropriate `inputData`. If `verify-built-workflow` is not available
  in this host, use `executions(action="run", requireApproval=false)` when the
  workflow has real credentials and a testable trigger; otherwise explain the
  blocker.
- If `outcome.verificationReadiness.status === "needs_setup"`, verification
  could not run with the available mocks or pin data. Call
  `workflows(action="setup")` so the user can configure the workflow through the
  inline setup card in the AI Assistant panel. If setup returns
  `deferred: true`, verification has not run; complete the checkpoint as failed
  with a setup-required summary instead of claiming execution succeeded.
- If `outcome.verificationReadiness.status === "not_verifiable"`, use its
  guidance to decide whether to explain the blocker or ask the user to test
  manually.

`verify-built-workflow` and `executions(action="run")` work without publishing.
Internal verification is not a substitute for an explicit user request to run or
execute the workflow. If the original request asked to run/execute after
building, finish lifecycle verification first, then call
`executions(action="run", requireApproval=true)` for the saved workflow so normal
run approval applies. Set `requireApproval=false` only for internal lifecycle
verification runs.

## Per-Trigger inputData Shape

The pin-data adapter spreads or wraps based on trigger type. Passing the wrong
shape creates null downstream values that look like expression bugs:

- Form Trigger (`n8n-nodes-base.formTrigger`): pass a flat field map, for
  example `{name: "Alice", email: "a@b.c"}`. Do not wrap in `formFields`.
- Webhook (`n8n-nodes-base.webhook`): pass the body payload, for example
  `{event: "signup", userId: "..."}`. The adapter wraps it under `body`.
- Chat Trigger (`@n8n/n8n-nodes-langchain.chatTrigger`): pass
  `{chatInput: "user message"}`.
- Manual Trigger (`n8n-nodes-base.manualTrigger`): pass a flat field map or
  omit `inputData`.
- Schedule Trigger (`n8n-nodes-base.scheduleTrigger`): omit `inputData`; the
  adapter emits synthetic timestamp fields.

Do not patch a workflow first when verification returns null downstream values.
Re-run verification with the corrected `inputData` shape. Patch only if the
expression is wrong against the production trigger output shape.

## Patch And Setup

- If verification exposes a workflow bug that can be patched narrowly, call
  `workflows(action="update")`, then verify again. Do not narrate fixable
  verification failures while you are repairing them.
- If `verify-built-workflow` returns `remediation.shouldEdit === true`, make one
  batched workflow-code repair, save it, then verify again. Respect
  `remainingSubmitFixes`, `attemptCount`, repeated failure signatures, and any
  terminal remediation from the tool; do not keep editing after the guard says to
  stop.
- If verification returns `remediation.shouldEdit === false`, do not edit. Follow
  the remediation guidance: setup for `needs_setup`, or report the blocker for
  `blocked`.
- If the verified workflow still has mocked credentials or placeholders, call
  `workflows(action="setup")`.
- When `workflows(action="setup")` opens the inline setup card, that card is the
  user-visible surface. Do not tell the user to open the editor, use the canvas,
  or click a Setup button.
- If setup returns `deferred: true`, respect the user's decision and do not
  retry with `credentials(action="setup")` or other setup tools. If verification
  already passed, complete the checkpoint as succeeded with an outcome such as
  `{ workflowId, verifiedWithMocks: true, setupDeferred: true, needsSetup: true }`.
  If setup was required before verification could run, do not mark verification
  as succeeded.

## Publish

Publish only when the user explicitly asks. Publishing is not required for
`verify-built-workflow` or `executions(action="run")`.
