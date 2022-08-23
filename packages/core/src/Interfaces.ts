/* eslint-disable @typescript-eslint/no-explicit-any */
import {
	IAdditionalCredentialOptions,
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
	ITriggerFunctions as ITriggerFunctionsBase,
	ITriggerResponse,
	IWebhookFunctions as IWebhookFunctionsBase,
	IWorkflowSettings as IWorkflowSettingsWorkflow,
} from 'n8n-workflow';

import { OptionsWithUri, OptionsWithUrl } from 'request';
import requestPromise from 'request-promise-native';

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
		requestWithAuthentication(
			this: IAllExecuteFunctions,
			credentialsType: string,
			requestOptions: OptionsWithUri | requestPromise.RequestPromiseOptions,
			additionalCredentialOptions?: IAdditionalCredentialOptions,
		): Promise<any>;
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
		normalizeItems(items: INodeExecutionData | INodeExecutionData[]): INodeExecutionData[];
		httpRequestWithAuthentication(
			this: IAllExecuteFunctions,
			credentialsType: string,
			requestOptions: IHttpRequestOptions,
		): Promise<any>;
	};
}

export interface IExecuteSingleFunctions extends IExecuteSingleFunctionsBase {
	helpers: {
		getBinaryDataBuffer(propertyName: string, inputIndex?: number): Promise<Buffer>;
		httpRequest(requestOptions: IHttpRequestOptions): Promise<any>; // tslint:disable-line:no-any
		prepareBinaryData(
			binaryData: Buffer,
			filePath?: string,
			mimeType?: string,
		): Promise<IBinaryData>;
		request: (uriOrObject: string | IDataObject | any, options?: IDataObject) => Promise<any>; // tslint:disable-line:no-any
		requestWithAuthentication(
			this: IAllExecuteFunctions,
			credentialsType: string,
			requestOptions: OptionsWithUri | requestPromise.RequestPromiseOptions,
			additionalCredentialOptions?: IAdditionalCredentialOptions,
		): Promise<any>;
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
		httpRequestWithAuthentication(
			this: IAllExecuteFunctions,
			credentialsType: string,
			requestOptions: IHttpRequestOptions,
		): Promise<any>;
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
		requestWithAuthentication(
			this: IAllExecuteFunctions,
			credentialsType: string,
			requestOptions: OptionsWithUri | requestPromise.RequestPromiseOptions,
			additionalCredentialOptions?: IAdditionalCredentialOptions,
		): Promise<any>;
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
		httpRequestWithAuthentication(
			this: IAllExecuteFunctions,
			credentialsType: string,
			requestOptions: IHttpRequestOptions,
		): Promise<any>;
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
		requestWithAuthentication(
			this: IAllExecuteFunctions,
			credentialsType: string,
			requestOptions: OptionsWithUri | requestPromise.RequestPromiseOptions,
			additionalCredentialOptions?: IAdditionalCredentialOptions,
		): Promise<any>;
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
		httpRequestWithAuthentication(
			this: IAllExecuteFunctions,
			credentialsType: string,
			requestOptions: IHttpRequestOptions,
		): Promise<any>;
	};
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
		requestWithAuthentication(
			this: IAllExecuteFunctions,
			credentialsType: string,
			requestOptions: OptionsWithUri | requestPromise.RequestPromiseOptions,
			additionalCredentialOptions?: IAdditionalCredentialOptions,
		): Promise<any>;
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
		httpRequestWithAuthentication(
			this: IAllExecuteFunctions,
			credentialsType: string,
			requestOptions: IHttpRequestOptions,
		): Promise<any>;
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
		requestWithAuthentication(
			this: IAllExecuteFunctions,
			credentialsType: string,
			requestOptions: OptionsWithUri | requestPromise.RequestPromiseOptions,
			additionalCredentialOptions?: IAdditionalCredentialOptions,
		): Promise<any>;
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
		httpRequestWithAuthentication(
			this: IAllExecuteFunctions,
			credentialsType: string,
			requestOptions: IHttpRequestOptions,
		): Promise<any>;
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
		requestWithAuthentication(
			this: IAllExecuteFunctions,
			credentialsType: string,
			requestOptions: OptionsWithUri | requestPromise.RequestPromiseOptions,
			additionalCredentialOptions?: IAdditionalCredentialOptions,
		): Promise<any>;
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
		httpRequestWithAuthentication(
			this: IAllExecuteFunctions,
			credentialsType: string,
			requestOptions: IHttpRequestOptions,
		): Promise<any>;
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
	mode: 'default' | 'filesystem';
	availableModes: string;
	localStoragePath: string;
	binaryDataTTL: number;
	persistedBinaryDataTTL: number;
}

export interface IBinaryDataManager {
	init(startPurger: boolean): Promise<void>;
	storeBinaryData(binaryBuffer: Buffer, executionId: string): Promise<string>;
	retrieveBinaryDataByIdentifier(identifier: string): Promise<Buffer>;
	markDataForDeletionByExecutionId(executionId: string): Promise<void>;
	deleteMarkedFiles(): Promise<unknown>;
	deleteBinaryDataByIdentifier(identifier: string): Promise<void>;
	duplicateBinaryDataByIdentifier(binaryDataId: string, prefix: string): Promise<string>;
	deleteBinaryDataByExecutionId(executionId: string): Promise<void>;
	persistBinaryDataForExecutionId(executionId: string): Promise<void>;
}
