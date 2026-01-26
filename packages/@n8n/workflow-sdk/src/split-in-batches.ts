import { v4 as uuid } from 'uuid';
import type {
	NodeInstance,
	NodeConfig,
	SplitInBatchesBuilder,
	SplitInBatchesConfig,
	SplitInBatchesDoneChain,
	SplitInBatchesEachChain,
	DeclaredConnection,
	NodeChain,
	InputTarget,
	OutputSelector,
} from './types/base';
import { isFanOut } from './fan-out';
import type { FanOutTargets } from './fan-out';

/**
 * Internal split in batches node implementation
 */
class SplitInBatchesNodeInstance
	implements NodeInstance<'n8n-nodes-base.splitInBatches', string, unknown>
{
	readonly type = 'n8n-nodes-base.splitInBatches' as const;
	readonly version: string;
	readonly config: NodeConfig;
	readonly id: string;
	readonly name: string;

	constructor(config: SplitInBatchesConfig = {}) {
		this.version = config.version != null ? String(config.version) : '3';
		this.id = config.id ?? uuid();
		this.name = config.name ?? 'Split In Batches';
		this.config = {
			...config,
			parameters: config.parameters,
		};
	}

	update(
		config: Partial<NodeConfig>,
	): NodeInstance<'n8n-nodes-base.splitInBatches', string, unknown> {
		return new SplitInBatchesNodeInstance({
			...this.config,
			...config,
			version: this.version,
		} as SplitInBatchesConfig);
	}

	input(_index: number): InputTarget {
		throw new Error('SplitInBatches node input connections are managed by SplitInBatchesBuilder');
	}

	output(_index: number): OutputSelector<'n8n-nodes-base.splitInBatches', string, unknown> {
		throw new Error('SplitInBatches node output connections are managed by SplitInBatchesBuilder');
	}

	then<T extends NodeInstance<string, string, unknown>>(
		_target: T | T[] | InputTarget,
		_outputIndex?: number,
	): NodeChain<NodeInstance<'n8n-nodes-base.splitInBatches', string, unknown>, T> {
		throw new Error('SplitInBatches node connections are managed by SplitInBatchesBuilder');
	}

	onError<T extends NodeInstance<string, string, unknown>>(_handler: T): this {
		throw new Error('SplitInBatches node error handling is managed by SplitInBatchesBuilder');
	}

	getConnections(): DeclaredConnection[] {
		return [];
	}
}

/**
 * A batch of nodes - either a single node or an array of nodes for fan-out
 */
export type NodeBatch =
	| NodeInstance<string, string, unknown>
	| NodeInstance<string, string, unknown>[];

/**
 * Target for a branch in named object syntax.
 * Can be:
 * - null: no connection for this branch
 * - NodeInstance: single target
 * - NodeChain: a chain of nodes
 * - FanOutTargets: multiple parallel targets via fanOut()
 */
export type BranchTarget =
	| null
	| NodeInstance<string, string, unknown>
	| NodeChain<NodeInstance<string, string, unknown>, NodeInstance<string, string, unknown>>
	| FanOutTargets;

/**
 * Named object syntax for splitInBatches branches.
 * Makes the intent explicit for code generation.
 */
export interface SplitInBatchesBranches {
	/** Target for done output (output 0) - executes when all batches processed */
	done: BranchTarget;
	/** Target for each output (output 1) - executes for each batch, can loop back */
	each: BranchTarget;
}

/**
 * Internal chain for .done() (output 0)
 */
class DoneChainImpl<TOutput> implements SplitInBatchesDoneChain<TOutput> {
	private _nodes: NodeInstance<string, string, unknown>[] = [];
	private _parent: SplitInBatchesBuilderImpl;

	constructor(parent: SplitInBatchesBuilderImpl) {
		this._parent = parent;
	}

	then<N extends NodeInstance<string, string, unknown>>(
		nodeOrNodes: N | N[] | FanOutTargets,
	): SplitInBatchesDoneChain<N extends NodeInstance<string, string, infer O> ? O : unknown> {
		// Handle FanOutTargets by extracting targets as an array
		if (isFanOut(nodeOrNodes)) {
			const fanOutNodes = nodeOrNodes.targets;
			this._parent._doneBatches.push(fanOutNodes);
			for (const n of fanOutNodes) {
				this._nodes.push(n);
				this._parent._doneNodes.push(n);
			}
			return this as unknown as SplitInBatchesDoneChain<
				N extends NodeInstance<string, string, infer O> ? O : unknown
			>;
		}

		// Store as a batch (preserves array structure for fan-out detection)
		this._parent._doneBatches.push(nodeOrNodes);
		// Also store flat list for backward compatibility
		const nodes = Array.isArray(nodeOrNodes) ? nodeOrNodes : [nodeOrNodes];
		for (const n of nodes) {
			this._nodes.push(n);
			this._parent._doneNodes.push(n);
		}
		return this as unknown as SplitInBatchesDoneChain<
			N extends NodeInstance<string, string, infer O> ? O : unknown
		>;
	}

	/**
	 * Chain to .each() from .done() chain
	 */
	each(): SplitInBatchesEachChain<unknown> {
		return this._parent.each();
	}

	getNodes(): NodeInstance<string, string, unknown>[] {
		return this._nodes;
	}
}

/**
 * Internal chain for .each() (output 1)
 */
class EachChainImpl<TOutput> implements SplitInBatchesEachChain<TOutput> {
	private _nodes: NodeInstance<string, string, unknown>[] = [];
	private _parent: SplitInBatchesBuilderImpl;
	private _hasLoop = false;

	constructor(parent: SplitInBatchesBuilderImpl) {
		this._parent = parent;
	}

	then<N extends NodeInstance<string, string, unknown>>(
		nodeOrNodes: N | N[] | FanOutTargets,
	): SplitInBatchesEachChain<N extends NodeInstance<string, string, infer O> ? O : unknown> {
		// Handle FanOutTargets by extracting targets as an array
		if (isFanOut(nodeOrNodes)) {
			const fanOutNodes = nodeOrNodes.targets;
			this._parent._eachBatches.push(fanOutNodes);
			for (const n of fanOutNodes) {
				this._nodes.push(n);
				this._parent._eachNodes.push(n);
			}
			return this as unknown as SplitInBatchesEachChain<
				N extends NodeInstance<string, string, infer O> ? O : unknown
			>;
		}

		// Store as a batch (preserves array structure for fan-out detection)
		this._parent._eachBatches.push(nodeOrNodes);
		// Also store flat list for backward compatibility
		const nodes = Array.isArray(nodeOrNodes) ? nodeOrNodes : [nodeOrNodes];
		for (const n of nodes) {
			this._nodes.push(n);
			this._parent._eachNodes.push(n);
		}
		return this as unknown as SplitInBatchesEachChain<
			N extends NodeInstance<string, string, infer O> ? O : unknown
		>;
	}

	loop(): SplitInBatchesBuilder<unknown> {
		this._hasLoop = true;
		this._parent._hasLoop = true;
		return this._parent;
	}

	getNodes(): NodeInstance<string, string, unknown>[] {
		return this._nodes;
	}

	hasLoop(): boolean {
		return this._hasLoop;
	}
}

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
 * Internal split in batches builder implementation
 */
class SplitInBatchesBuilderImpl implements SplitInBatchesBuilder<unknown> {
	readonly sibNode: NodeInstance<'n8n-nodes-base.splitInBatches', string, unknown>;
	_doneNodes: NodeInstance<string, string, unknown>[] = [];
	_eachNodes: NodeInstance<string, string, unknown>[] = [];
	_doneBatches: NodeBatch[] = [];
	_eachBatches: NodeBatch[] = [];
	_hasLoop = false;

	constructor(config: SplitInBatchesConfig = {}) {
		this.sibNode = new SplitInBatchesNodeInstance(config);
	}

	done(): SplitInBatchesDoneChain<unknown> {
		return new DoneChainImpl(this);
	}

	each(): SplitInBatchesEachChain<unknown> {
		return new EachChainImpl(this);
	}

	/**
	 * Get all nodes including the split in batches node
	 */
	getAllNodes(): NodeInstance<string, string, unknown>[] {
		return [this.sibNode, ...this._doneNodes, ...this._eachNodes];
	}

	/**
	 * Get the done chain nodes (output 0)
	 */
	getDoneNodes(): NodeInstance<string, string, unknown>[] {
		return this._doneNodes;
	}

	/**
	 * Get the each chain nodes (output 1)
	 */
	getEachNodes(): NodeInstance<string, string, unknown>[] {
		return this._eachNodes;
	}

	/**
	 * Check if the each chain loops back
	 */
	hasLoop(): boolean {
		return this._hasLoop;
	}
}

/**
 * Split in batches builder implementation that wraps an existing node instance
 */
class SplitInBatchesBuilderWithExistingNode implements SplitInBatchesBuilder<unknown> {
	readonly sibNode: NodeInstance<'n8n-nodes-base.splitInBatches', string, unknown>;
	_doneNodes: NodeInstance<string, string, unknown>[] = [];
	_eachNodes: NodeInstance<string, string, unknown>[] = [];
	_doneBatches: NodeBatch[] = [];
	_eachBatches: NodeBatch[] = [];
	_hasLoop = false;

	constructor(existingNode: NodeInstance<'n8n-nodes-base.splitInBatches', string, unknown>) {
		this.sibNode = existingNode;
	}

	done(): SplitInBatchesDoneChain<unknown> {
		return new DoneChainForExistingNode(this);
	}

	each(): SplitInBatchesEachChain<unknown> {
		return new EachChainForExistingNode(this);
	}

	getAllNodes(): NodeInstance<string, string, unknown>[] {
		return [this.sibNode, ...this._doneNodes, ...this._eachNodes];
	}

	getDoneNodes(): NodeInstance<string, string, unknown>[] {
		return this._doneNodes;
	}

	getEachNodes(): NodeInstance<string, string, unknown>[] {
		return this._eachNodes;
	}

	hasLoop(): boolean {
		return this._hasLoop;
	}
}

/**
 * Done chain for existing node builder
 */
class DoneChainForExistingNode<TOutput> implements SplitInBatchesDoneChain<TOutput> {
	private _nodes: NodeInstance<string, string, unknown>[] = [];
	private _parent: SplitInBatchesBuilderWithExistingNode;

	constructor(parent: SplitInBatchesBuilderWithExistingNode) {
		this._parent = parent;
	}

	then<N extends NodeInstance<string, string, unknown>>(
		nodeOrNodes: N | N[] | FanOutTargets,
	): SplitInBatchesDoneChain<N extends NodeInstance<string, string, infer O> ? O : unknown> {
		// Handle FanOutTargets by extracting targets as an array
		if (isFanOut(nodeOrNodes)) {
			const fanOutNodes = nodeOrNodes.targets;
			this._parent._doneBatches.push(fanOutNodes);
			for (const n of fanOutNodes) {
				this._nodes.push(n);
				this._parent._doneNodes.push(n);
			}
			return this as unknown as SplitInBatchesDoneChain<
				N extends NodeInstance<string, string, infer O> ? O : unknown
			>;
		}

		// Store as a batch (preserves array structure for fan-out detection)
		this._parent._doneBatches.push(nodeOrNodes);
		// Also store flat list for backward compatibility
		const nodes = Array.isArray(nodeOrNodes) ? nodeOrNodes : [nodeOrNodes];
		for (const n of nodes) {
			this._nodes.push(n);
			this._parent._doneNodes.push(n);
		}
		return this as unknown as SplitInBatchesDoneChain<
			N extends NodeInstance<string, string, infer O> ? O : unknown
		>;
	}

	each(): SplitInBatchesEachChain<unknown> {
		return this._parent.each();
	}

	getNodes(): NodeInstance<string, string, unknown>[] {
		return this._nodes;
	}
}

/**
 * Each chain for existing node builder
 */
class EachChainForExistingNode<TOutput> implements SplitInBatchesEachChain<TOutput> {
	private _nodes: NodeInstance<string, string, unknown>[] = [];
	private _parent: SplitInBatchesBuilderWithExistingNode;
	private _hasLoop = false;

	constructor(parent: SplitInBatchesBuilderWithExistingNode) {
		this._parent = parent;
	}

	then<N extends NodeInstance<string, string, unknown>>(
		nodeOrNodes: N | N[] | FanOutTargets,
	): SplitInBatchesEachChain<N extends NodeInstance<string, string, infer O> ? O : unknown> {
		// Handle FanOutTargets by extracting targets as an array
		if (isFanOut(nodeOrNodes)) {
			const fanOutNodes = nodeOrNodes.targets;
			this._parent._eachBatches.push(fanOutNodes);
			for (const n of fanOutNodes) {
				this._nodes.push(n);
				this._parent._eachNodes.push(n);
			}
			return this as unknown as SplitInBatchesEachChain<
				N extends NodeInstance<string, string, infer O> ? O : unknown
			>;
		}

		// Store as a batch (preserves array structure for fan-out detection)
		this._parent._eachBatches.push(nodeOrNodes);
		// Also store flat list for backward compatibility
		const nodes = Array.isArray(nodeOrNodes) ? nodeOrNodes : [nodeOrNodes];
		for (const n of nodes) {
			this._nodes.push(n);
			this._parent._eachNodes.push(n);
		}
		return this as unknown as SplitInBatchesEachChain<
			N extends NodeInstance<string, string, infer O> ? O : unknown
		>;
	}

	loop(): SplitInBatchesBuilder<unknown> {
		this._hasLoop = true;
		this._parent._hasLoop = true;
		return this._parent;
	}

	getNodes(): NodeInstance<string, string, unknown>[] {
		return this._nodes;
	}

	hasLoop(): boolean {
		return this._hasLoop;
	}
}

/**
 * Create a split in batches builder for processing items in chunks
 *
 * Split in Batches processes items in configurable batch sizes, with
 * two outputs:
 * - Output 0 (.done()): Executes when all batches are processed
 * - Output 1 (.each()): Executes for each batch, can .loop() back
 *
 * @param configOrNode - Node configuration including version, id, name, and batchSize parameter, OR a pre-declared SplitInBatches node instance
 * @param branches - Optional named object syntax for branches: { done: ..., each: ... }
 * @returns A split in batches builder for configuring the loop
 *
 * @example
 * ```typescript
 * // Fluent API (original):
 * workflow('id', 'Test')
 *   .add(trigger(...))
 *   .then(generateItems)
 *   .then(
 *     splitInBatches({ parameters: { batchSize: 10 } })
 *       .done().then(finalizeNode)
 *       .each().then(processNode).loop()
 *   );
 *
 * // Named object syntax (new):
 * splitInBatches(sibNode, {
 *   done: finalizeNode,
 *   each: processNode.then(sibNode)  // loop back
 * })
 *
 * // With null for empty branches:
 * splitInBatches(sibNode, {
 *   done: null,                       // no done connection
 *   each: sibNode                     // self-loop
 * })
 *
 * // With fanOut for multiple targets:
 * splitInBatches(sibNode, {
 *   done: fanOut(nodeA, nodeB),       // done -> both nodeA and nodeB
 *   each: processNode
 * })
 * ```
 */
export function splitInBatches(
	configOrNode:
		| SplitInBatchesConfig
		| NodeInstance<'n8n-nodes-base.splitInBatches', string, unknown> = {},
	branches?: SplitInBatchesBranches,
): SplitInBatchesBuilder<unknown> {
	// Named object syntax: splitInBatches(node, { done, each })
	if (
		branches !== undefined &&
		isBranchesConfig(branches) &&
		isNodeInstance(configOrNode) &&
		configOrNode.type === 'n8n-nodes-base.splitInBatches'
	) {
		return new SplitInBatchesNamedSyntaxBuilder(
			configOrNode as NodeInstance<'n8n-nodes-base.splitInBatches', string, unknown>,
			branches,
		);
	}

	// Check if the argument is a NodeInstance (pre-declared SplitInBatches node)
	if (isNodeInstance(configOrNode) && configOrNode.type === 'n8n-nodes-base.splitInBatches') {
		return new SplitInBatchesBuilderWithExistingNode(
			configOrNode as NodeInstance<'n8n-nodes-base.splitInBatches', string, unknown>,
		);
	}
	// Otherwise, treat it as a SplitInBatchesConfig
	return new SplitInBatchesBuilderImpl(configOrNode as SplitInBatchesConfig);
}

/**
 * Type guard to check if a value is a SplitInBatchesBuilder
 */
export function isSplitInBatchesBuilder(value: unknown): value is SplitInBatchesBuilderImpl {
	return value instanceof SplitInBatchesBuilderImpl;
}

/**
 * Check if an object is a NodeChain
 */
function isNodeChain(
	obj: unknown,
): obj is NodeChain<NodeInstance<string, string, unknown>, NodeInstance<string, string, unknown>> {
	return (
		obj !== null &&
		typeof obj === 'object' &&
		'_isChain' in obj &&
		(obj as { _isChain: boolean })._isChain === true
	);
}

/**
 * Extract nodes from a BranchTarget
 */
function extractNodesFromTarget(target: BranchTarget): NodeInstance<string, string, unknown>[] {
	if (target === null) {
		return [];
	}
	if (isFanOut(target)) {
		return target.targets;
	}
	if (isNodeChain(target)) {
		return target.allNodes;
	}
	// It's a single NodeInstance
	return [target];
}

/**
 * Extract the first node(s) from a BranchTarget for connection purposes
 */
function getFirstNodes(target: BranchTarget): NodeInstance<string, string, unknown>[] {
	if (target === null) {
		return [];
	}
	if (isFanOut(target)) {
		return target.targets;
	}
	if (isNodeChain(target)) {
		return [target.head];
	}
	// It's a single NodeInstance
	return [target];
}

/**
 * Split in batches builder using named object syntax.
 * This is created via splitInBatches(node, { done, each }).
 */
class SplitInBatchesNamedSyntaxBuilder implements SplitInBatchesBuilder<unknown> {
	readonly sibNode: NodeInstance<'n8n-nodes-base.splitInBatches', string, unknown>;
	readonly _doneTarget: BranchTarget;
	readonly _eachTarget: BranchTarget;
	_doneNodes: NodeInstance<string, string, unknown>[] = [];
	_eachNodes: NodeInstance<string, string, unknown>[] = [];
	_doneBatches: NodeBatch[] = [];
	_eachBatches: NodeBatch[] = [];
	_hasLoop = false;

	constructor(
		sibNode: NodeInstance<'n8n-nodes-base.splitInBatches', string, unknown>,
		branches: SplitInBatchesBranches,
	) {
		this.sibNode = sibNode;
		this._doneTarget = branches.done;
		this._eachTarget = branches.each;

		// Extract nodes from targets
		this._doneNodes = extractNodesFromTarget(branches.done);
		this._eachNodes = extractNodesFromTarget(branches.each);

		// Populate batches for workflow-builder compatibility
		if (branches.done !== null) {
			const firstDoneNodes = getFirstNodes(branches.done);
			if (firstDoneNodes.length > 1) {
				this._doneBatches.push(firstDoneNodes);
			} else if (firstDoneNodes.length === 1) {
				this._doneBatches.push(firstDoneNodes[0]);
			}
		}

		if (branches.each !== null) {
			const firstEachNodes = getFirstNodes(branches.each);
			if (firstEachNodes.length > 1) {
				this._eachBatches.push(firstEachNodes);
			} else if (firstEachNodes.length === 1) {
				this._eachBatches.push(firstEachNodes[0]);
			}
			// For named syntax, we DON'T set _hasLoop because the loop is already
			// expressed in the connection target (e.g., each: sibNode or each: processNode.then(sibNode))
			// The workflow-builder's _hasLoop handling is only for the fluent API's .loop() method
		}
	}

	done(): SplitInBatchesDoneChain<unknown> {
		// For named syntax, done() is a no-op since branches are already configured
		throw new Error(
			'Named object syntax does not support .done() - branches are configured in the constructor',
		);
	}

	each(): SplitInBatchesEachChain<unknown> {
		// For named syntax, each() is a no-op since branches are already configured
		throw new Error(
			'Named object syntax does not support .each() - branches are configured in the constructor',
		);
	}

	getAllNodes(): NodeInstance<string, string, unknown>[] {
		return [this.sibNode, ...this._doneNodes, ...this._eachNodes];
	}

	getDoneNodes(): NodeInstance<string, string, unknown>[] {
		return this._doneNodes;
	}

	getEachNodes(): NodeInstance<string, string, unknown>[] {
		return this._eachNodes;
	}

	hasLoop(): boolean {
		return this._hasLoop;
	}
}

/**
 * Type guard to check if the second argument is a SplitInBatchesBranches object
 */
function isBranchesConfig(arg: unknown): arg is SplitInBatchesBranches {
	return (
		arg !== null &&
		typeof arg === 'object' &&
		'done' in arg &&
		'each' in arg &&
		!('type' in arg) &&
		!('version' in arg)
	);
}
