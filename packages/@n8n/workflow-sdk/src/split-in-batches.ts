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
 * Internal chain for .done() (output 0)
 */
class DoneChainImpl<TOutput> implements SplitInBatchesDoneChain<TOutput> {
	private _nodes: NodeInstance<string, string, unknown>[] = [];
	private _parent: SplitInBatchesBuilderImpl;

	constructor(parent: SplitInBatchesBuilderImpl) {
		this._parent = parent;
	}

	then<N extends NodeInstance<string, string, unknown>>(
		node: N,
	): SplitInBatchesDoneChain<N extends NodeInstance<string, string, infer O> ? O : unknown> {
		this._nodes.push(node);
		this._parent._doneNodes.push(node);
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
		node: N,
	): SplitInBatchesEachChain<N extends NodeInstance<string, string, infer O> ? O : unknown> {
		this._nodes.push(node);
		this._parent._eachNodes.push(node);
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
 * Internal split in batches builder implementation
 */
class SplitInBatchesBuilderImpl implements SplitInBatchesBuilder<unknown> {
	readonly sibNode: NodeInstance<'n8n-nodes-base.splitInBatches', string, unknown>;
	_doneNodes: NodeInstance<string, string, unknown>[] = [];
	_eachNodes: NodeInstance<string, string, unknown>[] = [];
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
 * Create a split in batches builder for processing items in chunks
 *
 * Split in Batches processes items in configurable batch sizes, with
 * two outputs:
 * - Output 0 (.done()): Executes when all batches are processed
 * - Output 1 (.each()): Executes for each batch, can .loop() back
 *
 * @param config - Node configuration including version, id, name, and batchSize parameter
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
 * // This creates:
 * // generateItems -> splitInBatches
 * //                  ├─(0)─> finalizeNode (when done)
 * //                  └─(1)─> processNode ─┐
 * //                              ↑────────┘ (loop)
 * ```
 */
export function splitInBatches(config: SplitInBatchesConfig = {}): SplitInBatchesBuilder<unknown> {
	return new SplitInBatchesBuilderImpl(config);
}

/**
 * Type guard to check if a value is a SplitInBatchesBuilder
 */
export function isSplitInBatchesBuilder(value: unknown): value is SplitInBatchesBuilderImpl {
	return value instanceof SplitInBatchesBuilderImpl;
}
