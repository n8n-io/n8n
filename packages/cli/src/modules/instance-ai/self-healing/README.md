# Self-healing

This directory runs internal investigations and stores accepted results inside `instance-ai`.
It also provides the result review API.

## Run an investigation

Call `SelfHealingInvestigationService.start(input)` from backend code.
Set `N8N_INSTANCE_AI_WORKFLOW_SUGGESTIONS_ENABLED=true` before startup.
Supply `backgroundUserId`, `projectId`, `workflowId`, and the original failed `executionId`.
The caller supplies the user who enabled self-healing. The producer checks their current access.
It captures the baseline with `WorkflowSuggestionService.captureBaseline()`.
The workflow must be fully published. The failure must belong to its current published version.
Manual and evaluation executions are ineligible.
Credential and network failures can still need investigation.

The producer checks execution metadata without loading execution data.
It passes the execution ID to the agent. The agent reads details through the existing execution tools.
Execution reads use the normal Assistant access checks. The agent can inspect other executions
that the actor can access, including executions from related workflows.
The execution must remain saved and readable. M3 will define how to retain only the triggering
execution when saving is disabled or pruning runs. Investigation inputs contain no execution payload.

The call returns `{ kind: 'investigation', investigationId }` or
`{ kind: 'suggestion', suggestionId }` for an existing pending suggestion.
A workflow can have one unfinished investigation or pending suggestion.
Repeated starts for the same failed execution return the original investigation, including after completion.
Automatic triggers and eligibility for a new failure remain the caller's responsibility.
The trigger/settings caller must disable self-healing on the next access check if the
background user is deleted or loses the required workflow access.
User deletion also removes that user's investigations and results.
Leaving the project does not delete those records or necessarily remove globally granted access.
After access loss, require explicit re-enablement before starting new work.
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
There is no automatic trigger or public launch endpoint.

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

`SelfHealingResultService.complete(...)` prepares the optional suggestion through
`WorkflowSuggestionService`. It rechecks access and the captured baseline, then saves the result,
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
Completion releases the investigation claim. A pending suggestion then prevents new investigations.
Apply, discard, dismissal, and outdated reconciliation use the existing suggestion lifecycle.
Call `complete()` only for accepted investigation outcomes. Technical failures without an accepted result stay
in internal run records and do not create a report or suggestion.
The investigation instructions must keep sensitive values out of reports, summaries,
suggestion explanations, and error context. The text filter handles recognized patterns.
It does not remove arbitrary private information.

| Outcome         | Suggestion | Actions                                      |
| --------------- | ---------- | -------------------------------------------- |
| `fix_ready`     | Required   | Approve and publish, Open in editor, Discard |
| `needs_you`     | Optional   | Continue in chat, Dismiss                    |
| `could_not_fix` | None       | Continue in chat, Dismiss                    |

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

Workflow, original-project, background-user, and suggestion deletion cascade to the result.
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

Current workflow editors can review results. Approval also requires publish access.
Each action resolves its suggestion from the result and returns the updated review.
Send the editor client ID in `push-ref` for Apply actions.
Read the returned review state before navigating. A competing action can close the suggestion first.
Apply saves the proposed fix without publishing; the UI opens the editor when `reviewState` is `applied`.
Detail reads do not change suggestion state. Workflow events reconcile stale suggestions, and actions
check the current workflow before writing. If Apply fails, keep the review open and show the error.

Both Discard and Dismiss buttons call `POST /:resultId/dismiss`.
Dismissal discards an attached pending suggestion. Fix-ready results derive their discarded state
from the suggestion; informational results also record dismissal in the same transaction.
Already applied, discarded, or outdated suggestions keep their existing closure.
Apply uses the existing suggestion action service. An applied result stays applied if publication
returns an error. `publishError` describes that request only. The response includes the workflow
ID and the suggestion's recorded applied version. Open the normal editor for publication status
and recovery. Repeating a review action does not save or publish again.

For Continue in chat, fetch the result detail again to check current access.
Pass `report` to the normal Assistant handoff. Build a workflow attachment from `workflowId`.
Include `execution.id` only when `execution.status` is `available`.
Offer this action for `needs_you` and `could_not_fix` results.
The normal handoff opens a new chat in the clicking user's personal project.
Normal chat ownership and tool permissions apply. Do not copy the background conversation or grants.

## Availability

Set `N8N_INSTANCE_AI_WORKFLOW_SUGGESTIONS_ENABLED=true` before startup to enable investigations
and load review routes. The flag defaults to `false`. Restart n8n after changing it.
The `instance-ai` module must be loaded. Entities and migrations do not depend on this rollout flag.
Saved review services do not require Assistant model availability. Recovery of existing
investigations remains available when the flag is off.

The shared Inbox reads result rows through `SelfHealingResultService.listForInbox()`.
It reads counts through `countForInbox()`. Both use current editor access and original-project ownership.
The source selects rows before applying the shared pagination boundary and limit.
The shared API uses `GET /inbox` and `GET /inbox/summary`.
Open and Closed derive from result dismissal and suggestion closure. Inbox reads do not change either state.
The review UI will provide review screens and chat and editor navigation.
