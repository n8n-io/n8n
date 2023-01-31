import { eventEmitter } from 'n8n-core';
import { nodeFetchedData, workflowExecutionCompleted } from './WorkflowStatistics';

export function initEvents() {
	// Check for undefined as during testing these functions end up undefined for some reason
	if (nodeFetchedData) {
		eventEmitter.on(eventEmitter.types.nodeFetchedData, nodeFetchedData);
	}
	if (workflowExecutionCompleted) {
		eventEmitter.on(eventEmitter.types.workflowExecutionCompleted, workflowExecutionCompleted);
	}
}
