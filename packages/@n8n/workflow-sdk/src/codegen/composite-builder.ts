/**
 * Composite Builder
 *
 * Transforms an annotated semantic graph into a composite tree structure
 * that can be easily converted to SDK code.
 */

import {
	type BuildContext,
	createLeaf,
	createVarRef,
	shouldBeVariable,
	isMergeType,
	isSwitchType,
	extractInputIndex,
	getOutputIndex,
	getOutputSlotName,
	getAllFirstOutputTargets,
	hasErrorOutput,
	getErrorOutputTargets,
} from './composite-handlers/build-utils';
import type {
	CompositeTree,
	CompositeNode,
	VariableReference,
	IfElseCompositeNode,
	SwitchCaseCompositeNode,
	SplitInBatchesCompositeNode,
	FanOutCompositeNode,
	ExplicitConnectionsNode,
	MultiOutputNode,
} from './composite-tree';
import { findDirectMergeInFanOut, detectMergePattern, findMergeInputIndex } from './merge-pattern';
import {
	getAllOutputTargets,
	hasMultipleOutputSlots,
	hasConsecutiveOutputSlots,
	getOutputTargetsByIndex,
} from './output-utils';
import { getCompositeType } from './semantic-registry';
import { detectSibMergePattern, buildSibMergeExplicitConnections } from './sib-merge-handler';
import type { SemanticGraph, SemanticNode } from './types';

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
		const singleTarget = targets[0];
		const targetNode = ctx.graph.nodes.get(singleTarget.target);

		// Special handling for merge nodes in branch context:
		// When a single branch target is a merge node, we need to create a deferred
		// connection with the correct input index from targetInputSlot
		if (ctx.isBranchContext && targetNode && isMergeType(targetNode.type) && sourceNodeName) {
			// Mark merge as visited and register as variable
			ctx.visited.add(singleTarget.target);
			ctx.variables.set(singleTarget.target, targetNode);
			ctx.deferredMergeNodes.add(singleTarget.target);

			// Get input index from targetInputSlot if available
			let inputIndex = 0;
			if (singleTarget.targetInputSlot) {
				inputIndex = extractInputIndex(singleTarget.targetInputSlot);
			} else {
				// Fallback: look up from merge's inputSources using source output slot
				// Determine the slot name format based on source node type
				const sourceNode = ctx.graph.nodes.get(sourceNodeName);
				const isSwitch = sourceNode && isSwitchType(sourceNode.type);
				const outputSlotName = getOutputSlotName(sourceOutputIndex ?? 0, isSwitch);
				inputIndex = findMergeInputIndex(targetNode, sourceNodeName, outputSlotName);
			}

			// Create deferred connection
			ctx.deferredConnections.push({
				sourceNodeName,
				sourceOutputIndex: sourceOutputIndex ?? 0,
				targetNode,
				targetInputIndex: inputIndex,
			});

			// Return variable reference to the merge node
			return createVarRef(singleTarget.target);
		}

		return buildFromNode(singleTarget.target, ctx);
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

		// NOT in branch context - use deferred connections for fan-out merge
		// Mark merge as visited FIRST so non-merge targets don't chain to it
		ctx.visited.add(mergeNode.name);

		// Register merge node as variable for .input(n) syntax
		ctx.variables.set(mergeNode.name, mergeNode);

		// Track this merge for downstream chain building
		ctx.deferredMergeNodes.add(mergeNode.name);

		// Create deferred connections for ALL merge inputs
		for (const [inputSlot, sources] of mergeNode.inputSources) {
			const inputIndex = extractInputIndex(inputSlot);

			for (const source of sources) {
				// Ensure source node is registered as a variable so it gets declared
				const sourceNode = ctx.graph.nodes.get(source.from);
				if (sourceNode) {
					ctx.variables.set(source.from, sourceNode);
				}

				ctx.deferredConnections.push({
					sourceNodeName: source.from,
					sourceOutputIndex: getOutputIndex(source.outputSlot),
					targetNode: mergeNode,
					targetInputIndex: inputIndex,
				});
			}
		}

		// Build chains for non-merge targets (they may have downstream processing)
		const builtBranches: CompositeNode[] = [];
		for (const targetName of nonMergeTargets) {
			if (!ctx.visited.has(targetName)) {
				builtBranches.push(buildFromNode(targetName, ctx));
			}
		}

		// Return the built branches (which don't include merge - it's handled via deferred)
		if (builtBranches.length === 0) return createVarRef(mergeNode.name);
		if (builtBranches.length === 1) return builtBranches[0];
		return builtBranches;
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
	const cases: Array<CompositeNode | CompositeNode[] | null> = [];
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
 * Build composite for a Merge node
 *
 * Always creates deferred connections for each input instead of a MergeCompositeNode.
 * This avoids duplicate key issues in the old merge() syntax and ensures correct
 * output indices when IF/Switch branches connect to merge inputs.
 *
 * Returns a variable reference to the merge node. The actual connections
 * are expressed at root level via .input(n) syntax.
 */
function buildMerge(node: SemanticNode, ctx: BuildContext): VariableReference {
	// Register merge node as a variable since it will be referenced via .input(n) syntax
	ctx.variables.set(node.name, node);

	// Track this merge for downstream chain building
	ctx.deferredMergeNodes.add(node.name);

	// Create deferred connections for each input
	for (const [inputSlot, sources] of node.inputSources) {
		const inputIndex = extractInputIndex(inputSlot);

		for (const source of sources) {
			// Ensure source node is registered as a variable so it gets declared
			const sourceNode = ctx.graph.nodes.get(source.from);
			if (sourceNode) {
				ctx.variables.set(source.from, sourceNode);
			}

			ctx.deferredConnections.push({
				sourceNodeName: source.from,
				sourceOutputIndex: getOutputIndex(source.outputSlot),
				targetNode: node,
				targetInputIndex: inputIndex,
			});
		}
	}

	// Return just a variable reference to the merge
	return createVarRef(node.name);
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

	// Use a branch context for building done/loop chains
	// This ensures merge nodes get proper input index handling
	const branchCtx: BuildContext = {
		...ctx,
		isBranchContext: true,
	};

	// Use buildBranchTargets to handle fan-out within each branch
	// Pass source node name for proper merge input index tracking
	const doneChain = buildBranchTargets(doneTargets, branchCtx, node.name, 0); // done output index is 0
	const loopChain = buildBranchTargets(loopTargets, branchCtx, node.name, 1); // loop output index is 1

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
					// Single target for this output - build chain or deferred connection
					const targetInfo = targets[0];
					const targetNode = ctx.graph.nodes.get(targetInfo.targetName);
					if (targetNode) {
						const targetInputIndex = extractInputIndex(targetInfo.targetInputSlot);

						// If target has non-default input index, create deferred connection only
						// (don't add to outputTargets to avoid duplicate connections)
						if (targetInputIndex > 0) {
							ctx.variables.set(node.name, node);
							ctx.variables.set(targetInfo.targetName, targetNode);
							ctx.deferredConnections.push({
								targetNode,
								targetInputIndex,
								sourceNodeName: node.name,
								sourceOutputIndex: outputIndex,
							});
							// Don't add to outputTargets - the deferred connection handles this
						} else if (ctx.visited.has(targetInfo.targetName)) {
							ctx.variables.set(targetInfo.targetName, targetNode);
							outputTargets.set(outputIndex, createVarRef(targetInfo.targetName));
						} else {
							outputTargets.set(outputIndex, buildFromNode(targetInfo.targetName, ctx));
						}
					}
				} else if (targets.length > 1) {
					// Multiple targets for this output - build fan-out (only for default input targets)
					// Non-default input targets get deferred connections
					const fanOutBranches: CompositeNode[] = [];
					for (const targetInfo of targets) {
						const targetNode = ctx.graph.nodes.get(targetInfo.targetName);
						if (targetNode) {
							const targetInputIndex = extractInputIndex(targetInfo.targetInputSlot);

							// If target has non-default input index, create deferred connection only
							if (targetInputIndex > 0) {
								ctx.variables.set(node.name, node);
								ctx.variables.set(targetInfo.targetName, targetNode);
								ctx.deferredConnections.push({
									targetNode,
									targetInputIndex,
									sourceNodeName: node.name,
									sourceOutputIndex: outputIndex,
								});
								// Don't add to fanOutBranches - the deferred connection handles this
							} else if (ctx.visited.has(targetInfo.targetName)) {
								ctx.variables.set(targetInfo.targetName, targetNode);
								fanOutBranches.push(createVarRef(targetInfo.targetName));
							} else {
								fanOutBranches.push(buildFromNode(targetInfo.targetName, ctx));
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

			// If we have output targets OR deferred connections for this node, use multi-output pattern
			const hasDeferred = ctx.deferredConnections.some((c) => c.sourceNodeName === node.name);
			if (outputTargets.size > 0 || hasDeferred) {
				// Register the source node as a variable since it will be referenced in .output(n).to() calls
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

				// Track this merge for downstream chain building
				ctx.deferredMergeNodes.add(mergePattern.mergeNode.name);

				// Mark merge as visited first to prevent building into merge
				ctx.visited.add(mergePattern.mergeNode.name);

				// Create deferred connections for ALL merge inputs
				for (const [inputSlot, sources] of mergePattern.mergeNode.inputSources) {
					const inputIndex = extractInputIndex(inputSlot);

					for (const source of sources) {
						// Ensure source node is registered as a variable so it gets declared
						const sourceNode = ctx.graph.nodes.get(source.from);
						if (sourceNode) {
							ctx.variables.set(source.from, sourceNode);
						}

						ctx.deferredConnections.push({
							sourceNodeName: source.from,
							sourceOutputIndex: getOutputIndex(source.outputSlot),
							targetNode: mergePattern.mergeNode,
							targetInputIndex: inputIndex,
						});
					}
				}

				// Build branch nodes (they will stop at merge since it's visited)
				// This ensures any chains leading to the branches are properly built
				const builtBranches: CompositeNode[] = [];
				for (const branchName of mergePattern.branches) {
					if (!ctx.visited.has(branchName)) {
						builtBranches.push(buildFromNode(branchName, ctx));
					}
				}

				// Return a fan-out if we have branches, otherwise just the composite
				if (builtBranches.length > 0) {
					if (builtBranches.length === 1) {
						return {
							kind: 'chain',
							nodes: [compositeNode, builtBranches[0]],
						};
					}
					const fanOut: FanOutCompositeNode = {
						kind: 'fanOut',
						sourceNode: compositeNode,
						targets: builtBranches,
					};
					return fanOut;
				}

				// Just return the source node - merge connections are handled via deferred
				return compositeNode;
			}

			// Check for "fan-out with direct merge" pattern:
			// One target IS a Merge node, and other targets feed INTO that Merge
			const directMergePattern = findDirectMergeInFanOut(nextTargets, ctx);
			if (directMergePattern) {
				const { mergeNode, nonMergeTargets } = directMergePattern;

				// Mark merge as visited FIRST so non-merge targets don't chain to it
				ctx.visited.add(mergeNode.name);

				// Register merge node as variable for .input(n) syntax
				ctx.variables.set(mergeNode.name, mergeNode);

				// Track this merge for downstream chain building
				ctx.deferredMergeNodes.add(mergeNode.name);

				// Create deferred connections for ALL merge inputs
				for (const [inputSlot, sources] of mergeNode.inputSources) {
					const inputIndex = extractInputIndex(inputSlot);

					for (const source of sources) {
						// Ensure source node is registered as a variable so it gets declared
						const sourceNode = ctx.graph.nodes.get(source.from);
						if (sourceNode) {
							ctx.variables.set(source.from, sourceNode);
						}

						ctx.deferredConnections.push({
							sourceNodeName: source.from,
							sourceOutputIndex: getOutputIndex(source.outputSlot),
							targetNode: mergeNode,
							targetInputIndex: inputIndex,
						});
					}
				}

				// Build chains for non-merge targets (they may have downstream processing)
				const builtBranches: CompositeNode[] = [];
				for (const targetName of nonMergeTargets) {
					if (!ctx.visited.has(targetName)) {
						builtBranches.push(buildFromNode(targetName, ctx));
					}
				}

				// Return the built branches (which don't include merge - it's handled via deferred)
				if (builtBranches.length === 0) {
					return {
						kind: 'chain',
						nodes: [compositeNode, createVarRef(mergeNode.name)],
					};
				}
				if (builtBranches.length === 1) {
					return {
						kind: 'chain',
						nodes: [compositeNode, builtBranches[0]],
					};
				}
				const fanOut: FanOutCompositeNode = {
					kind: 'fanOut',
					sourceNode: compositeNode,
					targets: builtBranches,
				};
				return fanOut;
			}

			// Fan-out - may include merge nodes that need deferred connections
			// Get actual connections with input slot info (not just target names)
			// This preserves the correct input indices for each connection
			// For multi-output nodes, collect connections from ALL output slots
			const outputConnections: Array<{
				target: string;
				targetInputSlot: string;
				outputSlot: string;
			}> = [];
			for (const [outputSlot, connections] of node.outputs) {
				if (outputSlot === 'error') continue;
				for (const conn of connections) {
					outputConnections.push({
						target: conn.target,
						targetInputSlot: conn.targetInputSlot,
						outputSlot,
					});
				}
			}

			// Track which merge nodes we've handled and collect non-merge targets
			const handledMerges = new Set<string>();
			const nonMergeTargets: string[] = [];

			// Process each connection - for merge nodes, create deferred connections with correct input indices
			for (const conn of outputConnections) {
				const targetNode = ctx.graph.nodes.get(conn.target);
				if (!targetNode) continue;

				if (isMergeType(targetNode.type)) {
					// Mark merge as visited and register as variable (only once per merge)
					if (!handledMerges.has(conn.target)) {
						ctx.visited.add(conn.target);
						ctx.variables.set(conn.target, targetNode);
						ctx.deferredMergeNodes.add(conn.target);
						handledMerges.add(conn.target);
					}

					// Create deferred connection with the correct input index from connection data
					const inputIndex = extractInputIndex(conn.targetInputSlot);
					const sourceOutputIndex = getOutputIndex(conn.outputSlot);
					ctx.deferredConnections.push({
						sourceNodeName: node.name,
						sourceOutputIndex,
						targetNode,
						targetInputIndex: inputIndex,
					});
				} else if (!nonMergeTargets.includes(conn.target)) {
					// Only add non-merge targets once (for deduplication)
					nonMergeTargets.push(conn.target);
				}
			}

			const fanOutBranches: CompositeNode[] = [];
			for (const targetName of nonMergeTargets) {
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
			const nextNode = ctx.graph.nodes.get(nextTarget);

			// IMPORTANT: When in branch context and next target is a merge node,
			// we should NOT chain to it. Instead, defer the connection and stop here.
			// This allows the merge to be expressed with .input(n) syntax at root level.
			if (ctx.isBranchContext && nextNode && isMergeType(nextNode.type)) {
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

			// If next target is a merge node that's already being handled via deferred connections
			// (and we're NOT in branch context), create a deferred connection but don't chain to it.
			if (nextNode && isMergeType(nextNode.type) && ctx.deferredMergeNodes.has(nextTarget)) {
				// Check if a deferred connection already exists for this source to prevent duplicates
				// (the detectMergePattern path may have already created the connection)
				const alreadyHasConnection = ctx.deferredConnections.some(
					(c) => c.sourceNodeName === node.name && c.targetNode.name === nextTarget,
				);

				if (!alreadyHasConnection) {
					// Find which input index this node connects to on merge
					const inputIndex = findMergeInputIndex(nextNode, node.name);

					// Create deferred connection for this source to the merge
					ctx.deferredConnections.push({
						targetNode: nextNode,
						targetInputIndex: inputIndex,
						sourceNodeName: node.name,
						sourceOutputIndex: 0,
					});
				}

				// Return just this node (don't chain to merge)
				return compositeNode;
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

			// Build downstream chain for target
			if (!ctx.visited.has(targetName)) {
				// For non-visited, non-merge targets, build downstream chain
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
			} else {
				// Target is already visited - this is a cycle (merge → visited node)
				// Still need to generate the connection via a variable reference
				ctx.variables.set(targetName, targetNode);
				ctx.deferredMergeDownstreams.push({
					mergeNode,
					downstreamChain: createVarRef(targetName),
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
