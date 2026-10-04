# Compositional Workflows

For complex workflows, you may decompose work into supporting sub-workflows and
a main workflow. This is part of an approved build task, not a reason to create a new plan.

Use this pattern when a workflow is large, has reusable chunks, or benefits from
independent testing. Simple workflows should stay in one workflow.

1. Write a source file for each supporting workflow, then build it with
   `build-workflow` and `isSupportingWorkflow: true`.
2. Start each supporting workflow with the Execute Workflow Trigger and an
   explicit input schema.
3. Use the returned supporting `workflowId` in the main workflow's
   Execute Workflow node with `source: 'database'`.
4. Create or edit the main workflow source file last, then save it with
   `build-workflow` and without `isSupportingWorkflow`; this is the build task's
   final deliverable outcome.
5. Do not publish the main workflow automatically. Supporting workflows may be
   published when the parent workflow needs them active for verification or
   runtime references, but only after their setup requirements are resolved.

Supporting workflow trigger:

```ts
import { executeWorkflowTrigger } from '@n8n/nodes/n8n-nodes-base/executeWorkflowTrigger';

executeWorkflowTrigger.trigger({
  name: 'When Called',
  inputSource: 'workflowInputs',
  workflowInputs: {
    values: [
      { name: 'city', type: 'string' },
      { name: 'units', type: 'string' },
    ],
  },
  sample: [{ city: 'Berlin', units: 'metric' }],
}),
```

Main-workflow call: `node()` with a flat config (no `config`, no
`typeVersion`). Map each declared input in `workflowInputs.value`; a lambda
reads the item. If the trigger accepts all data, omit `workflowInputs`: each
item passes as is.

```ts
import { node } from '@n8n/workflow-sdk/next';

node({
  name: 'Get Weather Data',
  type: 'n8n-nodes-base.executeWorkflow',
  version: 1.2,
  parameters: {
    source: 'database',
    workflowId: { __rl: true, mode: 'id', value: 'SUPPORTING_WORKFLOW_ID' },
    mode: 'once',
    workflowInputs: {
      mappingMode: 'defineBelow',
      value: { city: (item) => item.city, units: 'metric' },
    },
  },
}),
```

Replace `SUPPORTING_WORKFLOW_ID` with the real ID returned by the supporting
`build-workflow` call. If a supporting workflow uses mocked credentials or
placeholders, route setup before publishing or relying on it.
