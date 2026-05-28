import { computed, toValue, type ComputedRef, type MaybeRefOrGetter } from 'vue';
import {
	CHAT_TRIGGER_NODE_TYPE,
	MANUAL_CHAT_TRIGGER_LANGCHAIN_NODE_TYPE,
	getParentNodes,
	mapConnectionsByDestination,
} from 'n8n-workflow';

import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useEvaluationsWizardSidepanelStore } from '../wizardSidepanel.store';

export type SliceInputs = {
	fieldNames: string[];
	values: Record<string, string>;
	hasExecution: boolean;
};

type ExecutionLike = NonNullable<ReturnType<typeof useWorkflowsStore>['lastSuccessfulExecution']>;

export type UseSliceInputsOptions = {
	// Additional execution to consult after the workflow store's
	// `workflowExecutionData` and `lastSuccessfulExecution`. The wizard uses
	// this to thread in a manually-fetched recent user execution when both
	// store slots are empty or hold an evaluation-mode run.
	fallbackExecution?: MaybeRefOrGetter<ExecutionLike | null | undefined>;
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
export function useSliceInputs(options?: UseSliceInputsOptions): ComputedRef<SliceInputs> {
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
		//
		// Evaluation-mode executions are filtered out at both sources: a wizard
		// run produces a compiled evaluation workflow whose runData doesn't
		// represent the user's actual graph (the trigger is replaced with
		// `__eval_trigger` and the upstream chain is rewritten), so reading it
		// back here would pick up the wrong shape for the input fields.
		//
		// `fallbackExecution` is a wizard-provided extra slot — used when the
		// cached `lastSuccessfulExecution` happens to be the user's own prior
		// evaluation run and we've fetched an older user execution to back-fill.
		const allNodes = workflowDocumentStore.value?.allNodes ?? [];
		const triggers = allNodes.filter((node) => nodeTypesStore.isTriggerNode(node.type));
		const connections = workflowDocumentStore.value?.connectionsBySourceNode ?? {};

		const probeNode = wizardStore.isSliceMode ? wizardStore.startNodeName : wizardStore.aiNodeName;
		const fallback = (result: SliceInputs) =>
			withFallback(result, allNodes, connections, probeNode);

		const exec = pickUserExecution([
			workflowsStore.workflowExecutionData,
			workflowsStore.lastSuccessfulExecution,
			toValue(options?.fallbackExecution),
		]);
		const runData = exec?.data?.resultData?.runData;
		const hasExecution = Boolean(runData && Object.keys(runData).length > 0);
		if (!hasExecution || !runData) {
			return fallback({ fieldNames: [], values: {}, hasExecution: false });
		}

		// In single-AI-node mode the input shape is whatever flowed *into* the
		// selected AI node. In slice mode it's whatever flowed into the start
		// node (or the start node's own output if it's a trigger).
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

// Default input-column name surfaced when execution detection found nothing
// usable. Keeps the dataset row from being all-expected columns (which
// breaks `helpfulness`'s `userQuery` lookup) and gives the user a writable
// field instead of silently producing an unsubmittable form. Chat-triggered
// workflows get `chatInput` instead, matching the natural output column the
// chat trigger node emits — otherwise the AI Agent would receive an `input`
// key it doesn't know about.
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

// If the slice's upstream chain bottoms out at a chat trigger, mirror its
// natural output column (`chatInput`) so the dataset row drives the AI Agent
// with the key it actually reads. Walks `main`-only parents — `ai_*`
// sub-connections (language model, memory, tools) can never be triggers.
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

// First candidate that isn't an evaluation-mode execution. The wizard's own
// runs land in `lastSuccessfulExecution` as `mode === 'evaluation'`, but their
// runData represents the compiled eval workflow (with `__eval_trigger` etc.),
// not the user's actual graph — so reading them back to derive input fields
// would misshape the form.
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
