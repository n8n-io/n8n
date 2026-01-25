import type { NodeInstance, NodeChain } from './types/base';
import { isNodeChain } from './types/base';
import type { MergeInputTarget } from './merge';
import { isMergeInputTarget, isMergeBuilder } from './merge';
import { isIfElseBuilder } from './if-else';
import { isSplitInBatchesBuilder } from './split-in-batches';

/**
 * Case target for switchCase - supports arrays for fan-out
 */
export type CaseTarget =
	| null
	| NodeInstance<string, string, unknown>
	| NodeChain<NodeInstance<string, string, unknown>, NodeInstance<string, string, unknown>>
	| MergeInputTarget
	| CaseTarget[];

/**
 * CaseChain - returned by onCase, IS chainable
 */
export interface CaseChain {
	/** Chain to another node */
	then<T extends NodeInstance<string, string, unknown>>(target: T): CaseChain;
	/** Chain to merge input (terminal) */
	then(target: MergeInputTarget): void;
	/** The case output index */
	readonly caseOutput: number;
	/** Reference to the parent SwitchCaseBuilder */
	readonly switchCaseBuilder: SwitchCaseBuilder;
	/** All nodes in this case chain */
	readonly nodes: NodeInstance<string, string, unknown>[];
	/** Terminal target if chain ends at merge input */
	readonly _terminalTarget: MergeInputTarget | null;
	/** Fan-out targets if case was created with an array */
	readonly _fanOutTargets: NodeInstance<string, string, unknown>[] | null;
	/** Original NodeChain if case target was a chain (for proper connection handling) */
	readonly _originalChain: NodeChain<
		NodeInstance<string, string, unknown>,
		NodeInstance<string, string, unknown>
	> | null;
	/** Marker to identify this as a CaseChain */
	readonly _isCaseChain: true;
}

/**
 * SwitchCaseBuilder - builder syntax for switchCase
 */
export interface SwitchCaseBuilder {
	/** Configure a case branch (output N) - returns chainable CaseChain */
	onCase(index: number, target: CaseTarget): CaseChain;
	/** The Switch node */
	readonly switchNode: NodeInstance<'n8n-nodes-base.switch', string, unknown>;
	/** All case chains by output index */
	readonly _cases: Map<number, CaseChain>;
	/** Marker to identify this as a SwitchCaseBuilder */
	readonly _isSwitchCaseBuilder: true;
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
 * Type guard to check if object is a SwitchCaseBuilder
 */
export function isSwitchCaseBuilder(obj: unknown): obj is SwitchCaseBuilder {
	return (
		obj !== null &&
		typeof obj === 'object' &&
		'_isSwitchCaseBuilder' in obj &&
		obj._isSwitchCaseBuilder === true
	);
}

/**
 * Type guard to check if object is a CaseChain
 */
export function isCaseChain(obj: unknown): obj is CaseChain {
	return (
		obj !== null && typeof obj === 'object' && '_isCaseChain' in obj && obj._isCaseChain === true
	);
}

/**
 * Implementation of CaseChain
 */
class CaseChainImpl implements CaseChain {
	readonly caseOutput: number;
	readonly switchCaseBuilder: SwitchCaseBuilderImpl;
	readonly nodes: NodeInstance<string, string, unknown>[];
	_terminalTarget: MergeInputTarget | null = null;
	_fanOutTargets: NodeInstance<string, string, unknown>[] | null = null;
	_originalChain: NodeChain<
		NodeInstance<string, string, unknown>,
		NodeInstance<string, string, unknown>
	> | null = null;
	readonly _isCaseChain = true as const;

	constructor(
		caseOutput: number,
		switchCaseBuilder: SwitchCaseBuilderImpl,
		initialNodes: NodeInstance<string, string, unknown>[],
		fanOutTargets: NodeInstance<string, string, unknown>[] | null = null,
		originalChain: NodeChain<
			NodeInstance<string, string, unknown>,
			NodeInstance<string, string, unknown>
		> | null = null,
	) {
		this.caseOutput = caseOutput;
		this.switchCaseBuilder = switchCaseBuilder;
		this.nodes = initialNodes;
		this._fanOutTargets = fanOutTargets;
		this._originalChain = originalChain;
	}

	then<T extends NodeInstance<string, string, unknown>>(target: T): CaseChain;
	then(target: MergeInputTarget): void;
	then(target: NodeInstance<string, string, unknown> | MergeInputTarget): CaseChain | void {
		if (isMergeInputTarget(target)) {
			// Terminal - set the merge input target and return void
			this._terminalTarget = target;
			return undefined;
		}
		// Chain to another node
		this.nodes.push(target);
		return this as CaseChain;
	}
}

/**
 * Implementation of SwitchCaseBuilder
 */
class SwitchCaseBuilderImpl implements SwitchCaseBuilder {
	readonly switchNode: NodeInstance<'n8n-nodes-base.switch', string, unknown>;
	readonly _cases: Map<number, CaseChainImpl> = new Map();
	readonly _isSwitchCaseBuilder = true as const;

	constructor(switchNode: NodeInstance<'n8n-nodes-base.switch', string, unknown>) {
		this.switchNode = switchNode;
	}

	onCase(index: number, target: CaseTarget): CaseChain {
		const nodes = this.extractNodesFromCaseTarget(target);
		// Check if this is a fan-out pattern (array of targets at top level)
		const fanOutTargets = Array.isArray(target) ? this.extractFanOutTargets(target) : null;
		// Capture original chain if target is a NodeChain (for proper connection handling)
		const originalChain = isNodeChain(target) ? target : null;
		const chain = new CaseChainImpl(index, this, nodes, fanOutTargets, originalChain);
		// If target is a MergeInputTarget, set it as terminal
		if (isMergeInputTarget(target)) {
			chain._terminalTarget = target;
		}
		this._cases.set(index, chain);
		return chain;
	}

	private extractNodesFromCaseTarget(target: CaseTarget): NodeInstance<string, string, unknown>[] {
		if (target === null) return [];
		if (isMergeInputTarget(target)) return [];
		if (Array.isArray(target)) {
			const nodes: NodeInstance<string, string, unknown>[] = [];
			for (const t of target) {
				nodes.push(...this.extractNodesFromCaseTarget(t));
			}
			return nodes;
		}
		if (isNodeChain(target)) {
			// Process each node in the chain individually
			// This handles chains that contain IfElseBuilder or SwitchCaseBuilder
			const nodes: NodeInstance<string, string, unknown>[] = [];
			for (const node of target.allNodes) {
				nodes.push(...this.extractNodesFromCaseTarget(node as CaseTarget));
			}
			return nodes;
		}
		// Handle IfElseBuilder - include as-is so workflow-builder can detect and handle it
		if (isIfElseBuilder(target)) {
			return [target as unknown as NodeInstance<string, string, unknown>];
		}
		// Handle SwitchCaseBuilder - include as-is so workflow-builder can detect and handle it
		if (this.isSwitchCaseBuilder(target)) {
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
	 * Check if a value is a SwitchCaseBuilder
	 */
	private isSwitchCaseBuilder(value: unknown): boolean {
		return (
			typeof value === 'object' &&
			value !== null &&
			'_isSwitchCaseBuilder' in value &&
			(value as { _isSwitchCaseBuilder: boolean })._isSwitchCaseBuilder === true
		);
	}

	/**
	 * Extract the first-level nodes from an array for fan-out pattern
	 */
	private extractFanOutTargets(targets: CaseTarget[]): NodeInstance<string, string, unknown>[] {
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
 * Create a Switch case builder for multi-way branching.
 *
 * @example
 * ```typescript
 * const mySwitch = switchCase(switchNode);
 * mySwitch.onCase(0, nodeA).then(nodeB);  // case0 -> nodeA -> nodeB
 * mySwitch.onCase(1, nodeC);               // case1 -> nodeC
 *
 * // Fan-out (one case to multiple nodes)
 * mySwitch.onCase(0, [nodeA, nodeB]);      // case0 -> nodeA AND nodeB
 *
 * // Chain ending at merge input
 * mySwitch.onCase(0, nodeA).then(myMerge.input(0));
 * ```
 *
 * @param switchNode - A pre-declared Switch node (n8n-nodes-base.switch)
 * @returns SwitchCaseBuilder for configuring cases
 */
export function switchCase(
	switchNode: NodeInstance<'n8n-nodes-base.switch', string, unknown>,
): SwitchCaseBuilder {
	// Validate that first argument is a Switch node
	if (!isNodeInstance(switchNode) || switchNode.type !== 'n8n-nodes-base.switch') {
		throw new Error('switchCase() requires a Switch node as first argument');
	}

	return new SwitchCaseBuilderImpl(switchNode);
}
