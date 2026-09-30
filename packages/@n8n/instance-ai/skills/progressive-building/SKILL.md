---
name: progressive-building
dependencies:
  tools:
    - build-workflow
    - verify-built-workflow
    - workflows
    - executions
description: >-
  Load before build-workflow and before scoping or planning new workflows and
  feature additions, including requests spanning multiple workflows. Implement
  one increment per user message. Finish setup and inspect a successful real
  execution before offering another increment. Then wait for the next user
  reply. Partial setup is incomplete. A first setup or test refusal pauses
  building. Follow the skill's full-build exceptions. Also supports workflow edits
  and repairs. For workflows that create or write Data Tables, load
  data-table-manager first. Requests only to
  run, inspect, or manage existing resources use their normal tools and skills.
---

# Progressive building

Apply this policy when creating or extending workflows and repairing those
builds. It overrides conflicting scoping and setup narration in the building
and post-build guidance above. Keep their validation, approval, credential,
publish, and cleanup rules. Write to the user in their conversation language.

Requests to run, inspect, or manage existing resources use their normal tools
and skills without this staging process. This also applies when the user
switches to such a request after building in the same conversation.

## Choose the first version

Acknowledge the full request before selecting the smallest useful outcome.
Build a working part of the requested workflow. Do not create a throwaway demo.
Use one trigger and at most two credentialed services in the first version.
Each later increment adds at most one new trigger and at most two new
credentialed services. This also applies when new triggers share existing logic
or need no credentials. Count the trigger's credential. Count services even
when their credentials are connected.
Parameters and placeholders do not count. An AI provider counts toward the same
two-service total as the trigger and other services, even if its credential is
missing. Exclude a model only when Gateway credits is confirmed available for
that model on this instance. If it needs a provider API key, count it.

Keep this limit internal. Explain what the first version does and what comes
next. Preserve the user's services. Prefer existing credentials when choosing
between equally suitable starting points. Follow workflow-builder guidance
on credential setup preferences when the user leaves the service open.

Ask a single-choice question if several named services are equally central.
Otherwise state a reasonable starting assumption. Do not offer a multi-select
list that adds services or triggers to the first version.

The `planning` skill and `create-tasks` tool are unavailable in this mode.
Keep additional workflows as later roadmap items.

## Build, set up, and run

1. Build the selected version. Use the existing verification and setup flow.
2. Before its setup card, explain the full goal, what this version does, and
   the remaining outcomes. Do this on automatic `<workflow-setup-required>`
   turns too. Then open setup. Do not add more work while setup is incomplete.
3. Create missing prerequisites, such as sheet tabs or headers, through the
   existing one-off flow when the connected credentials permit it.
4. After setup, offer only a live run for manual or schedule triggers. The execution
   approval card supplies consent. For event triggers, explain how to start
   listening for a test event and perform the event, then ask the user to report
   back. Inspect the resulting execution with `executions`.
5. Extend only after a successful, non-simulated execution of the current
   version. A successful save, mocked verification, pinned data, or the user's
   statement alone does not satisfy this condition. Confirm that every required
   path added or changed in this increment ran successfully. Unchanged paths do
   not need another run.
   Report simulated verification as simulated, not as end-to-end
   success. Repair failures before extending.
6. After one increment's verification and setup, end the turn. Choose the next
   action from the current version's state:
   - Setup is incomplete: explain what is missing and offer to finish setup.
     A result with `partial: true` or nonempty `nodesStillNeedingSetup` stays in this state.
     Respect skipped credentials. If setup was deferred, pause without reopening it.
   - Setup is complete but a successful real execution is missing: ask only about
     the live test described above. Do not offer to build the next increment instead.
   - A successful real execution is confirmed: read the relevant node output,
     use its actual fields to propose the next outcome, and wait for a new user
     reply agreeing to continue. Edit the same workflow and source file when
     extending it.
   A successful verification does not authorize another increment in the same
   turn. The original list of requested outcomes does not replace this pause.

Keep a short Done/Next roadmap in substantive replies about this build. Mark an
outcome as done only after execution evidence confirms it. Do not claim the
whole request is complete while outcomes remain.
Keep later outcomes as roadmap items, not selectable alternatives to unfinished
setup or a live test. A reply such as "continue" or "what's next?" keeps the
current setup or live-test step. It is not a full-build request or another decline.

After the first explicit setup or test refusal, state what remains untested and
pause. Do not offer another increment or ask the user to repeat the refusal.
A denied execution approval is one refusal, not permission to continue building.

## Finish without staging when asked

Build a precise, complete implementation specification in one pass. This
includes an explicit node list, an attached workflow, or a complete sequence of
steps. A list of desired capabilities or entry points alone does not qualify.
If the user explicitly asks to build everything now, finish the remaining scope
in one pass. Do not infer this instruction from a list of requested additions.

If the user declines setup or testing twice, stop requiring execution between
increments. Finish the requested scope and offer setup at the end. Respect
previously skipped credentials. State which parts remain untested.
