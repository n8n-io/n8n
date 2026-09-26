---
name: workflow-builder
recommended_mode: build
description: >-
  Load before calling build-workflow. Default path for all single-workflow
  work: new one-off workflows, existing-workflow edits, verification repairs,
  and workflow-local data tables. Write or edit a workspace source file, run
  workflow-sdk validate via workspace_execute_command, then call build-workflow
  with filePath. When the workflow creates or writes Data Tables, load
  data-table-manager first, then this skill. For several workflows, build
  them one at a time with this skill, dependencies first.
  Don't use this skill for explicit one-off tasks that can be done by a single
  node execution: load one-off-operations and run the node with
  nodes(action="execute"). Also load for a workflow's evaluations, model
  choices, credential setup, and post-build verification: this skill lists the
  references for those steps.
---

# Workflow Builder

You write n8n workflows as `@n8n/workflow-sdk` TypeScript in a workspace source
file and save them with `build-workflow({ filePath })`.

- **New workflow:** write the source with `workspace_write_file`, then build.
- **Existing workflow:** `workflows(action="get-as-code", workflowId)` writes a
  bound source file and returns its `filePath` and a node index. Read only the
  lines you need, edit with `workspace_str_replace_file`, and build the same
  `filePath`. Never rewrite the whole file or fetch it again in another format.
- **Repair:** when the user reports an erroring node,
  inspect it first via `debugging-executions` — never guess. Make the smallest
  edit. When you insert a node into a chain, apply workflow rule 6.
- **Several workflows:** build them one at a time in dependency order, and
  reference each saved workflow ID from the next.
- **Known node types:** batch `nodes(action="type-definition")`
  together with the `load_skill` call for this skill in your first turn. Each
  extra turn resends the whole context.

## Escalation

If the service or workflow shape is clear, never stop before the first
`build-workflow` call to ask for setup values (recipients, accounts, resources,
credentials, channel IDs, timezone). Use placeholders or unresolved
`newCredential()` calls instead.

- **Before the first build:** ask only when a missing choice changes the
  workflow's intent or topology, such as the destination service. If that
  choice is a service the user did not name and they have no credential for a
  comparable tool, use a Gateway credits–covered node instead of asking.
- **After the first build:** ask only when stuck or genuinely ambiguous. Do not
  retry a failing approach more than twice.
- **Skipped or answered questions:** never re-ask them. A skip grants no
  permission to change authentication, delete nodes, or expand scope: keep the
  existing state and report the blocker. Choose defaults only for unspecified
  details within the task.
- **Secrets:** never ask for them through `ask-user`; setup surfaces collect
  credentials.

## Placeholders

Use `placeholder('descriptive hint')` for values only the user can supply.
`workflows(action="setup")` opens an inline setup card in the
n8n Assistant panel where the user fills them in.

- **Use one for:** undiscoverable values (email recipients, phone numbers,
  custom URLs, notification targets, chat IDs), and resource IDs where
  `nodes(action="explore-resources")` returns several candidates and the user
  named none. Resource-locator fields take the locator form instead (see
  [Placeholders and resource locators](#placeholders-and-resource-locators)).
- **Never fake a value:** no `user@example.com`, `YOUR_API_KEY`, bearer tokens,
  or sample channel IDs and recipient lists.
- **Keep what you know:** preserve a real URL, channel name, table name,
  label, folder, or database from the prompt, and placeholder only the unknown
  part.

## Knowledge Base

**Prefer n8n sources over guessing.** For node setup, credentials, hosting, or
product behavior, check these in order instead of answering from memory:

1. **Knowledge base** — read the guides and templates for each technique the
   request uses. Skip only for trivial edits you already reviewed this thread.
   - `${N8N_WORKSPACE_DIR}/knowledge-base/index.json` — catalog of guides and
     reference docs.
   - `${N8N_WORKSPACE_DIR}/knowledge-base/templates/` — SDK workflow examples.
     Find matches with `rg` or `find` and read only those `.ts` files;
     never load `templates/index.json` wholesale.
   - `${N8N_WORKSPACE_DIR}/node-types/index.txt` — searchable node catalog.
2. **Runtime skills** — when one matches (e.g. `data-table-manager`,
   `debugging-executions`), load it and follow it.
3. **Official docs** — load `n8n-docs-assistant` and call `n8n-docs`. Prefer
   it over web search.

Before writing code, also read these when they apply:

- `${N8N_WORKSPACE_DIR}/knowledge-base/reference/workflow-builder-guardrails.md`
  — for multiple external systems or effects, digests or reports, non-trivial
  branching, or Code nodes.
- `${N8N_WORKSPACE_DIR}/knowledge-base/reference/open-ai-output-shape.md` or
  `anthropic-output-shape.md` — before mapping fields from those nodes.
  Neither returns its text as `$json.text`.

## Workflow-Level Error Workflows

Error workflows are per-target-workflow (`settings.errorWorkflow` must be the
real workflow ID of a separate **published** workflow with an active Error
Trigger — never a name, placeholder, `activeVersionId`, or local SDK id).
n8n has no global error workflow setting; mention that only if the user asks
about global behavior. Do not offer or build an error workflow before the
primary workflow is published. Before building or attaching an error
workflow, load the `error-workflows` reference and follow its build → publish
→ assign steps.

## Mandatory Process

Do not produce visible output until the final step, unless blocked.

1. **Find nodes.** Research only what the request needs. Use
   `nodes(action="suggested")` when the workflow fits a known category, and
   `nodes(action="search")` with short service names ("Gmail", not task
   phrases) for specific services.
2. **Read definitions.** Call `nodes(action="type-definition")` only for nodes
   you will use (up to five per call, with discriminators). Follow
   `@builderHint`, `@default`, enum values, credential types, and display
   conditions. If a setting is still unclear, use a placeholder; never guess.
3. **Resolve resources.** For every `searchListMethod` or `loadOptionsMethod`
   parameter (calendars, sheets, channels, folders, databases, models), call
   `nodes(action="explore-resources")` when a credential exists, including
   Gateway credits. For a new model choice, follow `model-selection` first.
4. **Write the source.** Use a stable `filePath` (`src/workflows/main.workflow.ts`
   for a new workflow, or the one `get-as-code` returned). When you know the
   workflow's folder, read its siblings with `workflows(action="list",
   folderPath)` and match their naming and structure. Never put secrets in
   the file. While writing, decide:
   - **Fixtures:** when a live or nondeterministic node feeds IF/Switch logic
     and other branches need verification, give it representative `output`
     fixtures so `fixtureOverrides` can drive those branches later.
   - **Grouping:** `.group(...)` lives in the code, so decide now. See
     [Node Groups](#node-groups).
5. **Validate** the workspace source file with `workspace_execute_command`:
   `node --import tsx node_modules/@n8n/workflow-sdk/dist/cli/index.js validate <filePath>`
   Fix every `error` row in new workflows. In edits, fix only errors your
   change caused and leave unrelated code alone; `build-workflow` decides what
   still blocks. Warnings do not block. A clean run does not guarantee the
   build succeeds.
6. **Build** with `build-workflow({ filePath })`.
   - New workflow with a known home: pass `folderPath` as the user named it
     (`Clients/Acme`). An unknown folder fails the build and lists the real
     ones. Move an existing workflow with
     `workspace(action="move-workflow-to-folder")`.
   - Pass the real n8n `workflowId` only on the first build of a file you
     wrote yourself for an existing workflow. Never pass a local SDK id.
7. **Trace the wiring.** Follow every IF, Switch, Merge, agent, loop, and
   sub-workflow branch from source to target. Both IF outputs must connect,
   every requested side effect must sit on a wired branch, Merge modes must
   fit the data, and sub-nodes must attach to the right parent.
8. **Fix and rebuild** in the same file: validate again, then build the same
   `filePath`.
9. **Hand off.** When the build result has `postBuildFlow.required: true`,
   follow the inlined `postBuildFlow.instructions` before any verification,
   setup, publishing, or summary. Do not load `post-build-flow` separately,
   and do not call `verify-built-workflow` directly for direct builds.

## Verification

Build/save success is not workflow-quality evidence. After a build, the inlined
`postBuildFlow.instructions` own verification, setup, publishing, and the final
message. When you verify or repair without them:

- **Inspect first:** read the bound source file, or call
  `workflows(action="get-as-code", workflowId)` if the workflow may have
  changed elsewhere (on `conflict`, build or discard the unbuilt edits first).
  Judge the saved graph against the user's outcome.
- **Verify:** prefer `verify-built-workflow`. Pass `workflowId` when the
  `workItemId` is gone, and `fixtureOverrides` to reach alternate branches.
  Load `trigger-input-data-shapes` for `inputData`.
- **Repair:** `shouldEdit: false` means stop editing and follow its guidance.
  `shouldEdit: true` means one batched repair, a rebuild of the same
  `filePath`, and a retry. After two repair rebuilds, stop and explain the
  blocker.
- **Claims:** call a workflow fixed, verified, or working only after a
  `verify-built-workflow` or `executions` run exercised that path. Re-run
  before you dismiss a live error as a harness artifact.
- **Publishing:** never publish the main workflow automatically.

## Credential Rules

Call `credentials(action="list")` early for external services, and note each
credential's `id`, `name`, and `type`.

- **Existing credential:** write
  `newCredential('Credential Name', 'credential-id')` only when the user chose
  it, exactly one match exists, or the workflow already had it. Otherwise write
  `newCredential('Suggested Name')`: the build mocks it and setup collects the
  real one. Never write raw `{ id, name }` credential objects, invented
  credential IDs, `mock-*` IDs, or hardcoded auth values.
- **New credential on request:** pass the type in `preferNewCredentials` on
  `build-workflow` and `workflows(action="setup")` (or `preferNew: true` in
  `credentials(action="setup")`). Without it, the build attaches their only
  existing credential of that type. Never pass it by default.
- **Already connected:** nodes in `resolvedCredentialsByNode` (a stored
  credential, or Gateway credits with `__aiGatewayManaged: true`) need no
  setup. Do not ask the user to connect them.
- **No instance for a named service:** call
  `credentials(action="search-types")`, then pick in this order:
  1. A dedicated type. On HTTP Request, set
     `authentication: 'predefinedCredentialType'` and `nodeCredentialType`.
  2. `httpTemplatedCustomAuth` (set as `genericAuthType`) for header, query, or
     body auth, bearer tokens included: template
     `{"headers":{"Authorization":"Bearer {{api_key}}"}}` instead of
     `httpBearerAuth`. Load `credential-recipe-research` before setup. Setup
     rejects new Bearer, Header, Query, and Custom Auth credentials on HTTP
     Request nodes unless the user asked for that type
     (`allowPlainGenericAuth: true`).
  3. `httpBasicAuth`, `httpDigestAuth`, or `oAuth2Api` only for basic, digest,
     or OAuth flows, or on user request.
- **Gateway credits:** list results may include an entry with
  `id: "__AI_GATEWAY_MANAGED__"`. Write
  `newCredential('Gateway credits', '__AI_GATEWAY_MANAGED__')` when the user
  asks for Gateway credits. The build attaches it by itself when the user has
  no stored credential of a covered type.
- **Inbound triggers** (Webhook, Form, Chat, MCP Trigger) keep authentication
  `none` unless the user asks to secure them.
- **Several interchangeable services:** when discovery returns
  `setupPreference`, load `credential-setup-preference` before choosing.

## Gateway credits Preference

Gateway credits let covered AI-provider and scraping nodes run with no API key
from the user.

- **Node choice:** covered nodes show `aiGateway.supported === true` in
  `nodes` search and describe results. Search rank ignores coverage, so for a
  capability the user has no credential for, search that capability (or run
  `nodes(action="list", gatewayCreditsOnly=true)`) and prefer a covered node.
  Skip this when the user named a tool or has a credential for a comparable
  one.
- **Constraints:** set `typeVersion >= aiGateway.minVersion`, use only the
  resources and operations in `aiGateway.operations` (key `__operation_only__`
  when the node has no resource), and never set `aiGateway.hiddenProperties`.
- **Credential choice:** a stored credential always wins; the build never
  replaces it with Gateway credits. Use Gateway credits only when the user has
  no stored credential of that type or asks for them, and never replace an
  existing or user-chosen credential.
- **Depleted:** when `credentialResolutionNote` says Gateway credits are
  depleted, tell the user to top up or add their own key on the node. Do not
  claim the workflow works or offer a live test.
- **Naming:** in chat, say only "Gateway credits" — never "n8n credits",
  "n8n Connect", "AI Gateway", "gateway", or the `aiGateway` field name.

## Missing Resources

When `nodes(action="explore-resources")` returns no results for a required
resource:

1. If the resource can be represented as a user choice, use
   `placeholder('Select <resource>')` (or the empty `list` locator for a
   resource-locator field) and let setup collect it. When the
   persistent setup panel is enabled, the user can fill announced requirements
   during the build; do not tell them to wait until the build finishes.
2. If the user explicitly asked you to create the resource and the node type
   definition has a safe create operation, build and verify that
   resource-creation workflow as part of the requested work.
3. Otherwise, leave the main workflow as a saved draft and mention the missing
   resource in the one-line completion summary.

For resources that cannot be created via n8n, explain what the user needs to
create manually and what ID or value belongs in setup. If part of the requested
workflow is infeasible, apply the system prompt's Capability Honesty rules and
name the gap in the completion summary.

## Compositional Workflows

Only for large workflows with reusable chunks or independently testable parts:
decompose into supporting sub-workflows (`executeWorkflowTrigger` v1.1 with an
explicit input schema, built with `isSupportingWorkflow: true`) referenced from
the main workflow's `executeWorkflow` node (`source: 'database'`, real returned
`workflowId`), main workflow saved last. This is part of the approved build
task — not a reason to create a new plan, and simple
workflows stay in one workflow. Before writing multi-workflow code, load the
`compositional-workflows` reference for the required steps and SDK examples.

## Data Tables

Call `data-tables(action="schema")` before using a Data Table in workflow code.
Column names are normalized to snake_case (`dayName` becomes `day_name`), so
use the real names, and never invent table IDs, table names, or columns. Load
`data-table-manager` first when the workflow creates or writes tables.

## SDK Code Rules

`workflow-sdk validate` (step 5) catches Code-node network calls and imports,
nested template literals in `jsCode`, TypeScript-only syntax, code after
`export default`, `placeholder()` inside `expr()`, unsolicited `sticky()`,
forbidden builder constructs, and repeated `.onTrue()` / `.onFalse()` on one
IF. The rules below are the ones it cannot check.

### Code nodes

- **Native node first:** shape, compute, and format fields with
  **Edit Fields (Set)** and expressions. Filter, IF / Switch, Sort, Remove
  Duplicates, Aggregate, Split Out, Limit, and Merge cover the rest. Use a Code
  node only for multi-pass algorithms, `$getWorkflowStaticData` state,
  fence-stripping model output, try/catch around upstream access, or a step
  that would need three or more nodes.
- Write Code nodes in JavaScript unless the user explicitly asks for Python.
  `pythonNative` has only `_items`, `_item`, and `print()`, and no imports
  unless the **Python Code Nodes** section of your system prompt allows them.

### Builder code

- Builder code is a restricted TypeScript subset that builds a static graph
  and never runs. Build strings with template literals, and put runtime logic
  in `expr()` inside a native node. Allowed constructs and the
  "Native node mappings" table:
  `${N8N_WORKSPACE_DIR}/knowledge-base/reference/workflow-sdk-language.md`.
- Discriminators are plain strings: `resource: 'message'`.

### Node identity and layout

- **Layout:** never write a `position`, and never run `sed` or another
  whole-file substitution to change layout.
- **Ids:** keep every `config.id` from `get-as-code` exactly as it is, on its
  node, through renames, moves, and rewiring. Execution logs, poll cursors,
  and deduplication state are keyed on it. Omit `id` on new nodes, and delete
  it with a deleted node. Never invent, edit, reuse, or copy an `id`.

### Placeholders and resource locators

- Pass `placeholder('hint')` directly as the value. Do not wrap it in
  `expr()`, objects, or arrays, unless the definition expects an object and
  the placeholder is one field's direct value.
- For resource locators (`{ __rl: true, mode, value }`), use the object, never
  a bare `placeholder()`. A known or assumed name (`#team-updates`, `Sheet1`)
  goes in `name` mode. With nothing known, use an empty `list` mode with a
  `cachedResultName` hint. A `list` value is an opaque ID, never a name, and
  `id` mode takes only a concrete ID.

### Mock `output`

- SDK node `output` mocks are raw `$json` objects:
  `[{ orderId: 'ord_123' }]`, not `[{ json: { orderId: 'ord_123' } }]`. Code
  node `jsCode` still returns `{ json }` items.
- Include every field that later expressions read, including optional
  trigger fields such as Slack `subtype` or `bot_id`.
- Give collection responses at least two items, so `$input.first()` bugs show
  up in verification.
- Mock a third-party webhook with its documented envelope. AI and voice tool
  calls nest arguments in `body.message.toolCalls[0].function.arguments`.
- Declare `output` on nodes with unresolved credentials when verification
  needs their data.

## Node Groups

{{GROUPING_GUIDANCE_PLACEHOLDER}}

Declare a group with `.group(name, members, { description })` on the workflow
builder, with node handles as members. Before you write one, read
`${N8N_WORKSPACE_DIR}/knowledge-base/reference/node-groups.md` for the validity
rules and how to edit existing groups.

## Workflow Rules

1. **Empty branches:** zero items stop a branch. Do not add `alwaysOutputData`
   or empty-check IFs unless rule 3's mandatory-outcome case applies.
2. **Run once:** set `executeOnce: true` on a node that receives many items but
   should run once: a summary notification, a report, a shared-context fetch,
   or a call that does not vary per item. Duplicate notifications usually mean
   it is missing.
3. **Control flow:**
   - Per-item side effects: `splitInBatches` (`batchSize: 1`) looping back via
     `nextBatch`.
   - Drop non-matching items: `filter`.
   - Two exclusive paths that both do work: IF.
   - Many exclusive paths keyed on a value: Switch with zero-based
     `.onCase(index, target)`.
   - Filter and IF only select items. Wire the requested action (archive,
     update, delete, send, create) on the matching path.
   - Mandatory outcome with a possibly empty upstream (a digest must still
     send): set `alwaysOutputData: true` on every node before the effect that
     can emit zero items (often the fetch and the filter), not on the formatter
     or notifier. It emits one empty `{}` item, so the formatter must drop
     empty items before counting:
     `$input.all().filter(i => Object.keys(i.json).length > 0)`.
4. **Indices** are zero-based: `.input(1)` is the second input.
5. **Free text in Code nodes:** normalize before comparing ("≈ $12,500", "1.5k",
   "in three weeks", "ASAP"). Strip currency and separators, take the lower
   bound of ranges, match time units broadly, and give every classifier a
   fallback bucket.
6. **Inserting X into A→B:** B now reads X's output. Write, create, and send
   nodes output their API response (ids, `ok` flags), not their input, so an
   in-line insert silently replaces the payload. Branch X in parallel from the
   data producer, move it upstream of the producer, or have B read
   `$('Data Node')` explicitly.
7. **Polling triggers that create records:** poll cursors reset when the
   trigger is recreated or renamed, so every still-matching item comes back.
   Process each item once in one of two ways:
   - Restrict the trigger to unprocessed items, and mark each item handled in
     a way the trigger's filter excludes: mark as read when it filters unread,
     move it out of the watched folder, or add a label the query excludes (a
     label does not mark a message as read).
   - Record handled ids in a Data Table: look the id up before creating, skip
     seen ids, and insert the id after the create succeeds.

   Wire the mark-as-handled step after the create. A failure can then cause a
   rare duplicate, but never a lost item.

## Tool Naming Rules

Always set an explicit `config.name` on every `tool(...)` node — concise
snake_case action names (`get_email`, `add_labels`, `mark_as_read`) describing
what the tool does. Never prefix with the service/family name
(`gmail_get_email`, `slack_send_message` are wrong) unless the user explicitly
asked for that exact name.

## Node-Specific Rules

- Gmail archive: the message resource has no `archive` operation. Remove the
  `INBOX` label with `operation: 'removeLabels'` and `labelIds: ['INBOX']`;
  never invent an `ARCHIVE` label.

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
expr('Report for {{ $now.toFormat("MMMM d, yyyy") }} - {{ $json.title }}')
```

When `$json` is unsafe, reference the source node explicitly with
`$('NodeName').item.json.field` or `nodeJson(sourceNode, 'field.path')`. This
matters for AI Agent subnodes, fan-in nodes after IF/Switch/Merge, and values
that come from further upstream or from before a node that replaces item JSON:

```ts
sessionKey: nodeJson(telegramTrigger, 'message.chat.id')
```

Do not use `.first()` or `$input.first()` for per-item data in a multi-item
workflow; it always reads item 0 and makes every downstream item reuse the
first value. Use `.first()` only for a true global first item, such as a single
configuration row.

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

Switch cases, Merge inputs, error routes (`.onError(handler)`), Split in Batches
loops, and the other subnode factories follow the same builder pattern. Before
you write one, read the matching section of
`${N8N_WORKSPACE_DIR}/knowledge-base/reference/workflow-sdk-patterns.md`.

For AI Agent workflows:

- Attach language models, memory, tools, parsers, retrievers, vector stores, and
  other subnodes to the agent as subnodes.
- Prefer `fromAi(...)` for values the agent should supply to tools.
- Read trigger or main-flow values in subnodes with explicit node references
  (see [Expression Reference](#expression-reference)).

## Completion

Do not report a build as done until you have made the grouping decision in
[Node Groups](#node-groups) and checked what the build did with it:

- **Dropped-group warning:** it names what was invalid (a duplicate name, a
  missing member, a rejected boundary). Fix the source and build again; never
  re-emit the same group.
- **`GROUPING_DECISION_MISSING`:** the build was refused. Add groups, or pass
  `groupingDecision: 'not_warranted'` with a `groupingReason` when the canvas
  is over the ceiling and no valid group fits.
- **`GROUP_DROPPED_OVER_CEILING`:** a declared group was invalid and the canvas
  is still over the ceiling. Fix the boundary the message names; the opt-out
  does not apply.
- If the top level is still above
{{TOP_LEVEL_ITEM_CEILING_PLACEHOLDER}} items with groups in place, name each
  remaining item and why it cannot join a group.

For a successful build, finish with one concise sentence naming the workflow and
what changed. Include the workflow ID when it is available. If setup is
required, say plainly that setup is needed; do not tell the user to open a setup
wizard or navigate away from the n8n Assistant panel. When the workflow exposes
a Webhook, Form, or Chat Trigger, load the `trigger-url-sharing` reference and
include the correct end-user URL (or in-editor chat guidance) in that summary.
