/**
 * Pure functions to turn engine v2 artifacts (graph, step outputs, step context)
 * back into engine v1 artifacts (`INode`, `Workflow`, run data, node execute context).
 */

import type { GraphNode, JsonValue, WorkflowGraph } from '@n8n/engine';
import { ExecuteContext, UnrecognizedNodeTypeError } from 'n8n-core';
import type {
	IConnections,
	IExecuteData,
	INode,
	INodeType,
	INodeTypes,
	IRunData,
	ISourceData,
	ITaskDataConnections,
	WorkflowExecuteMode,
} from 'n8n-workflow';
import { createRunExecutionData, Workflow } from 'n8n-workflow';

import { MAIN_CONNECTION_TYPE, MANUAL_TRIGGER_TYPE } from './constants';
import { isV1NodeStepConfig } from './guards';
import { fromStepInputs } from './io';
import type { CreateExecuteContextParams, V1Execution, V1NodeStepConfig } from './types';

export function toV1Execution(
	graph: WorkflowGraph,
	outputsByStepId: Record<string, JsonValue>,
): V1Execution {
	return {
		nodes: toV1Nodes(graph),
		connections: toV1Connections(graph),
		runData: toV1RunData(graph, outputsByStepId),
	};
}

function toV1Nodes(graph: WorkflowGraph): INode[] {
	return graph.nodes.flatMap((graphNode): INode[] => {
		if (graphNode.type === 'trigger') {
			return [
				{
					id: graphNode.id,
					name: graphNode.name,
					type: MANUAL_TRIGGER_TYPE,
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				},
			];
		}

		if (!isV1NodeStepConfig(graphNode.config)) return [];

		return [toV1Node(graphNode, graphNode.config)];
	});
}

function toV1Connections(graph: WorkflowGraph): IConnections {
	const namesById = new Map(graph.nodes.map((node) => [node.id, node.name]));

	const connections: IConnections = {};
	for (const edge of graph.edges) {
		const fromName = namesById.get(edge.from);
		const toName = namesById.get(edge.to);
		if (fromName === undefined || toName === undefined) continue;

		const outputs = (connections[fromName] ??= { [MAIN_CONNECTION_TYPE]: [] })[
			MAIN_CONNECTION_TYPE
		];
		const outputIndex = edge.outputIndex ?? 0;
		while (outputs.length <= outputIndex) outputs.push([]);
		outputs[outputIndex]!.push({
			node: toName,
			type: MAIN_CONNECTION_TYPE,
			index: edge.inputIndex ?? 0,
		});
	}

	return connections;
}

function toV1RunData(graph: WorkflowGraph, outputsByStepId: Record<string, JsonValue>): IRunData {
	const namesById = new Map(graph.nodes.map((node) => [node.id, node.name]));
	const sourcesByStepId = toV1Sources(graph);

	const runData: IRunData = {};
	for (const [completedStepId, outputs] of Object.entries(outputsByStepId)) {
		const nodeName = namesById.get(completedStepId);
		if (nodeName === undefined) continue;

		runData[nodeName] = [
			{
				startTime: 0,
				executionTime: 0,
				executionIndex: 0,
				source: sourcesByStepId.get(completedStepId) ?? [],
				data: { [MAIN_CONNECTION_TYPE]: fromStepInputs(outputs) },
			},
		];
	}

	return runData;
}

export function toV1Sources(graph: WorkflowGraph): Map<string, Array<ISourceData | null>> {
	const namesById = new Map(graph.nodes.map((node) => [node.id, node.name]));

	const sourcesByStepId = new Map<string, Array<ISourceData | null>>();
	for (const edge of graph.edges) {
		if (edge.isBackEdge === true) continue;
		const fromName = namesById.get(edge.from);
		if (fromName === undefined) continue;

		const source = sourcesByStepId.get(edge.to) ?? [];
		const inputIndex = edge.inputIndex ?? 0;
		while (source.length <= inputIndex) source.push(null);
		source[inputIndex] ??= { previousNode: fromName, previousNodeOutput: edge.outputIndex };
		sourcesByStepId.set(edge.to, source);
	}
	return sourcesByStepId;
}

export function toV1Workflow(
	workflowId: string,
	node: INode,
	execution: V1Execution,
	nodeTypes: INodeTypes,
): Workflow {
	const siblingNodes = execution.nodes.filter((executionNode) => executionNode.id !== node.id);

	return new Workflow({
		id: workflowId,
		nodes: [node, ...siblingNodes],
		connections: execution.connections,
		active: false,
		nodeTypes: tolerantNodeTypes(nodeTypes),
	});
}

export function toV1Node(graphNode: GraphNode, config: V1NodeStepConfig): INode {
	return {
		id: graphNode.id,
		name: graphNode.name,
		type: config.nodeType,
		typeVersion: config.typeVersion,
		position: [0, 0],
		parameters: config.parameters,
		continueOnFail: config.continueOnFail,
	};
}

/**
 * In v1, an uninstalled node type _fails the whole execution upfront_, at
 * `Workflow` construction. In v2, where each step builds its own `Workflow`,
 * preserving that failure would mean failing at every step of the execution.
 * Instead, for fault isolation, v2 maps this to `undefined`, which `Workflow`
 * tolerates by design (node kept, name and data visible to expressions, only
 * parameter defaults skipped), so only the missing node type step fails.
 */
function tolerantNodeTypes(nodeTypes: INodeTypes): INodeTypes {
	return {
		getByName: (type) => nodeTypes.getByName(type),
		getKnownTypes: () => nodeTypes.getKnownTypes(),
		getByNameAndVersion: (type, version) => {
			try {
				return nodeTypes.getByNameAndVersion(type, version);
			} catch (error) {
				if (error instanceof UnrecognizedNodeTypeError) return undefined as unknown as INodeType;
				throw error;
			}
		},
	};
}

export function toV1ExecuteContext({
	node,
	workflow,
	execution,
	source,
	additionalData,
	stepContext,
	itemsByConnection,
}: CreateExecuteContextParams): ExecuteContext {
	const firstInput = itemsByConnection[0] ?? [];
	const connectionInputData = firstInput.length > 0 ? firstInput : [{ json: {} }];
	const inputData: ITaskDataConnections = {
		main: [connectionInputData, ...itemsByConnection.slice(1)],
	};

	const runExecutionData = createRunExecutionData({
		startData: {},
		resultData: { runData: execution.runData },
		executionData: {
			contextData: {},
			nodeExecutionStack: [],
			metadata: {},
			waitingExecution: {},
			waitingExecutionSource: null,
		},
	});

	const executeData: IExecuteData = {
		node,
		data: inputData,
		source: source.length > 0 ? { main: source } : null,
	};
	const mode: WorkflowExecuteMode = stepContext.mode === 'production' ? 'trigger' : 'manual';

	return new ExecuteContext(
		workflow,
		node,
		additionalData,
		mode,
		runExecutionData,
		0,
		connectionInputData,
		inputData,
		executeData,
		[],
	);
}
