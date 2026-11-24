import type { McpServerActionSource } from '@n8n/api-types';
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
}

declare module '@n8n/backend-services' {
	interface EventMap extends McpServerEventMap {}
}
