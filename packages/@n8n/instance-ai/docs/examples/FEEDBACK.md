# Verified interview feedback

These files are inputs for deterministic graph assembly:

| File | Build name | Nodes | Purpose |
| --- | --- | ---: | --- |
| `hr-interview-feedback.graph.json` | `submit_interview_feedback` | 15 | Validate and record one reviewer response. |
| `hr-feedback-process.graph.json` | `Candidate Journey feedback` | 23 | Receive feedback, check deadlines, and deliver queued notices. |
| `hr-interview-feedback.sql` | — | — | Create the shared tables and feedback function. |

Use each graph as the `graph` field of `build-workflow`. These files are not
n8n workflow exports. Run `plan-build` first when using the Assistant. The
normal build path still uses the existing approval and credential controls.
The graphs were repaired manually. They do not prove automatic generation
quality or end-to-end generation latency.

## Setup

Apply the SQL to the database that contains the `candidates` table described
in [README.md](README.md). Build the feedback helper. Set its workflow ID in
the process graph. Attach Postgres, Google Calendar OAuth, and Gmail
credentials through the existing controls. Replace the three calendar IDs,
the staff identity URL, and the candidate and staff portal URLs.

The portal is an external integration. These graphs do not create its UI or
its authentication service. The staff portal submits a JSON body to the
process's `POST hr-scorecard` webhook. The identity service accepts
`POST {"token":"..."}`. Its verified response must use HTTP 200 and contain
`{"verified":true,"actorType":"staff","reviewerEmail":"..."}`.
The workflow derives the reviewer email from this response. A candidate
session cannot submit feedback. Do not expose this helper as a candidate
Agent tool.

The request contains `session_token`, `candidate_id`, `interview_type`,
`event_id`, `rating`, and `notes`. The interview type is `recruiter`,
`technical`, or `final`. The rating is `strong_yes`, `yes`, `no`, or
`strong_no`. Notes must contain 1–10,000 characters and must not be blank.
The function accepts one response per reviewer and event. A repeated request
preserves the first response.

## Feedback and stage changes

The helper checks the current candidate stage, event ID, and stored reviewer
roster. It reads the event from the configured stage calendar. It requires a
confirmed event with the same candidate and interview ownership markers,
the complete reviewer roster, and valid start and end times. Feedback is
accepted only after the event ends.

The database function locks the candidate record. It checks the stage and
event again before writing. It counts responses against the stored roster.
The last required response changes the stage to `<type>_completed` and
queues one notification in the same transaction. Concurrent responses and
retries do not create another notification for that event.

Recruiter and technical completion queue a candidate invitation to choose
the next interview time. Final completion queues a review request to the
current hiring manager. It does not make a hiring decision. The webhook
returns the helper result only after the database operation completes.
Invalid sessions return HTTP 401. Other typed failures return HTTP 409.

## Reminders and delivery

Every 15 minutes, the process reads current scheduled interviews. It checks
their Calendar events, including events with no feedback. Twenty-four hours
after the current event ends, it queues notices for missing reviewers.
A unique database key limits each reviewer to one reminder per UTC date.
This is a calendar-day limit, not a rolling 24-hour limit.

Every minute, a worker claims up to 20 due notices. Each claim lasts five
minutes. Concurrent workers use row locks and skip claimed rows. The worker
checks the current candidate stage and feedback before delivery. For a
reminder, it reads Calendar again. A future reschedule or cancelled event
can therefore suppress a notice that was already queued.

Successful delivery marks the notice as sent. Failed delivery and Calendar
errors remain pending for a later attempt. Expired claims can be recovered.
Missing recipients remain pending with `RECIPIENT_REQUIRED`. Monitor pending
rows and workflow failures. The reference does not provide an operator alert
or a retry limit.

Delivery is at least once. If the provider sends a message but its response
or the database update is lost, a retry can send it again. Calendar reads and
database writes are separate operations. They do not provide an atomic
transaction against concurrent Calendar changes.

## Validation

On 2026-09-20, 91 fixture cases passed: 34 booking cases, 21 database feedback
cases, 17 feedback runtime cases, and 19 notification cases. The same 17
feedback cases also passed through a real n8n webhook and Execute Sub-workflow
node. The harness waited for asynchronous webhook registration before making
its first effective request.

The tests used an isolated Postgres database and local identity, Calendar,
and mail services. They covered concurrent responses, old event IDs,
unassigned reviewers, candidate sessions, duplicate feedback, provider errors,
zero responses, missing reviewers, delivery retries, expired claims, and
rescheduling before delivery. The integrated case booked and completed all
three interview stages. No real invitations or emails were sent.

One hundred compilations of each graph produced identical JSON. Assembly
took 1.8 ms at p95 for the helper and 2.8 ms for the process. These figures
exclude model calls, review, validation, persistence, and execution.

The unpublished Candidate Journey draft now uses these feedback branches.
Its initial scheduling, old rescheduling form, and manager decision branch
still need repairs. The candidate Agent still lacks a model credential.
Production integrations and candidate conversations remain untested.
