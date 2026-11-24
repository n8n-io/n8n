/**
 * Error Handler
 *
 * Helper functions for handling nodes with error outputs (onError: 'continueErrorOutput').
 */

import type { CompositeNode } from '../composite-tree';
import type { SemanticNode } from '../types';
import {
	type BuildContext,
	createLeaf,
	createVarRef,
	shouldBeVariable,
	hasErrorOutput as checkHasErrorOutput,
	getErrorOutputTargets as getErrorTargets,
} from './build-utils';

// Re-export from build-utils
export const hasErrorOutput = checkHasErrorOutput;
export const getErrorOutputTargets = getErrorTargets;

/**
 * Build composite from a node for error handler chain.
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
 * Build error handler chain for a node.
 *
 * @param node - The node that may have an error output
 * @param ctx - Build context
 * @returns The error handler composite, or undefined if no error handler
 */
export function buildErrorHandler(
	node: SemanticNode,
	ctx: BuildContext,
): CompositeNode | undefined {
	if (!hasErrorOutput(node)) {
		return undefined;
	}

	const errorTargets = getErrorOutputTargets(node);
	if (errorTargets.length === 0) {
		return undefined;
	}

	const firstErrorTarget = errorTargets[0];

	if (ctx.visited.has(firstErrorTarget)) {
		const errorNode = ctx.graph.nodes.get(firstErrorTarget);
		if (errorNode) {
			ctx.variables.set(firstErrorTarget, errorNode);
			return createVarRef(firstErrorTarget);
		}
		return undefined;
	}

	return buildFromNodeSimple(firstErrorTarget, ctx);
}
