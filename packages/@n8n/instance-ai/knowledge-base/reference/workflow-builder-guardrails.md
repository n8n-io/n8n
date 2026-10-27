# Workflow Builder Guardrails

Use guardrails for builds with multiple external systems, multiple requested effects, digests/reports, non-trivial branching, or Code nodes. Runtime checklist, not extra user-facing output.

Code-node runtime limits (no network, forbidden imports, nested template literals) and unsolicited stickies enforced by `workflow-sdk validate` — fix findings before `workflow_builder_build_workflow`. Use built-in nodes (Edit Fields (Set), Filter, IF / Switch, Sort, Remove Duplicates, Aggregate, Split Out, Merge) for shaping, filtering, routing, sorting, de-duplicating, aggregating; Code node only for reserved cases workflow-builder skill lists.

## Preserve Source Data

Normalize trigger/source data before side effects. Create/update/send/log nodes often replace current item JSON with API response. If later conditions, messages, upserts, or alerts need source fields, fan out from normalized source item, preserve fields explicitly, or read from correct upstream node.

No recovering source identity from item positions after external read that can fan one source into many records. Carry fields like channel, city, account, request ID, team, label, origin on current item before fan-out; create failure records with explicit source fields only on real error paths.

## Preserve Node Identity

`config.id` = node's stable identity in n8n, not cosmetic. Two nodes never share one `id`; `workflow_builder_build_workflow` rejects save with `DUPLICATE_NODE_ID` when they do. Fix: delete `id` line from node you added, not invent new value.

Rewrite workflow file from scratch and lose `id` lines → every node recorded deleted and recreated: execution-log pairing, poll cursors, dedup state all reset, version diff unreadable. Carry `id` lines through every rewrite.

## Keep Effects Independent

Multiple final effects from same trigger → each effect needs real terminal action node on success path. Formatter, validation branch, prompt builder, aggregate, or disabled action not satisfy request to send, post, respond, create, update, notify, log, upsert.

Gate only effect needing field. Missing email may skip email send; not block logging, acknowledgement, or team notification unless user explicitly asked all-or-nothing.

Source/final effect may fail independently → use node's supported continue/error-output behavior. Feed downstream fan-in either success data or one real failure record per source/effect. Never emit both success and synthetic failure records for same source/effect.

## Preserve List Semantics

HTTP and app nodes may return one n8n item per record, top-level array, or envelope like `records`, `body`, `data`. Before per-record filtering, upserting, posting, check actual item shape. Preserve itemized flow or split arrays into one item per record; don't collapse to no work because `$input.first().json` is single object.

Top-level array response (e.g. Binance klines, list endpoints, search results) split by HTTP Request node into one item per element, so `$input.first().json` is single element, not whole array. Code node processing every row: read `$input.all().map(i => i.json)` (or iterate items), not map over `$input.first().json` — that sees only first record, gives null/empty downstream.

Downstream node must reason over whole collection at once — single AI Agent analysing series, indicator/metric across all rows, summary, structured-output parser expecting one object — first aggregate split items into single item with Code node (`return [{ json: { rows:
$input.all().map(i => i.json) } }]`) and feed that one item. Single-shot Agent or output parser wired directly to N split items runs once per row, gives malformed/unparseable output.

One digest, ranking, summary, count, report: aggregate first, send one final item. One action per source record: keep stream itemized. `executeOnce: true` only for shared-context reads, report construction, rankings, summaries, or final one-message posts that run once.

Avoid `SplitInBatches` as collector for fixed set of external sources in digest/report path. Done branch not accumulate loop-body outputs. Prefer parallel source branches + explicit fan-in, or emit one success/empty/failure record per source before aggregation.

## HTTP Request Output Field Names

HTTP Request output field depends on Response Format. `json` (default): parsed body is item json itself — or under `body` when "Include Response Headers and Status" (full response) enabled. `text`: body string under Output Field option (default `data`) — even with full response stays under `data` next to `headers`/`statusCode`, never `body`. Code node reading `$json.body` after text-format fetch gets `undefined`, silently breaks length/emptiness checks (e.g. scraped HTML misclassified as blocked). Read field chosen format actually emits.

## Fetch Complete External Data

Downstream logic depends on labels, memberships, related records, nested fields, owners, creators, timestamps, date windows, pagination data → request those fields explicitly. No inferring related facts from whichever primary records arrived first. Native node can't fetch required shape → use HTTP Request or other API-capable node.

Reports combining named sources: every named source needs reachable read/query/fetch node before formatter and final action. Schedule item, date-window calculator, placeholder row, final formatter not source data.

## Structured-Output Schema Fields Are JSON Strings

On OpenAI/LM nodes, structured-output schema field (`textFormat.textOptions.schema` and equivalents) must be STRING with strict, valid JSON — node runs JSON.parse at execution. JS/TS object literal, single-quoted keys, trailing commas, comments, or expression → "Failed to parse schema", node crashes before output. Serialize with double-quoted keys and strings, keep minimal, set sibling `name` field.

## Slack Blocks Fields Take the Whole Block Kit Payload

Slack Blocks field (`blocksUi`) holds **whole Block Kit payload object** — `{ "blocks": [ ... ] }` — not bare blocks array. Node reads value as object, picks blocks off `blocks` key before send. Top-level `[ { "type": "section" }, ... ]` leaves key undefined → Slack gets body with no blocks, replies `ok: true`, message renders empty — silent failure run never reports. Also set `messageType: "block"`; any other message type drops payload, posts only plain text.

## Data After Side-Effect Nodes

Send/notify/write nodes (Gmail, Slack, Telegram, email send, most "create" actions) output own API response — message IDs, thread stamps, `ok` flags — not data flowing in. Node chained after send reading `$json.someField` from original data gets `null`/undefined, silently no-ops (update matching no rows, empty mapped column). Node after side-effect needs original data → reference by node name (`$('Compute Change').item.json.status`) or wire parallel from data-producing node, not chain through send.

Same trap in reverse when **inserting** side-effect node into existing connection: adding C between A→B (e.g. create-if-missing step before write, during repair) makes B read C's API response not A's data — auto-mapped columns silently fill with metadata. Keep data path intact: branch C parallel off data producer, reorder C upstream of data producer (trigger → ensure-target → produce data → write), or have B reference `$('Data Node')` explicitly.

## Code Nodes

Code node necessary → use real n8n item APIs like `$input.all()` / `$input.item`, return explicit `json` objects. Prefer arrays joined with runtime separator (e.g. `const LF = String.fromCharCode(10);`) over escape-heavy multi-line string construction.