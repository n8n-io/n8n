import type { INode, IRun, Workflow } from 'n8n-workflow';
import {
	collectSubWorkflowOutput,
	EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE,
	getLastExecutedNodeData,
	getLastExecutedNodeRuns,
	mergeRunsPerBranch,
} from 'n8n-workflow';

export function triggerReturnsLastRunOnly(nodes: INode[]): boolean {
	const trigger = nodes.find((node) => node.type === EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE);
	return (trigger?.typeVersion ?? 1) < 1.2 && trigger?.parameters.returnOutput !== 'allRuns';
}

export function buildSubWorkflowOutput(
	data: IRun,
	workflowNodes: INode[],
	callerReturnsLastRunOnly: boolean,
) {
	const lastRunOnly = callerReturnsLastRunOnly || triggerReturnsLastRunOnly(workflowNodes);
	const runs = getLastExecutedNodeRuns(data);
	const { lastNodeExecuted, pinData = {} } = data.data.resultData;
	const manualPinDataOverride =
		data.mode === 'manual' &&
		lastNodeExecuted !== undefined &&
		pinData[lastNodeExecuted] !== undefined;
	if (!lastRunOnly && runs.length > 0 && !manualPinDataOverride) return mergeRunsPerBranch(runs);
	return getLastExecutedNodeData(data)?.data?.main ?? [null];
}

export async function resolveSubWorkflowOutput(
	data: IRun,
	workflow: Workflow,
	callerReturnsLastRunOnly: boolean,
) {
	return data.data.subWorkflowOutput
		? await collectSubWorkflowOutput(data, workflow, data.data.subWorkflowOutput)
		: buildSubWorkflowOutput(data, Object.values(workflow.nodes), callerReturnsLastRunOnly);
}
