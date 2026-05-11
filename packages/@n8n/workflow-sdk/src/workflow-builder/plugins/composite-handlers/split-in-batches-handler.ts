/**
 * Split In Batches Composite Handler Plugin
 *
 * Handles SplitInBatchesBuilder structures for processing data in batches.
 * This handles both:
 * - Named syntax: splitInBatches(sibNode, { done: ..., each: ... })
 * - Fluent API: splitInBatches(config).onDone(...).onEachBatch(...)
 */

import type { NodeInstance, ConnectionTarget } from '../../../types/base';
import { isNodeChain } from '../../../types/base';
import type { CompositeHandlerPlugin, MutablePluginContext } from '../types';

/**
 * A batch of nodes - either a single node or an array of nodes for fan-out
 */
type NodeBatch =
	| NodeInstance<string, string, unknown>
	| Array<NodeInstance<string, string, unknown>>;

/**
 * Shape of a SplitInBatchesBuilder for type checking
 * Supports both named syntax (_doneTarget/_eachTarget) and fluent API (_doneBatches/_eachBatches)
 */
interface SplitInBatchesBuilderShape {
	sibNode: NodeInstance<string, string, unknown>;
	_doneNodes: Array<NodeInstance<string, string, unknown>>;
	_eachNodes: Array<NodeInstance<string, string, unknown>>;
	// Named syntax targets
	_doneTarget?:
		| NodeInstance<string, string, unknown>
		| Array<NodeInstance<string, string, unknown>>
		| null;
	_eachTarget?:
		| NodeInstance<string, string, unknown>
		| Array<NodeInstance<string, string, unknown>>
		| null;
	// Fluent API batches
	_doneBatches?: NodeBatch[];
	_eachBatches?: NodeBatch[];
	_hasLoop?: boolean;
}

/**
 * Type guard for SplitInBatchesBuilder shape
 */
function isSplitInBatchesBuilderShape(value: unknown): value is SplitInBatchesBuilderShape {
	if (value === null || typeof value !== 'object') return false;

	// Check for required properties
	return 'sibNode' in value && '_doneNodes' in value && '_eachNodes' in value;
}

/**
 * Track SIB builders currently being processed to prevent infinite recursion.
 * This is used when onEachBatch chain loops back to the same SIB builder.
 */
const processingSibBuilders = new WeakSet<object>();

/**
 * Handler for Split In Batches composite structures.
 *
 * Recognizes SplitInBatchesBuilder patterns and adds the SIB node and its
 * done/each targets to the workflow graph.
 */
export const splitInBatchesHandler: CompositeHandlerPlugin<SplitInBatchesBuilderShape> = {
	id: 'core:split-in-batches',
	name: 'Split In Batches Handler',
	priority: 100,

	canHandle(input: unknown): input is SplitInBatchesBuilderShape {
		return isSplitInBatchesBuilderShape(input);
	},

	getHeadNodeName(input: SplitInBatchesBuilderShape): { name: string; id: string } {
		return { name: input.sibNode.name, id: input.sibNode.id };
	},

	collectPinData(
		input: SplitInBatchesBuilderShape,
		collector: (node: NodeInstance<string, string, unknown>) => void,
	): void {
		// Collect from SIB node
		collector(input.sibNode);

		// Note: We don't collect from _doneTarget/_eachTarget here because they are
		// handled via addBranchToGraph which processes them as chains/composites.
		// The pin data for those nodes will be collected when they are visited
		// in the chain's allNodes iteration.
	},

	addNodes(input: SplitInBatchesBuilderShape, ctx: MutablePluginContext): string {
		// Check if we're already processing this builder (prevents infinite recursion)
		// This happens when onEachBatch chain loops back to the same SIB builder
		if (processingSibBuilders.has(input)) {
			return input.sibNode.name;
		}
		processingSibBuilders.add(input);

		try {
			// Check if this is named syntax (has _doneTarget/_eachTarget explicitly set)
			// Named syntax takes precedence over fluent API
			const hasNamedSyntax = '_doneTarget' in input || '_eachTarget' in input;

			if (hasNamedSyntax) {
				return processNamedSyntax(input, ctx);
			}

			// Check if this is fluent API (has _doneBatches/_eachBatches)
			/* eslint-disable @typescript-eslint/prefer-nullish-coalescing -- Logical OR for boolean combination */
			const hasFluentApi =
				(input._doneBatches && input._doneBatches.length > 0) ||
				(input._eachBatches && input._eachBatches.length > 0);
			/* eslint-enable @typescript-eslint/prefer-nullish-coalescing */

			if (hasFluentApi) {
				return processFluentApi(input, ctx);
			}

			// No targets specified - just add the SIB node
			const sibConns = new Map<string, Map<number, ConnectionTarget[]>>();
			sibConns.set('main', new Map());
			ctx.nodes.set(input.sibNode.name, {
				instance: input.sibNode,
				connections: sibConns,
			});

			return input.sibNode.name;
		} finally {
			processingSibBuilders.delete(input);
		}
	},
};

/**
 * Process named syntax: splitInBatches(sibNode, { done: ..., each: ... })
 */
function processNamedSyntax(input: SplitInBatchesBuilderShape, ctx: MutablePluginContext): string {
	const sibMainConns = new Map<number, ConnectionTarget[]>();

	// Process done target (output 0)
	if (input._doneTarget !== null && input._doneTarget !== undefined) {
		const doneTarget = input._doneTarget;
		if (Array.isArray(doneTarget)) {
			// Fan-out: multiple targets from done output
			const targets: ConnectionTarget[] = [];
			for (const target of doneTarget) {
				const targetHead = ctx.addBranchToGraph(target);
				targets.push({ node: targetHead, type: 'main', index: 0 });
			}
			sibMainConns.set(0, targets);
		} else {
			const targetHead = ctx.addBranchToGraph(doneTarget);
			sibMainConns.set(0, [{ node: targetHead, type: 'main', index: 0 }]);
		}
	}

	// Process each target (output 1)
	if (input._eachTarget !== null && input._eachTarget !== undefined) {
		const eachTarget = input._eachTarget;
		if (Array.isArray(eachTarget)) {
			// Fan-out: multiple targets from each output
			const targets: ConnectionTarget[] = [];
			for (const target of eachTarget) {
				const targetHead = ctx.addBranchToGraph(target);
				targets.push({ node: targetHead, type: 'main', index: 0 });
			}
			sibMainConns.set(1, targets);
		} else {
			const targetHead = ctx.addBranchToGraph(eachTarget);
			sibMainConns.set(1, [{ node: targetHead, type: 'main', index: 0 }]);
		}
	}

	// Add the SIB node with connections
	const sibConns = new Map<string, Map<number, ConnectionTarget[]>>();
	sibConns.set('main', sibMainConns);
	ctx.nodes.set(input.sibNode.name, {
		instance: input.sibNode,
		connections: sibConns,
	});

	return input.sibNode.name;
}

/**
 * Process fluent API: splitInBatches(config).onDone(...).onEachBatch(...)
 *
 * The fluent API can store targets in:
 * - _doneTarget/_eachTarget: the full chain/composite (preferred when available)
 * - _doneBatches/_eachBatches: the head nodes only (fallback when targets not set)
 *
 * We prefer _doneTarget/_eachTarget to ensure chain connections are properly
 * established via addBranchToGraph. Fall back to _doneBatches/_eachBatches
 * for backward compatibility with older patterns.
 */
function processFluentApi(input: SplitInBatchesBuilderShape, ctx: MutablePluginContext): string {
	const sibMainConns = new Map<number, ConnectionTarget[]>();
	let lastEachNode: string | null = null;

	// Process done target (output 0)
	// First try _doneTarget (full chain), then fall back to _doneBatches (head nodes)
	if (input._doneTarget !== null && input._doneTarget !== undefined) {
		const doneTarget = input._doneTarget;
		if (Array.isArray(doneTarget)) {
			// Fan-out: multiple targets from done output
			const targets: ConnectionTarget[] = [];
			for (const target of doneTarget) {
				const targetHead = ctx.addBranchToGraph(target);
				targets.push({ node: targetHead, type: 'main', index: 0 });
			}
			sibMainConns.set(0, targets);
		} else {
			const targetHead = ctx.addBranchToGraph(doneTarget);
			sibMainConns.set(0, [{ node: targetHead, type: 'main', index: 0 }]);
		}
	} else if (input._doneBatches && input._doneBatches.length > 0) {
		// Fall back to _doneBatches for fluent API
		const { targets } = processBatches(input._doneBatches, ctx);
		if (targets.length > 0) {
			sibMainConns.set(0, targets);
		}
	}

	// Process each target (output 1)
	// First try _eachTarget (full chain), then fall back to _eachBatches (head nodes)
	if (input._eachTarget !== null && input._eachTarget !== undefined) {
		const eachTarget = input._eachTarget;
		if (Array.isArray(eachTarget)) {
			// Fan-out: multiple targets from each output
			const targets: ConnectionTarget[] = [];
			for (const target of eachTarget) {
				const targetHead = ctx.addBranchToGraph(target);
				targets.push({ node: targetHead, type: 'main', index: 0 });
				// Track the last node for loop connection
				if (isNodeChain(target)) {
					lastEachNode = target.tail?.name ?? targetHead;
				} else {
					lastEachNode = targetHead;
				}
			}
			sibMainConns.set(1, targets);
		} else {
			const targetHead = ctx.addBranchToGraph(eachTarget);
			sibMainConns.set(1, [{ node: targetHead, type: 'main', index: 0 }]);
			// Track the last node for loop connection
			if (isNodeChain(eachTarget)) {
				lastEachNode = eachTarget.tail?.name ?? targetHead;
			} else {
				lastEachNode = targetHead;
			}
		}
	} else if (input._eachBatches && input._eachBatches.length > 0) {
		// Fall back to _eachBatches for fluent API
		const { targets, lastNode } = processBatches(input._eachBatches, ctx);
		if (targets.length > 0) {
			sibMainConns.set(1, targets);
		}
		lastEachNode = lastNode;
	}

	// Add the SIB node with connections
	const sibConns = new Map<string, Map<number, ConnectionTarget[]>>();
	sibConns.set('main', sibMainConns);
	ctx.nodes.set(input.sibNode.name, {
		instance: input.sibNode,
		connections: sibConns,
	});

	// Add loop connection from last each node back to split in batches if hasLoop is true
	if (input._hasLoop && lastEachNode) {
		const lastEachGraphNode = ctx.nodes.get(lastEachNode);
		if (lastEachGraphNode) {
			const lastEachMainConns =
				lastEachGraphNode.connections.get('main') ?? new Map<number, ConnectionTarget[]>();
			const existingConns: ConnectionTarget[] = lastEachMainConns.get(0) ?? [];
			lastEachMainConns.set(0, [
				...existingConns,
				{ node: input.sibNode.name, type: 'main', index: 0 },
			]);
			lastEachGraphNode.connections.set('main', lastEachMainConns);
		}
	}

	return input.sibNode.name;
}

/**
 * Process batches from fluent API (_doneBatches or _eachBatches).
 * Batches are processed sequentially, with each batch connecting to the next.
 * A batch can be a single node or an array of nodes (fan-out).
 *
 * Returns the targets for the first batch (to connect from SIB) and the last node name
 * (for potential loop connection).
 */
function processBatches(
	batches: NodeBatch[],
	ctx: MutablePluginContext,
): { targets: ConnectionTarget[]; lastNode: string | null } {
	const targets: ConnectionTarget[] = [];
	let lastNode: string | null = null;
	let previousBatchNodes: string[] = [];

	for (let i = 0; i < batches.length; i++) {
		const batch = batches[i];
		const currentBatchNodes: string[] = [];

		if (Array.isArray(batch)) {
			// Fan-out: multiple nodes in this batch
			for (const node of batch) {
				const nodeName = ctx.addBranchToGraph(node);
				currentBatchNodes.push(nodeName);
				if (i === 0) {
					targets.push({ node: nodeName, type: 'main', index: 0 });
				}
			}
		} else {
			// Single node in this batch
			const nodeName = ctx.addBranchToGraph(batch);
			currentBatchNodes.push(nodeName);
			if (i === 0) {
				targets.push({ node: nodeName, type: 'main', index: 0 });
			}
		}

		// Connect previous batch nodes to current batch nodes
		if (previousBatchNodes.length > 0 && currentBatchNodes.length > 0) {
			for (const prevNode of previousBatchNodes) {
				const prevGraphNode = ctx.nodes.get(prevNode);
				if (prevGraphNode) {
					const prevMainConns =
						prevGraphNode.connections.get('main') ?? new Map<number, ConnectionTarget[]>();
					const existingConns: ConnectionTarget[] = prevMainConns.get(0) ?? [];
					const newConns: ConnectionTarget[] = currentBatchNodes.map((n) => ({
						node: n,
						type: 'main' as const,
						index: 0,
					}));
					prevMainConns.set(0, [...existingConns, ...newConns]);
					prevGraphNode.connections.set('main', prevMainConns);
				}
			}
		}

		previousBatchNodes = currentBatchNodes;
		// Track the last node (for loop connection)
		if (currentBatchNodes.length > 0) {
			lastNode = currentBatchNodes[currentBatchNodes.length - 1];
		}
	}

	return { targets, lastNode };
}
