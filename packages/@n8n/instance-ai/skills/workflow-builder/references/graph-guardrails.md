# Workflow Builder Graph Guardrails

Use this reference when a workflow uses Merge, SQL Merge, fan-in, candidate
lists, existence checks, deduplication, create/update guards, scheduled
cadence, filtered final digests/reports, or zero-item source reads.

## Candidate Lists And Lookup Data

When a workflow compares candidate source records with existing records, the
candidate stream must remain the stream that drives create/update actions.
Lookup data is context, not the source of action items.

Prefer this shape:

1. Read the candidate source records.
2. Read existing destination records once.
3. Use a Code node in `runOnceForAllItems` mode with `$input.all()` to compare
   candidates with existing records.
4. Return one item per candidate that should be created or updated.
5. Return `[]` when there are no candidate records or no records need action.

Avoid using SQL Merge as an empty-list guard when it selects from only one
input, such as:

```sql
SELECT * FROM input1
```

If multiple inputs feed the Merge but the SQL selects only `input1`, the graph
does not prove that the candidate/source stream controls downstream actions.
Empty candidate lists can emit placeholder rows or let lookup data drive
creates/updates. Keep candidate records as the current items and join lookup
data explicitly in Code or another source-preserving transform.

## Create/Update Safety Check

Before a final create or update node, trace the immediate upstream items:

- Every action item must originate from the requested source/candidate record.
- Destination lookup-only items must not be able to trigger an action by
  themselves.
- A zero-candidate scenario must send zero create/update items.
- Branches that filter to zero items must not be the only path that implements
  required empty-case behavior.

For GitHub-to-Notion, CRM syncs, ticket mirroring, and similar flows, this means
the bug/contact/ticket/customer item stays paired with the action. Existing
Notion/CRM/ticketing rows are used only to decide whether that candidate is new
or needs an update.

## List-Like API Output Itemization

When Code, Set/Edit Fields, IF, Filter, or Aggregate logic consumes list-like
HTTP/API output, first decide which n8n item shape the upstream node emits:

- one n8n item per returned record;
- one n8n item whose JSON is a top-level array;
- one n8n item whose `body`, `data`, `items`, `records`, or similar field is an
  array;
- one n8n item containing an envelope with pagination or metadata plus the
  records.

Do not assume the complete response array lives in `$input.first()?.json`, and
do not collapse to `[]` just because the first item is a single object. If
downstream work should run once per returned record, preserve the itemized flow
or inspect `$input.all()` and flatten only the real array fields. If downstream
work should run once for a digest or report, aggregate with `runOnceForAllItems`
and count the records you actually collected.

After a multi-input Merge, do not set `executeOnce: true` on the Code node that
builds the digest/report from all merged items. Use Code mode
`runOnceForAllItems` with `$input.all()` so every merged item contributes.

## Parallel Source Fan-In

When several named source branches feed one digest, transcript, report, or
summary, merge or aggregate those branches before the final formatter. n8n
executes parallel input branches separately; it does not automatically combine
channel, team, account, city, label, or other source branches into one item
stream.

Prefer this shape:

1. Read or normalize each source branch.
2. Stamp source identity on each branch's current items.
3. Merge or aggregate the branches explicitly.
4. Use one Code node in `runOnceForAllItems` mode with `$input.all()` to build
   the combined report or prompt.
5. Send one final Slack/email/HTTP/Notion action from that combined item.

Do not wire multiple source-specific branches directly into a Code formatter
that leads to a final external action. A multi-input Code node can execute once
per incoming branch and post partial digests, omit branches, or make counts look
correct while each run only saw one branch's items.

## Split In Batches Is Not A Collector

Use `SplitInBatches` for true per-item loops where each iteration performs its
own side effect, then loops back with `nextBatch`. Do not use it as the
collector for a fixed source list in a digest, report, summary, ranking, or
final response path.

In n8n v3, output 0 is the done output and output 1 is the loop/each-batch
output. Work that should happen for each item belongs on output 1. The done
branch runs only after batches are exhausted, and it does not automatically
contain every successful loop-body output.

For fixed channel/team/city/account/source lists, prefer parallel source
branches with an explicit merge, or emit one success/empty/failure record per
source before fan-in. Do not build the final prompt from
`$('Loop Body Node').all()` after the loop; that pattern often sees only the
last iteration, misses empty reads, or posts a partial digest.

## Source Identity After Fan-Out

When an external read can fan one source item into many records, stamp source
metadata before the read or in the same transformation that expands records.
Examples include channel, city, account, request ID, team, label, and origin.

Do not recover source identity later by indexing a fixed source list with
`pairedItem.item`, item position, or `$('Source List').item.json...` unless the
node is explicitly one-output-per-input. After multi-record fan-out, paired item
indexes usually describe record positions, not source-list positions, and they
may be absent on error outputs. Carry source fields on the current item before
fan-out, and create failure records with explicit source fields only on the real
error path.

## Multi-Source Digest Aggregation

When a digest, report, ranking, or summary combines several source reads, do
not feed a multi-input Merge directly into Aggregate `aggregateAllItemData`
unless you have verified that the Aggregate output contains every merged item.

Prefer a Code node in `runOnceForAllItems` mode that reads `$input.all()`,
groups or labels records by source, counts the collected items, and builds one
explicit prompt/report item for the final AI, email, Slack, or other terminal
action. This keeps all merged items visible and makes the final item count
auditable.

## Filtered Final Digests And Reports

When the final user-facing action is a digest, report, Slack post, email, or
summary that counts or lists remaining items, plan the zero-item case before
filtering the stream down to zero.

Prefer one of these shapes:

1. Normalize the source into one summary item before filtering, with fields such
   as `{ remainingCount, remainingItems }`, then branch on the count.
2. Connect both matched and unmatched/no-results branches to an explicit final
   message path.
3. End the empty branch at a clearly named no-op/fallback terminal only when the
   user allowed completing gracefully without sending a message.

Avoid putting the only Code, Aggregate, AI, or formatting node for the final
message after the matched branch of a Filter/IF that can remove every item. If
all posts, records, emails, issues, or bugs are filtered out, that downstream
node will not run and the final message can disappear.

## Empty Source Reads And Digests

When a digest, report, or summary must still complete with no source records,
do not put the first IF, Filter, Code, Aggregate, AI, or formatter directly
after a node that can emit zero items. If that read emits zero items, n8n has no
current item to trigger the downstream node.

For Gmail/email inbox digests:

1. Preserve one scheduled seed item before reading email, or normalize the read
   into one summary item before branching.
2. In the normalizer, build `emails` from meaningful Gmail message records, not
   raw item count. Filter out empty placeholder items such as `{}` and count an
   item only when it has real email evidence like `id`, `threadId`, `snippet`,
   `subject`/`Subject`, or `from`/`From`.
3. Preserve Gmail's common field shapes. Message outputs may use capitalized
   `Subject`, `From`, and `Date` fields as well as lowercase `subject`, `from`,
   `date`, `snippet`, or `text`; include both shapes when building
   `emailsText`.
4. Emit a source-preserving item such as `{ emailCount, emails, emailsText }`
   where `emailCount === emails.length`. Do not use `$input.all().length` as
   the email count unless you already filtered out empty placeholders.
5. Branch on `emailCount`.
6. Send the normal digest when `emailCount > 0`.
7. Send a concise no-action-needed digest, or end at a clearly named fallback
   node, when `emailCount === 0`.

Writing "no emails" fallback text inside a downstream Code or AI node is not
enough if that node only receives items from the email read. Make the empty
case reachable before the source stream can drop to zero.

## Schedule Cadence Belongs In The Trigger

When the user asks for a daily, weekly, bi-weekly, every-two-weeks, or
fortnightly workflow, configure the Schedule trigger for that cadence.

Do not add an extra posting-week, posting-fortnight, run-today, or cadence IF
or Switch that can route every requested final action to an unconnected no-op
branch. An omitted false branch is still a no-op branch.

Only add runtime suppression inside a more frequent schedule when the user
explicitly asks for that shape. Otherwise, let the Schedule trigger decide when
the workflow runs and keep the required send/post/update path reachable on each
scheduled execution.
