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
	IfElseCompositeNode,
	SwitchCaseCompositeNode,
	MergeCompositeNode,
	SplitInBatchesCompositeNode,
	FanOutCompositeNode,
	ExplicitConnectionsNode,
	ExplicitConnection,
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
	'ifElse',
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
function createLeaf(node: SemanticNode, errorHandler?: CompositeNode): LeafNode {
	const leaf: LeafNode = { kind: 'leaf', node };
	if (errorHandler) {
		leaf.errorHandler = errorHandler;
	}
	return leaf;
}

/**
 * Check if a node has error output (onError: 'continueErrorOutput')
 */
function hasErrorOutput(node: SemanticNode): boolean {
	return node.json.onError === 'continueErrorOutput';
}

/**
 * Get error output targets from a node
 */
function getErrorOutputTargets(node: SemanticNode): string[] {
	const errorConnections = node.outputs.get('error');
	if (!errorConnections || errorConnections.length === 0) {
		return [];
	}
	return errorConnections.map((c) => c.target);
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
 * Excludes error outputs (handled separately via .onError())
 */
function getAllFirstOutputTargets(node: SemanticNode): string[] {
	// Get all targets from first non-empty, non-error output
	for (const [outputName, connections] of node.outputs) {
		if (outputName === 'error') continue; // Skip error output
		if (connections.length > 0) {
			return connections.map((c) => c.target);
		}
	}
	return [];
}

/**
 * Get all output connection targets from ALL output slots
 * This is needed for nodes with multiple independent output slots (like classifiers)
 * Excludes error outputs (handled separately via .onError())
 */
function getAllOutputTargets(node: SemanticNode): string[] {
	const targets: string[] = [];
	for (const [outputName, connections] of node.outputs) {
		if (outputName === 'error') continue; // Skip error output
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
 * Excludes error outputs (handled separately via .onError())
 */
function hasMultipleOutputSlots(node: SemanticNode): boolean {
	let nonEmptySlots = 0;
	for (const [outputName, connections] of node.outputs) {
		if (outputName === 'error') continue; // Skip error output
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
 * Find a direct Merge node among fan-out targets.
 * Returns the merge node and non-merge targets if one target IS a Merge
 * and other targets feed INTO that same Merge.
 */
function findDirectMergeInFanOut(
	targetNames: string[],
	ctx: BuildContext,
): { mergeNode: SemanticNode; nonMergeTargets: string[] } | null {
	// Find which targets are Merge nodes
	let mergeTarget: SemanticNode | null = null;
	const nonMergeTargets: string[] = [];

	for (const targetName of targetNames) {
		const node = ctx.graph.nodes.get(targetName);
		if (!node) continue;

		if (isMergeType(node.type)) {
			if (mergeTarget !== null) {
				// Multiple merge targets - this pattern doesn't apply
				return null;
			}
			mergeTarget = node;
		} else {
			nonMergeTargets.push(targetName);
		}
	}

	if (!mergeTarget || nonMergeTargets.length === 0) {
		return null;
	}

	// Verify that ALL non-merge targets feed into this merge
	// (checking inputSources of the merge node)
	// If any target doesn't feed into the merge, skip this optimization
	// so that the independent targets are handled correctly via normal fan-out
	const mergeInputSources = new Set<string>();
	for (const [, sources] of mergeTarget.inputSources) {
		for (const source of sources) {
			mergeInputSources.add(source.from);
		}
	}

	// Check that ALL non-merge targets feed into the merge (directly or one hop away)
	const allFeedIntoMerge = nonMergeTargets.every((targetName) => {
		// Direct connection
		if (mergeInputSources.has(targetName)) return true;

		// Check if target's output goes to merge (one hop)
		const targetNode = ctx.graph.nodes.get(targetName);
		if (targetNode) {
			const outputs = getAllFirstOutputTargets(targetNode);
			if (outputs.includes(mergeTarget!.name)) return true;
		}
		return false;
	});

	if (!allFeedIntoMerge) {
		// Some targets don't feed into the merge - skip this optimization
		// They will be handled via normal fan-out handling
		return null;
	}

	return { mergeNode: mergeTarget, nonMergeTargets };
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
 * Check if node should be a variable.
 * In the variables-first format, all regular nodes become variables.
 * Sticky notes are excluded since they have no connections.
 */
function shouldBeVariable(node: SemanticNode): boolean {
	// Sticky notes don't need to be variables (they have no connections)
	if (node.type === 'n8n-nodes-base.stickyNote') {
		return false;
	}
	// All regular nodes become variables for cleaner code
	return true;
}

/**
 * Detect if SplitInBatches outputs go to the same merge node at different input indices.
 * This is Pattern 9/10 from the fixture - SIB.done→Merge:branch0, SIB.loop→Merge:branch1
 *
 * Returns info about the explicit connections needed, or null if not this pattern.
 */
interface SibMergePattern {
	/** The SIB node */
	sibNode: SemanticNode;
	/** The Merge node */
	mergeNode: SemanticNode;
	/** Connections: which SIB output goes to which merge input */
	connections: Array<{
		sibOutput: string; // 'done' or 'loop'
		sibOutputIndex: number; // 0 or 1
		mergeInputSlot: string; // 'branch0', 'branch1', etc.
		mergeInputIndex: number; // 0, 1, etc.
	}>;
	/** Merge output connections (where merge connects to) */
	mergeOutputs: Array<{ target: string; inputSlot: string; inputIndex: number }>;
}

function detectSibMergePattern(sibNode: SemanticNode, ctx: BuildContext): SibMergePattern | null {
	const doneTargets = sibNode.outputs.get('done') ?? [];
	const loopTargets = sibNode.outputs.get('loop') ?? [];

	// Find all merge nodes that SIB outputs connect to
	const mergeConnections = new Map<
		string,
		Array<{
			sibOutput: string;
			sibOutputIndex: number;
			mergeInputSlot: string;
		}>
	>();

	for (const conn of doneTargets) {
		const targetNode = ctx.graph.nodes.get(conn.target);
		if (targetNode && isMergeType(targetNode.type)) {
			const existing = mergeConnections.get(conn.target) ?? [];
			existing.push({
				sibOutput: 'done',
				sibOutputIndex: 0,
				mergeInputSlot: conn.targetInputSlot,
			});
			mergeConnections.set(conn.target, existing);
		}
	}

	for (const conn of loopTargets) {
		const targetNode = ctx.graph.nodes.get(conn.target);
		if (targetNode && isMergeType(targetNode.type)) {
			const existing = mergeConnections.get(conn.target) ?? [];
			existing.push({
				sibOutput: 'loop',
				sibOutputIndex: 1,
				mergeInputSlot: conn.targetInputSlot,
			});
			mergeConnections.set(conn.target, existing);
		}
	}

	// Check if any merge has BOTH done and loop connections from this SIB
	for (const [mergeName, conns] of mergeConnections) {
		const hasDone = conns.some((c) => c.sibOutput === 'done');
		const hasLoop = conns.some((c) => c.sibOutput === 'loop');

		if (hasDone && hasLoop) {
			// Found the pattern! Both SIB outputs go to the same merge
			const mergeNode = ctx.graph.nodes.get(mergeName);
			if (!mergeNode) continue;

			// Parse input indices from slot names (branch0 → 0, branch1 → 1)
			const connections = conns.map((c) => ({
				sibOutput: c.sibOutput,
				sibOutputIndex: c.sibOutputIndex,
				mergeInputSlot: c.mergeInputSlot,
				mergeInputIndex: parseInt(c.mergeInputSlot.replace('branch', ''), 10) || 0,
			}));

			// Get merge output connections
			const mergeOutputTargets = mergeNode.outputs.get('output') ?? [];
			const mergeOutputs = mergeOutputTargets.map((t) => ({
				target: t.target,
				inputSlot: t.targetInputSlot,
				inputIndex: parseInt(t.targetInputSlot.replace('input', ''), 10) || 0,
			}));

			return {
				sibNode,
				mergeNode,
				connections,
				mergeOutputs,
			};
		}
	}

	return null;
}

/**
 * Build an explicit connections node for SIB→merge patterns
 */
function buildSibMergeExplicitConnections(
	pattern: SibMergePattern,
	ctx: BuildContext,
): ExplicitConnectionsNode {
	const nodes: SemanticNode[] = [pattern.sibNode, pattern.mergeNode];
	const connections: ExplicitConnection[] = [];

	// Register both nodes as variables
	ctx.variables.set(pattern.sibNode.name, pattern.sibNode);
	ctx.variables.set(pattern.mergeNode.name, pattern.mergeNode);
	ctx.visited.add(pattern.sibNode.name);
	ctx.visited.add(pattern.mergeNode.name);

	// Add SIB → Merge connections
	for (const conn of pattern.connections) {
		connections.push({
			sourceNode: pattern.sibNode.name,
			sourceOutput: conn.sibOutputIndex,
			targetNode: pattern.mergeNode.name,
			targetInput: conn.mergeInputIndex,
		});
	}

	// Add Merge → target connections
	for (const output of pattern.mergeOutputs) {
		connections.push({
			sourceNode: pattern.mergeNode.name,
			sourceOutput: 0, // Merge has single output
			targetNode: output.target,
			targetInput: output.inputIndex,
		});

		// If merge output goes back to SIB (loop pattern), don't add SIB again
		// It's already in the nodes array
	}

	return {
		kind: 'explicitConnections',
		nodes,
		connections,
	};
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

	const targetNames = targets.map((t) => t.target);

	// Check for "fan-out with direct merge" pattern:
	// One target IS a Merge node, and other targets feed INTO that Merge
	const directMergePattern = findDirectMergeInFanOut(targetNames, ctx);
	if (directMergePattern) {
		const { mergeNode, nonMergeTargets } = directMergePattern;

		// Mark merge as visited FIRST so non-merge targets don't chain to it
		// This prevents buildFromNode for non-merge targets from following their
		// output connection to the merge and building it prematurely
		ctx.visited.add(mergeNode.name);

		// Build chains for non-merge targets
		// These will form part of the merge's input branches
		const builtBranches: CompositeNode[] = [];
		for (const targetName of nonMergeTargets) {
			if (!ctx.visited.has(targetName)) {
				builtBranches.push(buildFromNode(targetName, ctx));
			}
		}

		// Build a merge composite that includes both:
		// 1. The branches we just built (non-merge targets)
		// 2. Any other input sources the merge has (from its inputSources)

		// Get all input sources for the merge
		const allBranchNames: string[] = [];
		for (const [, sources] of mergeNode.inputSources) {
			for (const source of sources) {
				if (!allBranchNames.includes(source.from)) {
					allBranchNames.push(source.from);
				}
			}
		}

		// Build branches array for the merge composite
		// Include variable references to already-built nodes
		const mergeBranches: CompositeNode[] = [];
		for (const branchName of allBranchNames) {
			const branchNode = ctx.graph.nodes.get(branchName);
			if (branchNode) {
				if (ctx.variables.has(branchName)) {
					// Use varRef for declared variables
					mergeBranches.push(createVarRef(branchName));
				} else if (ctx.visited.has(branchName)) {
					// Already built - add as varRef and register as variable
					ctx.variables.set(branchName, branchNode);
					mergeBranches.push(createVarRef(branchName));
				} else {
					// Not yet built - inline as leaf
					mergeBranches.push(createLeaf(branchNode));
				}
			}
		}

		const mergeComposite: MergeCompositeNode = {
			kind: 'merge',
			mergeNode,
			branches: mergeBranches,
		};

		// Check if merge has downstream continuation
		const mergeOutputs = getAllFirstOutputTargets(mergeNode);
		const unvisitedOutputs = mergeOutputs.filter((target) => !ctx.visited.has(target));

		if (unvisitedOutputs.length === 0) {
			// Check if there are visited outputs (loops) that need connections
			const visitedOutputs = mergeOutputs.filter((target) => ctx.visited.has(target));
			if (visitedOutputs.length > 0) {
				// Create varRefs for loop-back connections
				const loopTargets: CompositeNode[] = [];
				for (const target of visitedOutputs) {
					const targetNode = ctx.graph.nodes.get(target);
					if (targetNode) {
						ctx.variables.set(target, targetNode);
						loopTargets.push(createVarRef(target));
					}
				}
				if (loopTargets.length === 1) {
					return {
						kind: 'chain',
						nodes: [mergeComposite, loopTargets[0]],
					};
				}
				if (loopTargets.length > 1) {
					return {
						kind: 'chain',
						nodes: [mergeComposite, ...loopTargets],
					};
				}
			}
			return mergeComposite;
		}

		if (unvisitedOutputs.length === 1) {
			// Single downstream target - chain to it
			const nextComposite = buildFromNode(unvisitedOutputs[0], ctx);
			return {
				kind: 'chain',
				nodes: [mergeComposite, nextComposite],
			};
		}

		// Multiple downstream targets - build as fan-out
		const fanOutBranches: CompositeNode[] = [];
		for (const target of unvisitedOutputs) {
			if (!ctx.visited.has(target)) {
				fanOutBranches.push(buildFromNode(target, ctx));
			}
		}

		if (fanOutBranches.length === 0) {
			return mergeComposite;
		}

		if (fanOutBranches.length === 1) {
			return {
				kind: 'chain',
				nodes: [mergeComposite, fanOutBranches[0]],
			};
		}

		// Return chain with fan-out array
		return {
			kind: 'chain',
			nodes: [mergeComposite, ...fanOutBranches],
		};
	}

	// Multiple targets - build all branches
	const branches: CompositeNode[] = [];
	for (const { target } of targets) {
		if (ctx.visited.has(target)) {
			// Target already visited - add as variable reference to preserve connection
			// This is crucial for fan-out patterns in cycles
			const targetNode = ctx.graph.nodes.get(target);
			if (targetNode) {
				ctx.variables.set(target, targetNode);
				branches.push(createVarRef(target));
			}
		} else {
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
function buildIfElse(node: SemanticNode, ctx: BuildContext): IfElseCompositeNode {
	const trueBranchTargets = node.outputs.get('trueBranch') ?? [];
	const falseBranchTargets = node.outputs.get('falseBranch') ?? [];

	const trueBranch = buildBranchTargets(trueBranchTargets, ctx);
	const falseBranch = buildBranchTargets(falseBranchTargets, ctx);

	return {
		kind: 'ifElse',
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
 * Build composite for a SplitInBatches node.
 * Returns either a SplitInBatchesCompositeNode or an ExplicitConnectionsNode
 * if the pattern requires explicit connections (e.g., SIB→merge at different inputs).
 */
function buildSplitInBatches(
	node: SemanticNode,
	ctx: BuildContext,
): SplitInBatchesCompositeNode | ExplicitConnectionsNode {
	// Check for SIB→merge pattern first
	const sibMergePattern = detectSibMergePattern(node, ctx);
	if (sibMergePattern) {
		// This is the special pattern where SIB outputs go to same merge at different inputs
		return buildSibMergeExplicitConnections(sibMergePattern, ctx);
	}

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
		case 'ifElse':
			compositeNode = buildIfElse(node, ctx);
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
		default: {
			// Regular node - check for error output and chain continuation
			let errorHandler: CompositeNode | undefined;

			// Build error handler chain if node has error output
			if (hasErrorOutput(node)) {
				const errorTargets = getErrorOutputTargets(node);
				if (errorTargets.length > 0) {
					const firstErrorTarget = errorTargets[0];
					if (ctx.visited.has(firstErrorTarget)) {
						// Error target already visited - create variable reference
						// This handles multiple nodes with error outputs pointing to the same handler
						const errorNode = ctx.graph.nodes.get(firstErrorTarget);
						if (errorNode) {
							ctx.variables.set(firstErrorTarget, errorNode);
							errorHandler = createVarRef(firstErrorTarget);
						}
					} else {
						errorHandler = buildFromNode(firstErrorTarget, ctx);
					}
				}
			}

			compositeNode = createLeaf(node, errorHandler);
		}
	}

	// Handle downstream continuation for merge nodes
	if (compositeType === 'merge') {
		const mergeOutputs = getAllFirstOutputTargets(node);
		const unvisitedOutputs = mergeOutputs.filter((target) => !ctx.visited.has(target));

		if (unvisitedOutputs.length === 1) {
			// Single downstream target - chain to it
			const nextComposite = buildFromNode(unvisitedOutputs[0], ctx);
			return {
				kind: 'chain',
				nodes: [compositeNode, nextComposite],
			};
		}

		if (unvisitedOutputs.length > 1) {
			// Multiple downstream targets - build as fan-out
			const fanOutBranches: CompositeNode[] = [];
			for (const target of unvisitedOutputs) {
				fanOutBranches.push(buildFromNode(target, ctx));
			}

			if (fanOutBranches.length === 1) {
				return {
					kind: 'chain',
					nodes: [compositeNode, fanOutBranches[0]],
				};
			}

			// Create fan-out composite for parallel targets
			const fanOut: FanOutCompositeNode = {
				kind: 'fanOut',
				sourceNode: compositeNode,
				targets: fanOutBranches,
			};
			return fanOut;
		}

		// No unvisited outputs - check if there are visited outputs (loops) that need connections
		const visitedOutputs = mergeOutputs.filter((target) => ctx.visited.has(target));
		if (visitedOutputs.length > 0) {
			// Create varRefs for loop-back connections
			const loopTargets: CompositeNode[] = [];
			for (const target of visitedOutputs) {
				const targetNode = ctx.graph.nodes.get(target);
				if (targetNode) {
					ctx.variables.set(target, targetNode);
					loopTargets.push(createVarRef(target));
				}
			}
			if (loopTargets.length === 1) {
				return {
					kind: 'chain',
					nodes: [compositeNode, loopTargets[0]],
				};
			}
			if (loopTargets.length > 1) {
				return {
					kind: 'chain',
					nodes: [compositeNode, ...loopTargets],
				};
			}
		}

		return compositeNode;
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
