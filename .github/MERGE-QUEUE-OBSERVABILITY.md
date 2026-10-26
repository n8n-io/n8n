# Merge queue evidence

These workflows collect evidence for a future report of tests associated with
merge queue removals. They do not retry checks or change queue entries.

## Collection

`util-observe-merge-queue.yml` captures two event types:

- `merge_queue_group_created`: the group SHA, base SHA, refs, and a queue snapshot.
- `merge_queue_run_failed`: the source run and attempt, failed jobs and steps,
  failed test cases, report artifacts, and collection errors.

The failed-run listener covers the four workflows that currently handle
`merge_group`. Add a workflow name to this listener when a new queue workflow is
introduced. The listener collects `failure` and `timed_out` conclusions. It does
not collect cancelled runs.

`util-notify-merge-queue-removal.yml` also records `merge_queue_pr_enqueued` and
`merge_queue_pr_dequeued`. Each record includes the PR number, PR head SHA, base
branch, removal reason when available, and a queue snapshot. The existing removal
comment still excludes successful and manual removals. Evidence collection keeps
all removal reasons so a report can exclude them explicitly.

Failed unit, integration, and database jobs upload JUnit reports. The collector
reads reports for the source run attempt. It matches the report's job name to the
failed job. If no failed test case is available, it reads the job log and extracts
Vitest failure summaries. Build failures, missing logs, and unrecognized output
remain failed jobs with an empty `tests` array. They must remain visible as
unattributed failures.

JUnit artifacts expire after seven days. Each collector saves its event JSON as
a `merge-queue-event-*` artifact for 30 days. This includes parsed test evidence.
The event artifact is saved even when webhook delivery fails.

## n8n delivery

Configure these repository secrets to enable delivery:

| Secret | Purpose |
| --- | --- |
| `MERGE_QUEUE_WEBHOOK_URL` | URL of a dedicated n8n webhook that accepts event JSON |
| `QA_METRICS_WEBHOOK_USER` | Basic authentication username |
| `QA_METRICS_WEBHOOK_PASSWORD` | Basic authentication password |

The authentication secrets are shared with the existing QA telemetry setup.
The payload is an event document. It does not use the QA metrics envelope. Use a
separate webhook path from the existing metrics receiver.

The receiver is [QA: Merge Queue Events](https://internal.users.n8n.cloud/workflow/x1ZBxC0GXvRXgHBl)
in the Developer Platform project. Its production endpoint is:

```text
https://internal.users.n8n.cloud/webhook/qa-merge-queue-events
```

It uses the existing `QA_METRICS_WEBHOOK_CREDENTIAL` Basic authentication
credential and the shared BigQuery service account. It validates the four event
types above. Invalid events receive HTTP 400. Valid events receive HTTP 200 only
after BigQuery accepts the write. A storage failure leaves the request failed so
the collector retains the event artifact.

Storage uses these resources in `n8n-telemetry.imported_n8n`:

| Resource | Purpose |
| --- | --- |
| `qa_merge_queue_events_raw` | Full event payloads and fields for joins. A `MERGE` skips an event ID that already exists. |
| `qa_merge_queue_events` | Reporting view with one row per event ID. Use this view to avoid duplicate counts from concurrent deliveries. |

The table is partitioned by observation date. It is clustered by event kind and
group SHA. Test evidence and queue snapshots remain in the `payload` JSON column.
Failed runs without identifiable tests remain stored.

The workflow's manual `Initialize storage` path creates the table and view if
they do not exist. Initialization has already run on the instance. It is safe to
run again. The ingestion path does not run schema changes for each event.

The importable workflow definition is
[`merge-queue/receiver.workflow.json`](merge-queue/receiver.workflow.json).
The storage queries are in [`schema.sql`](merge-queue/schema.sql) and
[`ingest.sql`](merge-queue/ingest.sql). The source export is inactive on import.
The workflow on the instance is published. Tests check the exported validation
code and ensure its SQL matches these files.

Without `MERGE_QUEUE_WEBHOOK_URL`, collection saves artifacts only. An HTTP error
fails the collector job and leaves the event artifact available for recovery.
These collector jobs are separate from required CI checks.

Each document includes `schema_version`, `id`, `repository`, `observed_at`, and
`kind`. The receiver must deduplicate by `id`. A failed-run ID includes the
source run attempt. A PR event ID includes the source workflow run ID, so a
second enqueue or removal of the same PR head remains a separate event.

Example failed-run fields:

```json
{
  "schema_version": 1,
  "id": "acme/app:run:123:2",
  "repository": "acme/app",
  "kind": "merge_queue_run_failed",
  "observed_at": "2026-10-26T08:00:00.000Z",
  "merge_group": {
    "head_sha": "group-sha",
    "head_ref": "gh-readonly-queue/master/pr-42-base-sha"
  },
  "run": {
    "id": 123,
    "attempt": 2,
    "workflow": "CI: Pull Requests (Build, Test, Lint)",
    "conclusion": "failure"
  },
  "failed_jobs": [
    {
      "id": 456,
      "name": "Unit tests / Backend Unit Tests",
      "steps": ["Test Unit"],
      "tests": [
        {
          "report": "packages/example/junit.xml",
          "file": "src/example.test.ts",
          "name": "suite > case",
          "source": "junit",
          "artifact_id": 789
        }
      ]
    }
  ],
  "reports": [],
  "errors": []
}
```

## Correlation limits

Use the full merge-group head SHA to join failed runs to group snapshots.
GitHub can return an empty `pull_requests` list on merge-group runs.
`merge_group.anchor_pr` preserves the PR number in the temporary ref. It does not
identify every PR in the group.

A snapshot's `queue` array contains the whole queue at collection time. Each
entry has a queue entry ID, PR number, PR head SHA, position, enqueue time,
`group_head_sha`, and `group_base_sha`. The group head and base identify the
synthetic commits. They are separate from the PR head SHA. Use matching group
heads and the base links to recover queue dependencies.

Queue snapshots are best effort. Collection can start after GitHub has changed
the queue. `observed_at` is the collection time, not the time of the original
GitHub event. Dequeue payloads do not identify the failed group. Preserve
ambiguous links as unattributed. A nearby timestamp alone is insufficient to
assign a removal to a test.

Several jobs can fail for one group. Several tests can fail in one job. Keep this
shared association when counting affected PRs. A failed run does not establish
that a test is flaky.
The failed jobs also include aggregate checks such as `Required Checks`. Do not
count these jobs as separate queue incidents.

The collector always checks out the default branch. It does not execute code
from the source run or extract artifact files to disk. The workflow-run listener
starts working after its workflow is merged into the default branch.

## Validation

Run focused collector tests from the repository root:

```bash
pnpm exec node --test --test-concurrency=1 \
  .github/scripts/observe-merge-queue.test.mjs \
  .github/scripts/merge-queue-receiver.test.mjs
```

The tests use Python's standard library to check JUnit archives. No additional
Python packages are required.

The receiver was also tested on the instance with a real failed queue run,
repeated delivery of that event, and an invalid event. SQL assertions verified
that repeated delivery left one raw row and one reporting row. A request without
authentication received HTTP 401 from the published endpoint.
