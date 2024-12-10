import type { IRunExecutionData, IPinData } from 'n8n-workflow';

import type { WorkflowEntity } from '@/databases/entities/workflow-entity';

/**
 * Extracts the execution data from the past execution
 * and creates a pin data object from it for the given workflow.
 * For now, it only pins trigger nodes.
 */
export function createPinData(workflow: WorkflowEntity, executionData: IRunExecutionData) {
	const triggerNodes = workflow.nodes.filter((node) => /trigger$/i.test(node.type));

	const pinData = {} as IPinData;

	for (const triggerNode of triggerNodes) {
		const triggerData = executionData.resultData.runData[triggerNode.name];
		if (triggerData?.[0]?.data?.main?.[0]) {
			pinData[triggerNode.name] = triggerData[0]?.data?.main?.[0];
		}
	}

	return pinData;
}

/**
 * Returns the start node of the past execution.
 * The start node is the node that has no source and has run data.
 */
export function getPastExecutionTriggerNode(executionData: IRunExecutionData) {
	return Object.keys(executionData.resultData.runData).find((nodeName) => {
		const data = executionData.resultData.runData[nodeName];
		return !data[0].source || data[0].source.length === 0 || data[0].source[0] === null;
	});
}
