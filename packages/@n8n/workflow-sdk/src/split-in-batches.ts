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
} from './types/base';

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

	then<T extends NodeInstance<string, string, unknown>>(
		_target: T | T[],
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
 * Internal chain for .done() (output 0)
 */
class DoneChainImpl<TOutput> implements SplitInBatchesDoneChain<TOutput> {
	private _nodes: NodeInstance<string, string, unknown>[] = [];
	private _parent: SplitInBatchesBuilderImpl;

	constructor(parent: SplitInBatchesBuilderImpl) {
		this._parent = parent;
	}

	then<N extends NodeInstance<string, string, unknown>>(
		nodeOrNodes: N | N[],
	): SplitInBatchesDoneChain<N extends NodeInstance<string, string, infer O> ? O : unknown> {
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
		nodeOrNodes: N | N[],
	): SplitInBatchesEachChain<N extends NodeInstance<string, string, infer O> ? O : unknown> {
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
		nodeOrNodes: N | N[],
	): SplitInBatchesDoneChain<N extends NodeInstance<string, string, infer O> ? O : unknown> {
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
		nodeOrNodes: N | N[],
	): SplitInBatchesEachChain<N extends NodeInstance<string, string, infer O> ? O : unknown> {
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
 * @returns A split in batches builder for configuring the loop
 *
 * @example
 * ```typescript
 * workflow('id', 'Test')
 *   .add(trigger(...))
 *   .then(generateItems)
 *   .then(
 *     splitInBatches({ parameters: { batchSize: 10 } })
 *       .done().then(finalizeNode)
 *       .each().then(processNode).loop()
 *   );
 *
 * // With explicit version:
 * splitInBatches({ version: 2, parameters: { batchSize: 5 } })
 *
 * // Using a pre-declared SplitInBatches node:
 * const sibNode = node({ type: 'n8n-nodes-base.splitInBatches', ... });
 * splitInBatches(sibNode).done().then(finalNode).each().then(processNode).loop()
 *
 * // This creates:
 * // generateItems -> splitInBatches
 * //                  ├─(0)─> finalizeNode (when done)
 * //                  └─(1)─> processNode ─┐
 * //                              ↑────────┘ (loop)
 * ```
 */
export function splitInBatches(
	configOrNode:
		| SplitInBatchesConfig
		| NodeInstance<'n8n-nodes-base.splitInBatches', string, unknown> = {},
): SplitInBatchesBuilder<unknown> {
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
