import type {
	IExecuteFunctions,
	Workflow,
	IRunExecutionData,
	INodeExecutionData,
	ITaskDataConnections,
	INode,
	IWorkflowExecuteAdditionalData,
	WorkflowExecuteMode,
	INodeParameters,
	IExecuteData,
	IDataObject,
	Result,
} from 'n8n-workflow';
import { createEnvProviderState } from 'n8n-workflow';

export const createAgentStartJob = (
	additionalData: IWorkflowExecuteAdditionalData,
	inputData: ITaskDataConnections,
	node: INode,
	workflow: Workflow,
	runExecutionData: IRunExecutionData,
	runIndex: number,
	activeNodeName: string,
	connectionInputData: INodeExecutionData[],
	siblingParameters: INodeParameters,
	mode: WorkflowExecuteMode,
	executeData?: IExecuteData,
	defaultReturnRunIndex?: number,
	selfData?: IDataObject,
	contextNodeName?: string,
): IExecuteFunctions['startJob'] => {
	return async function startJob<T = unknown, E = unknown>(
		this: IExecuteFunctions,
		jobType: string,
		settings: unknown,
		itemIndex: number,
	): Promise<Result<T, E>> {
		return await additionalData.startAgentJob<T, E>(
			additionalData,
			jobType,
			settings,
			this,
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
			createEnvProviderState(),
			executeData,
			defaultReturnRunIndex,
			selfData,
			contextNodeName,
		);
	};
};
