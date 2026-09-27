# Workflow SDK Wiring Patterns

Wiring examples for `@n8n/workflow-sdk` builder code. Read the section for the
construct you are about to write.

## Merge

When two upstream data sources are independent, do not chain them if that would
multiply items. Use `executeOnce: true` or parallel branches plus Merge.

Merge input indices are zero-based:

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

Pick the Merge mode that matches the data shape.

## Parallel steps from one node

On the workflow builder, an array assigns one target per output index:
`.to(textClassifier).to([billing, support])` sends output 0 to `billing` and
output 1 to `support`. Use it only on a node with several outputs.

To send the items of a single-output node to parallel steps, pass the array to
the node itself. Each array entry then connects to output 0:

```ts
export default workflow('id', 'name')
  .add(startTrigger)
  .to(generateImage.to([writeCopy.to(combine.input(0)), uploadImage.to(combine.input(1))]))
  .add(combine)
  .to(createCreative);
```

## Switch

Wire cases on the workflow builder, like IF branches:
`.to(switchNode).onCase(0, a).onCase(1, b)`, or the inline form
`.to(switchNode.onCase(0, a).onCase(1, b))`. Each rule output uses its
zero-based index. A case can take a chain (`a.to(b)`) or an array for parallel
fan-out.

## Error routes

Error routes work the same way on any node: `.to(fetchNode).onError(notify)`
routes the error output and leaves the cursor on `fetchNode`, so a following
`.to(next)` continues the main branch and a second `.onError()` adds another
handler. The inline form `.to(fetchNode.onError(notify))` is equivalent. Both
forms set `onError: 'continueErrorOutput'` on the node for you, so do not
declare it in the config. Call `.onError()` once for each handler — it takes
one handler, not an array.

## Split in Batches

Use Split in Batches for per-item side effects: `splitInBatches` with
`batchSize: 1` feeds the per-item work, and `nextBatch` loops back. Do not add
a separate IF gate just to check whether items exist.

## Outputs and subnodes

- `.output(n)` selects a zero-based output index.
- Subnode factories follow the same pattern as `languageModel()` and `tool()`:
  `memory()`, `outputParser()`, `embeddings()`, `vectorStore()`, `retriever()`,
  `documentLoader()`, and `textSplitter()`.
