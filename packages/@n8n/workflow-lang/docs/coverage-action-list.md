# Coverage action list

This file is the ordered list of actions that take the real-workflow set to 100% fully compiled.
"Fully compiled" means that no node of the workflow runs in the fallback host.
Update this file after each census.

## Basis

- Date: 2026-11-17, branch tip `7f769577d53`.
- Sample: 4,876 workflows of the 77,424 workflows that the engine covers fully (every 64th row, four phases).
- The census uses the converter options that n8n sets: the `sql` effect on, stored responses on, MySQL off.
- The verified list is the committed list plus the entries of 26 node types from the census run of 17 November.
- Result: 2,258 of 4,876 workflows compile fully (46.3%). Earlier: 22.9% (12 November), 35.3% (17 November, midday).

The numbers are aggregates by node type, class and diagnostic. They contain no workflow content.

## Measured after each release

| When | Tree | Fully compiled (sample of 4,876) | Verified operations |
|---|---|---|---|
| 2026-11-17, before batch 1 | `7f769577d53` | 46.3% | 3,377 |
| 2026-11-17, release 1 (`ce-r1`, batch 1) | `1e68bc650fc` | 51.1% | 3,386 |
| 2026-11-17, tip with batches 1 to 3 and the first cards of round 4 | `66a2976a111` | 57.1% | 3,423 |

The first projection for batch 1 was about 70%. It was wrong: each item is a group of many small blockers, and one
card closes the top few. Do not use the Total column of the list below as a forecast. The census is the measure.

The tip figure includes two changes that lower it and are correct: Code nodes that hold a Date in a place that
loses its kind run in the fallback host (the native form gave wrong results), and node code that reads a credential
field outside a request does not compile.

The largest group on the tip is "compiles, not verified" (12.6% of the sample). Its causes are limits of the
verifier (a wait in v1, paging that does not end with the generated answers) and operations that compiled after
the last verification.

## Columns

- Touches: share of workflows that the item blocks, alone or with other items.
- Gain: points that the item adds when the items land in this order. A workflow counts at its last blocker.
- Effort: low (little new code), medium (days of one agent), high (a new subsystem).

## The list

| # | Action | Touches | Gain | Total | Effort | Batch | State |
|---|---|---|---|---|---|---|---|
| 1 | Regenerate the verified list (nodes that compile and are not proven against v1) | 9.6% | +4.5 | 50.8% | low | 1 | verification runs on the test machine |
| 2 | Turn MySQL on (written, not verified) | 1.2% | +0.7 | 51.5% | low | 1 | open |
| 3 | Conversions that fail with the node compiler | 0.5% | +0.4 | 51.9% | low | 1 | open |
| 4 | Dates and locale formatting in Code nodes and expressions | 11.9% | +4.2 | 56.1% | medium | 1 | open |
| 5 | Code nodes: error forms and hashing | 3.7% | +0.8 | 56.9% | low to medium | 1 | open |
| 6 | Code nodes and expressions: other syntax, request helper forms, timers | 14.3% | +7.3 | 64.2% | medium | 1 | open |
| 7 | Notion, Airtable, Google Sheets, Google Calendar, Outlook, Google Drive: node source that does not compile | 9.5% | +6.3 | 70.5% | medium | 1 | open |
| 8 | AI agent with tools, memory, output parser, old versions | 4.4% | +3.2 | 73.7% | high | 2 | open |
| 9 | Gmail read and attachments (mail parse and build) | 4.8% | +2.8 | 76.5% | medium to high | 2 | open |
| 10 | BigQuery (expression evaluation in the node) | 2.3% | +1.8 | 78.4% | medium | 2 | open |
| 11 | AI chains, other model nodes, classifier, extractor, vector stores | 3.1% | +2.3 | 80.6% | high | 2 | open |
| 12 | Core nodes in the host (Remove Duplicates, Merge, Aggregate, Compare Datasets, Date & Time text dates, Markdown, HTML, RSS, others) | 5.4% | +4.1 | 84.7% | medium | 2 | open |
| 13 | Send Email over SMTP | 2.5% | +2.1 | 86.9% | high | 3 | open |
| 14 | Declarative nodes without an `execute` method | 1.4% | +1.2 | 88.1% | medium | 3 | open |
| 15 | File nodes (Extract From File, Convert To File, Spreadsheet File, FTP) | 4.2% | +3.2 | 91.3% | high | 3 | open |
| 16 | Microsoft SQL and Snowflake | 1.6% | +1.5 | 92.8% | high | 3 | open |
| 17 | Code nodes: binary data and `Buffer` | 2.2% | +1.7 | 94.4% | medium | 3 | open |
| 18 | Other app nodes (long tail) | 4.0% | +4.0 | 98.4% | medium in total | 4 | open |
| 19 | Code nodes that call `require` | 1.6% | +1.6 | 100% | allowed exception | 4 | decide per module |

## Work model

1. A batch has five agents. They write code in parallel.
2. An agent runs the type check, the lint and the unit tests of the files that it changes. It runs no verifier, no census and no full suite.
3. The coordinator merges the five branches and makes sure that the tree compiles.
4. The coordinator runs one verification and one census on the merged tree. The failures become cards of the next batch.

## Limits

- The sample under-counts rare node types. Item 18 is larger in the full set.
- A gain depends on the order. The total does not.
- Item 1 assumes that the nodes verify. A node that does not verify becomes a card.
- Items 4 and 6 are groups of many small blockers. Each leaves a remainder.

## How to repeat the analysis

The tools are not in the repository, because they read real workflows.
The census gives one record for each workflow with its host nodes (node type, class, diagnostic).
The ranking applies the items in order and counts the workflows that have no blocker left.

## The order by marginal unlock (census of 18 November 2026, late)

Tip `71fb4d3e558`, verified list of 3,656 operations: 2,432 of 4,876 sampled workflows compile fully (49.9%). 2,444 are
blocked by 557 distinct reasons. A group that is large is not always worth much: most workflows with a common blocker have
a second one. This list is a greedy order: at each step, the one reason that completes the most workflows once it is closed.
Make it again after each merge: `node unlock.mjs <census file>` (scratch tool; it prints aggregates only).

| # | Workflows it completes | Coverage after | Blocker |
|---|---|---|---|
| 1 | 442 | 58.9% | A Code node reads the paired item of another node on a path that is not one-to-one |
| 2 | 144 | 61.9% | HTTP Request with a predefined or OAuth credential under a continue setting (the error item of v1) |
| 3 | 63 | 63.2% | Send Email: the SMTP effect exists and is off |
| 4 | 57 | 64.4% | Notion operations that are not verified (the time zone of a date property) |
| 5 | 46 | 65.3% | Google BigQuery through the HTTP node of the Google API helper |
| 6 | 46 | 66.2% | Code node: a member of a value that can be a Date value |
| 7 | 40 | 67.1% | Code node: `require` |
| 8 | 39 | 67.9% | MySQL: the client of the runtime exists and is off |
| 9 | 26 | 68.4% | Code node: `catch` reads the error |
| 10 | 26 | 68.9% | Microsoft SQL: the package of the node has no compiled form |
| 11 | 25 | 69.4% | Gmail: the mail composer package |
| 12 | 24 | 69.9% | Code node: a global that the translator does not know |
| 13 | 23 | 70.4% | Snowflake: the package of the node has no compiled form |
| 14 | 20 | 70.8% | HTTP Request: an expression pairs items of another node by position |
| 15 | 17 | 71.2% | Extract From File: spreadsheet forms |
| 16 | 21 | 71.6% | Gmail: the parser of a raw message |
| 17 | 18 | 72.0% | Google Drive: the upload of a file (multipart form) |
| 18 | 17 | 72.3% | HubSpot: an expression of a parameter that can fail is not checked |
| 19 | 17 | 72.7% | Code node: a native kind is lost |
| 20 | 17 | 73.0% | Code node: `this.helpers` |

Measured cost of a parity fix: the refusal of row 2 took 260 workflows out of the fully compiled set on the day it was
made. Measure the coverage of each candidate before the merge (`cov.sh`, scratch tool) so such a cost is known at once.
