import type { IRunExecutionData, IPinData } from 'n8n-workflow';

import type { PinnedNodeItem } from '@/databases/entities/test-definition.ee';
import type { WorkflowEntity } from '@/databases/entities/workflow-entity';

/**
 * Extracts the execution data from the past execution
 * and creates a pin data object from it for the given workflow.
 * For now, it only pins trigger nodes.
 */
export function createPinData(
	workflow: WorkflowEntity,
	pinnedNodes: PinnedNodeItem[],
	executionData: IRunExecutionData,
) {
	// const triggerNodes = workflow.nodes.filter((node) => /trigger$/i.test(node.type));

	const pinData = {} as IPinData;

	for (const pinnedNode of pinnedNodes) {
		if (workflow.nodes.find((node) => node.name === pinnedNode.name)) {
			const nodeData = executionData.resultData.runData[pinnedNode.name];
			if (nodeData?.[0]?.data?.main?.[0]) {
				pinData[pinnedNode.name] = nodeData[0]?.data?.main?.[0];
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
