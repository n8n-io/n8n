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
	INodeTranslationHeaders,
} from '@/Interface';
import {
	IDataObject,
	ILoadOptions,
	INodeCredentials,
	INodeParameters,
	INodePropertyOptions,
	INodeTypeDescription,
	INodeTypeNameVersion,
} from 'n8n-workflow';
import { makeRestApiRequest } from '@/utils';
import { mapStores } from 'pinia';
import { useRootStore } from '@/stores/n8nRootStore';

/**
 * Unflattens the Execution data.
 *
 * @param {IExecutionFlattedResponse} fullExecutionData The data to unflatten
 */
function unflattenExecutionData(fullExecutionData: IExecutionFlattedResponse): IExecutionResponse {
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
	computed: {
		...mapStores(useRootStore),
	},
	methods: {
		restApi(): IRestApi {
			const self = this;
			return {
				async makeRestApiRequest(
					method: Method,
					endpoint: string,
					data?: IDataObject,
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
				): Promise<any> {
					return makeRestApiRequest(self.rootStore.getRestApiContext, method, endpoint, data);
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
					return self
						.restApi()
						.makeRestApiRequest('POST', `/executions-current/${executionId}/stop`);
				},

				getCredentialTranslation: (credentialType): Promise<object> => {
					return self
						.restApi()
						.makeRestApiRequest('GET', '/credential-translation', { credentialType });
				},

				// Removes a test webhook
				removeTestWebhook: (workflowId: string): Promise<boolean> => {
					return self.restApi().makeRestApiRequest('DELETE', `/test-webhook/${workflowId}`);
				},

				// Execute a workflow
				runWorkflow: async (startRunData: IStartRunData): Promise<IExecutionPushResponse> => {
					return self.restApi().makeRestApiRequest('POST', `/workflows/run`, startRunData);
				},

				// Creates a new workflow
				createNewWorkflow: (sendData: IWorkflowDataUpdate): Promise<IWorkflowDb> => {
					return self.restApi().makeRestApiRequest('POST', `/workflows`, sendData);
				},

				// Updates an existing workflow
				updateWorkflow: (
					id: string,
					data: IWorkflowDataUpdate,
					forceSave = false,
				): Promise<IWorkflowDb> => {
					return self
						.restApi()
						.makeRestApiRequest(
							'PATCH',
							`/workflows/${id}${forceSave ? '?forceSave=true' : ''}`,
							data,
						);
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
				getExecution: async (id: string): Promise<IExecutionResponse | undefined> => {
					const response = await self.restApi().makeRestApiRequest('GET', `/executions/${id}`);
					return response && unflattenExecutionData(response);
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
				getPastExecutions: (
					filter: object,
					limit: number,
					lastId?: string | number,
					firstId?: string | number,
				): Promise<IExecutionsListResponse> => {
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

				// Binary data
				getBinaryBufferString: (dataPath: string): Promise<string> => {
					return self.restApi().makeRestApiRequest('GET', `/data/${dataPath}`);
				},

				getBinaryUrl: (dataPath: string): string => {
					return self.rootStore.getRestApiContext.baseUrl + `/data/${dataPath}`;
				},
			};
		},
	},
});
