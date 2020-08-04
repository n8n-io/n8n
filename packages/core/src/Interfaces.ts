import {
	IAllExecuteFunctions,
	IBinaryData,
	ICredentialType,
	IDataObject,
	IExecuteFunctions as IExecuteFunctionsBase,
	IExecuteSingleFunctions as IExecuteSingleFunctionsBase,
	IHookFunctions as IHookFunctionsBase,
	ILoadOptionsFunctions as ILoadOptionsFunctionsBase,
	INodeExecutionData,
	INodeType,
	IPollFunctions as IPollFunctionsBase,
	IPollResponse,
	ITriggerFunctions as ITriggerFunctionsBase,
	ITriggerResponse,
	IWebhookFunctions as IWebhookFunctionsBase,
	IWorkflowSettings as IWorkflowSettingsWorkflow,
	IOAuth2Options,
 } from 'n8n-workflow';


import { OptionsWithUri, OptionsWithUrl } from 'request';
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
		request: requestPromise.RequestPromiseAPI,
		requestOAuth2(this: IAllExecuteFunctions, credentialsType: string, requestOptions: OptionsWithUri | requestPromise.RequestPromiseOptions, oAuth2Options?: IOAuth2Options): Promise<any>, // tslint:disable-line:no-any
		requestOAuth1(this: IAllExecuteFunctions, credentialsType: string, requestOptions: OptionsWithUrl | requestPromise.RequestPromiseOptions): Promise<any>, // tslint:disable-line:no-any
		returnJsonArray(jsonData: IDataObject | IDataObject[]): INodeExecutionData[];
	};
}


export interface IExecuteSingleFunctions extends IExecuteSingleFunctionsBase {
	helpers: {
		prepareBinaryData(binaryData: Buffer, filePath?: string, mimeType?: string): Promise<IBinaryData>;
		request: requestPromise.RequestPromiseAPI,
		requestOAuth2(this: IAllExecuteFunctions, credentialsType: string, requestOptions: OptionsWithUri | requestPromise.RequestPromiseOptions, oAuth2Options?: IOAuth2Options): Promise<any>, // tslint:disable-line:no-any
		requestOAuth1(this: IAllExecuteFunctions, credentialsType: string, requestOptions: OptionsWithUrl | requestPromise.RequestPromiseOptions): Promise<any>, // tslint:disable-line:no-any
	};
}


export interface IPollFunctions extends IPollFunctionsBase {
	helpers: {
		prepareBinaryData(binaryData: Buffer, filePath?: string, mimeType?: string): Promise<IBinaryData>;
		request: requestPromise.RequestPromiseAPI,
		requestOAuth2(this: IAllExecuteFunctions, credentialsType: string, requestOptions: OptionsWithUri | requestPromise.RequestPromiseOptions, oAuth2Options?: IOAuth2Options): Promise<any>, // tslint:disable-line:no-any
		requestOAuth1(this: IAllExecuteFunctions, credentialsType: string, requestOptions: OptionsWithUrl | requestPromise.RequestPromiseOptions): Promise<any>, // tslint:disable-line:no-any
		returnJsonArray(jsonData: IDataObject | IDataObject[]): INodeExecutionData[];
	};
}


export interface IResponseError extends Error {
	statusCode?: number;
}


export interface ITriggerFunctions extends ITriggerFunctionsBase {
	helpers: {
		prepareBinaryData(binaryData: Buffer, filePath?: string, mimeType?: string): Promise<IBinaryData>;
		request: requestPromise.RequestPromiseAPI,
		requestOAuth2(this: IAllExecuteFunctions, credentialsType: string, requestOptions: OptionsWithUri | requestPromise.RequestPromiseOptions, oAuth2Options?: IOAuth2Options): Promise<any>, // tslint:disable-line:no-any
		requestOAuth1(this: IAllExecuteFunctions, credentialsType: string, requestOptions: OptionsWithUrl | requestPromise.RequestPromiseOptions): Promise<any>, // tslint:disable-line:no-any
		returnJsonArray(jsonData: IDataObject | IDataObject[]): INodeExecutionData[];
	};
}


export interface ITriggerTime {
	mode: string;
	hour: number;
	minute: number;
	dayOfMonth: number;
	weekeday: number;
	[key: string]: string | number;
}


export interface IUserSettings {
	encryptionKey?: string;
	tunnelSubdomain?: string;
}

export interface ILoadOptionsFunctions extends ILoadOptionsFunctionsBase {
	helpers: {
		request?: requestPromise.RequestPromiseAPI,
		requestOAuth2?: (this: IAllExecuteFunctions, credentialsType: string, requestOptions: OptionsWithUri | requestPromise.RequestPromiseOptions, oAuth2Options?: IOAuth2Options) => Promise<any>, // tslint:disable-line:no-any
		requestOAuth1?(this: IAllExecuteFunctions, credentialsType: string, requestOptions: OptionsWithUrl | requestPromise.RequestPromiseOptions): Promise<any>, // tslint:disable-line:no-any
	};
}


export interface IHookFunctions extends IHookFunctionsBase {
	helpers: {
		request: requestPromise.RequestPromiseAPI,
		requestOAuth2(this: IAllExecuteFunctions, credentialsType: string, requestOptions: OptionsWithUri | requestPromise.RequestPromiseOptions, oAuth2Options?: IOAuth2Options): Promise<any>, // tslint:disable-line:no-any
		requestOAuth1(this: IAllExecuteFunctions, credentialsType: string, requestOptions: OptionsWithUrl | requestPromise.RequestPromiseOptions): Promise<any>, // tslint:disable-line:no-any
	};
}


export interface IWebhookFunctions extends IWebhookFunctionsBase {
	helpers: {
		prepareBinaryData(binaryData: Buffer, filePath?: string, mimeType?: string): Promise<IBinaryData>;
		request: requestPromise.RequestPromiseAPI,
		requestOAuth2(this: IAllExecuteFunctions, credentialsType: string, requestOptions: OptionsWithUri | requestPromise.RequestPromiseOptions, oAuth2Options?: IOAuth2Options): Promise<any>, // tslint:disable-line:no-any
		requestOAuth1(this: IAllExecuteFunctions, credentialsType: string, requestOptions: OptionsWithUrl | requestPromise.RequestPromiseOptions): Promise<any>, // tslint:disable-line:no-any
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


export interface IWorkflowData {
	pollResponses?: IPollResponse[];
	triggerResponses?: ITriggerResponse[];
}
