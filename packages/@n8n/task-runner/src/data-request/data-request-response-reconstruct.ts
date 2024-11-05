import type { IExecuteData, INodeExecutionData } from 'n8n-workflow';

import type { DataRequestResponse } from '@/runner-types';

/**
 * Reconstructs data from a DataRequestResponse to the initial
 * data structures.
 */
export class DataRequestResponseReconstruct {
	/**
	 * Reconstructs `connectionInputData` from a DataRequestResponse
	 */
	reconstructConnectionInputData(
		inputData: DataRequestResponse['inputData'],
	): INodeExecutionData[] {
		if (!inputData?.main) {
			return [];
		}

		return inputData.main[0] ?? [];
	}

	/**
	 * Reconstruct `executeData` from a DataRequestResponse
	 */
	reconstructExecuteData(response: DataRequestResponse): IExecuteData | undefined {
		return {
			data: response.inputData,
			node: response.node,
			source: response.connectionInputSource,
		};
	}
}
