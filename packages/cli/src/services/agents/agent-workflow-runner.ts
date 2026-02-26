import {
	CHAT_TRIGGER_NODE_TYPE,
	FORM_TRIGGER_NODE_TYPE,
	WEBHOOK_NODE_TYPE,
	MANUAL_TRIGGER_NODE_TYPE,
	SCHEDULE_TRIGGER_NODE_TYPE,
	type INode,
	type IPinData,
	type WorkflowExecuteMode,
} from 'n8n-workflow';

export const SUPPORTED_TRIGGERS: Record<string, string> = {
	[MANUAL_TRIGGER_NODE_TYPE]: 'Manual Trigger',
	[WEBHOOK_NODE_TYPE]: 'Webhook Trigger',
	[CHAT_TRIGGER_NODE_TYPE]: 'Chat Trigger',
	[FORM_TRIGGER_NODE_TYPE]: 'Form Trigger',
	[SCHEDULE_TRIGGER_NODE_TYPE]: 'Schedule Trigger',
};

export function findSupportedTrigger(nodes: INode[]): INode | undefined {
	const supported = Object.keys(SUPPORTED_TRIGGERS);
	return nodes.find((node) => supported.includes(node.type) && !node.disabled);
}

export function getExecutionMode(node: INode): WorkflowExecuteMode {
	switch (node.type) {
		case WEBHOOK_NODE_TYPE:
			return 'webhook';
		case CHAT_TRIGGER_NODE_TYPE:
			return 'chat';
		case MANUAL_TRIGGER_NODE_TYPE:
			return 'manual';
		default:
			return 'trigger';
	}
}

export function buildPinData(node: INode, agentPrompt?: string): IPinData {
	switch (node.type) {
		case MANUAL_TRIGGER_NODE_TYPE:
			return {
				[node.name]: [
					{
						json: {
							triggeredByAgent: true,
							timestamp: new Date().toISOString(),
							...(agentPrompt ? { message: agentPrompt } : {}),
						},
					},
				],
			};
		case WEBHOOK_NODE_TYPE:
			return {
				[node.name]: [{ json: { headers: {}, query: {}, body: {} } }],
			};
		case CHAT_TRIGGER_NODE_TYPE:
			return {
				[node.name]: [
					{
						json: {
							sessionId: `agent-${Date.now()}`,
							action: 'sendMessage',
							chatInput: 'Triggered by agent',
						},
					},
				],
			};
		case FORM_TRIGGER_NODE_TYPE:
			return {
				[node.name]: [
					{
						json: {
							submittedAt: new Date().toISOString(),
							formMode: 'agent',
						},
					},
				],
			};
		case SCHEDULE_TRIGGER_NODE_TYPE:
			return {
				[node.name]: [
					{
						json: {
							timestamp: new Date().toISOString(),
							triggeredByAgent: true,
						},
					},
				],
			};
		default:
			return {};
	}
}
