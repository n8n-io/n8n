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
		return inputData?.main?.[0] ?? [];
	}

	/**
	 * Reconstruct `executeData` from a DataRequestResponse
	 */
	reconstructExecuteData(response: DataRequestResponse): IExecuteData {
		return {
			data: response.inputData,
			node: response.node,
			source: response.connectionInputSource,
		};
	}
}
