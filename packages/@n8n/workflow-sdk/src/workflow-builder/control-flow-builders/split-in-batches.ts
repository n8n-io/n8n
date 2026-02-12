import { v4 as uuid } from 'uuid';

import { isSplitInBatchesType } from '../../constants/node-types';
import type {
	NodeInstance,
	NodeConfig,
	SplitInBatchesBuilder,
	SplitInBatchesFactoryConfig,
	DeclaredConnection,
	NodeChain,
	InputTarget,
	OutputSelector,
	IfElseBuilder,
	SwitchCaseBuilder,
} from '../../types/base';
import { isNodeChain, isNodeInstance } from '../../types/base';
import { isIfElseBuilder, isSwitchCaseBuilder } from '../node-builders/node-builder';

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

	constructor(input: SplitInBatchesFactoryConfig) {
		const config = input.config ?? {};
		this.version = String(input.version);
		this.id = uuid();
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
			version: this.version,
			config: {
				...this.config,
				...config,
			},
		});
	}

	input(_index: number): InputTarget {
		throw new Error('SplitInBatches node input connections are managed by SplitInBatchesBuilder');
	}

	output(_index: number): OutputSelector<'n8n-nodes-base.splitInBatches', string, unknown> {
		throw new Error('SplitInBatches node output connections are managed by SplitInBatchesBuilder');
	}

	to<T extends NodeInstance<string, string, unknown>>(
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
	| Array<NodeInstance<string, string, unknown>>;

/**
 * Target for a branch in named object syntax.
 * Can be:
 * - null: no connection for this branch
 * - NodeInstance: single target
 * - NodeChain: a chain of nodes
 * - Plain array: multiple parallel targets (fan-out)
 */
export type BranchTarget =
	| null
	| NodeInstance<string, string, unknown>
	| NodeChain<NodeInstance<string, string, unknown>, NodeInstance<string, string, unknown>>
	| Array<
			| NodeInstance<string, string, unknown>
			| NodeChain<NodeInstance<string, string, unknown>, NodeInstance<string, string, unknown>>
	  >;

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
 * Internal split in batches builder implementation
 */
class SplitInBatchesBuilderImpl implements SplitInBatchesBuilder<unknown> {
	readonly sibNode: NodeInstance<'n8n-nodes-base.splitInBatches', string, unknown>;
	_doneNodes: Array<NodeInstance<string, string, unknown>> = [];
	_eachNodes: Array<NodeInstance<string, string, unknown>> = [];
	_doneBatches: NodeBatch[] = [];
	_eachBatches: NodeBatch[] = [];
	_hasLoop = false;
	// Fluent API targets (used by .onEachBatch()/.onDone())
	// These are only defined when the fluent API methods are used
	_doneTarget?: BranchTarget;
	_eachTarget?: BranchTarget;

	constructor(input: SplitInBatchesFactoryConfig) {
		this.sibNode = new SplitInBatchesNodeInstance(input);
	}

	/**
	 * Fluent API: Set the "each batch" branch target (output 1).
	 * This executes for each batch and can loop back to the SIB node.
	 */
	onEachBatch(target: BranchTarget): this {
		this._eachTarget = target;

		// Extract nodes from the target for workflow-builder compatibility
		if (target !== null) {
			const nodes = extractNodesFromTarget(target);
			this._eachNodes = nodes;

			const firstNodes = getFirstNodes(target);
			if (firstNodes.length > 1) {
				this._eachBatches.push(firstNodes);
			} else if (firstNodes.length === 1) {
				this._eachBatches.push(firstNodes[0]);
			}
		}

		return this;
	}

	/**
	 * Fluent API: Set the "done" branch target (output 0).
	 * This executes when all batches are processed.
	 */
	onDone(target: BranchTarget): this {
		this._doneTarget = target;

		// Extract nodes from the target for workflow-builder compatibility
		if (target !== null) {
			const nodes = extractNodesFromTarget(target);
			this._doneNodes = nodes;

			const firstNodes = getFirstNodes(target);
			if (firstNodes.length > 1) {
				this._doneBatches.push(firstNodes);
			} else if (firstNodes.length === 1) {
				this._doneBatches.push(firstNodes[0]);
			}
		}

		return this;
	}

	/**
	 * Get all nodes including the split in batches node
	 */
	getAllNodes(): Array<NodeInstance<string, string, unknown>> {
		return [this.sibNode, ...this._doneNodes, ...this._eachNodes];
	}

	/**
	 * Get the done chain nodes (output 0)
	 */
	getDoneNodes(): Array<NodeInstance<string, string, unknown>> {
		return this._doneNodes;
	}

	/**
	 * Get the each chain nodes (output 1)
	 */
	getEachNodes(): Array<NodeInstance<string, string, unknown>> {
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
	_doneNodes: Array<NodeInstance<string, string, unknown>> = [];
	_eachNodes: Array<NodeInstance<string, string, unknown>> = [];
	_doneBatches: NodeBatch[] = [];
	_eachBatches: NodeBatch[] = [];
	_hasLoop = false;
	// Fluent API targets (used by .onEachBatch()/.onDone())
	// These are only defined when the fluent API methods are used
	_doneTarget?: BranchTarget;
	_eachTarget?: BranchTarget;

	constructor(existingNode: NodeInstance<'n8n-nodes-base.splitInBatches', string, unknown>) {
		this.sibNode = existingNode;
	}

	/**
	 * Fluent API: Set the "each batch" branch target (output 1).
	 * This executes for each batch and can loop back to the SIB node.
	 */
	onEachBatch(target: BranchTarget): this {
		this._eachTarget = target;

		// Extract nodes from the target for workflow-builder compatibility
		if (target !== null) {
			const nodes = extractNodesFromTarget(target);
			this._eachNodes = nodes;

			const firstNodes = getFirstNodes(target);
			if (firstNodes.length > 1) {
				this._eachBatches.push(firstNodes);
			} else if (firstNodes.length === 1) {
				this._eachBatches.push(firstNodes[0]);
			}
		}

		return this;
	}

	/**
	 * Fluent API: Set the "done" branch target (output 0).
	 * This executes when all batches are processed.
	 */
	onDone(target: BranchTarget): this {
		this._doneTarget = target;

		// Extract nodes from the target for workflow-builder compatibility
		if (target !== null) {
			const nodes = extractNodesFromTarget(target);
			this._doneNodes = nodes;

			const firstNodes = getFirstNodes(target);
			if (firstNodes.length > 1) {
				this._doneBatches.push(firstNodes);
			} else if (firstNodes.length === 1) {
				this._doneBatches.push(firstNodes[0]);
			}
		}

		return this;
	}

	getAllNodes(): Array<NodeInstance<string, string, unknown>> {
		return [this.sibNode, ...this._doneNodes, ...this._eachNodes];
	}

	getDoneNodes(): Array<NodeInstance<string, string, unknown>> {
		return this._doneNodes;
	}

	getEachNodes(): Array<NodeInstance<string, string, unknown>> {
		return this._eachNodes;
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
 * - Output 0 (onDone): Executes when all batches are processed
 * - Output 1 (onEachBatch): Executes for each batch, loop back by chaining to sibNode
 *
 * @param configOrNode - Node configuration { version, config } or a pre-declared SplitInBatches node instance
 * @param branches - Optional named object syntax for branches: { done: ..., each: ... }
 * @returns A split in batches builder for configuring the loop
 *
 * @example
 * ```typescript
 * // Fluent API (recommended):
 * const sibNode = node({
 *   type: 'n8n-nodes-base.splitInBatches',
 *   version: 3,
 *   config: { name: 'Loop', parameters: { batchSize: 10 } }
 * });
 * workflow('id', 'Test')
 *   .add(trigger(...))
 *   .to(generateItems)
 *   .to(
 *     splitInBatches(sibNode)
 *       .onDone(finalizeNode)
 *       .onEachBatch(processNode.to(sibNode))
 *   );
 *
 * // Or use splitInBatches() directly with { version, config } pattern:
 * const sib = splitInBatches({
 *   version: 3,
 *   config: { name: 'Loop', parameters: { batchSize: 10 } }
 * });
 * workflow('id', 'Test')
 *   .add(trigger(...))
 *   .to(sib.onDone(finalizeNode).onEachBatch(processNode.to(sib.sibNode)));
 *
 * // Named object syntax:
 * splitInBatches(sibNode, {
 *   done: finalizeNode,
 *   each: processNode.to(sibNode)  // loop back
 * })
 *
 * // With null for empty branches:
 * splitInBatches(sibNode, {
 *   done: null,                       // no done connection
 *   each: sibNode                     // self-loop
 * })
 * ```
 */
export function splitInBatches(
	configOrNode:
		| SplitInBatchesFactoryConfig
		| NodeInstance<'n8n-nodes-base.splitInBatches', string, unknown>,
	branches?: SplitInBatchesBranches,
): SplitInBatchesBuilder<unknown> {
	// Named object syntax: splitInBatches(node, { done, each })
	if (
		branches !== undefined &&
		isBranchesConfig(branches) &&
		isNodeInstance(configOrNode) &&
		isSplitInBatchesType(configOrNode.type)
	) {
		return new SplitInBatchesNamedSyntaxBuilder(
			configOrNode as NodeInstance<'n8n-nodes-base.splitInBatches', string, unknown>,
			branches,
		);
	}

	// Check if the argument is a NodeInstance (pre-declared SplitInBatches node)
	if (isNodeInstance(configOrNode) && isSplitInBatchesType(configOrNode.type)) {
		return new SplitInBatchesBuilderWithExistingNode(
			configOrNode as NodeInstance<'n8n-nodes-base.splitInBatches', string, unknown>,
		);
	}
	// Otherwise, treat it as a SplitInBatchesFactoryConfig (new { version, config } pattern)
	return new SplitInBatchesBuilderImpl(configOrNode as SplitInBatchesFactoryConfig);
}

/**
 * Type guard to check if a value is a SplitInBatchesBuilder
 */
export function isSplitInBatchesBuilder(value: unknown): value is SplitInBatchesBuilderImpl {
	return value instanceof SplitInBatchesBuilderImpl;
}

/**
 * Extract nodes from a BranchTarget
 */
function extractNodesFromTarget(
	target: BranchTarget,
): Array<NodeInstance<string, string, unknown>> {
	if (target === null) {
		return [];
	}
	if (Array.isArray(target)) {
		return target.flatMap((t) => extractNodesFromTarget(t as BranchTarget));
	}
	if (isNodeChain(target)) {
		return target.allNodes;
	}
	// Handle IfElseBuilder (fluent API)
	if (isIfElseBuilder(target)) {
		const builder = target as IfElseBuilder<unknown>;
		const nodes: Array<NodeInstance<string, string, unknown>> = [builder.ifNode];
		nodes.push(...extractNodesFromTarget(builder.trueBranch as BranchTarget));
		nodes.push(...extractNodesFromTarget(builder.falseBranch as BranchTarget));
		return nodes;
	}
	// Handle SwitchCaseBuilder (fluent API)
	if (isSwitchCaseBuilder(target)) {
		const builder = target as SwitchCaseBuilder<unknown>;
		const nodes: Array<NodeInstance<string, string, unknown>> = [builder.switchNode];
		for (const caseTarget of builder.caseMapping.values()) {
			nodes.push(...extractNodesFromTarget(caseTarget as BranchTarget));
		}
		return nodes;
	}
	// It's a single NodeInstance
	return [target];
}

/**
 * Extract the first node(s) from a BranchTarget for connection purposes
 */
function getFirstNodes(target: BranchTarget): Array<NodeInstance<string, string, unknown>> {
	if (target === null) {
		return [];
	}
	if (Array.isArray(target)) {
		return target.flatMap((t) => getFirstNodes(t as BranchTarget));
	}
	if (isNodeChain(target)) {
		return [target.head];
	}
	// Handle IfElseBuilder (fluent API) - the first node is the IF/Switch node
	if (isIfElseBuilder(target)) {
		return [target.ifNode];
	}
	// Handle SwitchCaseBuilder (fluent API)
	if (isSwitchCaseBuilder(target)) {
		return [target.switchNode];
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
	_doneNodes: Array<NodeInstance<string, string, unknown>> = [];
	_eachNodes: Array<NodeInstance<string, string, unknown>> = [];
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
			// expressed in the connection target (e.g., each: sibNode or each: processNode.to(sibNode))
			// The workflow-builder's _hasLoop handling is only for the fluent API's .loop() method
		}
	}

	/**
	 * Fluent API: Not supported for named syntax builder (use constructor branches instead)
	 */
	onEachBatch(_target: BranchTarget): this {
		throw new Error(
			'Named object syntax does not support .onEachBatch() - branches are configured in the constructor',
		);
	}

	/**
	 * Fluent API: Not supported for named syntax builder (use constructor branches instead)
	 */
	onDone(_target: BranchTarget): this {
		throw new Error(
			'Named object syntax does not support .onDone() - branches are configured in the constructor',
		);
	}

	getAllNodes(): Array<NodeInstance<string, string, unknown>> {
		return [this.sibNode, ...this._doneNodes, ...this._eachNodes];
	}

	getDoneNodes(): Array<NodeInstance<string, string, unknown>> {
		return this._doneNodes;
	}

	getEachNodes(): Array<NodeInstance<string, string, unknown>> {
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
