---
name: progressive-building
dependencies:
  tools:
    - workflow_builder_build_workflow
    - workflow_builder_verify_built_workflow
    - workflow_builder_workflows
    - workflow_builder_executions
description: >-
  Load before workflow_builder_build_workflow and before scoping/planning new
  workflows and feature additions, incl. requests spanning multiple workflows.
  For new kept build, load intent-recognition first when listed. One increment
  per user message. Finish setup and inspect successful real execution before
  offering next increment, then wait for user reply. Partial setup =
  incomplete. First setup or test refusal pauses building. Follow skill's
  full-build exceptions. Also supports workflow edits and repairs. For
  workflows creating/writing Data Tables, load data-table-manager first.
  Requests only to run, inspect, or manage existing resources use normal tools
  and skills.
---
# Progressive building

Apply policy when creating/extending workflows and repairing those builds. Overrides conflicting scoping and setup narration in building and post-build guidance above. Keep their validation, approval, credential, publish, cleanup rules. Write to user in their conversation language.

Requests to run, inspect, or manage existing resources use normal tools and skills, no staging. Also applies when user switches to such request after building in same conversation.

## Choose the first version

Acknowledge full request before picking smallest useful outcome. Build working part of requested workflow. No throwaway demo.
First version: one trigger, max two credentialed services.
Each later increment adds max one new trigger and max two new credentialed services. Applies even when new triggers share existing logic or need no credentials. Count trigger's credential. Count services even when credentials connected.
Parameters and placeholders don't count. AI provider counts toward same two-service total as trigger and other services, even if credential missing. Exclude model only when Gateway credits confirmed available for that model on this instance. Needs provider API key → count it.

Keep limit internal. Explain what first version does and what comes next. Preserve user's services. Prefer existing credentials when picking between equally suitable starting points. Follow workflow-builder guidance on credential setup preferences when user leaves service open.

Several named services equally central → ask single-choice question. Else state reasonable starting assumption. No multi-select list adding services or triggers to first version.

Additional workflows stay later roadmap items.

## Build, set up, and run

1. Build selected version. Use existing verification and setup flow.
2. Before its setup card, explain full goal, what this version does, and
   remaining outcomes. Do this on automatic `<workflow-setup-required>`
   turns too. Then open setup. No more work while setup incomplete.
3. Create missing prerequisites (sheet tabs, headers) via
   existing one-off flow when connected credentials permit.
4. After setup, offer only live run for manual or schedule triggers. Execution
   approval card supplies consent. Event triggers: explain how to start
   listening for test event and perform event, then ask user to report
   back. Inspect resulting execution with `workflow_builder_executions`.
5. Extend only after successful, non-simulated execution of current
   version. Successful save, mocked verification, pinned data, or user's
   statement alone not enough. Confirm every required
   path added or changed in this increment ran successfully. Unchanged paths
   need no rerun.
   Report simulated verification as simulated, not end-to-end
   success. Repair failures before extending.
6. After one increment's verification and setup, end turn. Pick next
   action from current version's state:
   - Setup incomplete: explain what missing, offer to finish setup.
     A result with `partial: true` or nonempty `nodesStillNeedingSetup` stays in this state.
     Respect skipped credentials. If setup was deferred, pause without reopening it.
   - Setup complete but successful real execution missing: ask only about
     the live test described above. Do not offer to build the next increment instead.
   - Successful real execution confirmed: read relevant node output,
     use its actual fields to propose the next outcome, and wait for a new user
     reply agreeing to continue. Edit the same workflow and source file when
     extending it.
   Successful verification doesn't authorize another increment in same
   turn. Original list of requested outcomes doesn't replace this pause.

Keep short Done/Next roadmap in substantive replies about this build. Mark
outcome done only after execution evidence confirms. Don't claim
whole request complete while outcomes remain.
Later outcomes stay roadmap items, not selectable alternatives to unfinished
setup or live test. Reply like "continue" or "what's next?" keeps
current setup or live-test step. Not full-build request or another decline.

After first explicit setup or test refusal, state what remains untested and
pause. Don't offer another increment or ask user to repeat refusal.
Denied execution approval = one refusal, not permission to keep building.

## Finish without staging when asked

Precise, complete implementation spec → build in one pass. Includes
explicit node list, attached workflow, or complete step sequence.
List of desired capabilities or entry points alone doesn't qualify.
User explicitly asks to build everything now → finish remaining scope
in one pass. Don't infer this from list of requested additions.

User declines setup or testing twice → stop requiring execution between
increments. Finish requested scope, offer setup at end. Respect
previously skipped credentials. State which parts remain untested.