import type { EngineV2Reason } from './types';

export interface NodeTypeDenylistEntry {
	/** A full node type, or a package prefix ending in `.` */
	type: string;
	code: EngineV2Reason['code'];
	/** The Linear ticket that removes this entry. `null` when nobody has filed one yet. */
	ticket: `${string}-${number}` | null;
}

/**
 * Node types that engine v2 does not run yet. The first matching entry wins,
 * so exact types come before the package prefix that also matches them.
 * Remove an entry in the PR that makes engine v2 run the node.
 */
export const NODE_TYPE_DENYLIST: readonly NodeTypeDenylistEntry[] = [
	{ type: 'n8n-nodes-base.form', code: 'FORM_NODE', ticket: 'CET-331' },
	{ type: 'n8n-nodes-base.formTrigger', code: 'FORM_NODE', ticket: 'CET-331' },
	{ type: '@n8n/n8n-nodes-langchain.chat', code: 'CHAT_NODE', ticket: 'CET-522' },
	{ type: '@n8n/n8n-nodes-langchain.chatTrigger', code: 'CHAT_NODE', ticket: 'CET-291' },
	{ type: '@n8n/n8n-nodes-langchain.mcpTrigger', code: 'MCP_SERVER_TRIGGER', ticket: null },
	{
		type: '@n8n/n8n-nodes-langchain.microsoftAgent365Trigger',
		code: 'MICROSOFT_AGENT365_TRIGGER',
		ticket: null,
	},
	{ type: 'n8n-nodes-base.executionData', code: 'EXECUTION_DATA_NODE', ticket: null },
	{ type: 'n8n-nodes-base.timeSaved', code: 'TIME_SAVED_NODE', ticket: null },
	{ type: 'n8n-nodes-base.messageAnAgent', code: 'MESSAGE_AN_AGENT_NODE', ticket: null },
	{ type: 'n8n-nodes-base.evaluation', code: 'EVALUATION_NODE', ticket: null },
	{ type: 'n8n-nodes-base.evaluationTrigger', code: 'EVALUATION_NODE', ticket: null },
	{ type: '@n8n/n8n-nodes-langchain.', code: 'AI_NODE', ticket: 'CET-291' },
];
