# Advanced HITL workflow spike

Run the database migrations. Use Message an Agent version 4.

This branch implements workflow and connected-channel approval destinations.
It includes the workflow caller and item continuation in the same spike.

1. Open a saved Agent. Open Settings, then Advanced HITL.
2. Create a configuration. Select a workflow or a connected Slack, Telegram, or
   Discord channel. The workflow picker includes search and Create workflow.
3. For a workflow, add review steps between the Agent decision trigger and the response.
   A send-and-wait approval node can return the decision directly.
4. Return one terminal item with `approved: true` or `approved: false`.
   The response helper is optional. Its starter value is false.
5. Select the configuration on each tool or MCP server that needs it.
   Enable the tool's approval requirement separately.
6. Publish the Agent and decision workflow for production calls.
7. Call the Agent from Message an Agent version 4. The caller waits when review waits.
8. Approve or reject through the workflow. The same Agent run resumes.
   A rejection does not run the protected tool.

Approval routing has four cases:

1. A gated tool with no configuration uses the current approval behavior.
2. A conversation with a configuration still asks its requester by default.
3. A workflow call uses the tool's selected configuration.
4. A configuration with `disallowRequesterApproval: true` routes a conversation to
   its destination. The requester sees a fixed administrator waiting message.
   The conversation has no approval buttons. The workflow or channel controls its
   approvers. This setting does not add an n8n administrator-role check.

There is no Agent-wide default destination. Settings lists configurations as
editable pills with an adjacent add action.

Requests have no expiry. Approval jobs retain the exact Agent checkpoint and
decision execution until consumption. They do not send background mailbox turns.
The existing `AgentWorkflowToolResumeService` handles workflow completion and worker
relay. The existing `WaitTracker` claims and restarts the waiting parent execution.
No separate Agent continuation scheduler is added.

The builder configures approval destinations. Pending request tracking belongs
to the separate session traces work.

Message an Agent processes items in order. It retains completed item results in
task metadata. It stops at a suspended item. On resume, it restores that item and
then processes the remaining items. A waiting node parks the whole execution.
Multiple pending decisions in one Agent batch must finish before that node resumes.
Earlier node versions keep their behavior.

The workflow input includes a request ID, Agent ID, tool name, arguments, and request
time. Arguments use the existing approval sanitization. Caller redaction suppresses
arguments. Child redaction and private credential markers pass back to the parent.

## Limits to investigate before delivery

- Scheduled Agent tasks remain unsupported.
- The channel path runs a generated send-and-wait snapshot under the caller
  workflow ID. It does not save a workflow or change the caller graph. Credential
  policy uses the Agent project. Conversation requests use one archived workflow
  owner per Agent. The snapshot contains the approval steps. Review owner cleanup
  and execution ownership before delivery.
- Discord user lists require the Server Members intent. Slack lists need
  channel and user read scopes. Telegram users must first message the bot.
- Destination search reads one vendor page per request. Load more continues the
  search. The destination menu virtualizes loaded rows.
- Inline Agents remain excluded.
- There is no production readiness claim for queue restart, cancellation races,
  concurrent Agent nodes, execution deletion, or dynamic credential identity.
  Run these against a complete local instance and a queue deployment.
- Workflow deletion checks and configuration validation must include decision
  workflow references. The current runtime rejects unavailable configurations.
- The snapshot includes config and tool assets. It needs review against execution
  export, redaction, and storage rules before delivery.
- The new nodes, Agent UI, and request dispatch are available in this spike.
  Set the rollout policy before release.
- The migration and generated schema docs are included. Test upgrade and downgrade
  with active requests before release.

Channel definitions own their fields, list lookup, and send-and-wait node.
Linear explicitly disables this capability. The runtime checks that the selected
connection belongs to the pinned Agent.

The repository's execution pruner now reads approval receipts to retain child rows.
This coupling needs review before a production implementation.
