# Compositional Workflows

For complex workflows, you may decompose work into supporting sub-workflows and
a main workflow. This is part of an approved build task, not a reason to create a new plan.

Use this pattern when a workflow is large, has reusable chunks, or benefits from
independent testing. Simple workflows should stay in one workflow.

1. Write a source file for each supporting workflow, then build it with
   `build-workflow` and `isSupportingWorkflow: true`.
2. Give each supporting workflow an `executeWorkflowTrigger` (version 1.1) with
   an explicit input schema.
3. Use the returned supporting `workflowId` in the main workflow's
   `executeWorkflow` node with `source: 'database'`.
4. Create or edit the main workflow source file last, then save it with
   `build-workflow` and without `isSupportingWorkflow`; this is the build task's
   final deliverable outcome.
5. Do not publish the main workflow automatically. Supporting workflows may be
   published when the parent workflow needs them active for verification or
   runtime references, but only after their setup requirements are resolved.

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

Replace `SUPPORTING_WORKFLOW_ID` with the real ID returned by the supporting
`build-workflow` call. If a supporting workflow uses mocked credentials or
placeholders, route setup before publishing or relying on it.
