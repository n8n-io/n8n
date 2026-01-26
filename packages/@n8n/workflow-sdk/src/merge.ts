import type { MergeComposite, MergeMode, NodeInstance, NodeChain } from './types/base';
import { isNodeChain } from './types/base';
import { createChainWithMergeComposite } from './node-builder';
import { isFanIn } from './fan-in';
import type { FanInSources } from './fan-in';

/**
 * Check if an object is a NodeInstance (has type, version, config, then method)
 */
function isNodeInstance(obj: unknown): obj is NodeInstance<string, string, unknown> {
	return (
		obj !== null &&
		typeof obj === 'object' &&
		'type' in obj &&
		'version' in obj &&
		'config' in obj &&
		'then' in obj &&
		typeof (obj as NodeInstance<string, string, unknown>).then === 'function'
	);
}

/**
 * Source for a merge input in named syntax.
 * Can be:
 * - NodeInstance: single source
 * - NodeChain: a chain of nodes (the tail connects to merge)
 * - FanInSources: multiple sources via fanIn()
 */
export type MergeInputSource =
	| NodeInstance<string, string, unknown>
	| NodeChain<NodeInstance<string, string, unknown>, NodeInstance<string, string, unknown>>
	| FanInSources;

/**
 * Named input syntax for merge.
 * Keys are input0, input1, input2, etc.
 */
export interface MergeNamedInputs {
	[key: `input${number}`]: MergeInputSource;
}

/**
 * Check if an object is a MergeNamedInputs config
 */
function isMergeNamedInputs(obj: unknown): obj is MergeNamedInputs {
	if (obj === null || typeof obj !== 'object') return false;
	// Must have at least one inputN key
	const keys = Object.keys(obj);
	if (keys.length === 0) return false;
	// All keys must be inputN format
	return keys.every((key) => /^input\d+$/.test(key));
}

/**
 * Extract nodes from a MergeInputSource
 */
function extractNodesFromInputSource(
	source: MergeInputSource,
): NodeInstance<string, string, unknown>[] {
	if (isFanIn(source)) {
		return source.sources;
	}
	if (isNodeChain(source)) {
		return source.allNodes;
	}
	// It's a single NodeInstance
	return [source];
}

/**
 * Get the tail node from a MergeInputSource (the node that connects to merge)
 */
function getTailNode(source: MergeInputSource): NodeInstance<string, string, unknown>[] {
	if (isFanIn(source)) {
		// For fanIn, all sources connect to the merge
		return source.sources;
	}
	if (isNodeChain(source)) {
		return [source.tail];
	}
	// It's a single NodeInstance
	return [source];
}

/**
 * Merge composite using named input syntax.
 * This allows explicit mapping of sources to input indices.
 */
class MergeCompositeNamedInputs<TBranches extends NodeInstance<string, string, unknown>[]>
	implements MergeComposite<TBranches>
{
	readonly mergeNode: NodeInstance<'n8n-nodes-base.merge', string, unknown>;
	readonly branches: TBranches;
	readonly mode: MergeMode;
	/** Map from input index to source nodes */
	readonly inputMapping: Map<number, NodeInstance<string, string, unknown>[]>;
	/** All nodes from all inputs (for workflow-builder) */
	readonly _allInputNodes: NodeInstance<string, string, unknown>[];
	/** Marker to identify this as named input syntax */
	readonly _isNamedInputSyntax = true;

	constructor(
		mergeNode: NodeInstance<'n8n-nodes-base.merge', string, unknown>,
		inputs: MergeNamedInputs,
	) {
		this.mergeNode = mergeNode;

		// Parse input indices and build mapping
		this.inputMapping = new Map();
		const allNodes: NodeInstance<string, string, unknown>[] = [];
		const headNodes: NodeInstance<string, string, unknown>[] = [];

		for (const [key, source] of Object.entries(inputs)) {
			const inputIndex = parseInt(key.replace('input', ''), 10);
			const tailNodes = getTailNode(source);
			this.inputMapping.set(inputIndex, tailNodes);

			// Collect all nodes for branches array
			const sourceNodes = extractNodesFromInputSource(source);
			allNodes.push(...sourceNodes);

			// Collect head nodes for the branches array (entry points)
			if (isFanIn(source)) {
				headNodes.push(...source.sources);
			} else if (isNodeChain(source)) {
				headNodes.push(source.head);
			} else {
				headNodes.push(source);
			}
		}

		this._allInputNodes = allNodes;
		// branches is used by workflow-builder to know what nodes to add
		this.branches = headNodes as TBranches;

		// Extract mode from merge node config
		const params = mergeNode.config.parameters as { mode?: MergeMode } | undefined;
		this.mode = params?.mode ?? 'append';
	}

	then<T extends NodeInstance<string, string, unknown>>(
		target: T | T[],
		outputIndex: number = 0,
	): NodeChain<NodeInstance<'n8n-nodes-base.merge', string, unknown>, T> {
		const baseChain = this.mergeNode.then(target, outputIndex);
		return createChainWithMergeComposite(baseChain, this);
	}
}

/**
 * Type guard to check if a MergeComposite uses named input syntax
 */
export function isMergeNamedInputSyntax(
	composite: MergeComposite<NodeInstance<string, string, unknown>[]>,
): composite is MergeCompositeNamedInputs<NodeInstance<string, string, unknown>[]> {
	return '_isNamedInputSyntax' in composite && composite._isNamedInputSyntax === true;
}

/**
 * Create a merge composite for parallel branch execution.
 *
 * Requires named syntax: merge(mergeNode, { input0: source1, input1: source2 })
 *
 * @param mergeNode - A pre-declared Merge node (n8n-nodes-base.merge)
 * @param inputs - Named inputs { input0: source, input1: source, ... }
 * @returns A merge composite that can be passed to workflow.then()
 *
 * @example
 * ```typescript
 * // First declare the merge node:
 * const combineResults = node({
 *   type: 'n8n-nodes-base.merge',
 *   version: 3,
 *   config: {
 *     name: 'Combine Results',
 *     parameters: { mode: 'combine' }
 *   }
 * });
 *
 * // Then use it with named inputs:
 * workflow('id', 'Test')
 *   .add(trigger)
 *   .then(merge(combineResults, {
 *     input0: api1,
 *     input1: api2
 *   }))
 *   .then(processResults);
 *
 * // With fanIn for multiple sources to same input:
 * merge(mergeNode, {
 *   input0: fanIn(sourceA, sourceB),  // both go to input 0
 *   input1: sourceC
 * })
 * ```
 */
export function merge<TBranches extends NodeInstance<string, string, unknown>[]>(
	mergeNode: NodeInstance<'n8n-nodes-base.merge', string, unknown>,
	inputs: MergeNamedInputs,
): MergeComposite<TBranches> {
	// Validate that first argument is a Merge node
	if (!isNodeInstance(mergeNode) || mergeNode.type !== 'n8n-nodes-base.merge') {
		throw new Error(
			'merge() requires a Merge node as first argument. Use: merge(mergeNode, { input0: ..., input1: ... })',
		);
	}

	// Validate that second argument is named inputs
	if (!isMergeNamedInputs(inputs)) {
		throw new Error(
			'merge() requires named inputs as second argument. Use: merge(mergeNode, { input0: ..., input1: ... })',
		);
	}

	return new MergeCompositeNamedInputs(mergeNode, inputs) as unknown as MergeComposite<TBranches>;
}
