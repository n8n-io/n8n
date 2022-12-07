import { eventEmitter } from 'n8n-core';
import { nodeFetchedData } from './WorkflowStatistics';

// Check for undefined as during testing these functions end up undefined for some reason
if (nodeFetchedData) {
	eventEmitter.on(eventEmitter.types.nodeFetchedData, nodeFetchedData);
}
// TODO: Fix upsert issue and re-enable
// if (workflowExecutionCompleted)
// 	eventEmitter.on(eventEmitter.types.workflowExecutionCompleted, workflowExecutionCompleted);
