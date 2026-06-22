# Workflow Control Flow

## Contents

- Workflow rules (zero-items, executeOnce, alwaysOutputData, control-flow primitives)
- Mandatory outcome on empty input (pointer to knowledge-base)
- Tool naming
- Node configuration safety
- Mock output field completeness

## Workflow Rules

Follow these rules strictly when generating workflows:

1. Always use `newCredential()` for authentication. Never use placeholder
   strings, fake API keys, hardcoded auth values, invented credential IDs, or
   raw `mock-*` IDs.
2. Zero items end the branch — downstream nodes do not run. Trust this default;
   do not add `alwaysOutputData: true` or empty-check IF gates unless rule 4's
   mandatory-outcome case applies.
3. Use `executeOnce: true` for a node that receives many items but should run
   once, such as a summary notification, report generation, shared-context
   fetch, or API call that does not vary per input item. Duplicate
   notifications or repeated shared-context fetches usually mean this is
   missing.
4. Pick the right control-flow primitive:
   - Per-item loop with side effects: `splitInBatches` with `batchSize: 1`,
     feeding the per-item work and looping back via `nextBatch`.
   - Drop items that do not match a predicate: `filter`.
   - Two mutually exclusive paths that both do real work: IF with `.onTrue()`
     and `.onFalse()` wired inside `.to(...)` — not as standalone statements
     after the workflow chain (see [sdk-patterns.md](sdk-patterns.md)).
   - Many mutually exclusive paths keyed off a value: Switch with
     `.onCase(index, target)`.
   - Mandatory outcome when upstream can be empty (digest/alert must still send):
     set `alwaysOutputData: true` on every node that can emit zero items before
     the effect — often **both** the HTTP fetch (empty `[]`) **and** the filter
     (all rows dropped). Not on the formatter or notifier; consumers that receive
     zero items never run. See [Mandatory outcome on empty input](#mandatory-outcome-on-empty-input).
   - A Filter or IF only selects items; it does not perform the requested side
     effect. If the user asks to archive, update, delete, send, or create only
     matching items, wire the corresponding action node on the matching path.
5. Input and output indices are zero-based. `.input(0)` and `.output(0)` are the
   first input and output. `.input(1)` is the second input, not the first.

For single-execution nodes that receive many items but should run once, set
`executeOnce: true`.

## Mandatory outcome on empty input

Default: a node that emits 0 items stops its branch, so downstream nodes do not
run. Keep this when downstream work is per-item (no items = nothing to do).

Override it when a specific downstream node must still run on the empty case —
typically a node that runs once per trigger and aggregates its whole input, or a
terminal effect that must happen every run regardless of item count. Recognize
this by execution semantics, not by user phrasing: if the run should still
produce that output when upstream is empty, handle it even if the user did not
say so. (A node that should only act when matching items exist is the opposite —
let the empty case stop it.)

When it applies, load
`knowledge-base/reference/mandatory-outcome-on-empty-input.md` before building.

Core rule: the branch can become empty at more than one node. Do not stop at the
nearest one — walk upstream to the trigger and set `alwaysOutputData: true` on
**every** node that can emit 0 items, never on the node that consumes them:

- a source/fetch/query/list/search node returns an array that can be empty
  (`[]` = 0 items) even on success — most often missed;
- a filter (or IF in filter mode) can drop every row.

Setting it on only one node leaves the other path silently empty. A downstream
Code node that handles the empty count does not help when an upstream node
returns 0 items, because it never runs.

## Tool Naming Rules

- Name tools by the action they perform, not by repeating the integration or
  tool family name.
- Always set an explicit `config.name` on every `tool(...)` node. Do not rely on
  auto-generated names for tools.
- Do not prefix a tool name with the service name when the tool already belongs
  to that service.
- Prefer concise snake_case action names like `get_email`, `add_labels`, or
  `mark_as_read`.
- Avoid redundant names like `gmail_get_email`, `slack_send_message`, or
  `notion_create_page` unless the user explicitly asked for that exact name.

## Node Configuration Safety Rules

- Fetch `nodes(action="type-definition")` before configuring nodes. Generated
  definitions and `@builderHint` annotations are the source of truth.
- Use live `nodes(action="explore-resources")` for resource locator, list, and
  model fields when credentials are available.
- If a configuration is unclear after reading the definition, ask for
  clarification or use placeholders. Do not guess.
- Pay attention to `@builderHint` annotations in search results and type
  definitions. They contain node-specific configuration rules and examples.
- Gmail archive: the message resource has no `archive` operation. To archive a
  Gmail message, remove the `INBOX` label with `operation: 'removeLabels'` and
  `labelIds: ['INBOX']`; do not add an invented `ARCHIVE` label.

## Mock output field completeness

Whenever a node declares mock `output` for verification, include every field
later referenced by `$json` expressions, including optional trigger fields
used in filters (for example Slack `subtype`, `bot_id`, `text`, `user`, `ts`,
`channel`). Missing optional fields make expression-path validation fail.
