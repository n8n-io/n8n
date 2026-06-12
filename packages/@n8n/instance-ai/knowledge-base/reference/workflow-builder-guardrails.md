# Workflow Builder Guardrails

Use these guardrails for workflow builds with multiple external systems,
multiple requested effects, digests or reports, non-trivial branching, or Code
nodes. They are a runtime checklist, not extra user-facing output.

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

For one digest, ranking, summary, count, or report, aggregate first and send one
final item. For one action per source record, keep the stream itemized. Use
`executeOnce: true` only for shared-context reads, report construction,
rankings, summaries, or final one-message posts that should run once.

Avoid using `SplitInBatches` as the collector for a fixed set of external
sources in a digest/report path. Its done branch does not accumulate loop-body
outputs. Prefer parallel source branches plus explicit fan-in, or emit one
success/empty/failure record per source before aggregation.

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

## Keep Code Nodes Parseable

Prefer built-in nodes for simple split, map, filter, merge, and aggregate work.
When a Code node is necessary, use real n8n item APIs such as `$input.all()` and
return explicit `json` objects.

Code nodes run in a restricted runtime. Do not `require()` or `import`
unavailable modules such as `luxon` or `openai`; use JavaScript `Date`, `Intl`,
`$now`, `$today`, existing workflow data, or dedicated AI nodes.

Code nodes have no network access. `fetch()`, `axios`, `XMLHttpRequest`, and
`require` of http modules all fail at runtime, in JavaScript and Python alike.
Make every HTTP/API call with the HTTP Request node and transform its output in
the Code node, even when the user asks to fetch inside a Code node.

Keep embedded Code node source parseable after saving. Avoid nested template
literals, raw newlines inside quoted strings, and escape-heavy regex literals.
Prefer arrays joined with a runtime separator such as
`const LF = String.fromCharCode(10);`.
