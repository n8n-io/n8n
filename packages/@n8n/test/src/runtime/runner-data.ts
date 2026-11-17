import type { DataRequestResponse, TaskData, TaskDataRequestParams } from '@n8n/task-runner';
import type { EnvProviderState, IRunExecutionData, ITaskDataConnections } from 'n8n-workflow';
import { createRunExecutionData } from 'n8n-workflow';

export function toDataResponse(data: TaskData, params: TaskDataRequestParams): DataRequestResponse {
	const { workflow, additionalData } = data;
	return {
		workflow: {
			id: workflow.id,
			name: workflow.name,
			active: workflow.active,
			connections: workflow.connectionsBySourceNode,
			nodes: Object.values(workflow.nodes),
			pinData: workflow.pinData,
			settings: workflow.settings,
			staticData: workflow.staticData,
		},
		inputData: stripInputData(data.inputData, params),
		connectionInputSource: data.executeData?.source ?? null,
		itemIndex: data.itemIndex,
		activeNodeName: data.activeNodeName,
		contextNodeName: data.contextNodeName,
		defaultReturnRunIndex: data.defaultReturnRunIndex,
		mode: data.mode,
		envProviderState: stripEnv(data.envProviderState, params),
		node: data.node,
		runExecutionData: stripRunExecutionData(data, params),
		runIndex: data.runIndex,
		selfData: data.selfData,
		siblingParameters: data.siblingParameters,
		additionalData: {
			formWaitingBaseUrl: additionalData.formWaitingBaseUrl,
			instanceBaseUrl: additionalData.instanceBaseUrl,
			restApiUrl: additionalData.restApiUrl,
			variables: additionalData.variables,
			webhookBaseUrl: additionalData.webhookBaseUrl,
			webhookTestBaseUrl: additionalData.webhookTestBaseUrl,
			webhookWaitingBaseUrl: additionalData.webhookWaitingBaseUrl,
			currentNodeParameters: additionalData.currentNodeParameters,
			executionId: additionalData.executionId,
			executionTimeoutTimestamp: additionalData.executionTimeoutTimestamp,
			restartExecutionId: additionalData.restartExecutionId,
			userId: additionalData.userId,
			evaluationRunId: additionalData.evaluationRunId,
		},
	};
}

function stripInputData(
	inputData: ITaskDataConnections,
	{ input }: TaskDataRequestParams,
): ITaskDataConnections {
	if (!input.include) return {};
	const items = inputData.main?.[0];
	if (!input.chunk || !items) return inputData;
	const { startIndex, count } = input.chunk;
	return { ...inputData, main: [items.slice(startIndex, startIndex + count)] };
}

function stripEnv(state: EnvProviderState, params: TaskDataRequestParams): EnvProviderState {
	if (params.env) return state;
	return {
		env: {},
		isEnvAccessBlocked: state.isEnvAccessBlocked,
		isProcessAvailable: state.isProcessAvailable,
	};
}

function stripRunExecutionData(data: TaskData, params: TaskDataRequestParams): IRunExecutionData {
	const { startData, resultData, executionData, resumeToken } = data.runExecutionData;
	const nodeData = executionData && {
		contextData: executionData.contextData,
		metadata: executionData.metadata,
		nodeExecutionStack: [],
		waitingExecution: {},
		waitingExecutionSource: null,
	};
	if (params.dataOfNodes === 'all') {
		return createRunExecutionData({ startData, resultData, executionData: nodeData, resumeToken });
	}

	const names = new Set([...params.dataOfNodes, previousNodeName(data, params)]);
	const ofRequestedNodes = <T>(byNode: Record<string, T>) =>
		Object.fromEntries(Object.entries(byNode).filter(([name]) => names.has(name)));
	return createRunExecutionData({
		startData,
		resultData: {
			error: resultData.error,
			lastNodeExecuted: resultData.lastNodeExecuted,
			metadata: resultData.metadata,
			runData: ofRequestedNodes(resultData.runData),
			pinData: resultData.pinData && ofRequestedNodes(resultData.pinData),
		},
		executionData: nodeData,
		resumeToken,
	});
}

function previousNodeName(data: TaskData, params: TaskDataRequestParams) {
	if (!params.prevNode) return '';
	return data.executeData?.source?.main?.[0]?.previousNode ?? '';
}
