# Verified human hiring decisions

`hr-hiring-process.graph.json` is input for the `graph` field of
`build-workflow`. Use the build name `Candidate Journey hiring` to reproduce
the tested node and group IDs. The graph has 17 nodes, 17 edges, and two
groups. It is not an n8n workflow export.

Run `plan-build` before using the Assistant build path. Normal validation,
approval, and credential controls still apply. This reference was repaired
manually. It does not prove automatic generation quality or generation within
30 seconds.

## Setup and request

Apply `hr-interview-feedback.sql`, then `hr-hiring-decisions.sql`, to the HR
database described in [README.md](README.md). Attach Postgres and Gmail
credentials through their existing controls. Replace the staff identity URL
and the staff and candidate portal URLs. The reference does not create these
portals or their identity service.

The identity service accepts `POST {"token":"..."}`. A valid response must use
HTTP 200 and contain
`{"verified":true,"actorType":"staff","reviewerEmail":"..."}`.
The workflow derives the manager email from this response. The database
checks that it matches the candidate's current hiring manager. A candidate
session or a caller-supplied manager email cannot authorize a decision.
Do not expose this webhook as a candidate Agent tool.

The staff portal sends these fields to `POST hr-manager-decision`:

| Field | Contract |
| --- | --- |
| `session_token` | Valid staff session. |
| `candidate_id` | Candidate selected by the manager. |
| `event_id` | Current final interview event ID. |
| `request_id` | Stable ID for this human action. Use 1–100 letters, digits, underscores, or hyphens. Reuse it for retries. |
| `decision` | `offer`, `reject`, `on_hold`, or `more_info`, selected by the human manager. |
| `notes` | Nonblank internal notes, up to 10,000 characters. |

Invalid request fields return HTTP 400. Invalid sessions return 401. An
unavailable identity service returns 503. State or request conflicts return
409. An accepted decision returns 200 with its decision ID and current stage.
Acceptance means the decision is stored. It does not mean its email was sent.

## State and transaction

The database locks the candidate row. A new decision requires the current
final event, the assigned manager, a stored final reviewer roster, and all
responses from that roster. The candidate must be in `final_completed`,
`on_hold`, or `more_info`. The function records the human decision and its
pending delivery state in the same transaction as the candidate stage update.
A failed candidate update therefore leaves no decision or pending notice.

| Human decision | Candidate stage | Notification recipient |
| --- | --- | --- |
| `offer` | `offer` | Candidate. The message promises no offer terms. |
| `reject` | `rejected` | Candidate. |
| `on_hold` | `on_hold` | Candidate. |
| `more_info` | `more_info` | Reviewers stored for the final interview. |

A repeated request with the same ID and content returns the original decision.
It does not create another notification. Different content with the same ID
returns `REQUEST_CONFLICT`. The original decision notes remain unchanged.
A hold or information request can be followed by another human decision.
An offer or rejection cannot be changed through this endpoint.

Concurrent terminal decisions cannot both succeed. The first accepted
transaction changes the stage, and the next new request fails its stage
check. A retry of an earlier, superseded request reports `superseded: true`
and the current candidate stage. It does not restore the earlier decision.

## Delivery

Every minute, a worker claims up to 20 due records with a five-minute lease.
Concurrent workers skip claimed rows. Before delivery, the workflow checks
that the decision is the latest one for that event, the event is still current,
and the candidate stage still matches. Older queued hold or information
notices are skipped after a later decision.

Successful delivery marks the record as sent. Failed delivery remains pending
for a later attempt. Expired claims can be recovered. A missing recipient
remains pending with `RECIPIENT_REQUIRED`. Internal decision notes are stored
in the database. They are not included in candidate emails.

Delivery is at least once. If the provider sends an email but its response or
the delivery update is lost, a retry can send another email. The state check
and provider send are separate operations. A concurrent change during that
interval is not atomic with delivery. Monitor pending records and workflow
failures. This reference does not include operator alerts or a retry limit.

## Validation

Thirty-three fixture cases passed through the real webhook, n8n nodes, and
isolated Postgres. They covered staff identity, manager assignment, missing
feedback, invalid inputs, duplicate requests, competing decisions, rollback,
multiple delivery workers, failed delivery, expired claims, and stale notices.
Mail used a local test service. No real candidate messages were sent.

The saved main HR draft contains this tested branch. Readback confirmed that
all other nodes and connections were unchanged. Fifty combined hiring and
feedback cases passed. The integrated case booked and completed recruiter,
technical, and final interviews, collected each reviewer's feedback, and
recorded the manager's final decision through the webhook. Its notification
was queued. Separate cases verified delivery and retries.

One hundred compilations produced identical JSON. Assembly took 2.2 ms at
p95. Validation passed against installed node definitions, expression syntax,
and group constraints. Manual editor inspection confirmed the decision path
and the existing Postgres credential control. The draft remains unpublished.

Initial scheduling, the old rescheduling form, sourcing, and the candidate
Agent's model setup still need work. Production identity, mail, and Calendar
integrations remain untested. These fixtures do not prove a complete HR system
or automatic generation within the current latency target.
