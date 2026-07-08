# Verification Playbook

Use the current turn's higher-priority instructions to decide who verifies:

- Direct builds and existing-workflow edits: after `build-workflow` succeeds,
  follow the inlined `postBuildFlow.instructions` when
  `postBuildFlow.required: true` is present in the tool output. Those
  instructions own verification, setup routing, error-workflow opt-in, and
  final user-visible completion for direct builds.
- Checkpoint follow-ups: verify with `verify-built-workflow` or `executions` and
  report once with `complete-checkpoint`.
- Planned build follow-ups that explicitly say to stop after save: stop after a
  successful `build-workflow`. The checkpoint task owns verification.

Build/save success is not workflow-quality evidence. When this turn is
responsible for verification or repair, inspect the persisted workflow
(`workflows(action="get-as-code", workflowId)` or the bound workspace source
file) before reporting a verdict, judging the saved graph against the user's
requested outcome — not a hidden service-specific checklist. If it is a
draft, misses the outcome, or the evidence is weak, edit the same source file,
rebuild with the same `filePath`, then inspect and verify again.

Never tell the user a workflow is fixed, verified, tested, or working from a
build/save or static `validate` alone — only from a `verify-built-workflow`
or `executions` run that exercised the claimed path; otherwise say explicitly
what you could not verify and why. Never dismiss a live execution error as a
harness or stale-state artifact without re-running.

When this turn is responsible for verification, do not stop after a successful
save. The job is done when one of these is true:

- The workflow is verified by structured tool evidence.
- Setup is required and `workflows(action="setup")` has been routed or deferred.
- A remediation guard says `shouldEdit: false`.
- You are blocked after one repair attempt per unique failure signature.

Prefer `verify-built-workflow` for workflows saved by `build-workflow`; it can
be called again with `workflowId` if the original `workItemId` is no longer in
context. For alternate deterministic scenarios, pass `fixtureOverrides` for
nodes already classified as simulated. Load `executions` via `load_tools` before
`executions(action="run")` or `executions(action="debug")` — use raw
`executions(action="run")` only for ad hoc non-build verification or when the
user explicitly wants a live run.
If live connectivity also matters for a branch-controlled workflow, verify the
fixture-backed branch coverage first and run a separate live smoke check, or
state exactly which branch remains unverified.

Trigger `inputData` shapes: follow the per-trigger guidance on the
`verify-built-workflow` tool's `inputData` field (flat field map for Form —
never `formFields`; body payload for Webhook — expressions read
`$json.body.<field>`; `{ "chatInput": ... }` for Chat; omit for Schedule;
trigger-shaped payloads for other event triggers).

If verification returns remediation with `shouldEdit: false`, stop editing and
follow its guidance. If verification fails with `shouldEdit: true`, make one
batched source-file repair, call `build-workflow` again with the same
`filePath`, and retry within the repair budget. If a failure repeats, stop and
explain the blocker.

Do not publish the main workflow automatically. Publishing is the user's
decision after testing.
