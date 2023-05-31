import type { Readable } from 'stream';
import type {
	IPollResponse,
	ITriggerResponse,
	IWorkflowSettings as IWorkflowSettingsWorkflow,
	IExecuteFunctions as IExecuteFunctionsBase,
	IExecuteSingleFunctions as IExecuteSingleFunctionsBase,
	IHookFunctions as IHookFunctionsBase,
	ILoadOptionsFunctions as ILoadOptionsFunctionsBase,
	INode,
	IPollFunctions as IPollFunctionsBase,
	ITriggerFunctions as ITriggerFunctionsBase,
	IWebhookFunctions as IWebhookFunctionsBase,
	BinaryMetadata,
	ProcessedDataContext,
	ProcessedDataItemTypes,
	ICheckProcessedOutput,
	ICheckProcessedOptions,
	ValidationResult,
} from 'n8n-workflow';

// TODO: remove these after removing `n8n-core` dependency from `nodes-bases`
export type IExecuteFunctions = IExecuteFunctionsBase;
export type IExecuteSingleFunctions = IExecuteSingleFunctionsBase;
export type IHookFunctions = IHookFunctionsBase;
export type ILoadOptionsFunctions = ILoadOptionsFunctionsBase;
export type IPollFunctions = IPollFunctionsBase;
export type ITriggerFunctions = ITriggerFunctionsBase;
export type IWebhookFunctions = IWebhookFunctionsBase;

export interface IProcessMessage {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	data?: any;
	type: string;
}

export interface IResponseError extends Error {
	statusCode?: number;
}

export interface IUserSettings {
	encryptionKey?: string;
	tunnelSubdomain?: string;
	instanceId?: string;
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
	getFileSize(filePath: string): Promise<number>;
	copyBinaryFile(filePath: string, executionId: string): Promise<string>;
	storeBinaryMetadata(identifier: string, metadata: BinaryMetadata): Promise<void>;
	getBinaryMetadata(identifier: string): Promise<BinaryMetadata>;
	storeBinaryData(binaryData: Buffer | Readable, executionId: string): Promise<string>;
	retrieveBinaryDataByIdentifier(identifier: string): Promise<Buffer>;
	getBinaryPath(identifier: string): string;
	getBinaryStream(identifier: string, chunkSize?: number): Readable;
	markDataForDeletionByExecutionId(executionId: string): Promise<void>;
	deleteMarkedFiles(): Promise<unknown>;
	deleteBinaryDataByIdentifier(identifier: string): Promise<void>;
	duplicateBinaryDataByIdentifier(binaryDataId: string, prefix: string): Promise<string>;
	deleteBinaryDataByExecutionId(executionId: string): Promise<void>;
	persistBinaryDataForExecutionId(executionId: string): Promise<void>;
}

export interface IProcessedDataConfig {
	availableModes: string;
	mode: string;
}

export interface IProcessedDataManager {
	init(): Promise<void>;
	checkProcessed(
		items: ProcessedDataItemTypes[],
		context: ProcessedDataContext,
		contextData: ICheckProcessedContextData,
		options: ICheckProcessedOptions,
	): Promise<ICheckProcessedOutput>;

	checkProcessedAndRecord(
		items: ProcessedDataItemTypes[],
		context: ProcessedDataContext,
		contextData: ICheckProcessedContextData,
		options: ICheckProcessedOptions,
	): Promise<ICheckProcessedOutput>;

	removeProcessed(
		items: ProcessedDataItemTypes[],
		context: ProcessedDataContext,
		contextData: ICheckProcessedContextData,
		options: ICheckProcessedOptions,
	): Promise<void>;
}

export interface IProcessedDataManagers {
	[key: string]: IProcessedDataManager;
}

export interface ICheckProcessedContextData {
	node?: INode;
	workflow: {
		id?: number | string;
		active: boolean;
	};
}

export namespace n8n {
	export interface PackageJson {
		name: string;
		version: string;
		n8n?: {
			credentials?: string[];
			nodes?: string[];
		};
		author?: {
			name?: string;
			email?: string;
		};
	}
}

export type ExtendedValidationResult = Partial<ValidationResult> & { fieldName?: string };
