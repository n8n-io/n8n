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

## Follow-up message types

**Verification follow-up:** When the message contains
`<workflow-verification-follow-up>`, verify immediately from the payload's
`obligation` — do not acknowledge first. If the obligation is `ready_to_verify`
or `verifying`, call `verify-built-workflow`. Do **not** call
`workflows(action="setup")` in this turn and do **not** declare the workflow
finished if `outcome.setupRequirement.status === "required"` — setup is routed
automatically as a separate `<workflow-setup-required>` step after verification.

**Setup follow-up:** When the message contains `<workflow-setup-required>`, your
first action is to call `workflows(action="setup")` with the `workflowId` from
the payload. Do not verify, do not ask, do not write a message first — the inline
setup card in the AI Assistant panel is the user-visible surface. If it returns
`deferred: true`, respect the user's choice and do not retry with any other setup
tool.

## Default flow after build-workflow

1. On a **full post-build turn** (verification, setup, and user follow-ups —
   not a single-action system tag above), delegate a bounded knowledge-base read
   via `agent` with `subAgentId: "inline"` before acting. Ask it to read only the
   applicable `knowledge-base/reference/` files (see table below) and return a
   tight checklist: verification routing, setup, follow-up order, and success
   claims. Pass `verificationReadiness`, `setupRequirement`, `workflowId`,
   trigger types, mock/simulation flags, and whether this is a direct new primary
   workflow in the goal. Use the debrief — do not load full reference files
   yourself unless workspace tools are unavailable.
2. Read `workflowId`, `workItemId`, `verificationReadiness`, and
   `setupRequirement` from the build output.
3. Inspect the saved graph before treating the build as done — save success is
   not quality evidence. Patch with `workflow-builder` when the graph misses
   the requested outcome.
4. Route by `verificationReadiness.status`:
   - `already_verified` — do not re-verify
   - `ready` — call `verify-built-workflow` with trigger-appropriate `inputData`
   - `needs_setup` — call `workflows(action="setup")`
   - `not_verifiable` — warn clearly; not a verified state
5. Run setup when `setupRequirement.status === "required"` and setup has not run.
6. Follow user follow-ups in the order from the debrief or table below.

Skip step 1 for mechanical system follow-ups that need one tool call only. After
setup completes, delegate if you still need follow-up guidance (live test, error
workflow opt-in).

## Always-on rules

- For workflows from `build-workflow`, verify with `verify-built-workflow`, not
  raw `executions(action="run")`, unless the user explicitly asked for a live run.
- Publishing is never required for testing.
- Do not claim verified/fixed/working without structured verification or execution
  evidence from this turn.
- The inline setup card is the setup surface — do not send the user to the editor
  or canvas.
- Do not replace the error-workflow opt-in with a generic "add anything else?",
  publish, or test question. Only call `workflows(action="publish")` when the user
  explicitly asks.

## Knowledge base (via agent delegation)

| Reference | Read when |
| --- | --- |
| `knowledge-base/reference/trigger-input-data-shapes.md` | Passing `inputData` to verify or run |
| `knowledge-base/reference/post-build-verification.md` | Verification routing, coverage, claiming success |
| `knowledge-base/reference/post-build-live-test-follow-up.md` | After setup when verification used mocks |
| `knowledge-base/reference/post-build-error-workflow-follow-up.md` | Error workflow opt-in after direct new builds |
| `knowledge-base/reference/error-workflows.md` | Assigning `settings.errorWorkflow` |

Follow-up order for direct new primary workflows: verification/setup → live/no-mock
test opt-in (when mocks used) → error workflow opt-in → generic testing.
