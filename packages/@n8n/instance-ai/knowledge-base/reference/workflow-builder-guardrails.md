# Workflow Builder Guardrails

Use these for workflow builds with multiple external systems, multiple requested
effects, digests or reports, non-trivial branching, or Code nodes. They are a
runtime checklist, not extra user-facing output.

**Validate first.** Before iterating on complex graphs, run
`workflow-sdk validate` and fix every warning. It already covers HTTP text
response field paths, bare `$json` after messaging side effects, missing
`executeOnce` on digests/summaries, list/array collapse, boolean-vs-string
filters, weekday digest gates, Code sandbox imports / nested templates, Agents
fed itemized streams without aggregation, and related defects. The sections
below are architecture checks validate cannot fully see.

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
split arrays into one item per record.

When a downstream node must reason over the whole collection at once — a single
AI Agent analysing a series, an indicator across all rows, a summary, or a
structured-output parser expecting one object — aggregate first into one item
(`return [{ json: { rows: $input.all().map(i => i.json) } }]`). For one digest,
ranking, summary, count, or report, aggregate then send once; for one action per
source record, keep the stream itemized.

Avoid using `SplitInBatches` as the collector for a fixed set of external
sources in a digest/report path. Its done branch carries only what looped back
through `nextBatch`, so anything a Filter/IF drops is silently missing — and the
loop serializes fetches that could run in parallel. Prefer parallel source
branches plus explicit fan-in, or emit one success/empty/failure record per
source before aggregation.

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

## Keep Code Nodes Minimal

Prefer built-in nodes for simple split, map, filter, merge, and aggregate work.
When a Code node is necessary, use real n8n item APIs such as `$input.all()` and
return explicit `json` objects. Keep embedded source parseable after saving —
avoid raw newlines inside quoted strings and escape-heavy regex literals; prefer
arrays joined with a runtime separator such as
`const LF = String.fromCharCode(10);`.
