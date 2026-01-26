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
	MultiOutputNode,
} from './composite-tree';
import { getCompositeType } from './semantic-registry';

/**
 * Deferred input connection - imported from composite-tree for consistency
 */
interface DeferredInputConnection {
	targetNode: SemanticNode;
	targetInputIndex: number;
	sourceNodeName: string;
	sourceOutputIndex: number;
}

/**
 * Deferred merge downstream - imported from composite-tree for consistency
 */
interface DeferredMergeDownstream {
	mergeNode: SemanticNode;
	downstreamChain: CompositeNode | null;
}

/**
 * Context for building composites
 */
interface BuildContext {
	graph: SemanticGraph;
	visited: Set<string>;
	variables: Map<string, SemanticNode>;
	/** Are we currently inside an IF/Switch branch? */
	isBranchContext: boolean;
	/** Connections to express at root level with .input(n) syntax */
	deferredConnections: DeferredInputConnection[];
	/** Merge nodes whose downstreams need separate generation */
	deferredMergeDownstreams: DeferredMergeDownstream[];
	/** Merge nodes that have been deferred (to avoid building downstream multiple times) */
	deferredMergeNodes: Set<string>;
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
 * Check if a node's non-empty output slots have consecutive indices.
 * This helps distinguish true multi-output nodes (like classifiers where each output
 * is a category) from nodes with semantic outputs (like compareDatasets where outputs
 * 0 and 2 mean "same" and "different" but output 1 is unused).
 *
 * Returns true only if outputs are consecutive starting from 0 (e.g., 0,1,2 not 0,2).
 */
function hasConsecutiveOutputSlots(node: SemanticNode): boolean {
	const occupiedIndices: number[] = [];
	for (const [outputName, connections] of node.outputs) {
		if (outputName === 'error') continue;
		if (connections.length > 0) {
			const index = getOutputIndex(outputName);
			occupiedIndices.push(index);
		}
	}

	if (occupiedIndices.length <= 1) return true; // Single or no outputs are trivially consecutive

	// Sort indices and check if they're consecutive starting from 0
	occupiedIndices.sort((a, b) => a - b);

	// Must start from 0
	if (occupiedIndices[0] !== 0) return false;

	// Check consecutive
	for (let i = 1; i < occupiedIndices.length; i++) {
		if (occupiedIndices[i] !== occupiedIndices[i - 1] + 1) {
			return false;
		}
	}
	return true;
}

/**
 * Extract output index from semantic output name (e.g., 'output0' → 0, 'output1' → 1)
 */
function getOutputIndex(outputName: string): number {
	const match = outputName.match(/^output(\d+)$/);
	if (match) {
		return parseInt(match[1], 10);
	}
	return 0;
}

/**
 * Get output targets grouped by output index for multi-output nodes.
 * Returns a Map from output index to array of target names.
 * Excludes error outputs (handled separately via .onError())
 */
function getOutputTargetsByIndex(node: SemanticNode): Map<number, string[]> {
	const result = new Map<number, string[]>();
	for (const [outputName, connections] of node.outputs) {
		if (outputName === 'error') continue; // Skip error output
		if (connections.length === 0) continue;

		const outputIndex = getOutputIndex(outputName);
		const targets = connections.map((c) => c.target);
		result.set(outputIndex, targets);
	}
	return result;
}

/**
 * Check if a node has outputs going to destinations OTHER than the specified merge node.
 * This is crucial for detecting when a node cannot be safely inlined in a merge composite
 * because it has other outputs that need to be processed separately.
 *
 * Example: Switch → Merge (output 0), Merge1 (output 1), docker ps (output 2)
 * When building Merge, we can't inline Switch because it also connects to Merge1 and docker ps.
 */
function hasOutputsOutsideMerge(node: SemanticNode, mergeNode: SemanticNode): boolean {
	// Get all target node names that feed INTO this merge
	const mergeInputSources = new Set<string>();
	for (const [, sources] of mergeNode.inputSources) {
		for (const source of sources) {
			mergeInputSources.add(source.from);
		}
	}

	// Check if any of the node's outputs go to destinations NOT in the merge's input sources
	// AND that destination is NOT the merge itself
	for (const [outputName, connections] of node.outputs) {
		if (outputName === 'error') continue; // Skip error output
		for (const conn of connections) {
			// If target is NOT the merge AND target is NOT feeding into this merge as another branch
			if (conn.target !== mergeNode.name && !mergeInputSources.has(conn.target)) {
				return true;
			}
		}
	}
	return false;
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
 * Returns null if any target has outputs going to destinations other than the merge
 * (e.g., Switch with multiple output slots going to different destinations)
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

		// Get what this target connects to (first output slot only for merge detection)
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
				// IMPORTANT: Check if any branch has outputs going to OTHER destinations
				// If so, we cannot use the merge pattern as those outputs would be lost
				for (const branchName of branches) {
					const branchNode = ctx.graph.nodes.get(branchName);
					if (branchNode && hasOutputsOutsideMerge(branchNode, mergeNode)) {
						// This branch has other outputs - skip merge pattern
						return null;
					}
				}
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
 *
 * @param targets - Array of target connections
 * @param ctx - Build context
 * @param sourceNodeName - Optional name of the source node (needed for deferred merge connections)
 * @param sourceOutputIndex - Optional output index of the source node
 */
function buildBranchTargets(
	targets: Array<{ target: string; targetInputSlot?: string }>,
	ctx: BuildContext,
	sourceNodeName?: string,
	sourceOutputIndex?: number,
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

		// IMPORTANT: When in a branch context (inside IF/Switch), we need to
		// defer the merge connections rather than nesting them. This is because
		// merge semantics require connections from outside the branch structure,
		// not nested inside branch handlers.
		if (ctx.isBranchContext) {
			// Mark merge as visited to prevent re-processing
			ctx.visited.add(mergeNode.name);
			// Register merge node as variable for the .input(n) syntax
			ctx.variables.set(mergeNode.name, mergeNode);

			// Build branches WITHOUT including the merge composite
			// Track deferred connections for each branch → merge input
			const builtBranches: CompositeNode[] = [];

			for (const targetName of nonMergeTargets) {
				if (ctx.visited.has(targetName)) {
					const targetNode = ctx.graph.nodes.get(targetName);
					if (targetNode) {
						ctx.variables.set(targetName, targetNode);
						builtBranches.push(createVarRef(targetName));
					}
				} else {
					// Build the branch node/chain normally - it will handle merge deferral
					// when it encounters the merge as a downstream target
					builtBranches.push(buildFromNode(targetName, ctx));
				}
			}

			// Also handle direct connection to merge (the merge node itself in targets)
			// This is crucial for patterns like: IF → [NodeA, Merge] where the IF
			// directly connects to merge as one of the fan-out targets
			if (targetNames.includes(mergeNode.name) && sourceNodeName) {
				// Find which input index this direct connection goes to
				const directTarget = targets.find((t) => t.target === mergeNode.name);
				let inputIndex = 0;
				if (directTarget?.targetInputSlot) {
					inputIndex = extractInputIndex(directTarget.targetInputSlot);
				} else {
					// Fallback: look up from merge's inputSources
					inputIndex = findMergeInputIndex(mergeNode, sourceNodeName);
				}

				// Defer this direct connection
				ctx.deferredConnections.push({
					targetNode: mergeNode,
					targetInputIndex: inputIndex,
					sourceNodeName,
					sourceOutputIndex: sourceOutputIndex ?? 0,
				});

				// Track this merge for downstream chain building
				ctx.deferredMergeNodes.add(mergeNode.name);
			}

			if (builtBranches.length === 0) return null;
			if (builtBranches.length === 1) return builtBranches[0];
			return builtBranches;
		}

		// NOT in branch context - use original logic for fan-out merge
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

		// Register merge node as a variable since it will be referenced via .input(n) syntax
		ctx.variables.set(mergeNode.name, mergeNode);

		// Build branches array for the merge composite with input indices
		// Include variable references to already-built nodes
		const mergeBranches: CompositeNode[] = [];
		const mergeInputIndices: number[] = [];
		const processedBranches = new Set<string>();

		// Iterate over inputSources to preserve input index information
		for (const [inputSlot, sources] of mergeNode.inputSources) {
			const inputIndex = extractInputIndex(inputSlot);

			for (const source of sources) {
				// Skip duplicates
				if (processedBranches.has(source.from)) continue;
				processedBranches.add(source.from);

				const branchNode = ctx.graph.nodes.get(source.from);
				if (branchNode) {
					if (ctx.variables.has(source.from)) {
						// Use varRef for declared variables
						mergeBranches.push(createVarRef(source.from));
					} else if (ctx.visited.has(source.from)) {
						// Already built - add as varRef and register as variable
						ctx.variables.set(source.from, branchNode);
						mergeBranches.push(createVarRef(source.from));
					} else {
						// Not yet built - inline as leaf
						mergeBranches.push(createLeaf(branchNode));
					}
					mergeInputIndices.push(inputIndex);
				}
			}
		}

		const mergeComposite: MergeCompositeNode = {
			kind: 'merge',
			mergeNode,
			branches: mergeBranches,
			inputIndices: mergeInputIndices,
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
	// IMPORTANT: When in branch context, we need to handle merge targets specially.
	// Merge targets get deferred connections from the source node (IF/Switch).
	// We must process merge targets FIRST (just defer them, don't build) before building
	// other targets, because building other targets may visit the merge via chains.

	// First pass: identify and defer any direct merge targets in branch context
	if (ctx.isBranchContext && sourceNodeName) {
		for (const targetConn of targets) {
			const target = targetConn.target;
			const targetNode = ctx.graph.nodes.get(target);

			if (targetNode && isMergeType(targetNode.type)) {
				// Direct connection to merge from branch - defer this connection
				ctx.visited.add(target);
				ctx.variables.set(target, targetNode);

				// Find which input index this connection goes to
				let inputIndex = 0;
				if (targetConn.targetInputSlot) {
					inputIndex = extractInputIndex(targetConn.targetInputSlot);
				} else {
					inputIndex = findMergeInputIndex(targetNode, sourceNodeName);
				}

				// Defer this connection to be expressed at root level
				ctx.deferredConnections.push({
					targetNode,
					targetInputIndex: inputIndex,
					sourceNodeName,
					sourceOutputIndex: sourceOutputIndex ?? 0,
				});

				// Track this merge for downstream chain building
				ctx.deferredMergeNodes.add(target);
			}
		}
	}

	// Second pass: build non-merge targets
	const branches: CompositeNode[] = [];
	for (const targetConn of targets) {
		const target = targetConn.target;
		const targetNode = ctx.graph.nodes.get(target);

		// Skip merge nodes in branch context - already handled in first pass
		if (ctx.isBranchContext && sourceNodeName && targetNode && isMergeType(targetNode.type)) {
			continue;
		}

		if (ctx.visited.has(target)) {
			// Target already visited - add as variable reference to preserve connection
			// This is crucial for fan-out patterns in cycles
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
 * Find which input index of a merge node a given source connects to
 */
function findMergeInputIndex(mergeNode: SemanticNode, sourceName: string): number {
	for (const [inputSlot, sources] of mergeNode.inputSources) {
		for (const source of sources) {
			if (source.from === sourceName) {
				return extractInputIndex(inputSlot);
			}
		}
	}
	return 0; // Default to input 0
}

/**
 * Build composite for an IF node
 */
function buildIfElse(node: SemanticNode, ctx: BuildContext): IfElseCompositeNode {
	const trueBranchTargets = node.outputs.get('trueBranch') ?? [];
	const falseBranchTargets = node.outputs.get('falseBranch') ?? [];

	// Create a branch context to track that we're inside IF branches
	// This is important for proper handling of merge nodes connected from branches
	const branchCtx: BuildContext = {
		...ctx,
		isBranchContext: true,
	};

	// Pass the IF node name so deferred merge connections can reference it
	const trueBranch = buildBranchTargets(trueBranchTargets, branchCtx, node.name, 0);
	const falseBranch = buildBranchTargets(falseBranchTargets, branchCtx, node.name, 1);

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
	const caseIndices: number[] = [];

	// Create a branch context to track that we're inside Switch cases
	// This is important for proper handling of merge nodes connected from branches
	const branchCtx: BuildContext = {
		...ctx,
		isBranchContext: true,
	};

	// Iterate through all outputs in order, extracting the case index from the output name
	// Output names are like "case0", "case1", ..., "fallback"
	for (const [outputName, connections] of node.outputs) {
		// Extract case index from output name
		let outputIndex = 0;
		const caseMatch = outputName.match(/^case(\d+)$/);
		if (caseMatch) {
			const caseIndex = parseInt(caseMatch[1], 10);
			caseIndices.push(caseIndex);
			outputIndex = caseIndex;
		} else if (outputName === 'fallback') {
			// Fallback is at the end - we need to determine its index
			// It's after all the case outputs, so we use the current count as the index
			// But we need the actual index from the switch node definition
			// For now, we'll infer it from the position in the Map
			// Since Maps preserve insertion order and outputs are added in index order,
			// the fallback index is the count of outputs we've seen so far
			const fallbackIndex = caseIndices.length > 0 ? Math.max(...caseIndices) + 1 : 0;
			caseIndices.push(fallbackIndex);
			outputIndex = fallbackIndex;
		} else {
			// For any other output pattern (like "outputN"), try to extract the number
			const outputMatch = outputName.match(/(\d+)$/);
			if (outputMatch) {
				const idx = parseInt(outputMatch[1], 10);
				caseIndices.push(idx);
				outputIndex = idx;
			} else {
				// Default to sequential index
				caseIndices.push(cases.length);
				outputIndex = cases.length;
			}
		}
		// Use buildBranchTargets with branch context to handle fan-out within each case
		// Pass the switch node name and output index for deferred merge connections
		cases.push(buildBranchTargets(connections, branchCtx, node.name, outputIndex));
	}

	return {
		kind: 'switchCase',
		switchNode: node,
		cases,
		caseIndices,
	};
}

/**
 * Extract input index from input slot name (e.g., "branch0" → 0, "input2" → 2)
 */
function extractInputIndex(slotName: string): number {
	const match = slotName.match(/(\d+)$/);
	return match ? parseInt(match[1], 10) : 0;
}

/**
 * Build composite for a Merge node
 */
function buildMerge(node: SemanticNode, ctx: BuildContext): MergeCompositeNode {
	// Register merge node as a variable since it will be referenced via .input(n) syntax
	ctx.variables.set(node.name, node);

	// Collect branches from inputSources WITH their input indices
	const branches: CompositeNode[] = [];
	const inputIndices: number[] = [];
	const processedBranches = new Set<string>();

	// Iterate over inputSources to preserve input index information
	// Input sources are keyed by slot name (e.g., "branch0", "branch1")
	for (const [inputSlot, sources] of node.inputSources) {
		const inputIndex = extractInputIndex(inputSlot);

		for (const source of sources) {
			// Skip duplicates (same branch might appear in multiple sources)
			if (processedBranches.has(source.from)) continue;
			processedBranches.add(source.from);

			const branchNode = ctx.graph.nodes.get(source.from);
			if (branchNode) {
				// Check if node has outputs going elsewhere (not just to this merge)
				const hasOtherOutputs = hasOutputsOutsideMerge(branchNode, node);

				if (ctx.variables.has(source.from)) {
					// Already a declared variable - use varRef
					branches.push(createVarRef(source.from));
				} else if (hasOtherOutputs) {
					// Node has outputs to other destinations - must be a variable
					// so those outputs can be processed separately
					ctx.variables.set(source.from, branchNode);
					branches.push(createVarRef(source.from));
				} else {
					// Safe to inline as leaf
					branches.push(createLeaf(branchNode));
				}
				inputIndices.push(inputIndex);
			}
		}
	}

	return {
		kind: 'merge',
		mergeNode: node,
		branches,
		inputIndices,
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
		// Check for multi-output nodes (like text classifiers)
		// These need special handling to preserve output indices.
		// Only use this for nodes with CONSECUTIVE output slots (0,1,2 not 0,2).
		// Non-consecutive outputs (like compareDatasets with 0,2) suggest semantic
		// meaning where we should use regular fan-out handling instead.
		if (hasMultipleOutputSlots(node) && hasConsecutiveOutputSlots(node)) {
			const targetsByIndex = getOutputTargetsByIndex(node);

			// Build targets for each output index
			const outputTargets = new Map<number, CompositeNode>();
			for (const [outputIndex, targets] of targetsByIndex) {
				if (targets.length === 1) {
					// Single target for this output - build chain
					const targetName = targets[0];
					const targetNode = ctx.graph.nodes.get(targetName);
					if (targetNode) {
						if (ctx.visited.has(targetName)) {
							ctx.variables.set(targetName, targetNode);
							outputTargets.set(outputIndex, createVarRef(targetName));
						} else {
							outputTargets.set(outputIndex, buildFromNode(targetName, ctx));
						}
					}
				} else if (targets.length > 1) {
					// Multiple targets for this output - build fan-out
					const fanOutBranches: CompositeNode[] = [];
					for (const targetName of targets) {
						const targetNode = ctx.graph.nodes.get(targetName);
						if (targetNode) {
							if (ctx.visited.has(targetName)) {
								ctx.variables.set(targetName, targetNode);
								fanOutBranches.push(createVarRef(targetName));
							} else {
								fanOutBranches.push(buildFromNode(targetName, ctx));
							}
						}
					}
					if (fanOutBranches.length > 0) {
						const fanOut: FanOutCompositeNode = {
							kind: 'fanOut',
							sourceNode: createLeaf(node),
							targets: fanOutBranches,
						};
						outputTargets.set(outputIndex, fanOut);
					}
				}
			}

			if (outputTargets.size > 0) {
				// Register the source node as a variable since it will be referenced in .output(n).then() calls
				ctx.variables.set(node.name, node);
				const multiOutput: MultiOutputNode = {
					kind: 'multiOutput',
					sourceNode: node,
					outputTargets,
				};
				return multiOutput;
			}
		}

		// Regular node handling
		// For nodes with multiple non-consecutive output slots (like compareDatasets with outputs 0 and 2),
		// we need to get targets from ALL output slots, not just the first one.
		// This preserves all connections without using the MultiOutputNode pattern which
		// is meant for classifier-style nodes with consecutive outputs.
		const nextTargets = hasMultipleOutputSlots(node)
			? getAllOutputTargets(node)
			: getAllFirstOutputTargets(node);

		if (nextTargets.length > 1) {
			// Fan-out: check if this leads to a merge pattern
			const mergePattern = detectMergePattern(nextTargets, ctx);
			if (mergePattern) {
				// Register merge node as a variable since it will be referenced via .input(n) syntax
				ctx.variables.set(mergePattern.mergeNode.name, mergePattern.mergeNode);

				// Generate merge composite with all branches and their input indices
				const branches: CompositeNode[] = [];
				const inputIndices: number[] = [];
				const processedBranches = new Set<string>();

				// Iterate over merge's inputSources to preserve input index information
				for (const [inputSlot, sources] of mergePattern.mergeNode.inputSources) {
					const inputIndex = extractInputIndex(inputSlot);

					for (const source of sources) {
						// Skip if not in the pattern's branches or already processed
						if (!mergePattern.branches.includes(source.from)) continue;
						if (processedBranches.has(source.from)) continue;
						processedBranches.add(source.from);

						const branchNode = ctx.graph.nodes.get(source.from);
						if (branchNode) {
							ctx.visited.add(source.from);
							branches.push(createLeaf(branchNode));
						} else {
							branches.push(createVarRef(source.from));
						}
						inputIndices.push(inputIndex);
					}
				}

				ctx.visited.add(mergePattern.mergeNode.name);
				const mergeComposite: MergeCompositeNode = {
					kind: 'merge',
					mergeNode: mergePattern.mergeNode,
					branches,
					inputIndices,
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

			// IMPORTANT: When in branch context and next target is a merge node,
			// we should NOT chain to it. Instead, defer the connection and stop here.
			// This allows the merge to be expressed with .input(n) syntax at root level.
			if (ctx.isBranchContext) {
				const nextNode = ctx.graph.nodes.get(nextTarget);
				if (nextNode && isMergeType(nextNode.type)) {
					// Mark merge as visited and register as variable
					ctx.visited.add(nextTarget);
					ctx.variables.set(nextTarget, nextNode);

					// Find which input index this node connects to on merge
					const inputIndex = findMergeInputIndex(nextNode, node.name);

					// Defer this connection to be expressed at root level
					ctx.deferredConnections.push({
						targetNode: nextNode,
						targetInputIndex: inputIndex,
						sourceNodeName: node.name,
						sourceOutputIndex: 0,
					});

					// Track this merge for downstream chain building
					ctx.deferredMergeNodes.add(nextTarget);

					// Return just this node (don't chain to merge)
					return compositeNode;
				}
			}

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
		isBranchContext: false,
		deferredConnections: [],
		deferredMergeDownstreams: [],
		deferredMergeNodes: new Set(),
	};

	const roots: CompositeNode[] = [];

	// Build from each root
	for (const rootName of graph.roots) {
		const composite = buildFromNode(rootName, ctx);
		roots.push(composite);
	}

	// Build downstream chains for deferred merge nodes
	// Do this AFTER building roots so all other nodes are visited
	for (const mergeNodeName of ctx.deferredMergeNodes) {
		const mergeNode = graph.nodes.get(mergeNodeName);
		if (!mergeNode) continue;

		// Get merge outputs
		const mergeOutputs = mergeNode.outputs.get('output') ?? [];

		for (const output of mergeOutputs) {
			const targetName = output.target;
			const targetNode = graph.nodes.get(targetName);
			if (!targetNode) continue;

			// Check if target is ALSO a deferred merge - need to add as deferred connection
			if (ctx.deferredMergeNodes.has(targetName) && isMergeType(targetNode.type)) {
				// Merge → Merge connection: add as deferred connection with .input(n)
				const inputIndex = extractInputIndex(output.targetInputSlot);
				ctx.deferredConnections.push({
					targetNode,
					targetInputIndex: inputIndex,
					sourceNodeName: mergeNodeName,
					sourceOutputIndex: 0,
				});
				continue;
			}

			// For non-merge targets that are not visited, build downstream chain
			if (!ctx.visited.has(targetName)) {
				// Reset isBranchContext for building downstream (we're at root level now)
				const downstreamCtx: BuildContext = {
					...ctx,
					isBranchContext: false,
				};

				const downstreamChain = buildFromNode(targetName, downstreamCtx);
				ctx.deferredMergeDownstreams.push({
					mergeNode,
					downstreamChain,
				});
			}
		}
	}

	return {
		roots,
		variables: ctx.variables,
		deferredConnections: ctx.deferredConnections,
		deferredMergeDownstreams: ctx.deferredMergeDownstreams,
	};
}
