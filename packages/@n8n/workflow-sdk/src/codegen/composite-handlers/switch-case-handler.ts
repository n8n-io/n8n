/**
 * Switch/Case Composite Handler
 *
 * Builds SwitchCaseCompositeNode from a semantic Switch node.
 */

import type { CompositeNode, SwitchCaseCompositeNode } from '../composite-tree';
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
 * Build branch targets for Switch cases
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
 * Build composite for a Switch node.
 *
 * @param node - The Switch semantic node
 * @param ctx - Build context
 * @returns SwitchCaseCompositeNode
 */
export function buildSwitchCaseComposite(
	node: SemanticNode,
	ctx: BuildContext,
): SwitchCaseCompositeNode {
	const cases: Array<CompositeNode | CompositeNode[] | null> = [];
	const caseIndices: number[] = [];

	const branchCtx: BuildContext = {
		...ctx,
		isBranchContext: true,
	};

	for (const [outputName, connections] of node.outputs) {
		let outputIndex = 0;

		const caseMatch = outputName.match(/^case(\d+)$/);
		if (caseMatch) {
			outputIndex = parseInt(caseMatch[1], 10);
			caseIndices.push(outputIndex);
		} else if (outputName === 'fallback') {
			const fallbackIndex = caseIndices.length > 0 ? Math.max(...caseIndices) + 1 : 0;
			caseIndices.push(fallbackIndex);
			outputIndex = fallbackIndex;
		} else {
			const outputMatch = outputName.match(/(\d+)$/);
			if (outputMatch) {
				outputIndex = parseInt(outputMatch[1], 10);
				caseIndices.push(outputIndex);
			} else {
				caseIndices.push(cases.length);
				outputIndex = cases.length;
			}
		}

		cases.push(buildBranchTargets(connections, branchCtx, node.name, outputIndex));
	}

	return {
		kind: 'switchCase',
		switchNode: node,
		cases,
		caseIndices,
	};
}
