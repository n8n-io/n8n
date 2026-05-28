import { computed, type ComputedRef } from 'vue';
import { getParentNodes, mapConnectionsByDestination } from 'n8n-workflow';

import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useEvaluationsWizardSidepanelStore } from '../wizardSidepanel.store';

export type SliceInputs = {
	fieldNames: string[];
	values: Record<string, string>;
	hasExecution: boolean;
};

// Walks the most recent successful execution to figure out what input shape the
// tested slice receives.
//
// - Single AI-node mode: read the *output of the AI node's main-connection
//   parent*. We resolve the parent from the workflow graph (not from
//   `task.source`) — that worked for vanilla nodes but breaks for langchain
//   AI nodes whose `source` array can be empty or carry the wrong index.
// - Slice mode: same idea but for the slice's start node — if start is a
//   trigger, read its own output instead.
//
// Returns hasExecution=false when no successful run is available so the wizard
// can render an empty state instead of a zero-field form.
export function useSliceInputs(): ComputedRef<SliceInputs> {
	const workflowsStore = useWorkflowsStore();
	const workflowDocumentStore = injectWorkflowDocumentStore();
	const nodeTypesStore = useNodeTypesStore();
	const wizardStore = useEvaluationsWizardSidepanelStore();

	return computed<SliceInputs>(() => {
		// Prefer the currently-loaded execution (`workflowExecutionData`) over
		// the cached `lastSuccessfulExecution` snapshot. The latter is only
		// fetched on workflow init / logs-panel reset, so it misses runs the
		// user just kicked off — chat-triggered runs in particular, since
		// they execute via the chat panel without re-initing the workflow.
		const exec = workflowsStore.workflowExecutionData ?? workflowsStore.lastSuccessfulExecution;
		const runData = exec?.data?.resultData?.runData;
		const hasExecution = Boolean(runData && Object.keys(runData).length > 0);
		if (!hasExecution || !runData) {
			return { fieldNames: [], values: {}, hasExecution: false };
		}

		const allNodes = workflowDocumentStore.value?.allNodes ?? [];
		const triggers = allNodes.filter((node) => nodeTypesStore.isTriggerNode(node.type));
		const connections = workflowDocumentStore.value?.connectionsBySourceNode ?? {};

		// In single-AI-node mode the input shape is whatever flowed *into* the
		// selected AI node. In slice mode it's whatever flowed into the start
		// node (or the start node's own output if it's a trigger).
		const probeNode = wizardStore.isSliceMode ? wizardStore.startNodeName : wizardStore.aiNodeName;
		if (!probeNode) return { fieldNames: [], values: {}, hasExecution: true };

		const isTrigger = triggers.some((n) => n.name === probeNode);
		const firstItem = isTrigger
			? readFirstOutputItem(runData, probeNode)
			: readFirstInputItemViaGraph(runData, connections, probeNode);
		if (!firstItem) return { fieldNames: [], values: {}, hasExecution: true };

		const fieldNames = Object.keys(firstItem);
		const values: Record<string, string> = {};
		for (const name of fieldNames) {
			values[name] = stringifyValue(firstItem[name]);
		}
		return { fieldNames, values, hasExecution: true };
	});
}

type RunData = NonNullable<
	NonNullable<
		NonNullable<ReturnType<typeof useWorkflowsStore>['lastSuccessfulExecution']>['data']
	>['resultData']
>['runData'];
type Connections = NonNullable<
	NonNullable<ReturnType<typeof injectWorkflowDocumentStore>['value']>['connectionsBySourceNode']
>;

function readFirstOutputItem(runData: RunData, nodeName: string) {
	const task = runData[nodeName]?.[0];
	return task?.data?.main?.[0]?.[0]?.json;
}

// Find the node feeding `nodeName` via its `main` connection and return that
// node's first output item. Graph-based so it works even when the target
// node's own task has a non-standard `source` array (e.g. langchain AI
// nodes that consume `ai_*` sub-connections in addition to `main`).
function readFirstInputItemViaGraph(runData: RunData, connections: Connections, nodeName: string) {
	const byDest = mapConnectionsByDestination(connections);
	const parents = getParentNodes(byDest, nodeName, 'main', 1);
	const parent = parents[0];
	if (!parent) return undefined;
	return readFirstOutputItem(runData, parent);
}

function stringifyValue(value: unknown): string {
	if (value === null || value === undefined) return '';
	if (typeof value === 'string') return value;
	if (typeof value === 'number' || typeof value === 'boolean') return String(value);
	try {
		return JSON.stringify(value);
	} catch {
		return '';
	}
}
