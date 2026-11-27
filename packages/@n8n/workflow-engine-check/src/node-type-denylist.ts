import type { EngineV2Reason } from './types';

export interface NodeTypeDenylistEntry {
	/** A full node type, or a package prefix ending in `.` */
	type: string;
	code: EngineV2Reason['code'];
	/** The Linear ticket that removes this entry. */
	ticket: `${string}-${number}`;
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
	{ type: '@n8n/n8n-nodes-langchain.mcpTrigger', code: 'MCP_SERVER_TRIGGER', ticket: 'CET-781' },
	{
		type: '@n8n/n8n-nodes-langchain.microsoftAgent365Trigger',
		code: 'MICROSOFT_AGENT365_TRIGGER',
		ticket: 'CET-787',
	},
	{ type: 'n8n-nodes-base.executionData', code: 'EXECUTION_DATA_NODE', ticket: 'CET-782' },
	{ type: 'n8n-nodes-base.timeSaved', code: 'TIME_SAVED_NODE', ticket: 'CET-782' },
	{ type: 'n8n-nodes-base.messageAnAgent', code: 'MESSAGE_AN_AGENT_NODE', ticket: 'CET-783' },
	{ type: 'n8n-nodes-base.evaluation', code: 'EVALUATION_NODE', ticket: 'CET-784' },
	{ type: 'n8n-nodes-base.evaluationTrigger', code: 'EVALUATION_NODE', ticket: 'CET-784' },
	// These triggers can wait for their run to finish before they take the next message,
	// and engine v2 refuses that (`EngineV2ActiveTriggers` in cli). Their settings decide
	// whether they wait, but the check blocks them in every mode for now:
	// - Kafka: v1.1 waits without Parallel Processing. v1.3 and v2 wait unless Resolve
	//   Offset is Immediately. v1 and v1.2 never wait.
	// - RabbitMQ: waits when Delete From Queue When is not Immediately, or when a Parallel
	//   Message Processing Limit is set.
	// - AMQP: waits with Parallel Processing off.
	// - MQTT: waits unless Parallel Processing is on.
	{ type: 'n8n-nodes-base.kafkaTrigger', code: 'TRIGGER_WAITS_FOR_RUN', ticket: 'CET-299' },
	{ type: 'n8n-nodes-base.rabbitmqTrigger', code: 'TRIGGER_WAITS_FOR_RUN', ticket: 'CET-299' },
	{ type: 'n8n-nodes-base.amqpTrigger', code: 'TRIGGER_WAITS_FOR_RUN', ticket: 'CET-299' },
	{ type: 'n8n-nodes-base.mqttTrigger', code: 'TRIGGER_WAITS_FOR_RUN', ticket: 'CET-299' },
	{ type: '@n8n/n8n-nodes-langchain.', code: 'AI_NODE', ticket: 'CET-780' },
];
