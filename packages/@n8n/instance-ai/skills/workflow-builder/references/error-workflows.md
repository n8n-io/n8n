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

1. Build the target workflow first, then ask whether the user wants an error
   workflow for it. Do not create one before the user opts in.
2. Build the error workflow as a separate workflow. It starts with an Error
   Trigger and sends the notification the user requested.
3. Publish the error workflow with `workflows(action="publish")` before setting
   it on the target workflow: `settings.errorWorkflow` only accepts a published
   workflow, and publishing goes through HITL approval, so the user confirms it.
   This applies to the error workflow only; never publish the target workflow
   unless the user explicitly asks.
4. Patch the original target workflow's source and set
   `.settings({ errorWorkflow: '<published-error-workflow-id>' })`, then call
   `build-workflow` for the original workflow. This assigns the error workflow
   only to that target workflow.
