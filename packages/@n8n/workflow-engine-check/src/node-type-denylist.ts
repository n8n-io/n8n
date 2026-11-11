import type { EngineV2Reason } from './types';

export interface NodeTypeDenylistEntry {
	/** A full node type, or a package prefix ending in `.` */
	type: string;
	/** Matches only from this type version on. */
	minTypeVersion?: number;
	code: EngineV2Reason['code'];
	severity: EngineV2Reason['severity'];
	/** The ticket that removes this entry. `null` when nobody has filed one yet. */
	ticket: `CET-${number}` | null;
}

/**
 * Node types that engine v2 does not run yet. The first matching entry wins,
 * so exact types come before the package prefix that also matches them.
 * Remove an entry in the PR that makes engine v2 run the node.
 */
export const NODE_TYPE_DENYLIST: readonly NodeTypeDenylistEntry[] = [
	{ type: 'n8n-nodes-base.form', code: 'FORM_NODE', severity: 'blocking', ticket: 'CET-331' },
	{
		type: 'n8n-nodes-base.formTrigger',
		code: 'FORM_NODE',
		severity: 'blocking',
		ticket: 'CET-331',
	},
	{
		type: '@n8n/n8n-nodes-langchain.chat',
		code: 'CHAT_NODE',
		severity: 'blocking',
		ticket: 'CET-522',
	},
	{
		type: '@n8n/n8n-nodes-langchain.chatTrigger',
		code: 'CHAT_NODE',
		severity: 'blocking',
		ticket: 'CET-291',
	},
	{
		type: '@n8n/n8n-nodes-langchain.mcpTrigger',
		code: 'MCP_SERVER_TRIGGER',
		severity: 'blocking',
		ticket: null,
	},
	{
		type: '@n8n/n8n-nodes-langchain.microsoftAgent365Trigger',
		code: 'MICROSOFT_AGENT365_TRIGGER',
		severity: 'blocking',
		ticket: null,
	},
	{
		type: 'n8n-nodes-base.executionData',
		code: 'EXECUTION_DATA_NODE',
		severity: 'blocking',
		ticket: null,
	},
	{ type: 'n8n-nodes-base.timeSaved', code: 'TIME_SAVED_NODE', severity: 'blocking', ticket: null },
	{
		type: 'n8n-nodes-base.messageAnAgent',
		code: 'MESSAGE_AN_AGENT_NODE',
		severity: 'blocking',
		ticket: null,
	},
	{
		type: 'n8n-nodes-base.evaluation',
		code: 'EVALUATION_NODE',
		severity: 'blocking',
		ticket: null,
	},
	{
		type: 'n8n-nodes-base.evaluationTrigger',
		code: 'EVALUATION_NODE',
		severity: 'blocking',
		ticket: null,
	},
	// Engine v2 refuses these only when the trigger waits for its run, which depends on the
	// node's settings. A warning avoids blocking a trigger that hands off without waiting.
	{
		type: 'n8n-nodes-base.kafkaTrigger',
		minTypeVersion: 2,
		code: 'TRIGGER_WAITS_FOR_RUN',
		severity: 'warning',
		ticket: 'CET-299',
	},
	{
		type: 'n8n-nodes-base.rabbitmqTrigger',
		code: 'TRIGGER_WAITS_FOR_RUN',
		severity: 'warning',
		ticket: 'CET-299',
	},
	{
		type: 'n8n-nodes-base.amqpTrigger',
		code: 'TRIGGER_WAITS_FOR_RUN',
		severity: 'warning',
		ticket: 'CET-299',
	},
	{
		type: 'n8n-nodes-base.mqttTrigger',
		code: 'TRIGGER_WAITS_FOR_RUN',
		severity: 'warning',
		ticket: 'CET-299',
	},
	{
		type: 'n8n-nodes-base.emailReadImap',
		code: 'TRIGGER_WAITS_FOR_RUN',
		severity: 'warning',
		ticket: 'CET-299',
	},
	{ type: '@n8n/n8n-nodes-langchain.', code: 'AI_NODE', severity: 'blocking', ticket: 'CET-291' },
];
