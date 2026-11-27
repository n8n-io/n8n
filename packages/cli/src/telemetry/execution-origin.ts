import type {
	IRunData,
	IWorkflowExecutionDataProcess,
	WorkflowExecutionCaller,
	WorkflowExecutionOrigin,
} from 'n8n-workflow';
import { isTriggerNodeType } from 'n8n-workflow';

/**
 * Returns how a run started, from what is known when its execution is created, so that its
 * telemetry does not have to work it out when the run ends. Returns `undefined` when neither a
 * trigger node nor a caller started the run.
 *
 * Only for telemetry, so it must never throw or change `data` while a run starts. It reads lists
 * with `first`, because reading index 0 of an empty list on a proxy can add an entry.
 */
export function getExecutionOrigin(
	data: IWorkflowExecutionDataProcess,
): WorkflowExecutionOrigin | undefined {
	const triggerNodeType = getTriggerNodeType(data);
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
 * manual run, from the trigger node that the user picked. A manual partial run that reuses earlier
 * run data starts from no trigger node.
 */
function getTriggerNodeType(data: IWorkflowExecutionDataProcess): string | undefined {
	const nodes = Array.isArray(data.workflowData?.nodes) ? data.workflowData.nodes : [];
	const nodeTypesByName = new Map(nodes.map((node) => [node.name, node.type]));
	const triggerToStartFrom = data.triggerToStartFrom?.name;
	const startItem = first(data.executionData?.executionData?.nodeExecutionStack);

	return (
		getFirstTriggerNodeType(data.executionData?.resultData?.runData, nodeTypesByName) ??
		asTriggerNodeType(startItem?.node?.type) ??
		asTriggerNodeType(
			typeof triggerToStartFrom === 'string' ? nodeTypesByName.get(triggerToStartFrom) : undefined,
		)
	);
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
