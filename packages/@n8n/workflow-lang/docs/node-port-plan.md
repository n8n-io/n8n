# Node port plan

This plan ranks the n8n node operations that run as v1 nodes in the
fallback host. It ranks them by frequency in the corpus and by their host
CPU in the warm benchmark. A port is an optimization only: any node runs
correctly in the host. The plan holds aggregates only.

## Data

* **Corpus.** A sample of 5,997 converted workflows (every 13th row of the
  engine-test corpus input, `prepare/input`). It has 70,885 nodes, and
  21,031 of them (29.7%) run in the host. The converter gives the reason for
  each host node: a parameter that the `supports` list rejects, or a
  diagnostic (`fallback-degrade`, `host-expression`).
* **Real runs.** The 1,000 bundles of `sets/1000`, with the node runs of
  the reference run (`expected.json`).
* **Host CPU.** `workflow-runtime/bench/warm/results-2026-11-12b-*.json`. The
  host CPU of each workflow goes to its host nodes, in proportion to their
  runs.

## Ranked list (before this work)

Share of host nodes in the corpus sample, and share of warm host CPU for the
node type (Code in the host).

| Node | Operation | Host nodes | Share | Warm host CPU (type) | Decision |
|---|---|---|---|---|---|
| code | – | 2,702 | 12.8% | 24.4% | Code-node agent |
| slack | message.post (v2.x) | 1,224 | 5.8% | 9.5% | Ported (access token, link off) |
| postgres | executeQuery | 996 | 4.7% | – | Host: database driver |
| httpRequest | – | 905 | 4.3% | 2.0% | Partly: see "HTTP Request and Set" |
| googleSheets | sheet.read | 568 | 2.7% | 8.9% | Ported: row filters |
| dataTable | row.get | 537 | 2.6% | – | Host: n8n storage |
| set | – | 516 | 2.5% | 0.5% | Expressions: see below |
| lc.agent | – | 462 | 2.2% | – | Host: LangChain |
| if | – | 459 | 2.2% | 1.0% | Fixed: TS2869 in conditions |
| rssFeedRead | – | 398 | 1.9% | 5.3% | Runtime agent |
| googleSheets | sheet.appendOrUpdate | 389 | 1.8% | 8.9% | Left: gym agent owns Sheets writes |
| notion | databasePage.getAll (v2.2) | 324 | 1.5% | – | Left: manual filters (60%) |
| airtable | record.search (v2.1) | 314 | 1.5% | 1.3% | Ported |
| supabase | row.getAll | 298 | 1.4% | – | Ported |
| lc.openAi | text | 293 | 1.4% | 2.3% | Host: LangChain node versions |
| gmail | message.addLabels | 278 | 1.3% | 4.7% | Ported |
| microsoftOutlook | message.send | 276 | 1.3% | 2.6% | Left: URL depends on credential fields |
| airtable | record.update | 273 | 1.3% | 1.3% | Ported (match on `id`) |
| emailSend | email.send | 264 | 1.3% | – | Host: SMTP (nodemailer) |
| supabase | row.create | 223 | 1.1% | – | Left: one request for all items |
| telegram | message.* | 221 | 1.1% | 3.5% | Gym agent |
| notion | databasePage.update (v2.2) | 213 | 1.0% | – | Left: property mapping |
| gmail | message.send / get | 204 | 1.0% | 4.7% | Expressions, `simple=false` (mailparser) |
| dataTable | row.update / insert / upsert | 554 | 2.6% | – | Host: n8n storage |
| filter | – | 198 | 0.9% | 1.6% | Fixed: TS2869 in conditions |
| googleBigQuery | executeQuery | 197 | 0.9% | – | Left: job polling and schema rows |
| gmail | message.getAll | 179 | 0.9% | 4.7% | Host: `simple=false` needs mailparser |
| mySql, microsoftSql | executeQuery | 290 | 1.4% | – | Host: database drivers |
| supabase | row.update | 164 | 0.8% | – | Ported |
| airtable | record.create | 162 | 0.8% | 1.3% | Ported: column schema |
| googleCalendar | event.getAll | 152 | 0.7% | 9.3% | Expressions: `$now` |
| salesforce, hubspot | – | – | – | 2.2% | Gym agent |
| gmail | message.markAsRead | 130 | 0.6% | 4.7% | Ported |
| googleDrive | file.download | 127 | 0.6% | 1.9% | Host: binary data |
| notion | databasePage.create (v2.2) | 113 | 0.5% | – | Left: property mapping |
| googleSheets | sheet.clear | 104 | 0.5% | 8.9% | Left: gym agent owns Sheets writes |
| airtable | record.upsert | 102 | 0.5% | 1.3% | Ported |

### HTTP Request and Set

HTTP Request and Set go to the host because of their expressions or
options, not their versions. Reasons for the 905 HTTP Request host nodes:
pagination 214 (24%), `$now` 179 (20%), `encodeURIComponent` 118 (13%, the
runtime agent has since made it native), a binary or multipart body 59, a
parameter name that is an expression 40, regular expressions 38, a binary
response 35. Reasons for the 516 Set host nodes: `$now` 132 (26%), a field
name that is an expression 68 (13%), regular expressions 48 (9%).

Across all node types, 884 host nodes (4.2% of all host nodes) are blocked
only by `$now`, `$today` and Luxon methods on them: HTTP Request 184, Google
Sheets 172, Set 151, Google Calendar 111, Gmail 86, If 58. In v1, `$now` is
in the workflow time zone (default `America/New_York`). This is the largest
item after Code. It needs the Luxon helpers of the native Code path in the
expression translator, so it is not a node port.

## What changed

| Change | Files | Tests |
|---|---|---|
| Airtable 2.1 (`legacyFlattenOutput`), `record.update` by `id`, `record.upsert` (with the 422 and "several matches" paths), column schema types without `typecast` | `src/nodes/airtable.ts`, `src/convert/library.ts` | 7 new equivalence cases |
| Gmail `message.addLabels`, `removeLabels`, `markAsRead`, `markAsUnread`, `delete` | `src/nodes/gmail.ts` | 5 new cases |
| Google Sheets `sheet.read` row filters (AND, OR, first match, versions 4.2 to 4.7) | `src/nodes/google-sheets.ts`, `src/convert/library.ts` | 6 new cases |
| Slack `message.post` for versions 2 to 2.7 with v1 parameters and v1 output | `src/nodes/slack.ts`, `src/convert/library.ts`, corpus case 19 | 3 new cases |
| Supabase `row.getAll`, `row.get`, `row.update` | `src/nodes/supabase.ts` (new) | 6 new cases |
| Google Drive `fileFolder.search`: query text as v1's `String()` | `src/nodes/google-drive.ts`, `src/convert/library.ts` | 1 new case |
| Filter conditions: no `??` on an operand that is never or always nullish (TS2869, TS2871) | `src/convert/conditions.ts` | `structure.test.ts` |

The converter sends these calls to the host:

* Slack: OAuth2 (v1 signs with `authed_user.access_token` when it is there,
  else with the bot token), the default link to the workflow from version
  2.1 (it needs the instance URL), ephemeral messages, attachments, channels
  in mode `url`.
* Airtable: an update that matches on other columns than `id` (v1 reads the
  table once for all items), and date, array or object columns without
  `typecast`.
* Google Sheets: a read of a version before 4.2 (it reads once for all
  items).
* Supabase: `row.delete`, OAuth2 (`row.create` is ported in the second round).

Two fixes make the library behave as v1 where it did not before: a Sheets
read of version 3 or 4 now runs in the host, and the Slack output is the v1
output (`message_timestamp`, not `ts`).

## Results

Host share in `sets/1000` (node runs from the reference runs):

| | Host node runs | Host nodes |
|---|---|---|
| Before | 1,149 of 4,422 (26.0%) | 3,035 of 11,271 (26.9%) |
| After (whole tree) | 931 (21.1%) | 2,576 (22.9%) |
| Moved by this work | 140 runs, 349 nodes | |

The rest of the change comes from other work in the tree (RSS Feed Read,
native Code, `encodeURIComponent`).

Host share in the corpus (the first 2,287 workflows of the sample, converted
before and after with the same converter run):

| | Host nodes |
|---|---|
| Before | 8,195 of 26,966 (30.4%) |
| After (whole tree) | 6,935 (25.7%) |
| Moved by this work | 1,001 (12.2% of the host nodes before) |

By node type: Airtable 263, Google Sheets 175 (190 out, 15 into the host:
reads before version 4.2), Gmail 181, Supabase 174, Slack 146, If, Filter
and Switch 62.

Gym checks: each port was replayed on the `sets/1000` bundles whose host
nodes it moved (123, 65, 12 and 28 bundles). No bundle got worse than the
replay before the change (`workflow-runtime/bench/warm/replay-sets1000-2026-11-12.jsonl`)
or the full replay of the tree at 13:51 UTC. Two Supabase bundles went from
`exact` to `structure`, because the error text of "continue on fail"
differed. The node now gives v1's description of the error, and both are
`exact` again.

Warm host CPU: the moved nodes held about 12.5% of the host CPU of the warm
sample (14.5% with native Code). The host still takes about 87% of all CPU,
because wfrt is cheap: the 30% rule does not apply yet.

## Second round

| Change | Files | Tests |
|---|---|---|
| HTTP Request pagination: the converter writes the page loop (modes "update a parameter" and "next URL"; completion when empty, on status codes or by an expression; page limit; interval with `ctx.wait`; v1's check for repeated responses). The library node has a page mode that merges the page parameters as n8n-core does and gives the response and the items of the page. `$response` and `$pageCount` are locals of the expression translator | `src/convert/http-pagination.ts` (new), `src/convert/library.ts`, `src/convert/expression.ts` (`locals`), `src/convert/helpers.ts`, `src/nodes/http-request.ts` | `http-request-pagination.test.ts` (new): 7 cases against v1 on a local page server |
| Library calls that v1 runs once for all items (`batch`): Supabase `row.create`, Notion 2.2 `databasePage.create` | `src/convert/library.ts`, `src/nodes/supabase.ts` | 2 equivalence cases, a converter test |
| Notion 2.0 to 2.2 `databasePage.getAll` (no, JSON and manual filters), `update`, `create` with v1's property and filter mapping. Dates, formatted rich text, formula filters, block builders and URL locators go to the host | `src/nodes/notion.ts`, `src/convert/library.ts` | 5 cases |
| Outlook 2 `message.send`. Derived credential values: the credentials file holds the mailbox URL in `data.n8nDerived` (spec section 7) | `src/nodes/microsoft-outlook.ts` (new), `src/credentials/derived.ts` (new), `src/credentials/build.ts` | 2 cases (default and shared mailbox) |
| Schedule Trigger item in the subset (helper `scheduleItem`, zone in META `zones`), in place of the host step `n8n-compiled.schedule` | `src/convert/triggers.ts`, `src/convert/helpers.ts`, `src/convert/generator.ts` | 6 cases against moment-timezone |

Host share in `sets/1000` after the second round: 836 of 4,422 node runs
(18.9%, from 21.1%) and 2,382 of 11,271 nodes (21.1%, from 22.9%). This
round moved Notion 11 runs, Outlook 10, Supabase 4 and HTTP pagination;
`$now` in expressions (Code-node agent) moved Calendar, Set and most of the
other HTTP Request runs. The Schedule Trigger item no longer needs a host
step: that is one host step less in each run of the 477 bundles with a
Schedule Trigger (the node counts above do not hold it).

Gym check: 18 bundles for pagination and Supabase create, and 509 for
Notion, Outlook and the Schedule Trigger item. Three pagination bundles
failed at first (v1 stops when the "complete" expression throws on an error
body); after the fix all three are `exact`. Two bundles failed with HTTP 401
from Google in the large run and are `exact` and `structure` when replayed
alone (token refresh under load), as in the replays before.

Findings on the host CPU profile of the runtime agent:

* "Resource at default" is not the cause. The converter already reads the
  default resource and operation. Calendar `getAll` stays in the host for
  `$now`, Gmail `getAll` for `simple=false` (mailparser), and Slack for
  OAuth2 or the default link to the workflow.
* Native polling (Gmail and Sheets triggers) needs state that lasts across
  executions (v1 keeps the last id or time in static data). The runtime has
  no such state yet.

## Third round: Slack, and fixes from the full replay

* Slack link to the workflow (default from version 2.1): the converter takes
  the instance as an option (`ConvertOptions.instance`: the base URL that
  nodes get, `additionalData.instanceBaseUrl`, and the instance id). The
  Slack node writes v1's text with them; the link ends with the instance id,
  as for Telegram. The n8n integration passes `urlService` and
  `instanceSettings`; the gym adapter passes the reference n8n. Without the
  option, these calls still run in the host.
* Slack OAuth2: `deriveInject` signs with the token that v1 uses
  (`authed_user.access_token` when it is set, else the bot token). It
  chooses the template path when it builds the file, so the file holds no
  copy of a token.
* Fixes: a cron rule written as `=` text without `{{ }}` is that text (the
  converter made a stand-in trigger before, so the item had no date fields);
  Calendar `getAll` sends no time bound when an expression gives null or `''`
  (v1 `if (timeMin)`), and uses the default only for a missing parameter;
  Sheets `update` with automatic mapping, or without a value for the column
  to match on, runs in the host, and an item whose match value is null or
  undefined is skipped, as in v1.

Host share in `sets/1000` after the third round (converted with an
instance, as the n8n integration does): 784 of 4,422 node runs (17.7%, from
18.9%) and 2,220 of 11,271 nodes (19.7%). Slack posts moved 44 runs; the
Slack runs left are other operations (channel history, search, reactions).
Gym check: 138 bundles (the moved Slack, Sheets and Calendar bundles, and
every bundle with a Calendar node): no bundle got worse.

## Fourth round: the load-test pool

Pool: the certified bundles of `engine-test-full/sets/certified` (3,181
workflows; the 2,868 of the load test are a subset). Classes, from the
converter's fallback list, with an instance given (as the n8n integration
does): A fully native, B only Code in the host, C one other host node, D two
or more, E an AI node in the host.

| Class | Before | After |
|---|---|---|
| A fully native | 858 (27.0%) | 966 (30.4%) |
| B only Code in the host | 239 (7.5%) | 262 (8.3%) |
| C one other host node | 675 (21.2%) | 630 (19.8%) |
| D two or more | 941 (29.6%) | 849 (26.7%) |
| E an AI node in the host | 467 (14.7%) | 467 (14.7%) |

Core nodes. The reasons in the pool, and what changed:

| Reason | Nodes | Change |
|---|---|---|
| HTTP pagination with "continue on fail" | 36 | Ported: a failed page gives v1's error item for the input item (`details` from 4.5) |
| If and Filter `dateTime` conditions | 53 | Ported: helper `filterDate` parses as `tryToParseDateTime` (ISO, SQL, `Date.parse`) in the workflow zone |
| If and Filter `regex`, `notRegex` with a fixed pattern | 21 | Ported over `RegExp.exec`; the pattern is checked at convert time |
| `?? ''` after a value that TypeScript reads as never nullish (TS2869) | 26 | Fixed in conditions and templates (TypeScript 6 reads `a ?? b` by `b`) |
| Set field names and HTTP parameter names that are expressions; HTTP rows without a name; repeated names before 4.3; dotted names in a JSON body (4+, lodash `set`) | 22 | Ported (helpers `keyValuePairs`, `toText`) |
| Regular expressions and other forms inside expressions | about 70 | Left: the expression translator |
| Binary and multipart bodies, binary responses | 37 | Left: binary data |

Apps. Telegram `sendMessage` (145 host nodes) needed the instance id for its
attribution link; it is native when the converter has the instance. Gmail
`send` gets the instance id too. Google Drive `folder.create`, `file.copy`,
`file.move`, `file.deleteFile` are ported (about 210 host nodes); downloads,
uploads and updates of file content stay in the host. Slack `reaction.add`
and `channel.history` are ported.

Not ported, with the reason:

* Google Sheets `appendOrUpdate` (272 host nodes in the pool, the largest app
  gap): it shares the append and update code of the gym agent; agree the
  owner first.
* Gmail `draft.create` (38) and `reply` (13): MIME with `fromAlias` and the
  headers of a thread. `simple=false` (about 190) needs a MIME parser.
* Data tables (201 workflows): a library node over the general service
  effect `ctx.service` (spec 9.9, `docs/data-table-design.md`), native by
  default. `ConvertOptions.services: false` keeps it in the host.
* **Email Send (SMTP), 79 workflows.** Worth a native port once egress has
  an SMTP client: the library node would build the MIME message (the Gmail
  port already builds one) and send it with a new effect (`ctx.smtp`: host,
  port, TLS mode, auth, envelope, message bytes). The egress agent owns the
  client (connection reuse, STARTTLS, AUTH PLAIN/LOGIN, timeouts). Without
  it the node stays in the host.
* **Extract From File, 53 workflows.** Not worth a port yet: every
  operation reads binary data, which the runtime does not carry. CSV, JSON
  and text could be native once binary data is in the runtime; PDF and
  spreadsheets need parsers.

## What is left, and why

The next operations each hold 0.5% to 1.8% of host nodes, but each needs
more than a node port:

* `$now` and `$today` in expressions (4.2%): the Code-node agent does it.
* Google Sheets `clear`. (`appendOrUpdate` is ported: one read, one batch
  update, one append for all items, versions 4.1 and later.)
* Notion version 2.2 with dates (moment-timezone in the workflow zone),
  formatted rich text and block builders.
* BigQuery `executeQuery` (0.9%): job polling and rows from the schema.
* Slack with the workflow link when the caller gives no instance.

These stay in the host by rule: Postgres, MySQL, Microsoft SQL (drivers),
Email Send (SMTP), Gmail `simple=false` (mailparser), Drive download
(binary), LangChain nodes and agents.

## Fifth round: service calls, appendOrUpdate, file bodies

* `ctx.service` (effect kind 6): compiler, reference runner and test VM.
  The wire format to the backend is a proposal in spec 9.9; the runtime
  does not run the effect yet.
* Data Table node, row operations: equivalence cases against v1 with a
  recording data-table service. Behind `ConvertOptions.services`.
* Google Sheets `appendOrUpdate` (272 host nodes): batched as v1 runs it.
  Gym replay: the 30 bundles with the operation are exact or structure,
  as before.
* HTTP Request file and multipart bodies (37 host nodes): the library node
  gives the runtime `body: { $binary }` and `multipart` (spec 7.1). The bytes
  match v1's, apart from the boundary and the case of part header names.
