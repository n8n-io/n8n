---
name: workflow-builder
description: >-
  Once the user wants a workflow, load it before you ask about that workflow. Use for new one-off
  workflows, edits, repairs and verification of one workflow, and for its
  credentials, model choices, evaluations and error workflow. For any other new
  workflow, load intent-recognition first when it is listed. If the workflow
  writes Data Tables, load data-table-manager first. Do a one-time request (no
  repeat or trigger words) now, without asking whether to repeat it; for one
  node, load one-off-operations and use execute_node.
---

# Workflow Builder

## Routing

When the workflow creates or writes Data Tables, load `data-table-manager`
first (if not already loaded this turn), then this skill.

You write TypeScript with `@n8n/workflow-sdk`. All work goes through one
workspace source file and `workflow_builder_build_workflow({ filePath })`:

- **New workflow:** write the complete source with `workspace_write_file`
  (typically `src/workflows/main.workflow.ts`), then build.
- **Edit or repair of a saved workflow:** reuse the source file already in
  context. If you only have a workflow ID, call
  `get_workflow_as_code(workflowId)`: it writes the source to a bound
  `src/workflows/<name>.workflow.ts` file and returns the `filePath` plus a
  `nodes` index with line numbers. Read only the lines you need, make the
  smallest edit with `workspace_str_replace_file`, then build with the same
  `filePath` (no `workflowId` needed; the build remembers it). Never re-emit the
  whole source, and do not fetch the same unchanged workflow again.

When the needed node types are already obvious from the request, make one
`find_tools` call for every catalog tool the build will need (for example
`search_nodes`, `get_node_types`, `workflow_builder_build_workflow`,
`workflow_builder_verify_built_workflow`) in the same response as the
`load_skill` call for this skill. Each extra sequential turn resends the whole
context.

## Process

1. **Find nodes.** If unsure which nodes fit, call
   `search_nodes` with `categories` (`notification`, `data_persistence`, `chatbot`, `scheduling`,
   `data_transformation`, `data_extraction`, `document_processing`,
   `form_input`, `content_generation`, `triage`, `scraping_and_research`). Use
   `search_nodes` with `query`/`queries` and short service names ("Gmail") for
   service-specific nodes.
2. **Read definitions.** Call `get_node_types` with the exact node IDs and
   discriminators you will use (up to ten per call). Follow `@builderHint`,
   `@default`, enum values, credential types and display conditions.
3. **Resolve real values.** For each `searchListMethod`, `loadOptionsMethod` or
   `resourceLocator` parameter, call `get_node_parameter_options` when a
   credential is available. For new model choices, follow `model-selection`.
4. **Announce credentials early.** When the `setup_credentials` schema offers
   `filePath`, call it with the complete list of known credential types right
   after the first node definitions, as the only tool call in that response.
   Wait for `preBuild: true`, then continue. Otherwise use the post-build setup.
5. **Write the source.** Decide node groups now (see [Node Groups](#node-groups)).
   When a live or nondeterministic node feeds IF/Switch logic whose branches
   need verification, declare `output` fixtures on it.
6. **Build.** Call `workflow_builder_build_workflow` with the `filePath`.
   Do not run a separate validation command before the build: the build runs the
   graph checks, the SDK source lint and the node schema checks.
   - For new workflows, fix every blocking error.
   - For edits, fix only the errors that your change introduced, and keep
     unrelated existing nodes and code.
   - Errors and warnings block the save. Informational findings do not.
   - If the save stays blocked, report the blocker. Do not expand the scope.
7. **Trace wiring.** For IF, Switch, Merge, AI-agent, loop or multi-workflow
   wiring, trace each branch from source to target in the saved graph. Every
   requested side effect must be on a wired branch.
8. **Hand off.** If the build output contains `postBuildFlow.required: true`,
    follow the inlined
    `postBuildFlow.instructions` before verification, setup, publishing,
    testing, or any final summary. Do not call
    `workflow_builder_verify_built_workflow` directly from this skill for direct builds.

Keep visible text for the final step, unless blocked.

## Asking and placeholders

If the service or workflow shape is clear, never stop before the first
`workflow_builder_build_workflow` call to ask for setup values (recipients,
IDs, channels, credential choices, timezone). Use
`placeholder('descriptive hint')` for values only the user knows, and
unresolved `newCredential()` calls. Never hardcode fake values, and never ask for
setup values before the first successful build: `setup_workflow` opens an
inline setup card in the n8n Assistant panel afterwards. Use `ask_user`
before the build only when a missing choice changes the workflow's intent or
topology. Never solicit secrets through `ask_user`.

## Knowledge sources

**Prefer n8n sources over guessing.** Consult, in this order:

1. Knowledge base available in the sandbox workspace, read with the workspace tools (not `load_skill`):
   `knowledge-base/index.json` (technique guides and reference docs),
   `knowledge-base/templates/`
2. A matching runtime skill (`data-table-manager`, `debugging-executions`, …).
3. Official n8n docs: load `n8n-docs-assistant` and call `n8n-docs`.

For workflows with several external systems or effects, digests, non-trivial
branching or Code nodes, read
`knowledge-base/reference/workflow-builder-guardrails.md` before writing code.

## References

Load a reference only when its trigger applies:

- Multi-workflow decomposition (reusable or independently testable parts):
  `compositional-workflows`.
- The user explicitly asks for a **new** credential, or you choose HTTP Request
  authentication: the `credential-choices` reference.
- Discovery results carry `setupPreference` or `aiGateway`, `list_credentials`
  returns a Gateway credits entry, or the user asks about Gateway credits:
  `service-selection`.
- Diagnosing a Data Table lookup miss: the `data-table-playbook` reference,
  before the first `query_data_table` call.
- Building or attaching an error workflow: the `error-workflows` reference.
  `settings.errorWorkflow` must be the real ID of a separate published
  workflow; n8n has no global error workflow setting.

## Verification

The inlined `postBuildFlow.instructions` decide who verifies and how. This
section applies only when they or the current turn make you responsible.

Build/save success is not workflow-quality evidence. Inspect the persisted
workflow (the bound source file, or `get_workflow_as_code(workflowId)` when it
may have changed outside this conversation) and judge it against the user's
requested outcome. Claim a workflow works only from a
`workflow_builder_verify_built_workflow` or `run_workflow` run that exercised
the claimed path; otherwise say what you could not verify.

The job is done when the workflow is verified by tool evidence, setup is routed
or deferred, a remediation guard says `shouldEdit: false`, or you are blocked
after one repair attempt per unique failure signature. On `shouldEdit: true`,
make one batched repair in the source file and rebuild with the same `filePath`.

## Credential Rules

- Call `list_credentials` early when the task touches external services.
- Use `newCredential('Credential Name', 'credential-id')` only when the user
  selected a credential, exactly one unambiguous match exists, or the workflow
  already had it. Otherwise use `newCredential('Suggested Credential Name')`;
  setup collects real ones later.
- When `list_credentials` has no suitable instance, call
  `search_credential_types` and prefer a dedicated credential type.

## SDK Code Rules

The SDK source lint in `workflow_builder_build_workflow` reports common SDK and
Code-node defects, such as forbidden imports in Code nodes or an
unsolicited `sticky()`. Fix every reported finding, then build again.

- Native node first: shape, compute and format fields with **Edit Fields (Set)**
  and expressions; use **Filter**, **IF** / **Switch**, **Sort**, **Remove
  Duplicates**, **Aggregate**, **Split Out**, **Limit** and **Merge** for the
  rest. A Code node is only for multi-pass algorithms, `$getWorkflowStaticData`
  state, or a step that would need three or more nodes.
- Write Code nodes in JavaScript unless the user explicitly asks for Python.
- SDK source builds a static graph and does not run. Full allowed/forbidden
  list and "Native node mappings" table:
  `knowledge-base/reference/workflow-sdk-language.md`.
- Import only the symbols you use from `@n8n/workflow-sdk`.
- Use `expr('{{ $json.field }}')` for expressions. `$json` is only the current
  item from the immediate predecessor; use `$('Node').item.json.field` or
  `nodeJson(node, 'field')` for anything further upstream.
- Use string values for discriminators (`resource: 'message'`).
- Always use `newCredential()` for authentication, never placeholder strings or
  invented IDs.

Define nodes first, then compose:

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

const isImportant = ifElse({ version: 2.2, config: { name: 'Is Important', parameters: { conditions } } });

export default workflow('id', 'name')
  .add(startTrigger)
  .to(fetchData)
  .to(isImportant)
  .onTrue(handleImportant)                               // single step
  .onFalse(sendHolding.to(createTicket.to(alertSlack))); // chained multi-step
// Inline form: .to(isImportant.onTrue(a).onFalse(b)). Fan-out: .onFalse([a, b, c])
// Switch: .onCase(0, a).onCase(1, b). Merge: wire sources to combine.input(0), combine.input(1).
// Errors: .to(fetchNode).onError(notify). AI subnodes: languageModel(), memory(), tool(), …
```

## Node Groups

{{GROUPING_GUIDANCE_PLACEHOLDER}}

Declare a group with `.group(name, members, { description })` on the workflow builder; members
are the node handles. Before you emit a `.group(...)`, read
`knowledge-base/reference/node-groups.md` for the rules that make a group valid. An invalid
group is dropped with a warning: fix what the warning reports and build again. A
`GROUPING_DECISION_MISSING` error means the build was refused: add groups, or pass
`groupingDecision: 'not_warranted'` with a `groupingReason`. If the top level is still above
{{TOP_LEVEL_ITEM_CEILING_PLACEHOLDER}} items with groups in place, name each remaining item and
why it cannot join a group.

## Gotchas

Each line corrects a mistake observed in real builds or evals.

- Do NOT wire branches as standalone statements after `export default` (`ifNode.onTrue(...)` on its own line): those calls never reach the builder. <!-- gotcha:if-branches-on-builder -->
- An IF or Filter only selects items. When the user asks to archive, update, send or create only matching items, wire the action node on the matching branch, and give an IF both outputs. <!-- gotcha:filter-is-not-an-action -->
- Switch outputs and Merge inputs are zero-based: `.onCase(0, …)` and `.input(0)` are the first. <!-- gotcha:zero-based-indices -->
- `.onError()` takes one handler, not an array. Call it once for each handler. <!-- gotcha:on-error-one-handler -->
- Zero items end a branch. Do not add `alwaysOutputData: true` or empty-check IF gates, unless a digest or alert must still send when upstream is empty. <!-- gotcha:zero-items-end-branch -->
- When a digest or alert must send on empty input, set `alwaysOutputData: true` on every node that can emit zero items before it; the result is one item with empty json (`{}`), so the formatter must filter out empty-json items before counting rows. <!-- gotcha:always-output-data-empty-json -->
- Set `executeOnce: true` on a node that receives many items but must run once (summary notification, report, shared-context fetch). Duplicate notifications mean it is missing. <!-- gotcha:execute-once -->
- Do not use `.first()` or `$input.first()` for per-item data: every item then reuses item 0. Use `$('Node').item.json`. <!-- gotcha:first-is-not-per-item -->
- Inserting a write/create/send node into A→B replaces what B receives with that node's API response. Branch it in parallel, move it upstream, or make B read `$('Data Node')`. <!-- gotcha:insert-node-replaces-payload -->
- A polling trigger (Gmail, Outlook) that feeds a create/write action can return the same item again. Mark each item handled, or record handled ids in a Data Table and skip ids already seen. <!-- gotcha:polling-dedupe -->
- A period summary ("weekly digest") must read that period's rows back from where the workflow stores them, and its cadence comes from the schedule, never from `$now.weekday == N`. <!-- gotcha:digest-reads-stored-rows -->
- When Code nodes compare free-text human values ("≈ $12,500", "1.5k", "ASAP"), normalize first and give every classifier a fallback bucket. <!-- gotcha:normalize-free-text -->
- SDK node mock `output` items are raw `$json` objects: write `[{ total: 42 }]`, never `[{ json: { total: 42 } }]`. <!-- gotcha:mock-output-raw-json -->
- Mock `output` must include every field later read by `$json` expressions, including optional trigger fields used in filters (Slack `subtype`, `bot_id`). <!-- gotcha:mock-output-all-fields -->
- When a real response is a list (HTTP list endpoints, search results, a top-level array), declare at least two mock items so single-item assumptions fail in verification. <!-- gotcha:mock-output-cardinality -->
- Webhook mocks for third-party platforms use that platform's documented envelope. AI/voice tool-call webhooks nest arguments in `body.message.toolCalls[0].function.arguments`. <!-- gotcha:webhook-envelope-shape -->
- OpenAI node output: v2+ text is `$json.output[0].content[0].text`, v1 is `$json.message.content`, and `json_schema` output is already parsed. Read `knowledge-base/reference/open-ai-output-shape.md` before mapping it. <!-- gotcha:openai-output-shape -->
- Anthropic node `$json.content` is an array of blocks: read `$json.content[0].text`. See `knowledge-base/reference/anthropic-output-shape.md`. <!-- gotcha:anthropic-output-shape -->
- Python Code nodes (`language: 'pythonNative'`) define only `_items`, `_item` and `print()`, and allow no imports by default unless the system prompt says otherwise. <!-- gotcha:python-native-runner -->
- Use `placeholder('hint')` directly as the parameter value. Do not wrap it in `expr()`, objects or arrays. <!-- gotcha:placeholder-not-wrapped -->
- Resource-locator fields use `{ __rl: true, mode, value }`. Use `name` mode with a name the user gave, `list` mode with an empty value and a `cachedResultName` hint only when nothing is known, and never a raw `placeholder()`. <!-- gotcha:resource-locator-shape -->
- Keep concrete values the user gave (URL, channel, table, folder). Placeholder only the unknown part. <!-- gotcha:keep-user-values -->
- When editing a saved workflow, keep every `config.id` exactly as `get_workflow_as_code` wrote it, omit `id` on new nodes, and never add `position`. <!-- gotcha:keep-node-ids-and-layout -->
- Give every Webhook and Form Trigger an explicit, readable `path` specific to this workflow (`acme-contact-form`): paths are shared across the instance. <!-- gotcha:unique-webhook-path -->
- Inbound trigger nodes (Webhook, Form, Chat, MCP Trigger) keep authentication `none` unless the user asks to authenticate inbound traffic. <!-- gotcha:inbound-auth-none -->
- Set an explicit snake_case `config.name` on every `tool(...)` node (`get_email`), without a service prefix (`gmail_get_email` is wrong). <!-- gotcha:tool-names -->
- Data Table column names are normalized to snake_case (`dayName` → `day_name`). Call `get_data_table_schema` before using a table in code. <!-- gotcha:data-table-snake-case -->
- Never query a Data Table unfiltered: rows can hold very large values. <!-- gotcha:data-table-no-unfiltered -->
- When `workflow_builder_build_workflow` returns `resolvedCredentialsByNode`, those credentials (including Gateway credits) are connected: do not route them to setup. <!-- gotcha:resolved-credentials-are-connected -->
- Never write raw credential objects (`{ id, name }`) in SDK code; replace them with `newCredential()` when editing. <!-- gotcha:no-raw-credential-objects -->
- When the user did not name a service for a capability (web search, scraping), discover coverage with `search_nodes(gatewayCreditsOnly=true)` and use a Gateway credits–covered node instead of asking. <!-- gotcha:gateway-covered-before-asking -->
- Never re-ask an answered, deferred or skipped question. A skip grants no permission to change authentication, delete nodes or expand scope. <!-- gotcha:no-re-ask -->
- When the user reports a node erroring, inspect it first via `debugging-executions` before editing anything. <!-- gotcha:debug-before-repair -->
- Never dismiss a live execution error as a harness or stale-state artifact without re-running. <!-- gotcha:no-dismissing-live-errors -->
- If part of the request is infeasible, never quietly substitute a stand-in: name the gap in the completion summary. <!-- gotcha:capability-honesty -->
- When a required resource has no options, use `placeholder('Select <resource>')`, or create it only when the user asked and the node has a create operation. <!-- gotcha:missing-resource -->
- When the new workflow's folder is clear, pass `folderPath` to the build. When editing, read sibling workflows with `list_workflows(folderPath)` and match their style. <!-- gotcha:folder-placement -->
- Early setup calls are tool calls, not visible text: they do not break the rule to keep visible text for the final step. <!-- gotcha:early-setup-not-visible -->
- Do not publish the main workflow automatically. Publishing is the user's decision. <!-- gotcha:no-auto-publish -->

## Completion

For a successful build, finish with one concise sentence naming the workflow and
what changed, with the workflow ID when available. If setup is required, say so
plainly; do not tell the user to leave the n8n Assistant panel. For a Webhook,
Form or Chat Trigger, follow Trigger URL Sharing in the `post-build-flow`
reference.
