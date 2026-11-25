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
	/** An AI client called a tool. `clientName` comes from the OAuth client registration. */
	'mcp-server-tool-called': {
		serverId: string;
		userId: string;
		clientName: string;
		toolKind: McpServerToolKind;
		status: 'success' | 'error';
		durationMs: number;
	};
	/** A load of the share page. `userId` is absent for a person who is not signed in. */
	'mcp-server-share-viewed': {
		serverId?: string;
		userId?: string;
		canConnect: boolean;
		result: 'found' | 'not_found';
	};
}

declare module '@n8n/backend-services' {
	interface EventMap extends McpServerEventMap {}
}
