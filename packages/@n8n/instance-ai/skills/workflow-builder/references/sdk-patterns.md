# SDK Patterns

## Contents

- Import block
- Basic workflow skeleton
- Merge (zero-based inputs)
- IF (.onTrue / .onFalse)
- Switch (.onCase)
- SplitInBatches + nextBatch
- AI Agent subnodes
- Compositional workflows (executeWorkflowTrigger + executeWorkflow)
- Additional SDK helpers

## Import block

Use this import shape unless the task needs fewer symbols:

```ts
import {
  workflow,
  node,
  trigger,
  sticky,
  placeholder,
  newCredential,
  ifElse,
  switchCase,
  merge,
  splitInBatches,
  nextBatch,
  languageModel,
  memory,
  tool,
  outputParser,
  embedding,
  embeddings,
  vectorStore,
  retriever,
  documentLoader,
  textSplitter,
  fromAi,
  nodeJson,
  expr,
} from '@n8n/workflow-sdk';
```

## Basic workflow skeleton

Define nodes first, then compose the workflow:

```ts
const startTrigger = trigger({
  type: 'n8n-nodes-base.manualTrigger',
  version: 1,
  config: { name: 'Start' },
});

const fetchData = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.3,
  config: { name: 'Fetch Data', parameters: { method: 'GET', url: placeholder('API URL') } },
});

export default workflow('id', 'name').add(startTrigger).to(fetchData);
```

When two upstream data sources are independent, do not chain them if that would
multiply items. Use `executeOnce: true` or parallel branches plus Merge.

## Merge

Input indices are zero-based:

```ts
const combine = merge({
  version: 3.2,
  config: { name: 'Combine Results', parameters: { mode: 'combine', combineBy: 'combineByPosition' } },
});

export default workflow('id', 'name')
  .add(startTrigger)
  .to(sourceA.to(combine.input(0)))
  .add(startTrigger)
  .to(sourceB.to(combine.input(1)))
  .add(combine)
  .to(processResults);
```

## IF

Branch wiring must be **inside the workflow builder chain**. Pass
`ifNode.onTrue(...).onFalse(...)` to `.to(...)`, or chain off the workflow
builder cursor with `.to(ifNode).onTrue(...).onFalse(...)`.

```ts
const isImportant = ifElse({
  version: 2.2,
  config: {
    name: 'Is Important',
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 },
        conditions: [
          { id: 'priority', leftValue: expr('{{ $json.priority }}'), rightValue: 'high', operator: { type: 'string', operation: 'equals' } },
        ],
        combinator: 'and',
      },
    },
  },
});

// ✅ Inline in .to()
export default workflow('id', 'name')
  .add(startTrigger)
  .to(source)
  .to(isImportant.onTrue(handleImportant).onFalse(ignore));

// ✅ Workflow-builder cursor API
export default workflow('id', 'name')
  .add(startTrigger)
  .to(source)
  .to(isImportant)
  .onTrue(handleImportant)
  .onFalse(ignore);
```

**Anti-pattern — detached branch wiring (build may succeed but branches are dropped):**

```ts
// ❌ WRONG — onTrue/onFalse are never passed to the workflow builder
export default workflow('id', 'name')
  .add(startTrigger)
  .to(source)
  .to(isImportant);

isImportant.onTrue(handleImportant);
isImportant.onFalse(ignore);
```

Standalone `.onTrue()` / `.onFalse()` / `.onCase()` calls — including after
`export default` — create branch builders whose return value is discarded.
The IF/Switch node is saved with no outgoing connections and branch nodes are
omitted from the workflow. `build-workflow` rejects this pattern at parse time;
wire branches inside `.to(...)` instead.

## Switch

Use zero-based `.onCase(index, target)` for each rule output.

## SplitInBatches

Use it for per-item side effects and loop back with `nextBatch`. Do not add a
separate IF gate just to check whether items exist.

## AI Agent workflows

- Attach language models, memory, tools, parsers, retrievers, vector stores, and
  other subnodes to the agent as subnodes.
- Tool nodes must have explicit concise `config.name` values.
- Prefer `fromAi(...)` for values the agent should supply to tools.
- Use explicit node references instead of `$json` in subnodes when the value
  comes from a trigger or a main-flow node.

## Compositional workflows

For complex workflows, you may decompose work into supporting sub-workflows and
a main workflow. This is part of an approved build task, not a reason to call
`delegate` or create a new plan.

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

## Additional SDK helpers

- `placeholder('hint')`: marks a parameter value for user input.
- `sticky('content', nodes?, config?)`: creates a sticky note. It must still be
  added to the workflow.
- `.output(n)`: selects a zero-based output index.
- `.onError(handler)`: connects a node's error output to a handler. Requires
  `onError: 'continueErrorOutput'` in the node config.
- `nodeJson(node, 'field.path')`: creates an explicit expression reference to a
  specific node's JSON output.
- Subnode factories follow the same pattern as `languageModel()` and `tool()`:
  `memory()`, `outputParser()`, `embeddings()`, `vectorStore()`, `retriever()`,
  `documentLoader()`, and `textSplitter()`.
