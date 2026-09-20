---
name: workflow-builder
description: >-
  Load before building or editing a workflow. Describe the complete behavior
  in text, use plan-build for installed node and operation choices, then fill
  parameters and save with build-workflow. New workflows can use inline JSON.
  Existing source edits use the bound workspace file. Load planning only for
  coordinated tasks with dependencies. Use one-off-operations for a single
  immediate node execution.
recommended_tools:
  - plan-build
  - build-workflow
  - workflows
  - nodes
  - credentials
  - ask-user
  - verify-built-workflow
  - executions
---

# Workflow Builder

## Build sequence

1. Describe the complete behavior in plain text. Include each trigger, input,
   output, condition, human decision, delay, state transition, and failure path.
   State assumptions that affect behavior. Do not replace requested stages with
   a generic linear chain.
2. Call `plan-build` with that plan and the complete user request. List one
   operation per step. Separate create, update, delete, and lookup operations.
   The tool batches bounded decisions through JEV and returns installed node
   definitions. Reuse these definitions instead of fetching them again.
3. Review `checks` and uncertain selections. Use LLM reasoning to fix missing
   behavior, data mappings, and parameters. Retrieve only definitions that are
   missing. Ask a user question only when a human choice changes the intended
   behavior. Never ask the user to choose internal node operations.
4. Fill parameters from the returned definitions and their `@builderHint`
   annotations. Check required fields, enum values, expressions, and output
   shapes. Batch independent lookups. Use official n8n docs only for a specific
   unresolved behavior; do not research techniques the definitions explain.
5. Trace the complete graph against the plan. Apply the quality checks below.
   Call `build-workflow` to validate and save. Resolve reported errors in one
   repair batch. A save is not evidence of successful execution.
6. Follow the returned `postBuildFlow.instructions` when required. These own
   verification and the existing setup cards. Do not publish without user
   authorization. Report unresolved setup and unverified behavior accurately.

## New workflows

Use inline WorkflowJSON when the required definitions are available. Pass
`filePath: "src/workflows/name.workflow.json"`, `name`, and JSON text in
`sourceCode` to `build-workflow`. No sandbox or separate SDK validation command
is needed for this format. The persistence tool validates the graph.

WorkflowJSON contains `name`, `nodes`, `connections`, and optional `settings`.
Each node has a unique `name`, installed `type`, numeric `typeVersion`, and
`parameters`. Omit positions and new node IDs; the builder assigns them.
Connections are indexed by source node name:

```json
{"Start":{"main":[[{"node":"Next","type":"main","index":0}]]}}
```

Each outer array selects a source output. Each inner array contains its targets.
The target `index` selects its input. All indices are zero-based. Use the
correct connection type for AI models, tools, and memory.

Use n8n expression strings such as `={{ $json.email }}`. Use
`<__PLACEHOLDER_VALUE__Select a calendar__>` for an unknown setup value.
For resource locators, preserve the required locator object. Use an empty
`list` value with a descriptive `cachedResultName` when no resource is known.
Never invent an ID, URL, recipient, secret, or authentication token.

If SDK source is needed, load `references/sdk-source.md`. Write a workspace
`.workflow.ts` file, run `workflow-sdk validate`, then call `build-workflow`.
This extra process applies only to SDK source.

## Existing workflows and repairs

Locate the workflow before editing. Use its existing bound source file. If no
source is available, call `workflows(action="get-as-code", workflowId)` and
load `references/sdk-source.md`. Edit only the required parts of the returned
file. Preserve existing node IDs and unrelated behavior. Build the same file
again. Never use an SDK slug as a persisted workflow ID.

For execution failures, inspect the actual error and resolved parameters first.
Load `debugging-executions` when needed. Do not guess the cause. Batch related
repairs and repeat the failed scenario after saving.

## Quality checks

- Preserve data across writes. A send, create, or update node returns the
  service response. Downstream `$json` no longer contains the original input.
  Reference the correct upstream item explicitly.
- Keep records independent. A multi-day wait inside a serial loop blocks all
  later records. Use independent executions or durable state with event and
  schedule triggers for long processes. Persist record ID, stage, correlation
  IDs, due times, and external event IDs.
- Record completion after the effect succeeds. A pending claim must have an
  expiry and a recovery path. Use durable idempotency keys for retries. Do not
  claim exactly-once delivery when the external service cannot provide it.
- For human feedback, associate each response with the record, stage, and
  expected reviewer. Ignore duplicates and stale responses. Require all
  expected feedback or an explicit timeout/escalation before advancing.
- Keep human decisions explicit. Wire approve, reject, reschedule, cancel,
  timeout, and unknown-input routes when the request requires them.
- Check availability before booking. Keep timezones explicit. Store the event
  ID for changes and cancellation. Recheck conflicts before committing a slot.
  Update durable state only after the calendar operation succeeds.
- Scope participant access. A public candidate or record ID does not prove
  identity. Use an authenticated or verified participant context. Keep internal
  feedback and other participants' records out of external responses.
- Use parameterized database queries. Read the existing schema when available.
  If a new schema is part of the design, include its creation or migration as
  an explicit setup requirement. Do not present assumed columns as inspected.
- Trace every IF and Switch output. Use an explicit fallback where needed.
  Every requested action must be reachable from a trigger.
- Zero items stop a branch. Use `alwaysOutputData` only when an outcome must
  happen even with no records, and handle the resulting empty object.
- Preserve cardinality. Per-record expressions use paired items, not
  `.first()`. Shared configuration or a single summary can use `executeOnce`.
- Prefer native nodes and expressions. Use Code only for logic that needs it.
  Code must not perform network requests or import unavailable modules.
- Keep error recovery observable. Route failed effects to a durable error or
  review state. Do not advance the success path after an error.

## Credentials and setup

List credentials early when external services are involved. Reuse an existing
credential only when the choice is unambiguous or the user selected it.
For JSON, omit unresolved credential IDs. The builder resolves credential
types from the installed node definitions and opens the existing setup cards.
For SDK source, use `newCredential('Name')` for an unresolved credential.
Never request or place secrets in chat, parameters, or source.

Honor explicit service choices. For an unspecified service, prefer a suitable
connected integration or an available Gateway credits option. Discovery
reports its supported operations and minimum version. Respect those limits.
Do not replace the user's chosen credential with a managed one.

Use `nodes(action="explore-resources")` when credentials can resolve required
resource IDs. Otherwise leave setup placeholders. Do not stop the first build
to ask for accounts, calendar IDs, recipients, or other setup values.
Do not ask again for credentials listed in `resolvedCredentialsByNode`.

If the user asks for a new credential, pass `preferNewCredentials` on build
and setup. For HTTP Request authentication, discover the dedicated credential
type before choosing generic authentication. Load `credential-recipe-research`
when a custom authentication recipe is needed.

## Verification and completion

Inspect the persisted graph before claiming it meets the request. Verify the
success path and material alternate paths with `verify-built-workflow` or
`executions`, as directed by the post-build flow. Use representative fixtures
for unavailable integrations. Label fixture evidence and live evidence
separately. Never send real outreach merely to test a draft.

Test multiple records, empty results, duplicate events, delayed feedback,
declined decisions, failed effects, and retries when those apply. A structural
validation result does not prove runtime behavior.

Use `workflows(action="setup")` for unresolved requirements. Keep approvals,
questions, and credentials in the existing UI. Finish with the saved workflow
name and the remaining setup or validation needs.

## Additional references

- For SDK syntax, expressions, groups, and trigger URLs, load
  `references/sdk-source.md`.
- For supporting workflows, load `references/compositional-workflows.md`.
- Load `references/error-workflows.md` only when the user wants a separate
  error workflow. Do not add that task before the primary workflow is ready.
- Load `data-table-manager` before creating or changing Data Tables. Use real
  table IDs and their inspected schema.

{{GROUPING_GUIDANCE_PLACEHOLDER}}

For a canvas over {{TOP_LEVEL_ITEM_CEILING_PLACEHOLDER}} top-level items,
declare valid groups or provide `groupingDecision: "not_warranted"` with a
specific `groupingReason`. Fix any dropped-group warning before completion.
