# Workflow SDK Code

Builder code is a **restricted subset of TypeScript** that describes a static
graph. It is not a Code node and it does not run per item: every value it
produces is frozen when the workflow is built. Anything that must happen at run
time belongs in an n8n expression (`expr()`) or a Code node.

## Language subset

Available: `const` declarations, SDK factory calls, object and array literals,
template literals, static member access, property assignment, and a single
`export default`.

Rejected — `workflow-sdk validate` flags these, mostly as
`SDK_FORBIDDEN_CONSTRUCT`:

- Loops, functions of any kind (arrow, `function`, class), `try`/`catch`,
  `throw`, `new`, `await`, `++`/`--`, named exports, dynamic `import()`.
- `let`, `var`, destructuring, reassignment, and computed member access with a
  variable key (`obj[key]`); literal keys such as `obj['a']` and `arr[0]` are
  fine.
- Native array and string methods: `.map()`, `.join()`, `.filter()`,
  `.reduce()`, `.forEach()`, `.find()`, `.some()`, `.every()`, `.split()`. The
  only non-builder methods available are `JSON.stringify()` and the string
  methods `.repeat()` and `.trim()`.
- Globals: `Math`, `Date`, `Object`, `Array`, `Map`, `Set`, `Number`, `RegExp`,
  `Promise`, `Buffer`, `process`, `require`, timers, `eval`. Use `$now` /
  `$today` inside `expr()` for dates, and a Code node for computation.
- `as const` and other TypeScript-only assertions (`SDK_AS_CONST`).

Methods that chain on SDK objects: `.add()`, `.to()`, `.group()` on the
workflow; `.input()`, `.output()`, `.onError()` on a node; `.onTrue()`,
`.onFalse()`, `.onCase()`, `.onEachBatch()`, `.onDone()` for control flow.

## File shape

Import from `@n8n/workflow-sdk`, declare every node as a `const`, then close
with one `export default workflow(...)` chain holding all the wiring.
Statements after `export default` never reach the builder and are dropped
(`SDK_CODE_AFTER_EXPORT_DEFAULT`).

```ts
import { workflow, node, trigger, expr, placeholder, newCredential } from '@n8n/workflow-sdk';

const startTrigger = trigger({
  type: 'n8n-nodes-base.manualTrigger',
  version: 1,
  config: { name: 'Start' },
});

const fetchData = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.3,
  config: { name: 'Fetch Data', parameters: { method: 'GET', url: placeholder('API URL') } },
  output: [{ id: 1, title: 'First' }, { id: 2, title: 'Second' }],
});

export default workflow('id', 'Order Digest').add(startTrigger).to(fetchData);
```

The other factories take the same `{ type, version, config, output? }` shape:
`ifElse()`, `switchCase()`, `merge()`, `splitInBatches()`, `languageModel()`,
`memory()`, `tool()`, `outputParser()`, `embeddings()`, `vectorStore()`,
`retriever()`, `documentLoader()`, `textSplitter()`. Import only the symbols
the workflow uses.

Never set `position` — the layout engine calculates it. When editing
roundtripped code, drop `position` arrays and replace raw credential objects
(`{ id, name }`) with `newCredential()`.

`output` declares a mock item shape. Declare it on triggers, HTTP Request
nodes, and other read/search/list nodes whose fields downstream expressions or
Code nodes read, or the shape-aware validators stay dark. Use the real payload
shape, and at least two items when the real response is a collection.

Use `placeholder('hint')` as the direct parameter value. Wrapping it in
`expr()`, a template literal, or an array is `SDK_PLACEHOLDER_WRAPPED`.

## Wiring

Wire branches on the workflow chain, not as standalone statements on the node
variable. A second `.onTrue()` on the same node overwrites the first
(`SDK_REPEATED_BRANCH_WIRING`).

An IF node is built with `ifElse()`, and each branch is a complete processing
path — a branch that only filters items performs none of the effects the user
asked for.

```ts
const isImportant = ifElse({
  version: 2.2,
  config: {
    name: 'Is Important',
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 },
        conditions: [
          {
            id: 'priority',
            leftValue: expr('{{ $json.priority }}'),
            rightValue: 'high',
            operator: { type: 'string', operation: 'equals' },
          },
        ],
        combinator: 'and',
      },
    },
  },
});

export default workflow('id', 'name')
  .add(startTrigger)
  .to(isImportant)
  .onTrue(alertOnCall)                                   // single step
  .onFalse(sendHolding.to(createTicket.to(notifyTeam))); // chained multi-step
// Inline equivalent: .to(isImportant.onTrue(a).onFalse(b))
// Parallel fan-out on a branch: .onFalse([a, b, c])
```

`leftValue` and `operator.type` must agree with the real data: comparing a
boolean field with a string operator matches nothing under `typeValidation:
'strict'`. Read the operator names from the IF node's type definition rather
than guessing them.

All input and output indices are zero-based: `.input(0)` is the first input,
`.input(1)` the second. Switch cases use `.onCase(index, target)` per rule
output. Merge nodes take one branch per input index:

```ts
export default workflow('id', 'name')
  .add(startTrigger)
  .to(sourceA.to(combine.input(0)))
  .add(startTrigger)
  .to(sourceB.to(combine.input(1)))
  .add(combine)
  .to(processResults);
```

Split in Batches runs per-item side effects and loops back with `nextBatch`:

```ts
export default workflow('id', 'name')
  .add(startTrigger)
  .to(fetchRecords)
  .to(loop.onEachBatch(processRecord.to(nextBatch(loop))).onDone(finalize));
```

`.onError(handler)` connects a node's error output and requires
`onError: 'continueErrorOutput'` in that node's config.

## AI agents and subnodes

Attach models, memory, tools, parsers, retrievers, and vector stores through
the agent's `config.subnodes`; they are not `.to()` targets.

```ts
const aiAgent = node({
  type: '@n8n/n8n-nodes-langchain.agent',
  version: 3.1,
  config: {
    name: 'Support Agent',
    parameters: { promptType: 'define', text: 'You can look up orders' },
    subnodes: { model: chatModel, memory: bufferMemory, tools: [lookupTool] },
  },
});
```

Give every tool node an explicit, concise `config.name`, and use `fromAi(...)`
for the values the agent should fill in. Inside a tool or memory subnode,
`$json` is not the main flow's item — reference the source node explicitly
(`SUBNODE_UNSAFE_JSON_REFERENCE`). In a document loader, `$json` is the
parent's own input item and is correct.

## Expressions

Variables must sit inside `{{ }}`:

```ts
expr('Hello {{ $json.name }}')
expr('Report for {{ $now.toFormat("MMMM d, yyyy") }} - {{ $json.title }}')
expr('{{ $("Source").all().map(i => ({ option: i.json.name })) }}')
```

The `{{ }}` body is real n8n expression syntax, so `.map()`, arrow functions,
and Luxon helpers are all fine there — the builder-code restrictions above stop
at the quote marks.

Available: `$json` (current item from the immediate predecessor only),
`$('NodeName').item.json` (the paired item from another node), `$input.first()`
/ `$input.all()` / `$input.item`, `$binary`, `$now` / `$today`, `$itemIndex`,
`$runIndex`, `$execution.id`, `$execution.mode`, `$workflow.id`, and
`$workflow.name`.

When `$json` is unsafe — in subnodes, at fan-in after IF/Switch/Merge, or after
a node that replaced the item JSON — reference the source node:

```ts
sessionKey: nodeJson(telegramTrigger, 'message.chat.id')
eventId: nodeJson(extractEventId, 'eventId')
```

Do not use `.first()` or `$input.first()` for per-item data in a multi-item
workflow; it always reads item 0, so every downstream item reuses the first
value. Use it only for a genuine single global item, such as one config row.
