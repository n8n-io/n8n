import Vue from 'vue';
import { parse } from 'flatted';

import axios, { AxiosRequestConfig, Method } from 'axios';
import {
	IActivationError,
	ICredentialsDecryptedResponse,
	ICredentialsResponse,
	IExecutionsCurrentSummaryExtended,
	IExecutionDeleteFilter,
	IExecutionPushResponse,
	IExecutionResponse,
	IExecutionFlattedResponse,
	IExecutionsListResponse,
	IExecutionsStopData,
	IN8nUISettings,
	IStartRunData,
	IWorkflowDb,
	IWorkflowShortResponse,
	IRestApi,
	IWorkflowData,
	IWorkflowDataUpdate,
} from '@/Interface';
import {
	ICredentialsDecrypted,
	ICredentialType,
	IDataObject,
	INodeCredentials,
	INodeParameters,
	INodePropertyOptions,
	INodeTypeDescription,
} from 'n8n-workflow';

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

export class ResponseError extends Error {
	// The HTTP status code of response
	httpStatusCode?: number;

	// The error code in the resonse
	errorCode?: number;

	// The stack trace of the server
	serverStackTrace?: string;

	/**
	 * Creates an instance of ResponseError.
	 * @param {string} message The error message
	 * @param {number} [errorCode] The error code which can be used by frontend to identify the actual error
	 * @param {number} [httpStatusCode] The HTTP status code the response should have
	 * @param {string} [stack] The stack trace
	 * @memberof ResponseError
	 */
	constructor (message: string, errorCode?: number, httpStatusCode?: number, stack?: string) {
		super(message);
		this.name = 'ResponseError';

		if (errorCode) {
			this.errorCode = errorCode;
		}
		if (httpStatusCode) {
			this.httpStatusCode = httpStatusCode;
		}
		if (stack) {
			this.serverStackTrace = stack;
		}
	}
}

export const restApi = Vue.extend({
	methods: {
		restApi (): IRestApi {
			const self = this;
			return {
				async makeRestApiRequest (method: Method, endpoint: string, data?: IDataObject): Promise<any> { // tslint:disable-line:no-any
					try {
						const options: AxiosRequestConfig = {
							method,
							url: endpoint,
							baseURL: self.$store.getters.getRestUrl,
							headers: {
								sessionid: self.$store.getters.sessionId,
							},
						};
						if (['PATCH', 'POST', 'PUT'].includes(method)) {
							options.data = data;
						} else {
							options.params = data;
						}

						const response = await axios.request(options);
						return response.data.data;
					} catch (error) {
						if (error.message === 'Network Error') {
							throw new ResponseError('API-Server can not be reached. It is probably down.');
						}

						const errorResponseData = error.response.data;
						if (errorResponseData !== undefined && errorResponseData.message !== undefined) {
							throw new ResponseError(errorResponseData.message, errorResponseData.code, error.response.status, errorResponseData.stack);
						}

						throw error;
					}
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
				getSettings: (): Promise<IN8nUISettings> => {
					return self.restApi().makeRestApiRequest('GET', `/settings`);
				},

				// Returns all node-types
				getNodeTypes: (): Promise<INodeTypeDescription[]> => {
					return self.restApi().makeRestApiRequest('GET', `/node-types`);
				},

				getNodesInformation: (nodeList: string[]): Promise<INodeTypeDescription[]> => {
					return self.restApi().makeRestApiRequest('POST', `/node-types`, {nodeNames: nodeList});
				},

				// Returns all the parameter options from the server
				getNodeParameterOptions: (nodeType: string, path: string, methodName: string, currentNodeParameters: INodeParameters, credentials?: INodeCredentials): Promise<INodePropertyOptions[]> => {
					const sendData = {
						nodeType,
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
				createNewWorkflow: (sendData: IWorkflowData): Promise<IWorkflowDb> => {
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

				// Creates a new workflow
				createNewCredentials: (sendData: ICredentialsDecrypted): Promise<ICredentialsResponse> => {
					return self.restApi().makeRestApiRequest('POST', `/credentials`, sendData);
				},

				// Deletes a credentials
				deleteCredentials: (id: string): Promise<void> => {
					return self.restApi().makeRestApiRequest('DELETE', `/credentials/${id}`);
				},

				// Updates existing credentials
				updateCredentials: (id: string, data: ICredentialsDecrypted): Promise<ICredentialsResponse> => {
					return self.restApi().makeRestApiRequest('PATCH', `/credentials/${id}`, data);
				},

				// Returns the credentials with the given id
				getCredentials: (id: string, includeData?: boolean): Promise<ICredentialsDecryptedResponse | ICredentialsResponse | undefined> => {
					let sendData;
					if (includeData) {
						sendData = {
							includeData,
						};
					}
					return self.restApi().makeRestApiRequest('GET', `/credentials/${id}`, sendData);
				},

				// Returns all saved credentials
				getAllCredentials: (filter?: object): Promise<ICredentialsResponse[]> => {
					let sendData;
					if (filter) {
						sendData = {
							filter,
						};
					}

					return self.restApi().makeRestApiRequest('GET', `/credentials`, sendData);
				},

				// Returns all credential types
				getCredentialTypes: (): Promise<ICredentialType[]> => {
					return self.restApi().makeRestApiRequest('GET', `/credential-types`);
				},

				// Get OAuth1 Authorization URL using the stored credentials
				oAuth1CredentialAuthorize: (sendData: ICredentialsResponse): Promise<string> => {
					return self.restApi().makeRestApiRequest('GET', `/oauth1-credential/auth`, sendData);
				},

				// Get OAuth2 Authorization URL using the stored credentials
				oAuth2CredentialAuthorize: (sendData: ICredentialsResponse): Promise<string> => {
					return self.restApi().makeRestApiRequest('GET', `/oauth2-credential/auth`, sendData);
				},

				// Verify OAuth2 provider callback and kick off token generation
				oAuth2Callback: (code: string, state: string): Promise<string> => {
					const sendData = {
						'code': code,
						'state': state,
					};

					return self.restApi().makeRestApiRequest('POST', `/oauth2-credential/callback`, sendData);
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
