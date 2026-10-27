---
name: compositional-workflows
description: >-
  Load before splitting a large workflow into supporting sub-workflows and a
  main workflow, when the work has reusable chunks or benefits from independent
  testing. Simple workflows stay in one workflow.
---
# Compositional Workflows

Complex workflows: may split into supporting sub-workflows + main workflow.

Use when workflow large, has reusable chunks, or benefits from independent testing. Simple workflows stay in one.

1. Write source file per supporting workflow, build with
   `workflow_builder_build_workflow` and `isSupportingWorkflow: true`.
2. Give each supporting workflow `executeWorkflowTrigger` (version 1.1) with
   explicit input schema.
3. Use returned supporting `workflowId` in main workflow's
   `executeWorkflow` node with `source: 'database'`.
4. Create/edit main workflow source file last, save with
   `workflow_builder_build_workflow` without `isSupportingWorkflow`; this is build task's
   final deliverable.
5. No auto-publish main workflow. Supporting workflows may be
   published when parent needs them active for verification or
   runtime references, only after setup requirements resolved.

Example supporting workflow trigger:

```ts
const inputTrigger = trigger({
  type: 'n8n-nodes-base.executeWorkflowTrigger',
  version: 1.1,
  config: {
    parameters: {
      inputSource: 'workflowInputs',
      workflowInputs: {
        values: [
          { name: 'city', type: 'string' },
          { name: 'units', type: 'string' },
        ],
      },
    },
  },
});
```

Example main-workflow reference:

```ts
const getWeather = node({
  type: 'n8n-nodes-base.executeWorkflow',
  version: 1.2,
  config: {
    name: 'Get Weather Data',
    parameters: {
      source: 'database',
      workflowId: { __rl: true, mode: 'id', value: 'SUPPORTING_WORKFLOW_ID' },
      mode: 'once',
      workflowInputs: {
        mappingMode: 'defineBelow',
        value: { city: expr('{{ $json.city }}'), units: 'metric' },
      },
    },
  },
});
```

Replace `SUPPORTING_WORKFLOW_ID` with real ID returned by supporting
`workflow_builder_build_workflow` call. If supporting workflow uses mocked credentials or
placeholders, route setup before publishing or relying on it.