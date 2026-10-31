# Workflow suggestions

These internal Instance AI services store proposed workflow changes for human review. Suggestions are separate from the workflow's saved editor draft. These services do not run investigations or expose HTTP endpoints. No Enterprise license is required.

Set `N8N_INSTANCE_AI_WORKFLOW_SUGGESTIONS_ENABLED=true` and restart n8n to load the workflow event relay and its services. The same flag enables self-healing investigations and result review routes. The flag defaults to `false`. Database entities and migrations remain registered in either state.

## Store a suggestion

Use `WorkflowSuggestionService` from trusted backend code.

1. Call `captureBaseline(workflowId, backgroundUserId)` before preparing a fix. Keep the returned baseline outside model control.
2. Call `prepareSuggestion(baseline, { graph, explanation, errorContext, resultKind })` with the proposed changes. `graph` accepts only nodes and connections. Supply `fix_ready` or `needs_you` as `resultKind`.
3. Call `createSuggestion(prepared, ctx, selfHealingResultId)`. Self-healing calls this in its completion transaction, after it saves the result. The result ID groups the suggestions of one fix. Use the prepared value, never raw model output. Creation rechecks the baseline and records the suggestion and submission activity together.

Storage checks current edit access and basic graph structure. Apply runs credential checks, workflow-save policies, and normal save preparation. It rejects preparation that changes the reviewed fix. A result without valid graph changes has no suggestion.

## Read a proposal

`getProposal(user, projectId, workflowId, suggestionId)` reads the stored proposal and activity without changing them.

The read requires an enabled user with current workflow read and edit access, including access through sharing. It checks the proposal's original project and the workflow's current owner project. Publish access is not required.

The detail includes the original and proposed snapshots. Stored proposal content does not change after creation. Workflow events update pending suggestions. Save events are debounced per workflow for 30 seconds, with a maximum wait of 60 seconds during continuous saves. Publish and archive hooks, and unpublish events, cancel the pending save check and reconcile immediately. Reads can show a pending suggestion until an event or action updates its state. Actions check the current state before saving. When one suggestion of a group becomes outdated, every pending suggestion of the group closes as outdated.

## Review actions

Call the matching method on `WorkflowSuggestionActionsService` with the acting user and project. `apply()` takes a group of suggestions and the action. `discardPending()` takes a group of suggestions and an optional operation context. Supply the editor client ID (`push-ref`) for Apply actions. The caller owns editor navigation and the review UI state.

| Method             | Behavior                                                                                                                                                                           |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apply()`          | Save every reviewed fix of the group once. With `approve-and-publish`, request normal publication of each saved version. Otherwise, the caller decides whether to open the editor. |
| `discardPending()` | Close every pending suggestion of the group without changing the workflows.                                                                                                        |

Use **Apply and publish** as the action label for `approve-and-publish`. `apply` accepts `fix_ready` and `needs_you` suggestions. `approve-and-publish` accepts only `fix_ready`. All actions require current edit access to every workflow of the group. Approval also requires publish access to every workflow. Save and publication respect editor write locks. Publication runs credential checks and enterprise review guards.

Apply calls `WorkflowService.prepareUpdate()` for each suggestion before the transaction. Inside one transaction, it locks the workflows in ID order and rechecks each baseline and edit access before it saves a workflow. `savePreparedUpdate()` saves each workflow and required history. The action records each applied version, closes each suggestion, and adds human activity before commit. `finishUpdate()` runs after-save hooks and events for each workflow after commit.

Apply passes `propagateVersionHistoryErrors: true` to `savePreparedUpdate()`. A history error then fails the transaction. By default, history write errors are logged and do not stop the save.

A failed transaction rolls back every workflow, history entry, suggestion closure, and activity of the group. If one suggestion is outdated, Apply closes the group as outdated and saves nothing. Apply returns the save error to the caller. A save error does not close the suggestion as outdated. Workflow events and later actions update that state. A competing action can cause Apply to return a conflict. After-save hook failures are logged and leave the committed application intact.

`approve-and-publish` calls the normal publisher with each saved version and checksum, one at a time. Sub-workflows come before the workflows that call them. Execute Sub-workflow references in the saved content set this order. Workflows in a call cycle, and the workflows that call them, come last, in workflow ID order.

The first publish request error stops later requests. For a group with more than one workflow, Apply then requests the previous published version of each workflow whose active version is still the applied version. It uses the reverse publish order, so callers come before their sub-workflows, and no checksum check. The first restoration request error stops restoration, so a restored sub-workflow does not run under a caller that keeps its new version. This applies only to Execute Sub-workflow references outside call cycles, because the publish order does not include other references. A workflow with another active version keeps it. The check and the request do not run atomically, so a publication between them can be replaced. A single workflow keeps its publish request, because no other workflow depends on its version. The suggestions stay applied. The result has `publishError` for the first error. It has `restorationError` only when a restoration request failed. A request that returns without an error does not establish that its version is live. Applied means saved, not published or verified fixed. The editor owns publication status, errors, and retries.

After either Apply action, the caller must check `closedReason` before opening the editor or showing success. Open the editor only when it is `applied`. If it is `outdated`, keep the review open and explain that the workflow has changed. If the save fails, keep the review open and show the error.

Only the request that applies the fix can start publication. Apply and Approve and publish return a conflict for an applied or discarded suggestion. They do not save or publish again. An outdated suggestion still returns its closure. After a failed request or lost response, use the editor to check publication status and publish the saved fix if needed. Proposal reads do not retry publication.

`discardPending()` closes the group and adds activity in one transaction. It joins the caller's transaction when one is supplied. If one suggestion is outdated, it closes the group as outdated and discards none. It returns `discarded`, `outdated`, `already_closed`, or `unavailable` when a workflow moved to another project.

## Storage and limits

The review migration requires empty suggestion tables. Run it before any service creates suggestions. Baseline metadata and the outcome are required. The baseline includes the saved and published versions, checksum, content counter, and `latestPublishHistoryEventId`. A save that only changes the update timestamp does not invalidate a suggestion. Restoring version pointers does not revive an old suggestion.

A workflow transfer does not transfer its suggestions. Apply checks the current owner without locking the ownership row. A project transfer after this check can overlap with Apply. A normal workflow save that starts before Apply can finish after Apply.

Deleting the workflow, original project, or background user deletes its suggestions and activity. For suggestions that remain, deleting the actor clears the activity's actor reference. The applied result keeps the actor ID. It also keeps the version ID if the history entry is deleted. Pending and closed suggestions have no time-based expiry. Workflow history, Assistant threads, reports, and execution evidence have separate lifetimes.

Tests under `__tests__` seed suggestions against published workflows. They require no model calls.
