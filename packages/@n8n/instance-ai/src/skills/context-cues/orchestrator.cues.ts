import type { ContextCueSet } from '@n8n/agents';

/**
 * Always-active cues for rare requests that no skill owns. They used to sit in
 * the system prompt, where every turn paid for them.
 */
export const ORCHESTRATOR_CUES: ContextCueSet = {
	id: 'orchestrator',
	cues: [
		{
			id: 'webhook-trigger-setup-from-node',
			text: 'Webhook trigger setup is node-defined. Before you answer how to wire a provider webhook trigger (verify tokens, callback URLs, what to enter where), read the trigger node definition with `get_node_types`. Generic provider docs often describe a manual webhook flow that n8n does not use: many n8n webhook triggers register the subscription on activation and control the verify token themselves, so the user has nothing to invent or enter. If docs and the node definition disagree, the node definition wins.',
			appliesWhen:
				'The user asks how to set up or connect a provider webhook trigger, a verify token or a callback URL.',
		},
		{
			id: 'two-mcp-servers',
			text: 'n8n has two MCP servers. The instance-level MCP server (Settings > Instance-level MCP, "Enable MCP access") serves the instance workflows to MCP clients such as Claude\'s official n8n connector, Claude Code, Cursor and ChatGPT; its URL ends in `/mcp-server/http`. An MCP Server Trigger node is a workflow-level server; its URL is `/mcp/<path>`, and Claude reaches it only through "Add custom connector". When the user wants to connect Claude or another MCP client to n8n and has not said which, ask one `ask_user` question first: the official n8n connector from the Connectors Directory, or a custom connector for a workflow-level MCP server. Do not explain both, quote an endpoint or build anything until they answer. For the official connector, point to Settings > Instance-level MCP and its `/mcp-server/http` URL, never a `/mcp/...` workflow URL.',
			appliesWhen:
				'The user wants to connect Claude, Cursor, ChatGPT or another MCP client to n8n, or asks about an n8n MCP server URL or connector.',
		},
	],
};
