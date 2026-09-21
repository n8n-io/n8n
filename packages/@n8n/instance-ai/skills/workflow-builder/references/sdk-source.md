# Source and SDK reference

Load this reference for TypeScript SDK source or a specific topic below.
For a new inline JSON build, use the main skill.

## SDK Code Rules

`workflow-sdk validate` (step 7 in the build loop) enforces common SDK and
Code-node defects: network calls / forbidden imports in Code nodes, nested
template literals in `jsCode`, TypeScript-only syntax such as `as const`,
statements after `export default`, `placeholder()` wrapped in `expr()`,
unsolicited `sticky()`, forbidden builder constructs (e.g. `.map()`), and
repeated `.onTrue()` / `.onFalse()` overwrites on the same IF variable. Fix
every reported error and warning before calling `build-workflow`.

- Native node first: shape, compute, default or format fields with
  **Edit Fields (Set)** and expressions (full JavaScript); **Filter**, **IF** /
  **Switch**, **Sort**, **Remove Duplicates**, **Aggregate**, **Split Out**,
  **Limit** and **Merge** cover the rest. A Code node is only for multi-pass
  algorithms, `$getWorkflowStaticData` state, fence-stripping model output,
  try/catch around upstream node access, or a step needing three or more nodes.
- Write Code nodes in JavaScript unless the user explicitly asks for Python.
  `language: 'pythonNative'` runs a locked-down runner that defines only `_items`
  (all-items mode), `_item` (per-item mode) and `print()` — no `_('Node Name')`,
  `_input` or `$` helpers. Its imports are allowlisted per deployment and the
  allowlist is empty by default: write import-free Python unless the **Python
  Code Nodes** section of your system prompt says this instance allows more.
  `build-workflow` re-checks the code against the real allowlist and reports
  anything the runner would reject.
- SDK builder code is a restricted subset of TypeScript that builds a static
  graph; it is not a Code node and does not run. Build strings with template
  literals; do runtime joining, aggregation, or transforms with `expr()` in a
  native node. Full allowed/forbidden list and "Native node mappings" table:
  `${N8N_WORKSPACE_DIR}/knowledge-base/reference/workflow-sdk-language.md`.
- Use `@n8n/workflow-sdk`.
- Do not specify node positions. They are auto-calculated by the layout engine.
- Use `expr('{{ $json.field }}')` for n8n expressions. Variables must be inside
  `{{ }}`. `$json` is only the current item from the immediate predecessor.
- Use string values directly for discriminator fields like `resource` and
  `operation`, for example `resource: 'message'`.
- When editing a saved workflow, leave layout alone. The source `get-as-code`
  writes carries no `position` arrays: the saved layout is restored on save by
  node `id`, and nodes you add are placed by the layout engine. Do not add a
  `position` to any node, and never run a whole-file substitution (for example
  `sed`) over the source to change layout.
- When editing a pre-loaded workflow, keep every `config.id` value **exactly** as
  `get-as-code` produced it, on the node it came with. `id` is the node's
  permanent identity in n8n — execution logs, poll cursors, deduplication state
  and the version diff are all keyed on it. Rename a node freely; the `id` stays.
  Move it, rewire it, change its parameters — the `id` stays. Never invent, edit,
  renumber or reuse an `id`, and never copy one from a template, another workflow
  or another node. **Omit `id` entirely for any node you are adding** — one is
  assigned on save. Deleting a node means deleting its `id` line with it. Like
  `position`, `id` is saved state: never write one by hand.
- Use `placeholder('hint')` directly as the parameter value. Do not wrap
  placeholders in `expr()`, objects, or arrays unless the node definition
  explicitly expects an object and the placeholder is the direct value of one
  field.
- For unresolved resource-locator fields (`{ __rl: true, mode, value }` —
  Slack channel / Sheets document selectors), use the locator object, never a
  raw `placeholder()` string. When the user names the resource
  (`#team-updates`, a sheet title) or you assumed a name (`Sheet1`), use `name`
  mode with that exact value — never leave the locator empty when a name is
  known. Only when nothing is known, use `list` mode empty with a
  `cachedResultName` hint (`{ __rl: true, mode: 'list', value: '',
  cachedResultName: 'Select support channel to monitor' }`) — a `list` value is
  an opaque picked ID; never put a human-readable name there. Without a `list`
  mode, use `name`/`url` with the known value, or `id` only with a concrete ID
  (never empty or placeholder).
- For single-execution nodes that receive many items but should run once, set
  `executeOnce: true`.
- Whenever a node declares mock `output` for verification, include every field
  later referenced by `$json` expressions, including optional trigger fields
  used in filters (for example Slack `subtype`, `bot_id`, `text`, `user`, `ts`,
  `channel`). Missing optional fields make expression-path validation fail.
- Match real cardinality in mock `output`. When a node's real response is a
  collection (HTTP list endpoints, search results, a top-level array such as
  Binance klines or a bare array of IDs), declare at least two items so
  single-item assumptions like `$input.first()` break during verification
  instead of on the user's first run. A single-item mock hides array-vs-single
  bugs.
- Match the real payload SHAPE in webhook trigger mocks. When a third-party
  platform calls the webhook (voice agents, payment providers, messaging
  platforms), that platform's documented envelope fixes the shape — mock it
  faithfully instead of inventing a flattened body. Tool-call style webhooks
  from AI/voice platforms nest arguments in an OpenAI-compatible envelope
  (`body.message.toolCalls[0].function.arguments`), not at the body root and
  not under `call.arguments`. Coding against an invented flat mock
  self-verifies green, then every field parses empty on the first real call.
- SDK node `output` mocks are raw `$json` objects. Do not wrap mock items in
  n8n runtime item envelopes like `{ json: { ... } }` unless downstream
  expressions intentionally read `$json.json.*`. Correct:
  `output: [{ orderId: 'ord_123', total: 42 }]`; wrong:
  `output: [{ json: { orderId: 'ord_123', total: 42 } }]`.
  Code node `jsCode` may still return runtime items like `[{ json: { ... } }]`;
  this rule applies to SDK `node({ output: [...] })` mocks.

Use this import shape unless the task needs fewer symbols:

```ts
import {
  workflow,
  node,
  trigger,
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


## Node Groups

Group connected stages so the canvas is readable. Follow the top-level item
limit in the main workflow-builder skill. Keep triggers outside groups.

Declare a group with `.group(name, members, { description })` on the workflow builder; members
are the node handles. Before you emit a `.group(...)`, read
`${N8N_WORKSPACE_DIR}/knowledge-base/reference/node-groups.md` — it carries the rules that make
a group valid and the contract for editing an existing workflow's groups. Do not restate those
rules from memory: an invalid group is dropped from the saved workflow with a warning, so the
source has to be fixed rather than re-emitted.


## Expression Reference

Available variables inside `expr('{{ ... }}')`:

- `$json`: current item's JSON data from the immediate predecessor node only.
- `$('NodeName').item.json`: access another node's output item paired with the
  current item.
- `$input.first()`, `$input.all()`, and `$input.item`.
- `$binary`: binary data from the current item.
- `$now` and `$today`: Luxon date/time helpers.
- `$itemIndex`, `$runIndex`, `$execution.id`, `$execution.mode`,
  `$workflow.id`, and `$workflow.name`.

Variables must always be inside `{{ }}`:

```ts
expr('Hello {{ $json.name }}')
expr('Report for {{ $now.toFormat("MMMM d, yyyy") }} - {{ $json.title }}')
expr('{{ $("Source").all().map(i => ({ option: i.json.name })) }}')
```

When `$json` is unsafe, reference the source node explicitly. This matters for
AI Agent subnodes, fan-in nodes after IF/Switch/Merge, and values that come from
further upstream or from before a node that replaces item JSON:

```ts
sessionKey: nodeJson(telegramTrigger, 'message.chat.id')
eventId: nodeJson(extractEventId, 'eventId')
```

Use `$('NodeName').item.json.field` or `nodeJson(sourceNode, 'field')` for
per-item upstream values. Do not use `.first()` or `$input.first()` for
per-item data in a multi-item workflow; it always reads item 0 and makes every
downstream item reuse the first value. Use `.first()` only for a true global
first item, such as a single configuration row.


## SDK Patterns Reference

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

For Merge nodes, input indices are zero-based:

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

For IF, each branch is a complete processing path. Wire branches on the workflow
builder, not as standalone calls on the IF node variable. Chain steps inside a
branch with `.to()`, or pass an array for parallel fan-out.

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

export default workflow('id', 'name')
  .add(startTrigger)
  .to(isImportant)
  .onTrue(handleImportant)                               // single step
  .onFalse(sendHolding.to(createTicket.to(alertSlack))); // chained multi-step
// Equivalent inline form: .to(isImportant.onTrue(a).onFalse(b))
// Parallel fan-out on a branch: .onFalse([a, b, c])
```

Do NOT wire branches as standalone statements after `export default` — those
calls never reach the builder (`workflow-sdk validate` flags this).

```ts
// WRONG
export default workflow('id', 'name').add(startTrigger).to(isImportant);
isImportant.onTrue(handleImportant); // never reaches the builder
isImportant.onFalse(sendHolding);
```

For Switch, wire cases the same way — `.to(switchNode).onCase(0, a).onCase(1, b)`
or inline — using zero-based `.onCase(index, target)` for each rule output.

Error routes work the same way on any node: `.to(fetchNode).onError(notify)`
routes the error output and leaves the cursor on `fetchNode`, so a following
`.to(next)` continues the main branch and a second `.onError()` adds another
handler. The inline form `.to(fetchNode.onError(notify))` is equivalent. Both
forms set `onError: 'continueErrorOutput'` on the node for you. Call
`.onError()` once for each handler — it takes one handler, not an array.

For Split in Batches, use it for per-item side effects and loop back with
`nextBatch`. Do not add a separate IF gate just to check whether items exist.

For AI Agent workflows:

- Attach language models, memory, tools, parsers, retrievers, vector stores, and
  other subnodes to the agent as subnodes.
- Tool nodes must have explicit concise `config.name` values.
- Prefer `fromAi(...)` for values the agent should supply to tools.
- Use explicit node references instead of `$json` in subnodes when the value
  comes from a trigger or a main-flow node.


## Additional SDK Functions

- `placeholder('hint')`: marks a parameter value for user input (use directly as
  the parameter value; `workflow-sdk validate` flags wrapping it in `expr()`).
- `.output(n)`: selects a zero-based output index.
- `.onError(handler)`: connects a node's error output to a handler, on the node
  or on the workflow builder. It sets `onError: 'continueErrorOutput'` on the
  node, so you do not declare that in the config.
- `nodeJson(node, 'field.path')`: creates an explicit expression reference to a
  specific node's JSON output.
- Subnode factories follow the same pattern as `languageModel()` and `tool()`:
  `memory()`, `outputParser()`, `embeddings()`, `vectorStore()`, `retriever()`,
  `documentLoader()`, and `textSplitter()`.


## Trigger URL Sharing

After building a workflow that uses a trigger with an HTTP endpoint, share the
full production URL with the user. Use the Webhook base URL and Form base URL
from Instance Info in the system prompt. Each trigger type has a distinct
pattern:

- **Webhook Trigger**: `{webhookBaseUrl}/{path}` (where `{path}` is the node's
  webhook path parameter).
- **Form Trigger**: `{formBaseUrl}/{path}` (or `{formBaseUrl}/{webhookId}` if
  no custom path is set). Form Trigger lives under `/form/`, NOT `/webhook/` —
  they are separate URL prefixes. Do NOT use the Webhook base URL for Form
  Triggers.
- **Chat Trigger**: how the end user reaches this workflow depends on the
  node's `public` parameter — pick the right guidance for the current value,
  do not default to sharing a URL.
  - **`public: false` (the default)**: there is NO end-user HTTP URL. Tell the
    user to open the workflow in the editor and click the **Open chat** button
    on the workflow canvas — that opens the built-in test chat. Do NOT share a
    webhook URL, and do NOT suggest flipping `public: true` just to enable
    testing — the in-editor chat is the intended testing path for private chat
    workflows.
  - **`public: true`**: the public chat URL is
    `{webhookBaseUrl}/{webhookId}/chat` — share it after the workflow is
    published. `{webhookId}` is the node's unique webhook ID; read it from the
    workflow JSON, never guess. End users can open this URL in a browser.
  The `/chat` suffix is unique to Chat Trigger — do NOT append it to Form
  Trigger or Webhook URLs. (Your own testing via `executions(action="run")` and
  `verify-built-workflow` works regardless of `public` or publish state.)

**These URLs are for sharing with the user only.** Do NOT hardcode them into
workflow code or build specs unless the workflow actually needs to send or
store its own public endpoint.
