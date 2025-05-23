import { parse } from 'flatted';

/**
 * Unflattens the Execution data.
 *
 * @param {IExecutionFlattedResponse} fullExecutionData The data to unflatten
 */
export function unflattenExecutionData(fullExecutionData: IExecutionFlattedResponse) {
	// Unflatten the data
	const returnData: IExecutionResponse = {
		...fullExecutionData,
		workflowData: fullExecutionData.workflowData,
		data: parse(fullExecutionData.data),
	};

	returnData.finished = returnData.finished ? returnData.finished : false;

	if (fullExecutionData.id) {
		returnData.id = fullExecutionData.id;
	}

	return returnData;
}
