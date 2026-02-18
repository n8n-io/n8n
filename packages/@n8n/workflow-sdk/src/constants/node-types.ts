/**
 * Node type constants for n8n nodes.
 * These constants replace magic strings throughout the codebase.
 */
export const NODE_TYPES = {
	IF: 'n8n-nodes-base.if',
	SWITCH: 'n8n-nodes-base.switch',
	MERGE: 'n8n-nodes-base.merge',
	STICKY_NOTE: 'n8n-nodes-base.stickyNote',
	SPLIT_IN_BATCHES: 'n8n-nodes-base.splitInBatches',
	HTTP_REQUEST: 'n8n-nodes-base.httpRequest',
	WEBHOOK: 'n8n-nodes-base.webhook',
	DATA_TABLE: 'n8n-nodes-base.dataTable',
} as const;

/**
 * Type for the NODE_TYPES constant values
 */
export type NodeTypeValue = (typeof NODE_TYPES)[keyof typeof NODE_TYPES];

/**
 * Check if a type string is the IF node type
 */
export function isIfNodeType(type: string): type is typeof NODE_TYPES.IF {
	return type === NODE_TYPES.IF;
}

/**
 * Check if a type string is the Switch node type
 */
export function isSwitchNodeType(type: string): type is typeof NODE_TYPES.SWITCH {
	return type === NODE_TYPES.SWITCH;
}

/**
 * Check if a type string is the Merge node type
 */
export function isMergeNodeType(type: string): type is typeof NODE_TYPES.MERGE {
	return type === NODE_TYPES.MERGE;
}

/**
 * Check if a type string is the Sticky Note node type
 */
export function isStickyNoteType(type: string): type is typeof NODE_TYPES.STICKY_NOTE {
	return type === NODE_TYPES.STICKY_NOTE;
}

/**
 * Check if a type string is the Split In Batches node type
 */
export function isSplitInBatchesType(type: string): type is typeof NODE_TYPES.SPLIT_IN_BATCHES {
	return type === NODE_TYPES.SPLIT_IN_BATCHES;
}

/**
 * Check if a type string is the HTTP Request node type
 */
export function isHttpRequestType(type: string): type is typeof NODE_TYPES.HTTP_REQUEST {
	return type === NODE_TYPES.HTTP_REQUEST;
}

/**
 * Check if a type string is the Webhook node type
 */
export function isWebhookType(type: string): type is typeof NODE_TYPES.WEBHOOK {
	return type === NODE_TYPES.WEBHOOK;
}

/**
 * Check if a type string is the Data Table node type
 */
export function isDataTableType(type: string): type is typeof NODE_TYPES.DATA_TABLE {
	return type === NODE_TYPES.DATA_TABLE;
}
