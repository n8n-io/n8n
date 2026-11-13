/**
 * The table of node types: which lowering each type gets, and what the
 * generator may assume about it (item order, effects).
 */
import { lowerCode } from './code-node.ts';
import type { Lowerer, NodeContext } from './context.ts';
import { libraryNodeTypes, lowerHttpRequest, lowerLibrary } from './library.ts';
import { lowerSplitInBatches } from './loops.ts';
import {
	lowerAggregate,
	lowerFilter,
	lowerIf,
	lowerLimit,
	lowerMerge,
	lowerNoOp,
	lowerRemoveDuplicates,
	lowerRespond,
	lowerSet,
	lowerSort,
	lowerSplitOut,
	lowerStopAndError,
	lowerSwitch,
} from './native.ts';
import { LANGCHAIN_PREFIX, lowerAiNode } from './host-node.ts';
import { lowerFallback } from './steps.ts';
import { lowerExecuteWorkflow } from './subworkflow.ts';
import { lowerTestData, TEST_DATA_TYPE } from './test-data.ts';
import type { N8nNode } from './types.ts';
import { isSendAndWait, lowerForm, lowerSendAndWait, lowerWait } from './waits.ts';

export const BASE = 'n8n-nodes-base.';

export const NATIVE: Record<string, Lowerer> = {
	[`${BASE}noOp`]: lowerNoOp,
	// A sticky note with a connection: v1 gives the input on, as for a node without `execute`.
	[`${BASE}stickyNote`]: lowerNoOp,
	[`${BASE}if`]: lowerIf,
	[`${BASE}filter`]: lowerFilter,
	[`${BASE}switch`]: lowerSwitch,
	[`${BASE}set`]: lowerSet,
	[`${BASE}merge`]: lowerMerge,
	[`${BASE}limit`]: lowerLimit,
	[`${BASE}sort`]: lowerSort,
	[`${BASE}splitOut`]: lowerSplitOut,
	[`${BASE}aggregate`]: lowerAggregate,
	[`${BASE}removeDuplicates`]: lowerRemoveDuplicates,
	[`${BASE}wait`]: lowerWait,
	[`${BASE}form`]: lowerForm,
	[`${BASE}respondToWebhook`]: lowerRespond,
	[`${BASE}stopAndError`]: lowerStopAndError,
	[`${BASE}code`]: lowerCode,
	[`${BASE}function`]: lowerCode,
	[`${BASE}functionItem`]: lowerCode,
	// AI Transform runs its generated JavaScript (`jsCode`) as a Code node in "all items" mode.
	[`${BASE}aiTransform`]: lowerCode,
	[`${BASE}httpRequest`]: lowerHttpRequest,
	[`${BASE}splitInBatches`]: lowerSplitInBatches,
	[`${BASE}executeWorkflow`]: lowerExecuteWorkflow,
};

/** Native nodes with one output that the fallback host can run when their expressions do not translate. */
export const HOST_CAPABLE = new Set(
	['set', 'filter', 'limit', 'sort', 'splitOut', 'aggregate', 'removeDuplicates', 'noOp'].map(
		(t) => `${BASE}${t}`,
	),
);

/** Node types that the fallback host cannot run. */
export const HOST_UNSUPPORTED: Record<string, string> = {
	[`${BASE}respondWithForm`]: 'Forms are not supported.',
	[`${BASE}stickyNote`]: 'Sticky notes do not run.',
	[`${BASE}errorTrigger`]: 'Error workflows are not supported.',
};

/** Node types whose output item i comes from input item i. */
export const ONE_TO_ONE = new Set(
	['set', 'noOp', 'wait', 'respondToWebhook', 'dateTime', 'crypto', 'markdown', 'stopAndError'].map(
		(t) => `${BASE}${t}`,
	),
);

/**
 * Core node types that become code without effects and that work item by
 * item: a run with the items of two parents gives the outputs of two runs,
 * one after the other.
 */
export const ITEM_WISE = new Set(
	['set', 'noOp', 'if', 'filter', 'switch', 'splitOut'].map((t) => `${BASE}${t}`),
);

/** Core node types that become code without effects. */
export const PURE = new Set(
	[
		'set',
		'noOp',
		'if',
		'filter',
		'switch',
		'splitOut',
		'merge',
		'limit',
		'sort',
		'aggregate',
		'removeDuplicates',
		'splitInBatches',
		'stickyNote',
	]
		.map((t) => `${BASE}${t}`)
		.concat(['n8n-nodes-testing.testData']),
);

/** The lowering of a node, or the reason why the node cannot convert. */
export function lowererOf(node: N8nNode): Lowerer | string {
	const native = NATIVE[node.type];
	if (native) return native;
	if (isSendAndWait(node)) return lowerSendAndWait;
	if (libraryNodeTypes().has(node.type)) return lowerLibrary;
	if (HOST_UNSUPPORTED[node.type]) return HOST_UNSUPPORTED[node.type];
	if (node.type === TEST_DATA_TYPE) return lowerTestData;
	if (node.type.startsWith(LANGCHAIN_PREFIX)) return lowerAiNode;
	if (!node.type.startsWith(BASE)) return lowerOtherPackage;
	return lowerFallback;
}

/** A node of another package (a community node): the fallback host runs it when n8n has the package. */
function lowerOtherPackage(c: NodeContext): void {
	c.warn(
		'community-node',
		`The node type ${c.node.type} is not in n8n-nodes-base. The fallback host runs it only when n8n has its package.`,
	);
	lowerFallback(c);
}

/** True when the node runs as a fallback-host or library step (one output list). */
export function isStepLowerer(l: Lowerer): boolean {
	return l === lowerFallback || l === lowerLibrary || l === lowerOtherPackage;
}
