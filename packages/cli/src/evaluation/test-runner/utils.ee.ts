import type { IRunExecutionData, IPinData } from 'n8n-workflow';

import type { MockedNodeItem } from '@/databases/entities/test-definition.ee';
import type { WorkflowEntity } from '@/databases/entities/workflow-entity';

/**
 * Extracts the execution data from the past execution
 * and creates a pin data object from it for the given workflow.
 * It uses a list of mocked nodes defined in a test definition
 * to decide which nodes to pin.
 */
export function createPinData(
	workflow: WorkflowEntity,
	mockedNodes: MockedNodeItem[],
	executionData: IRunExecutionData,
) {
	const pinData = {} as IPinData;

	const workflowNodeNames = new Set(workflow.nodes.map((node) => node.name));

	for (const mockedNode of mockedNodes) {
		if (workflowNodeNames.has(mockedNode.name)) {
			const nodeData = executionData.resultData.runData[mockedNode.name];
			if (nodeData?.[0]?.data?.main?.[0]) {
				pinData[mockedNode.name] = nodeData[0]?.data?.main?.[0];
			}
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
