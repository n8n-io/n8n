# Instant generation with JEV

## Current target and regression coverage

The current target is 30 seconds from the user prompt to task completion.
This replaces the earlier one-second target. Measure planning, JEV decisions,
parameter generation, save, required verification, and the final reply.
Do not treat graph assembly time as total task time.

## Batched branch verification

The verifier accepts up to ten named scenarios in one call. Each scenario
uses the existing fixture checks, credential checks, attempt budget, and
verification records. Runs are sequential. A failed, blocked, waiting, or
running result stops the batch. Cancellation and a changed workflow version
also stop the remaining cases. Completed results remain available.

Each result retains its simulation, coverage, repair target, and publication
limits. The batch does not create a combined verification claim. A passing
batch does not prove paths that the supplied inputs did not exercise.

Three fresh Assistant edits with the same prompt structure took 27.9, 25.7,
and 25.7 seconds. The earlier three separate-call edits took 33.3, 34.6, and
32.2 seconds. The new turns included planning, JEV review, saving, both branch
executions, and the final reply. Each used one verification call with two
scenarios. These are three observations, not a latency guarantee.

Readback confirmed that each edit changed only the requested duration. Node
IDs, connections, groups, and the other branch remained unchanged. The draft
stayed unpublished. The editor displayed the final value of 210 minutes.
Four separate runtime checks passed. They covered both boolean branches and
rejected string and numeric confirmation inputs.

The test account permitted writes in advance. Human approval time was not
measured. The workflow had four nodes and no external effects. These results
do not prove full HR generation or candidate Agent conversations within
30 seconds. The existing approval and credential flows are unchanged.

Twenty-five new regression cases cover batch input validation, sequential
execution, fixtures, failed and interrupted runs, version changes, evidence
limits, and the persisted attempt budget. All 229 affected tests passed.
The package build, lint, and type checks passed.

## HR feedback integration

The [feedback reference](examples/FEEDBACK.md) now connects booking, verified
reviewer feedback, completed stages, and queued notifications. The main HR
draft uses the verified helper instead of caller-supplied reviewer emails
and fixed scorecard counts. Feedback reminders start from the current
Calendar event's end time, including when no reviewer has responded.

Ninety-one fixture cases passed. The same 17 feedback runtime cases also
passed through the real webhook and sub-workflow entry. Tests used real n8n
nodes and isolated Postgres with local identity, Calendar, and mail services.
No real invitations or emails were sent. A query error found by the first
reminder run was fixed before the passing run. Reminder delivery also checks
for rescheduling after a notice enters the queue.

One hundred compilations per reference produced identical JSON. Assembly
took 3.4 ms at p95 for booking, 1.8 ms for feedback, and 2.8 ms for the feedback
process. The references were repaired manually. These measurements do not
prove automatic generation within 30 seconds. The latest full Assistant edit
measurements are listed below. Other main HR branches and the Agent's
model setup remain incomplete.

## Precise parameter edits

`jsonEdits` and cached `draftEdits` now accept `parameterUpdates`. Each update
contains a path of object keys and array indices, plus the new value. The path
starts inside the node's parameters and must already exist. Code changes that
value and preserves the other rows, row IDs, nodes, credentials, connections,
and groups. Repeated or overlapping paths are rejected. Parameter updates
cannot be combined with full parameter replacement on the same node.

The saved version and checksum checks still apply. The existing approval card
still gates the write. Normal build validation and credential setup still run.
Graph input also rejects a group description above the shared 145-character
limit before assembly, instead of failing later at the save endpoint.

Thirty-five new regression cases cover these behaviors and the plan checks.
Negative, uncertain, and missing JEV answers still require LLM reasoning for
parameter-only edits. All 227 affected tests passed. The package build, lint,
and type checks passed.

The plan's scope check now distinguishes workflow runtime access from the
Assistant's authoring action. In three live comparisons, a local constant
edit passed while plans with unverified identity, missing reminders, or an
incorrect effect order still required reasoning. These examples do not
establish general review accuracy. Decision thresholds were not reduced.

A local edit to the 65-node HR graph produced identical JSON in 1,000 runs.
The input stayed unchanged. Applying the edit took 0.28 ms at p95, excluding
the model, review, build validation, and persistence.

The first live edit with scope guidance and combined read calls took 33.5
seconds. A subsequent nested edit reduced the generated edit payload from
428 to 129 characters and took 30.2 seconds. Three further fresh turns took
33.3, 34.6, and 32.2 seconds. Each changed one duration, saved on its first
attempt, verified both branches, and completed its final reply. Readback
confirmed that only the requested parameter changed. The draft stayed
unpublished. Four separate runtime checks passed for the final version.
They covered both boolean branches and rejected string and numeric inputs.

These earlier edits did not meet the 30-second target consistently. Model
generation between tools and separate verification calls dominated those turns.
The batched verification results above replace these latency measurements.
The measurements do not cover automatic generation of the full HR process.

## Existing compiler regressions

Thirty new regression cases cover expression syntax, draft repairs by name,
and filter type validation. The syntax cases cover nested objects, literal
fields, hidden parameters, disabled nodes, placeholders, and parser errors.
The repair cases retain node IDs, connections, credentials, groups, source
hashes, saved versions, and approval handling.

Filter validation previously discarded errors returned by its value parser.
It now reports those errors at the condition's index. Strict type errors and
failed conversions are reported before execution. Valid unresolved expressions
and single-value operators remain accepted. The regression failed before the
fix and passed after it.

The affected suites passed 2,208 tests, including the workflow package's three
expression engines. Dependency builds, package lint, and type checks passed.

## Edit planning and JEV review

A fresh four-node interview handoff took 53.1 seconds to build, verify both
branches, and finish the reply. The successful build took 485 ms, including
a 326 ms JEV graph review. A follow-up parameter edit took 44.3 seconds.
It attempted two saves before the required plan review, then fetched node
definitions for a change to one number.

The edit guidance now requires a plan review in the current turn. Parameter-only
plans can use `steps: []` when node types and operations stay unchanged. This
path still reviews the plan with JEV. It skips catalog and definition lookups.
A missing review returns explicit recovery guidance before any save. Exact
display names also match their parenthetical aliases, such as `Edit Fields`
for `Edit Fields (Set)`. This prevents unrelated fuzzy candidates from adding
definitions to a known node choice.

The first fresh edit after the tool and skill changes took 40.0 seconds.
It used the empty step list but still attempted one save before the review.
The system prompt now states the sequence for edits as well as new builds.

JEV also reported recovery concerns for a workflow with no external effects.
The graph review now supplies explicit true and false criteria for identity,
partial failure, and empty lookup results. In three paired comparisons, the
local transformation graph changed from `needs_reasoning` to `no_concerns`.
An incomplete booking graph still required reasoning in all comparisons.
Its identity, recovery, and empty-result checks each returned `no` with the
new criteria. These examples do not establish general review accuracy.
Missing and uncertain answers still go to LLM reasoning. The normal approval,
setup, validation, and verification paths remain in place.

The affected planning, review, build, skill, and system-prompt suites passed
175 tests. The package build, lint, and type checks passed.

A fresh edit with both changes followed the required sequence and saved on
its first attempt. JEV returned `no_concerns`. The save took 517 ms, including
the 311 ms graph review. Both output branches passed verification. The full
turn took 35.7 seconds, including the final reply. This still exceeds the
30-second target. These are individual live probes, not a latency guarantee.
Four separate execution cases passed in 0.9 seconds. They checked both typed
outputs and rejected string and numeric confirmation values at the IF node.
Readback confirmed that only the requested duration value changed. Node IDs,
connections, and groups stayed unchanged. The workflow remains unpublished.

## Expression validation and draft repair

The JSON build path now checks expression syntax before save. It uses the
runtime parser without evaluating expressions. Installed node schemas select
the visible parameters and apply `noDataExpression` rules. Literal fields,
disabled nodes, and placeholder values do not produce syntax errors. SQL
inline templates without the expression prefix are outside this check.
The parser loads only when an expression needs it. The check leaves the
supplied workflow unchanged and reports the node and parameter path.

The malformed Calendar expression from the booking repair now produces
`INVALID_EXPRESSION`. All five current HR drafts pass this syntax check.
Across 100 runs per draft, validation took 1.0–4.3 ms at p95 for the four
supporting workflows. The 64-node Candidate Journey took 13.1 ms at p95.
These measurements exclude graph assembly and all other build checks.
Syntax acceptance does not prove the workflow's behavior.

A live failed build also exposed a repair mismatch. Graph assembly generates
node IDs, while the draft edit format previously required the LLM to supply
those IDs. The LLM tried a name, guessed an ID, and then rewrote the full
source. That probe took 184.6 seconds.

`draftEdits` now accepts an existing node's exact unique name when its ID is
omitted. Code resolves the name inside the cached draft. Unknown or ambiguous
names are rejected. Duplicate edits to the same ID are rejected even when
one edit uses a name. New nodes still require IDs and full node fields. Saved
`jsonEdits` still require IDs. Source hashes, saved versions, approval, and
credential setup checks remain in place.

A fresh live probe rejected malformed syntax in 42 ms. Its first repair by
name saved in 461 ms, including a 313 ms JEV graph review. Readback confirmed
unchanged node IDs and connections. Only the requested expression changed.
The full Assistant turn took 40.8 seconds. This is one probe, not a latency
guarantee. The repaired workflow returned `{"candidate":{"status":"ready"}}`
in verification and in a separate manual execution from the editor. The
workflow remains unpublished.

The earlier check passed all 407 existing tests in the affected expression,
SDK validation, graph, source compiler, edit, build-tool, and runtime-skill
suites. The new regression cases and current checks are listed above.

## Latest HR booking reference

The [portable booking graph](examples/README.md) now records a tested complex
input for deterministic assembly. It has 28 nodes, 35 edges, and nine groups.
One hundred compilations produced identical JSON at 4.1 ms p95. Parameters,
executable edges, and groups matched the saved draft after replacing local
setup values. This reference was repaired manually. It does not establish
automatic generation quality.

All 34 booking fixture cases passed with 46 executions in 7.7 seconds.
Individual executions took 129–165 ms, including polling and database
readback. Real n8n nodes used isolated Postgres and local identity and Calendar
services. Tests covered every assigned interviewer calendar, conditional
record claims, duplicate requests, concurrent requests, and recovery after
provider or database failure. One case booked, rescheduled, cancelled, and
rebooked through the shared candidate record. No real invitations were sent.
The 145 focused graph, build-tool, and runtime-skill tests passed. The package
build, lint, and type checks also passed.

Manual inspection confirmed the saved groups, request parameters, and existing
Calendar credential control. The candidate Agent now has four workflow tools,
including booking. Its three affected skills were updated and read back with
the new contract. The Agent UI shows all four tools. Its model remains unset.
Candidate conversations and production integrations remain unverified.

A separate planning-only Assistant probe took 189.4 seconds, including a
930 ms JEV review. JEV left the quality checks uncertain. It also proposed a
native Calendar create operation that did not expose all required controls.
The manual graph uses HTTP Request for the fixed event ID and response status.
An operation selection does not establish parameter support. Initial runtime
testing also found an expression parse error that structural validation had
missed. The saved graph corrects it.

The main HR draft still needs compatible stage transitions, feedback deadlines,
initial scheduling, and participant checks. The 30-second end-to-end target
remains unproven. The sections below retain earlier measurements and repairs.

## Deterministic JSON assembly

`build-workflow` now accepts `graph`. The LLM supplies parameters, explicit
edges, and optional groups. Edges and groups refer to node
names. Code generates node IDs, group IDs, positions, and n8n connection JSON.
The compiler reuses the SDK's deterministic IDs and existing layout. Node and
group IDs remain stable when the input order changes. Parameters, expressions,
branch outputs, target inputs, loopbacks, and AI connection types are preserved.
The compiler rejects duplicate names, duplicate edges, and unknown references.
It does not infer missing behavior or connections.

The result enters the existing source validation, approval, save, and credential
setup path. Failed builds can use the existing `draftEdits` repair path. Small
saved-workflow edits still use `jsonEdits`. JSON assembly makes no model calls.
The LLM still plans behavior and fills parameters after the JEV review.

The graph compiler also fills missing row IDs in assignment collections and
filter conditions. It reads the installed node schema, including nested
collections such as Switch rules. Supplied IDs and business values remain
unchanged. Ordinary JSON data does not receive row IDs. An invalid supplied ID
still reaches the normal parameter validator. Repeated object references do
not cause rows at different paths to share generated IDs.

A live branching HR handoff used this path without any model-generated row IDs.
The compiler added six assignment IDs and one filter ID. The build saved on its
first attempt in 477 ms, including a 321 ms JEV review. The full Assistant turn
took 49.2 seconds. Two verification runs exercised the true and false branches
with synthetic trigger input. Four additional execution cases passed: both
typed outputs, rejection of a string boolean, and rejection of a numeric
boolean. Manual UI inspection confirmed both routes and the Edit Fields values.
The workflow remains unpublished.

With installed schema lookup and row ID generation, the 64-node HR graph
assembled in 11.0 ms at p95 across 100 identical outputs. The other three HR
graphs took 0.9–4.6 ms at p95. These runs preserved behavior after excluding row
IDs from the comparison. They measure deterministic assembly, not LLM latency.
The 155 focused Instance AI tests, package build, lint, and type checks passed.

`plan-build` now stores its accepted node and operation choices. It returns a
`planId`. A graph node can reference a selected `step` instead of repeating its
type and version. Code also fills the selected resource, operation, and mode.
Conflicting operation fields are rejected. Uncertain choices are not stored as
accepted selections. The LLM resolves them and supplies explicit node fields.
Explicit nodes and selected steps can appear in the same graph.
References are scoped to the current conversation and run. A newer review
replaces the prior reference. Approval resume retains the approved reference.

A benchmark supplied fixture selections for all four HR graphs. The compiled
JSON matched the explicit graph output in 100 runs per graph. References removed
another 6–10% of graph input. The 64-node graph used 14 operation templates and
assembled in 15.0 ms at p95. This benchmark measures compilation from known
selections. It does not measure JEV's ability to select every HR operation.

A live manual workflow then used real JEV selections for Manual Trigger and
Edit Fields. JEV took 327 ms. The LLM supplied both nodes by step reference.
The build resolved their installed types and versions and saved on its first
attempt in 458 ms. Execution returned `status: "ready"`, the number `45`, and
the boolean `false` as requested. The full conversation took 31.2 seconds.
This verifies the selection-to-compiler handoff. It is not a comparison with
the earlier intake request, which required different parameters and behavior.

A local benchmark rebuilt four saved HR drafts 100 times each. Each run produced
identical JSON. Every parameter and executable edge matched the source draft.
Unconnected trailing output slots are omitted. Group membership and workflow
settings were preserved. The times below include assembly, layout, and JSON
serialization. They exclude model generation, JEV, validation, and persistence.

| Draft | Nodes | First assembly | Assembly p95 |
| --- | ---: | ---: | ---: |
| Candidate Journey | 64 | 28.2 ms | 29.5 ms |
| Candidate interview details | 9 | 3.9 ms | 2.0 ms |
| Interview cancellation | 22 | 4.4 ms | 5.7 ms |
| Interview rescheduling | 23 | 4.7 ms | 5.4 ms |

The graph tool input was 11–17% smaller than the prior compact `sourceCode`
input. Parameters account for most of these HR inputs. This change removes
model-generated JSON structure. It does not remove parameter generation time.
All 48 candidate fixture cases passed with graphs rebuilt through this compiler.
These cases use the isolated database and identity service. Calendar responses
use fixtures. This result does not establish complete HR lifecycle quality or
one-second conversation latency.
The 168 focused Instance AI tests and 53 SDK ID utility tests passed. Builds,
lint, and type checks passed for both packages.

A live Assistant request then built an unpublished candidate intake validator.
It used `plan-build`, supplied `graph` to `build-workflow`, and saved on its
first attempt. The build tool took 536 ms. This includes a 366 ms JEV graph
review, validation, and persistence. The full turn took 54.9 seconds. Eight
execution cases passed for normalized input, strict confirmation, a missing
name, and invalid email parts. Manual UI inspection confirmed the saved graph
and Code parameters. These results establish the graph input path. They do not
establish one-second LLM planning or parameter generation.

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
For an unresolved step, the result supplies the sole candidate's schema or the
schema for JEV's proposed operation in `candidateDefinitions`. The choice remains
unresolved. This lets the LLM inspect required fields without another lookup.
Repeated candidates share one definition. This change addresses a live build
that omitted the callable trigger's required `workflowInputs` after an uncertain
JEV result. Operation discovery also handles hidden resources such as Postgres's
`database` resource. A live catalog probe exposed all six Postgres operations
in 753 ms, including 748 ms for JEV. JEV's operation choice remained uncertain.
The LLM must resolve it. All 11 plan regression tests passed.
Short node type names also take precedence over fuzzy matches. A live `Set`
probe returned only the two Edit Fields modes. JEV chose manual mapping in
779 ms total, including 772 ms for the decision. Quality checks remained
uncertain and still required LLM reasoning. The 28 plan and skill tests passed.

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

Failed inline JSON builds now retain their source in the current thread.
A failed build returns `draftEditsAvailable` and its `sourceHash`. The LLM can
repair only the failed fields with `draftEdits` instead of resending the graph.
The tool rejects a stale source hash. Failed updates also retain their source.
Their repairs require the same saved checksum and the existing edit approval.
A save or a refresh of the saved base clears the cached source. Use `jsonEdits`
to edit the saved version and `draftEdits` to repair a failed build. All 151
focused build, binding, compiler, edit, and skill tests passed. They cover
context changes, stale or missing source, concurrent saves, and write policies.
The builder also requests compact JSON to reduce output text.

A live two-node regression deliberately omitted a required trigger field.
The first build returned its diagnostic in 48 ms. The targeted retry saved in
540 ms, including a 383 ms JEV graph review. Readback confirmed that the other
node and both IDs stayed unchanged. The full conversation took 39.5 seconds.
These results do not meet the one-second end-to-end generation target.

A second live regression applied the same failure to an existing workflow.
Validation returned `draftEditsAvailable` in 35 ms. The cached-source repair
completed in 444 ms. The full turn took 45.7 seconds. Readback confirmed the
same workflow ID, nodes, parameters, connections, and unpublished state.
The restored content matched the prior version, so the save kept that version.

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

The cancellation workflow now uses the shared candidate table and stage event
fields. Its runtime repair took 162.3 seconds. Fifteen fixture cases passed.
They cover confirmed cancellation, repeated cancellation, invalid identity,
missing records, invalid types, inactive stages, Calendar errors, and database
errors. A retry after a simulated successful deletion and a real failed SQL
write completed the database update. Stale-read cases left a replacement event
and a newer stage unchanged. These cases used real local identity and Postgres
calls. Calendar responses were pinned. The four saved groups were checked in
the Assistant canvas.

A shared-calendar correction updated the candidate-details and cancellation
tools in 118.2 seconds. Both now map recruiter, technical, and final interviews
to the same stage calendar placeholders as the main workflow. The details
workflow also handles an empty role and rejects a non-boolean verification
value. A later one-field repair rejects a non-string candidate ID before SQL.
That turn took 22.5 seconds. Its save took 403 ms, including a 309 ms JEV review.
All eight candidate-details cases and all fifteen cancellation cases then
passed together. The tests do not establish real Google connectivity.

Candidate chat remains unverified. Automatic model resolution returned
`missing_credential`. It did not configure a model. Booking still needs a shared data contract and runtime validation. The
rescheduling correction is described below. The main HR workflow
also needs initial-booking, feedback-deadline, and participant checks. The
complete HR system and the one-second generation goal are not complete.

An Agent edit attached the tested cancellation workflow and detached five
unfinished tools. It took 229.8 seconds. Readback found that only the identity
skill had changed. Other skills still referenced old inputs and removed tools.
The handoff guidance now requires an audit of every attached skill after a
tool contract changes. It also forbids claims about messages or escalations
without a configured action. All 17 existing skill tests passed.
A follow-up corrected and reread all five skills in 259.6 seconds. The edit
kept the two workflow tools and the main Agent instructions unchanged. The
orchestrator first requested a separate read-only audit, which added a builder
round trip. Guidance now keeps inspection, editing, and readback in one scoped
handoff. A new latency measurement is needed for that guidance change.
Manual readback found one more defect: the cancellation skill required an
event lookup before cancellation. That lookup can fail after a successful
deletion and block the tested database-recovery path. A manual skill edit
removed the prerequisite with a hash-guarded update. Readback matched the
requested text. This correction is separate from the generated result.

The rescheduling build probe then ran for 965.1 seconds without calling the
save tool. It read the old graph, wrote a detailed plan, and completed JEV's
review in 838 ms. Quality checks remained uncertain. The probe was cancelled
while the LLM still worked on implementation details. This is a failed
end-to-end generation measurement.

A separate manual correction saved 23 nodes and seven groups. It uses the
existing candidate records, verified session identity, stage event IDs, and
fixed stage calendars. It rejects invalid or ambiguous timestamps and keeps
the original event duration. Calendar remains the source of interview times.
The workflow does not add a duplicate timestamp write or increment a counter
that has no retry ledger. The existing event ID and candidate stage stay intact.

The correction checks conflicts over the complete interval. It excludes the
current event and rejects incomplete pages or invalid event data. A conditional
record read precedes the Calendar PATCH. The request includes the fetched ETag
in `If-Match`. A repeated requested time returns success without another PATCH.
This follows [Google's conditional modification contract](https://developers.google.com/calendar/api/guides/version-resources).
It does not atomically reserve the slot or lock both services. Availability
covers the configured stage calendar, not all interviewer calendars.

All 25 rescheduling fixture cases passed. They use real local HTTP requests
and Postgres queries. A local Calendar service checks the URL, query interval,
ETag header, and PATCH body. Cases include conflicts, interval boundaries,
invalid dates, missing records, incomplete pages, provider failures, and
concurrent record or ETag changes. One case applies the Calendar change but
returns an error. An identical retry recognizes the completed move and sends
no second PATCH. No Google requests or real invitations were sent.

Schema validation passed without errors or warnings. Manual UI inspection
confirmed the seven groups and the existing Calendar credential control.
The editor layout was tidied. The runtime uses its built-in Luxon date parser.
The fixture suite passed again after the editor normalized default parameters.
A JEV graph review took 523 ms. It flagged recovery and duplicate handling,
although the corresponding fixture cases passed. These findings need LLM and
execution review; they must not force unsupported repairs. The graph-review
criteria now include rescheduling and incomplete availability results. Nine
existing review and skill tests passed. Build, lint, and type checks passed.
The candidate-details, cancellation, cancellation-recovery, and rescheduling
suites then passed together: 48 cases in 8.6 seconds. These are local fixture
results, not complete Agent conversations or generation timings.

One Agent Builder handoff then attached the rescheduling workflow, updated
three skills, and reread all five skills. The full turn took 521.1 seconds.
Readback found an invented dry run in the tool description and skill.
The workflow returns `CONFIRMATION_REQUIRED` before service calls when
confirmation is false. It does not check availability in that case.
A separate manual correction removed that claim with guarded config and skill
writes. It also corrected the stored-event timing error description and limited
an uncertain-write retry to one identical retry. Readback confirmed the result.
The two existing tools and the cancellation instructions stayed unchanged.
The Agent now has three workflow tools. Booking remains unavailable, and the
model remains unset. Candidate conversations have not been executed.

Build guidance now requires exact unconfirmed-request semantics. A broader
existing skill test also found an unresolved grouping placeholder in the SDK
reference. The reference now points to the main skill's resolved limit and
keeps its SDK grouping instructions. All 36 review and skill tests passed
after these corrections. Build, lint, and type checks passed.

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
