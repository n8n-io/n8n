import {
	getMcpClientCatalog as getSharedMcpClientCatalog,
	type McpClientId,
	type McpClientSetup as SharedMcpClientSetup,
	type McpSetupCategory,
} from '@n8n/frontend-utils/mcpClients';
import { markRaw, type Component } from 'vue';

import AntigravityIcon from './assets/client-icons/antigravity.svg?component';
import ClaudeIcon from './assets/client-icons/claude.svg?component';
import CodexIcon from './assets/client-icons/codex.svg?component';
import CursorIcon from './assets/client-icons/cursor.svg?component';
import DevinIcon from './assets/client-icons/devin.svg?component';
import GeminiIcon from './assets/client-icons/gemini.svg?component';
import MistralIcon from './assets/client-icons/mistral.svg?component';
import OpenAiIcon from './assets/client-icons/openai.svg?component';
import VsCodeIcon from './assets/client-icons/vscode.svg?component';

/**
 * Brand marks the decorative empty-state cards cycle through, interleaved so consecutive
 * marks read clearly different (coral wordmark, blue ribbon, purple blossom, near-black
 * cube, gradient spark, black blossom).
 */
export const MCP_CLIENT_LOGO_CYCLE: Component[] = [
	ClaudeIcon,
	VsCodeIcon,
	CodexIcon,
	CursorIcon,
	GeminiIcon,
	OpenAiIcon,
].map((icon) => markRaw(icon));

export type { McpClientId, McpSetupCategory } from '@n8n/frontend-utils/mcpClients';

export interface McpClientSetup extends SharedMcpClientSetup {
	/** Brand mark; null falls back to the neutral MCP icon. */
	icon: Component | null;
}

export interface McpClientCategoryGroup {
	id: McpSetupCategory;
	clients: McpClientSetup[];
}

const CLIENT_ICONS: Record<McpClientId, Component | null> = {
	'claude-code': ClaudeIcon,
	codex: CodexIcon,
	'gemini-cli': GeminiIcon,
	'claude-ai': ClaudeIcon,
	chatgpt: OpenAiIcon,
	'mistral-vibe': MistralIcon,
	antigravity: AntigravityIcon,
	cursor: CursorIcon,
	devin: DevinIcon,
	vscode: VsCodeIcon,
};

/** The shared catalog for the instance MCP (server name `n8n`), with the brand icons. */
export function getMcpClientCatalog(serverUrl: string): McpClientCategoryGroup[] {
	return getSharedMcpClientCatalog(serverUrl).map((group) => ({
		id: group.id,
		clients: group.clients.map((client) => ({ ...client, icon: CLIENT_ICONS[client.id] })),
	}));
}
