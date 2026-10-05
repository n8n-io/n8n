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

Linked files have more rules. Load one with `load_skill` and `filePath` only
when its condition applies. Load it in the same step as your next tool call:

- `references/verify-again.md`: before a second `verify-built-workflow` call.
  Its reasons: `triggerNodes` has more than one entry (verify each with
  `triggerNodeName`), the trigger reads input fields
  (`references/trigger-input-data-shapes.md`), a branch did not run, a lookup
  returned zero items, the workflow changed outside `build-workflow`, or
  `<workflow-verification-follow-up>`.
- `references/setup.md`: when you call `workflows(action="setup")`, when a
  setup result or `<workflow-setup-state>` comes back, or on
  `<workflow-test-request>`.
- `references/live-test-and-publishing.md`: before you offer or start a live
  test (with more than one trigger, run each with `triggerNodeName`), and when
  the user asks to publish.

## Read the build result

- No `workflowId` means the build did not save. Say so.
- `verification` is present: `build-workflow` already ran
  `verify-built-workflow` once, without `inputData`, from the auto-detected
  trigger. Read it. Do not verify again without a reason from
  `references/verify-again.md`.
- `verification.remediation.category`:
  - `code_fixable`: load `workflow-builder` and fix the same workflow with the
    same `workflowId` and `workItemId`. The build verifies again.
  - `needs_setup`: go to setup.
  - `blocked`: report the blocker. Do not work around it with a live run.
- `verification` is absent: verification did not run. Use
  `verificationReadiness.status`:
  - `needs_setup`, or `setupRequirement.status === "required"`: when the setup
    panel is enabled, call `verify-built-workflow` once first. It can verify
    simulated paths without credentials. Then go to setup.
  - `not_verifiable`: give a manual-test note. This is a warning, not a
    verified state and not a blocker.
  - `already_verified`: read the saved claim before you call it verified.

Always verify with `verify-built-workflow`. Do not verify with
`executions(action="run")` or `executions(action="run-step")`. Never edit,
disable, delete, reorder, or copy nodes or workflows to reach a branch or to
make a run pass.

## Claim coverage honestly

- `claim.level` decides what you can say. Only `verified` lets you say
  verified, tested, or working. For `partial`, `unproven`, or `failed`, name
  what is not confirmed.
- `success: true` is not proof. A run with all writes simulated also succeeds.
- Name the nodes in `nodesNotReached` and `simulatedNodes`. Relay
  `simulationNote`, `coverageNote`, `liveStateNote`, `declaredShapeNote`, and
  `liveReadNote` when present.
- `resolvedParameterWarnings`: fix the input shape or the expression, then
  verify again. Never report that field as working while a warning stands.
- `skippedParameterChecks`: say that these dynamic fields are not checked.
- `shapeWarnings`: an output does not match its declared `schema`. Fix the
  schema or the reads that it names, then build again.
- Verification reads a GET step with a `schema` live, once: one request, the
  first page of `pages`. Later runs of the step, e.g. loop passes, reuse that
  response; a loop that waits for new data ends at `maxIterations`. A `sample`
  keeps it pinned, so give a GET that changes data a `sample`.
- `liveReadNote`: the live read failed and its declared fixture stood in. This
  is not a workflow error. Do not edit the workflow for it.
- `resolvedValues` shows the source field of each mapped field. A
  `synthesized`, `declared`, `pattern key`, or `mock` value proves only the
  wiring; an `observed` value is the real response. Check that the source
  field and its hint fit the target field.
- Simulated or pinned output is fixture data. Never quote it as real output.
  Do not state counts or written values that you did not read back.
- A node that ran is not proof. Read the output of the node that the fix
  changes. If that output does not show the fix, say plainly that the fix is
  not confirmed.
- `claim.liveState`: `live-stale` means the fix is only in the draft. Do not
  call the workflow live. `unpublished` means it does not run in production.

## Setup and publishing

- Setup: `<workflow-setup-required>`, or `setupRequirement.status ===
  "required"` or `needs_setup` after verification when setup did not run for
  this build: call `workflows(action="setup")` with the `workflowId` first. Do
  not write a message first. `resolvedCredentialsByNode` nodes need no setup.
- Publish only when the user asks. Testing never needs publishing. Do not offer
  publishing before a live run without mocks ran every required node. Relay
  `verificationDisclosure` when publish returns it.

## Final reply

Write only these lines, in this order:

1. What you built or changed and its save state, in one line: the workflow
   name, its ID, and unpublished, draft only, or published.
2. One line for each part that is not confirmed. Name the simulated, not
   reached, or unconfigured nodes, and put the notes and warnings from the
   rules above in this line. Say what makes it real: a credential, setup, or
   a live test. Parts with the same fix share one line.
3. One next action: setup, a live test, or publishing when the rules above
   allow it.

Do not list the nodes, the parameters, or the request again unless the user
asks. Do not say fixed, working, or ready without a `verified` claim or an
inspected passing execution.
