# Isolated workflow suggestions

These internal Instance AI services store proposed workflow changes for human review. Only an authorized human action saves or publishes the reviewed fix.

A suggestion is separate from the workflow's saved editor draft. The Assistant edits files in its workspace during an investigation. The service stores proposed changes when the investigation ends. The agent chooses the outcome. Self-healing stores that outcome and its handoff report. Both Fix ready and Needs attention results can reference a suggestion. Suggestion storage does not decide whether a fix is ready to apply.

The existing `instance-ai` module registers these services and the read endpoint. It is enabled by default and requires no Enterprise license. There is no separate suggestion module. Disabling the Assistant in settings does not hide saved suggestions. Self-healing configuration and opt-in belong to INS-1481; this storage does not start investigations.

## Internal operations

Use `WorkflowSuggestionService` from trusted backend code.

1. Call `captureBaseline(workflowId, backgroundUserId)` when the investigation starts. It returns the original snapshot, owner project, version IDs, and checksum. It does not insert a suggestion.
2. Keep this baseline with the investigation. The model must not choose or change it. Edit a separate candidate in the Assistant workspace.
3. Call `prepareSuggestion(baseline, { graph, explanation, errorContext, resultKind })` when the investigation ends with proposed changes. It checks permissions and basic graph structure for storage and diff display. `graph` accepts only nodes and connections. Supply the accepted investigation outcome as `resultKind`. Storage does not infer it. Only `fix_ready` permits Apply. An omitted outcome permits review only. The prepared value stays in backend memory.
4. Immediately call `createSuggestion(prepared, ctx)` inside the completion transaction. It rechecks the original baseline and creates a pending suggestion with submission activity. Use only the value returned by `prepareSuggestion`, never raw model output.

Pass the caller's transaction context as `ctx` to save the result and suggestion together. Use the same accepted outcome for both records. INS-1496 owns result storage, saved reports, and chat handoff inside Instance AI. INS-1480 runs investigations and fills those records with real outcomes and usage. It commits investigation completion with the result and suggestion and handles completion retries. A result without structurally valid graph changes has no suggestion.

Storage preserves the proposed graph without save-time preparation. It does not check credential access, node-group business rules, workflow-save policies, or execution results. INS-1479 provides tools the agent can use during its investigation. Apply uses the normal workflow-save path with current permission, credential, and policy checks. It rejects preparation that changes the reviewed fix. An agent outcome does not bypass these checks.

The tests under `__tests__` include a sample fix against a published workflow. They do not require the Assistant or a model call.

## Proposal detail

`GET /projects/:projectId/workflows/:workflowId/suggestions/:suggestionId` returns a proposal and its activity. The caller must be an enabled user with current workflow read and edit access, including access through sharing. Publish access is not required. The route checks both the proposal's original project and the workflow's current owner project.

The response includes the original snapshot and the proposed snapshot. The stored content does not change after creation. The shared inbox lists investigation results through a self-healing source. INS-1517 owns that integration. Self-healing owns result details and actions, including the optional suggestion diff. Needs attention offers Continue in chat and Dismiss; it does not offer Apply.

## Storage and deletion

The suggestion table stores its own content. It does not reference workflow history or Assistant threads. Foreign keys delete the suggestion when its workflow, original project, or background user is deleted. This also deletes its activity, including for pending proposals. A later insert cannot reference a deleted parent. Investigation callers must stop when a required parent is missing.

A workflow transfer does not transfer its suggestions. Creation and actions reject a changed owner project. Reads, actions, and creation reconcile outdated pending suggestions. Workflow events also request reconciliation. The baseline includes the saved timestamp, content counter, and publication history position. Restoring version pointers does not restore an old suggestion.

Pending and closed suggestions remain until a parent record is deleted. There is no time-based expiry or suggestion cleanup task. Workspace files, investigation reports, and execution evidence have separate retention policies.

Creation rechecks the workflow baseline and records the suggestion and activity in one transaction. PostgreSQL locks the workflow and owner rows. SQLite uses its existing immediate write transaction. The edit permission check runs just before the transaction. Apply must check current permissions again.

## Review actions

Each POST route uses the proposal detail path plus an action suffix:

| Suffix | Action |
| --- | --- |
| `approve-and-publish` | Save the reviewed graph once. Publish that exact saved version. |
| `open-in-editor` | Save the reviewed graph once without publication. |
| `discard` | Close a pending suggestion without changing the workflow. |
| `retry-publication` | Retry publication of the recorded version without another save. |

Use **Approve and publish** as the action label. All actions require an enabled user with current edit access. Approval and publication retry also require publish access. Save and publication respect editor write locks. Publication keeps the existing credential checks and enterprise review guards.

Apply locks the workflow and rechecks the suggestion baseline after normal save preparation. It commits workflow content, required history, the applied-version record, and activity together. A failed transaction cannot leave a saved fix with a pending suggestion. History records the human editor and Assistant authorship. Activity keeps the background user separate from the human actor.

Ordinary saves keep their existing conflict checks. An ordinary save that started before Apply can still finish after Apply commits. This feature does not add a new conflict check to every workflow save.

The detail exposes `appliedVersion` and the recorded publication outcome. Publication uses the existing outbox and trigger status. It distinguishes unpublished, pending, partial, successful, failed, and unknown outcomes. A lost response or active-version pointer alone does not prove success or failure. Retries reject later saved content, ownership changes, and intervening publication. Confirmed publication outcomes remain recorded after outbox cleanup.

INS-1496 owns shared result dismissal. Pass its transaction context to `discard(user, projectId, workflowId, suggestionId, ctx)` to commit result changes and suggestion closure together. Permission reads use the same transaction. A caller rollback also restores the suggestion and its activity. Calls without a context keep their own transaction.

INS-1496 must reflect the persisted suggestion state in result reads and actions, including closure through the standalone suggestion routes. INS-1480 uses that state to reconcile investigation claims. An applied suggestion stays closed if publication fails. INS-1518 supplies all three review screens and editor navigation.
