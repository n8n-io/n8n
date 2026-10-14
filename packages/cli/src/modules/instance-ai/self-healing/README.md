# Self-healing

This directory runs internal investigations and stores accepted results inside `instance-ai`.
It also provides the result review API.

## Run an investigation

Call `InstanceAiService.startSelfHealingRun(input)` from backend code.
Set `N8N_INSTANCE_AI_SELF_HEALING_ENABLED=true` before startup.
Supply the acting `user`, captured `WorkflowSuggestionBaseline`, and failed `executionId`.
The actor must match `baseline.backgroundUserId` and have current workflow read and edit access.
The baseline project and execution must belong to `baseline.workflowId`.

The backend binds `verify_candidate({ filePath, validationOnly? })` to this investigation.
It checks current access and the captured baseline before it reads and compiles the candidate.
With `validationOnly: true`, it returns structural checks without execution.

`SelfHealingAgentService` creates `self-healing/candidate.workflow.ts` from the captured baseline.
It uses the same workflow converter as ordinary workflow reads.
Workflow reads return the captured baseline. The agent cannot select another workflow or version.

The dedicated `self-healing-v1` agent can read workflows, executions, data tables, and node metadata.
It can read and edit workspace files, run sandbox commands, and call `verify_candidate`.
Research remains subject to the existing policy. A request that needs approval is unavailable.
The agent has no save, publish, credential setup, MCP, browser, or delegation tools.
It does not request user confirmation or start follow-up runs.

The call returns technical `status`, finish information, credit and timing `usage`, and validated `output`
when available. Output has `outcome`, `summary`, `report`, and an optional `candidateFilePath`.
`fix_ready` requires a candidate path. `could_not_fix` excludes one.
The result includes a candidate reader only when validated output names a candidate file.
Unknown usage measurements stay null. The invocation claims measured credits once.
Callers must not claim those credits again.

Each invocation has a separate thread under `ia-self-healing:<actorId>`.
The thread and memory keep this resource identity. Checkpoints stay in memory.
Server metadata records the actor, project, workflow, and execution IDs.
The conversation stays hidden from every user, including the actor.
Account credit updates omit its thread ID and thread total.
Deleting the actor also removes these internal threads.

The host uses its existing admission limits, run registry, sandbox, tracing, and shutdown drain.
An unexpected suspension stops the invocation.
A crashed invocation becomes `crash_interrupted`. It cannot resume as ordinary chat.
Workspace retention follows the existing sandbox lifecycle.
Read and persist accepted candidate data before workspace cleanup removes it.

AST-1480 owns investigation admission, baseline capture, final candidate compilation,
acceptance, and atomic completion. This invocation creates no result or suggestion record.
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
24 hours after cancellation. The existing prune task retries records older than 24 hours.
A namespaced resource record keeps cleanup ownership after the investigation thread is deleted.
No suggestion row is created by verification.

## Store a result

Prepare optional workflow changes with `WorkflowSuggestionService.prepareSuggestion()`.
Pass them to `SelfHealingResultService.complete()` with the outcome, report, original execution ID,
and usage object. Supply credits and timing from the investigation.
The method validates references and report content before opening its transaction.
It then checks current editor access and ownership again and saves the result, suggestion,
and submission activity together. Callers do not prepare results or supply a transaction.
Investigation admission and completion retries are not implemented yet.
When added, persist investigation completion inside this method's transaction.
Call `complete()` only for accepted investigation outcomes. Technical failures without an accepted result stay
in internal run records and do not create a report or suggestion.
The investigation instructions must keep sensitive values out of reports, summaries, and
suggestion explanations and error context. Persistence does not scrub these fields.

| Outcome         | Suggestion | Actions                                      |
| --------------- | ---------- | -------------------------------------------- |
| `fix_ready`     | Required   | Approve and publish, Open in editor, Discard |
| `needs_you`     | Optional   | Continue in chat, Dismiss                    |
| `could_not_fix` | None       | Continue in chat, Dismiss                    |

The report is one string. Usage contains `credits`, `turns`, and `durationSeconds`.
The usage object and all three fields are required. Individual measurements can be null when unknown.
If an investigation spans multiple runtime invocations, the producer combines their usage once
before saving the result. Persistence stores this snapshot without charging usage.
Token counts stay in the existing runtime billing path.

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

Set `N8N_INSTANCE_AI_WORKFLOW_SUGGESTIONS_ENABLED=true` before startup to load review routes.
The `instance-ai` module must be loaded. Entities and migrations do not depend on this rollout flag.
The rollout flag is separate from `N8N_INSTANCE_AI_SELF_HEALING_ENABLED`. Saved review services
do not check investigation enablement or Assistant model availability.

The inbox will provide result listing, pagination, counts, refresh, and seed examples.
The review UI will provide review screens and chat and editor navigation.
The investigation producer will admit invocations and submit accepted results.
