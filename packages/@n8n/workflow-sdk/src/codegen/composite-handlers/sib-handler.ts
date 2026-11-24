/**
 * SplitInBatches Composite Handler
 *
 * Builds SplitInBatchesCompositeNode from a semantic SplitInBatches node.
 */

import type { CompositeNode, SplitInBatchesCompositeNode } from '../composite-tree';
import type { SemanticNode } from '../types';
import { type BuildContext, createLeaf, createVarRef, shouldBeVariable } from './build-utils';

// Re-export BuildContext for consumers
export type { BuildContext } from './build-utils';

/**
 * Build composite from a node, following the chain.
 */
function buildFromNodeSimple(nodeName: string, ctx: BuildContext): CompositeNode {
	const node = ctx.graph.nodes.get(nodeName);
	if (!node) {
		return createVarRef(nodeName);
	}

	if (ctx.visited.has(nodeName)) {
		ctx.variables.set(nodeName, node);
		return createVarRef(nodeName);
	}

	ctx.visited.add(nodeName);

	if (shouldBeVariable(node)) {
		ctx.variables.set(nodeName, node);
	}

	const outputs = node.outputs.get('output') ?? node.outputs.get('output0') ?? [];
	if (outputs.length === 1) {
		const nextTarget = outputs[0].target;
		const nextComposite = buildFromNodeSimple(nextTarget, ctx);
		return {
			kind: 'chain',
			nodes: [createLeaf(node), nextComposite],
		};
	}

	return createLeaf(node);
}

/**
 * Build branch targets for SIB done/loop chains
 */
function buildBranchTargets(
	targets: Array<{ target: string; targetInputSlot?: string }>,
	ctx: BuildContext,
	_sourceNodeName?: string,
	_sourceOutputIndex?: number,
): CompositeNode | CompositeNode[] | null {
	if (targets.length === 0) return null;

	if (targets.length === 1) {
		return buildFromNodeSimple(targets[0].target, ctx);
	}

	const branches: CompositeNode[] = [];
	for (const target of targets) {
		branches.push(buildFromNodeSimple(target.target, ctx));
	}

	return branches;
}

/**
 * Build composite for a SplitInBatches node.
 *
 * @param node - The SplitInBatches semantic node
 * @param ctx - Build context
 * @returns SplitInBatchesCompositeNode
 */
export function buildSplitInBatchesComposite(
	node: SemanticNode,
	ctx: BuildContext,
): SplitInBatchesCompositeNode {
	const doneTargets = node.outputs.get('done') ?? [];
	const loopTargets = node.outputs.get('loop') ?? [];

	const branchCtx: BuildContext = {
		...ctx,
		isBranchContext: true,
	};

	const doneChain = buildBranchTargets(doneTargets, branchCtx, node.name, 0);
	const loopChain = buildBranchTargets(loopTargets, branchCtx, node.name, 1);

	return {
		kind: 'splitInBatches',
		sibNode: node,
		doneChain,
		loopChain,
	};
}
