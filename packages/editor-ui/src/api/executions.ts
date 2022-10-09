import {
	IRestApiContext,
	IExecutionsCurrentSummaryExtended,
	IExecutionResponse,
	IWorkflowDb,
	IExecutionFlattedResponse,
	IExecutionDeleteFilter,
	IExecutionsListResponse,
	IExecutionsStopData,
} from '@/Interface';
import { makeRestApiRequest } from './helpers';
import { parse } from 'flatted';
/**
 * Unflattens the Execution data.
 *
 * @param {IExecutionFlattedResponse} fullExecutionData The data to unflatten
 */
function unflattenExecutionData (fullExecutionData: IExecutionFlattedResponse): IExecutionResponse {
	// Unflatten the data
	const returnData: IExecutionResponse = {
		...fullExecutionData,
		workflowData: fullExecutionData.workflowData as IWorkflowDb,
		data: parse(fullExecutionData.data),
	};

	returnData.finished = returnData.finished ? returnData.finished : false;

	if (fullExecutionData.id) {
		returnData.id = fullExecutionData.id;
	}

	return returnData;
}

export function getCurrentExecutions(
	context: IRestApiContext,
	filter: object,
): Promise<IExecutionsCurrentSummaryExtended[]> {
	let sendData = {};
	if (filter) {
		sendData = {
			filter,
		};
	}
	return makeRestApiRequest(context, 'GET', `/executions-current`, sendData);
}

export function stopCurrentExecution(
	context: IRestApiContext,
	executionId: string,
): Promise<IExecutionsStopData> {
	return makeRestApiRequest(context, 'POST', `/executions-current/${executionId}/stop`);
}

// Returns the execution with the given name
export async function getExecution(context: IRestApiContext, id: string): Promise<IExecutionResponse> {
	const response = await makeRestApiRequest(context, 'GET', `/executions/${id}`);
	return unflattenExecutionData(response);
}

// Deletes executions
export function deleteExecutions(context: IRestApiContext, filter: IExecutionDeleteFilter): Promise<void> {
	return makeRestApiRequest(context, 'POST', `/executions/delete`, {...filter});
}

// Retries the execution with the given name
export function retryExecution(context: IRestApiContext, id: string, loadWorkflow?: boolean): Promise<boolean> {
	let sendData;
	if (loadWorkflow === true) {
		sendData = {
			loadWorkflow: true,
		};
	}
	return makeRestApiRequest(context, 'POST', `/executions/${id}/retry`, sendData);
}

// Returns all saved executions
// TODO: For sure needs some kind of default filter like last day, with max 10 results, ...
export function getPastExecutions(
	context: IRestApiContext,
	filter: object,
	limit: number,
	lastId?: string | number,
	firstId?: string | number,
): Promise<IExecutionsListResponse> {
	let sendData = {};
	if (filter) {
		sendData = {
			filter,
			firstId,
			lastId,
			limit,
		};
	}

	return makeRestApiRequest(context, 'GET', `/executions`, sendData);
}
