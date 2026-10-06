# Workflow suggestions

These internal Instance AI services store proposed workflow changes for human review. Suggestions are separate from the workflow's saved editor draft. These services do not run investigations or expose HTTP endpoints. No Enterprise license is required.

Set `N8N_INSTANCE_AI_WORKFLOW_SUGGESTIONS_ENABLED=true` and restart n8n to load the workflow event relay and its services. The flag defaults to `false`. Database entities and migrations remain registered in either state.

## Store a suggestion

Use `WorkflowSuggestionService` from trusted backend code.

1. Call `captureBaseline(workflowId, backgroundUserId)` before preparing a fix. Keep the returned baseline outside model control.
2. Call `prepareSuggestion(baseline, { graph, explanation, errorContext, resultKind })` with the proposed changes. `graph` accepts only nodes and connections. Supply `fix_ready` or `needs_you` as `resultKind`.
3. Immediately call `createSuggestion(prepared, ctx)` inside the caller's completion transaction. Use the prepared value, never raw model output. Creation rechecks the baseline and records the suggestion and submission activity together.

Storage checks current edit access and basic graph structure. Apply runs credential checks, workflow-save policies, and normal save preparation. It rejects preparation that changes the reviewed fix. A result without valid graph changes has no suggestion.

## Read and refresh

`getProposal(user, projectId, workflowId, suggestionId)` reads the stored proposal and activity without changing them. `refreshProposal(...)` first closes an outdated pending suggestion, then returns its detail. Use refresh when opening a review so the displayed state reflects current workflow changes.

Both operations require an enabled user with current workflow read and edit access, including access through sharing. They check the proposal's original project and the workflow's current owner project. Publish access is not required.

The detail includes the original and proposed snapshots. Stored proposal content does not change after creation. Workflow events also refresh pending suggestions. Save events are debounced per workflow for two seconds, with a maximum wait of five seconds during continuous saves. Publish, unpublish, and archive events cancel the pending save refresh and refresh immediately. Explicit refresh and action checks run immediately and cover missed events.

## Review actions

Call `WorkflowSuggestionActionsService.act()` with the acting user, project, workflow, suggestion, action, and editor client ID (`push-ref`). The calling review service coordinates its result record with the suggestion. The frontend should not send a second request to synchronize result state.

| Action | Behavior |
| --- | --- |
| `approve-and-publish` | Save the reviewed fix once. Request normal publication of that saved version. |
| `open-in-editor` | Save the reviewed fix once without publication. |
| `discard` | Close a pending suggestion without changing the workflow. |

Use **Approve and publish** as the action label. Only `fix_ready` permits Apply. All actions require current edit access. Approval also requires publish access. Save and publication respect editor write locks. Publication keeps the normal credential checks and enterprise review guards.

Apply calls `WorkflowService.prepareUpdate()` for normal save validation and preparation. Inside a transaction, it locks the workflow and rechecks the baseline and edit access. `savePreparedUpdate()` saves the workflow and required history. The action records the applied version, closes the suggestion, and adds human activity before commit. `finishUpdate()` runs after-save hooks and events after commit.

A failed transaction rolls back the workflow, history, suggestion closure, and activity. Apply returns the original save error without reading the suggestion again. A save error does not close the suggestion as outdated. Workflow events and review refreshes update that state. A competing action can cause Apply to return a conflict. After-save hook failures are logged and leave the committed application intact.

Approve and publish calls the normal publisher with the saved version and checksum. A publish failure leaves the suggestion applied and returns `publishError`. Applied means saved, not published or verified fixed. The UI should open the editor after either Apply action. The editor owns publication status, errors, and retries.

Only the request that applies the fix can start publication. Repeated actions return the recorded result without another save or publish request. A closed page or lost response can leave a saved fix unpublished. The service does not store publication status or reconstruct an outcome on reads.

Pass the caller's transaction to `discard(user, projectId, workflowId, suggestionId, ctx)` to commit result dismissal and suggestion closure together. A caller rollback restores the suggestion and activity. Calls without a context own their transaction.

## Storage and limits

The review migration assumes empty suggestion tables before a producer starts writing. Baseline metadata and the outcome are required. There is no legacy-row backfill. The baseline includes the saved and published versions, checksum, content counter, and `latestPublishHistoryEventId`. A save that only changes the update timestamp does not invalidate a suggestion. Restoring version pointers does not revive an old suggestion.

A workflow transfer does not transfer its suggestions. Apply checks the current owner without locking the ownership row. A project transfer after this check can overlap with Apply. Ordinary saves keep their existing conflict checks; a save started before Apply can finish after it.

Deleting the workflow, original project, or background user deletes its suggestions and activity. Deleting a human actor clears the activity's actor reference. Pending and closed suggestions have no time-based expiry. Workflow history, Assistant threads, reports, and execution evidence have separate lifetimes.

Tests under `__tests__` seed suggestions against published workflows. They require no model calls.
