---
name: workflow-builder-contracts
description: >-
  Load before calling build-workflow. Default path for all single-workflow
  work: new workflows, edits, and repairs. Write typed TypeScript with
  @n8n/workflow-sdk/next and pass it to build-workflow as sourceCode. Load
  data-table-manager first when the workflow writes Data Tables. Load planning
  only for several coordinated workflows. For one-off tasks that one node
  execution can do, load one-off-operations and use nodes(action="execute").
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
   service, e.g. `["notion get many pages", "http request", "slack"]`.
   `nodeModules` holds the typed module of each service that has one. Import
   it and call its actions. Other nodes come back in `results`. Use them with
   `node()`.
2. Get the remaining definitions in ONE `nodes(action="type-definition")` call.
   A module id (`notion`) or an action id returns the module text.
3. Write the complete source. Call `build-workflow` with a stable `filePath`
   (e.g. `src/workflows/main.workflow.ts`) and the source as `sourceCode`.
4. The host writes the file and runs `tsc`. Errors come back as `file:line`.
   Fix all of them. Pass the full source again, or edit the file with
   `workspace_str_replace_file` and build with `filePath` only.
5. After a successful build, if the output has `postBuildFlow.required: true`,
   follow `postBuildFlow.instructions`.

For an existing workflow, call `workflows(action="get-as-code", workflowId)`,
make the smallest change, and build with the returned `filePath`.

## Imports and actions

Import the flow API from `@n8n/workflow-sdk/next` and each module from
`@n8n/nodes/<id>`. Typed actions: `notion.databasePage.getAll`,
`httpRequest.get`, `httpRequest.send`, `googleSheets.sheet.read`,
`googleSheets.sheet.append`, `googleSheets.sheet.appendOrUpdate`,
`gmail.message.send`, `gmail.message.getAll`, `gmail.message.get`,
`googleGemini.text.message`. Every action takes `name` and its input fields
in one object.

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
- `node({ name, type, version, parameters })` adds a node without a module.
  Take the parameters from its type definition. Its output is untyped. Pass
  `sample` items to type it. Use `trigger({ name, type, version, parameters })`
  for triggers other than `manual()`.

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
- Do not write credentials in the source. When exactly one stored credential
  fits a node, the build binds it and reports it in
  `resolvedCredentialsByNode`. Otherwise it stays open for setup.
- Never ask for secrets.

## Workflow rules

1. Zero items end a path. Do not add empty-check gates.
2. A write action outputs its API response, not its input. Use
   `$('Node Name')` to read earlier data after it.
3. With more than {{TOP_LEVEL_ITEM_CEILING_PLACEHOLDER}} top-level items,
   pass `groupingDecision: 'not_warranted'` with a `groupingReason`.

## Verification and completion

Build success is not proof. Say that a workflow works only after
`verify-built-workflow` or `executions` ran the claimed path. Do not publish
automatically. Finish with one sentence that names the workflow, what
changed, and its ID. If setup is necessary, say so.
