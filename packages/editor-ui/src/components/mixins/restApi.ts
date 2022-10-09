import Vue from 'vue';
import { parse } from 'flatted';

import { Method } from 'axios';
import {
	IActivationError,
	IExecutionsCurrentSummaryExtended,
	IExecutionPushResponse,
	IExecutionsStopData,
	IStartRunData,
	IWorkflowDb,
	IWorkflowShortResponse,
	IRestApi,
	IWorkflowDataUpdate,
} from '@/Interface';
import {
	IDataObject,
} from 'n8n-workflow';
import { makeRestApiRequest } from '@/api/helpers';

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

				getCredentialTranslation: (credentialType): Promise<object> => {
					return self.restApi().makeRestApiRequest('GET', '/credential-translation', { credentialType });
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

				// Returns all the available timezones
				getTimezones: (): Promise<IDataObject> => {
					return self.restApi().makeRestApiRequest('GET', `/options/timezones`);
				},

				// Binary data
				getBinaryBufferString: (dataPath: string): Promise<string> => {
					return self.restApi().makeRestApiRequest('GET', `/data/${dataPath}`);
				},
			};
		},
	},
});
