import type { McpServerActionSource, McpServerToolKind } from '@n8n/api-types';
import '@n8n/backend-services';

/** A builder action from the editor or the n8n Assistant. */
export type McpServerBuilderActor = {
	userId: string;
	source: McpServerActionSource;
	threadId?: string;
};

export interface McpServerEventMap {
	'mcp-server-tool-added': McpServerBuilderActor & {
		serverId: string;
		toolKind: McpServerToolKind;
		/** True when the AI wrote the name and the description of the tool. */
		isAiDraft: boolean;
	};
}

declare module '@n8n/backend-services' {
	interface EventMap extends McpServerEventMap {}
}
