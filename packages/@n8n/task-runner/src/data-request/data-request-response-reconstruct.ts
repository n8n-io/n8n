import type { IExecuteData, INodeExecutionData, ITaskDataConnections } from 'n8n-workflow';

import type { DataRequestResponse, InputDataChunkDefinition } from '@/runner-types';

/**
 * Reconstructs data from a DataRequestResponse to the initial
 * data structures.
 */
export class DataRequestResponseReconstruct {
	/**
	 * Reconstructs `inputData` from a DataRequestResponse
	 */
	reconstructConnectionInputItems(
		inputData: DataRequestResponse['inputData'],
		chunk?: InputDataChunkDefinition,
	): Array<INodeExecutionData | undefined> {
		const inputItems = inputData?.main?.[0] ?? [];
		if (!chunk) {
			return inputItems;
		}

		// Only a chunk of the input items was requested (the sender slices the data down to
		// the chunk). We reconstruct the array by prefixing the chunk with `undefined` for the
		// items before `startIndex`, so the chunk items land at their original indices —
		// WorkflowDataProxy addresses items by position. Items after the chunk are never
		// iterated, and the original total length isn't recoverable from the chunk, so we
		// don't pad the tail.
		let sparseInputItems: Array<INodeExecutionData | undefined> = [];

		sparseInputItems = sparseInputItems
			.concat(Array.from({ length: chunk.startIndex }))
			.concat(inputItems);

		return sparseInputItems;
	}

	/**
	 * Reconstruct `executeData` from a DataRequestResponse
	 */
	reconstructExecuteData(
		response: DataRequestResponse,
		inputItems: INodeExecutionData[],
	): IExecuteData {
		const inputData: ITaskDataConnections = {
			...response.inputData,
			main: [inputItems],
		};

		return {
			data: inputData,
			node: response.node,
			source: response.connectionInputSource,
		};
	}
}
