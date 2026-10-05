# Self-healing results

This directory stores completed investigation results inside `instance-ai`.
It provides the result review API. It does not start investigations.

## Store a result

Prepare optional workflow changes with `WorkflowSuggestionService.prepareSuggestion()`.
Pass them to `SelfHealingResultService.prepare()` with the outcome, report, original execution ID,
and usage object. Supply measured usage from the existing runtime and accounting services.
Preparation validates references and redacts saved text. Run it before opening a transaction.
Call `create(prepared, ctx)` to save the result, suggestion, and submission activity together.
The service joins a supplied transaction and checks current editor access and ownership again.
The future investigation producer owns completion retries.
It submits accepted investigation outcomes. Technical failures without an accepted result stay
in the Assistant run history and do not create a report or suggestion.

| Outcome | Suggestion | Actions |
| --- | --- | --- |
| `fix_ready` | Required | Approve and publish, Open in editor, Discard |
| `needs_you` | Optional | Continue in chat, Dismiss |
| `could_not_fix` | None | Continue in chat, Dismiss |

The report is one string. Usage contains measured credits, turns, and duration in seconds.
Individual measurements can be null when unknown; the usage object is required.

Workflow, original-project, background-user, and suggestion deletion cascade to the result.
Execution pruning and private-thread deletion do not remove reports or the stored execution ID.
Execution references can point to either execution engine. Reads check current workflow and
execution read access and workflow association. Missing or inaccessible execution references
return `unavailable` without an ID. Optional v2 lookups stop after two seconds.

## Review a result

Routes use `/projects/:projectId/workflows/:workflowId/self-healing-results`:

- `GET /:resultId`
- `POST /:resultId/approve-and-publish`
- `POST /:resultId/open-in-editor`
- `POST /:resultId/discard`
- `POST /:resultId/dismiss`

Current workflow editors can review results. Approval also requires publish access.
Each action resolves its suggestion from the result and returns the updated review.
Send the editor client ID in `push-ref` for Apply actions.
Read the returned review state before navigating. A competing action can close the suggestion first.

The suggestion owns applied, discarded, and outdated closure. The result stores explicit dismissal.
Dismissal closes an attached pending suggestion in the same transaction.
Apply uses the existing suggestion action service. An applied result stays applied if publication
returns an error. `publicationError` describes that request only. The response includes the workflow
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
The rollout flag is separate from the future switch for new investigations. Saved review services
do not check investigation enablement or Assistant model availability.

INS-1517 owns the inbox source, pagination, counts, refresh, and seed examples.
INS-1518 owns review screens and chat/editor navigation. INS-1480 owns the real producer.
