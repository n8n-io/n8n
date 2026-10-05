# Isolated workflow suggestions

These internal Instance AI services store proposed workflow changes for human review. Only an authorized human action saves or publishes the reviewed fix.

A suggestion is separate from the workflow's saved editor draft. The Assistant edits files in its workspace during an investigation. The service stores proposed changes when the investigation ends. The agent chooses the outcome. Self-healing stores that outcome and its handoff report. Both Fix ready and Needs attention results can reference a suggestion. Suggestion storage does not decide whether a fix is ready to apply.

The `instance-ai` module registers the database entities. These services have no HTTP endpoints. No Enterprise license is required. There is no separate suggestion module. Self-healing configuration and opt-in belong to INS-1481; this storage does not start investigations.

Workflow event listeners use `N8N_INSTANCE_AI_WORKFLOW_SUGGESTIONS_ENABLED`. The flag defaults to `false`. Set it to `true` and restart n8n to load the event relay and its services. Database entities and migrations remain registered in either state.

## Internal operations

Use `WorkflowSuggestionService` from trusted backend code.

1. Call `captureBaseline(workflowId, backgroundUserId)` when the investigation starts. It returns the original snapshot, owner project, version IDs, and checksum. It does not insert a suggestion.
2. Keep this baseline with the investigation. The model must not choose or change it. Edit a separate candidate in the Assistant workspace.
3. Call `prepareSuggestion(baseline, { graph, explanation, errorContext, resultKind })` when the investigation ends with proposed changes. It checks permissions and basic graph structure for storage and diff display. `graph` accepts only nodes and connections. Supply `fix_ready` or `needs_you` as `resultKind`. The outcome is required. Only `fix_ready` permits Apply. The prepared value stays in backend memory.
4. Immediately call `createSuggestion(prepared, ctx)` inside the completion transaction. It rechecks the original baseline and creates a pending suggestion with submission activity. Use only the value returned by `prepareSuggestion`, never raw model output.

Pass the caller's transaction context as `ctx` to save the result and suggestion together. Use the same accepted outcome for both records. INS-1496 owns result storage, saved reports, and chat handoff inside Instance AI. INS-1480 runs investigations and fills those records with real outcomes and usage. It commits investigation completion with the result and suggestion and handles completion retries. A result without structurally valid graph changes has no suggestion.

Storage preserves the proposed graph without save-time preparation. It does not check credential access, node-group business rules, workflow-save policies, or execution results. INS-1479 provides tools the agent can use during its investigation. Apply uses the normal workflow-save path with current permission, credential, and policy checks. It rejects preparation that changes the reviewed fix. An agent outcome does not bypass these checks.

The tests under `__tests__` include a sample fix against a published workflow. They do not require the Assistant or a model call.

## Proposal detail

`WorkflowSuggestionService.getProposal()` returns a proposal and its activity to trusted backend callers. The supplied user must be enabled and have current workflow read and edit access, including access through sharing. Publish access is not required. The service checks both the proposal's original project and the workflow's current owner project.

The result includes the original snapshot and the proposed snapshot. The stored content does not change after creation. The shared inbox lists investigation results through a self-healing source. INS-1517 owns that integration. The self-healing result review API in INS-1496 will call this service internally and return the optional suggestion diff with the handoff report. Needs attention offers Continue in chat and Dismiss; it does not offer Apply.

## Storage and deletion

The suggestion tables stay empty until the feature starts creating results. The review migration assumes empty tables. Baseline metadata is required. There is no legacy-row backfill or fallback for missing baseline fields.

The suggestion table stores its own content. It does not reference workflow history or Assistant threads. Foreign keys delete the suggestion when its workflow, original project, or background user is deleted. This also deletes its activity, including for pending proposals. A later insert cannot reference a deleted parent. Investigation callers must stop when a required parent is missing.

A workflow transfer does not transfer its suggestions. Creation and actions reject a changed owner project. Reads, actions, and creation reconcile outdated pending suggestions. Workflow events also request reconciliation. The baseline includes the saved timestamp, content counter, and publication history position. Restoring version pointers does not restore an old suggestion.

Pending and closed suggestions remain until a parent record is deleted. There is no time-based expiry or suggestion cleanup task. Workspace files, investigation reports, and execution evidence have separate retention policies.

Creation rechecks the workflow baseline and records the suggestion and activity in one transaction. It does not explicitly lock the workflow or its owner. A concurrent edit can make a new suggestion outdated. INS-1516 must recheck the baseline before Apply. The edit permission check runs just before the transaction. Apply must check current permissions again.

## Review actions

Call `WorkflowSuggestionActionsService.act()` from trusted backend code. These actions have no standalone HTTP routes. INS-1496 will expose them through the self-healing result review API. That API must resolve the attached suggestion and pass the acting user and editor client ID (`push-ref`) to this service. The frontend will send one request for each review action. The backend must coordinate the result and suggestion state and return the updated review.

| Internal action | Behavior |
| --- | --- |
| `approve-and-publish` | Save the reviewed graph once. Request normal publication of that saved version. |
| `open-in-editor` | Save the reviewed graph once without publication. |
| `discard` | Close a pending suggestion without changing the workflow. |

Use **Approve and publish** as the action label. All actions require an enabled user with current edit access. Approval also requires publish access. Save and publication respect editor write locks. Publication keeps the existing credential checks and enterprise review guards.

Apply calls `WorkflowService.prepareUpdate()` for normal save validation and preparation. It then opens a transaction, locks the workflow, and rechecks the suggestion baseline. `savePreparedUpdate()` saves the workflow and required history in that transaction. The action records the applied version and closes the suggestion before commit. After commit, `finishUpdate()` runs the normal after-save hooks and events. A failed transaction cannot leave a saved fix with a pending suggestion. History records the human editor and Assistant authorship. Activity keeps the background user separate from the human actor.

Suggestion reads do not request row locks. Closure updates only pending suggestions. Competing actions return the recorded result. Apply rolls back its workflow changes if another action closes the suggestion first.

Ordinary saves keep their existing conflict checks. An ordinary save that started before Apply can still finish after Apply commits. This feature does not add a new conflict check to every workflow save.

The detail exposes `appliedVersion`. Approve and publish calls `WorkflowService.activateWorkflow()` with that version and its saved checksum. It uses the same conflict checks, permission checks, publication guards, and recovery behavior as the editor. It adds no publication queue or stronger publication guarantee.

Apply failures leave the workflow unchanged and the suggestion pending unless its baseline became outdated. After Apply commits, the suggestion stays closed as applied even if publication fails. The action returns an optional `publicationError` for the current request. An error does not establish whether the version is live. No error does not establish that trigger registration finished. The UI must show Applied and open the editor after either Apply action. The editor owns publication status, errors, and retries.

Only the request that applies the fix can start publication. Repeated actions return the recorded Apply result without another save or publish request. The service does not store publication status or reconstruct a publication outcome on reads. A closed page or a lost response can leave a saved fix unpublished. The user can recover in the editor.

INS-1496 owns shared result dismissal. Pass its transaction context to `discard(user, projectId, workflowId, suggestionId, ctx)` to commit result changes and suggestion closure together. Permission reads use the same transaction. A caller rollback also restores the suggestion and its activity. Calls without a context keep their own transaction.

INS-1496 must reflect the persisted suggestion state in result reads and actions. The frontend must not make a second request to update result state after a suggestion action. INS-1480 uses that state to reconcile investigation claims. An applied suggestion stays closed if publication fails. INS-1518 supplies all three review screens and editor navigation through the result review API. Applied does not mean published or verified fixed.
