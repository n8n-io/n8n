# Isolated workflow suggestions

This module stores finished proposed fixes for human review. It does not save or publish workflows.

A suggestion is separate from the workflow's saved editor draft. The Assistant edits files in its workspace during an investigation. This module stores a suggestion only after that work is complete.

Enable it with `N8N_ENABLED_MODULES=workflow-suggestions`. Add it to the existing list if other optional modules are enabled. It is disabled by default. It requires no Enterprise license.

## Internal operations

Use `WorkflowSuggestionService` from trusted backend code.

1. Call `captureBaseline(workflowId, backgroundUserId)` when the investigation starts. It returns the original snapshot, owner project, version IDs, and checksum. It does not insert a suggestion.
2. Keep this baseline with the investigation. The model must not choose or change it. Edit a separate candidate in the Assistant workspace.
3. Call `prepareSuggestion(baseline, { graph, explanation, errorContext })` when the investigation finishes with a valid fix. It checks permissions and validates the final graph. `graph` accepts only nodes and connections. The prepared value stays in backend memory.
4. Immediately call `createSuggestion(prepared, ctx)` inside the completion transaction. It rechecks the original baseline and creates a pending suggestion with submission activity. Use only the value returned by `prepareSuggestion`, never model output or a stored validation result.

Pass the investigation's transaction context as `ctx` to save its report, result, and completion with the suggestion. INS-1480 owns that transaction and its completed-state check. This module does not coordinate investigation retries. Failed or interrupted investigations save a report without a suggestion.

The service checks structure, credential rules, node groups, and workflow-save policies. It records configuration diagnostics and execution verification as `not_run`. INS-1479 adds tools that compile and validate workspace candidates without saving the actual workflow. M2 must validate its final result before it accepts Fix ready.

The tests under `__tests__` include a sample fix against a published workflow. They do not require the Assistant or a model call.

## Proposal detail

`GET /projects/:projectId/workflow-suggestions/:suggestionId` returns a proposal and its activity. The caller must be an enabled user with current workflow read and edit access. Publish access is not required. The route checks both the proposal's original project and the workflow's current owner project.

The response includes the original snapshot and the proposed snapshot. The stored content does not change after creation.

## Storage and cleanup

The suggestion table stores its own content. It does not reference workflow history or Assistant threads. Foreign keys delete the suggestion when its workflow, original project, or background user is deleted. This also deletes its activity, including for pending proposals. A later insert cannot reference a deleted parent. Investigation callers must stop when a required parent is missing.

A workflow transfer does not transfer its suggestions. Creation rejects a changed owner project. INS-1516 owns actions and pending-proposal supersession.

The system task processes at most 100 records each hour. It retains pending suggestions. It deletes closed suggestions and their activity after 30 days. Reads do not extend retention. Workspace files, investigation reports, and execution evidence have separate retention policies.

Creation rechecks the workflow baseline and records the suggestion and activity in one transaction. PostgreSQL locks the workflow row. SQLite uses its existing immediate write transaction. Permission and credential checks run just before the transaction. Apply must check them again.
