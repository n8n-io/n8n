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

To edit a workflow, call `workflows(action="get-as-code", workflowId)`,
make the smallest change and build with its `filePath`. Keep its
`node()` and `expr()` calls.

## References

Load each one that applies with `load_skill` and `filePath`, in the
`nodes(action="search")` step:

- `references/flow-control.md`: `when`, `route`, `switchOn`, `merge`,
  `forEach`, `loop` or `group`.
- `references/ai-nodes.md`: an agent, chain or LLM node.
- `references/binary.md`: a file or attachment.
- `references/compositional-workflows.md`: sub-workflows the user asks
  for. Not loops.
- `references/error-workflows.md`: a separate Error Trigger workflow. Not
  `onError`.

## Imports

Import the flow API as below. The typed modules are
{{NODE_CONTRACT_MODULES_PLACEHOLDER}}: import them from `@n8n/nodes/<id>`.
Every other node, even a trigger or AI node, has a derived module at
`@n8n/nodes/<package>/<name>`. Use `node()` only for a type without one.

```ts
import { workflow, manual, set, onError } from '@n8n/workflow-sdk/next';
import { notion } from '@n8n/nodes/notion';

export default workflow(
  'Page report',
  manual(),
  notion.databasePage.getAll({ name: 'Pages', database: '5b9e2c1d0a7f4c3e9d217f6a8b9c0d1e' }),
  onError(set({ name: 'Log', fields: { reason: (e) => e.error } })),
  set({ name: 'Row', fields: { name: (page) => page.name } }),
);
```

- A workflow is a flat list: a trigger, then parts. Each part reads the
  items of the part before.
- `onError(part)` takes the errors of the part before; its branch ends.
  `recover(part)` joins it back.
- `when`, `route`, `switchOn`, `merge`, `forEach` and `loop` branch, join
  and repeat parts.
- `set({ name, fields })` makes fields; a key `'a.b'` nests. `keep: 'all'`,
  `{ selected }` or `{ except }` keeps input fields.
- `sample` items type the output and feed verification:
  `manual({ sample: [{ id: 1 }] })`.
- Typed steps, `set` and `node()` take `settings: { retryOnFail: true, notes: '…' }`.

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
3. Build success is not proof. Do not publish automatically.
4. Over {{TOP_LEVEL_ITEM_CEILING_PLACEHOLDER}} boxes (a node, loop or group is one), also
   after an edit, wrap each stage in `group()`.
