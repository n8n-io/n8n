/**
 * Workflow helper functions for trigger-service
 * TODO(CLEANUP): Consider extracting these to a shared package if other services need them
 */

import type { ITaskData, IRun, RelatedExecution } from 'n8n-workflow';

/**
 * Returns the data of the last executed node
 */
export function getDataLastExecutedNodeData(inputData: IRun): ITaskData | undefined {
	const { runData, pinData = {} } = inputData.data.resultData;
	const { lastNodeExecuted } = inputData.data.resultData;

	if (lastNodeExecuted === undefined) {
		return undefined;
	}

	if (runData[lastNodeExecuted] === undefined) {
		return undefined;
	}

	const lastNodeRunData = runData[lastNodeExecuted][runData[lastNodeExecuted].length - 1];

	let lastNodePinData = pinData[lastNodeExecuted];

	if (lastNodePinData && inputData.mode === 'manual') {
		if (!Array.isArray(lastNodePinData)) lastNodePinData = [lastNodePinData];

		const itemsPerRun = lastNodePinData.map((item, index) => {
			return { json: item, pairedItem: { item: index } };
		});

		return {
			startTime: 0,
			executionIndex: 0,
			executionTime: 0,
			data: { main: [itemsPerRun] },
			source: lastNodeRunData.source,
		};
	}

	return lastNodeRunData;
}

export function shouldRestartParentExecution(
	parentExecution: RelatedExecution | undefined,
): parentExecution is RelatedExecution {
	if (parentExecution === undefined) {
		return false;
	}
	if (parentExecution.shouldResume === undefined) {
		return true; // Preserve existing behavior for executions started before the flag was introduced for backward compatibility.
	}
	return parentExecution.shouldResume;
}
