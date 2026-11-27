import { findTriggerForPartialExecution } from 'n8n-core';
import type {
	INode,
	INodeTypes,
	IRunData,
	IWorkflowExecutionDataProcess,
	WorkflowExecutionCaller,
	WorkflowExecutionOrigin,
} from 'n8n-workflow';
import { deepCopy, isTriggerNodeType, Workflow } from 'n8n-workflow';

/**
 * Returns how a run started, from what is known when its execution is created, so that its
 * telemetry does not have to work it out when the run ends. Returns `undefined` when neither a
 * trigger node nor a caller started the run. Without `nodeTypes`, a manual run up to a node that
 * names no trigger node records none.
 *
 * Only for telemetry, so it must never throw or change `data` while a run starts. It reads lists
 * with `first`, because reading index 0 of an empty list on a proxy can add an entry.
 */
export function getExecutionOrigin(
	data: IWorkflowExecutionDataProcess,
	nodeTypes?: INodeTypes,
): WorkflowExecutionOrigin | undefined {
	const triggerNodeType = getTriggerNodeType(data, nodeTypes);
	const caller = getCaller(data);
	if (!triggerNodeType && !caller) return undefined;

	return {
		...(triggerNodeType ? { triggerNodeType } : {}),
		...(caller ? { caller } : {}),
	};
}

function getCaller(data: IWorkflowExecutionDataProcess): WorkflowExecutionCaller | undefined {
	if (data.executionData?.parentAgentRun) return 'agent';
	if (data.executionData?.parentExecution) return 'workflow';
	// The public API endpoints that start runs set it.
	const origin = data.telemetryMetadata?.origin;
	return typeof origin === 'object' ? origin.caller : undefined;
}

/**
 * A resumed or retried run continues run data saved earlier, which holds the trigger node that
 * started the execution. Any other run starts from the first node of its execution stack or, for a
 * manual run, from the trigger node that the user picked. A manual run up to a node that names no
 * trigger node gets the one that the engine will start from.
 */
function getTriggerNodeType(
	data: IWorkflowExecutionDataProcess,
	nodeTypes: INodeTypes | undefined,
): string | undefined {
	const nodeTypesByName = getNodeTypesByName(data.workflowData?.nodes);
	const triggerToStartFrom = data.triggerToStartFrom?.name;
	const startItem = first(data.executionData?.executionData?.nodeExecutionStack);

	return (
		getFirstTriggerNodeType(data.executionData?.resultData?.runData, nodeTypesByName) ??
		asTriggerNodeType(startItem?.node?.type) ??
		asTriggerNodeType(
			typeof triggerToStartFrom === 'string' ? nodeTypesByName.get(triggerToStartFrom) : undefined,
		) ??
		(nodeTypes ? getManualRunTriggerNodeType(data, nodeTypes) : undefined)
	);
}

/**
 * The engine picks the start node of a manual run up to a node when the run starts, possibly on a
 * worker, so this asks the same engine functions. A partial run, which reuses earlier run data,
 * starts from a parent trigger node; any other run starts from the highest parent node.
 */
function getManualRunTriggerNodeType(
	data: IWorkflowExecutionDataProcess,
	nodeTypes: INodeTypes,
): string | undefined {
	const destinationNodeName = data.destinationNode?.nodeName;
	if (data.executionMode !== 'manual' || typeof destinationNodeName !== 'string') return undefined;

	try {
		// A Workflow fills in the default parameter values of the nodes it gets, so it gets copies
		// and the run keeps its nodes as they are.
		const workflow = new Workflow({
			id: data.workflowData.id,
			name: data.workflowData.name,
			nodes: data.workflowData.nodes.map((node) => ({
				...node,
				parameters: deepCopy(node.parameters),
			})),
			connections: data.workflowData.connections,
			active: false,
			nodeTypes,
			settings: data.workflowData.settings,
			pinData: data.pinData ?? data.workflowData.pinData,
		});
		const startNode =
			data.runData === undefined
				? workflow.getStartNode(destinationNodeName)
				: findTriggerForPartialExecution(workflow, destinationNodeName, data.runData);

		return asTriggerNodeType(startNode?.type);
	} catch {
		// The engine fails such a run itself, for example on an unknown node type.
		return undefined;
	}
}

function getNodeTypesByName(nodes: INode[] | undefined): Map<string, string> {
	return new Map((Array.isArray(nodes) ? nodes : []).map((node) => [node.name, node.type]));
}

/** The trigger node with the earliest start time, if the run data has one. */
function getFirstTriggerNodeType(
	runData: IRunData | undefined,
	nodeTypesByName: Map<string, string>,
): string | undefined {
	let firstTrigger: { type: string; startTime: number } | undefined;

	for (const [nodeName, taskDataList] of Object.entries(runData ?? {})) {
		const nodeType = asTriggerNodeType(nodeTypesByName.get(nodeName));
		const startTime = first(taskDataList)?.startTime;
		if (nodeType === undefined || typeof startTime !== 'number') continue;

		if (firstTrigger === undefined || startTime < firstTrigger.startTime) {
			firstTrigger = { type: nodeType, startTime };
		}
	}

	return firstTrigger?.type;
}

function first<T>(list: T[] | undefined): T | undefined {
	return Array.isArray(list) ? list.at(0) : undefined;
}

function asTriggerNodeType(nodeType: unknown): string | undefined {
	return typeof nodeType === 'string' && isTriggerNodeType(nodeType) ? nodeType : undefined;
}
