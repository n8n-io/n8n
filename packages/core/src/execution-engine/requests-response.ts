import { Container } from '@n8n/di';
import {
	type IConnection,
	type IDataObject,
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

type ActionMetadata = { parentNodeName?: string; itemIndex?: number };

function buildParentOutputData(
	json: IDataObject,
	parentRunIndex: number,
	parentOutputIndex: number,
	parentSourceNode: string,
): INodeExecutionData[][] {
	return [
		[
			{
				json,
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
}

function initializeNodeRunData(
	runData: IRunData,
	nodeName: string,
	parentNode: string,
	parentOutputIndex: number,
	parentRunIndex: number,
	actionMetadata: ActionMetadata | undefined,
	runIndex: number,
	displayOutputData: INodeExecutionData[][],
): number {
	runData[nodeName] ||= [];
	const nodeRunData = runData[nodeName];
	const nodeRunIndex = nodeRunData.length;

	// TODO: Remove when AI-723 lands.
	const sourceData = {
		previousNode: parentNode,
		previousNodeOutput: parentOutputIndex,
		previousNodeRun: actionMetadata?.parentNodeName ? parentRunIndex : runIndex,
	};
	nodeRunData.push({
		// Necessary for the log on the canvas. Only show AI-provided tool call arguments.
		inputOverride: { ai_tool: displayOutputData },
		// Source must point to the parent node for the frontend logs panel
		// to correctly display this sub-node under the parent.
		source: [sourceData],
		executionIndex: 0,
		executionTime: 0,
		startTime: 0,
	});

	return nodeRunIndex;
}

function prepareRequestedNodesForExecution(
	workflow: Workflow,
	currentNode: INode,
	request: EngineRequest,
	runIndex: number,
	runData: IRunData,
	executionData: IExecuteData,
) {
	const nodesToBeExecuted: NodeToBeExecuted[] = [];
	const subNodeExecutionData: ITaskMetadata['subNodeExecutionData'] = {
		actions: [],
		metadata: request.metadata,
	};
	const parentSourceData = executionData.source?.main?.[runIndex];
	const defaultParentOutputIndex = parentSourceData?.previousNodeOutput ?? 0;
	const defaultParentSourceNode = parentSourceData?.previousNode ?? currentNode.name;

	for (const action of request.actions) {
		const node = workflow.getNode(action.nodeName);
		if (!node) {
			throw new UnexpectedError(
				`Workflow does not contain a node with the name of "${action.nodeName}".`,
			);
		}

		node.rewireOutputLogTo = action.type;
		const actionMetadata = action.metadata as ActionMetadata | undefined;
		const parentNode = actionMetadata?.parentNodeName ?? currentNode.name;
		const parentRunIndex = actionMetadata?.parentNodeName
			? (runData[parentNode]?.length ?? 1) - 1
			: (parentSourceData?.previousNodeRun ?? 0);

		const itemIndex = actionMetadata?.itemIndex ?? 0;
		const agentInputData = executionData.data.main?.[0]?.[itemIndex];
		const mergedJson = {
			...(agentInputData?.json ?? {}),
			...action.input,
			toolCallId: action.id,
		};

		// For display: only show AI-provided tool call arguments (not parent/agent input or toolCallId)
		const displayJson = {
			...action.input,
		};

		const parentOutputData = buildParentOutputData(
			mergedJson,
			parentRunIndex,
			defaultParentOutputIndex,
			defaultParentSourceNode,
		);

		const displayOutputData = buildParentOutputData(
			displayJson,
			parentRunIndex,
			defaultParentOutputIndex,
			defaultParentSourceNode,
		);

		const nodeRunIndex = initializeNodeRunData(
			runData,
			node.name,
			parentNode,
			defaultParentOutputIndex,
			parentRunIndex,
			actionMetadata,
			runIndex,
			displayOutputData,
		);

		nodesToBeExecuted.push({
			inputConnectionData: { type: action.type, node: action.nodeName, index: 0 },
			parentOutputIndex: 0,
			parentNode,
			parentOutputData,
			// Use parentRunIndex when custom parent is set to preserve previousNodeRun value
			// (avoid 0 being converted to undefined by || undefined pattern)
			runIndex: actionMetadata?.parentNodeName ? parentRunIndex : runIndex,
			nodeRunIndex,
			metadata: {
				preserveSourceOverwrite: true,
				preservedSourceOverwrite: executionData.metadata?.preservedSourceOverwrite ?? {
					previousNode: defaultParentSourceNode,
					previousNodeOutput: defaultParentOutputIndex,
					previousNodeRun: parentRunIndex,
				},
			},
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
	const metadata: Partial<ITaskMetadata> =
		executionData.metadata?.preservedSourceOverwrite &&
		executionData.metadata?.preserveSourceOverwrite
			? {
					preserveSourceOverwrite: true,
					preservedSourceOverwrite: executionData.metadata.preservedSourceOverwrite,
				}
			: {};
	const connectionData: IConnection = {
		// agents always have a main input
		type: 'ai_tool',
		node: executionData.node.name,
		// agents always have only one input
		index: 0,
	};

	return { connectionData, parentNode, metadata };
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
		metadata: { nodeWasResumed: true, subNodeExecutionData, ...result.metadata },
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
