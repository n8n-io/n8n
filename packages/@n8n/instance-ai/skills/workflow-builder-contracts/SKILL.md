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

You write one typed TypeScript file. Show no output until the final step,
unless blocked. This skill and `nodes(action="type-definition")`
are the full API: do not read SDK files. Only `build-workflow` has
`@n8n/nodes/*` and runs `tsc`: do not run it.

## Process

1. Call `nodes(action="search")` ONCE with `queries`: one short query per
   service, e.g. `["notion get many pages", "http request", "slack"]`. Use the
   returned `nodeModules` and `builtIns`. Get `results` nodes in step 2.
2. Get other definitions in ONE `nodes(action="type-definition")` call.
3. Call `build-workflow` with a stable `filePath` and the complete source
   as `sourceCode`.
4. Fix every `file:line` error: pass the full source, or edit the file with
   `workspace_str_replace_file` and build with `filePath` only.
5. If the result has `postBuildFlow.required: true`, follow
   `postBuildFlow.instructions`.

For an existing workflow, call `workflows(action="get-as-code", workflowId)`,
make the smallest change, and build with its `filePath`. Keep its
`node()` calls and `'={{ … }}'` strings.

## Imports

Import the flow API from `@n8n/workflow-sdk/next`. The typed modules are
{{NODE_CONTRACT_MODULES_PLACEHOLDER}}: import them from `@n8n/nodes/<id>`.
Every other node, also a trigger or an AI node, has a derived module at
`@n8n/nodes/<package>/<name>`. Use `node()` only for a type without one.

```ts
import { workflow, manual, set } from '@n8n/workflow-sdk/next';
import { httpRequest } from '@n8n/nodes/httpRequest';
import { notion } from '@n8n/nodes/notion';

export default workflow(
  'Overdue report',
  manual()
    .andThen(
      notion.databasePage.getAll({
        name: 'Overdue',
        database: '5b9e2c1d0a7f4c3e9d217f6a8b9c0d1e',
        where: {
          match: 'all',
          conditions: [{ property: 'Due', type: 'date', condition: { op: 'before', value: (_item, $) => $.today.toISODate() } }],
        },
      }),
    )
    .andThen(
      httpRequest.send({
        name: 'Post',
        method: 'POST',
        url: 'https://acme.dev/report',
        body: { kind: 'json', json: (page) => ({ name: page.name }) },
      }),
    )
    .orElse((failed) => failed.andThen(set({ name: 'Log', fields: { reason: (e) => e.error.message } }))),
);
```

- `.orElse` goes after the `.andThen` of the node that can fail.
- `.branch({ name, if: (item) => …, then: (f) => f.andThen(…), else: (f) => … })`
  adds an IF node. Without `else`, false items stop.
- `.switch({ name, on, cases })`, `.merge({ name, join, branches })`, `.loop`,
  `.forEach`: Switch, Merge, loops.
- `.route(step, { a: (f) => …, b: (f) => … })` follows each named output;
  `.andThen` only the first.
- `set({ name, fields: { total: (item) => item.a + item.b }, keep: 'all' })`
  makes fields. `keep: 'all'` keeps input fields.
- `sample` items type the output and feed verification, e.g.
  `manual({ sample: [{ id: 1 }] })`.
- Typed steps and `node()` take `settings: { retryOnFail: true, notes: '…' }`.

## AI nodes

A derived AI node takes its providers in `providers`. A provider module
gives one, and `tsc` checks its slot:

```ts
agent.execute({ name: 'Agent', promptType: 'define', text: (item) => item.question,
  providers: { model: lmChatOpenAi.execute({ name: 'Model', model: { mode: 'id', value: 'gpt-5-mini' } }) } })
```

## Lambdas

- Write `(item, $) => <one expression>`. A template literal becomes text.
- Read only `item`, `$`, and JavaScript globals, never file constants.
- `item` and `$('Node')` are JSON: `$('Hook').body`, not `.json` or `.item`.
- `$.now` and `$.today` are Luxon dates. Use `$.date(iso)` to parse a string.
- A `'={{ … }}'` string fits any lambda field. The build checks it.
- In the editor, Expression mode adds the `=`: tell the user to type from `{{`.
- Fix a type error at its cause. Do not add casts, `any`, or fallbacks.

## Values and credentials

- Keep real values you got. Never invent IDs, emails, or URLs:
  write `placeholder('Database')` and tell the user.
- Do not write credentials: the build binds or asks for them. Never ask for secrets.

## Workflow rules

1. Zero items end a path. Do not add empty-check gates.
2. A write action outputs its API response, not its input: read earlier
   data with `$('Node Name')`.
3. With more than {{TOP_LEVEL_ITEM_CEILING_PLACEHOLDER}} top-level items,
   pass `groupingDecision: 'not_warranted'` with a `groupingReason`.
4. Build success is not proof. Do not publish automatically.
