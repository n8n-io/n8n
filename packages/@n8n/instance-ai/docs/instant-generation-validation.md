# Instant generation with JEV

## Current build path

The assistant now starts with an LLM plan in plain text. `plan-build` sends
the plan to JEV. It checks coverage, progress, participant scope, and node
operations. Large plans use parallel batches of eight operation questions.
Quality checks use a separate batch. A failed batch does not discard answers
from successful batches. Options come from the installed node registry. Exact
service names take precedence over fuzzy matches. Flat operation and mode
fields are supported. The tool returns only the selected parameter definitions.
It also returns the installed operation inventory for every discovered node.
The LLM can use this inventory to find operations outside its first selections.
Repeated services share discovery within the call.
The review also returns indexed output names and builder hints from the node
registry. This includes candidates that still need LLM selection.
When a step has one unresolved candidate, the result also supplies its parameter
schema in `candidateDefinitions`. The choice remains unresolved. This lets the
LLM inspect required fields without another lookup. Repeated candidates share
one definition. This change addresses a live build that omitted the callable
trigger's required `workflowInputs` after an uncertain JEV result.

The LLM resolves uncertain choices and fills parameters and graph connections.
It uses `ask-user` for human choices. The existing workflow persistence and
Agent Builder paths retain their approval, question, and credential cards.
`build-agent` requires a text plan before a new build or edit. It runs the JEV
review inside the tool before it calls Agent Builder. Resuming an existing
question or credential request does not require another plan.
The public workflow builder also requires a `plan-build` review in the current
run. Resuming its approval card retains the prior review.
After the LLM fills parameters, the public builder also reviews the executable
graph with JEV. This catches differences between the written plan and the
generated nodes. The review runs alongside credential discovery. It returns
findings to the LLM without changing approval or setup cards. Negative and
uncertain findings require reasoning. A review is not execution evidence.
If JEV is unavailable, the result asks the outer LLM to perform the review. This path does not
start another generative model request. The review also respects the existing
parameter-sharing setting and omits credential records and pinned data.
New inline JSON workflows do not need a sandbox. The existing
`N8N_INSTANCE_AI_FAST_PATH_ENABLED=true` opt-in enables this input path in the
UI and warms the JEV connection. It no longer bypasses LLM planning.

The restored build path passed 252 focused regression tests. The next change
passed 144 focused planning, tool, skill, and Agent Builder tests. The thinking
configuration and agent tests also passed, as did all 222 configuration tests.
Builds, type checks, and lint passed for the affected backend packages.

The optional `N8N_INSTANCE_AI_THINKING_EFFORT` setting accepts `low`, `medium`,
or `high` for Anthropic and OpenAI. An empty value preserves the model default.
It controls the orchestrator. It does not change the embedded Agent Builder's
reasoning settings. The local `run` file exposes this setting and retains
`medium` as its default. Keep credentials in `.env.local` or the environment.

## Current HR validation

The first complex HR probe reached JEV in 54 seconds. Its 13 choices took
1015 ms. The full turn took 235 seconds and stopped at a research approval
without saving a workflow. A later 52-step plan completed its JEV review in
975 ms with parallel batches. JEV selected 39 operations. It flagged participant
scope and left coverage and progress uncertain. These findings still need LLM
reasoning; the system does not lower confidence thresholds to accept them.

Full generation remains much slower than one second. Sonnet 4.6 with medium
and low adaptive thinking did not finish the HR build within five minutes.
With extended thinking disabled, it called `build-workflow` after 203 seconds.
Validation rejected node groups that referenced missing node IDs. The LLM then
repaired the IDs and saved an unpublished draft with 54 nodes and five groups.
The draft appeared in the UI. This is a failed latency result, not a completed
HR system.

Manual inspection found behavior gaps in the generated draft. The cancellation
branch also recreated an event. Calendar writes did not first check free/busy.
The outreach loop used the wrong output. The missing-feedback reminder started
only after a scorecard arrived. The draft does not meet the requested quality
standard. It was not published or used to contact candidates.

Targeted JSON edits now merge changed nodes by saved ID and replace only named
source connection entries. They require the current saved version. The normal
checksum check also detects changes made during validation. The existing
approval, validation, grouping, and setup paths still apply.

Unsaved inline JSON builds now retain their source in the current thread.
A failed build returns `draftEditsAvailable` and its `sourceHash`. The LLM can
repair only the failed fields with `draftEdits` instead of resending the graph.
The tool rejects a stale source hash. It clears the cached source after a save.
Saved workflows still use `jsonEdits` and the current saved version. Regression
tests cover context changes, stale or missing source, existing workflows, and
the create policy. The builder also requests compact JSON to reduce output text.

A live two-node regression deliberately omitted a required trigger field.
The first build returned its diagnostic in 48 ms. The targeted retry saved in
540 ms, including a 383 ms JEV graph review. Readback confirmed that the other
node and both IDs stayed unchanged. The full conversation took 39.5 seconds.
These results do not meet the one-second end-to-end generation target.

A live outreach repair fixed the loop output, the skipped-item return, and
the delivery-error path. The successful build tool call took 402 ms. The full
chat took 62 seconds, including a rejected malformed edit and its correction.
Readback confirmed that only one node property and four connection entries
changed. All node IDs, all groups, and the other branches remained unchanged.
This confirms targeted persistence, not live Gmail or Postgres execution.
The LLM skipped JEV during this edit despite the instruction, which prompted
the new review guard. A later small reminder plan took 327 ms in JEV.

The reminder repair exposed fields that belonged to the old Wait mode. Node
edits now support `replaceParameters: true` to remove them. The successful retry
ran the required JEV review in 329 ms and saved in 395 ms. The full chat took
34.4 seconds. Readback confirmed that only the three Wait nodes changed. Each
now derives its due time from the associated calendar event start minus 24
hours. The other nodes, connections, groups, and unpublished state were kept.

An isolated Postgres fixture then executed the saved outreach and scorecard
branches. Gmail output was pinned. The test did not send email. The outreach
branch updated two new candidates, skipped a candidate without email, and
left an already contacted candidate unchanged.

The first scorecard run reported success but stored no response. Its duplicate
lookup returned zero items and stopped the branch. The Assistant repaired that
node with `alwaysOutputData` and changed three query parameter expressions to
arrays. JEV took 858 ms. The save took 178 ms. The full repair turn took
80.4 seconds. JEV returned uncertain quality checks, so its response alone did
not establish correctness.

The fixture rerun stored the first scorecard and reached stage evaluation.
It preserved commas, quotes, and a newline in the notes. A duplicate response
did not repeat the insert. The outreach, first-response, and duplicate-response
runs took 133, 126, and 131 ms respectively, including API polling. These are
execution measurements for copied branches with a synthetic database. They
are not generation measurements or live integration results. The remaining
calendar, decision, participant, and missing-feedback paths still need repair.

The candidate Agent draft reached setup after 201 seconds. Manual inspection
found that its data tools relied on instructions for participant scope and did
not persist calendar changes to the ATS. The draft needs correction before a
candidate can use it. The revised build instructions require verified context,
fixed queries, availability checks, and ordered calendar and state updates.
An edit added a fixed read query and reported three required mutation workflows.
Readback still found incomplete participant binding and a missing identity
service. The model remained unconfigured. The existing question and credential
cards allowed setup to be deferred. Candidate chat execution remains unverified.

The builder later attached three supporting workflows for booking, rescheduling,
and cancellation. Inspection of their executable nodes still found missing
participant validation, partial-failure recovery, and duplicate handling.
The new graph review flagged all three concerns in all three workflows.
Six live review calls took 988–1060 ms while running concurrently. A separate
repeated-input probe took 725, 348, and 320 ms with one batch. Two parallel
batches took 753, 326, and 330 ms. This small probe did not show a consistent
benefit from splitting six questions, so the review keeps one batch.

A later edit exported 47 KB of SDK source before reading the saved node data.
The tool descriptions now direct small repairs to `get(full=true)` and
`jsonEdits`. This avoids the unnecessary source export. A fresh latency run
is still needed to measure its effect.

That edit finished after about 620 seconds. It separated cancellation from
rescheduling, rejected unknown actions and missing records, and updated the
stored calendar event instead of deleting and recreating it. Eight runtime
fixture cases passed in 125–136 ms each. The cases covered outreach, first and
duplicate feedback, cancellation, repeated cancellation, unknown actions,
missing candidates, and rescheduling. Calendar and Gmail outputs were pinned.
These results verify branch routing and database effects, not provider calls.
The edit still omitted availability checks and preserved an incorrect end-time
expression. Its graph review took 1072 ms and reported unresolved concerns.

The LLM then claimed that the native Calendar node had no availability
operation. This was false: the installed node supports `calendar/availability`.
The plan result now includes other installed operations as well as the selected
definitions. A live catalog probe returned this operation and selected it with
0.96 confidence. The probe took 806 ms, including 795 ms for JEV. All 26 existing
plan and skill tests passed. The package build, type checks, and lint passed.

The main HR draft and the Agent's supporting workflows also use different
database schemas. The former stores stage event IDs in `candidates`; the latter
expects `interviews` and `interview_slots`. They were built in separate chats.
They still need a shared data contract before they can form one HR system.
The build guidance now requires this contract in the Agent handoff. It also
distinguishes a related lifecycle workflow from a callable Agent tool.
All 17 existing skill tests passed after this guidance change.

A scheduling repair then took 834.9 seconds and saved 64 nodes. It added an
existing-event lookup, duration calculation, conflict lookup, and conflict
filter. Five of six runtime cases passed. An empty calendar still stopped the
branch. The LLM incorrectly claimed that Code nodes run with zero input items.
The next two-node repair added `alwaysOutputData` and ignored the resulting
empty object. It took 52.6 seconds, including 351 ms for the plan decision and
604 ms for graph review. All six scheduling cases then passed in 131–153 ms.
The cases verified own-event exclusion, empty calendars, busy slots, cancelled
and transparent events, invalid dates, and failed database writes. Actual
Code nodes and Postgres ran. Calendar and Gmail responses remained pinned.
The eight earlier branch cases also passed on the repaired version. Manual
UI inspection confirmed five saved groups and the new reschedule path.

The longer repair exposed missing fields in workflow reads. The adapter now
returns node groups, IDs, error handling, retry settings, and empty-result
settings for current and historical versions. A live read confirmed that the
LLM received all five groups and the saved error policy. Targeted conflict
guidance now uses a fresh JSON read before retrying. Node-edit arrays are also
accepted, which avoids regenerating an unambiguous edit just to add a wrapper.

The LLM also inverted a graph-review probability. The field is now named
`probabilityOfYes`, with explicit guidance that a low value indicates a concern.
Negative findings still require reasoning and execution evidence.

The existing UI was checked in the isolated instance. The research approval
card retained its allow-once, session, and deny controls. The Agent model
question accepted an answer. Postgres, Google Calendar, and Gmail credential
cards each supported deferral, and the builder resumed after them. No real
integration credentials were entered. This confirms the interaction path;
it does not establish successful external execution.

The latest focused build, plan, registry, and Agent tests passed 222 cases.
All 318 backend adapter tests passed. Builds, type checks, and lint passed
for Instance AI and the CLI.
After adding graph review, 290 existing build, plan, skill, and workflow-tool
tests passed. The package build, type checks, and lint passed.
The user then approved the new regression cases. They cover graph-review
fallback, unchanged content during targeted edits, stale-version rejection,
approval-card resume, and complete current and historical reads. All 322
adapter tests passed. The affected Instance AI suites passed 307 tests.

A new candidate-details workflow now reads the same `candidates` records as
the main HR workflow. It validates a session token through a local identity
fixture before its parameterized database query. Five Playwright API cases
passed: three owned interviews, empty event fields, a missing candidate,
an invalid token, and an extra caller-supplied candidate ID. The identity and
Postgres calls were real local calls. Calendar output was pinned. Executions
took 131–139 ms, including polling. Output checks excluded raw events and
internal fields. Generation still took 577.1 seconds to save, including two
validation retries. The canvas and its existing Calendar setup card were
checked manually. The credential card accepted deferral.

An Agent Builder edit replaced the Agent's direct database lookup with this
callable workflow in 86.9 seconds. Readback found an incorrect error description
and a conflicting identity skill. A second edit corrected them in 155.9 seconds.
The Agent UI shows the workflow tool and corrected identity instructions.
Its remaining mutation workflows still use an incompatible schema. The Agent
instructions say not to call them until they are repaired. Candidate chat still
needs a model, and real Calendar execution still needs its credential.

The draft-repair change passed 149 focused tests, including six new regression
cases. The Instance AI build, type checks, and lint passed.

## Historical compiler benchmark

The measurements below describe the earlier bounded compiler, before the
LLM-first path was restored. They are not measurements of the current full
build path. The small compiler catalog could not build the requested HR
workflow or candidate-facing Agent. Do not use these figures to claim that
complex workflow or Agent generation completes in one second.

Live validation date: 2026-09-20. The tested model was `jev-1.13.0`, selected
through `jev-latest`. These results cover the supported compiler operations.
They do not establish a latency guarantee for all natural-language requests.

## API

The [TypeSafe API reference](https://docs.typesafe.ai/api) defines
`POST https://api.typesafe.ai/v1/systemone`. Authentication uses a Bearer token.
The body contains `model`, `state`, and a map of `questions`.
Each question has instructions and bounded criteria. Supported question types
are `choice`, `noul`, and `score`. Live requests verified all three types.

JEV selects among options. The compiler builds the workflow or agent config.
Independent route and operation questions share one request. Later compiler
reads reuse the matching answer within that turn. Low confidence still causes
a fallback. No confidence threshold was reduced for these measurements.

## End-to-end measurements

The measurement starts before the chat POST. It stops at the matching
`run-finish` SSE event. It includes routing, compilation, validation, database
writes, tool events, the final reply, and run completion. It excludes thread
creation and later execution of the generated artifact.

The probe used the built n8n backend, a separate SQLite database, and live JEV.
The backend had no usable generative model endpoint. An unexpected LLM fallback
therefore failed the probe. The test account allowed workflow writes in advance.
Human approval time was not part of the measurement.

Playwright ran three sequential rounds against an active connection pool.
All 15 turns finished within 1000 ms.

| Operation | Round 1 | Round 2 | Round 3 |
|---|---:|---:|---:|
| Create workflow | 407 ms | 372 ms | 442 ms |
| Edit workflow | 397 ms | 406 ms | 426 ms |
| Repair workflow | 473 ms | 507 ms | 465 ms |
| Create agent | 459 ms | 365 ms | 498 ms |
| Edit agent | 353 ms | 348 ms | 374 ms |

A second run started after a backend restart. Startup connection warmup was
enabled. All 15 turns passed again. The first workflow turn took 681 ms.
The complete second run is below. Both runs together passed 30 of 30 turns.

| Operation | Round 1 | Round 2 | Round 3 |
|---|---:|---:|---:|
| Create workflow | 681 ms | 352 ms | 382 ms |
| Edit workflow | 446 ms | 459 ms | 367 ms |
| Repair workflow | 473 ms | 433 ms | 417 ms |
| Create agent | 496 ms | 380 ms | 395 ms |
| Edit agent | 415 ms | 465 ms | 404 ms |

A separate eight-node workflow build used HubSpot, Slack, and Postgres.
Its three saved turns took 882, 413, and 383 ms. The saved graph had eight
nodes and the requested `customers` webhook path. Its external integrations
were not executed because the test account had no integration credentials.

The probe performed these checks in each round:

1. Create a POST webhook with email and company validation, an HTTP call,
   and an ID response.
2. Read the saved graph. Publish it on the isolated test server. Call its real
   webhook. Confirm that the local HTTP service receives the request body and
   that the webhook returns its ID.
   In the second run, also confirm that invalid email returns 400 without an
   HTTP service call.
3. Change the HTTP Request URL through chat. Read and publish the saved change.
   Execute the workflow. Confirm that the service receives the new URL.
4. Make the local service return 503. Confirm that the workflow fails.
5. Ask the assistant to fix that failed execution. Confirm that the same saved
   workflow gains retry settings. Publish the repair. Return 503 once more.
   Confirm that the retry reaches the service and returns its ID successfully.
6. Create Sales Helper with HubSpot and Slack tools. Read its saved config.
   Confirm that there are two tools, that runtime inputs use `$fromAI`, and
   that the instruction to never promise discounts remains present.
7. Add a Postgres lookup tool through chat. Confirm that the agent ID stays
   the same, the two existing tools stay unchanged, and the new tool selects
   the requested `leads` table.

The agent tests verified saved draft configuration. They did not execute
HubSpot, Slack, Postgres, or a conversational model. Those agents still need
model and integration credentials before they can run.

## Latency limits

Before connection warmup, full cold turns took about 1.1 seconds. Direct cold
JEV reads took 787–916 ms. Startup now opens the connection with the model-list
endpoint. A transport probe reused one connection after 6 and 20 seconds of
idle time. Those reads took 263 and 420 ms.

The one-second result applies to these supported operations with a warm
connection and approved writes. It is not a service-level guarantee. Network
delays, cold connections after idle expiry, larger graphs, missing information,
human approval, agent Preview, and generative fallback can take longer.
The decision timeout remains 1500 ms. It was not reduced to hide slow reads.

## Regression checks

- 178 compiler, router, tool, and simulation tests passed.
- 222 configuration tests passed.
- 3 transport timeout tests passed.
- 13 CLI adapter and build-mode tests passed.
- A live cancellation check ended with `user_cancelled`, no compiler tool
  calls, and no saved workflow binding.
- The backend dependency build passed: 60 tasks.
- Type checks passed for Instance AI, config, backend-network, and CLI.
- Lint passed for the same four packages. CLI lint excluded the pre-existing
  generated `bin/.cache` tree, which the package command otherwise scans.

The live probe used a test-owned `N8N_USER_FOLDER`. It did not use the
developer's n8n database. Its HTTP service accepted only local test traffic.
No external integration messages or records were created.
