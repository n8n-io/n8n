# Advanced HITL workflow spike

Run the database migrations. Use Message an Agent version 4.

This branch implements the workflow path in the Advanced HITL investigation.
It includes the workflow caller and item continuation in the same spike.

1. Open a saved Agent. Open Settings, then Advanced HITL.
2. Create a configuration. Select a decision workflow or create one.
3. Add review steps between the Agent decision trigger and the response.
   A send-and-wait approval node can return the decision directly.
4. Return one terminal item with `approved: true` or `approved: false`.
   The response helper is optional. Its starter value is false.
5. Select the configuration as the Agent default or a tool or MCP server override.
   Enable the tool's approval requirement separately.
6. Publish the Agent and decision workflow for production calls.
7. Call the Agent from Message an Agent version 4. The caller waits when review waits.
8. Approve or reject through the workflow. The same Agent run resumes.
   A rejection does not run the protected tool.
9. Open Advanced HITL to cancel a pending request and its caller.

Requests have no expiry. Approval jobs retain the exact Agent checkpoint and
decision execution until consumption. They do not send background mailbox turns.
The existing `AgentWorkflowToolResumeService` handles workflow completion and worker
relay. The existing `WaitTracker` claims and restarts the waiting parent execution.
No separate Agent continuation scheduler is added.

Message an Agent processes items in order. It retains completed item results in
task metadata. It stops at a suspended item. On resume, it restores that item and
then processes the remaining items. A waiting node parks the whole execution.
Multiple pending decisions in one Agent batch must finish before that node resumes.
Earlier node versions keep their behavior.

The workflow input includes a request ID, Agent ID, tool name, arguments, and request
time. Arguments use the existing approval sanitization. Caller redaction suppresses
arguments. Child redaction and private credential markers pass back to the parent.

## Limits to investigate before delivery

- Scheduled Agent tasks and direct Slack, Telegram, or Discord destinations are not
  implemented here. Use existing workflow send-and-wait nodes for channel review.
- Inline Agents remain excluded. Conversational approvals keep their existing path.
- There is no production readiness claim for queue restart, cancellation races,
  concurrent Agent nodes, execution deletion, or dynamic credential identity.
  Run these against a complete local instance and a queue deployment.
- The pending list returns the first 100 unconsumed requests. It needs pagination
  and links to the caller before delivery.
- Workflow deletion checks and configuration validation must include decision
  workflow references. The current runtime rejects unavailable configurations.
- The snapshot includes config and tool assets. It needs review against execution
  export, redaction, and storage rules before delivery.
- The new nodes, Agent UI, and request dispatch are available in this spike.
  Set the rollout policy before release.
- The migration and generated schema docs are included. Test upgrade and downgrade
  with active requests before release.

The repository's execution pruner now reads approval receipts to retain child rows.
This coupling needs review before a production implementation.
