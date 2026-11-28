/**
 * How each AI client adds an MCP server: the install commands, config snippets, and one-click
 * links. The instance MCP dialog and the share page of custom MCP servers both read it. The
 * brand icons stay with each caller, because this package builds without a Vue SVG loader.
 */

export type McpSetupCategory = 'cli' | 'web' | 'ide';

export type McpClientId =
	| 'claude-code'
	| 'codex'
	| 'gemini-cli'
	| 'claude-ai'
	| 'chatgpt'
	| 'mistral-vibe'
	| 'antigravity'
	| 'cursor'
	| 'devin'
	| 'vscode';

export interface McpClientSetup {
	id: McpClientId;
	/** Brand name, not translatable. */
	name: string;
	category: McpSetupCategory;
	installCommand?: string;
	/** Snippet for the client's MCP config file (JSON, or TOML for Codex). */
	configSnippet?: string;
	/** Command that triggers the client's OAuth login; clients without one use '/mcp' in-app. */
	authCommand?: string;
	/** One-click install deep link (IDEs). */
	deepLink?: string;
	/** Connector-settings page for one-click web clients. */
	addUrl?: string;
}

export interface McpClientCategoryGroup {
	id: McpSetupCategory;
	clients: McpClientSetup[];
}

export interface McpClientCatalogOptions {
	/**
	 * The name that the client gives the server, in commands, config keys, and deep links.
	 * Use a slug: lowercase letters, digits, and dashes. The default is `n8n`.
	 */
	serverName?: string;
}

/**
 * Opens the "Add custom connector" dialog of Claude with the name and the URL filled in.
 * Anthropic does not document this link, so the page must also show the manual steps.
 */
export function claudeAddConnectorUrl(name: string, serverUrl: string): string {
	return `https://claude.ai/customize/connectors?modal=add-custom-connector&connectorName=${encodeURIComponent(
		name,
	)}&connectorUrl=${encodeURIComponent(serverUrl)}`;
}

/**
 * The "Connect a client" setup catalogue, in picker order. Each client carries
 * the per-category payload its setup steps render: CLIs an install command +
 * config + auth step, web clients a one-click connector URL (when the client
 * supports one), IDEs a deep link (when the editor supports one) + manual config.
 */
export function getMcpClientCatalog(
	serverUrl: string,
	{ serverName: name = 'n8n' }: McpClientCatalogOptions = {},
): McpClientCategoryGroup[] {
	const json = (value: unknown) => JSON.stringify(value, null, 2);

	const claudeSnippet = json({ mcpServers: { [name]: { type: 'http', url: serverUrl } } });
	// Cursor treats a bare `url` as SSE; n8n's endpoint is streamable HTTP, so the
	// transport must be stated explicitly.
	const cursorSnippet = json({
		mcpServers: { [name]: { type: 'streamable-http', url: serverUrl } },
	});
	// Codex routes HTTP MCP servers through its Rust client, which older builds only
	// enable behind this feature flag (newer builds ignore it).
	const codexSnippet = `[features]
experimental_use_rmcp_client = true

[mcp_servers.${name}]
url = "${serverUrl}"`;
	const geminiSnippet = json({ mcpServers: { [name]: { httpUrl: serverUrl } } });
	const vscodeSnippet = json({ servers: { [name]: { type: 'http', url: serverUrl } } });
	const serverUrlSnippet = json({ mcpServers: { [name]: { serverUrl } } });
	const devinSnippet = json({ mcpServers: { [name]: { url: serverUrl, transport: 'http' } } });

	// One-click deep links, exactly as each editor expects: Cursor takes base64 of
	// `{"url": …}` in a `config` query param, VS Code a URL-encoded JSON object.
	const cursorDeepLink = `cursor://anysphere.cursor-deeplink/mcp/install?name=${encodeURIComponent(
		name,
	)}&config=${encodeURIComponent(btoa(JSON.stringify({ url: serverUrl })))}`;
	const vscodeDeepLink = `vscode:mcp/install?${encodeURIComponent(
		JSON.stringify({ name, type: 'http', url: serverUrl }),
	)}`;

	return [
		{
			id: 'cli',
			clients: [
				{
					id: 'claude-code',
					name: 'Claude Code',
					category: 'cli',
					installCommand: `claude mcp add --transport http ${name} ${serverUrl}`,
					configSnippet: claudeSnippet,
				},
				{
					id: 'codex',
					name: 'Codex',
					category: 'cli',
					installCommand: `codex mcp add ${name} --url "${serverUrl}"`,
					configSnippet: codexSnippet,
					authCommand: `codex mcp login ${name}`,
				},
				{
					id: 'gemini-cli',
					name: 'Gemini CLI',
					category: 'cli',
					installCommand: `gemini mcp add --transport http ${name} ${serverUrl}`,
					configSnippet: geminiSnippet,
				},
			],
		},
		{
			id: 'web',
			clients: [
				{
					id: 'claude-ai',
					name: 'Claude.ai',
					category: 'web',
					// The n8n directory connector expects the instance MCP of an n8n Cloud instance.
					addUrl: 'https://claude.ai/directory/connectors/n8n',
				},
				{
					id: 'chatgpt',
					name: 'ChatGPT',
					category: 'web',
				},
				{
					id: 'mistral-vibe',
					name: 'Mistral Vibe',
					category: 'web',
					// Opens Vibe's built-in n8n connector template with the server URL prefilled,
					// so the user only has to click Connect.
					addUrl: `https://chat.mistral.ai/connections/marketplace?search=n8n&template=n8n&server_url=${encodeURIComponent(
						serverUrl,
					)}`,
				},
			],
		},
		{
			id: 'ide',
			clients: [
				{
					id: 'antigravity',
					name: 'Antigravity',
					category: 'ide',
					configSnippet: serverUrlSnippet,
				},
				{
					id: 'cursor',
					name: 'Cursor',
					category: 'ide',
					deepLink: cursorDeepLink,
					configSnippet: cursorSnippet,
				},
				{
					id: 'devin',
					name: 'Devin',
					category: 'ide',
					configSnippet: devinSnippet,
				},
				{
					id: 'vscode',
					name: 'VS Code',
					category: 'ide',
					deepLink: vscodeDeepLink,
					configSnippet: vscodeSnippet,
				},
			],
		},
	];
}
