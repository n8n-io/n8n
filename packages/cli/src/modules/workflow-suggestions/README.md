# Isolated workflow suggestions

This module stores proposed fixes for human review. It does not save or publish workflows.

A suggestion is separate from the workflow's saved editor draft. It stores a proposed change until a reviewer acts on it.

Enable it with `N8N_ENABLED_MODULES=workflow-suggestions`. Add it to the existing list if other optional modules are enabled. It is disabled by default. It requires no Enterprise license.

## Internal operations

Use `WorkflowSuggestionService` from trusted backend code. The caller supplies the background user and the baseline captured when the investigation started. The model must not choose those values.

1. Call `createSuggestion(source, errorContext)` to capture the original content.
2. Call `readSuggestion(source, suggestionId)` to read the latest graph and revision.
3. Call `reviseSuggestion(source, { suggestionId, expectedRevision, graph, explanation })` to prepare and validate a copy. `graph` accepts only nodes and connections.
4. Call `submitSuggestion(source, suggestionId, revision)` to freeze that exact revision.
5. Call `getLifecycleResult(source)` to recover the recorded result after a restart or content expiry. This internal method does not require the background user to retain access.

A source key identifies one investigation. Reuse the same key, user, workflow, version IDs, and checksum on retries. A key cannot create another proposal after content cleanup while its parent records exist.

The service checks structure, credential rules, node groups, and workflow-save policies. It records configuration diagnostics and execution verification as `not_run`. INS-1479 adds diagnostic integration. M2 must validate its final result before it accepts Fix ready.

The tests under `__tests__` include a sample fix against a published workflow. They do not require the Assistant or a model call.

## Proposal detail

`GET /projects/:projectId/workflow-suggestions/:suggestionId` returns a submitted proposal and its activity. The caller must be an enabled user with current workflow read and edit access. Publish access is not required. The route checks both the proposal's original project and the workflow's current owner project.

The response includes the original snapshot and the proposed snapshot. Expired proposals have a null payload and retain their lifecycle result and submission activity. Preparing suggestions are not available through this route.

## Storage and cleanup

The suggestion table stores its own content. It does not reference workflow history or Assistant threads. Foreign keys delete the suggestion when its workflow, original project, or background user is deleted. This also deletes its activity, including for pending proposals. A later insert cannot reference a deleted parent. Investigation callers must stop when a required parent is missing.

Content cleanup keeps the lifecycle result and submission activity while the parent records exist. Parent deletion removes the whole suggestion, so lifecycle lookup then returns no result.

A workflow transfer does not transfer its suggestions. Submission rejects a changed owner project. INS-1516 owns actions and pending-proposal supersession.

The system task processes at most 100 records each hour. It expires preparing content after 7 days without a successful revision. It retains pending content. It expires closed content after 30 days. Reads do not extend retention. Execution evidence has a separate retention policy.

Submission rechecks the workflow baseline and records activity in one short transaction. PostgreSQL locks the workflow row. SQLite uses its existing immediate write transaction. Permission and credential checks run just before this transaction. Apply must check them again.
