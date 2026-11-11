import {
	MERGE_NODE_TYPE,
	NodeConnectionTypes,
	getChildNodes,
	isTriggerNodeType,
	type IConnections,
	type INode,
} from 'n8n-workflow';

import type { EngineV2Reason, EngineV2ReasonCode } from './types';

const SPLIT_IN_BATCHES_NODE_TYPE = 'n8n-nodes-base.splitInBatches';
const SUPPORTED_SPLIT_IN_BATCHES_VERSION = 3;
const DEFAULT_BATCH_SIZE = 1;

/**
 * Mirrors the node-level refusals of `V1WorkflowConverter` in
 * `@n8n/node-engine-compatibility`. Like the converter, the rules skip disabled nodes
 * and nodes that no live trigger reaches over `main`. Unlike the converter, they report
 * every refusal, not only the first.
 */
export function findConverterReasons(nodes: INode[], connections: IConnections): EngineV2Reason[] {
	const liveNodes = nodes.filter((node) => node.disabled !== true);
	const triggers = liveNodes.filter((node) => isTriggerNodeType(node.type));
	const reachable = reachableNodeNames(nodes, connections, triggers);

	const reasons = liveNodes
		.filter((node) => reachable.has(node.name))
		.flatMap((node) => {
			// The converter turns the fired trigger into a trigger step and skips its node rules.
			const nodeReasons = isTriggerNodeType(node.type) ? [] : findNodeReasons(node);
			if (hasNonMainConnection(connections, node.name)) {
				nodeReasons.push(
					reason(
						node,
						'NON_MAIN_CONNECTION',
						'has a connection of a type other than main. Engine v2 does not run AI sub-nodes yet.',
					),
				);
			}
			return nodeReasons;
		});

	if (triggers.length > 1) {
		reasons.push({
			code: 'MULTIPLE_TRIGGERS',
			severity: 'warning',
			message:
				'The workflow has more than one enabled trigger. Engine v2 runs it only when the caller names the trigger that fired.',
		});
	}

	return reasons;
}

/** With no live trigger the converter does not root the graph, so every node counts. */
function reachableNodeNames(
	nodes: INode[],
	connections: IConnections,
	triggers: INode[],
): Set<string> {
	if (triggers.length === 0) return new Set(nodes.map((node) => node.name));

	return new Set(
		triggers.flatMap((trigger) => [
			trigger.name,
			...getChildNodes(connections, trigger.name, NodeConnectionTypes.Main, -1),
		]),
	);
}

function findNodeReasons(node: INode): EngineV2Reason[] {
	const reasons: EngineV2Reason[] = [];

	if (node.onError === 'continueErrorOutput') {
		reasons.push(
			reason(
				node,
				'CONTINUE_ERROR_OUTPUT',
				'uses the error output. Set "On Error" to another option.',
			),
		);
	}

	if (node.type === MERGE_NODE_TYPE) reasons.push(...findMergeReasons(node));
	if (node.type === SPLIT_IN_BATCHES_NODE_TYPE) reasons.push(...findSplitInBatchesReasons(node));

	return reasons;
}

function findMergeReasons(node: INode): EngineV2Reason[] {
	const mode = node.parameters.mode;
	if (mode === 'chooseBranch') {
		return [reason(node, 'MERGE_CHOOSE_BRANCH', 'uses the Merge mode "Choose Branch".')];
	}
	// Merge v1 predates chooseBranch, so an expression there cannot resolve to it.
	if (node.typeVersion >= 2 && typeof mode === 'string' && mode.startsWith('=')) {
		return [
			reason(
				node,
				'MERGE_MODE_EXPRESSION',
				'sets its Merge mode with an expression. Use a fixed mode.',
			),
		];
	}
	return [];
}

function findSplitInBatchesReasons(node: INode): EngineV2Reason[] {
	// Other versions name their parameters differently, so only the version counts.
	if (node.typeVersion !== SUPPORTED_SPLIT_IN_BATCHES_VERSION) {
		return [
			reason(
				node,
				'SPLIT_IN_BATCHES_VERSION',
				`is a Loop Over Items node of version ${node.typeVersion}. Replace it with version ${SUPPORTED_SPLIT_IN_BATCHES_VERSION}.`,
			),
		];
	}

	const reasons: EngineV2Reason[] = [];
	const { options } = node.parameters;

	if (typeof options === 'string') {
		reasons.push(
			reason(node, 'SPLIT_IN_BATCHES_OPTIONS_EXPRESSION', 'sets its options with an expression.'),
		);
	} else if (
		typeof options === 'object' &&
		options !== null &&
		!Array.isArray(options) &&
		'reset' in options &&
		options.reset !== undefined &&
		options.reset !== false
	) {
		reasons.push(reason(node, 'SPLIT_IN_BATCHES_RESET', 'uses the "Reset" option.'));
	}

	const batchSize = node.parameters.batchSize ?? DEFAULT_BATCH_SIZE;
	if (typeof batchSize !== 'number' || !Number.isInteger(batchSize) || batchSize < 1) {
		reasons.push(
			reason(
				node,
				'SPLIT_IN_BATCHES_BATCH_SIZE',
				'needs a fixed batch size that is a whole number of at least 1.',
			),
		);
	}

	return reasons;
}

/** Checks the type of each output group and of each connection in it, as the converter does. */
function hasNonMainConnection(connections: IConnections, nodeName: string): boolean {
	return Object.entries(connections[nodeName] ?? {}).some(
		([connectionType, outputSlots]) =>
			connectionType !== NodeConnectionTypes.Main ||
			outputSlots.some((slot) =>
				(slot ?? []).some((connection) => connection.type !== NodeConnectionTypes.Main),
			),
	);
}

function reason(node: INode, code: EngineV2ReasonCode, problem: string): EngineV2Reason {
	return {
		code,
		severity: 'blocking',
		nodeId: node.id,
		nodeName: node.name,
		message: `Engine v2 cannot run the "${node.name}" node yet, because it ${problem}`,
	};
}
