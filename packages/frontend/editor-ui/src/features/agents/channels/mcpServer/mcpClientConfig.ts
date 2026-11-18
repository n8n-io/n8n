export type McpClientId = 'claudeCode' | 'cursor' | 'vscode' | 'stdio';

export interface McpClientConfig {
	client: McpClientId;
	language: 'bash' | 'json';
	code: string;
}

/** MCP clients accept letters, digits, `-` and `_` in a server name. */
export function toMcpServerName(agentName: string): string {
	const slug = agentName
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 48);
	return slug || 'n8n-agent';
}

function json(value: unknown) {
	return JSON.stringify(value, null, 2);
}

/**
 * The config snippets that connect an MCP client to the agent's MCP server. They
 * hold no secret: each client signs in with the n8n account of its user over
 * OAuth, so a user can send them to another user of the instance.
 */
export function buildMcpClientConfigs(agentName: string, url: string): McpClientConfig[] {
	const name = toMcpServerName(agentName);
	return [
		{
			client: 'claudeCode',
			language: 'bash',
			code: `claude mcp add --transport http ${name} ${url}`,
		},
		{
			client: 'cursor',
			language: 'json',
			code: json({ mcpServers: { [name]: { url } } }),
		},
		{
			client: 'vscode',
			language: 'json',
			code: json({ servers: { [name]: { type: 'http', url } } }),
		},
		{
			// For clients that only start local servers, such as Claude Desktop config files.
			client: 'stdio',
			language: 'json',
			code: json({ mcpServers: { [name]: { command: 'npx', args: ['-y', 'mcp-remote', url] } } }),
		},
	];
}
