import type { EventMessageTypes as EventMessage } from '@/eventbus/EventMessageClasses';
import { EventMessageNode } from '@/eventbus/EventMessageClasses/EventMessageNode';
import { EventMessageWorkflow } from '@/eventbus/EventMessageClasses/EventMessageWorkflow';

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
				nodeName: 'When clicking "Test workflow"',
				nodeType: 'n8n-nodes-base.manualTrigger',
			},
		}),
		new EventMessageNode({
			eventName: 'n8n.node.finished',
			payload: {
				executionId,
				workflowName,
				nodeName: 'When clicking "Test workflow"',
				nodeType: 'n8n-nodes-base.manualTrigger',
			},
		}),
		new EventMessageNode({
			eventName: 'n8n.node.started',
			payload: {
				executionId,
				workflowName,
				nodeName: 'DebugHelper',
				nodeType: 'n8n-nodes-base.debugHelper',
			},
		}),
	];
};
