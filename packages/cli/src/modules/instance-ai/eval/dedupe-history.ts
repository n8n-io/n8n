import type {
	DeduplicationScope,
	ICheckProcessedContextData,
	ICheckProcessedOptions,
	IDataDeduplicator,
	INode,
	IWorkflowBase,
} from 'n8n-workflow';

const REMOVE_DUPLICATES_NODE_TYPE = 'n8n-nodes-base.removeDuplicates';
const DEFAULT_HISTORY_SIZE = 10_000;

/**
 * A Remove Duplicates node that drops items seen in earlier executions. Its
 * memory lives in the deduplication table, so a scenario that says "this item
 * was already seen" needs that history staged before the run.
 */
export interface DedupeHistoryNode {
	node: INode;
	scope: DeduplicationScope;
	maxEntries: number;
	/** The key expression as the builder wrote it, shown to the planner. */
	dedupeValue: string;
}

function readOptions(node: INode): { scope: DeduplicationScope; maxEntries: number } {
	const options = node.parameters?.options;
	const record = typeof options === 'object' && options !== null ? options : {};
	const scope = Reflect.get(record, 'scope') === 'workflow' ? 'workflow' : 'node';
	const historySize = Number(Reflect.get(record, 'historySize'));
	return {
		scope,
		maxEntries:
			Number.isFinite(historySize) && historySize > 0 ? historySize : DEFAULT_HISTORY_SIZE,
	};
}

/** Only the entries logic keeps a set of seen keys; the incremental-key and date logics keep one value. */
export function findDedupeHistoryNodes(workflow: IWorkflowBase): DedupeHistoryNode[] {
	return workflow.nodes.flatMap((node) => {
		if (node.disabled || node.type !== REMOVE_DUPLICATES_NODE_TYPE || node.typeVersion < 2)
			return [];
		const parameters = node.parameters ?? {};
		if (parameters.operation !== 'removeItemsSeenInPreviousExecutions') return [];
		const logic = parameters.logic ?? 'removeItemsWithAlreadySeenKeyValues';
		if (logic !== 'removeItemsWithAlreadySeenKeyValues') return [];

		const dedupeValue = typeof parameters.dedupeValue === 'string' ? parameters.dedupeValue : '';
		return [{ node, dedupeValue, ...readOptions(node) }];
	});
}

/** Planner instructions for the nodes whose history a scenario can stage. */
export function describeDedupeHistoryNodes(nodes: DedupeHistoryNode[]): string {
	if (nodes.length === 0) return '';
	const lines = nodes.map(
		({ node, dedupeValue }) => `- "${node.name}" dedupes on: ${dedupeValue || '(no key set)'}`,
	);
	return [
		'## Items seen in earlier executions',
		'',
		'These Remove Duplicates nodes drop items whose key was recorded by an earlier execution:',
		...lines,
		'',
		'When the Test Scenario says an item was already seen, posted, processed, or handled on an earlier run, add a "previouslySeenKeys" object mapping each node name to the key values of those items.',
		'A key value is the dedupe expression evaluated against that item, exactly as the node will compute it from the data your hints produce. Leave an item out when the scenario treats it as new.',
		'Omit "previouslySeenKeys" when the scenario says nothing was seen before.',
	].join('\n');
}

function contextFor(workflowId: string, node: INode): ICheckProcessedContextData {
	return { node, workflow: { id: workflowId, active: false } };
}

function optionsFor(target: DedupeHistoryNode): ICheckProcessedOptions {
	return { mode: 'entries', maxEntries: target.maxEntries };
}

/**
 * Clears the recorded history of each node, then records the keys the
 * scenario says were seen before. Call it again without keys to leave no
 * history behind for the next scenario.
 */
export async function resetDedupeHistory(
	deduplicator: IDataDeduplicator,
	workflowId: string,
	nodes: DedupeHistoryNode[],
	seenKeysByNode: Record<string, string[]> = {},
): Promise<void> {
	for (const target of nodes) {
		const context = contextFor(workflowId, target.node);
		await deduplicator.clearAllProcessedItems(target.scope, context, optionsFor(target));
	}
	for (const target of nodes) {
		const keys = seenKeysByNode[target.node.name]?.filter((key) => key.length > 0) ?? [];
		if (keys.length === 0) continue;
		await deduplicator.checkProcessedAndRecord(
			keys,
			target.scope,
			contextFor(workflowId, target.node),
			optionsFor(target),
		);
	}
}

const historyLocks = new Map<string, Promise<unknown>>();

/**
 * Runs scenario executions of one workflow one at a time. They share the
 * workflow's deduplication history, so parallel runs would see each other's
 * staged keys.
 */
export async function withDedupeHistoryLock<T>(
	workflowId: string,
	run: () => Promise<T>,
): Promise<T> {
	const previous = historyLocks.get(workflowId) ?? Promise.resolve();
	const current = previous.catch(() => undefined).then(run);
	historyLocks.set(workflowId, current);
	try {
		return await current;
	} finally {
		if (historyLocks.get(workflowId) === current) historyLocks.delete(workflowId);
	}
}
