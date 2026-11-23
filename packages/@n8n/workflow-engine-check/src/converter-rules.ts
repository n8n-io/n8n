import {
	EXECUTE_WORKFLOW_NODE_TYPE,
	MERGE_NODE_TYPE,
	NodeConnectionTypes,
	isTriggerNodeType,
	type IConnections,
	type INode,
} from 'n8n-workflow';

import { makeReason } from './reason';
import type { EngineV2Reason, EngineV2ReasonCode } from './types';

const SPLIT_IN_BATCHES_NODE_TYPE = 'n8n-nodes-base.splitInBatches';
const SUPPORTED_SPLIT_IN_BATCHES_VERSION = 3;
const DEFAULT_BATCH_SIZE = 1;

/**
 * Mirrors the node-level refusals of `V1WorkflowConverter` in
 * `@n8n/node-engine-compatibility`, plus the Execute Sub-workflow refusals that engine v2
 * makes at run time (`sub-workflow-calls.ts`). The node rules skip disabled nodes. Unlike
 * the converter, they report every refusal, not only the first.
 */
export function findConverterReasons(nodes: INode[], connections: IConnections): EngineV2Reason[] {
	return nodes.flatMap((node) => {
		// The converter turns the fired trigger into a trigger step and skips its node rules.
		const nodeReasons =
			node.disabled === true || isTriggerNodeType(node.type) ? [] : findNodeReasons(node);
		// The converter checks connection types before it removes disabled nodes.
		const connectionType = findNonMainConnectionType(connections, node.name);
		if (connectionType !== undefined) {
			nodeReasons.push(
				temporaryReason(node, 'NON_MAIN_CONNECTION', `it has a "${connectionType}" connection`),
			);
		}
		return nodeReasons;
	});
}

function findNodeReasons(node: INode): EngineV2Reason[] {
	const reasons: EngineV2Reason[] = [];

	if (node.onError === 'continueErrorOutput') {
		reasons.push(temporaryReason(node, 'CONTINUE_ERROR_OUTPUT', 'it uses the error output'));
	}
	if (node.retryOnFail === true) {
		reasons.push(temporaryReason(node, 'RETRY_ON_FAIL', 'it uses Retry On Fail'));
	}
	if (node.alwaysOutputData === true) {
		reasons.push(temporaryReason(node, 'ALWAYS_OUTPUT_DATA', 'it uses Always Output Data'));
	}
	if (node.executeOnce === true) {
		reasons.push(temporaryReason(node, 'EXECUTE_ONCE', 'it uses Execute Once'));
	}

	if (node.type === MERGE_NODE_TYPE) reasons.push(...findMergeReasons(node));
	if (node.type === SPLIT_IN_BATCHES_NODE_TYPE) reasons.push(...findSplitInBatchesReasons(node));
	if (node.type === EXECUTE_WORKFLOW_NODE_TYPE) reasons.push(...findSubWorkflowReasons(node));

	return reasons;
}

function findMergeReasons(node: INode): EngineV2Reason[] {
	const mode = node.parameters.mode;
	if (mode === 'chooseBranch') {
		return [temporaryReason(node, 'MERGE_CHOOSE_BRANCH', 'it uses the Merge mode "Choose Branch"')];
	}
	// Merge v1 predates chooseBranch, so an expression there cannot resolve to it.
	if (node.typeVersion >= 2 && typeof mode === 'string' && mode.startsWith('=')) {
		return [
			finalReason(
				node,
				'MERGE_MODE_EXPRESSION',
				'permanent',
				`The "${node.name}" node sets its Merge mode with an expression. Engine v2 needs the mode before the workflow runs. Use a fixed mode.`,
			),
		];
	}
	return [];
}

function findSplitInBatchesReasons(node: INode): EngineV2Reason[] {
	// Other versions name their parameters differently, so only the version counts.
	if (node.typeVersion !== SUPPORTED_SPLIT_IN_BATCHES_VERSION) {
		return [
			temporaryReason(
				node,
				'SPLIT_IN_BATCHES_VERSION',
				`it is a Loop Over Items node of version ${node.typeVersion}`,
			),
		];
	}

	const reasons: EngineV2Reason[] = [];
	const { options } = node.parameters;

	if (typeof options === 'string') {
		reasons.push(
			finalReason(
				node,
				'SPLIT_IN_BATCHES_OPTIONS_EXPRESSION',
				'permanent',
				`The "${node.name}" node sets its options with an expression. Engine v2 needs them before the workflow runs. Use fixed options.`,
			),
		);
	} else if (
		typeof options === 'object' &&
		options !== null &&
		!Array.isArray(options) &&
		'reset' in options &&
		options.reset !== undefined &&
		options.reset !== false
	) {
		reasons.push(temporaryReason(node, 'SPLIT_IN_BATCHES_RESET', 'it uses the "Reset" option'));
	}

	const batchSize = node.parameters.batchSize ?? DEFAULT_BATCH_SIZE;
	if (typeof batchSize === 'string' && batchSize.startsWith('=')) {
		reasons.push(
			finalReason(
				node,
				'SPLIT_IN_BATCHES_BATCH_SIZE',
				'permanent',
				`The "${node.name}" node sets its batch size with an expression. Engine v2 needs it before the workflow runs. Use a fixed batch size.`,
			),
		);
	} else if (typeof batchSize !== 'number' || !Number.isInteger(batchSize) || batchSize < 1) {
		reasons.push(
			finalReason(
				node,
				'SPLIT_IN_BATCHES_BATCH_SIZE',
				'invalid',
				`The "${node.name}" node needs a batch size that is a whole number of at least 1.`,
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

/** Engine v2 refuses these at run time on purpose, so they get a migration and not engine v1. */
function findSubWorkflowReasons(node: INode): EngineV2Reason[] {
	const reasons: EngineV2Reason[] = [];
	if (node.parameters.mode === 'each') {
		reasons.push(
			finalReason(
				node,
				'SUB_WORKFLOW_FOR_EACH_ITEM',
				'permanent',
				`The "${node.name}" node runs its sub-workflow once for each item. Engine v2 will not support this. Put a Loop Over Items node before "${node.name}" and set its Mode to "Run once with all items".`,
			),
		);
	}
	const { source } = node.parameters;
	if (typeof source === 'string' && source !== 'database' && !source.startsWith('=')) {
		reasons.push(
			finalReason(
				node,
				'SUB_WORKFLOW_NOT_IN_DATABASE',
				'permanent',
				`The "${node.name}" node runs a sub-workflow that is not saved as a workflow. Engine v2 will not support this. Save the sub-workflow as a workflow and select it in "${node.name}".`,
			),
		);
	}
	return reasons;
}

function temporaryReason(node: INode, code: EngineV2ReasonCode, cause: string): EngineV2Reason {
	return makeReason({
		code,
		kind: 'temporary',
		node,
		problem: `Engine v2 cannot run the "${node.name}" node yet, because ${cause}.`,
	});
}

function finalReason(
	node: INode,
	code: EngineV2ReasonCode,
	kind: 'permanent' | 'invalid',
	problem: string,
): EngineV2Reason {
	return makeReason({ code, kind, node, problem });
}
