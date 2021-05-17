import {
	BINARY_ENCODING,
	IHookFunctions,
	ILoadOptionsFunctions,
	IResponseError,
	IWorkflowSettings,
} from './';

import {
	IAllExecuteFunctions,
	IBinaryData,
	IContextObject,
	ICredentialDataDecryptedObject,
	ICredentialsExpressionResolveValues,
	IDataObject,
	IExecuteFunctions,
	IExecuteSingleFunctions,
	IExecuteWorkflowInfo,
	INode,
	INodeExecutionData,
	INodeParameters,
	INodeType,
	IOAuth2Options,
	IPollFunctions,
	IRunExecutionData,
	ITaskDataConnections,
	ITriggerFunctions,
	IWebhookData,
	IWebhookDescription,
	IWebhookFunctions,
	IWorkflowDataProxyData,
	IWorkflowExecuteAdditionalData,
	IWorkflowMetadata,
	NodeHelpers,
	NodeOperationError,
	NodeParameterValue,
	Workflow,
	WorkflowActivateMode,
	WorkflowDataProxy,
	WorkflowExecuteMode,
} from 'n8n-workflow';

import * as clientOAuth1 from 'oauth-1.0a';
import { Token } from 'oauth-1.0a';
import * as clientOAuth2 from 'client-oauth2';
import { get } from 'lodash';
import * as express from 'express';
import * as path from 'path';
import { OptionsWithUri, OptionsWithUrl } from 'request';
import * as requestPromise from 'request-promise-native';
import { createHmac } from 'crypto';
import { fromBuffer } from 'file-type';
import { lookup } from 'mime-types';
import {
	LoggerProxy as Logger,
} from 'n8n-workflow';

const requestPromiseWithDefaults = requestPromise.defaults({
	timeout: 300000, // 5 minutes
});

/**
 * Takes a buffer and converts it into the format n8n uses. It encodes the binary data as
 * base64 and adds metadata.
 *
 * @export
 * @param {Buffer} binaryData
 * @param {string} [filePath]
 * @param {string} [mimeType]
 * @returns {Promise<IBinaryData>}
 */
export async function prepareBinaryData(binaryData: Buffer, filePath?: string, mimeType?: string): Promise<IBinaryData> {
	if (!mimeType) {
		// If no mime type is given figure it out

		if (filePath) {
			// Use file path to guess mime type
			const mimeTypeLookup = lookup(filePath);
			if (mimeTypeLookup) {
				mimeType = mimeTypeLookup;
			}
		}

		if (!mimeType) {
			// Use buffer to guess mime type
			const fileTypeData = await fromBuffer(binaryData);
			if (fileTypeData) {
				mimeType = fileTypeData.mime;
			}
		}

		if (!mimeType) {
			// Fall back to text
			mimeType = 'text/plain';
		}
	}

	const returnData: IBinaryData = {
		mimeType,
		// TODO: Should program it in a way that it does not have to converted to base64
		//       It should only convert to and from base64 when saved in database because
		//       of for example an error or when there is a wait node.
		data: binaryData.toString(BINARY_ENCODING),
	};

	if (filePath) {
		if (filePath.includes('?')) {
			// Remove maybe present query parameters
			filePath = filePath.split('?').shift();
		}

		const filePathParts = path.parse(filePath as string);

		if (filePathParts.dir !== '') {
			returnData.directory = filePathParts.dir;
		}
		returnData.fileName = filePathParts.base;

		// Remove the dot
		const fileExtension = filePathParts.ext.slice(1);
		if (fileExtension) {
			returnData.fileExtension = fileExtension;
		}
	}

	return returnData;
}



/**
 * Makes a request using OAuth data for authentication
 *
 * @export
 * @param {IAllExecuteFunctions} this
 * @param {string} credentialsType
 * @param {(OptionsWithUri | requestPromise.RequestPromiseOptions)} requestOptions
 * @param {INode} node
 * @param {IWorkflowExecuteAdditionalData} additionalData
 *
 * @returns
 */
export async function requestOAuth2(this: IAllExecuteFunctions, credentialsType: string, requestOptions: OptionsWithUri | requestPromise.RequestPromiseOptions, node: INode, additionalData: IWorkflowExecuteAdditionalData, oAuth2Options?: IOAuth2Options) {
	const credentials = await this.getCredentials(credentialsType) as ICredentialDataDecryptedObject;

	if (credentials === undefined) {
		throw new Error('No credentials got returned!');
	}

	if (credentials.oauthTokenData === undefined) {
		throw new Error('OAuth credentials not connected!');
	}

	const oAuthClient = new clientOAuth2({
		clientId: credentials.clientId as string,
		clientSecret: credentials.clientSecret as string,
		accessTokenUri: credentials.accessTokenUrl as string,
	});

	const oauthTokenData = credentials.oauthTokenData as clientOAuth2.Data;

	const token = oAuthClient.createToken(get(oauthTokenData, oAuth2Options?.property as string) || oauthTokenData.accessToken, oauthTokenData.refreshToken, oAuth2Options?.tokenType || oauthTokenData.tokenType, oauthTokenData);
	// Signs the request by adding authorization headers or query parameters depending
	// on the token-type used.
	const newRequestOptions = token.sign(requestOptions as clientOAuth2.RequestObject);

	// If keep bearer is false remove the it from the authorization header
	if (oAuth2Options?.keepBearer === false) {
		//@ts-ignore
		newRequestOptions?.headers?.Authorization = newRequestOptions?.headers?.Authorization.split(' ')[1];
	}

	return this.helpers.request!(newRequestOptions)
		.catch(async (error: IResponseError) => {
			const statusCodeReturned = oAuth2Options?.tokenExpiredStatusCode === undefined ? 401 : oAuth2Options?.tokenExpiredStatusCode;

			if (error.statusCode === statusCodeReturned) {
				// Token is probably not valid anymore. So try refresh it.

				const tokenRefreshOptions: IDataObject = {};

				if (oAuth2Options?.includeCredentialsOnRefreshOnBody) {
					const body: IDataObject = {
						client_id: credentials.clientId as string,
						client_secret: credentials.clientSecret as string,
					};
					tokenRefreshOptions.body = body;
					// Override authorization property so the credentails are not included in it
					tokenRefreshOptions.headers = {
						Authorization: '',
					};
				}

				Logger.debug(`OAuth2 token for "${credentialsType}" used by node "${node.name}" expired. Should revalidate.`);

				const newToken = await token.refresh(tokenRefreshOptions);

				Logger.debug(`OAuth2 token for "${credentialsType}" used by node "${node.name}" has been renewed.`);

				credentials.oauthTokenData = newToken.data;

				// Find the name of the credentials
				if (!node.credentials || !node.credentials[credentialsType]) {
					throw new Error(`The node "${node.name}" does not have credentials of type "${credentialsType}"!`);
				}
				const name = node.credentials[credentialsType];

				// Save the refreshed token
				await additionalData.credentialsHelper.updateCredentials(name, credentialsType, credentials);

				Logger.debug(`OAuth2 token for "${credentialsType}" used by node "${node.name}" has been saved to database successfully.`);

				// Make the request again with the new token
				const newRequestOptions = newToken.sign(requestOptions as clientOAuth2.RequestObject);

				return this.helpers.request!(newRequestOptions);
			}

			// Unknown error so simply throw it
			throw error;
		});
}

/* Makes a request using OAuth1 data for authentication
*
* @export
* @param {IAllExecuteFunctions} this
* @param {string} credentialsType
* @param {(OptionsWithUrl | requestPromise.RequestPromiseOptions)} requestOptionså
* @returns
*/
export async function requestOAuth1(this: IAllExecuteFunctions, credentialsType: string, requestOptions: OptionsWithUrl | OptionsWithUri | requestPromise.RequestPromiseOptions) {
	const credentials = await this.getCredentials(credentialsType) as ICredentialDataDecryptedObject;

	if (credentials === undefined) {
		throw new Error('No credentials got returned!');
	}

	if (credentials.oauthTokenData === undefined) {
		throw new Error('OAuth credentials not connected!');
	}

	const oauth = new clientOAuth1({
		consumer: {
			key: credentials.consumerKey as string,
			secret: credentials.consumerSecret as string,
		},
		signature_method: credentials.signatureMethod as string,
		hash_function(base, key) {
		const algorithm = (credentials.signatureMethod === 'HMAC-SHA1') ? 'sha1' : 'sha256';
			return createHmac(algorithm, key)
					.update(base)
					.digest('base64');
		},
	});

	const oauthTokenData = credentials.oauthTokenData as IDataObject;

	const token: Token = {
		key: oauthTokenData.oauth_token as string,
		secret: oauthTokenData.oauth_token_secret as string,
	};

	//@ts-ignore
	requestOptions.data = { ...requestOptions.qs, ...requestOptions.form };

	// Fixes issue that OAuth1 library only works with "url" property and not with "uri"
	// @ts-ignore
	if (requestOptions.uri && !requestOptions.url) {
		// @ts-ignore
		requestOptions.url = requestOptions.uri;
		// @ts-ignore
		delete requestOptions.uri;
	}

	//@ts-ignore
	requestOptions.headers = oauth.toHeader(oauth.authorize(requestOptions, token));

	return this.helpers.request!(requestOptions)
		.catch(async (error: IResponseError) => {
			// Unknown error so simply throw it
			throw error;
		});
}


/**
 * Takes generic input data and brings it into the json format n8n uses.
 *
 * @export
 * @param {(IDataObject | IDataObject[])} jsonData
 * @returns {INodeExecutionData[]}
 */
export function returnJsonArray(jsonData: IDataObject | IDataObject[]): INodeExecutionData[] {
	const returnData: INodeExecutionData[] = [];

	if (!Array.isArray(jsonData)) {
		jsonData = [jsonData];
	}

	jsonData.forEach((data) => {
		returnData.push({ json: data });
	});

	return returnData;
}



/**
 * Returns the requested decrypted credentials if the node has access to them.
 *
 * @export
 * @param {Workflow} workflow Workflow which requests the data
 * @param {INode} node Node which request the data
 * @param {string} type The credential type to return
 * @param {IWorkflowExecuteAdditionalData} additionalData
 * @returns {(ICredentialDataDecryptedObject | undefined)}
 */
export async function getCredentials(workflow: Workflow, node: INode, type: string, additionalData: IWorkflowExecuteAdditionalData, mode: WorkflowExecuteMode, runExecutionData?: IRunExecutionData | null, runIndex?: number, connectionInputData?: INodeExecutionData[], itemIndex?: number): Promise<ICredentialDataDecryptedObject | undefined> {

	// Get the NodeType as it has the information if the credentials are required
	const nodeType = workflow.nodeTypes.getByName(node.type);
	if (nodeType === undefined) {
		throw new NodeOperationError(node, `Node type "${node.type}" is not known so can not get credentials!`);
	}

	if (nodeType.description.credentials === undefined) {
		throw new NodeOperationError(node, `Node type "${node.type}" does not have any credentials defined!`);
	}

	const nodeCredentialDescription = nodeType.description.credentials.find((credentialTypeDescription) => credentialTypeDescription.name === type);
	if (nodeCredentialDescription === undefined) {
		throw new NodeOperationError(node, `Node type "${node.type}" does not have any credentials of type "${type}" defined!`);
	}

	if (NodeHelpers.displayParameter(additionalData.currentNodeParameters || node.parameters, nodeCredentialDescription, node.parameters) === false) {
		// Credentials should not be displayed so return undefined even if they would be defined
		return undefined;
	}

	// Check if node has any credentials defined
	if (!node.credentials || !node.credentials[type]) {
		// If none are defined check if the credentials are required or not

		if (nodeCredentialDescription.required === true) {
			// Credentials are required so error
			if (!node.credentials) {
				throw new NodeOperationError(node,'Node does not have any credentials set!');
			}
			if (!node.credentials[type]) {
				throw new NodeOperationError(node,`Node does not have any credentials set for "${type}"!`);
			}
		} else {
			// Credentials are not required so resolve with undefined
			return undefined;
		}
	}

	let expressionResolveValues: ICredentialsExpressionResolveValues | undefined;
	if (connectionInputData && runExecutionData && runIndex !== undefined) {
		expressionResolveValues = {
			connectionInputData,
			itemIndex: itemIndex || 0,
			node,
			runExecutionData,
			runIndex,
			workflow,
		} as ICredentialsExpressionResolveValues;
	}

	const name = node.credentials[type];

	const decryptedDataObject = await additionalData.credentialsHelper.getDecrypted(name, type, mode, false, expressionResolveValues);

	return decryptedDataObject;
}



/**
 * Returns a copy of the node
 *
 * @export
 * @param {INode} node
 * @returns {INode}
 */
export function getNode(node: INode): INode {
	return JSON.parse(JSON.stringify(node));
}



/**
 * Returns the requested resolved (all expressions replaced) node parameters.
 *
 * @export
 * @param {Workflow} workflow
 * @param {(IRunExecutionData | null)} runExecutionData
 * @param {number} runIndex
 * @param {INodeExecutionData[]} connectionInputData
 * @param {INode} node
 * @param {string} parameterName
 * @param {number} itemIndex
 * @param {*} [fallbackValue]
 * @returns {(NodeParameterValue | INodeParameters | NodeParameterValue[] | INodeParameters[] | object)}
 */
export function getNodeParameter(workflow: Workflow, runExecutionData: IRunExecutionData | null, runIndex: number, connectionInputData: INodeExecutionData[], node: INode, parameterName: string, itemIndex: number, mode: WorkflowExecuteMode, fallbackValue?: any): NodeParameterValue | INodeParameters | NodeParameterValue[] | INodeParameters[] | object { //tslint:disable-line:no-any
	const nodeType = workflow.nodeTypes.getByName(node.type);
	if (nodeType === undefined) {
		throw new Error(`Node type "${node.type}" is not known so can not return paramter value!`);
	}

	const value = get(node.parameters, parameterName, fallbackValue);

	if (value === undefined) {
		throw new Error(`Could not get parameter "${parameterName}"!`);
	}

	let returnData;
	try {
		returnData = workflow.expression.getParameterValue(value, runExecutionData, runIndex, itemIndex, node.name, connectionInputData, mode);
	} catch (e) {
		e.message += ` [Error in parameter: "${parameterName}"]`;
		throw e;
	}

	return returnData;
}



/**
 * Returns if execution should be continued even if there was an error.
 *
 * @export
 * @param {INode} node
 * @returns {boolean}
 */
export function continueOnFail(node: INode): boolean {
	return get(node, 'continueOnFail', false);
}



/**
 * Returns the webhook URL of the webhook with the given name
 *
 * @export
 * @param {string} name
 * @param {Workflow} workflow
 * @param {INode} node
 * @param {IWorkflowExecuteAdditionalData} additionalData
 * @param {boolean} [isTest]
 * @returns {(string | undefined)}
 */
export function getNodeWebhookUrl(name: string, workflow: Workflow, node: INode, additionalData: IWorkflowExecuteAdditionalData, mode: WorkflowExecuteMode, isTest?: boolean): string | undefined {
	let baseUrl = additionalData.webhookBaseUrl;
	if (isTest === true) {
		baseUrl = additionalData.webhookTestBaseUrl;
	}

	const webhookDescription = getWebhookDescription(name, workflow, node);
	if (webhookDescription === undefined) {
		return undefined;
	}

	const path = workflow.expression.getSimpleParameterValue(node, webhookDescription['path'], mode);
	if (path === undefined) {
		return undefined;
	}

	const isFullPath: boolean = workflow.expression.getSimpleParameterValue(node, webhookDescription['isFullPath'], mode, false) as boolean;
	return NodeHelpers.getNodeWebhookUrl(baseUrl, workflow.id!, node, path.toString(), isFullPath);
}



/**
 * Returns the timezone for the workflow
 *
 * @export
 * @param {Workflow} workflow
 * @param {IWorkflowExecuteAdditionalData} additionalData
 * @returns {string}
 */
export function getTimezone(workflow: Workflow, additionalData: IWorkflowExecuteAdditionalData):string {
	if (workflow.settings !== undefined && workflow.settings.timezone !== undefined) {
		return (workflow.settings as IWorkflowSettings).timezone as string;
	}
	return additionalData.timezone;
}



/**
 * Returns the full webhook description of the webhook with the given name
 *
 * @export
 * @param {string} name
 * @param {Workflow} workflow
 * @param {INode} node
 * @returns {(IWebhookDescription | undefined)}
 */
export function getWebhookDescription(name: string, workflow: Workflow, node: INode): IWebhookDescription | undefined {
	const nodeType = workflow.nodeTypes.getByName(node.type) as INodeType;

	if (nodeType.description.webhooks === undefined) {
		// Node does not have any webhooks so return
		return undefined;
	}

	for (const webhookDescription of nodeType.description.webhooks) {
		if (webhookDescription.name === name) {
			return webhookDescription;
		}
	}

	return undefined;
}



/**
 * Returns the workflow metadata
 *
 * @export
 * @param {Workflow} workflow
 * @returns {IWorkflowMetadata}
 */
export function getWorkflowMetadata(workflow: Workflow): IWorkflowMetadata {
	return {
		id: workflow.id,
		name: workflow.name,
		active: workflow.active,
	};
}



/**
 * Returns the execute functions the poll nodes have access to.
 *
 * @export
 * @param {Workflow} workflow
 * @param {INode} node
 * @param {IWorkflowExecuteAdditionalData} additionalData
 * @param {WorkflowExecuteMode} mode
 * @returns {ITriggerFunctions}
 */
// TODO: Check if I can get rid of: additionalData, and so then maybe also at ActiveWorkflowRunner.add
export function getExecutePollFunctions(workflow: Workflow, node: INode, additionalData: IWorkflowExecuteAdditionalData, mode: WorkflowExecuteMode, activation: WorkflowActivateMode): IPollFunctions {
	return ((workflow: Workflow, node: INode) => {
		return {
			__emit: (data: INodeExecutionData[][]): void => {
				throw new Error('Overwrite NodeExecuteFunctions.getExecutePullFunctions.__emit function!');
			},
			async getCredentials(type: string): Promise<ICredentialDataDecryptedObject | undefined> {
				return await getCredentials(workflow, node, type, additionalData, mode);
			},
			getMode: (): WorkflowExecuteMode => {
				return mode;
			},
			getActivationMode: (): WorkflowActivateMode => {
				return activation;
			},
			getNode: () => {
				return getNode(node);
			},
			getNodeParameter: (parameterName: string, fallbackValue?: any): NodeParameterValue | INodeParameters | NodeParameterValue[] | INodeParameters[] | object => { //tslint:disable-line:no-any
				const runExecutionData: IRunExecutionData | null = null;
				const itemIndex = 0;
				const runIndex = 0;
				const connectionInputData: INodeExecutionData[] = [];

				return getNodeParameter(workflow, runExecutionData, runIndex, connectionInputData, node, parameterName, itemIndex, mode, fallbackValue);
			},
			getRestApiUrl: (): string => {
				return additionalData.restApiUrl;
			},
			getTimezone: (): string => {
				return getTimezone(workflow, additionalData);
			},
			getWorkflow: () => {
				return getWorkflowMetadata(workflow);
			},
			getWorkflowStaticData(type: string): IDataObject {
				return workflow.getStaticData(type, node);
			},
			helpers: {
				prepareBinaryData,
				request: requestPromiseWithDefaults,
				requestOAuth2(this: IAllExecuteFunctions, credentialsType: string, requestOptions: OptionsWithUri | requestPromise.RequestPromiseOptions, oAuth2Options?: IOAuth2Options): Promise<any> { // tslint:disable-line:no-any
					return requestOAuth2.call(this, credentialsType, requestOptions, node, additionalData, oAuth2Options);
				},
				requestOAuth1(this: IAllExecuteFunctions, credentialsType: string, requestOptions: OptionsWithUrl | requestPromise.RequestPromiseOptions): Promise<any> { // tslint:disable-line:no-any
					return requestOAuth1.call(this, credentialsType, requestOptions);
				},
				returnJsonArray,
			},
		};
	})(workflow, node);
}



/**
 * Returns the execute functions the trigger nodes have access to.
 *
 * @export
 * @param {Workflow} workflow
 * @param {INode} node
 * @param {IWorkflowExecuteAdditionalData} additionalData
 * @param {WorkflowExecuteMode} mode
 * @returns {ITriggerFunctions}
 */
// TODO: Check if I can get rid of: additionalData, and so then maybe also at ActiveWorkflowRunner.add
export function getExecuteTriggerFunctions(workflow: Workflow, node: INode, additionalData: IWorkflowExecuteAdditionalData, mode: WorkflowExecuteMode, activation: WorkflowActivateMode): ITriggerFunctions {
	return ((workflow: Workflow, node: INode) => {
		return {
			emit: (data: INodeExecutionData[][]): void => {
				throw new Error('Overwrite NodeExecuteFunctions.getExecuteTriggerFunctions.emit function!');
			},
			async getCredentials(type: string): Promise<ICredentialDataDecryptedObject | undefined> {
				return await getCredentials(workflow, node, type, additionalData, mode);
			},
			getNode: () => {
				return getNode(node);
			},
			getMode: (): WorkflowExecuteMode => {
				return mode;
			},
			getActivationMode: (): WorkflowActivateMode => {
				return activation;
			},
			getNodeParameter: (parameterName: string, fallbackValue?: any): NodeParameterValue | INodeParameters | NodeParameterValue[] | INodeParameters[] | object => { //tslint:disable-line:no-any
				const runExecutionData: IRunExecutionData | null = null;
				const itemIndex = 0;
				const runIndex = 0;
				const connectionInputData: INodeExecutionData[] = [];

				return getNodeParameter(workflow, runExecutionData, runIndex, connectionInputData, node, parameterName, itemIndex, mode, fallbackValue);
			},
			getRestApiUrl: (): string => {
				return additionalData.restApiUrl;
			},
			getTimezone: (): string => {
				return getTimezone(workflow, additionalData);
			},
			getWorkflow: () => {
				return getWorkflowMetadata(workflow);
			},
			getWorkflowStaticData(type: string): IDataObject {
				return workflow.getStaticData(type, node);
			},
			helpers: {
				prepareBinaryData,
				request: requestPromiseWithDefaults,
				requestOAuth2(this: IAllExecuteFunctions, credentialsType: string, requestOptions: OptionsWithUri | requestPromise.RequestPromiseOptions, oAuth2Options?: IOAuth2Options): Promise<any> { // tslint:disable-line:no-any
					return requestOAuth2.call(this, credentialsType, requestOptions, node, additionalData, oAuth2Options);
				},
				requestOAuth1(this: IAllExecuteFunctions, credentialsType: string, requestOptions: OptionsWithUrl | requestPromise.RequestPromiseOptions): Promise<any> { // tslint:disable-line:no-any
					return requestOAuth1.call(this, credentialsType, requestOptions);
				},
				returnJsonArray,
			},
		};
	}) (workflow, node);
}



/**
 * Returns the execute functions regular nodes have access to.
 *
 * @export
 * @param {Workflow} workflow
 * @param {IRunExecutionData} runExecutionData
 * @param {number} runIndex
 * @param {INodeExecutionData[]} connectionInputData
 * @param {ITaskDataConnections} inputData
 * @param {INode} node
 * @param {IWorkflowExecuteAdditionalData} additionalData
 * @param {WorkflowExecuteMode} mode
 * @returns {IExecuteFunctions}
 */
export function getExecuteFunctions(workflow: Workflow, runExecutionData: IRunExecutionData, runIndex: number, connectionInputData: INodeExecutionData[], inputData: ITaskDataConnections, node: INode, additionalData: IWorkflowExecuteAdditionalData, mode: WorkflowExecuteMode): IExecuteFunctions {
	return ((workflow, runExecutionData, connectionInputData, inputData, node) => {
		return {
			continueOnFail: () => {
				return continueOnFail(node);
			},
			evaluateExpression: (expression: string, itemIndex: number) => {
				return workflow.expression.resolveSimpleParameterValue('=' + expression, {}, runExecutionData, runIndex, itemIndex, node.name, connectionInputData, mode);
			},
			async executeWorkflow(workflowInfo: IExecuteWorkflowInfo, inputData?: INodeExecutionData[]): Promise<any> { // tslint:disable-line:no-any
				return additionalData.executeWorkflow(workflowInfo, additionalData, inputData);
			},
			getContext(type: string): IContextObject {
				return NodeHelpers.getContext(runExecutionData, type, node);
			},
			async getCredentials(type: string, itemIndex?: number): Promise<ICredentialDataDecryptedObject | undefined> {
				return await getCredentials(workflow, node, type, additionalData, mode, runExecutionData, runIndex, connectionInputData, itemIndex);
			},
			getInputData: (inputIndex = 0, inputName = 'main') => {

				if (!inputData.hasOwnProperty(inputName)) {
					// Return empty array because else it would throw error when nothing is connected to input
					return [];
				}

				// TODO: Check if nodeType has input with that index defined
				if (inputData[inputName].length < inputIndex) {
					throw new Error(`Could not get input index "${inputIndex}" of input "${inputName}"!`);
				}


				if (inputData[inputName][inputIndex] === null) {
					// return [];
					throw new Error(`Value "${inputIndex}" of input "${inputName}" did not get set!`);
				}

				// TODO: Maybe do clone of data only here so it only clones the data that is really needed
				return inputData[inputName][inputIndex] as INodeExecutionData[];
			},
			getNodeParameter: (parameterName: string, itemIndex: number, fallbackValue?: any): NodeParameterValue | INodeParameters | NodeParameterValue[] | INodeParameters[] | object => { //tslint:disable-line:no-any
				return getNodeParameter(workflow, runExecutionData, runIndex, connectionInputData, node, parameterName, itemIndex, mode, fallbackValue);
			},
			getMode: (): WorkflowExecuteMode => {
				return mode;
			},
			getNode: () => {
				return getNode(node);
			},
			getRestApiUrl: (): string => {
				return additionalData.restApiUrl;
			},
			getTimezone: (): string => {
				return getTimezone(workflow, additionalData);
			},
			getWorkflow: () => {
				return getWorkflowMetadata(workflow);
			},
			getWorkflowDataProxy: (itemIndex: number): IWorkflowDataProxyData => {
				const dataProxy = new WorkflowDataProxy(workflow, runExecutionData, runIndex, itemIndex, node.name, connectionInputData, {}, mode);
				return dataProxy.getDataProxy();
			},
			getWorkflowStaticData(type: string): IDataObject {
				return workflow.getStaticData(type, node);
			},
			prepareOutputData: NodeHelpers.prepareOutputData,
			helpers: {
				prepareBinaryData,
				request: requestPromiseWithDefaults,
				requestOAuth2(this: IAllExecuteFunctions, credentialsType: string, requestOptions: OptionsWithUri | requestPromise.RequestPromiseOptions, oAuth2Options?: IOAuth2Options): Promise<any> { // tslint:disable-line:no-any
					return requestOAuth2.call(this, credentialsType, requestOptions, node, additionalData, oAuth2Options);
				},
				requestOAuth1(this: IAllExecuteFunctions, credentialsType: string, requestOptions: OptionsWithUrl | requestPromise.RequestPromiseOptions): Promise<any> { // tslint:disable-line:no-any
					return requestOAuth1.call(this, credentialsType, requestOptions);
				},
				returnJsonArray,
			},
		};
	})(workflow, runExecutionData, connectionInputData, inputData, node);
}



/**
 * Returns the execute functions regular nodes have access to when single-function is defined.
 *
 * @export
 * @param {Workflow} workflow
 * @param {IRunExecutionData} runExecutionData
 * @param {number} runIndex
 * @param {INodeExecutionData[]} connectionInputData
 * @param {ITaskDataConnections} inputData
 * @param {INode} node
 * @param {number} itemIndex
 * @param {IWorkflowExecuteAdditionalData} additionalData
 * @param {WorkflowExecuteMode} mode
 * @returns {IExecuteSingleFunctions}
 */
export function getExecuteSingleFunctions(workflow: Workflow, runExecutionData: IRunExecutionData, runIndex: number, connectionInputData: INodeExecutionData[], inputData: ITaskDataConnections, node: INode, itemIndex: number, additionalData: IWorkflowExecuteAdditionalData, mode: WorkflowExecuteMode): IExecuteSingleFunctions {
	return ((workflow, runExecutionData, connectionInputData, inputData, node, itemIndex) => {
		return {
			continueOnFail: () => {
				return continueOnFail(node);
			},
			evaluateExpression: (expression: string, evaluateItemIndex: number | undefined) => {
				evaluateItemIndex = evaluateItemIndex === undefined ? itemIndex : evaluateItemIndex;
				return workflow.expression.resolveSimpleParameterValue('=' + expression, {}, runExecutionData, runIndex, evaluateItemIndex, node.name, connectionInputData, mode);
			},
			getContext(type: string): IContextObject {
				return NodeHelpers.getContext(runExecutionData, type, node);
			},
			async getCredentials(type: string): Promise<ICredentialDataDecryptedObject | undefined> {
				return await getCredentials(workflow, node, type, additionalData, mode, runExecutionData, runIndex, connectionInputData, itemIndex);
			},
			getInputData: (inputIndex = 0, inputName = 'main') => {
				if (!inputData.hasOwnProperty(inputName)) {
					// Return empty array because else it would throw error when nothing is connected to input
					return {json: {}};
				}

				// TODO: Check if nodeType has input with that index defined
				if (inputData[inputName].length < inputIndex) {
					throw new Error(`Could not get input index "${inputIndex}" of input "${inputName}"!`);
				}

				const allItems = inputData[inputName][inputIndex];

				if (allItems === null) {
					// return [];
					throw new Error(`Value "${inputIndex}" of input "${inputName}" did not get set!`);
				}

				if (allItems[itemIndex] === null) {
					// return [];
					throw new Error(`Value "${inputIndex}" of input "${inputName}" with itemIndex "${itemIndex}" did not get set!`);
				}

				return allItems[itemIndex] as INodeExecutionData;
			},
			getMode: (): WorkflowExecuteMode => {
				return mode;
			},
			getNode: () => {
				return getNode(node);
			},
			getRestApiUrl: (): string => {
				return additionalData.restApiUrl;
			},
			getTimezone: (): string => {
				return getTimezone(workflow, additionalData);
			},
			getNodeParameter: (parameterName: string, fallbackValue?: any): NodeParameterValue | INodeParameters | NodeParameterValue[] | INodeParameters[] | object => { //tslint:disable-line:no-any
				return getNodeParameter(workflow, runExecutionData, runIndex, connectionInputData, node, parameterName, itemIndex, mode, fallbackValue);
			},
			getWorkflow: () => {
				return getWorkflowMetadata(workflow);
			},
			getWorkflowDataProxy: (): IWorkflowDataProxyData => {
				const dataProxy = new WorkflowDataProxy(workflow, runExecutionData, runIndex, itemIndex, node.name, connectionInputData, {}, mode);
				return dataProxy.getDataProxy();
			},
			getWorkflowStaticData(type: string): IDataObject {
				return workflow.getStaticData(type, node);
			},
			helpers: {
				prepareBinaryData,
				request: requestPromiseWithDefaults,
				requestOAuth2(this: IAllExecuteFunctions, credentialsType: string, requestOptions: OptionsWithUri | requestPromise.RequestPromiseOptions, oAuth2Options?: IOAuth2Options): Promise<any> { // tslint:disable-line:no-any
					return requestOAuth2.call(this, credentialsType, requestOptions, node, additionalData, oAuth2Options);
				},
				requestOAuth1(this: IAllExecuteFunctions, credentialsType: string, requestOptions: OptionsWithUrl | requestPromise.RequestPromiseOptions): Promise<any> { // tslint:disable-line:no-any
					return requestOAuth1.call(this, credentialsType, requestOptions);
				},
			},
		};
	})(workflow, runExecutionData, connectionInputData, inputData, node, itemIndex);
}


/**
 * Returns the execute functions regular nodes have access to in load-options-function.
 *
 * @export
 * @param {Workflow} workflow
 * @param {INode} node
 * @param {IWorkflowExecuteAdditionalData} additionalData
 * @returns {ILoadOptionsFunctions}
 */
export function getLoadOptionsFunctions(workflow: Workflow, node: INode, path: string, additionalData: IWorkflowExecuteAdditionalData): ILoadOptionsFunctions {
	return ((workflow: Workflow, node: INode, path: string) => {
		const that = {
			async getCredentials(type: string): Promise<ICredentialDataDecryptedObject | undefined> {
				return await getCredentials(workflow, node, type, additionalData, 'internal');
			},
			getCurrentNodeParameter: (parameterPath: string): NodeParameterValue | INodeParameters | NodeParameterValue[] | INodeParameters[] | object | undefined => {
				const nodeParameters = additionalData.currentNodeParameters;

				if (parameterPath.charAt(0) === '&') {
					parameterPath = `${path.split('.').slice(1, -1).join('.')}.${parameterPath.slice(1)}`;
				}

				return get(nodeParameters, parameterPath);
			},
			getCurrentNodeParameters: (): INodeParameters | undefined => {
				return additionalData.currentNodeParameters;
			},
			getNode: () => {
				return getNode(node);
			},
			getNodeParameter: (parameterName: string, fallbackValue?: any): NodeParameterValue | INodeParameters | NodeParameterValue[] | INodeParameters[] | object => { //tslint:disable-line:no-any
				const runExecutionData: IRunExecutionData | null = null;
				const itemIndex = 0;
				const runIndex = 0;
				const connectionInputData: INodeExecutionData[] = [];

				return getNodeParameter(workflow, runExecutionData, runIndex, connectionInputData, node, parameterName, itemIndex, 'internal' as WorkflowExecuteMode, fallbackValue);
			},
			getTimezone: (): string => {
				return getTimezone(workflow, additionalData);
			},
			getRestApiUrl: (): string => {
				return additionalData.restApiUrl;
			},
			helpers: {
				request: requestPromiseWithDefaults,
				requestOAuth2(this: IAllExecuteFunctions, credentialsType: string, requestOptions: OptionsWithUri | requestPromise.RequestPromiseOptions, oAuth2Options?: IOAuth2Options): Promise<any> { // tslint:disable-line:no-any
					return requestOAuth2.call(this, credentialsType, requestOptions, node, additionalData, oAuth2Options);
				},
				requestOAuth1(this: IAllExecuteFunctions, credentialsType: string, requestOptions: OptionsWithUrl | requestPromise.RequestPromiseOptions): Promise<any> { // tslint:disable-line:no-any
					return requestOAuth1.call(this, credentialsType, requestOptions);
				},
			},
		};
		return that;
	})(workflow, node, path);

}


/**
 * Returns the execute functions regular nodes have access to in hook-function.
 *
 * @export
 * @param {Workflow} workflow
 * @param {INode} node
 * @param {IWorkflowExecuteAdditionalData} additionalData
 * @param {WorkflowExecuteMode} mode
 * @returns {IHookFunctions}
 */
export function getExecuteHookFunctions(workflow: Workflow, node: INode, additionalData: IWorkflowExecuteAdditionalData, mode: WorkflowExecuteMode, activation: WorkflowActivateMode, isTest?: boolean, webhookData?: IWebhookData): IHookFunctions {
	return ((workflow: Workflow, node: INode) => {
		const that = {
			async getCredentials(type: string): Promise<ICredentialDataDecryptedObject | undefined> {
				return await getCredentials(workflow, node, type, additionalData, mode);
			},
			getMode: (): WorkflowExecuteMode => {
				return mode;
			},
			getActivationMode: (): WorkflowActivateMode => {
				return activation;
			},
			getNode: () => {
				return getNode(node);
			},
			getNodeParameter: (parameterName: string, fallbackValue?: any): NodeParameterValue | INodeParameters | NodeParameterValue[] | INodeParameters[] | object => { //tslint:disable-line:no-any
				const runExecutionData: IRunExecutionData | null = null;
				const itemIndex = 0;
				const runIndex = 0;
				const connectionInputData: INodeExecutionData[] = [];

				return getNodeParameter(workflow, runExecutionData, runIndex, connectionInputData, node, parameterName, itemIndex, mode, fallbackValue);
			},
			getNodeWebhookUrl: (name: string): string | undefined => {
				return getNodeWebhookUrl(name, workflow, node, additionalData, mode, isTest);
			},
			getTimezone: (): string => {
				return getTimezone(workflow, additionalData);
			},
			getWebhookName(): string {
				if (webhookData === undefined) {
					throw new Error('Is only supported in webhook functions!');
				}
				return webhookData.webhookDescription.name;
			},
			getWebhookDescription(name: string): IWebhookDescription | undefined {
				return getWebhookDescription(name, workflow, node);
			},
			getWorkflow: () => {
				return getWorkflowMetadata(workflow);
			},
			getWorkflowStaticData(type: string): IDataObject {
				return workflow.getStaticData(type, node);
			},
			helpers: {
				request: requestPromiseWithDefaults,
				requestOAuth2(this: IAllExecuteFunctions, credentialsType: string, requestOptions: OptionsWithUri | requestPromise.RequestPromiseOptions, oAuth2Options?: IOAuth2Options): Promise<any> { // tslint:disable-line:no-any
					return requestOAuth2.call(this, credentialsType, requestOptions, node, additionalData, oAuth2Options);
				},
				requestOAuth1(this: IAllExecuteFunctions, credentialsType: string, requestOptions: OptionsWithUrl | requestPromise.RequestPromiseOptions): Promise<any> { // tslint:disable-line:no-any
					return requestOAuth1.call(this, credentialsType, requestOptions);
				},
			},
		};
		return that;
	})(workflow, node);

}


/**
 * Returns the execute functions regular nodes have access to when webhook-function is defined.
 *
 * @export
 * @param {Workflow} workflow
 * @param {IRunExecutionData} runExecutionData
 * @param {INode} node
 * @param {IWorkflowExecuteAdditionalData} additionalData
 * @param {WorkflowExecuteMode} mode
 * @returns {IWebhookFunctions}
 */
export function getExecuteWebhookFunctions(workflow: Workflow, node: INode, additionalData: IWorkflowExecuteAdditionalData, mode: WorkflowExecuteMode, webhookData: IWebhookData): IWebhookFunctions {
	return ((workflow: Workflow, node: INode) => {
		return {
			getBodyData(): IDataObject {
				if (additionalData.httpRequest === undefined) {
					throw new Error('Request is missing!');
				}
				return additionalData.httpRequest.body;
			},
			async getCredentials(type: string): Promise<ICredentialDataDecryptedObject | undefined> {
				return await getCredentials(workflow, node, type, additionalData, mode);
			},
			getHeaderData(): object {
				if (additionalData.httpRequest === undefined) {
					throw new Error('Request is missing!');
				}
				return additionalData.httpRequest.headers;
			},
			getMode: (): WorkflowExecuteMode => {
				return mode;
			},
			getNode: () => {
				return getNode(node);
			},
			getNodeParameter: (parameterName: string, fallbackValue?: any): NodeParameterValue | INodeParameters | NodeParameterValue[] | INodeParameters[] | object => { //tslint:disable-line:no-any
				const runExecutionData: IRunExecutionData | null = null;
				const itemIndex = 0;
				const runIndex = 0;
				const connectionInputData: INodeExecutionData[] = [];

				return getNodeParameter(workflow, runExecutionData, runIndex, connectionInputData, node, parameterName, itemIndex, mode, fallbackValue);
			},
			getParamsData(): object {
				if (additionalData.httpRequest === undefined) {
					throw new Error('Request is missing!');
				}
				return additionalData.httpRequest.params;
			},
			getQueryData(): object {
				if (additionalData.httpRequest === undefined) {
					throw new Error('Request is missing!');
				}
				return additionalData.httpRequest.query;
			},
			getRequestObject(): express.Request {
				if (additionalData.httpRequest === undefined) {
					throw new Error('Request is missing!');
				}
				return additionalData.httpRequest;
			},
			getResponseObject(): express.Response {
				if (additionalData.httpResponse === undefined) {
					throw new Error('Response is missing!');
				}
				return additionalData.httpResponse;
			},
			getNodeWebhookUrl: (name: string): string | undefined => {
				return getNodeWebhookUrl(name, workflow, node, additionalData, mode);
			},
			getTimezone: (): string => {
				return getTimezone(workflow, additionalData);
			},
			getWorkflow: () => {
				return getWorkflowMetadata(workflow);
			},
			getWorkflowStaticData(type: string): IDataObject {
				return workflow.getStaticData(type, node);
			},
			getWebhookName(): string {
				return webhookData.webhookDescription.name;
			},
			prepareOutputData: NodeHelpers.prepareOutputData,
			helpers: {
				prepareBinaryData,
				request: requestPromiseWithDefaults,
				requestOAuth2(this: IAllExecuteFunctions, credentialsType: string, requestOptions: OptionsWithUri | requestPromise.RequestPromiseOptions, oAuth2Options?: IOAuth2Options): Promise<any> { // tslint:disable-line:no-any
					return requestOAuth2.call(this, credentialsType, requestOptions, node, additionalData, oAuth2Options);
				},
				requestOAuth1(this: IAllExecuteFunctions, credentialsType: string, requestOptions: OptionsWithUrl | requestPromise.RequestPromiseOptions): Promise<any> { // tslint:disable-line:no-any
					return requestOAuth1.call(this, credentialsType, requestOptions);
				},
				returnJsonArray,
			},
		};
	})(workflow, node);

}
