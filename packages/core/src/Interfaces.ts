/* eslint-disable @typescript-eslint/no-explicit-any */
import {
	IAdditionalCredentialOptions,
	IAllExecuteFunctions,
	IBinaryData,
	ICredentialTestFunctions as ICredentialTestFunctionsBase,
	IDataObject,
	IExecuteFunctions as IExecuteFunctionsBase,
	IExecuteSingleFunctions as IExecuteSingleFunctionsBase,
	IHookFunctions as IHookFunctionsBase,
	IHttpRequestOptions,
	ILoadOptionsFunctions as ILoadOptionsFunctionsBase,
	INodeExecutionData,
	IOAuth2Options,
	IPairedItemData,
	IPollFunctions as IPollFunctionsBase,
	IPollResponse,
	ITriggerFunctions as ITriggerFunctionsBase,
	ITriggerResponse,
	IWebhookFunctions as IWebhookFunctionsBase,
	IWorkflowSettings as IWorkflowSettingsWorkflow,
	NodeExecutionWithMetadata,
} from 'n8n-workflow';

import type { OptionsWithUri, OptionsWithUrl } from 'request';
import type { RequestPromiseAPI, RequestPromiseOptions } from 'request-promise-native';

export interface IProcessMessage {
	data?: any;
	type: string;
}

export interface IExecuteFunctions extends IExecuteFunctionsBase {
	helpers: {
		httpRequest(requestOptions: IHttpRequestOptions): Promise<any>;
		prepareBinaryData(
			binaryData: Buffer,
			filePath?: string,
			mimeType?: string,
		): Promise<IBinaryData>;
		getBinaryDataBuffer(itemIndex: number, propertyName: string): Promise<Buffer>;
		setBinaryDataBuffer(data: IBinaryData, binaryData: Buffer): Promise<IBinaryData>;
		request: (uriOrObject: string | IDataObject | any, options?: IDataObject) => Promise<any>;
		requestWithAuthentication(
			this: IAllExecuteFunctions,
			credentialsType: string,
			requestOptions: OptionsWithUri | RequestPromiseOptions,
			additionalCredentialOptions?: IAdditionalCredentialOptions,
		): Promise<any>;
		requestOAuth2(
			this: IAllExecuteFunctions,
			credentialsType: string,
			requestOptions: OptionsWithUri | RequestPromiseOptions,
			oAuth2Options?: IOAuth2Options,
		): Promise<any>;
		requestOAuth1(
			this: IAllExecuteFunctions,
			credentialsType: string,
			requestOptions: OptionsWithUrl | RequestPromiseOptions,
		): Promise<any>;
		returnJsonArray(jsonData: IDataObject | IDataObject[]): INodeExecutionData[];
		normalizeItems(items: INodeExecutionData | INodeExecutionData[]): INodeExecutionData[];
		httpRequestWithAuthentication(
			this: IAllExecuteFunctions,
			credentialsType: string,
			requestOptions: IHttpRequestOptions,
		): Promise<any>;
		constructExecutionMetaData(
			inputData: INodeExecutionData[],
			options: { itemData: IPairedItemData | IPairedItemData[] },
		): NodeExecutionWithMetadata[];
	};
}

export interface IExecuteSingleFunctions extends IExecuteSingleFunctionsBase {
	helpers: {
		getBinaryDataBuffer(propertyName: string, inputIndex?: number): Promise<Buffer>;
		setBinaryDataBuffer(data: IBinaryData, binaryData: Buffer): Promise<IBinaryData>;
		httpRequest(requestOptions: IHttpRequestOptions): Promise<any>;
		prepareBinaryData(
			binaryData: Buffer,
			filePath?: string,
			mimeType?: string,
		): Promise<IBinaryData>;
		request: (uriOrObject: string | IDataObject | any, options?: IDataObject) => Promise<any>;
		requestWithAuthentication(
			this: IAllExecuteFunctions,
			credentialsType: string,
			requestOptions: OptionsWithUri | RequestPromiseOptions,
			additionalCredentialOptions?: IAdditionalCredentialOptions,
		): Promise<any>;
		requestOAuth2(
			this: IAllExecuteFunctions,
			credentialsType: string,
			requestOptions: OptionsWithUri | RequestPromiseOptions,
			oAuth2Options?: IOAuth2Options,
		): Promise<any>;
		requestOAuth1(
			this: IAllExecuteFunctions,
			credentialsType: string,
			requestOptions: OptionsWithUrl | RequestPromiseOptions,
		): Promise<any>;
		httpRequestWithAuthentication(
			this: IAllExecuteFunctions,
			credentialsType: string,
			requestOptions: IHttpRequestOptions,
		): Promise<any>;
	};
}

export interface IPollFunctions extends IPollFunctionsBase {
	helpers: {
		httpRequest(requestOptions: IHttpRequestOptions): Promise<any>;
		prepareBinaryData(
			binaryData: Buffer,
			filePath?: string,
			mimeType?: string,
		): Promise<IBinaryData>;
		request: (uriOrObject: string | IDataObject | any, options?: IDataObject) => Promise<any>;
		requestWithAuthentication(
			this: IAllExecuteFunctions,
			credentialsType: string,
			requestOptions: OptionsWithUri | RequestPromiseOptions,
			additionalCredentialOptions?: IAdditionalCredentialOptions,
		): Promise<any>;
		requestOAuth2(
			this: IAllExecuteFunctions,
			credentialsType: string,
			requestOptions: OptionsWithUri | RequestPromiseOptions,
			oAuth2Options?: IOAuth2Options,
		): Promise<any>;
		requestOAuth1(
			this: IAllExecuteFunctions,
			credentialsType: string,
			requestOptions: OptionsWithUrl | RequestPromiseOptions,
		): Promise<any>;
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
		httpRequest(requestOptions: IHttpRequestOptions): Promise<any>;
		prepareBinaryData(
			binaryData: Buffer,
			filePath?: string,
			mimeType?: string,
		): Promise<IBinaryData>;
		request: (uriOrObject: string | IDataObject | any, options?: IDataObject) => Promise<any>;
		requestWithAuthentication(
			this: IAllExecuteFunctions,
			credentialsType: string,
			requestOptions: OptionsWithUri | RequestPromiseOptions,
			additionalCredentialOptions?: IAdditionalCredentialOptions,
		): Promise<any>;
		requestOAuth2(
			this: IAllExecuteFunctions,
			credentialsType: string,
			requestOptions: OptionsWithUri | RequestPromiseOptions,
			oAuth2Options?: IOAuth2Options,
		): Promise<any>;
		requestOAuth1(
			this: IAllExecuteFunctions,
			credentialsType: string,
			requestOptions: OptionsWithUrl | RequestPromiseOptions,
		): Promise<any>;
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
		httpRequest(requestOptions: IHttpRequestOptions): Promise<any>;
		request?: (uriOrObject: string | IDataObject | any, options?: IDataObject) => Promise<any>;
		requestWithAuthentication(
			this: IAllExecuteFunctions,
			credentialsType: string,
			requestOptions: OptionsWithUri | RequestPromiseOptions,
			additionalCredentialOptions?: IAdditionalCredentialOptions,
		): Promise<any>;
		requestOAuth2?: (
			this: IAllExecuteFunctions,
			credentialsType: string,
			requestOptions: OptionsWithUri | RequestPromiseOptions,
			oAuth2Options?: IOAuth2Options,
		) => Promise<any>;
		requestOAuth1?(
			this: IAllExecuteFunctions,
			credentialsType: string,
			requestOptions: OptionsWithUrl | RequestPromiseOptions,
		): Promise<any>;
		httpRequestWithAuthentication(
			this: IAllExecuteFunctions,
			credentialsType: string,
			requestOptions: IHttpRequestOptions,
		): Promise<any>;
	};
}

export interface ICredentialTestFunctions extends ICredentialTestFunctionsBase {
	helpers: {
		request: RequestPromiseAPI;
	};
}

export interface IHookFunctions extends IHookFunctionsBase {
	helpers: {
		httpRequest(requestOptions: IHttpRequestOptions): Promise<any>;
		request: (uriOrObject: string | IDataObject | any, options?: IDataObject) => Promise<any>;
		requestWithAuthentication(
			this: IAllExecuteFunctions,
			credentialsType: string,
			requestOptions: OptionsWithUri | RequestPromiseOptions,
			additionalCredentialOptions?: IAdditionalCredentialOptions,
		): Promise<any>;
		requestOAuth2(
			this: IAllExecuteFunctions,
			credentialsType: string,
			requestOptions: OptionsWithUri | RequestPromiseOptions,
			oAuth2Options?: IOAuth2Options,
		): Promise<any>;
		requestOAuth1(
			this: IAllExecuteFunctions,
			credentialsType: string,
			requestOptions: OptionsWithUrl | RequestPromiseOptions,
		): Promise<any>;
		httpRequestWithAuthentication(
			this: IAllExecuteFunctions,
			credentialsType: string,
			requestOptions: IHttpRequestOptions,
		): Promise<any>;
	};
}

export interface IWebhookFunctions extends IWebhookFunctionsBase {
	helpers: {
		httpRequest(requestOptions: IHttpRequestOptions): Promise<any>;
		prepareBinaryData(
			binaryData: Buffer,
			filePath?: string,
			mimeType?: string,
		): Promise<IBinaryData>;
		request: (uriOrObject: string | IDataObject | any, options?: IDataObject) => Promise<any>;
		requestWithAuthentication(
			this: IAllExecuteFunctions,
			credentialsType: string,
			requestOptions: OptionsWithUri | RequestPromiseOptions,
			additionalCredentialOptions?: IAdditionalCredentialOptions,
		): Promise<any>;
		requestOAuth2(
			this: IAllExecuteFunctions,
			credentialsType: string,
			requestOptions: OptionsWithUri | RequestPromiseOptions,
			oAuth2Options?: IOAuth2Options,
		): Promise<any>;
		requestOAuth1(
			this: IAllExecuteFunctions,
			credentialsType: string,
			requestOptions: OptionsWithUrl | RequestPromiseOptions,
		): Promise<any>;
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
