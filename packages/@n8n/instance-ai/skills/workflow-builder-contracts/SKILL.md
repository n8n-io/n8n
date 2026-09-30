---
name: workflow-builder-contracts
description: >-
  Load before calling build-workflow. Default path for all single-workflow
  work: new one-off workflows, existing-workflow edits, verification repairs,
  and workflow-local data tables. Write the complete TypeScript SDK source and
  pass it to build-workflow as sourceCode. The host validates it. When the
  workflow creates or writes Data Tables, load data-table-manager first, then
  this skill. Do not load planning or create-tasks first. Load planning only
  when multiple coordinated workflows or shared cross-task data tables require
  a dependency-aware task graph. For one-off tasks that one node execution can
  do, load one-off-operations and use nodes(action="execute").
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

You write complete TypeScript with `@n8n/workflow-sdk`. The host compiles and
saves it. Do not produce visible output until the final step, unless blocked.

When the workflow creates or writes Data Tables, load `data-table-manager`
first. Call `data-tables(action="schema")` before you use a table. Column
names are snake_case.

## Process

1. Discover nodes. Call `nodes(action="search")` with short service names
   ("Gmail", not task phrases). For a node with an action contract, the result
   contains the contract view. Use `nodes(action="suggested")` only when you do
   not know which nodes to use.
2. Get the remaining definitions in ONE `nodes(action="type-definition")` call
   with all node ids. Do not fetch definitions that you already have.
3. Resolve real resource IDs with `nodes(action="explore-resources")` when a
   credential is available. For new model choices, follow `model-selection`.
4. Call `credentials(action="list")` when the task touches external services.
5. Write the complete source. Call `build-workflow` with a stable `filePath`
   (for example `src/workflows/main.workflow.ts`) and the complete source as
   `sourceCode`. Do not write files, do not run `workflow-sdk validate`, and
   do not use the sandbox. The host validates SDK structure, contract
   parameters and expression types.
6. If the build returns errors, fix all of them in the source. Call
   `build-workflow` again with the same `filePath` and the complete source.
   Do not retry the same failing approach more than twice.
7. After a successful build, if the output contains
   `postBuildFlow.required: true`, follow the inlined
   `postBuildFlow.instructions`. Do not load `post-build-flow` separately. Do
   not call `verify-built-workflow` directly for direct builds.

For an existing workflow, call `workflows(action="get-as-code", workflowId)`.
It returns a bound `filePath`. Make the smallest requested change and call
`build-workflow` with that `filePath`. Keep every `config.id` exactly as
`get-as-code` produced it. Omit `id` and `position` on new nodes. When a
repair targets a failing node, inspect the real error with
`debugging-executions` first. Do not guess.

For planned build follow-ups with `buildTask.isSupportingWorkflow === true`,
pass `isSupportingWorkflow: true`. When the new workflow has a known folder,
pass `folderPath`.

## Nodes

Write a node that has a contract with `action`, exactly as the contract view
shows:

```ts
const pages = action('notion.databasePage.getAll', {
  name: 'Get Tasks',
  parameters: { /* the contract input */ },
  credentials: { notionApi: newCredential('Notion') },
});
```

Use `node()` and `trigger()` only for nodes without a contract, for example
triggers, IF, Switch, Merge and Code. Use the type definition for their
parameters.

- Native node first. Use Set, Filter, IF, Switch, Sort, Aggregate, Split Out,
  Limit and Merge with expressions. Use a Code node only for logic that needs
  three or more native nodes. Write Code nodes in JavaScript unless the user
  asks for Python.
- SDK code builds a static graph. It does not run. Do not use `.map()` or
  other runtime logic in it.
- Do not set node positions. Do not add `sticky()` notes unless the user asks.
- Tool subnodes need a concise snake_case `name` (`get_email`), with no
  service prefix.

## Expressions

- Use `expr('{{ $json.field }}')`. `$json` is the current item from the
  immediate predecessor only.
- Read upstream contract outputs with the field names in the contract output
  schema. The build reports type mismatches as `CONTRACT_EXPRESSION_TYPE`.
  Fix the reference. Do not add defensive code (`|| []`, `typeof` checks)
  for fields that the contract types.
- Use `$('Node Name').item.json.field` or `nodeJson(node, 'field')` for
  values from further upstream, in AI subnodes, and after IF, Switch or
  Merge. Do not use `.first()` for per-item data.

## Output samples

Add `output` sample items only when verification needs pin data: a node with
an unresolved credential, or a live or nondeterministic node (HTTP, search,
AI) that feeds IF or Switch logic whose branches need proof.

- Samples are raw `$json` objects: `output: [{ id: 'a1' }]`, not
  `[{ json: { ... } }]`.
- Include every field that downstream expressions read.
- Give list results at least two items.
- Match the documented payload shape of third-party webhooks.

## Placeholders and credentials

- Use `placeholder('descriptive hint')` for values that only the user knows:
  recipients, chat IDs, custom URLs, and resource IDs with several candidates.
  Use it directly as the value. Do not wrap it in `expr()`.
- Never hardcode fake values (`user@example.com`, `YOUR_API_KEY`). Keep real
  values that the user gave or that you discovered.
- Use `newCredential('Name', 'credential-id')` only for a credential that the
  user selected, a single clear match, or the credential that the workflow
  already had. Otherwise use `newCredential('Suggested Name')`. Never write
  raw credential objects.
- When the user asks for a new credential, pass its type in
  `preferNewCredentials` on `build-workflow` and on `workflows(action="setup")`.
- Credentials in `resolvedCredentialsByNode` are connected. Do not ask the
  user to connect them.
- If no instance exists for a named service, call
  `credentials(action="search-types")`. Prefer a dedicated type. Then prefer
  `httpTemplatedCustomAuth` for API keys and bearer tokens: load
  `credential-recipe-research` before setup. Use plain generic types only
  when a template cannot express the auth, or when the user asks.
- A node with `aiGateway.supported === true` runs without an API key. Prefer
  it when the user named no tool and has no credential for a similar one. To
  use it, write `newCredential('Gateway credits', '__AI_GATEWAY_MANAGED__')`.
  Call it "Gateway credits" in chat.
- Inbound triggers (Webhook, Form, Chat) keep authentication `none` unless
  the user asks.

Do not ask for setup values before the first successful build. Placeholders
and `newCredential()` cover them. Use `ask-user` before the build only when a
choice changes the intent or topology. Never ask for secrets.

## Workflow rules

1. Zero items end a branch. Do not add empty-check gates. When a digest or
   alert must still send, set `alwaysOutputData: true` on each node that can
   emit zero items before it.
2. Use `executeOnce: true` on a node that gets many items but must run once.
3. Wire IF on the workflow builder: `.to(ifNode).onTrue(a).onFalse(b)`.
   Switch uses zero-based `.onCase(index, target)`. Never wire branches as
   statements after `export default`.
4. Input and output indices are zero-based.
5. A Filter or IF only selects items. Wire the requested action on the
   matching path.
6. A write node outputs its API response, not its input. When you insert it
   into a chain, branch it in parallel or reference the data node explicitly.
7. A polling trigger that creates records must process each item once: mark
   the item handled after the record exists, or record handled ids in a Data
   Table.
8. `.onError(handler)` routes the error output. Call it once per handler.
9. When the top level has more than {{TOP_LEVEL_ITEM_CEILING_PLACEHOLDER}}
   items, add `.group(name, members, { description })`, or pass
   `groupingDecision: 'not_warranted'` with a `groupingReason`.

## Verification and completion

Build success is not proof that the workflow works. Say that a workflow works
only after `verify-built-workflow` or `executions` ran the claimed path.
Otherwise, say what you could not verify. Do not publish automatically.

Finish with one sentence that names the workflow and what changed. Include
the workflow ID. If setup is necessary, say so. For a Webhook trigger, share
`{webhookBaseUrl}/{path}`. For a Form trigger, share `{formBaseUrl}/{path}`.
For a private Chat trigger, tell the user to click **Open chat** on the
canvas.
