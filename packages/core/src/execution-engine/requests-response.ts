import { Container } from '@n8n/di';
import {
	type IConnection,
	type IExecuteData,
	type INode,
	type INodeExecutionData,
	type IRunData,
	type IRunNodeResponse,
	type ITaskMetadata,
	type EngineRequest,
	type Workflow,
	type EngineResponse,
	UnexpectedError,
} from 'n8n-workflow';

import { ErrorReporter } from '../errors/error-reporter';

type NodeToBeExecuted = {
	inputConnectionData: IConnection;
	parentOutputIndex: number;
	parentNode: string;
	parentOutputData: INodeExecutionData[][];
	runIndex: number;
	nodeRunIndex: number;
	metadata?: ITaskMetadata;
};

function prepareRequestedNodesForExecution(
	workflow: Workflow,
	currentNode: INode,
	request: EngineRequest,
	runIndex: number,
	runData: IRunData,
	executionData: IExecuteData,
) {
	// 1. collect nodes to be put on the stack
	const nodesToBeExecuted: NodeToBeExecuted[] = [];
	const subNodeExecutionData: ITaskMetadata['subNodeExecutionData'] = {
		actions: [],
		metadata: request.metadata,
	};
	for (const action of request.actions) {
		const node = workflow.getNode(action.nodeName);

		if (!node) {
			throw new UnexpectedError(
				`Workflow does not contain a node with the name of "${action.nodeName}".`,
			);
		}

		node.rewireOutputLogTo = action.type;
		const inputConnectionData: IConnection = {
			// agents always have a main input
			type: action.type,
			node: action.nodeName,
			// tools always have only one input
			index: 0,
		};
		const parentNode = currentNode.name;
		const parentSourceData = executionData.source?.main?.[runIndex];
		const parentOutputIndex = parentSourceData?.previousNodeOutput ?? 0;
		const parentRunIndex = parentSourceData?.previousNodeRun ?? 0;
		const parentSourceNode = parentSourceData?.previousNode ?? currentNode.name;
		const parentOutputData: INodeExecutionData[][] = [
			[
				{
					json: {
						...action.input,
						toolCallId: action.id,
					},
					pairedItem: {
						item: parentRunIndex,
						input: parentOutputIndex,
						sourceOverwrite: {
							previousNode: parentSourceNode,
							previousNodeOutput: parentOutputIndex,
							previousNodeRun: parentRunIndex,
						},
					},
				},
			],
		];

		runData[node.name] ||= [];
		const nodeRunData = runData[node.name];
		const nodeRunIndex = nodeRunData.length;
		// TODO: Remove when AI-723 lands.
		nodeRunData.push({
			// Necessary for the log on the canvas.
			inputOverride: { ai_tool: parentOutputData },
			source: [],
			executionIndex: 0,
			executionTime: 0,
			startTime: 0,
		});

		nodesToBeExecuted.push({
			inputConnectionData,
			parentOutputIndex,
			parentNode,
			parentOutputData,
			runIndex,
			nodeRunIndex,
			metadata: { preserveSourceOverwrite: true },
		});
		subNodeExecutionData.actions.push({
			action,
			nodeName: action.nodeName,
			runIndex: nodeRunIndex,
		});
	}

	return { nodesToBeExecuted, subNodeExecutionData };
}

function prepareRequestingNodeForResuming(
	workflow: Workflow,
	request: EngineRequest,
	executionData: IExecuteData,
) {
	const parentNode = executionData.source?.main?.[0]?.previousNode;
	if (!parentNode) {
		Container.get(ErrorReporter).error(
			new UnexpectedError(
				'Cannot find parent node for subnode execution - request will be ignored',
			),
			{
				extra: {
					executionNode: executionData.node.name,
					sourceData: executionData.source,
					workflowId: workflow.id,
					requestActions: request.actions.map((a) => ({
						nodeName: a.nodeName,
						actionType: a.actionType,
						id: a.id,
					})),
				},
			},
		);

		return undefined;
	}
	const connectionData: IConnection = {
		// agents always have a main input
		type: 'ai_tool',
		node: executionData.node.name,
		// agents always have only one input
		index: 0,
	};

	return { connectionData, parentNode };
}

/**
 * Processes a Request object by scheduling the requested tool nodes for execution
 * and preparing the current node to resume after tools complete. The current node
 * is paused and will be re-executed with tool results once all actions finish.
 */
export function handleRequest({
	workflow,
	currentNode,
	request,
	runIndex,
	executionData,
	runData,
}: {
	workflow: Workflow;
	currentNode: INode;
	request: EngineRequest;
	runIndex: number;
	executionData: IExecuteData;
	runData: IRunData;
}): {
	nodesToBeExecuted: NodeToBeExecuted[];
} {
	// 1. collect nodes to be put on the stack
	const { nodesToBeExecuted, subNodeExecutionData } = prepareRequestedNodesForExecution(
		workflow,
		currentNode,
		request,
		runIndex,
		runData,
		executionData,
	);

	// 2. create metadata for current node
	const result = prepareRequestingNodeForResuming(workflow, request, executionData);
	if (!result) {
		return { nodesToBeExecuted: [] };
	}

	// 3. add current node back to the bottom of the stack
	nodesToBeExecuted.unshift({
		inputConnectionData: result.connectionData,
		parentOutputIndex: 0,
		parentNode: result.parentNode,
		parentOutputData: executionData.data.main as INodeExecutionData[][],
		runIndex,
		nodeRunIndex: runIndex,
		metadata: { subNodeExecutionData },
	});

	return { nodesToBeExecuted };
}

export function isEngineRequest(
	responseOrRequest: INodeExecutionData[][] | IRunNodeResponse | EngineRequest | null | undefined,
): responseOrRequest is EngineRequest {
	return !!responseOrRequest && 'actions' in responseOrRequest;
}

export function makeEngineResponse(): EngineResponse {
	return { actionResponses: [], metadata: {} };
}
