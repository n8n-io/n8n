'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.setupMessages = void 0;
const event_message_node_1 = require('@/eventbus/event-message-classes/event-message-node');
const event_message_workflow_1 = require('@/eventbus/event-message-classes/event-message-workflow');
const setupMessages = (executionId, workflowName) => {
	return [
		new event_message_workflow_1.EventMessageWorkflow({
			eventName: 'n8n.workflow.started',
			payload: { executionId },
		}),
		new event_message_node_1.EventMessageNode({
			eventName: 'n8n.node.started',
			payload: {
				executionId,
				workflowName,
				nodeName: 'When clicking "Execute workflow"',
				nodeType: 'n8n-nodes-base.manualTrigger',
				nodeId: '123',
			},
		}),
		new event_message_node_1.EventMessageNode({
			eventName: 'n8n.node.finished',
			payload: {
				executionId,
				workflowName,
				nodeName: 'When clicking "Execute workflow"',
				nodeType: 'n8n-nodes-base.manualTrigger',
				nodeId: '123',
			},
		}),
		new event_message_node_1.EventMessageNode({
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
exports.setupMessages = setupMessages;
//# sourceMappingURL=utils.js.map
