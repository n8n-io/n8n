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
