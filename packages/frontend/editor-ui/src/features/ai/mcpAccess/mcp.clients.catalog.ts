import type { Component } from 'vue';

import ClaudeIcon from './assets/client-icons/claude.svg?component';
import CodexIcon from './assets/client-icons/codex.svg?component';
import CursorIcon from './assets/client-icons/cursor.svg?component';
import GeminiIcon from './assets/client-icons/gemini.svg?component';
import OpenAiIcon from './assets/client-icons/openai.svg?component';
import VsCodeIcon from './assets/client-icons/vscode.svg?component';

export type McpSetupCategory = 'cli' | 'web' | 'ide';

export interface McpClientSetup {
	id: string;
	/** Brand name, not translatable. */
	name: string;
	category: McpSetupCategory;
	/** Brand mark; null falls back to the neutral MCP icon (Windsurf has no official inlineable mark). */
	icon: Component | null;
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

/**
 * The "Connect a client" setup catalogue, in picker order. Each client carries
 * the per-category payload its setup steps render: CLIs an install command +
 * config + auth step, web clients a one-click connector URL, IDEs a deep link
 * (when the editor supports one) + manual config.
 */
export function getMcpClientCatalog(serverUrl: string): McpClientCategoryGroup[] {
	const claudeSnippet = `{
  "mcpServers": {
    "n8n": {
      "type": "http",
      "url": "${serverUrl}"
    }
  }
}`;
	// Cursor treats a bare `url` as SSE; n8n's endpoint is streamable HTTP, so the
	// transport must be stated explicitly.
	const cursorSnippet = `{
  "mcpServers": {
    "n8n": {
      "type": "streamable-http",
      "url": "${serverUrl}"
    }
  }
}`;
	// Codex routes HTTP MCP servers through its Rust client, which older builds only
	// enable behind this feature flag (newer builds ignore it).
	const codexSnippet = `[features]
experimental_use_rmcp_client = true

[mcp_servers.n8n]
url = "${serverUrl}"`;
	const geminiSnippet = `{
  "mcpServers": {
    "n8n": {
      "httpUrl": "${serverUrl}"
    }
  }
}`;
	const vscodeSnippet = `{
  "servers": {
    "n8n": {
      "type": "http",
      "url": "${serverUrl}"
    }
  }
}`;
	const windsurfSnippet = `{\n  "mcpServers": {\n    "n8n": {\n      "serverUrl": "${serverUrl}"\n    }\n  }\n}`;

	// One-click deep links, exactly as each editor expects: Cursor takes base64 of
	// `{"url": …}` in a `config` query param, VS Code a URL-encoded JSON object.
	const cursorDeepLink = `cursor://anysphere.cursor-deeplink/mcp/install?name=n8n&config=${btoa(
		`{"url":"${serverUrl}"}`,
	)}`;
	const vscodeDeepLink = `vscode:mcp/install?${encodeURIComponent(
		`{"name":"n8n","type":"http","url":"${serverUrl}"}`,
	)}`;

	return [
		{
			id: 'cli',
			clients: [
				{
					id: 'claude-code',
					name: 'Claude Code',
					category: 'cli',
					icon: ClaudeIcon,
					installCommand: `claude mcp add --transport http n8n ${serverUrl}`,
					configSnippet: claudeSnippet,
				},
				{
					id: 'codex',
					name: 'Codex',
					category: 'cli',
					icon: CodexIcon,
					installCommand: `codex mcp add n8n --url "${serverUrl}"`,
					configSnippet: codexSnippet,
					authCommand: 'codex mcp login n8n',
				},
				{
					id: 'gemini-cli',
					name: 'Gemini CLI',
					category: 'cli',
					icon: GeminiIcon,
					installCommand: `gemini mcp add --transport http n8n ${serverUrl}`,
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
					icon: ClaudeIcon,
					addUrl: 'https://claude.ai/directory/connectors/n8n',
				},
				{
					id: 'chatgpt',
					name: 'ChatGPT',
					category: 'web',
					icon: OpenAiIcon,
				},
			],
		},
		{
			id: 'ide',
			clients: [
				{
					id: 'cursor',
					name: 'Cursor',
					category: 'ide',
					icon: CursorIcon,
					deepLink: cursorDeepLink,
					configSnippet: cursorSnippet,
				},
				{
					id: 'vscode',
					name: 'VS Code',
					category: 'ide',
					icon: VsCodeIcon,
					deepLink: vscodeDeepLink,
					configSnippet: vscodeSnippet,
				},
				{
					id: 'windsurf',
					name: 'Windsurf',
					category: 'ide',
					icon: null,
					configSnippet: windsurfSnippet,
				},
			],
		},
	];
}
