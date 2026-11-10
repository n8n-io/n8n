# Human interactions for approval

Human interactions route a saved Agent's tool approvals to a decision workflow or
one of its connected channels. A configured route always handles the request.
Without a route, the tool keeps its existing conversational approval behavior.

Enable the Agents module and include `human-interactions` in `N8N_AGENTS_MODULES`.
The option is off by default. It gates configuration writes, new configured
requests, and decision node discovery. Pending requests can finish after it is off.
Message an Agent still defaults to version 3.1. Select version 4 to let a workflow
wait for an Agent's approval request.

## Destinations

| Destination | Support | Requirements |
| --- | --- | --- |
| Decision workflow | Supported | Start with Agent decision. Publish the workflow for published Agent runs. |
| Slack | Supported | Connected credential. Channel and user read scopes for destination search. Invite the bot to the channel. |
| Telegram | Supported | Connected credential. Numeric user ID. The user must first message the bot. |
| Discord | Supported | Connected credential. Server and channel or user IDs. Server Members intent for user search. |
| Teams, WhatsApp, Linear | Unsupported destination | Existing Agent conversations keep their approval behavior. |
| n8n Chat | No separately targeted destination | Existing conversational approvals remain available. |

Each platform declares its capability in `integrations/channel-hitl.ts`. It owns
its destination fields, paginated lookup, send-and-wait node, and response matching.
The coordinator does not read platform-specific node parameters.

## Configuration

Open a saved Agent's Settings, then Human interactions. Create a destination and
assign tools in its modal. Tools and MCP servers can also select the destination
in their approval settings. Approval must be enabled separately. An MCP server's
route applies to its Ask first tools.

Definitions stay in `hitlConfigurations` in the Agent JSON. Assignments use
`approvalRoute: { type: "configuration", configurationId }`. New definition IDs
use `interaction_<nanoid>`. Names follow the selected destination until the user
sets a custom name. No separate configuration table is used.

Package export includes decision workflow requirements. Import remaps their IDs.
Channel credentials are cleared on package export. Connect the imported Agent to
the destination platform and select its approval destination again.

Requests have no expiry by default. `expirySeconds` can be 3600, 86400, or 604800.
A decision completed before its deadline stays valid when the Agent resumes later.
An expired, cancelled, invalid, or rejected request does not run the protected tool.
Chat and task resumes reject a changed Agent definition or custom tool implementation.
Workflow callers restore their saved Agent snapshot.
A workflow tool must still have the version that was reviewed when it starts.

## Decision workflows

The Agent decision trigger receives one item with these fields:

- `requestId`, `agentId`, and `toolName` identify the request.
- `description` explains the proposed action.
- `arguments` contains the sanitized tool input.
- `requestedAt` records the request time. `expiresAt` is present for a deadline.
- `argumentsRedacted: true` replaces arguments and description when the caller's
  workflow redaction settings hide them.

Add review steps and return one terminal item with `{ approved: boolean }`.
`reason` is optional. Existing send-and-wait nodes can return this shape directly.
The optional Respond to Agent decision node creates the same result. Its default
is rejection. An unconditional approval is not a human review step.

## Runtime and ownership

Approval requests use the existing workflow execution, durable wait, checkpoint,
and Agent resume paths. `AgentWorkflowToolResumeService` handles workflow
completion, worker relay, and task resumes. Task resumes use the same session and
memory scope. They do not need a conversational requester or send a waiting chat
message. The request and result belong in session traces.

A real decision workflow keeps its own ID. Generated channel graphs use a private
backing workflow referenced by `agents.approvalWorkflowId`. This row has no user
shares. User workflow APIs cannot read, edit, unarchive, or delete it. A private
owner resolver supplies the Agent's current project to engine and credential
checks. The backing row has no executable graph. The execution stores the graph.
It never uses the caller's workflow ID. Agent and project deletion cancel pending
checkpoints before stopping approval children. Cleanup then removes the private
owner and its execution data. The final Agent deletion locks the row and rejects
a new unconsumed request or private owner created during cleanup. User-authored
decision workflows keep their history.

Approval jobs retain child and caller execution data and checkpoints until their decision is
consumed. Generic execution retention checks apply before pruning or deleting
execution rows, JSON data, and binary data. Agents supplies the retained IDs;
the shared execution repository does not query the Agents tables.

Channel buttons use signed native callbacks. Responses must match the request's
Agent, project, run, thread, execution, connected credential, and destination.
Repeated or late callbacks cannot change a resolved decision. An `agentApproval`
parameter in user-authored workflow JSON does not create an approval job or grant
permission to resume an Agent.

Message an Agent version 4 processes items in order. It retains completed item
results while an item is waiting. The whole workflow execution parks. On resume,
it restores the pending item, then processes the remaining items. Completed nodes
remove this temporary invocation metadata. Full runtime snapshots stay in the
protected Agent checkpoint, not in parent workflow task metadata or node output.

## Validation

Use deterministic database lifecycle tests with a scripted model and mocked
message delivery. Use handcrafted callback payloads for response validation.
Delivery recordings must contain sanitized data from a dedicated test workspace.
Do not use live credentials for routine tests.

Engine, nodes, persistence, integrations, and editor changes need their owning
teams' review before rollout. Verify both databases, regular and queue execution,
worker restart, expiry, cancellation, and manual deletion in the release checks.
