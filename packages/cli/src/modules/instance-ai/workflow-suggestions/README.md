# Isolated workflow suggestions

These internal Instance AI services store proposed workflow changes for human review. They do not save or publish workflows.

A suggestion is separate from the workflow's saved editor draft. The Assistant edits files in its workspace during an investigation. The service stores proposed changes when the investigation ends. The agent chooses the outcome. Self-healing stores that outcome and its handoff report. Both Fix ready and Needs attention results can reference a suggestion. Suggestion storage does not decide whether a fix is ready to apply.

The `instance-ai` module registers the database entities. This storage has no HTTP endpoints or startup tasks. No Enterprise license is required. There is no separate suggestion module. Self-healing configuration and opt-in belong to INS-1481; this storage does not start investigations.

Runtime integrations in INS-1516 use `N8N_INSTANCE_AI_WORKFLOW_SUGGESTIONS_ENABLED`. The flag defaults to `false`. Set it to `true` and restart n8n to enable those integrations. Database entities and migrations remain registered in either state.

## Internal operations

Use `WorkflowSuggestionService` from trusted backend code.

1. Call `captureBaseline(workflowId, backgroundUserId)` when the investigation starts. It returns the original snapshot, owner project, version IDs, and checksum. It does not insert a suggestion.
2. Keep this baseline with the investigation. The model must not choose or change it. Edit a separate candidate in the Assistant workspace.
3. Call `prepareSuggestion(baseline, { graph, explanation, errorContext })` when the investigation ends with proposed changes. It checks permissions and basic graph structure for storage and diff display. `graph` accepts only nodes and connections. The prepared value stays in backend memory.
4. Immediately call `createSuggestion(prepared, ctx)` inside the completion transaction. It rechecks the original baseline and creates a pending suggestion with submission activity. Use only the value returned by `prepareSuggestion`, never raw model output.

Pass the investigation's transaction context as `ctx` to save its report, result, and completion with the suggestion. INS-1480 owns investigations, outcomes, handoff reports, usage, and completion retries inside Instance AI. A result without structurally valid graph changes has no suggestion.

The service preserves the proposed graph without save-time preparation. It does not check credential access, node-group business rules, workflow-save policies, or execution results. INS-1479 provides tools the agent can use during its investigation. INS-1516 must apply proposals through the normal workflow-save and publish paths, with their current permission, credential, and policy checks. An agent outcome does not bypass these checks.

The tests under `__tests__` include a sample fix against a published workflow. They do not require the Assistant or a model call.

## Proposal detail

`WorkflowSuggestionService.getProposal()` returns a proposal and its activity to trusted backend callers. The supplied user must be enabled and have current workflow read and edit access, including access through sharing. Publish access is not required. The service checks both the proposal's original project and the workflow's current owner project.

The result includes the original snapshot and the proposed snapshot. The stored content does not change after creation. The shared inbox lists investigation results through a self-healing source. INS-1517 owns that integration. The self-healing result review API in INS-1496 will call this service internally and return the optional suggestion diff with the handoff report. Needs attention offers Continue in chat and Dismiss; it does not offer Apply.

## Storage and deletion

The suggestion table stores its own content. It does not reference workflow history or Assistant threads. Foreign keys delete the suggestion when its workflow, original project, or background user is deleted. This also deletes its activity, including for pending proposals. A later insert cannot reference a deleted parent. Investigation callers must stop when a required parent is missing.

A workflow transfer does not transfer its suggestions. Creation rejects a changed owner project. INS-1516 owns actions and pending-proposal supersession.

Pending and closed suggestions remain until a parent record is deleted. There is no time-based expiry or suggestion cleanup task. Workspace files, investigation reports, and execution evidence have separate retention policies.

Creation rechecks the workflow baseline and records the suggestion and activity in one transaction. It does not explicitly lock the workflow or its owner. A concurrent edit can make a new suggestion outdated. INS-1516 must recheck the baseline before Apply. The edit permission check runs just before the transaction. Apply must check current permissions again.
