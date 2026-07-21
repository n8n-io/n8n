import type { RuntimeSkill } from '@n8n/agents';

export function integrationsSkill(): RuntimeSkill {
	return {
		id: 'agent-builder-integrations',
		name: 'Agent Builder Integrations',
		description:
			'Use when deciding whether Slack, Linear, Telegram, or another external platform should be a target-agent chat integration/trigger versus an MCP, node, or workflow tool, and when adding, changing, or removing chat integrations; not for built-in Build chat or Preview chat behavior.',
		recommendedTools: [
			'resolve_integration',
			'list_integration_types',
			'configure_channel',
			'ask_questions',
			'read_config',
			'patch_config',
		],
		allowedTools: [
			'resolve_integration',
			'list_integration_types',
			'configure_channel',
			'ask_questions',
			'read_config',
			'patch_config',
			'write_config',
			'load_skill',
		],
		instructions: `\
## Purpose

Use this to decide whether the target agent needs an entry in \`integrations\`
or an MCP, node, or workflow tool for an external product, then configure
\`integrations\` only when the integration is the right surface.

## Use when

- The user asks to add, update, or remove entries in the target agent's
  \`integrations\` array.
- The user asks to connect the target agent to an external chat platform with
  credentials.

## Integration vs Callable Tool Decision

Use an integration when the product is the agent's conversation or trigger
surface: humans will mention, message, comment to, or resume the agent there,
or the agent needs to respond in that same platform conversation context.

Use an MCP, node, or workflow tool when the product is only something the agent
operates on: searching records, creating tickets, updating objects, or sending a
business-process notification while the conversation happens elsewhere.

Examples:

- Slack integration: the agent should be chatted with in Slack, respond in
  Slack threads, DM users, message channels, add reactions, or render rich UI
  to Slack users.
- Linear integration: the agent should be triggered from Linear issues/comments,
  understand the current Linear subject, or reply in the same Linear
  conversation.
- Linear callable tools: the agent is triggered from Slack, Preview, a task, or a
  workflow and only needs to search/create/update Linear tickets via MCP or node
  tools.

## Workflow

The \`integrations\` array controls how the target agent is triggered.

### Chat Integrations

- These are connected external chat platforms, not built-in Preview chat.
- Call \`list_integration_types\` first.
- Read the returned \`capabilities\`, \`useIntegrationWhen\`, and
  \`useNodeToolWhen\` fields before deciding to add an integration.
- Pick one returned \`type\` and pass it to \`configure_channel\` as
  \`integrationType\`. ALWAYS use \`configure_channel\` for chat-channel
  credentials — never \`ask_credential\` or a raw config write. The setup UI it
  shows creates and persists the credential/connection itself; do not follow up
  with \`patch_config\`/\`write_config\` to write the credential.
- Preserve existing chat integrations unless the user asked to remove them.
- To remove an existing chat integration, call \`read_config\` and inspect
  \`config.integrations\`.
- If exactly one existing integration matches the requested platform, remove
  that entry with \`patch_config\` by index (or replace \`/integrations\` with a
  filtered array when clearer).
- If multiple existing integrations match the requested platform, ask which one
  to remove before editing \`integrations\`.
- Removing a chat integration means deleting its entry from
  \`integrations[]\`. Do not call \`configure_channel\` to remove a channel.

### Callable External Services

When the product is not a chat/trigger integration, call \`resolve_integration\`
with queries matching the requested service before loading MCP or node-tool
skills.

- If it returns \`kind: "mcp"\`, load \`agent-builder-mcp\` and follow the MCP
  credential, verification, and config workflow.
- If it returns \`kind: "node"\`, load \`agent-builder-node-tools\`, use the
  returned node results with \`get_node_types\`, and ask for every required
  credential.
- Use workflow tools when the capability should come from an existing workflow
  instead of a direct MCP or node tool.

## Gotchas

- Chat integration types must come from \`list_integration_types\`.
- Do not add a chat integration just because the agent needs CRUD or notifications
  for that product. Resolve the callable capability through \`resolve_integration\`
  unless the product itself is the chat/trigger context.
- For recurring or scheduled runs, create a task (\`create_tasks\`), not an
  integration.
- Omitting \`integrations\` from a config write preserves the current channels.
  To remove one, write an explicit filtered array or remove the exact array
  entry.

## Verify

- Connected chat integrations were set up through \`configure_channel\`, not
  \`ask_credential\` or a manual config write.
- The chosen integration matches \`useIntegrationWhen\`; otherwise resolve the
  callable capability through \`resolve_integration\` and use MCP, node, or
  workflow tools.
- Generic non-chat external services were routed through \`resolve_integration\`
  before MCP or node setup.
- The final \`integrations\` array keeps unrelated integrations intact and
  removes only the requested channel entries.`,
	};
}
