/**
 * IF/Else Composite Handler
 *
 * Builds IfElseCompositeNode from a semantic IF node.
 */

import type { CompositeNode, IfElseCompositeNode } from '../composite-tree';
import type { SemanticNode } from '../types';
import { type BuildContext, createLeaf, createVarRef, shouldBeVariable } from './build-utils';

// Re-export BuildContext for consumers
export type { BuildContext } from './build-utils';

/**
 * Build composite from a node, following the chain.
 * This is a simplified version that handles basic cases.
 * For complex cases, the full buildFromNode from composite-builder.ts is needed.
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
 * Build branch targets for IF branches - handles single target or fan-out
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
 * Build composite for an IF node.
 *
 * @param node - The IF semantic node
 * @param ctx - Build context
 * @returns IfElseCompositeNode
 */
export function buildIfElseComposite(node: SemanticNode, ctx: BuildContext): IfElseCompositeNode {
	const trueBranchTargets = node.outputs.get('trueBranch') ?? [];
	const falseBranchTargets = node.outputs.get('falseBranch') ?? [];

	const branchCtx: BuildContext = {
		...ctx,
		isBranchContext: true,
	};

	const trueBranch = buildBranchTargets(trueBranchTargets, branchCtx, node.name, 0);
	const falseBranch = buildBranchTargets(falseBranchTargets, branchCtx, node.name, 1);

	return {
		kind: 'ifElse',
		ifNode: node,
		trueBranch,
		falseBranch,
	};
}
