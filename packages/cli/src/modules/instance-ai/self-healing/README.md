# Self-healing

This directory runs internal investigations and stores accepted results inside `instance-ai`.
It also provides the result review API.

## Automatic investigations

The `workflowExecuteAfter` hook starts self-healing after a saved production failure.
Trigger, webhook, and chat executions qualify. Manual tests, evaluations, Assistant verification,
user retries, child workflows, and error-handler executions do not qualify.
Wait/resume and existing crash recovery use the same hook and saved source metadata.

The trigger respects workflow and instance settings for saving failed executions.
Normal execution pruning still applies. It creates no snapshots or retention exceptions.
Workers relay only the workflow and execution IDs through the existing pubsub channel.
Worker and webhook processes wait for relay publication before the hook returns.
Main processes start admission in the background after the execution save finishes.
Admission does not delay execution completion and can be lost during shutdown.
Main processes call the investigation service. Each workflow can have one unfinished investigation
or open result. Different workflows can have investigations at the same time, subject to the
existing Assistant concurrency limits. The database claim prevents duplicate investigations.
The agent runs in the background after admission.

Set `N8N_INSTANCE_AI_WORKFLOW_SUGGESTIONS_ENABLED=true` on each process before startup.
The Assistant runtime loads only on main processes.
If a notification is lost or an Assistant concurrency limit refuses the run, no retry is queued.
A later eligible production failure can start a new investigation. Free capacity alone does not start one.
Trigger errors do not interrupt execution completion or normal error workflows.
There is no catch-up queue or recovery of agent output that failed to save.

## Run an investigation

Call `SelfHealingInvestigationService.start(input)` from backend code.
Set `N8N_INSTANCE_AI_WORKFLOW_SUGGESTIONS_ENABLED=true` before startup.
Supply `projectId`, `workflowId`, and the original failed `executionId`.
The producer selects the project configuration and checks the enabling user’s current access.
A selected-workflow configuration takes precedence over all-workflow coverage, even when paused.
The call returns `null` when no enabled configuration authorizes the investigation.
It also returns `null` for a new failure during a Could not fix cooldown. See [Investigate again](#investigate-again).
It captures the baseline with `WorkflowSuggestionService.captureBaseline()`.
The run keeps the captured baseline in memory. The investigation stores only the published version
ID, which the cooldown reads.
The workflow must be fully published. The failure must belong to its current published version.
Manual and evaluation executions are ineligible.
Credential and network failures can still need investigation.

The producer checks execution metadata without loading execution data.
It passes the execution ID to the agent. The agent reads details through the existing execution tools.
Execution reads use the normal Assistant access checks. The agent can inspect other executions
that the actor can access, including executions from related workflows.
The execution must remain saved and readable. Investigation inputs contain no execution payload.

The call returns `{ kind: 'investigation', investigationId }` or
`{ kind: 'result', resultId }` for an existing open result.
A workflow can have one unfinished investigation or open result.
An unfinished investigation blocks the workflow across projects and configurations.
An open result blocks investigations only in the workflow's current project.
Repeated starts for the same failed execution return the original investigation, including after completion.
Automatic triggers and eligibility for a new failure remain the caller's responsibility.
When an access check fails, the producer pauses the configuration. Another eligible user must
explicitly enable it before new work can start.
User deletion also removes that user's investigations and results.
Leaving the project does not delete those records or necessarily remove globally granted access.
The user who re-enables self-healing becomes the background user for new investigations.
Re-enablement does not change the background user recorded on an existing investigation.

The producer calls `InstanceAiService.startSelfHealingRun()` with its stored thread and run IDs.
This uses the existing Assistant run lifecycle. It does not create another job runner.

The backend binds `verify_candidate({ filePath, validationOnly?, triggerNodeName?, inputData? })` to this investigation.
It checks current access before it reads and compiles the candidate against the captured baseline.
With `validationOnly: true`, it returns structural checks without execution.
For execution checks, the agent selects the failed trigger and supplies its test input.
The tool passes these options to the existing verification runner. Each call tests one trigger.

`SelfHealingAgentService` creates `self-healing/candidate.workflow.ts` from the captured baseline.
It uses the same workflow converter as ordinary workflow reads.
Workflow reads return the captured baseline. The agent cannot select another workflow or version.

The dedicated `self-healing-v1` agent can read workflows, executions, data tables, and node metadata.
It can read and edit workspace files, run sandbox commands, and call `verify_candidate`.
Self-healing respects blocked web search and URL fetching permissions.
Other research permission modes do not need interactive approval.
The agent has no save, publish, credential setup, MCP, browser, or delegation tools.
It does not request user confirmation or start follow-up runs.

The runtime returns technical `status`, finish information, `usage`, and validated `output`
when available. Output requires `outcome`, `summary`, `report`, and `candidateFilePath`.
Set `candidateFilePath` to `null` when there is no candidate.
`fix_ready` requires a candidate path. `could_not_fix` excludes one.
The result includes a candidate compiler when validated output names a candidate file.
If final compilation reports mocked credential types, the producer changes `fix_ready` to `needs_you`.
It keeps the candidate and replaces the report with credential setup instructions.
An unchanged `needs_you` candidate produces a report without a workflow suggestion.
Unknown usage measurements stay null. The invocation claims measured credits once.
Callers must not claim those credits again.

Each invocation has a separate thread under `ia-self-healing:<actorId>`.
The database thread record keeps this resource identity for ownership and cleanup.
SDK conversation history and checkpoints stay in process memory.
Each invocation starts with empty conversation history.
Run events remain in the database. These events can include text and tool results.
Server metadata records the actor, project, workflow, and execution IDs.
The conversation stays hidden from every user, including the actor.
Account credit updates omit its thread ID and thread total.
Deleting the actor also removes these internal threads.

The host uses its existing admission limits, run registry, sandbox, tracing, and shutdown drain.
An unexpected suspension stops the invocation.
A crashed invocation becomes `crash_interrupted`. It cannot resume as ordinary chat.
Workspace retention follows the existing sandbox lifecycle.
The awaited completion hook saves the result before the host releases the run.

`SelfHealingInvestigationService` owns admission, final candidate compilation, and acceptance.
When parameter sharing is disabled, candidate source omits node parameters and verification is unavailable.
`compileCandidateWorkflow()` reuses the builder compiler, credential resolution, and save preparation.
It uses the captured baseline for existing IDs, setup values, and layout. It keeps baseline workflow
fields outside the candidate graph. Verification also runs the builder's credential permission check.
Suggestions only change nodes and connections. Node-group edits are not supported.
Apply runs the normal save validation on the retained groups.
Unchanged candidates can be checked. Final acceptance must require a useful change for a suggestion.
Recheck the baseline before saving the result. A successful execution is not required to store useful changes.
There is no public launch endpoint.

## Investigate again

Admission blocks new investigations while a Fix ready or Needs attention result is Open.
An undismissed Fix ready or Needs attention result stays Open when it has no suggestion or its
suggestion is pending. Could not fix results are Closed immediately and return the `closed`
review state. Automatic closure leaves `dismissedAt` and `dismissedById` empty.

For a Fix ready or Needs attention result, dismissal, discard, or outdated reconciliation permits
another eligible production failure on the same published version. Apply saves a draft.
Another investigation requires successful publication and a new eligible failure. Closing a
result, opening the editor, changing a configuration, and publishing do not start an investigation.

A Needs attention report without a suggestion stays Open until dismissed, even after a new publication.

A Could not fix result blocks investigations for 24 hours after its completion. The block applies
to the workflow, its owning project, and the investigated published version. Admission checks
the workflow's current published version before it captures a baseline. A saved draft does not
change that version, so admission skips the failure without an error. The claim transaction checks
again after it confirms that the captured version is still published. Skipped failures do not
extend the cooldown.
Another accepted Could not fix result starts a new cooldown. A different successfully published
version becomes eligible immediately. Both cases require another eligible production failure.
Republishing the same version does not reset the cooldown. No background job clears it.

Pause, resume, and configuration edits do not clear either block. Configuration deletion removes
its history and resets the block. Results from a previous owning project do not block the new project.

Crashes, interruptions, and turn limits without an accepted result release the running claim.
A different eligible failed execution can then start an investigation. The same execution remains
deduplicated. There is no retry cap for runs that finish without a result.

## Configure self-healing

Project Settings provides configuration management under the existing `project:update` permission.
The same rollout flag controls settings, investigations, and reviews.
Each project can have one all-workflows configuration and multiple selected-workflow configurations.
Explicit workflow selections cannot overlap, including when configurations are paused.
Moving a workflow to another project removes its explicit selections. The destination project's
configuration applies to later failures. Moving between folders in the same project keeps selections.
New configurations created in Project Settings start enabled.
The form selects the creator as the initial reviewer.
Enabling a configuration records the user whose access authorizes subsequent investigations.

Pause stops new investigations and prevents results from being saved while paused.
After an explicit pause commits, the service requests cancellation of its unfinished investigations.
The Assistant runtime routes cancellation to local runs and runs on other main processes.
Re-enabling permits future investigations. It does not resume canceled agents.
Saved results remain available to assigned reviewers while the configuration is paused.

A result can reference one independent suggestion. Reports without changes have no suggestion.
Removal deletes linked suggestions and the configuration in one transaction. Foreign keys
cascade deletion to suggestion activity, selections, reviewers, investigations, and results.
Removal collects unfinished thread IDs before deletion and requests cancellation after commit.
Cancellation is best-effort. A failed request does not fail a committed pause or removal.
A rolled-back pause or removal does not request cancellation.
Cancellation can arrive late, so result acceptance still checks the configuration and abort signal.
If cancellation misses a run and the configuration resumes before completion, its result can be saved.
Late completion skips missing configurations and investigations.
Already applied workflow changes remain saved.
Admission and result acceptance coordinate with pause and removal through a short configuration
row lock. Agent execution stays outside database transactions.

## Verify a candidate

Each call compiles the current workspace file. `candidateChecksum` identifies the compiled candidate.
Verification uses the captured baseline even if the saved workflow changes. Completion rejects outdated results.
Validation and execution evidence are separate. Edits require another check.
The tool reuses the builder simulation planner, execution adapter, and coverage analysis.
Credential changes use the normal builder rules. The response includes resolved and missing credentials.
Nodes with mocked credentials use the same simulation rules as builder verification.
It returns node previews, failures, simulated nodes, and nodes that the run did not reach.
Some nodes execute against external services under the existing simulation rules.

Full verification creates an archived, unpublished temporary workflow with a backend-assigned ID.
It copies the candidate graph and the original runtime state. Execution writes affect this copy.
The saved workflow, its history, and its published version remain unchanged.

The service copies findings into the tool response before cleanup. It stops unfinished executions
and deletes terminal executions and their temporary workflow. Canceled executions remain for
24 hours after their stop time. If the stop time is missing, cleanup uses the temporary workflow's
creation time. The existing prune task retries records older than 24 hours.
A namespaced resource record keeps cleanup ownership after the investigation thread is deleted.
No suggestion row is created by verification.

## Store a result

The runtime validates final output. The producer compiles the named workspace file.
It applies the shared text filter to the final summary and report before storage.
It keeps both fields within their output limits after replacement.
It passes the report, runtime usage, and compiled graph directly to the result service.
A credit-claim failure leaves unknown credits and does not discard valid output.

`SelfHealingResultService.complete(...)` receives the captured baseline from the run and prepares
the optional suggestion through `WorkflowSuggestionService`. It rejects a baseline from another
investigation. It rechecks access and the captured baseline, then saves the result,
suggestion, submission activity, and investigation completion in one transaction.
Cancellation before acceptance rolls back the result and suggestion.
Once the completion commits, a later cancellation does not change it to a canceled run.
A repeated completion returns the saved result.
A failed transaction releases the investigation claim. The report is not saved for retry.
Changed baselines and lost access stop completion without creating a result.

Startup releases interrupted claims after the interrupted-run sweep.
A separate scheduled task checks unfinished claims every minute, even when data pruning is disabled.
Investigation cleanup failures do not block Assistant data pruning or temporary workflow cleanup.
Investigation cleanup remains available when new investigations are disabled.
Technical status and termination reasons stay in the existing Assistant run events.
Completion releases the investigation claim. An open result then prevents new investigations.
Apply, discard, dismissal, and outdated reconciliation use the existing suggestion lifecycle.
Call `complete()` only for accepted investigation outcomes. Technical failures without an accepted result stay
in internal run records and do not create a report or suggestion.
The investigation instructions must keep sensitive values out of reports, summaries,
suggestion explanations, and error context. The text filter handles recognized patterns.
It does not remove arbitrary private information.

| Outcome         | Suggestion | Actions                                                    |
| --------------- | ---------- | ---------------------------------------------------------- |
| `fix_ready`     | Required   | Apply and publish, Continue in Assistant or editor, Discard |
| `needs_you`     | Optional   | Continue in Assistant or editor, Discard                    |
| `could_not_fix` | None       | None. The result closes automatically                       |

The summary is a plain-language title with at most 80 characters.
The agent writes the report as one Markdown string with two sections: **What happened**
and **What changed**. The prompt asks for fewer than 150 words. Verification limits,
blockers, and next steps belong under **What changed**. The stored report size limit
remains 50,000 characters. Existing reports remain readable.

Usage contains `turns` and `durationSeconds`.
The runtime selects the usage shape before setup from the AI service proxy setting.
Credit usage contains `credits` and no token counts.
Token usage contains `promptTokens`, `completionTokens`, and `totalTokens`, with no `credits` field.
Each variant requires all its fields. Individual measurements can be null when unknown.
A failed credit claim keeps `credits: null`. The presence of the field identifies credit usage.
The runtime passes token measurements to the existing credit service in both cases.
The credit service decides whether to bill the run.
The producer uses one runtime invocation. Persistence stores its usage without charging it again.
Credit billing still uses token counts from the existing runtime billing path.
Recovery closes interrupted investigations without a result. It does not infer a new usage shape.

Configuration, workflow, original-project, and background-user deletion cascade to the result.
Suggestion deletion cascades to its referencing result. Result deletion alone keeps the suggestion.
Execution pruning and private-thread deletion do not remove reports or the stored execution ID.
Execution references can point to either execution engine. Reads check current workflow and
execution read access and workflow association. Missing or inaccessible execution references
return `unavailable` without an ID. Execution lookups use the normal transport timeout.
The review UI owns loading feedback while result details are fetched.

## Review a result

Routes use `/projects/:projectId/workflows/:workflowId/self-healing-results`:

- `GET /:resultId`
- `POST /:resultId/approve-and-publish`
- `POST /:resultId/apply`
- `POST /:resultId/dismiss`

Assigned reviewers with current workflow edit access can review results. Approval also requires
publish access. Approval accepts only Fix ready results. Apply accepts Fix ready and Needs attention
results that have a suggestion. Reviewer filtering applies to Inbox lists, counts, details, and actions.
Each action resolves its suggestion from the result and returns the updated review.
Send the editor client ID in `push-ref` for Apply actions.
Read the returned review state before navigating. A competing action can close the suggestion first.
The first successful action closes the result. Later Apply, approval, and dismissal requests return
a conflict and do not save or publish again. An outdated suggestion returns `outdated`.
Apply saves the proposed fix without publishing; the UI opens the editor when `reviewState` is `applied`.
Detail reads do not change suggestion state. Workflow events reconcile stale suggestions, and actions
check the current workflow before writing. If Apply fails, keep the review open and show the error.

The Discard and close button calls `POST /:resultId/dismiss`.
Dismissal discards an attached pending suggestion. Fix-ready results derive their discarded state
from the suggestion. Needs attention results also record dismissal in the same transaction.
Dismissal leaves automatically closed Could not fix results unchanged and returns `closed`.
A dismissal recorded before automatic closure still returns `dismissed`.
Already applied, discarded, or outdated suggestions keep their existing closure.
Apply uses the existing suggestion action service. An applied result stays applied if publication
returns an error. `publishError` describes that request only. The response includes the workflow
ID and the suggestion's recorded applied version. Open the normal editor for publication status
and recovery.

Continuation applies a suggestion to the workflow draft, or dismisses a result without one.
It opens the destination only when the result becomes `applied` or `dismissed`.
For the Assistant, pass `report` to the normal Assistant handoff. Build a workflow attachment
from `workflowId`. Include `execution.id` only when `execution.status` is `available`.
The normal handoff opens a new chat in the clicking user's personal project.
Do not use the result's `projectId`. A reviewer can lack read access to that project.
Load the personal project before the review action. If it cannot load, keep the result open.
Normal chat ownership and tool permissions apply. Do not copy the background conversation or grants.

## Availability

Set `N8N_INSTANCE_AI_WORKFLOW_SUGGESTIONS_ENABLED=true` before startup to enable investigations
and load review routes. The flag defaults to `false`. Restart n8n after changing it.
The `instance-ai` module must be loaded. Entities and migrations do not depend on this rollout flag.
Saved review services do not require Assistant model availability. Recovery of existing
investigations remains available when the flag is off.

The shared Inbox reads result rows through `SelfHealingResultService.listForInbox()`.
It reads counts through `countForInbox()`. Both use current reviewer membership, editor access, and original-project ownership.
The source selects rows before applying the shared pagination boundary and limit.
The shared API uses `GET /inbox` and `GET /inbox/summary`.
Open and Closed derive from result outcome, dismissal, and suggestion closure.
Could not fix results are Closed. Inbox reads do not change either state.
The review UI will provide review screens and chat and editor navigation.
