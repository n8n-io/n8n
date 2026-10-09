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
| `fix_ready` | Required | Approve and publish, Apply and open in editor/chat, Discard |
| `needs_you` | Optional | Apply and open in editor/chat when changes exist; otherwise Open in editor/chat, Dismiss |
| `could_not_fix` | None | Open in editor/chat, Dismiss |

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
- `POST /:resultId/continue` with `{ "destination": "editor" | "chat" }`

Current workflow editors can review results. Approval also requires publish access.
Each action resolves its suggestion from the result and returns the updated review.
Send the editor client ID in `push-ref` for Apply actions.
Read the returned review state before navigating. A competing action can close the suggestion first.
Apply saves ready or partial suggested changes to the workflow draft without publishing.
Approve and publish accepts only `fix_ready` suggestions.
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

Both editor and chat use the continuation endpoint. It checks current editor access and applies
any pending suggestion through the existing action service. This includes partial changes for
`needs_you`. Apply retains its own transaction and version receipt. If a later continuation step
fails, the saved draft and Applied state remain. A retry does not apply the changes again.

A second transaction records `continuedAt`, `continuedById`, and `continuationDestination`.
For chat, it also creates the private thread and saves the report as its opening message.
The workflow attachment includes the execution ID only when the reviewer can read it.
The result lock serializes retries. The first continuation receipt stays unchanged.
An open result without changes becomes Continued. An applied result remains Applied.
The frontend updates the Inbox from this receipt before it navigates.
A navigation failure does not reopen the result. Dismissal remains a separate action.

Each reviewer has one private chat per result in their personal project. The server-owned
`instance_ai_threads.selfHealingResultId` field identifies that chat. A unique index prevents
duplicate chats for the same reviewer. The response's `chatThreadId` identifies the caller's chat.
The detail's `continuationThreadId` is the first receipt's chat and is visible only to its owner.
Other editors get their own chat without replacing the first receipt.
Normal chat ownership and tool permissions apply. The background conversation and grants stay separate.
The normal Assistant run starts after commit. If it refuses to start, the response keeps the
chat ID and includes `chatStartError`. The UI opens the chat and shows a warning.
A later attempt can retry the same saved chat.
Deleting a thread or reviewer clears its reference without reopening the result.
Already closed results can still open the editor or a private chat without changing their closure.

## Availability

Set `N8N_INSTANCE_AI_WORKFLOW_SUGGESTIONS_ENABLED=true` before startup to load review routes.
The `instance-ai` module must be loaded. Entities and migrations do not depend on this rollout flag.
The rollout flag is separate from the future switch for new investigations. Saved review services
do not check investigation enablement. Chat continuation checks normal Assistant availability
before applying changes.

The shared Inbox reads result rows through `SelfHealingResultService.listForInbox()`.
It reads counts through `countForInbox()`. Both use current editor access and original-project ownership.
The source selects rows before applying the shared pagination boundary and limit.
The shared API uses `GET /inbox` and `GET /inbox/summary`.
Open and Closed derive from result continuation, dismissal, and suggestion closure.
Inbox reads do not change these states.
The review UI provides review screens and chat and editor navigation.
The investigation producer will run investigations and submit completed results.
