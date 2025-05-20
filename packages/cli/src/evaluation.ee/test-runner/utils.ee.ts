import assert from 'assert';
import type { IRunExecutionData, IPinData, IWorkflowBase } from 'n8n-workflow';

import { TestCaseExecutionError } from '@/evaluation.ee/test-runner/errors.ee';

// Entity representing a node in a workflow under test, for which data should be mocked during test execution
export type MockedNodeItem = {
	name?: string;
	id: string;
};

/**
 * Extracts the execution data from the past execution
 * and creates a pin data object from it for the given workflow.
 * It uses a list of mocked nodes defined in a test definition
 * to decide which nodes to pin.
 */
export function createPinData(
	workflow: IWorkflowBase,
	mockedNodes: MockedNodeItem[],
	executionData: IRunExecutionData,
	pastWorkflowData?: IWorkflowBase,
) {
	const pinData = {} as IPinData;

	const workflowNodeIds = new Map(workflow.nodes.map((node) => [node.id, node.name]));

	// If the past workflow data is provided, use it to create a map between node IDs and node names
	const pastWorkflowNodeIds = new Map<string, string>();
	if (pastWorkflowData) {
		for (const node of pastWorkflowData.nodes) {
			pastWorkflowNodeIds.set(node.id, node.name);
		}
	}

	for (const mockedNode of mockedNodes) {
		assert(mockedNode.id, 'Mocked node ID is missing');

		const nodeName = workflowNodeIds.get(mockedNode.id);

		// If mocked node is still present in the workflow
		if (nodeName) {
			// Try to restore node name from past execution data (it might have been renamed between past execution and up-to-date workflow)
			const pastNodeName = pastWorkflowNodeIds.get(mockedNode.id) ?? nodeName;
			const nodeData = executionData.resultData.runData[pastNodeName];

			if (nodeData?.[0]?.data?.main?.[0]) {
				pinData[nodeName] = nodeData[0]?.data?.main?.[0];
			} else {
				throw new TestCaseExecutionError('MOCKED_NODE_NOT_FOUND');
			}
		}
	}

	return pinData;
}

/**
 * Returns the trigger node of the past execution.
 * The trigger node is the node that has no source and has run data.
 */
export function getPastExecutionTriggerNode(executionData: IRunExecutionData) {
	return Object.keys(executionData.resultData.runData).find((nodeName) => {
		const data = executionData.resultData.runData[nodeName];
		return !data[0].source || data[0].source.length === 0 || data[0].source[0] === null;
	});
}
