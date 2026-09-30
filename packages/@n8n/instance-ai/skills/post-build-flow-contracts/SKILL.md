---
name: post-build-flow-contracts
description: >-
  Handles the verification result, setup, testing, and publishing after
  build-workflow succeeds, or when the message contains
  workflow-verification-follow-up or workflow-setup-required. build-workflow
  already runs verification. Load after direct builds and on verify or setup
  follow-up turns.
recommended_tools:
  - ask-user
  - workflows
  - verify-built-workflow
  - executions
  - credentials
  - build-workflow
---

# Post-Build Flow

Use this skill after `build-workflow` succeeds on a direct build, and when the
current message contains `<workflow-verification-follow-up>` or
`<workflow-setup-required>`. For a one-off build
(`postBuildFlow.skillId: "one-off-operations"`), follow `one-off-operations`
instead. Write user-visible text in the user's language.

## Read the build result

- No `workflowId` means the build did not save. Say so.
- `verification` is present: `build-workflow` already ran
  `verify-built-workflow` once, without `inputData`, from the auto-detected
  trigger. Read it. Do not verify again without a reason from
  [Verify again](#verify-again).
- `verification.remediation.category`:
  - `code_fixable`: load `workflow-builder` and fix the same workflow with the
    same `workflowId` and `workItemId`. The build verifies again.
  - `needs_setup`: go to [Setup](#setup).
  - `blocked`: report the blocker. Do not work around it with a live run.
- `verification` is absent: verification did not run. Use
  `verificationReadiness.status`:
  - `needs_setup`, or `setupRequirement.status === "required"`: when the setup
    panel is enabled, call `verify-built-workflow` once first. It can verify
    simulated paths without credentials. Then go to [Setup](#setup).
  - `not_verifiable`: give a manual-test note. This is a warning, not a
    verified state and not a blocker.
  - `already_verified`: read the saved claim before you call it verified.

## Verify again

Call `verify-built-workflow` again only for one of these reasons:

- You or the user changed the workflow outside `build-workflow`, e.g. setup
  settled in `<workflow-setup-state>`. It refreshes the credential plan.
- `triggerNodes` has more than one entry. Call it once for each trigger that
  has no successful pass, with `triggerNodeName`. Coverage is the union of the
  successful passes. A failed pass removes the coverage of its trigger.
- The trigger reads input fields. Pass `inputData` in the real trigger shape.
  See `references/trigger-input-data-shapes.md`. A flat webhook payload fills
  only `body`. When an expression reads `$json.query.*`, `$json.headers.*` or
  `$json.params.*`, pass `{ body, query, headers, params }`.
- A branch did not run. Pass `fixtureOverrides` keyed by a simulated node name.
  After `invalid_fixture_override`, do not retry the same override.
- A lookup returned zero items and stopped the path. For a Data Table, insert a
  test row, verify again, then delete the row.
- `<workflow-verification-follow-up>` has obligation `ready_to_verify` or
  `verifying`. Verify at once. Do not call `workflows(action="setup")` in that
  turn. Setup comes as a separate `<workflow-setup-required>` step.

Always verify with `verify-built-workflow`. Do not verify with
`executions(action="run")` or `executions(action="run-step")`. Never disable,
delete, reorder, or copy nodes or workflows to reach a branch.

## Claim coverage honestly

- `claim.level` decides what you can say. Only `verified` lets you say
  verified, tested, or working. For `partial`, `unproven`, or `failed`, name
  what is not confirmed.
- `success: true` is not proof. A run with all writes simulated also succeeds.
- Name the nodes in `nodesNotReached` and `simulatedNodes`. Relay
  `simulationNote`, `coverageNote`, and `liveStateNote` when present.
- `resolvedParameterWarnings`: fix the input shape or the expression, then
  verify again. Never report that field as working while a warning stands.
- `skippedParameterChecks`: say that these dynamic fields are not checked.
- Simulated or pinned output is fixture data. Never quote it as real output.
  Do not state counts or written values that you did not read back.
- `claim.liveState`: `live-stale` means the fix is only in the draft. Do not
  call the workflow live. `unpublished` means it does not run in production.

## Setup

- `<workflow-setup-required>`: first call `workflows(action="setup")` with its
  `workflowId`. Do not write a message first.
- After verification, if `setupRequirement.status === "required"` or
  verification reports `needs_setup`, and setup did not run for this build,
  call `workflows(action="setup")`.
- `announced: true`: summarize the open items and validation warnings, then
  end the turn. Do not poll. The user completes setup in the panel.
- Inline setup card: the card is the user-visible surface. Do not send the
  user to the editor or the canvas.
- `deferred: true`, `skippedByUser`, or `partial: true`: respect the choice. Do
  not retry with any setup tool. Skipped credentials stay skipped for the whole
  conversation, also when `setupRequirement.reason` is `skipped-by-user`. Say
  what stays unconfigured and what fails at runtime. Offer setup for later.
  Reopen only a credential that the user asks for by name: pass its
  `reopenWith` value in `reopenSkipped`.
- `resolvedCredentialsByNode` means those nodes use existing credentials. Do
  not ask the user to connect them.
- Credential type: use a dedicated type when one exists. Otherwise use
  `httpTemplatedCustomAuth` with `credentialHints`. Load
  `credential-recipe-research` first. Never put a secret in a hint. Use plain
  generic types (`httpBasicAuth`, `oAuth2Api`) only when a template cannot
  express the auth or the user asks (`allowPlainGenericAuth: true`).
- The user asks for a new credential: pass its type in `preferNewCredentials`.
- On a later turn, trust `<workflow-setup-state>` over earlier results.
- `<workflow-test-request>` in the current input means the user clicked
  Execute. Read the saved workflow with `workflows(action="get-as-code")`. Do
  not call `workflows(action="setup")` for this check. If required items stay
  open, report them and end the turn. Otherwise call `executions(action="run")`
  with suitable trigger input. Do not ask again. On failure, use
  `executions(action="debug")` and fix the same workflow.

## Live test and cleanup

- After setup, if the latest verification used mocks, simulations, fixtures,
  or pin data, ask only whether the user wants a live test. Do not mention
  publishing or an error workflow in that reply.
- If `credentialResolutionNote` says Gateway credits are depleted, do not offer
  a live test. Tell the user to top up Gateway credits or add their own key.
- Use `executions(action="run")` only when the user asks for a run. Report its
  result separately from the verification.
- A live run can write real data. For each record from any turn, name it, offer
  to remove it (a one-off cleanup workflow is fine), and ask before you delete.
  Do not start another live run on a target that still holds test data. For a
  one-off operation, the written data is the result. Do not offer to remove it.

## Publishing

- Testing never needs publishing. Verification and runs inject trigger input.
- Publish only when the user asks. Do not offer publishing until a live run
  without mocks ran every required node. A user-run execution counts only after
  `executions(action="list")` and `executions(action="get")` confirm it.
- If the user asks earlier, warn that the live path is untested, then publish.
  When publish returns `verificationDisclosure`, relay it and offer a live
  test. Send `acknowledgeUnverified: true` only if the user still asks.
- A repair of a published workflow saves a draft. The old version stays live.
  Say that the fix is not live yet, and ask whether to publish it. Without a
  claim, compare `versionId` with `activeVersionId` from
  `workflows(action="get")`. In a retest invitation, name the version.
- After a direct new primary workflow publishes, ask once whether the user
  wants an error workflow for that named workflow. Skip this for error
  workflows, repairs, edits, supporting workflows, or when the user already
  answered. On yes, build it with `workflow-builder`, ask before you publish
  it, then set `settings.errorWorkflow` on the target workflow to the error
  workflow's `workflowId` and build the target again. Say that it applies only
  to that workflow.

## Final reply

Keep it short. Name the workflow, its ID, and what changed. State the claim
level: what ran, what was simulated or not reached, and what stays
unconfigured. End with one next step: setup, a live test, or publishing when
the rules above allow it. Do not say fixed, working, or ready without a
`verified` claim or an inspected passing execution.
