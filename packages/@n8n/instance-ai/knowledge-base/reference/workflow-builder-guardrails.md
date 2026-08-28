# Workflow Builder Guardrails

Use these guardrails for workflow builds with multiple external systems,
multiple requested effects, digests or reports, non-trivial branching, or Code
nodes. They are a runtime checklist, not extra user-facing output.

Code-node runtime limits (no network, forbidden imports, nested template
literals) and unsolicited stickies are enforced by `workflow-sdk validate` —
fix those findings before `build-workflow`. Prefer built-in nodes for simple
split, map, filter, merge, and aggregate work.

## Preserve Source Data

Normalize trigger or source data before side effects. Nodes that create, update,
send, or log data often replace the current item JSON with their API response.
If later conditions, messages, upserts, or alerts still need source fields, fan
out from the normalized source item, preserve the fields explicitly, or read
from the correct upstream node.

Do not recover source identity from item positions after an external read that
can fan one source into many records. Carry fields such as channel, city,
account, request ID, team, label, or origin on the current item before fan-out,
and create failure records with explicit source fields only on real error paths.

## Preserve Node Identity

`config.id` is a node's stable identity in n8n, not a cosmetic field. Two nodes may
never share one `id`; `build-workflow` rejects the save with `DUPLICATE_NODE_ID`
when they do, and the fix is to delete the `id` line from the node you added, not to
invent a new value.

If you rewrite a workflow file from scratch and lose the `id` lines, every node is
recorded as deleted and recreated: execution-log pairing, poll cursors and
deduplication state all reset, and the version diff becomes unreadable. Carry the
`id` lines through every rewrite.

## Keep Effects Independent

When the user asks for multiple final effects from the same trigger, each effect
must be represented by a real terminal action node on the success path. A
formatter, validation branch, prompt builder, aggregate, or disabled action does
not satisfy a request to send, post, respond, create, update, notify, log, or
upsert.

Gate only the effect that needs a field. A missing email may skip email sending;
it should not block logging, acknowledgement, or team notification unless the
user explicitly asked for all-or-nothing behavior.

When one source or final effect may fail independently, use the node's supported
continue/error-output behavior. Feed downstream fan-in with either success data
or one real failure record per source/effect. Do not emit both success and
synthetic failure records for the same source/effect.

## Preserve List Semantics

HTTP and app nodes may return one n8n item per record, a top-level array, or an
envelope such as `records`, `body`, or `data`. Before per-record filtering,
upserting, or posting, check the actual item shape. Preserve itemized flow or
split arrays into one item per record; do not collapse to no work because
`$input.first().json` is a single object.

A top-level array response (for example Binance klines, list endpoints, search
results) is split by the HTTP Request node into one item per element, so
`$input.first().json` is a single element, not the whole array. In a Code node
that must process every row, read `$input.all().map(i => i.json)` (or iterate
the items) instead of mapping over `$input.first().json`, which would only see
the first record and produce null/empty downstream values.

When a downstream node must reason over the whole collection at once — a single
AI Agent analysing a series, an indicator/metric computed across all rows, a
summary, or a structured-output parser expecting one object — first aggregate
the split items into a single item with a Code node (`return [{ json: { rows:
$input.all().map(i => i.json) } }]`) and feed that one item in. A single-shot
Agent or output parser wired directly to N split items runs once per row and
produces malformed or unparseable output.

For one digest, ranking, summary, count, or report, aggregate first and send one
final item. For one action per source record, keep the stream itemized. Use
`executeOnce: true` only for shared-context reads, report construction,
rankings, summaries, or final one-message posts that should run once.

Avoid using `SplitInBatches` as the collector for a fixed set of external
sources in a digest/report path. Its done branch does not accumulate loop-body
outputs. Prefer parallel source branches plus explicit fan-in, or emit one
success/empty/failure record per source before aggregation.

## HTTP Request Output Field Names

The HTTP Request node's output field depends on Response Format. With `json`
(the default), the parsed body is the item json itself — or under `body` when
"Include Response Headers and Status" (full response) is enabled. With `text`,
the body string is under the Output Field option (default `data`) — even with
full response enabled it stays under `data` next to `headers`/`statusCode`,
never under `body`. A Code node reading `$json.body` after a text-format fetch
gets `undefined`, which silently breaks length/emptiness checks (e.g. scraped
HTML misclassified as blocked). Read the field the chosen format actually
emits.

## Fetch Complete External Data

If downstream logic depends on labels, memberships, related records, nested
fields, owners, creators, timestamps, date windows, or pagination data, request
those fields explicitly. Do not infer related facts from whichever primary
records happened to arrive first. If the native node cannot fetch the required
shape, use HTTP Request or another API-capable node.

For reports that combine named sources, make sure every named source has a
reachable read/query/fetch node before the formatter and final action. A
schedule item, date-window calculator, placeholder row, or final formatter is
not source data.

## Structured-Output Schema Fields Are JSON Strings

On OpenAI/LM nodes, the structured-output schema field
(`textFormat.textOptions.schema` and equivalents) must be a STRING containing
strict, valid JSON — the node runs JSON.parse on it at execution time. A
JS/TS object literal, single-quoted keys, trailing commas, comments, or an
expression there produce "Failed to parse schema" and crash the node before
any output. Serialize the schema with double-quoted keys and strings, keep it
minimal, and set the sibling `name` field.

## Data After Side-Effect Nodes

Send/notify/write nodes (Gmail, Slack, Telegram, email send, most "create"
actions) output their own API response — message IDs, thread stamps, `ok`
flags — not the data that flowed into them. A node chained after a send that
reads `$json.someField` from the original data gets `null`/undefined and
silently no-ops (an update matching no rows, an empty mapped column). When a
node after a side-effect needs the original data, reference it by node name
(`$('Compute Change').item.json.status`) or wire it in parallel from the
data-producing node instead of chaining through the send.

The same trap applies in reverse when **inserting** a side-effect node into an
existing connection: adding C between A→B (e.g. a create-if-missing step before
a write, during a repair) makes B read C's API response instead of A's data —
auto-mapped columns silently fill with metadata. Keep the data path intact:
branch C in parallel off the data producer, reorder C upstream of the data
producer (trigger → ensure-target → produce data → write), or have B reference
`$('Data Node')` explicitly.

## Code Nodes

When a Code node is necessary, use real n8n item APIs such as `$input.all()` /
`$input.item` and return explicit `json` objects. Prefer arrays joined with a
runtime separator (e.g. `const LF = String.fromCharCode(10);`) over escape-heavy
multi-line string construction.
