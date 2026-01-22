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
	VariableReference,
	IfBranchCompositeNode,
	SwitchCaseCompositeNode,
	MergeCompositeNode,
	SplitInBatchesCompositeNode,
	FanOutCompositeNode,
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
 * Reserved keywords that cannot be used as variable names
 */
const RESERVED_KEYWORDS = new Set([
	// JavaScript reserved
	'break',
	'case',
	'catch',
	'class',
	'const',
	'continue',
	'debugger',
	'default',
	'delete',
	'do',
	'else',
	'export',
	'extends',
	'finally',
	'for',
	'function',
	'if',
	'import',
	'in',
	'instanceof',
	'let',
	'new',
	'return',
	'static',
	'super',
	'switch',
	'this',
	'throw',
	'try',
	'typeof',
	'var',
	'void',
	'while',
	'with',
	'yield',
	// SDK functions
	'workflow',
	'trigger',
	'node',
	'merge',
	'ifBranch',
	'switchCase',
	'splitInBatches',
	'sticky',
	'languageModel',
	'tool',
	'memory',
	'outputParser',
	'textSplitter',
	'embeddings',
	'vectorStore',
	'retriever',
	'document',
]);

/**
 * Generate a variable name from node name
 */
function toVarName(nodeName: string): string {
	// Convert to camelCase and sanitize for JS variable name
	let varName = nodeName
		.replace(/[^a-zA-Z0-9]/g, '_')
		.replace(/_+/g, '_')
		.replace(/_$/g, '') // Only remove trailing underscore, not leading
		.replace(/^([A-Z])/, (c) => c.toLowerCase());

	// If starts with digit, prefix with underscore
	if (/^\d/.test(varName)) {
		varName = '_' + varName;
	}

	// Remove leading underscore only if followed by letter (not digit)
	// This preserves _2nd... but removes _Foo...
	if (/^_[a-zA-Z]/.test(varName)) {
		varName = varName.slice(1);
	}

	// Avoid reserved keywords
	if (RESERVED_KEYWORDS.has(varName)) {
		varName = varName + '_node';
	}

	return varName;
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
 * Get all output connection targets from the first output slot
 */
function getAllFirstOutputTargets(node: SemanticNode): string[] {
	// Get all targets from first non-empty output
	for (const [, connections] of node.outputs) {
		if (connections.length > 0) {
			return connections.map((c) => c.target);
		}
	}
	return [];
}

/**
 * Get all output connection targets from ALL output slots
 * This is needed for nodes with multiple independent output slots (like classifiers)
 */
function getAllOutputTargets(node: SemanticNode): string[] {
	const targets: string[] = [];
	for (const [, connections] of node.outputs) {
		for (const conn of connections) {
			if (!targets.includes(conn.target)) {
				targets.push(conn.target);
			}
		}
	}
	return targets;
}

/**
 * Check if a node has multiple output slots (not just multiple targets on one slot)
 */
function hasMultipleOutputSlots(node: SemanticNode): boolean {
	let nonEmptySlots = 0;
	for (const [, connections] of node.outputs) {
		if (connections.length > 0) {
			nonEmptySlots++;
		}
	}
	return nonEmptySlots > 1;
}

/**
 * Check if a node is a merge node
 */
function isMergeType(type: string): boolean {
	return type === 'n8n-nodes-base.merge';
}

/**
 * Check if multiple targets all converge at the same merge node
 */
function detectMergePattern(
	targetNames: string[],
	ctx: BuildContext,
): { mergeNode: SemanticNode; branches: string[] } | null {
	if (targetNames.length < 2) return null;

	// Find what each target connects to
	const mergeTargets = new Map<string, string[]>();

	for (const targetName of targetNames) {
		const targetNode = ctx.graph.nodes.get(targetName);
		if (!targetNode) continue;

		// Get what this target connects to
		const nextTargets = getAllFirstOutputTargets(targetNode);
		for (const nextTarget of nextTargets) {
			const nextNode = ctx.graph.nodes.get(nextTarget);
			if (nextNode && isMergeType(nextNode.type)) {
				const branches = mergeTargets.get(nextTarget) ?? [];
				branches.push(targetName);
				mergeTargets.set(nextTarget, branches);
			}
		}
	}

	// Check if all targets converge at the same merge
	for (const [mergeName, branches] of mergeTargets) {
		if (branches.length === targetNames.length) {
			const mergeNode = ctx.graph.nodes.get(mergeName);
			if (mergeNode) {
				return { mergeNode, branches };
			}
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
 * Build branch targets for IF/Switch/SplitInBatches - handles single target or fan-out
 * Returns:
 * - null: no targets
 * - single CompositeNode: one target
 * - array of CompositeNode[]: multiple parallel targets (fan-out within branch)
 */
function buildBranchTargets(
	targets: Array<{ target: string }>,
	ctx: BuildContext,
): CompositeNode | CompositeNode[] | null {
	if (targets.length === 0) return null;

	if (targets.length === 1) {
		return buildFromNode(targets[0].target, ctx);
	}

	// Multiple targets - build all branches
	const branches: CompositeNode[] = [];
	for (const { target } of targets) {
		if (!ctx.visited.has(target)) {
			branches.push(buildFromNode(target, ctx));
		}
	}

	if (branches.length === 0) return null;
	if (branches.length === 1) return branches[0];

	// Return array for fan-out within branch
	return branches;
}

/**
 * Build composite for an IF node
 */
function buildIfBranch(node: SemanticNode, ctx: BuildContext): IfBranchCompositeNode {
	const trueBranchTargets = node.outputs.get('trueBranch') ?? [];
	const falseBranchTargets = node.outputs.get('falseBranch') ?? [];

	const trueBranch = buildBranchTargets(trueBranchTargets, ctx);
	const falseBranch = buildBranchTargets(falseBranchTargets, ctx);

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
	const cases: (CompositeNode | CompositeNode[] | null)[] = [];

	// Iterate through all outputs in order
	for (const [, connections] of node.outputs) {
		// Use buildBranchTargets to handle fan-out within each case
		cases.push(buildBranchTargets(connections, ctx));
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

	// Build each branch
	// Note: For merge, we inline branches as leaves even if visited,
	// unless they're explicitly declared as variables (cycle/convergence targets)
	for (const branchName of branchNames) {
		const branchNode = ctx.graph.nodes.get(branchName);
		if (branchNode) {
			if (ctx.variables.has(branchName)) {
				// Only use varRef if it's an actual declared variable
				branches.push(createVarRef(branchName));
			} else {
				// Inline as leaf (even if visited during chain traversal)
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

	// Use buildBranchTargets to handle fan-out within each branch
	const doneChain = buildBranchTargets(doneTargets, ctx);
	const loopChain = buildBranchTargets(loopTargets, ctx);

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
	// Also add to variables to ensure declaration is generated
	if (ctx.visited.has(nodeName)) {
		ctx.variables.set(nodeName, node);
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
		// For nodes with multiple output slots (like classifiers), get all targets from all slots
		// For regular fan-out on a single slot, just get first slot targets
		const nextTargets = hasMultipleOutputSlots(node)
			? getAllOutputTargets(node)
			: getAllFirstOutputTargets(node);

		if (nextTargets.length > 1) {
			// Fan-out: check if this leads to a merge pattern
			const mergePattern = detectMergePattern(nextTargets, ctx);
			if (mergePattern) {
				// Generate merge composite with all branches
				const branches: CompositeNode[] = mergePattern.branches.map((branchName) => {
					const branchNode = ctx.graph.nodes.get(branchName);
					if (branchNode) {
						ctx.visited.add(branchName);
						return createLeaf(branchNode);
					}
					return createVarRef(branchName);
				});

				ctx.visited.add(mergePattern.mergeNode.name);
				const mergeComposite: MergeCompositeNode = {
					kind: 'merge',
					mergeNode: mergePattern.mergeNode,
					branches,
				};

				// Check if merge has downstream continuation
				const mergeOutputs = getAllFirstOutputTargets(mergePattern.mergeNode);
				if (mergeOutputs.length > 0) {
					const nextComposite = buildFromNode(mergeOutputs[0], ctx);
					return {
						kind: 'chain',
						nodes: [compositeNode, mergeComposite, nextComposite],
					};
				}

				return {
					kind: 'chain',
					nodes: [compositeNode, mergeComposite],
				};
			}
			// Fan-out without merge - create proper fan-out composite
			const fanOutBranches: CompositeNode[] = [];
			for (const targetName of nextTargets) {
				const targetNode = ctx.graph.nodes.get(targetName);
				if (targetNode) {
					if (ctx.visited.has(targetName)) {
						// Target already visited - use variable reference to preserve connection
						// This is crucial for multi-trigger workflows where triggers share targets
						ctx.variables.set(targetName, targetNode);
						fanOutBranches.push(createVarRef(targetName));
					} else {
						const branchComposite = buildFromNode(targetName, ctx);
						fanOutBranches.push(branchComposite);
					}
				}
			}
			if (fanOutBranches.length > 0) {
				if (fanOutBranches.length === 1) {
					// Single branch - just chain it
					const firstBranch = fanOutBranches[0];
					if (firstBranch.kind === 'chain') {
						return {
							kind: 'chain',
							nodes: [compositeNode, ...firstBranch.nodes],
						};
					}
					return {
						kind: 'chain',
						nodes: [compositeNode, firstBranch],
					};
				}
				// Multiple branches - create fan-out composite for parallel targets
				const fanOut: FanOutCompositeNode = {
					kind: 'fanOut',
					sourceNode: compositeNode,
					targets: fanOutBranches,
				};
				return fanOut;
			}
		} else if (nextTargets.length === 1) {
			const nextTarget = nextTargets[0];
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
