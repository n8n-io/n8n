import type { Result } from '@n8n/utils/result';
import type {
	EnvProviderState,
	IExecuteData,
	IExecuteFunctions,
	INode,
	INodeExecutionData,
	INodeParameters,
	IRunExecutionData,
	ITaskDataConnections,
	IWorkflowExecuteAdditionalData,
	Workflow,
	WorkflowExecuteMode,
} from 'n8n-workflow';

/** One code task, for example the code of a Code node, and the execution context it runs in. */
export interface CodeTaskRequest {
	additionalData: IWorkflowExecuteAdditionalData;
	/** The language of the task, for example `javascript` or `python`. */
	taskType: string;
	settings: unknown;
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
}

/** Builds a code task request from the arguments of `IWorkflowExecuteAdditionalData.startRunnerTask`. */
export function toCodeTaskRequest(
	...[
		additionalData,
		taskType,
		settings,
		executeFunctions,
		inputData,
		node,
		workflow,
		runExecutionData,
		runIndex,
		itemIndex,
		activeNodeName,
		connectionInputData,
		siblingParameters,
		mode,
		envProviderState,
		executeData,
	]: Parameters<IWorkflowExecuteAdditionalData['startRunnerTask']>
): CodeTaskRequest {
	return {
		additionalData,
		taskType,
		settings,
		executeFunctions,
		inputData,
		node,
		workflow,
		runExecutionData,
		runIndex,
		itemIndex,
		activeNodeName,
		connectionInputData,
		siblingParameters,
		mode,
		envProviderState,
		executeData,
	};
}

export type CodeExecutionBackendStatus =
	| { available: true }
	| { available: false; reason?: string };

/**
 * Runs code tasks, for example for the Code node. Task runners are the default
 * implementation. An implementation sets itself as the instance of this class.
 */
export abstract class CodeExecutionBackend {
	abstract runTask<T, E = unknown>(request: CodeTaskRequest): Promise<Result<T, E>>;

	/** Tells if the backend can run tasks of this type, for example `python`. */
	abstract getStatus(taskType: string): CodeExecutionBackendStatus;
}
