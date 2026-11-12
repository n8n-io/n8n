/**
 * Builds the v1 view of a spawned step: the step that runs one action, for
 * example one tool call of an agent. It mirrors what v1 does in
 * `core/src/execution-engine/requests-response.ts`.
 */

import type { JsonObject, SpawnedAction, WorkflowGraph } from '@n8n/engine';
import type {
	INodeExecutionData,
	IPairedItemData,
	IRunData,
	ISourceData,
	NodeConnectionType,
} from 'n8n-workflow';
import { isNodeConnectionType, NodeConnectionTypes } from 'n8n-workflow';

import { isJsonObject } from './guards';
import { fromStepInputs } from './io';
import { toV1Sources } from './v1-adapters';
import { emptyRun } from './v1-run-data';

/** The connection type the target attaches with, for example `ai_tool`. */
export function spawnedKind(spawned: SpawnedAction): NodeConnectionType {
	return isNodeConnectionType(spawned.kind) ? spawned.kind : NodeConnectionTypes.AiTool;
}

function argumentsOf(spawned: SpawnedAction): JsonObject {
	return isJsonObject(spawned.action.arguments) ? spawned.action.arguments : {};
}

/**
 * The one input item of a spawned step: the declaring step's item that the
 * action belongs to, with the action's arguments and call id on top, as in v1.
 *
 * The paired item points past the declaring node, to the item the declaring
 * node received, so `$('Trigger').item` in the target resolves as in v1. For a
 * nested declaring step (a spawned agent tool), it reuses the pairing of that
 * step's own input item.
 */
export function toSpawnedInputItem(
	spawned: SpawnedAction,
	graph: WorkflowGraph,
): INodeExecutionData {
	const { action } = spawned;

	let declaringItem: INodeExecutionData | undefined;
	let pairedItem: IPairedItemData;
	if (spawned.declaringAction) {
		declaringItem = toSpawnedInputItem(spawned.declaringAction, graph);
		const inherited = declaringItem.pairedItem;
		pairedItem =
			typeof inherited === 'object' && !Array.isArray(inherited) ? inherited : { item: 0 };
	} else {
		declaringItem = fromStepInputs(spawned.declaringInputs)[0]?.[action.itemIndex];
		// SPIKE: inside a loop, the declaring node's input comes from a later pass
		// of its predecessor, and this source names no pass.
		const source = toV1Sources(graph).get(spawned.declaringNodeId)?.[0];
		pairedItem = { item: action.itemIndex, ...(source ? { sourceOverwrite: source } : {}) };
	}

	return {
		json: {
			...(declaringItem?.json ?? {}),
			...argumentsOf(spawned),
			toolCallId: action.callId,
		},
		pairedItem,
	};
}

/**
 * The source of a spawned step: the node its target attaches to, at the pass
 * of the declaring step. The editor nests the run under that node by it.
 *
 * SPIKE: `iteration` is the spawned step's own iteration. The engine gives a
 * spawned step the iteration of its declaring step, but the contract does not
 * say so. Two calls of one tool in one pass then share a v1 run index.
 */
export function toSpawnedSource(
	spawned: SpawnedAction,
	graph: WorkflowGraph,
	iteration: number,
): ISourceData[] {
	const attachedTo = graph.nodes.find((node) => node.id === spawned.attachedToNodeId);
	return [
		{
			previousNode: attachedTo?.name ?? spawned.attachedToNodeId,
			previousNodeOutput: 0,
			previousNodeRun: iteration,
		},
	];
}

/**
 * Records the action's arguments as the input of the target's run, as v1
 * does before it runs a tool. `$fromAI()` reads them from there (D8).
 */
export function recordSpawnedRun(
	runData: IRunData,
	nodeName: string,
	spawned: SpawnedAction,
	source: ISourceData[],
	iteration: number,
): void {
	const runs = (runData[nodeName] ??= []);
	while (runs.length < iteration) runs.push(emptyRun(runs.length));

	const argumentItems: INodeExecutionData[][] = [[{ json: argumentsOf(spawned) }]];
	runs[iteration] = {
		startTime: 0,
		executionTime: 0,
		executionIndex: iteration,
		source,
		inputOverride: { [spawnedKind(spawned)]: argumentItems },
	};
}
