# Post-build error workflow follow-up

User opt-in flow for error workflows after a direct new primary build. Read when
handling post-build follow-ups for a workflow that is not itself an error handler.

This follow-up comes after the mocked verification live-test follow-up when that
follow-up is due, and before generic "want to test it?" prompts. For a direct
new primary workflow, ask about the error workflow after the user answers,
declines, or defers any pending live/no-mock testing question. If no mocked
live-test follow-up is due, ask about the error workflow first.

If you just built an Error Trigger workflow because the user opted into adding
one for a known target workflow, do not ask whether to build another error
workflow. Continue the publish-before-assign flow for the target workflow: ask
whether to publish the error workflow and set it on that target workflow, then
publish and assign only after the user approves.

After saving and handling verification/setup for a direct new primary workflow,
ask once whether the user wants to build an error workflow for that workflow.
Use `ask-user` with a yes/no choice or a concise visible question. Do **not**
create an error workflow before the user opts in.

The opt-in must explicitly mention an error workflow and the target workflow
name. A generic follow-up like "Want me to add anything else?", "Want me to
publish it?", or "Want to test it?" does not satisfy this step.

Skip this follow-up when:

- The workflow you just built is itself an error workflow or starts with an
  Error Trigger.
- The build is a supporting workflow, repair, small edit, planned-task
  subtask, or workflow-level settings patch.
- The user already asked for an error workflow in the original request, already
  declined one, or the target workflow already has the desired error workflow
  set.

If the user says yes:

1. Load `workflow-builder` and build a separate error workflow using the user's
   requested notification destination. Keep the error workflow scoped to the
   target workflow the user opted in for.
2. Do not ask whether this new error workflow needs its own error workflow.
3. The error workflow must be published before it can be assigned. If the user
   has not already asked you to publish and attach it, ask whether to publish it
   and set it as the error workflow for the named target workflow. When the user
   agrees, call `workflows(action="publish")` for the error workflow and let the
   HITL approval card handle confirmation.
4. After publish succeeds, set the original workflow's workflow-level
   `settings.errorWorkflow` to the **error workflow's workflowId**. Do not use
   the published `activeVersionId`, workflow name, a placeholder, or a local SDK
   id. If you have the original source file, edit it; otherwise call
   `workflows(action="get-as-code", workflowId)` for the original workflow,
   write the returned code to a `.workflow.ts` file, add
   `.settings({ errorWorkflow: '<published-error-workflow-id>' })`, and call
   `build-workflow` for the original workflow. The workflow edit approval card
   is the HITL surface for this assignment.
5. Summarize the result with explicit per-workflow language: this error workflow
   was assigned only to the named target workflow. Mention that n8n has no global
   or instance-wide error workflow setting only when the user explicitly asked
   about, requested, or referenced global/instance-wide error workflow behavior.

For SDK assignment syntax and publish-before-assign rules, see `error-workflows.md`.
