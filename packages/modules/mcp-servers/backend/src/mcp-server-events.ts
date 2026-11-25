import type { McpServerActionSource, McpServerToolKind } from '@n8n/api-types';
import '@n8n/backend-services';

/** Who did a builder action, and where: in the editor or in the n8n Assistant. */
export type McpServerActor = {
	userId: string;
	source: McpServerActionSource;
	threadId?: string;
};

export interface McpServerEventMap {
	'mcp-server-created': McpServerActor & { serverId: string; projectId: string };
	'mcp-server-deleted': McpServerActor & { serverId: string; projectId: string };
	'mcp-server-tool-added': McpServerActor & {
		serverId: string;
		toolKind: McpServerToolKind;
		/** True when the AI wrote the name and the description of the tool. */
		isAiDraft: boolean;
	};
	/** The first authorized request of a person with one AI client on a server. */
	'mcp-server-connected': { serverId: string; userId: string; clientName: string };
	'mcp-server-person-blocked': McpServerActor & { serverId: string; blockedUserId: string };
	'mcp-server-access-restored': McpServerActor & { serverId: string; restoredUserId: string };
	/** An AI client called a tool. `clientName` comes from the OAuth client registration. */
	'mcp-server-tool-called': {
		serverId: string;
		userId: string;
		clientName: string;
		toolKind: McpServerToolKind;
		status: 'success' | 'error';
		durationMs: number;
	};
}

declare module '@n8n/backend-services' {
	interface EventMap extends McpServerEventMap {}
}
