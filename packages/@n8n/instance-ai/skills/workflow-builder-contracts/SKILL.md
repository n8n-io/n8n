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

You write one typed TypeScript file. `tsc --strict` checks it. Do not produce
visible output until the final step, unless blocked.

## Process

1. Call `nodes(action="search")` ONCE with `queries`: one short query per
   service, e.g. `["notion get many pages", "http request", "slack"]`. Use the
   returned `nodeModules`. Use nodes from `results` with `node()`.
2. Get missing definitions in ONE `nodes(action="type-definition")` call.
3. Call `build-workflow` with a stable `filePath`
   (e.g. `src/workflows/main.workflow.ts`) and the complete source as
   `sourceCode`.
4. Fix every `file:line` error. Pass the full source again, or edit the file
   with `workspace_str_replace_file` and build with `filePath` only.
5. If the result has `postBuildFlow.required: true`, follow
   `postBuildFlow.instructions`.

For an existing workflow, call `workflows(action="get-as-code", workflowId)`,
make the smallest change, and build with the returned `filePath`. The file uses
this typed format. Keep its `node()` calls and its `'={{ … }}'` strings
(n8n expressions) unless the change needs them.

## Imports

Import the flow API from `@n8n/workflow-sdk/next` and each module from
`@n8n/nodes/<id>` with the `import` line that search returns.

```ts
import { workflow, manual } from '@n8n/workflow-sdk/next';
import { httpRequest } from '@n8n/nodes/httpRequest';
import { notion } from '@n8n/nodes/notion';

export default workflow(
  'Overdue tasks report',
  manual()
    .andThen(
      notion.databasePage.getAll({
        name: 'Overdue Tasks',
        database: '5b9e2c1d0a7f4c3e9d217f6a8b9c0d1e',
        where: {
          match: 'all',
          conditions: [
            { property: 'Status', type: 'status', condition: { op: 'does_not_equal', value: 'Done' } },
            { property: 'Due', type: 'date', condition: { op: 'before', value: (_item, $) => $.today.toISODate() } },
          ],
        },
      }),
    )
    .andThen(
      httpRequest.send({
        name: 'Post Report',
        method: 'POST',
        url: 'https://reports.acme.dev/overdue',
        body: { kind: 'json', json: (page) => ({ title: page.name, url: page.url }) },
      }),
    ),
);
```

- `.branch({ name, if: (item) => …, then: (f) => f.andThen(…), else: (f) => … })`
  adds an IF node. Without `else`, false items stop.
- `.orElse((failed) => failed.andThen(…))` handles the items that the last
  node fails on. `failed` items carry `error.message`.
- `set({ name, fields: { total: (item) => item.a + item.b }, keep: 'all' })`
  makes new fields. `keep: 'all'` also keeps the input fields.
- `node({ name, type, version, parameters })` adds a node without a module,
  with parameters from its type definition. Pass `sample` items to type its
  output. Use `trigger({ name, type, version, parameters })` for triggers
  other than `manual()`.

## Lambdas

A lambda becomes an n8n expression that runs for each item.

- Write `(item, $) => <one expression>`. A template literal becomes text.
- Read only `item`, `$`, and JavaScript globals (`Math`, `JSON`, `String`).
  Do not read local variables or constants from the file.
- `item` is the output item of the node before. Use `$('Node Name')` to read
  the paired item of an earlier node.
- `$.now` and `$.today` are Luxon dates. Use `$.date(iso)` to parse a string.
- Fix a type error at its cause. Do not add casts, `any`, or fallbacks.

## Values and credentials

- Keep real values that the user gave or that you discovered. Never invent
  IDs, emails, or URLs. When a resource is unknown, write one clear
  placeholder string, e.g. `'<Notion tasks database ID>'`, and tell the user.
- Do not write credentials in the source. The build binds the one stored
  credential that fits a node. Other credentials stay open for setup.
- Never ask for secrets.

## Workflow rules

1. Zero items end a path. Do not add empty-check gates.
2. A write action outputs its API response, not its input. Use
   `$('Node Name')` to read earlier data after it.
3. With more than {{TOP_LEVEL_ITEM_CEILING_PLACEHOLDER}} top-level items,
   pass `groupingDecision: 'not_warranted'` with a `groupingReason`.
4. Build success is not proof. Do not publish automatically.
