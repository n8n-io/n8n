# NEXA Trade mock workflows

This document describes five inactive n8n workflows for NEXA Trade. The
workflow files in `workflows/nexa-trade/` use synthetic data only. They do not
call a service, read a credential, send a notification, submit an order, or
change a trading control.

## Safety boundary

- `TRADING_MODE` is `PAPER` in the mock data.
- All five workflow exports have `active: false`.
- The mock workflows contain no credentials and no broker nodes.
- No workflow can submit, modify, or cancel an order.
- No workflow can reset the Kill Switch or change risk parameters.
- The 40% concentration guard is represented as a read-only status.
- Production URLs, Render APIs, databases, and browser sessions are out of scope.
- Replace a mock node only after the owner approves the exact integration,
  endpoint, method, credential scope, and notification destination.

## Workflow designs

### NEXA — System Health Monitor

**Trigger:** Every five minutes in the mock export. Production frequency must
be configurable and independent of a trading session.

**Nodes:** `Mock monitoring schedule` creates the trigger. `Mock approved health
response` represents a bounded health request with a timeout configured at the
integration layer. `Validate and classify` accepts only HTTP 200 with
`body.status = ok` and labels other results `FAILED`. `Deduplicate and log`
adds an alert key, a 15-minute cooldown, recovery behavior, and a safe
execution log.

**Inputs and outputs:** The input is a synthetic endpoint, response code, body,
latency, and timestamp. The output includes `VERIFIED` or `FAILED`, an error
category, retry guidance, deduplication data, and a notification placeholder.

**Integration and credentials:** An owner-approved health endpoint and a
least-privilege read-only credential may be added later. The notification
channel also needs explicit approval. No credential is required for the mock.

**Errors:** Connection failures, timeouts, invalid responses, and sustained
failures must be classified separately. Retry only idempotent health reads with
bounded backoff. Send one new incident and one recovery event per deduplication
key.

### NEXA — PAPER Trading Monitor

**Trigger:** Every five minutes in the mock export. Monitoring remains
continuous even when a strategy entry window is closed.

**Nodes:** `Mock monitoring schedule` starts the run. `Mock read-only portfolio
data` returns PAPER portfolio, Kill Switch, risk, scheduler, heartbeat, failed
execution, and data-provider fields. `Validate PAPER controls` marks missing
fields `UNKNOWN` and proves that all order and control operation counters are
false. `Record PAPER status` creates a mock-only notification and audit record.

**Inputs and outputs:** Authorized read-only API responses become a status object.
Unavailable or unauthorized fields become `UNKNOWN`; the workflow never fills
missing values.

**Integration and credentials:** Separate read-only credentials are required
for the portfolio service, scheduler telemetry, robot heartbeat, and data
provider. Each credential must be scoped to its read operation. No broker or
order endpoint is allowed.

**Errors:** Timeouts and authorization failures produce `UNKNOWN`. Repeated
read failures may create an incident through the incident workflow. They never
trigger a trade or change a control.

### NEXA — Daily Executive Report

**Trigger:** 18:00 UTC in the mock export. Production delivery time and
timezone must be configurable.

**Nodes:** `Mock daily schedule` starts the report. `Mock report inputs` provides
synthetic operational sections. `Validate report status` allows only
`VERIFIED`, `UNKNOWN`, `NOT CHECKED`, and `FAILED`, and blocks investment
performance claims.

**Inputs and outputs:** The report consumes prior monitoring results,
incident records, execution errors, and owner approval items. It produces one
concise report with evidence state and a mock delivery placeholder.

**Integration and credentials:** A read-only execution-history source and an
owner-approved notification destination are required. The mock needs no
credentials.

**Errors:** Missing source data remains `UNKNOWN` or `NOT CHECKED`. The report
must not invent metrics or describe synthetic portfolio data as performance.

### NEXA — Development Coordination

**Trigger:** Hourly in the mock export.

**Nodes:** `Mock coordination schedule` starts the run. `Mock approved task
record` represents an owner-approved task and source evidence. `Classify
evidence and approval` validates the task status and separates reported from
independently verified results.

**Inputs and outputs:** Inputs may include owner-approved records, Claude Code
reports, GitHub status, test summaries, Android build results, and emulator
reports. The output preserves evidence links, blockers, approval state, and a
deduplicated notification request.

**Integration and credentials:** GitHub read access and an owner-approved
report-ingestion endpoint may be added later. n8n must not assume access to
Claude Code, Windows files, or local repositories.

**Errors:** Invalid task statuses fail validation. Unchanged blockers use the
same notification key and are not sent repeatedly. Shell commands, source
changes, and Git operations remain disabled.

### NEXA — Critical Incident Alerts

**Trigger:** Every five minutes in the mock export.

**Nodes:** `Mock incident schedule` starts the run. `Mock verified incident`
creates a synthetic verified backend outage. `Validate, deduplicate, and
notify` accepts only listed categories with verified telemetry, adds severity,
cooldown, recovery handling, and bounded retry settings.

**Inputs and outputs:** Inputs are verified telemetry records. Outputs are a
mock-only alert decision, deduplication key, cooldown, recovery flag, and retry
policy. Optional-data gaps are reported as monitoring coverage gaps instead of
critical alerts.

**Integration and credentials:** A read-only incident event source and an
owner-approved notification channel are required. No credential is present in
the mock.

**Errors:** Unsupported or unverified events are not sent. Idempotent reads may
retry twice with 30-second backoff. Notification errors use the error branch
and execution log; they do not trigger trading actions.

## Mock-test matrix

| Case | Expected result |
| --- | --- |
| Healthy service response | `VERIFIED`; no new alert |
| HTTP 500, connection failure, or timeout | `FAILED` with retryable category |
| Invalid health body | `FAILED` with `invalid_response` |
| Repeated identical incident | One alert during the cooldown |
| Healthy result after a failure | One recovery notification |
| Missing PAPER field | `UNKNOWN`; no invented value |
| Non-PAPER mode | `FAILED`; no order or control operation |
| Missing credential or unauthorized read | `UNKNOWN`; owner review required |
| Invalid report status | Validation error; no delivery |
| Unchanged development blocker | No repeated notification |
| Unverified incident category | No alert; coverage gap is recorded |

These are design-time expected results. No workflow was activated or connected
to an external system in this repository.

## Required approvals and activation plan

1. Approve each endpoint and its HTTP method.
2. Approve a separate least-privilege read-only credential for each data source.
3. Approve the notification destination, recipients, and cooldown policy.
4. Import the matching inactive JSON file into a non-production n8n instance.
5. Replace one mock source at a time with an approved read-only integration.
6. Test success, failure, timeout, invalid data, duplicate, recovery, and
   missing-credential cases with synthetic or sandbox responses.
7. Review execution history for secret redaction and correct status labels.
8. Activate only the approved workflow. Keep all other workflows inactive.
9. Revoke or rotate credentials if scope or destination changes.

## Unresolved dependencies

- Approved health endpoints and timeout limits.
- Read-only telemetry APIs for PAPER status and robot heartbeat.
- Execution-history access for the daily report.
- An approved development-report ingestion path.
- An approved notification provider and owner recipient.
- Retention and access rules for execution history.
- Timezone and delivery-time decisions for the daily report.
