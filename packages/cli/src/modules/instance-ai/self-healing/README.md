# Self-healing results

This directory stores completed investigation results inside `instance-ai`.
It provides the result review API. It does not start investigations.

## Store a result

Prepare optional workflow changes with `WorkflowSuggestionService.prepareSuggestion()`.
Pass them to `SelfHealingResultService.complete()` with the outcome, report, original execution ID,
and usage object. Supply measured usage from the existing runtime and accounting services.
The method validates references and report content before opening its transaction.
It then checks current editor access and ownership again and saves the result, suggestion,
and submission activity together. Callers do not prepare results or supply a transaction.
The investigation producer and completion retries are not implemented yet.
When added, persist investigation completion inside this method's transaction.
Call `complete()` only for accepted investigation outcomes. Technical failures without an accepted result stay
in the Assistant run history and do not create a report or suggestion.
The investigation instructions must keep sensitive values out of reports, summaries, and
suggestion explanations and error context. Persistence does not scrub these fields.

| Outcome | Suggestion | Actions |
| --- | --- | --- |
| `fix_ready` | Required | Apply and publish, Apply and open in editor, Discard |
| `needs_you` | Optional | Apply and open in chat when changes exist; otherwise Open in chat, Discard |
| `could_not_fix` | None | Open in chat, Discard |

The report is one string. Usage contains `credits`, `turns`, `durationSeconds`, `promptTokens`,
`completionTokens`, and `totalTokens`. The usage object and all measurement fields are required;
individual measurements can be null when unknown. Token counts use the existing runtime usage
summaries, including when credit usage is unavailable. If an investigation spans multiple runtime
invocations, the producer combines their summaries once before saving the result. Persistence
stores this snapshot without calculating tokens or charging usage.

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
- `POST /:resultId/chat`

Current workflow editors can review results. Apply and publish also requires publish access.
Each action resolves its suggestion from the result and returns the updated review.
Send the editor client ID in `push-ref` for Apply actions.
The first successful action closes the result. Later actions return a conflict.
The publish and editor actions accept only `fix_ready` suggestions.
Chat accepts only `needs_you` and `could_not_fix` results.
It saves partial suggested changes to the workflow draft when present.
Detail reads do not change suggestion state. Workflow events reconcile stale suggestions, and actions
check the current workflow before writing. If Apply fails, keep the review open and show the error.

The Discard button calls `POST /:resultId/dismiss` for all outcomes.
Dismissal discards an attached pending suggestion. Fix-ready results derive their discarded state
from the suggestion; informational results also record dismissal in the same transaction.
Apply uses the existing suggestion action service. An applied result stays applied if publication
returns an error. `publishError` describes that request only. The response includes the workflow
ID and the suggestion's recorded applied version. Open the normal editor for publication status
and recovery.

The editor uses Apply. The chat endpoint uses the same Apply action and creates a private chat
in the workflow save transaction. For a report without a suggestion, chat records `continuedAt`
and `continuedById` in the chat creation transaction. Both actions close the result without
publishing. If chat creation fails, the transaction rolls back and the result stays open.

The new chat belongs to the reviewer in their personal project. The action response includes its
`chatThreadId`. Detail reads do not return a chat destination. The chat contains the saved report
and a workflow attachment. The attachment includes the execution ID only when the reviewer can
read it. Closed results remain readable, but they have no action buttons.

Opening a saved chat does not start an Assistant run or send a follow-up prompt. Normal chat owns
later messages and run errors. Normal ownership and tool permissions apply. The background
conversation and grants stay separate. After a lost response or navigation error, the saved chat
remains in normal chat history. Navigation errors and chat deletion do not reopen the result.

## Availability

Set `N8N_INSTANCE_AI_WORKFLOW_SUGGESTIONS_ENABLED=true` before startup to load review routes.
The `instance-ai` module must be loaded. Entities and migrations do not depend on this rollout flag.
The rollout flag is separate from the future switch for new investigations. Saved review services
do not check investigation enablement. Chat checks Assistant access and enablement before applying changes.
Model setup belongs to normal chat.

The shared Inbox reads result rows through `SelfHealingResultService.listForInbox()`.
It reads counts through `countForInbox()`. Both use current editor access and original-project ownership.
The source selects rows before applying the shared pagination boundary and limit.
The shared API uses `GET /inbox` and `GET /inbox/summary`.
Open and Closed derive from result continuation, dismissal, and suggestion closure.
Inbox reads do not change these states.
The review UI provides review screens and chat and editor navigation.
The investigation producer will run investigations and submit completed results.
