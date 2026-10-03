---
name: workflow-builder-contracts
description: >-
  Load before calling build-workflow. Default path for all single-workflow
  work: new workflows, edits, and repairs. Load data-table-manager first when
  the workflow writes Data Tables. Load planning only for several coordinated
  workflows. For one-off tasks that one node execution can do, load
  one-off-operations.
recommended_tools:
  - build-workflow
  - workflows
  - nodes
  - data-tables
  - credentials
  - verify-built-workflow
  - executions
---

# Workflow Builder

Write one typed TypeScript file. Show no output until the end,
unless blocked. This skill and `nodes(action="type-definition")`
are the full API: do not read SDK files. Only `build-workflow` has
`@n8n/nodes/*` and runs `tsc`: do not run it.

## Process

1. Call `nodes(action="search")` ONCE with `queries`: one short query per
   service, e.g. `["notion get many pages", "http request"]`. Use the
   `nodeModules` and `builtIns`. Ask the user before you use
   `notInstalled` nodes.
2. Get `results` definitions in ONE `nodes(action="type-definition")` call.
3. Call `build-workflow` with a stable `filePath` and the source as
   `sourceCode`.
4. Fix every `file:line` error: pass the full source, or edit the file with
   `workspace_str_replace_file` and build with `filePath` only.
5. Follow `postBuildFlow.instructions` if `postBuildFlow.required` is true.

To edit a workflow, call `workflows(action="get-as-code", workflowId)`,
make the smallest change and build with its `filePath`. Keep its
`node()` and `expr()` calls.

## Imports

Import the flow API from `@n8n/workflow-sdk/next`. The typed modules are
{{NODE_CONTRACT_MODULES_PLACEHOLDER}}: import them from `@n8n/nodes/<id>`.
Every other node, even a trigger or AI node, has a derived module at
`@n8n/nodes/<package>/<name>`. Use `node()` only for a type without one.

```ts
import { workflow, manual, set, onError } from '@n8n/workflow-sdk/next';
import { notion } from '@n8n/nodes/notion';

export default workflow(
  'Overdue report',
  manual(),
  notion.databasePage.getAll({
    name: 'Overdue',
    database: '5b9e2c1d0a7f4c3e9d217f6a8b9c0d1e',
    where: { match: 'all', conditions: [{ property: 'Due', type: 'date', condition: { op: 'before', value: (_item, $) => $.today.toISODate() } }] },
  }),
  onError(set({ name: 'Log', fields: { reason: (e) => e.error.message } })),
  set({ name: 'Row', fields: { name: (page) => page.name } }),
);
```

- A workflow is a flat list: a trigger, then parts. Each part reads the
  items of the part before. A later trigger starts another flow.
- `onError(part)` takes the errors of the part before; its branch ends.
  `recover(part)` joins it back.
- A branch or body is one part: a step, a macro, or
  `steps(a, b, …)` for several.
- `when({ name, if: (item) => … }, { then: part, else: part })` adds an IF
  node. Without `else`, false items stop.
- `route(step, { a: part, b: part })` follows each named output; the next
  part only the first.
- `switchOn({ name, on }, { value: part, fallback: part })`,
  `merge({ name, join }, [part, part, …])`, `forEach({ name, batchSize }, body)`,
  `loop({ name, maxIterations, until, next?, onLimit? }, body)`: Switch, Merge,
  loops. `onLimit: 'continue'` ends at maxIterations: 'at most N'.
  The state is the item before `loop`: `set` it first.
- `set({ name, fields })` makes fields; `keep: 'all'` keeps input fields.
- `sample` items type the output and feed verification:
  `manual({ sample: [{ id: 1 }] })`.
- Typed steps and `node()` take `settings: { retryOnFail: true, notes: '…' }`.

## AI nodes

A derived AI node takes provider modules in `providers`:

```ts
agent.execute({ name: 'Agent', promptType: 'define', text: (item) => item.question,
  providers: { model: lmChatOpenAi.execute({ name: 'Model', model: { mode: 'id', value: 'gpt-5-mini' } }) } })
```

A typed action is also an agent tool: put `<action>Tool` in `tools`. The model
fills each `fromModel()` field:
`httpRequest.getTool({ name: 'Fetch', url: fromModel('The page URL') })`.

## Lambdas

- Write `(item, $) => <one expression>`. A template literal becomes text.
- Read only `item`, `$` and JavaScript globals, never file constants.
- `item` and `$('Node')` are JSON: `$('Hook').body`, not `.json` or `.item`.
- `$.now` and `$.today` are Luxon dates. `$.date(iso)` parses a string.
- `expr('{{ … }}')` fits a value field, not `if`, `until` or a binary field.
- Fix a type error at its cause: no casts, `any` or fallbacks.

## Values

- Keep real values. Never invent IDs, emails or URLs:
  write `placeholder('Database')` and tell the user.
- A value you tell the user to type never starts with `=`: the editor adds it.
- Never write credentials or ask for secrets: the build binds them or asks.

## Workflow rules

1. Zero items end a path. Do not add empty-check gates.
2. A write action outputs its API response, not its input: read earlier
   data with `$('Node')`.
3. Over {{TOP_LEVEL_ITEM_CEILING_PLACEHOLDER}} boxes, wrap stages (not a lone `forEach`) in `group({ name }, part)`
   or pass `groupingDecision: 'not_warranted'` and a `groupingReason`.
4. Build success is not proof. Do not publish automatically.
