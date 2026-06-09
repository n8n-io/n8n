import type { EventMessageTypes as EventMessage } from '@/eventbus/event-message-classes/index.js';
import { EventMessageNode } from '@/eventbus/event-message-classes/event-message-node.js';
import { EventMessageWorkflow } from '@/eventbus/event-message-classes/event-message-workflow.js';

export const setupMessages = (executionId: string, workflowName: string): EventMessage[] => {
	return [
		new EventMessageWorkflow({
			eventName: 'n8n.workflow.started',
			payload: { executionId },
		}),
		new EventMessageNode({
			eventName: 'n8n.node.started',
			payload: {
				executionId,
				workflowName,
				nodeName: 'When clicking "Execute workflow"',
				nodeType: 'n8n-nodes-base.manualTrigger',
				nodeId: '123',
			},
		}),
		new EventMessageNode({
			eventName: 'n8n.node.finished',
			payload: {
				executionId,
				workflowName,
				nodeName: 'When clicking "Execute workflow"',
				nodeType: 'n8n-nodes-base.manualTrigger',
				nodeId: '123',
			},
		}),
		new EventMessageNode({
			eventName: 'n8n.node.started',
			payload: {
				executionId,
				workflowName,
				nodeName: 'DebugHelper',
				nodeType: 'n8n-nodes-base.debugHelper',
				nodeId: '123',
			},
		}),
	];
};
