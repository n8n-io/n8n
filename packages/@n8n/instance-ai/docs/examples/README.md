# Deterministic HR graphs

The booking graph and the [feedback process](FEEDBACK.md) share a database
contract. Apply `hr-interview-feedback.sql` before you use either reference.
It creates the interview roster, feedback records, and notification queue.
The [human hiring decision process](HIRING.md) uses the completed final stage.

`hr-candidate-booking.graph.json` is input for the `graph` field of
`build-workflow`. It is not an importable n8n workflow export. Use the name
`book_interview` to reproduce the tested node and group IDs. Run `plan-build`
first when using the Assistant. The normal build path still validates the
result and requests approval and credentials when required.

The graph has 28 nodes, 35 edges, and nine groups. It omits node IDs, positions,
connection arrays, group IDs, and filter row IDs. The compiler supplies these
fields from node names, edges, groups, and the installed node schemas. The
remaining parameters define the behavior. Deterministic assembly does not
infer or repair that behavior.

This reference comes from a manual repair of an Assistant draft. It is not
evidence that the Assistant generated a complete booking system automatically.
The draft remains unpublished.

## Setup and input

Replace the identity URL and the three stage calendar placeholders. Attach
Postgres and Google Calendar OAuth credentials through the existing credential
controls. The identity service must accept `POST {"token": "..."}`. A valid
response must have HTTP status 200 and the body
`{"verified": true, "candidateId": "..."}`. Use a verified candidate identity
from that service. Do not accept a caller-supplied candidate ID.

The callable trigger accepts these fields:

| Field | Contract |
| --- | --- |
| `session_token` | Nonempty string for the identity service. |
| `interview_type` | `recruiter`, `technical`, or `final`. |
| `start` | Future RFC 3339 timestamp with an explicit UTC offset. |
| `confirmed` | Boolean `true`, after the candidate confirms the type and time. |

The workflow expects one input item. A false or missing confirmation stops
before service access. It does not perform an availability preview.

The existing `candidates` table supplies `id`, `email`, `recruiter_email`,
`hiring_manager_email`, `technical_interviewers` (`text[]`), `stage`,
`updated_at`, and the three stage event fields. The read query also selects
`name` and `role`. All writers must update `updated_at` when they change the
record. The event fields are `recruiter_event_id`, `technical_event_id`, and
`final_event_id`.

| Type | Eligible stages | Duration | Assigned attendees |
| --- | --- | ---: | --- |
| Recruiter | `contacted`, `recruiter_cancelled` | 45 minutes | Candidate and recruiter. |
| Technical | `recruiter_completed`, `technical_cancelled` | 60 minutes | Candidate and all technical interviewers. |
| Final | `technical_completed`, `final_cancelled` | 60 minutes | Candidate and hiring manager. |

The corresponding event field must be empty for a new booking. A pending
`<type>_booking` record can recover the same request. A matching
`<type>_scheduled` record returns the existing result.

## State and recovery

The workflow checks the stage calendar and every assigned interviewer calendar
over the complete requested interval. Missing calendars, provider errors, and
incomplete responses stop the write. This uses the
[Google Calendar free/busy API](https://developers.google.com/workspace/calendar/api/v3/reference/freebusy/query).
It does not check the candidate's personal calendar.

A conditional database update claims the candidate record before event
creation. It checks the stage, event field, and record version. The event ID
is derived from the verified candidate, interview type, and normalized start
time. Creation supplies this ID and requests attendee updates. The provider
supports caller-supplied IDs through its
[event insert API](https://developers.google.com/workspace/calendar/api/v3/reference/events/insert).

The workflow reads back the event before it reports success. It verifies the
ID, ownership markers, interval, attendee set, and status. A conditional
database update then stores `<type>_scheduled` and the reviewer roster in
`hr_interview_sessions`. Both writes use one transaction. Feedback uses this
roster, even if the candidate's assigned interviewers change later.
A 409 response uses the same
readback path. It never generates a replacement ID for a retry.

An uncertain provider or database failure retains the pending claim. An
identical retry can finish the database update without another invitation.
After 15 minutes, a pending claim with no event requires recruiter review.
A matching event can still complete an expired claim. The workflow does not
automatically release pending claims.

Success returns only `booked`, `alreadyBooked`, `interviewType`, `start`, and
`end`. Typed errors and thrown exceptions are failures. The Agent must not
report a completed booking for either result.

## Validation and limits

On 2026-09-20, 100 compilations produced identical JSON. Assembly took 3.4 ms
at p95. The comparison preserved saved parameters, executable edges, and
group membership. It excluded editor positions and replaced local setup
values. These times exclude model calls, validation, and persistence.

Thirty-four Playwright cases passed with 46 real n8n executions. They used
an isolated Postgres database and local identity and Calendar services.
Executions took 129–165 ms, including polling and record readback. Cases
covered concurrent requests, incomplete availability, duplicate requests,
provider failures, and failed database finalization. The integrated case
booked, rescheduled, cancelled, and rebooked an interview through the same
candidate record. No real invitations were sent.

Manual UI inspection confirmed all nine groups and the existing Google
Calendar credential control. The candidate Agent has booking, interview
details, cancellation, and rescheduling tools. Its model remains unconfigured,
so candidate conversations have not been executed.

The feedback reference now produces `recruiter_completed`,
`technical_completed`, and `final_completed`. It also provides feedback
deadlines and queued notifications. The broader HR draft still needs repairs
to initial scheduling and its old rescheduling form. Manager decisions now
use the [verified human decision process](HIRING.md).
This booking reference does not provide a slot-listing tool.

The database claim does not reserve calendars against outside writers.
Rebooking a cancelled event at its original start time can encounter the old
event ID and require review. Production identity and Calendar access remain
untested. Do not treat the fixture results as a complete HR lifecycle test or
an Assistant generation result within the current 30-second target.
