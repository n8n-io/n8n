---
name: workflow-builder
description: >-
  Load before calling workflow_builder_build_workflow. Once the user wants a
  workflow, load it before you ask about that workflow. Do not load it to ask
  about a request that does not yet say what to build. Use for new one-off
  workflows, edits, repairs and post-build verification of one workflow (not
  requests only to run or inspect a saved workflow), and for its
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
workspace source file and the `workflow_builder_build_workflow` tool
(argument: `filePath`):

- **New workflow:** write the complete source with `workspace_write_file`
  (typically `src/workflows/main.workflow.ts`), then build.
- **Edit or repair of a saved workflow:** reuse the source file already in
  context. If you only have a workflow ID, call `get_workflow_as_code` with
  `workflowId`: it writes the source to a bound
  `src/workflows/<name>.workflow.ts` file and returns the `filePath` plus a
  `nodes` index with line numbers. Read only the lines you need, make the
  smallest edit with `workspace_str_replace_file`, then build with the same
  `filePath` (no `workflowId` needed; the build remembers it). Never re-emit the
  whole source, and do not fetch the same unchanged workflow again.

When the needed node types are already obvious from the request, make one
`find_tools` call for every tool catalog tool the build will need (for example
`search_nodes`, `get_node_types`, `workflow_builder_build_workflow`,
`workflow_builder_verify_built_workflow`) in the same response as the
`load_skill` call for this skill. Each extra sequential turn resends the whole
context.

## Process

1. **Find nodes.** If unsure which nodes fit, call
   `search_nodes` with `categories` (`notification`, `data_persistence`, `chatbot`, `scheduling`,
   `data_transformation`, `data_extraction`, `document_processing`,
   `form_input`, `content_generation`, `triage`, `scraping_and_research`). Call
   `search_nodes` with `query`/`queries` and short service names ("Gmail") for
   service-specific nodes.
2. **Read definitions.** Plan every node first, including utility nodes such as
   Set, IF, Switch, Code, Wait, Sort and output parsers. Then call
   `get_node_types` once with the exact node IDs and discriminators of the whole
   plan. Fetch again only for a node the plan did not expect. Follow `@builderHint`,
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

1. The knowledge base in the sandbox workspace, read with the workspace tools (not `load_skill`):
   `knowledge-base/index.json` (technique guides and reference docs),
   `knowledge-base/templates/` (search it; never load `templates/index.json`
   wholesale), and `node-types/index.txt` (searchable node catalog)
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
workflow (the bound source file, or `get_workflow_as_code` with `workflowId` when it
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
- SDK source builds a static graph and does not run. Build strings with
  template literals, not `.map()` or `.join()`. Do runtime joining,
  aggregation, or transforms with `expr()` in a native node. For values an
  agent supplies to a tool, write `fromAi(...)` directly, never
  `($) => $.fromAi(...)`. Full allowed/forbidden list and
  "Native node mappings" table:
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

## Completion

For a successful build, finish with one concise sentence naming the workflow and
what changed, with the workflow ID when available. If setup is required, say so
plainly; do not tell the user to leave the n8n Assistant panel. For a Webhook,
Form or Chat Trigger, follow Trigger URL Sharing in the `post-build-flow`
reference.
