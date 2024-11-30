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

export const RPC_ALLOW_LIST = [
	'helpers.httpRequestWithAuthentication',
	'helpers.requestWithAuthenticationPaginated',
	// "helpers.normalizeItems"
	// "helpers.constructExecutionMetaData"
	// "helpers.assertBinaryData"
	'helpers.getBinaryDataBuffer',
	// "helpers.copyInputItems"
	// "helpers.returnJsonArray"
	'helpers.getSSHClient',
	'helpers.createReadStream',
	// "helpers.getStoragePath"
	'helpers.writeContentToFile',
	'helpers.prepareBinaryData',
	'helpers.setBinaryDataBuffer',
	'helpers.copyBinaryFile',
	'helpers.binaryToBuffer',
	// "helpers.binaryToString"
	// "helpers.getBinaryPath"
	'helpers.getBinaryStream',
	'helpers.getBinaryMetadata',
	'helpers.createDeferredPromise',
	'helpers.httpRequest',
	'logNodeOutput',
] as const;

/** Node types needed for the runner to execute a task. */
export type NeededNodeType = { name: string; version: number };
