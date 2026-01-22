/**
 * Composite Builder
 *
 * Transforms an annotated semantic graph into a composite tree structure
 * that can be easily converted to SDK code.
 */

import type { SemanticGraph, SemanticNode } from './types';
import type {
	CompositeTree,
	CompositeNode,
	LeafNode,
	ChainNode,
	VariableReference,
	IfBranchCompositeNode,
	SwitchCaseCompositeNode,
	MergeCompositeNode,
	SplitInBatchesCompositeNode,
} from './composite-tree';
import { getCompositeType } from './semantic-registry';

/**
 * Context for building composites
 */
interface BuildContext {
	graph: SemanticGraph;
	visited: Set<string>;
	variables: Map<string, SemanticNode>;
}

/**
 * Generate a variable name from node name
 */
function toVarName(nodeName: string): string {
	// Convert to camelCase and sanitize for JS variable name
	return nodeName
		.replace(/[^a-zA-Z0-9]/g, '_')
		.replace(/^(\d)/, '_$1')
		.replace(/_+/g, '_')
		.replace(/^_|_$/g, '')
		.replace(/^([A-Z])/, (c) => c.toLowerCase());
}

/**
 * Create a leaf node
 */
function createLeaf(node: SemanticNode): LeafNode {
	return { kind: 'leaf', node };
}

/**
 * Create a variable reference
 */
function createVarRef(nodeName: string): VariableReference {
	return {
		kind: 'varRef',
		varName: toVarName(nodeName),
		nodeName,
	};
}

/**
 * Get the first output connection target (for single-output following)
 */
function getFirstOutput(node: SemanticNode): string | null {
	// Get first non-empty output
	for (const [, connections] of node.outputs) {
		if (connections.length > 0) {
			return connections[0].target;
		}
	}
	return null;
}

/**
 * Check if node should be a variable (cycle target or convergence point)
 */
function shouldBeVariable(node: SemanticNode): boolean {
	return node.annotations.isCycleTarget || node.annotations.isConvergencePoint;
}

/**
 * Build composite for an IF node
 */
function buildIfBranch(node: SemanticNode, ctx: BuildContext): IfBranchCompositeNode {
	const trueBranchTargets = node.outputs.get('trueBranch') ?? [];
	const falseBranchTargets = node.outputs.get('falseBranch') ?? [];

	const trueBranch =
		trueBranchTargets.length > 0 ? buildFromNode(trueBranchTargets[0].target, ctx) : null;

	const falseBranch =
		falseBranchTargets.length > 0 ? buildFromNode(falseBranchTargets[0].target, ctx) : null;

	return {
		kind: 'ifBranch',
		ifNode: node,
		trueBranch,
		falseBranch,
	};
}

/**
 * Build composite for a Switch node
 */
function buildSwitchCase(node: SemanticNode, ctx: BuildContext): SwitchCaseCompositeNode {
	const cases: (CompositeNode | null)[] = [];

	// Iterate through all outputs in order
	for (const [, connections] of node.outputs) {
		if (connections.length > 0) {
			cases.push(buildFromNode(connections[0].target, ctx));
		} else {
			cases.push(null);
		}
	}

	return {
		kind: 'switchCase',
		switchNode: node,
		cases,
	};
}

/**
 * Build composite for a Merge node
 */
function buildMerge(node: SemanticNode, ctx: BuildContext): MergeCompositeNode {
	// Collect branches from inputSources
	const branches: CompositeNode[] = [];
	const branchNames: string[] = [];

	// Collect all input sources
	for (const [, sources] of node.inputSources) {
		for (const source of sources) {
			if (!branchNames.includes(source.from)) {
				branchNames.push(source.from);
			}
		}
	}

	// Build each branch (but they may already be visited)
	for (const branchName of branchNames) {
		const branchNode = ctx.graph.nodes.get(branchName);
		if (branchNode) {
			if (ctx.visited.has(branchName)) {
				// Already visited, use variable reference
				branches.push(createVarRef(branchName));
			} else {
				branches.push(createLeaf(branchNode));
			}
		}
	}

	return {
		kind: 'merge',
		mergeNode: node,
		branches,
	};
}

/**
 * Build composite for a SplitInBatches node
 */
function buildSplitInBatches(node: SemanticNode, ctx: BuildContext): SplitInBatchesCompositeNode {
	const doneTargets = node.outputs.get('done') ?? [];
	const loopTargets = node.outputs.get('loop') ?? [];

	const doneChain = doneTargets.length > 0 ? buildFromNode(doneTargets[0].target, ctx) : null;

	const loopChain = loopTargets.length > 0 ? buildFromNode(loopTargets[0].target, ctx) : null;

	return {
		kind: 'splitInBatches',
		sibNode: node,
		doneChain,
		loopChain,
	};
}

/**
 * Build composite from a node, following the chain
 */
function buildFromNode(nodeName: string, ctx: BuildContext): CompositeNode {
	const node = ctx.graph.nodes.get(nodeName);
	if (!node) {
		return createVarRef(nodeName);
	}

	// If already visited, return variable reference
	if (ctx.visited.has(nodeName)) {
		return createVarRef(nodeName);
	}

	// If this node should be a variable, register it
	if (shouldBeVariable(node)) {
		ctx.variables.set(nodeName, node);
	}

	ctx.visited.add(nodeName);

	// Determine composite type
	const compositeType = getCompositeType(node.type);

	// Build based on composite type
	let compositeNode: CompositeNode;

	switch (compositeType) {
		case 'ifBranch':
			compositeNode = buildIfBranch(node, ctx);
			break;
		case 'switchCase':
			compositeNode = buildSwitchCase(node, ctx);
			break;
		case 'merge':
			compositeNode = buildMerge(node, ctx);
			break;
		case 'splitInBatches':
			compositeNode = buildSplitInBatches(node, ctx);
			break;
		default:
			// Regular node - check for chain continuation
			compositeNode = createLeaf(node);
	}

	// Check if there's a chain continuation (single output to non-composite target)
	if (compositeType === undefined) {
		const nextTarget = getFirstOutput(node);
		if (nextTarget) {
			const nextComposite = buildFromNode(nextTarget, ctx);
			// Combine into chain
			if (nextComposite.kind === 'chain') {
				return {
					kind: 'chain',
					nodes: [compositeNode, ...nextComposite.nodes],
				};
			} else {
				return {
					kind: 'chain',
					nodes: [compositeNode, nextComposite],
				};
			}
		}
	} else {
		// Composite nodes - check for downstream continuation
		const outputConnections = node.outputs.get('output') ?? node.outputs.get('output0') ?? [];
		if (outputConnections.length > 0 && compositeType !== 'splitInBatches') {
			const nextTarget = outputConnections[0].target;
			const nextComposite = buildFromNode(nextTarget, ctx);
			return {
				kind: 'chain',
				nodes: [compositeNode, nextComposite],
			};
		}
	}

	return compositeNode;
}

/**
 * Build a composite tree from an annotated semantic graph
 *
 * @param graph - The annotated semantic graph
 * @returns A composite tree ready for code generation
 */
export function buildCompositeTree(graph: SemanticGraph): CompositeTree {
	const ctx: BuildContext = {
		graph,
		visited: new Set(),
		variables: new Map(),
	};

	const roots: CompositeNode[] = [];

	// Build from each root
	for (const rootName of graph.roots) {
		const composite = buildFromNode(rootName, ctx);
		roots.push(composite);
	}

	return {
		roots,
		variables: ctx.variables,
	};
}
