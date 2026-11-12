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
 * `@n8n/node-engine-compatibility`. Like the converter, the rules skip nodes that no
 * live trigger reaches over `main`, and the node rules skip disabled nodes. Unlike the
 * converter, they report every refusal, not only the first.
 */
export function findConverterReasons(nodes: INode[], connections: IConnections): EngineV2Reason[] {
	const triggers = nodes.filter((node) => node.disabled !== true && isTriggerNodeType(node.type));
	const reachable = reachableNodeNames(nodes, connections, triggers);

	return nodes
		.filter((node) => reachable.has(node.name))
		.flatMap((node) => {
			// The converter turns the fired trigger into a trigger step and skips its node rules.
			const nodeReasons =
				node.disabled === true || isTriggerNodeType(node.type) ? [] : findNodeReasons(node);
			// The converter checks connection types before it removes disabled nodes.
			const connectionType = findNonMainConnectionType(connections, node.name);
			if (connectionType !== undefined) {
				nodeReasons.push(
					reason(
						node,
						'NON_MAIN_CONNECTION',
						`has a "${connectionType}" connection. Engine v2 runs only "main" connections.`,
					),
				);
			}
			return nodeReasons;
		});
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
function findNonMainConnectionType(
	connections: IConnections,
	nodeName: string,
): string | undefined {
	for (const [connectionType, outputSlots] of Object.entries(connections[nodeName] ?? {})) {
		if (connectionType !== NodeConnectionTypes.Main) return connectionType;
		for (const connection of outputSlots.flat()) {
			if (connection && connection.type !== NodeConnectionTypes.Main) return connection.type;
		}
	}
	return undefined;
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
