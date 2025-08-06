import type {
	EnvProviderState,
	IDataObject,
	IExecuteData,
	IExecuteFunctions,
	INode,
	INodeExecutionData,
	INodeParameters,
	IRunExecutionData,
	ITaskDataConnections,
	ITaskDataConnectionsSource,
	IWorkflowExecuteAdditionalData,
	Workflow,
	WorkflowExecuteMode,
	WorkflowParameters,
} from 'n8n-workflow';

export interface InputDataChunkDefinition {
	startIndex: number;
	count: number;
}

export interface InputDataRequestParams {
	/** Whether to include the input data in the response */
	include: boolean;
	/** Optionally request only a specific chunk of data instead of all input data */
	chunk?: InputDataChunkDefinition;
}

/**
 * Specifies what data should be included for a task data request.
 */
export interface TaskDataRequestParams {
	dataOfNodes: string[] | 'all';
	prevNode: boolean;
	/** Whether input data for the node should be included */
	input: InputDataRequestParams;
	/** Whether env provider's state should be included */
	env: boolean;
}

export interface DataRequestResponse {
	workflow: Omit<WorkflowParameters, 'nodeTypes'>;
	inputData: ITaskDataConnections;
	connectionInputSource: ITaskDataConnectionsSource | null;
	node: INode;

	runExecutionData: IRunExecutionData;
	runIndex: number;
	itemIndex: number;
	activeNodeName: string;
	siblingParameters: INodeParameters;
	mode: WorkflowExecuteMode;
	envProviderState: EnvProviderState;
	defaultReturnRunIndex: number;
	selfData: IDataObject;
	contextNodeName: string;
	additionalData: PartialAdditionalData;
}

export interface TaskResultData {
	result: INodeExecutionData[];
	customData?: Record<string, string>;
	staticData?: IDataObject;
}

export interface TaskData {
	executeFunctions: IExecuteFunctions;
	inputData: ITaskDataConnections;
	node: INode;

	workflow: Workflow;
	runExecutionData: IRunExecutionData;
	runIndex: number;
	itemIndex: number;
	activeNodeName: string;
	connectionInputData: INodeExecutionData[];
	siblingParameters: INodeParameters;
	mode: WorkflowExecuteMode;
	envProviderState: EnvProviderState;
	executeData?: IExecuteData;
	defaultReturnRunIndex: number;
	selfData: IDataObject;
	contextNodeName: string;
	additionalData: IWorkflowExecuteAdditionalData;
}

export interface PartialAdditionalData {
	executionId?: string;
	restartExecutionId?: string;
	restApiUrl: string;
	instanceBaseUrl: string;
	formWaitingBaseUrl: string;
	webhookBaseUrl: string;
	webhookWaitingBaseUrl: string;
	webhookTestBaseUrl: string;
	currentNodeParameters?: INodeParameters;
	executionTimeoutTimestamp?: number;
	userId?: string;
	variables: IDataObject;
}

/** RPC methods that are exposed directly to the Code Node */
export const EXPOSED_RPC_METHODS = [
	// assertBinaryData(itemIndex: number, propertyName: string): Promise<IBinaryData>
	'helpers.assertBinaryData',

	// getBinaryDataBuffer(itemIndex: number, propertyName: string): Promise<Buffer>
	'helpers.getBinaryDataBuffer',

	// prepareBinaryData(binaryData: Buffer, fileName?: string, mimeType?: string): Promise<IBinaryData>
	'helpers.prepareBinaryData',

	// setBinaryDataBuffer(metadata: IBinaryData, buffer: Buffer): Promise<IBinaryData>
	'helpers.setBinaryDataBuffer',

	// binaryToString(body: Buffer, encoding?: string): string
	'helpers.binaryToString',

	// httpRequest(opts: IHttpRequestOptions): Promise<IN8nHttpFullResponse | IN8nHttpResponse>
	'helpers.httpRequest',

	// (deprecated) request(uriOrObject: string | IRequestOptions, options?: IRequestOptions): Promise<any>;
	'helpers.request',
];

/** Helpers that exist but that we are not exposing to the Code Node */
export const UNSUPPORTED_HELPER_FUNCTIONS = [
	// These rely on checking the credentials from the current node type (Code Node)
	// and hence they can't even work (Code Node doesn't have credentials)
	'helpers.httpRequestWithAuthentication',
	'helpers.requestWithAuthenticationPaginated',

	// This has been removed
	'helpers.copyBinaryFile',

	// We can't support streams over RPC without implementing it ourselves
	'helpers.createReadStream',
	'helpers.getBinaryStream',

	// Makes no sense to support this, as it returns either a stream or a buffer
	// and we can't support streams over RPC
	'helpers.binaryToBuffer',

	// These are pretty low-level, so we shouldn't expose them
	// (require binary data id, which we don't expose)
	'helpers.getBinaryMetadata',
	'helpers.getStoragePath',
	'helpers.getBinaryPath',

	// We shouldn't allow arbitrary FS writes
	'helpers.writeContentToFile',

	// Not something we need to expose. Can be done in the node itself
	// copyInputItems(items: INodeExecutionData[], properties: string[]): IDataObject[]
	'helpers.copyInputItems',

	// Code Node does these automatically already
	'helpers.returnJsonArray',
	'helpers.normalizeItems',

	// The client is instantiated and lives on the n8n instance, so we can't
	// expose it over RPC without implementing object marshalling
	'helpers.getSSHClient',

	// Doesn't make sense to expose
	'helpers.createDeferredPromise',
	'helpers.constructExecutionMetaData',
];

/** List of all RPC methods that task runner supports */
export const AVAILABLE_RPC_METHODS = [...EXPOSED_RPC_METHODS, 'logNodeOutput'] as const;

/** Node types needed for the runner to execute a task. */
export type NeededNodeType = { name: string; version: number };
