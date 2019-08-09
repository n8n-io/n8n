import {
	IBinaryData,
	ICredentialType,
	IDataObject,
	IExecuteFunctions as IExecuteFunctionsBase,
	IExecuteSingleFunctions as IExecuteSingleFunctionsBase,
	IHookFunctions as IHookFunctionsBase,
	ILoadOptionsFunctions as ILoadOptionsFunctionsBase,
	INodeExecutionData,
	INodeType,
	ITriggerFunctions as ITriggerFunctionsBase,
	IWebhookFunctions as IWebhookFunctionsBase,
	IWorkflowSettings as IWorkflowSettingsWorkflow,
 } from 'n8n-workflow';


import * as request from 'request';
import * as requestPromise from 'request-promise-native';

interface Constructable<T> {
	new(): T;
}


export interface IProcessMessage {
	data?: any; // tslint:disable-line:no-any
	type: string;
}


export interface IExecuteFunctions extends IExecuteFunctionsBase {
	helpers: {
		prepareBinaryData(binaryData: Buffer, filePath?: string, mimeType?: string): Promise<IBinaryData>;
		request: request.RequestAPI<requestPromise.RequestPromise, requestPromise.RequestPromiseOptions, request.RequiredUriUrl>,
		returnJsonArray(jsonData: IDataObject | IDataObject[]): INodeExecutionData[];
	};
}


export interface IExecuteSingleFunctions extends IExecuteSingleFunctionsBase {
	helpers: {
		prepareBinaryData(binaryData: Buffer, filePath?: string, mimeType?: string): Promise<IBinaryData>;
		request: request.RequestAPI < requestPromise.RequestPromise, requestPromise.RequestPromiseOptions, request.RequiredUriUrl >,
	};
}


export interface ITriggerFunctions extends ITriggerFunctionsBase {
	helpers: {
		prepareBinaryData(binaryData: Buffer, filePath?: string, mimeType?: string): Promise<IBinaryData>;
		request: request.RequestAPI<requestPromise.RequestPromise, requestPromise.RequestPromiseOptions, request.RequiredUriUrl>,
		returnJsonArray(jsonData: IDataObject | IDataObject[]): INodeExecutionData[];
	};
}


export interface IUserSettings {
	encryptionKey?: string;
	tunnelSubdomain?: string;
}

export interface ILoadOptionsFunctions extends ILoadOptionsFunctionsBase {
	helpers: {
		request?: request.RequestAPI<requestPromise.RequestPromise, requestPromise.RequestPromiseOptions, request.RequiredUriUrl>,
	};
}


export interface IHookFunctions extends IHookFunctionsBase {
	helpers: {
		request: request.RequestAPI<requestPromise.RequestPromise, requestPromise.RequestPromiseOptions, request.RequiredUriUrl>,
	};
}


export interface IWebhookFunctions extends IWebhookFunctionsBase {
	helpers: {
		prepareBinaryData(binaryData: Buffer, filePath?: string, mimeType?: string): Promise<IBinaryData>;
		request: request.RequestAPI<requestPromise.RequestPromise, requestPromise.RequestPromiseOptions, request.RequiredUriUrl>,
		returnJsonArray(jsonData: IDataObject | IDataObject[]): INodeExecutionData[];
	};
}

export interface IWorkflowSettings extends IWorkflowSettingsWorkflow {
	errorWorkflow?: string;
	timezone?: string;
	saveManualRuns?: boolean;
}


// New node definition in file
export interface INodeDefinitionFile {
	[key: string]: Constructable<INodeType | ICredentialType>;
}


// Is identical to TaskDataConnections but does not allow null value to be used as input for nodes
export interface INodeInputDataConnections {
	[key: string]: INodeExecutionData[][];
}
