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
}

declare module '@n8n/backend-services' {
	interface EventMap extends McpServerEventMap {}
}
