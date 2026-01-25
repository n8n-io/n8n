import type { NodeInstance, NodeChain } from './types/base';
import { isNodeChain } from './types/base';
import type { MergeInputTarget } from './merge';
import { isMergeInputTarget, isMergeBuilder } from './merge';
import { isSwitchCaseBuilder } from './switch-case';
import { isSplitInBatchesBuilder } from './split-in-batches';

/**
 * Branch target for ifElse - supports arrays for fan-out
 */
export type BranchTarget =
	| null
	| NodeInstance<string, string, unknown>
	| NodeChain<NodeInstance<string, string, unknown>, NodeInstance<string, string, unknown>>
	| MergeInputTarget
	| BranchTarget[];

/**
 * BranchChain - returned by onTrue/onFalse, IS chainable
 */
export interface BranchChain {
	/** Chain to another node */
	then<T extends NodeInstance<string, string, unknown>>(target: T): BranchChain;
	/** Chain to merge input (terminal) */
	then(target: MergeInputTarget): void;
	/** The branch output index (0 for true, 1 for false) */
	readonly branchOutput: number;
	/** Reference to the parent IfElseBuilder */
	readonly ifElseBuilder: IfElseBuilder;
	/** All nodes in this branch chain */
	readonly nodes: NodeInstance<string, string, unknown>[];
	/** Terminal target if chain ends at merge input */
	readonly _terminalTarget: MergeInputTarget | null;
	/** Fan-out targets if branch was created with an array */
	readonly _fanOutTargets: NodeInstance<string, string, unknown>[] | null;
	/** Original NodeChain if branch target was a chain (for proper connection handling) */
	readonly _originalChain: NodeChain<
		NodeInstance<string, string, unknown>,
		NodeInstance<string, string, unknown>
	> | null;
	/** Marker to identify this as a BranchChain */
	readonly _isBranchChain: true;
}

/**
 * IfElseBuilder - builder syntax for ifElse
 */
export interface IfElseBuilder {
	/** Configure the true branch (output 0) - returns chainable BranchChain */
	onTrue(target: BranchTarget): BranchChain;
	/** Configure the false branch (output 1) - returns chainable BranchChain */
	onFalse(target: BranchTarget): BranchChain;
	/** The IF node */
	readonly ifNode: NodeInstance<'n8n-nodes-base.if', string, unknown>;
	/** True branch chain */
	readonly _trueBranch: BranchChain | null;
	/** False branch chain */
	readonly _falseBranch: BranchChain | null;
	/** Marker to identify this as an IfElseBuilder */
	readonly _isIfElseBuilder: true;
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
 * Type guard to check if object is an IfElseBuilder
 */
export function isIfElseBuilder(obj: unknown): obj is IfElseBuilder {
	return (
		obj !== null &&
		typeof obj === 'object' &&
		'_isIfElseBuilder' in obj &&
		obj._isIfElseBuilder === true
	);
}

/**
 * Implementation of BranchChain
 */
class BranchChainImpl implements BranchChain {
	readonly branchOutput: number;
	readonly ifElseBuilder: IfElseBuilderImpl;
	readonly nodes: NodeInstance<string, string, unknown>[];
	_terminalTarget: MergeInputTarget | null = null;
	_fanOutTargets: NodeInstance<string, string, unknown>[] | null = null;
	_originalChain: NodeChain<
		NodeInstance<string, string, unknown>,
		NodeInstance<string, string, unknown>
	> | null = null;
	readonly _isBranchChain = true as const;

	constructor(
		branchOutput: number,
		ifElseBuilder: IfElseBuilderImpl,
		initialNodes: NodeInstance<string, string, unknown>[],
		fanOutTargets: NodeInstance<string, string, unknown>[] | null = null,
		originalChain: NodeChain<
			NodeInstance<string, string, unknown>,
			NodeInstance<string, string, unknown>
		> | null = null,
	) {
		this.branchOutput = branchOutput;
		this.ifElseBuilder = ifElseBuilder;
		this.nodes = initialNodes;
		this._fanOutTargets = fanOutTargets;
		this._originalChain = originalChain;
	}

	then<T extends NodeInstance<string, string, unknown>>(target: T): BranchChain;
	then(target: MergeInputTarget): void;
	then(target: NodeInstance<string, string, unknown> | MergeInputTarget): BranchChain | void {
		if (isMergeInputTarget(target)) {
			// Terminal - set the merge input target and return void
			this._terminalTarget = target;
			return undefined;
		}
		// Chain to another node
		this.nodes.push(target);
		return this as BranchChain;
	}
}

/**
 * Implementation of IfElseBuilder
 */
class IfElseBuilderImpl implements IfElseBuilder {
	readonly ifNode: NodeInstance<'n8n-nodes-base.if', string, unknown>;
	_trueBranch: BranchChainImpl | null = null;
	_falseBranch: BranchChainImpl | null = null;
	readonly _isIfElseBuilder = true as const;

	constructor(ifNode: NodeInstance<'n8n-nodes-base.if', string, unknown>) {
		this.ifNode = ifNode;
	}

	onTrue(target: BranchTarget): BranchChain {
		const nodes = this.extractNodesFromBranchTarget(target);
		// Check if this is a fan-out pattern (array of targets at top level)
		const fanOutTargets = Array.isArray(target) ? this.extractFanOutTargets(target) : null;
		// Capture original chain if target is a NodeChain (for proper connection handling)
		const originalChain = isNodeChain(target) ? target : null;
		this._trueBranch = new BranchChainImpl(0, this, nodes, fanOutTargets, originalChain);
		// If target is a MergeInputTarget, set it as terminal
		if (isMergeInputTarget(target)) {
			this._trueBranch._terminalTarget = target;
		}
		return this._trueBranch;
	}

	onFalse(target: BranchTarget): BranchChain {
		const nodes = this.extractNodesFromBranchTarget(target);
		// Check if this is a fan-out pattern (array of targets at top level)
		const fanOutTargets = Array.isArray(target) ? this.extractFanOutTargets(target) : null;
		// Capture original chain if target is a NodeChain (for proper connection handling)
		const originalChain = isNodeChain(target) ? target : null;
		this._falseBranch = new BranchChainImpl(1, this, nodes, fanOutTargets, originalChain);
		// If target is a MergeInputTarget, set it as terminal
		if (isMergeInputTarget(target)) {
			this._falseBranch._terminalTarget = target;
		}
		return this._falseBranch;
	}

	private extractNodesFromBranchTarget(
		target: BranchTarget,
	): NodeInstance<string, string, unknown>[] {
		if (target === null) return [];
		if (isMergeInputTarget(target)) return [];
		if (Array.isArray(target)) {
			const nodes: NodeInstance<string, string, unknown>[] = [];
			for (const t of target) {
				nodes.push(...this.extractNodesFromBranchTarget(t));
			}
			return nodes;
		}
		if (isNodeChain(target)) {
			// Process each node in the chain individually
			// This handles chains that contain IfElseBuilder or SwitchCaseBuilder
			const nodes: NodeInstance<string, string, unknown>[] = [];
			for (const node of target.allNodes) {
				nodes.push(...this.extractNodesFromBranchTarget(node as BranchTarget));
			}
			return nodes;
		}
		// Handle IfElseBuilder - include as-is so workflow-builder can detect and handle it
		if (this.isIfElseBuilder(target)) {
			return [target as unknown as NodeInstance<string, string, unknown>];
		}
		// Handle SwitchCaseBuilder - include as-is so workflow-builder can detect and handle it
		if (isSwitchCaseBuilder(target)) {
			return [target as unknown as NodeInstance<string, string, unknown>];
		}
		// Handle SplitInBatchesBuilder - include as-is so workflow-builder can detect and handle it
		if (isSplitInBatchesBuilder(target)) {
			return [target as unknown as NodeInstance<string, string, unknown>];
		}
		// Handle MergeBuilder - extract the mergeNode so it can be used in connections
		if (isMergeBuilder(target)) {
			return [target.mergeNode];
		}
		if (isNodeInstance(target)) {
			return [target];
		}
		return [];
	}

	/**
	 * Check if a value is an IfElseBuilder
	 */
	private isIfElseBuilder(value: unknown): boolean {
		return (
			typeof value === 'object' &&
			value !== null &&
			'_isIfElseBuilder' in value &&
			(value as { _isIfElseBuilder: boolean })._isIfElseBuilder === true
		);
	}

	/**
	 * Extract the first-level nodes from an array for fan-out pattern
	 */
	private extractFanOutTargets(targets: BranchTarget[]): NodeInstance<string, string, unknown>[] {
		const fanOutNodes: NodeInstance<string, string, unknown>[] = [];
		for (const t of targets) {
			if (t === null) continue;
			if (isMergeInputTarget(t)) continue;
			if (isNodeChain(t)) {
				fanOutNodes.push(t.head);
			} else if (isMergeBuilder(t)) {
				fanOutNodes.push(t.mergeNode);
			} else if (isNodeInstance(t)) {
				fanOutNodes.push(t);
			}
		}
		return fanOutNodes;
	}
}

/**
 * Create an IF/else branching for conditional execution.
 *
 * @example
 * ```typescript
 * const myIf = ifElse(ifNode);
 * myIf.onTrue(nodeA).then(nodeB);  // if(0) -> nodeA -> nodeB
 * myIf.onFalse(nodeC);              // if(1) -> nodeC
 *
 * // Fan-out (one branch to multiple nodes)
 * myIf.onTrue([nodeA, nodeB]);      // if(0) -> nodeA AND nodeB
 *
 * // Chain ending at merge input
 * myIf.onTrue(nodeA).then(myMerge.input(0));
 * ```
 *
 * @param ifNode - A pre-declared IF node (n8n-nodes-base.if)
 * @returns IfElseBuilder for configuring branches
 */
export function ifElse(ifNode: NodeInstance<'n8n-nodes-base.if', string, unknown>): IfElseBuilder {
	// Validate that first argument is an IF node
	if (!isNodeInstance(ifNode) || ifNode.type !== 'n8n-nodes-base.if') {
		throw new Error('ifElse() requires an IF node as first argument');
	}

	return new IfElseBuilderImpl(ifNode);
}
