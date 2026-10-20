---
name: error-workflows
description: >-
  Load before creating, assigning, or changing a workflow-level error workflow
  (`settings.errorWorkflow`), including the error-workflow follow-up after a
  primary workflow is published.
---
# Workflow-Level Error Workflows

n8n has no global/instance-wide error workflow setting. Error workflows assigned per target workflow via workflow settings:

```ts
export default workflow('target-workflow-id', 'Target Workflow')
  .settings({ errorWorkflow: 'published-error-workflow-id' })
  .add(triggerNode);
```

`settings.errorWorkflow` must be real workflow ID of separate published workflow whose published version has active Error Trigger node. No workflow name, placeholder, `activeVersionId`, local SDK id, or invented global identifier.

No-global-setting rule = implementation guidance. Mention to user only when they explicitly ask about, request, or reference global/instance-wide error workflow behavior.

When creating error workflow to attach to another workflow:

1. Wait until target workflow published, then ask if user wants error workflow for it.
2. Build error workflow as separate workflow. Starts with Error Trigger, sends notification user requested.
3. Publish error workflow with `workflow_builder_workflows(action="publish")` before setting
   on target workflow: `settings.errorWorkflow` only accepts published
   workflow, and publish goes through HITL approval, so user confirms.
   Applies to error workflow only; never publish target workflow
   unless user explicitly asks.
4. Patch original target workflow source, set
   `.settings({ errorWorkflow: '<published-error-workflow-id>' })`, then call
   `workflow_builder_build_workflow` for original workflow. Assigns error workflow
   only to that target workflow.