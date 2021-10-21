import Vue from 'vue';
import { parse } from 'flatted';

import { Method } from 'axios';
import {
	IActivationError,
	IExecutionsCurrentSummaryExtended,
	IExecutionDeleteFilter,
	IExecutionPushResponse,
	IExecutionResponse,
	IExecutionFlattedResponse,
	IExecutionsListResponse,
	IExecutionsStopData,
	IStartRunData,
	IWorkflowDb,
	IWorkflowShortResponse,
	IRestApi,
	IWorkflowDataUpdate,
} from '@/Interface';
import {
	IDataObject,
	INodeCredentials,
	INodeParameters,
	INodePropertyOptions,
	INodeTypeDescription,
	INodeTypeNameVersion,
} from 'n8n-workflow';
import { makeRestApiRequest } from '@/api/helpers';

/**
 * Unflattens the Execution data.
 *
 * @export
 * @param {IExecutionFlattedResponse} fullExecutionData The data to unflatten
 * @returns {IExecutionResponse}
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

export const restApi = Vue.extend({
	methods: {
		restApi (): IRestApi {
			const self = this;
			return {
				async makeRestApiRequest (method: Method, endpoint: string, data?: IDataObject): Promise<any> { // tslint:disable-line:no-any
					return makeRestApiRequest(self.$store.getters.getRestApiContext, method, endpoint, data);
				},
				getActiveWorkflows: (): Promise<string[]> => {
					return self.restApi().makeRestApiRequest('GET', `/active`);
				},
				getActivationError: (id: string): Promise<IActivationError | undefined> => {
					return self.restApi().makeRestApiRequest('GET', `/active/error/${id}`);
				},
				getCurrentExecutions: (filter: object): Promise<IExecutionsCurrentSummaryExtended[]> => {
					let sendData = {};
					if (filter) {
						sendData = {
							filter,
						};
					}
					return self.restApi().makeRestApiRequest('GET', `/executions-current`, sendData);
				},
				stopCurrentExecution: (executionId: string): Promise<IExecutionsStopData> => {
					return self.restApi().makeRestApiRequest('POST', `/executions-current/${executionId}/stop`);
				},

				// Returns all node-types
				getNodeTypes: (onlyLatest = false): Promise<INodeTypeDescription[]> => {
					return self.restApi().makeRestApiRequest('GET', `/node-types`, {onlyLatest});
				},

				getNodesInformation: (nodeInfos: INodeTypeNameVersion[]): Promise<INodeTypeDescription[]> => {
					return self.restApi().makeRestApiRequest('POST', `/node-types`, {nodeInfos});
				},

				// Returns all the parameter options from the server
				getNodeParameterOptions: (nodeTypeAndVersion: INodeTypeNameVersion, path: string, methodName: string, currentNodeParameters: INodeParameters, credentials?: INodeCredentials): Promise<INodePropertyOptions[]> => {
					const sendData = {
						nodeTypeAndVersion,
						path,
						methodName,
						credentials,
						currentNodeParameters,
					};
					return self.restApi().makeRestApiRequest('GET', '/node-parameter-options', sendData);
				},

				// Removes a test webhook
				removeTestWebhook: (workflowId: string): Promise<boolean> => {
					return self.restApi().makeRestApiRequest('DELETE', `/test-webhook/${workflowId}`);
				},

				// Execute a workflow
				runWorkflow: async (startRunData: IStartRunData): Promise<IExecutionPushResponse> => {
					return self.restApi().makeRestApiRequest('POST', `/workflows/run`, startRunData);
				},

				// Creates new credentials
				createNewWorkflow: (sendData: IWorkflowDataUpdate): Promise<IWorkflowDb> => {
					return self.restApi().makeRestApiRequest('POST', `/workflows`, sendData);
				},

				// Updates an existing workflow
				updateWorkflow: (id: string, data: IWorkflowDataUpdate): Promise<IWorkflowDb> => {
					return self.restApi().makeRestApiRequest('PATCH', `/workflows/${id}`, data);
				},

				// Deletes a workflow
				deleteWorkflow: (name: string): Promise<void> => {
					return self.restApi().makeRestApiRequest('DELETE', `/workflows/${name}`);
				},

				// Returns the workflow with the given name
				getWorkflow: (id: string): Promise<IWorkflowDb> => {
					return self.restApi().makeRestApiRequest('GET', `/workflows/${id}`);
				},

				// Returns all saved workflows
				getWorkflows: (filter?: object): Promise<IWorkflowShortResponse[]> => {
					let sendData;
					if (filter) {
						sendData = {
							filter,
						};
					}
					return self.restApi().makeRestApiRequest('GET', `/workflows`, sendData);
				},

				// Returns a workflow from a given URL
				getWorkflowFromUrl: (url: string): Promise<IWorkflowDb> => {
					return self.restApi().makeRestApiRequest('GET', `/workflows/from-url`, { url });
				},

				// Returns the execution with the given name
				getExecution: async (id: string): Promise<IExecutionResponse> => {
					const response = await self.restApi().makeRestApiRequest('GET', `/executions/${id}`);
					return unflattenExecutionData(response);
				},

				// Deletes executions
				deleteExecutions: (sendData: IExecutionDeleteFilter): Promise<void> => {
					return self.restApi().makeRestApiRequest('POST', `/executions/delete`, sendData);
				},

				// Returns the execution with the given name
				retryExecution: (id: string, loadWorkflow?: boolean): Promise<boolean> => {
					let sendData;
					if (loadWorkflow === true) {
						sendData = {
							loadWorkflow: true,
						};
					}
					return self.restApi().makeRestApiRequest('POST', `/executions/${id}/retry`, sendData);
				},

				// Returns all saved executions
				// TODO: For sure needs some kind of default filter like last day, with max 10 results, ...
				getPastExecutions: (filter: object, limit: number, lastId?: string | number, firstId?: string | number): Promise<IExecutionsListResponse> => {
					let sendData = {};
					if (filter) {
						sendData = {
							filter,
							firstId,
							lastId,
							limit,
						};
					}

					return self.restApi().makeRestApiRequest('GET', `/executions`, sendData);
				},

				// Returns all the available timezones
				getTimezones: (): Promise<IDataObject> => {
					return self.restApi().makeRestApiRequest('GET', `/options/timezones`);
				},
			};
		},
	},
});
