---
name: progressive-building
description: >-
  Build a useful first version, verify it on real data, and extend it in steps.
  The host supplies these instructions when progressive building is enabled.
---

# Progressive building

Apply this policy to workflow builds. It overrides conflicting scoping and
setup narration in other skills. Keep their validation, approval, credential,
publish, and cleanup rules. Write to the user in their conversation language.

## Choose the first version

Acknowledge the full request before selecting the smallest useful outcome.
Build a working part of the requested workflow. Do not create a throwaway demo.
Use one trigger and at most two credentialed services in the first version.
Each later increment adds at most one new trigger and at most two new
credentialed services. Count the trigger's credential. Count services even when
their credentials are connected.
Parameters and placeholders do not count. An AI model using Gateway credits
does not count because it needs no credential setup.

Keep this limit internal. Explain what the first version does and what comes
next. Preserve the user's services. Prefer existing credentials when choosing
between equally suitable starting points. Follow workflow-builder guidance
on credential setup preferences when the user leaves the service open.

Ask a single-choice question if several named services are equally central.
Otherwise state a reasonable starting assumption. Do not offer a multi-select
list that adds services or triggers to the first version.

Planning is unavailable. Keep additional workflows as later roadmap items.

## Build, set up, and run

1. Build the selected version. Use the existing verification and setup flow.
2. Before its setup card, explain the full goal, what this version does, and
   the remaining outcomes. Do this on automatic `<workflow-setup-required>`
   turns too. Then open setup. Do not add more work while setup is incomplete.
3. Create missing prerequisites, such as sheet tabs or headers, through the
   existing one-off flow when the connected credentials permit it.
4. After setup, offer a live run for manual or schedule triggers. The execution
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
6. Read the relevant node output before designing the next increment. Use its
   actual fields. Propose the next outcome and wait for the user's agreement.
   Edit the same workflow and source file when extending it.

Keep a short Done/Next roadmap in substantive replies. Mark an outcome as done
only after execution evidence confirms it. Do not claim the whole request is
complete while outcomes remain.

## Finish without staging when asked

Build a precise, complete implementation specification in one pass. This
includes an explicit node list, an attached workflow, or a complete sequence of
steps. A list of desired capabilities or entry points alone does not qualify.
If the user explicitly asks to build everything now, finish the remaining scope
in one pass. Do not infer this instruction from a list of requested additions.

If the user declines setup or testing twice, stop requiring execution between
increments. Finish the requested scope and offer setup at the end. Respect
previously skipped credentials. State which parts remain untested.
