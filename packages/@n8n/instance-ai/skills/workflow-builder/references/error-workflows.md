---
name: error-workflows
description: >-
  Load before creating, assigning, or changing a workflow-level error workflow
  (`settings.errorWorkflow`), including the error-workflow follow-up after a
  primary workflow is published.
---

# Workflow-Level Error Workflows

n8n has no global or instance-wide error workflow setting. Error workflows are
assigned per target workflow through workflow settings:

```ts
export default workflow('target-workflow-id', 'Target Workflow')
  .settings({ errorWorkflow: 'published-error-workflow-id' })
  .add(triggerNode);
```

`settings.errorWorkflow` must be the real workflow ID of a separate published
workflow whose published version contains an active Error Trigger node. Do not
use a workflow name, placeholder, `activeVersionId`, local SDK id, or invented
global identifier.

Use the no-global-setting rule as implementation guidance. Mention it to the
user only when they explicitly ask about, request, or reference global or
instance-wide error workflow behavior.

When creating an error workflow to attach to another workflow:

1. Wait until the target workflow is published, then ask whether the user wants
   an error workflow for it.
2. Build the error workflow as a separate workflow. It starts with an Error
   Trigger and sends the notification the user requested.
3. Publish the error workflow with `publish_workflow` before setting
   it on the target workflow: `settings.errorWorkflow` only accepts a published
   workflow, and publishing goes through HITL approval, so the user confirms it.
   This applies to the error workflow only; never publish the target workflow
   unless the user explicitly asks.
4. Patch the original target workflow's source and set
   `.settings({ errorWorkflow: '<published-error-workflow-id>' })`, then call
   `workflow_builder_build_workflow` for the original workflow. This assigns the error workflow
   only to that target workflow.

## Error workflow follow-up

This follow-up comes only after a direct new primary workflow is successfully published.

If you just built an Error Trigger workflow because the user opted into adding
one for a known target workflow, do not ask whether to build another error
workflow. Continue the publish-before-assign flow for the target workflow:
ask whether to publish the error workflow and set it on that target workflow,
then publish and assign only after the user approves.

After successfully publishing a direct new primary workflow,
ask once whether the user wants to build an error workflow for that workflow.
Use `ask_user` with a yes/no choice or a concise visible question. Do **not**
create an error workflow before the user opts in.

The opt-in must explicitly mention an error workflow and the target workflow
name. A generic follow-up like "Want me to add anything else?", "Want me to
publish it?", or "Want to test it?" does not satisfy this step.

Skip this follow-up when:

- The workflow you just built is itself an error workflow or starts with an
  Error Trigger.
- The build is a supporting workflow, repair, small edit, or workflow-level
  settings patch.
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
   agrees, call `publish_workflow` for the error workflow and let the
   HITL approval card handle confirmation.
4. After publish succeeds, set the original workflow's workflow-level
   `settings.errorWorkflow` to the **error workflow's workflowId**. Do not use
   the published `activeVersionId`, workflow name, a placeholder, or a local SDK
   id. If you have the original source file, edit it; otherwise call
   `get_workflow_as_code(workflowId)` for the original workflow,
   write the returned code to a `.workflow.ts` file, add
   `.settings({ errorWorkflow: '<published-error-workflow-id>' })`, and call
   `workflow_builder_build_workflow` for the original workflow. The workflow edit approval card
   is the HITL surface for this assignment.
5. Summarize the result with explicit per-workflow language: this error
   workflow was assigned only to the named target workflow. Mention that n8n has
   no global or instance-wide error workflow setting only when the user
   explicitly asked about, requested, or referenced global/instance-wide error
   workflow behavior.
