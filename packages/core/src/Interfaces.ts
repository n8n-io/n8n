/* eslint-disable @typescript-eslint/no-explicit-any */
import {
	IAllExecuteFunctions,
	IBinaryData,
	ICredentialTestFunctions as ICredentialTestFunctionsBase,
	ICredentialType,
	IDataObject,
	IExecuteFunctions as IExecuteFunctionsBase,
	IExecuteSingleFunctions as IExecuteSingleFunctionsBase,
	IHookFunctions as IHookFunctionsBase,
	IHttpRequestOptions,
	ILoadOptionsFunctions as ILoadOptionsFunctionsBase,
	INodeExecutionData,
	INodeType,
	IOAuth2Options,
	IPollFunctions as IPollFunctionsBase,
	IPollResponse,
	IRunExecutionData,
	ITriggerFunctions as ITriggerFunctionsBase,
	ITriggerResponse,
	IWebhookFunctions as IWebhookFunctionsBase,
	IWorkflowBase as IWorkflowBaseWorkflow,
	IWorkflowSettings as IWorkflowSettingsWorkflow,
	WorkflowExecuteMode,
} from 'n8n-workflow';

import { OptionsWithUri, OptionsWithUrl } from 'request';
import * as requestPromise from 'request-promise-native';

interface Constructable<T> {
	new (): T;
}

export interface IProcessMessage {
	data?: any;
	type: string;
}

export interface IExecuteFunctions extends IExecuteFunctionsBase {
	helpers: {
		httpRequest(requestOptions: IHttpRequestOptions): Promise<any>; // tslint:disable-line:no-any
		prepareBinaryData(
			binaryData: Buffer,
			filePath?: string,
			mimeType?: string,
		): Promise<IBinaryData>;
		getBinaryDataBuffer(itemIndex: number, propertyName: string): Promise<Buffer>;
		request: (uriOrObject: string | IDataObject | any, options?: IDataObject) => Promise<any>; // tslint:disable-line:no-any
		requestOAuth2(
			this: IAllExecuteFunctions,
			credentialsType: string,
			requestOptions: OptionsWithUri | requestPromise.RequestPromiseOptions,
			oAuth2Options?: IOAuth2Options,
		): Promise<any>; // tslint:disable-line:no-any
		requestOAuth1(
			this: IAllExecuteFunctions,
			credentialsType: string,
			requestOptions: OptionsWithUrl | requestPromise.RequestPromiseOptions,
		): Promise<any>; // tslint:disable-line:no-any
		returnJsonArray(jsonData: IDataObject | IDataObject[]): INodeExecutionData[];
	};
}

export interface IExecuteSingleFunctions extends IExecuteSingleFunctionsBase {
	helpers: {
		httpRequest(requestOptions: IHttpRequestOptions): Promise<any>; // tslint:disable-line:no-any
		prepareBinaryData(
			binaryData: Buffer,
			filePath?: string,
			mimeType?: string,
		): Promise<IBinaryData>;
		request: (uriOrObject: string | IDataObject | any, options?: IDataObject) => Promise<any>; // tslint:disable-line:no-any
		requestOAuth2(
			this: IAllExecuteFunctions,
			credentialsType: string,
			requestOptions: OptionsWithUri | requestPromise.RequestPromiseOptions,
			oAuth2Options?: IOAuth2Options,
		): Promise<any>; // tslint:disable-line:no-any
		requestOAuth1(
			this: IAllExecuteFunctions,
			credentialsType: string,
			requestOptions: OptionsWithUrl | requestPromise.RequestPromiseOptions,
		): Promise<any>; // tslint:disable-line:no-any
	};
}

export interface IPollFunctions extends IPollFunctionsBase {
	helpers: {
		httpRequest(requestOptions: IHttpRequestOptions): Promise<any>; // tslint:disable-line:no-any
		prepareBinaryData(
			binaryData: Buffer,
			filePath?: string,
			mimeType?: string,
		): Promise<IBinaryData>;
		request: (uriOrObject: string | IDataObject | any, options?: IDataObject) => Promise<any>; // tslint:disable-line:no-any
		requestOAuth2(
			this: IAllExecuteFunctions,
			credentialsType: string,
			requestOptions: OptionsWithUri | requestPromise.RequestPromiseOptions,
			oAuth2Options?: IOAuth2Options,
		): Promise<any>; // tslint:disable-line:no-any
		requestOAuth1(
			this: IAllExecuteFunctions,
			credentialsType: string,
			requestOptions: OptionsWithUrl | requestPromise.RequestPromiseOptions,
		): Promise<any>; // tslint:disable-line:no-any
		returnJsonArray(jsonData: IDataObject | IDataObject[]): INodeExecutionData[];
	};
}

export interface IResponseError extends Error {
	statusCode?: number;
}

export interface ITriggerFunctions extends ITriggerFunctionsBase {
	helpers: {
		httpRequest(requestOptions: IHttpRequestOptions): Promise<any>; // tslint:disable-line:no-any
		prepareBinaryData(
			binaryData: Buffer,
			filePath?: string,
			mimeType?: string,
		): Promise<IBinaryData>;
		request: (uriOrObject: string | IDataObject | any, options?: IDataObject) => Promise<any>; // tslint:disable-line:no-any
		requestOAuth2(
			this: IAllExecuteFunctions,
			credentialsType: string,
			requestOptions: OptionsWithUri | requestPromise.RequestPromiseOptions,
			oAuth2Options?: IOAuth2Options,
		): Promise<any>; // tslint:disable-line:no-any
		requestOAuth1(
			this: IAllExecuteFunctions,
			credentialsType: string,
			requestOptions: OptionsWithUrl | requestPromise.RequestPromiseOptions,
		): Promise<any>; // tslint:disable-line:no-any
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
	instanceId?: string;
}

export interface ILoadOptionsFunctions extends ILoadOptionsFunctionsBase {
	helpers: {
		httpRequest(requestOptions: IHttpRequestOptions): Promise<any>; // tslint:disable-line:no-any
		request?: (uriOrObject: string | IDataObject | any, options?: IDataObject) => Promise<any>; // tslint:disable-line:no-any
		requestOAuth2?: (
			this: IAllExecuteFunctions,
			credentialsType: string,
			requestOptions: OptionsWithUri | requestPromise.RequestPromiseOptions,
			oAuth2Options?: IOAuth2Options,
		) => Promise<any>; // tslint:disable-line:no-any
		requestOAuth1?(
			this: IAllExecuteFunctions,
			credentialsType: string,
			requestOptions: OptionsWithUrl | requestPromise.RequestPromiseOptions,
		): Promise<any>; // tslint:disable-line:no-any
	};
}

export interface ICredentialTestFunctions extends ICredentialTestFunctionsBase {
	helpers: {
		request: requestPromise.RequestPromiseAPI;
	};
}

export interface IHookFunctions extends IHookFunctionsBase {
	helpers: {
		httpRequest(requestOptions: IHttpRequestOptions): Promise<any>; // tslint:disable-line:no-any
		request: (uriOrObject: string | IDataObject | any, options?: IDataObject) => Promise<any>; // tslint:disable-line:no-any
		requestOAuth2(
			this: IAllExecuteFunctions,
			credentialsType: string,
			requestOptions: OptionsWithUri | requestPromise.RequestPromiseOptions,
			oAuth2Options?: IOAuth2Options,
		): Promise<any>; // tslint:disable-line:no-any
		requestOAuth1(
			this: IAllExecuteFunctions,
			credentialsType: string,
			requestOptions: OptionsWithUrl | requestPromise.RequestPromiseOptions,
		): Promise<any>; // tslint:disable-line:no-any
	};
}

export interface IWebhookFunctions extends IWebhookFunctionsBase {
	helpers: {
		httpRequest(requestOptions: IHttpRequestOptions): Promise<any>; // tslint:disable-line:no-any
		prepareBinaryData(
			binaryData: Buffer,
			filePath?: string,
			mimeType?: string,
		): Promise<IBinaryData>;
		request: (uriOrObject: string | IDataObject | any, options?: IDataObject) => Promise<any>; // tslint:disable-line:no-any
		requestOAuth2(
			this: IAllExecuteFunctions,
			credentialsType: string,
			requestOptions: OptionsWithUri | requestPromise.RequestPromiseOptions,
			oAuth2Options?: IOAuth2Options,
		): Promise<any>; // tslint:disable-line:no-any
		requestOAuth1(
			this: IAllExecuteFunctions,
			credentialsType: string,
			requestOptions: OptionsWithUrl | requestPromise.RequestPromiseOptions,
		): Promise<any>; // tslint:disable-line:no-any
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

export interface IBinaryDataConfig {
	mode: 'IN_MEMORY' | 'FILESYSTEM';
	localStoragePath: string;
	binaryDataTTL: number;
}

export interface IExecutionBase {
	id?: number | string;
	mode: WorkflowExecuteMode;
	startedAt: Date;
	stoppedAt?: Date; // empty value means execution is still running
	workflowId?: string; // To be able to filter executions easily //
	finished: boolean;
	retryOf?: number | string; // If it is a retry, the id of the execution it is a retry of.
	retrySuccessId?: number | string; // If it failed and a retry did succeed. The id of the successful retry.
}

export interface IWorkflowBase extends IWorkflowBaseWorkflow {
	id?: number | string;
}

export interface IExecutionFlattedDb extends IExecutionBase {
	id: number | string;
	data: string;
	waitTill?: Date | null;
	workflowData: IWorkflowBase;
}

export interface IExecutionResponse extends IExecutionBase {
	id: string;
	data: IRunExecutionData;
	retryOf?: string;
	retrySuccessId?: string;
	waitTill?: Date;
	workflowData: IWorkflowBase;
}

export interface IBinaryDataManagerOptions {
	clearOldData: boolean;
}

export interface IBinaryDataManager {
	init(config: IBinaryDataConfig, startPurger: boolean): Promise<void>;
	storeBinaryData(binaryData: IBinaryData, binaryBuffer: Buffer): Promise<IBinaryData>;
	retrieveBinaryDataByIdentifier(identifier: string): Promise<Buffer>;
	markDataForDeletion(identifiers: string[]): Promise<void>;
	deleteMarkedFiles(): Promise<unknown>;
	deleteBinaryDataByIdentifier(identifier: string): Promise<void>;
	duplicateBinaryDataByIdentifier(identifier: string): Promise<string>;
}
