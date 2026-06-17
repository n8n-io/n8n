import { computed, toValue, type ComputedRef, type MaybeRefOrGetter } from 'vue';
import {
	CHAT_TRIGGER_NODE_TYPE,
	MANUAL_CHAT_TRIGGER_LANGCHAIN_NODE_TYPE,
	getParentNodes,
	mapConnectionsByDestination,
} from 'n8n-workflow';

import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import {
	injectWorkflowExecutionStateStore,
	type useWorkflowExecutionStateStore,
} from '@/app/stores/workflowExecutionState.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useEvaluationsWizardSidepanelStore } from '../wizardSidepanel.store';
import { stringifyValue } from '../evaluation.utils';

export type SliceInputs = {
	fieldNames: string[];
	values: Record<string, string>;
	hasExecution: boolean;
};

type ExecutionLike = NonNullable<
	ReturnType<typeof useWorkflowExecutionStateStore>['lastSuccessfulExecution']
>;

export type UseSliceInputsOptions = {
	fallbackExecution?: MaybeRefOrGetter<ExecutionLike | null | undefined>;
};

// Resolves the input shape feeding the slice from the most recent
// non-evaluation execution. Uses graph-based parent lookup rather than
// `task.source` — langchain AI nodes have an unreliable source array.
export function useSliceInputs(options?: UseSliceInputsOptions): ComputedRef<SliceInputs> {
	const workflowExecutionStateStore = injectWorkflowExecutionStateStore();
	const workflowDocumentStore = injectWorkflowDocumentStore();
	const nodeTypesStore = useNodeTypesStore();
	const wizardStore = useEvaluationsWizardSidepanelStore();

	return computed<SliceInputs>(() => {
		const allNodes = workflowDocumentStore.value?.allNodes ?? [];
		const triggers = allNodes.filter((node) => nodeTypesStore.isTriggerNode(node.type));
		const connections = workflowDocumentStore.value?.connectionsBySourceNode ?? {};

		const probeNode = wizardStore.isSliceMode ? wizardStore.startNodeName : wizardStore.aiNodeName;
		const fallback = (result: SliceInputs) =>
			withFallback(result, allNodes, connections, probeNode);

		const exec = pickUserExecution([
			workflowExecutionStateStore.value.activeExecution,
			workflowExecutionStateStore.value.lastSuccessfulExecution,
			toValue(options?.fallbackExecution),
		]);
		const runData = exec?.data?.resultData?.runData;
		const hasExecution = Boolean(runData && Object.keys(runData).length > 0);
		if (!hasExecution || !runData) {
			return fallback({ fieldNames: [], values: {}, hasExecution: false });
		}

		if (!probeNode) return fallback({ fieldNames: [], values: {}, hasExecution: true });

		const isTrigger = triggers.some((n) => n.name === probeNode);
		const firstItem = isTrigger
			? readFirstOutputItem(runData, probeNode)
			: readFirstInputItemViaGraph(runData, connections, probeNode);
		if (!firstItem) return fallback({ fieldNames: [], values: {}, hasExecution: true });

		const fieldNames = Object.keys(firstItem);
		const values: Record<string, string> = {};
		for (const name of fieldNames) {
			values[name] = stringifyValue(firstItem[name]);
		}
		return fallback({ fieldNames, values, hasExecution: true });
	});
}

// Chat-triggered workflows get `chatInput` to match the trigger's natural
// output column; otherwise `input` keeps `helpfulness.userQuery` lookups working.
export const FALLBACK_INPUT_FIELD_NAME = 'input';
const CHAT_TRIGGER_FALLBACK_FIELD_NAME = 'chatInput';
const CHAT_TRIGGER_NODE_TYPES = new Set<string>([
	CHAT_TRIGGER_NODE_TYPE,
	MANUAL_CHAT_TRIGGER_LANGCHAIN_NODE_TYPE,
]);

function withFallback(
	result: SliceInputs,
	allNodes: Array<{ name: string; type: string }>,
	connections: Connections,
	probeNode: string,
): SliceInputs {
	if (result.fieldNames.length > 0) return result;
	const fieldName = pickFallbackFieldName(allNodes, connections, probeNode);
	return {
		...result,
		fieldNames: [fieldName],
		values: { ...result.values, [fieldName]: '' },
	};
}

function pickFallbackFieldName(
	allNodes: Array<{ name: string; type: string }>,
	connections: Connections,
	probeNode: string,
): string {
	if (!probeNode) return FALLBACK_INPUT_FIELD_NAME;
	const byDest = mapConnectionsByDestination(connections);
	const chain = [probeNode, ...getParentNodes(byDest, probeNode, 'main')];
	const byName = new Map(allNodes.map((n) => [n.name, n]));
	for (const name of chain) {
		const node = byName.get(name);
		if (node && CHAT_TRIGGER_NODE_TYPES.has(node.type)) {
			return CHAT_TRIGGER_FALLBACK_FIELD_NAME;
		}
	}
	return FALLBACK_INPUT_FIELD_NAME;
}

type Execution = ExecutionLike;
type RunData = NonNullable<NonNullable<Execution['data']>['resultData']>['runData'];
type Connections = NonNullable<
	NonNullable<ReturnType<typeof injectWorkflowDocumentStore>['value']>['connectionsBySourceNode']
>;

// Skip evaluation-mode runs — their compiled runData doesn't match the user's graph.
function pickUserExecution(
	candidates: Array<Execution | null | undefined>,
): Execution | null | undefined {
	for (const candidate of candidates) {
		if (candidate && candidate.mode !== 'evaluation') return candidate;
	}
	return undefined;
}

function readFirstOutputItem(runData: RunData, nodeName: string) {
	const task = runData[nodeName]?.[0];
	return task?.data?.main?.[0]?.[0]?.json;
}

function readFirstInputItemViaGraph(runData: RunData, connections: Connections, nodeName: string) {
	const byDest = mapConnectionsByDestination(connections);
	const parents = getParentNodes(byDest, nodeName, 'main', 1);
	const parent = parents[0];
	if (!parent) return undefined;
	return readFirstOutputItem(runData, parent);
}
