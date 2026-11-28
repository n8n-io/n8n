import type {
	McpServerActionSource,
	McpServerToolDraftField,
	McpServerToolKind,
} from '@n8n/api-types';
import '@n8n/backend-services';

/** Who did a builder action, and where: in the editor or in the n8n Assistant. */
export type McpServerActor = {
	userId: string;
	source: McpServerActionSource;
	threadId?: string;
};

/** The result of one draft call. */
export type McpServerToolDraftStatus =
	| 'drafted'
	| 'invalid_answer'
	| 'model_failed'
	| 'no_credits'
	| 'not_available';

export interface McpServerEventMap {
	'mcp-server-created': McpServerActor & { serverId: string; projectId: string };
	'mcp-server-deleted': McpServerActor & { serverId: string; projectId: string };
	'mcp-server-tool-added': McpServerActor & {
		serverId: string;
		toolKind: McpServerToolKind;
	};
	'mcp-server-tool-drafted': McpServerActor & {
		serverId: string;
		/** `both` for the draft after an add. One field for a "Generate" click. */
		field: McpServerToolDraftField | 'both';
		status: McpServerToolDraftStatus;
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
