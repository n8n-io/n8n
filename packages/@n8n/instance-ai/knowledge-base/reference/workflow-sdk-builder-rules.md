# Workflow SDK builder code rules

Rules for writing TypeScript SDK builder source files. Read before writing or
editing `.workflow.ts` files. For allowed/forbidden language constructs, see
`workflow-sdk-language.md`.

## Contents

- Language subset
- Code node runtime limits
- File structure
- Parameters and placeholders
- Resource locators
- Default import shape

## Language subset

SDK builder code is a restricted subset of TypeScript that builds a static
graph; it is not a Code node and does not run. Only SDK builder methods chain
on SDK objects. Native array/string methods (`.join()`, `.map()`), loops, arrow
functions, `new`, and globals like `Math`, `Date`, and `Object` are unavailable.
Build strings with template literals or explicit lines; do runtime joining,
aggregation, or transforms in a Code node or an n8n expression (`expr()`).

## Code node runtime limits

Code nodes have NO network access at runtime: `fetch()`, `axios`,
`XMLHttpRequest`, and `require` of http modules all fail in the sandbox. Make
every HTTP/API call with the HTTP Request node and transform its output in a
Code node, even when the user asks to fetch inside a Code node.

## File structure

- Use `@n8n/workflow-sdk`.
- `export default workflow(...)...` must be the last statement in the file, with
  all wiring composed inside that chain. Statements after it (e.g.
  `ifNode.onTrue(...)`) do not reach the builder and their nodes are dropped.
- Do not specify node positions. They are auto-calculated by the layout engine.
- When editing a pre-loaded workflow, remove `position` arrays from node configs;
  they are auto-calculated.
- Do not use TypeScript-only syntax that the workflow parser cannot interpret,
  such as `as const`.
- Use string values directly for discriminator fields like `resource` and
  `operation`, for example `resource: 'message'`.
- For single-execution nodes that receive many items but should run once, set
  `executeOnce: true`.

## Parameters and placeholders

- Use `expr('{{ $json.field }}')` for n8n expressions. Variables must be inside
  `{{ }}`. `$json` is only the current item from the immediate predecessor.
- Use `placeholder('hint')` directly as the parameter value. Do not wrap
  placeholders in `expr()`, objects, or arrays unless the node definition
  explicitly expects an object and the placeholder is the direct value of one
  field.

## Resource locators

For unresolved resource-locator fields (values shaped like `{ __rl: true, mode,
value }`, such as Slack channel or Google Sheets document selectors), use the
resource-locator object shape instead of a raw `placeholder()` string. Prefer
the locator's picker (`list`) mode when it offers one, since it gives the user a
searchable picker at setup, with an empty value and a `cachedResultName` hint,
for example `{ __rl: true, mode: 'list', value: '', cachedResultName: 'Select support channel to monitor' }`.
A `list`-mode `value` is an opaque ID picked from that list (a Slack channel ID,
a numeric sheet gid) — never place a human-readable name or title there; it
cannot resolve. When the user names the resource (a channel like `#team-updates`,
a sheet title, a board name) or you assumed a name (like `Sheet1`), use the
locator's `name` mode with that exact value if it has one — never leave the
locator empty when a name is known. Only leave `list` mode empty (as above) when
nothing about the resource is known. Not every locator has a `list` mode; when it
doesn't, use a `name`/`url` mode with the known value, or `id` mode only when you
have a concrete ID. Never use `id` with an empty or placeholder value.

## Default import shape

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
