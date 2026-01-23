import type {
	IfElseComposite,
	IfElseBuilder,
	IfElseBuilderWithTrue,
	NodeInstance,
	NodeConfig,
	NodeChain,
	IDataObject,
} from './types/base';
import { isNodeChain } from './types/base';
import { isFanOut } from './fan-out';
import type { FanOutTargets } from './fan-out';

/**
 * A branch target - can be a node, node chain, null, or fanOut
 */
export type IfElseTarget =
	| null
	| NodeInstance<string, string, unknown>
	| NodeChain<NodeInstance<string, string, unknown>, NodeInstance<string, string, unknown>>
	| FanOutTargets;

/**
 * Named input syntax for IF else
 * Keys are 'true' and 'false' for the respective branches
 */
export interface IfElseNamedInputs {
	true: IfElseTarget;
	false: IfElseTarget;
}

/**
 * Extended config for IF else that includes version and id
 */
export interface IfElseConfig extends NodeConfig<IDataObject> {
	/** Node version (defaults to 2.3) */
	version?: number | string;
	/** Node ID (auto-generated if omitted) */
	id?: string;
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
 * Check if an object is an IfElseNamedInputs (has 'true' and 'false' keys)
 */
function isIfElseNamedInputs(obj: unknown): obj is IfElseNamedInputs {
	if (obj === null || typeof obj !== 'object') return false;
	// Check it's not a NodeInstance or array
	if (Array.isArray(obj)) return false;
	if (isNodeInstance(obj)) return false;
	// Check it has 'true' or 'false' keys
	return 'true' in obj || 'false' in obj;
}

/**
 * Check if object is an IfElseComposite (has ifNode property)
 */
function isIfElseComposite(obj: unknown): obj is {
	ifNode: NodeInstance<string, string, unknown>;
	_allBranchNodes?: NodeInstance<string, string, unknown>[];
} {
	return obj !== null && typeof obj === 'object' && 'ifNode' in obj;
}

/**
 * Check if object is a SwitchCaseComposite (has switchNode property)
 */
function isSwitchCaseComposite(obj: unknown): obj is {
	switchNode: NodeInstance<string, string, unknown>;
	_allCaseNodes?: NodeInstance<string, string, unknown>[];
} {
	return obj !== null && typeof obj === 'object' && 'switchNode' in obj;
}

/**
 * Check if object is a MergeComposite (has mergeNode property)
 */
function isMergeComposite(
	obj: unknown,
): obj is { mergeNode: NodeInstance<string, string, unknown> } {
	return obj !== null && typeof obj === 'object' && 'mergeNode' in obj;
}

/**
 * Extract all nodes from a target (which could be a node, chain, composite, or fanOut)
 */
function extractNodesFromTarget(target: unknown): NodeInstance<string, string, unknown>[] {
	if (target === null) return [];

	// Handle FanOut with recursive extraction
	if (isFanOut(target)) {
		const nodes: NodeInstance<string, string, unknown>[] = [];
		for (const t of target.targets) {
			nodes.push(...extractNodesFromTarget(t));
		}
		return nodes;
	}

	// Handle composites - extract their main node and any branch/case nodes
	if (isIfElseComposite(target)) {
		const nodes: NodeInstance<string, string, unknown>[] = [target.ifNode];
		if (target._allBranchNodes) {
			nodes.push(...target._allBranchNodes);
		}
		return nodes;
	}

	if (isSwitchCaseComposite(target)) {
		const nodes: NodeInstance<string, string, unknown>[] = [target.switchNode];
		if (target._allCaseNodes) {
			nodes.push(...target._allCaseNodes);
		}
		return nodes;
	}

	if (isMergeComposite(target)) {
		return [target.mergeNode];
	}

	// Handle NodeChain - recursively extract from each item in the chain
	if (isNodeChain(target)) {
		const nodes: NodeInstance<string, string, unknown>[] = [];
		for (const chainNode of target.allNodes) {
			// Recursively extract to handle composites inside chains
			nodes.push(...extractNodesFromTarget(chainNode));
		}
		return nodes;
	}

	// Single NodeInstance
	if (isNodeInstance(target)) {
		return [target];
	}

	return [];
}

/**
 * Extract all nodes from an IfElseTarget
 */
function extractNodesFromBranchTarget(
	target: IfElseTarget,
): NodeInstance<string, string, unknown>[] {
	return extractNodesFromTarget(target);
}

/**
 * IF else composite using named syntax.
 * This allows explicit mapping of true/false branches.
 */
class IfElseCompositeNamedSyntax implements IfElseComposite {
	readonly ifNode: NodeInstance<'n8n-nodes-base.if', string, unknown>;
	readonly trueBranch:
		| NodeInstance<string, string, unknown>
		| NodeInstance<string, string, unknown>[];
	readonly falseBranch:
		| NodeInstance<string, string, unknown>
		| NodeInstance<string, string, unknown>[];
	/** Original targets before conversion (for workflow-builder) */
	readonly _trueBranchTarget: IfElseTarget;
	readonly _falseBranchTarget: IfElseTarget;
	/** All nodes from both branches (for workflow-builder) */
	readonly _allBranchNodes: NodeInstance<string, string, unknown>[];
	/** Marker to identify this as named syntax */
	readonly _isNamedSyntax = true;

	constructor(
		ifNode: NodeInstance<'n8n-nodes-base.if', string, unknown>,
		inputs: IfElseNamedInputs,
	) {
		this.ifNode = ifNode;

		// Store original targets
		this._trueBranchTarget = inputs.true;
		this._falseBranchTarget = inputs.false;

		// Collect all nodes for workflow-builder
		const allNodes: NodeInstance<string, string, unknown>[] = [];
		for (const node of extractNodesFromBranchTarget(inputs.true)) {
			if (!allNodes.some((n) => n.name === node.name)) {
				allNodes.push(node);
			}
		}
		for (const node of extractNodesFromBranchTarget(inputs.false)) {
			if (!allNodes.some((n) => n.name === node.name)) {
				allNodes.push(node);
			}
		}
		this._allBranchNodes = allNodes;

		// Convert to legacy format for compatibility
		// trueBranch and falseBranch are unused for named syntax (use _trueBranchTarget/_falseBranchTarget)
		this.trueBranch = null as unknown as NodeInstance<string, string, unknown>;
		this.falseBranch = null as unknown as NodeInstance<string, string, unknown>;
	}
}

/**
 * Type guard to check if an IfElseComposite uses named syntax
 */
export function isIfElseNamedSyntax(
	composite: IfElseComposite,
): composite is IfElseCompositeNamedSyntax {
	return '_isNamedSyntax' in composite && composite._isNamedSyntax === true;
}

/**
 * Builder implementation for the fluent API.
 * Returned when ifElse() is called without inputs.
 */
class IfElseBuilderImpl implements IfElseBuilder {
	constructor(readonly ifNode: NodeInstance<'n8n-nodes-base.if', string, unknown>) {}

	onTrue(target: IfElseTarget): IfElseBuilderWithTrue {
		return new IfElseBuilderWithTrueImpl(this.ifNode, target);
	}
}

/**
 * Builder implementation after onTrue() has been called.
 * Requires onFalse() to complete the composite.
 */
class IfElseBuilderWithTrueImpl implements IfElseBuilderWithTrue {
	constructor(
		readonly ifNode: NodeInstance<'n8n-nodes-base.if', string, unknown>,
		readonly _trueBranchTarget: IfElseTarget,
	) {}

	onFalse(target: IfElseTarget): IfElseComposite {
		return new IfElseCompositeNamedSyntax(this.ifNode, {
			true: this._trueBranchTarget,
			false: target,
		});
	}
}

/**
 * Create an IF/else branching composite for conditional execution.
 *
 * Supports two syntaxes:
 *
 * 1. **Fluent builder API (recommended):**
 *    ```typescript
 *    ifElse(checkCondition)
 *      .onTrue(formatData.then(aggregate))
 *      .onFalse(logError)
 *    ```
 *
 * 2. **Object syntax (backward compatible):**
 *    ```typescript
 *    ifElse(checkCondition, { true: trueBranch, false: falseBranch })
 *    ```
 *
 * @param ifNode - A pre-declared IF node (n8n-nodes-base.if)
 * @param inputs - Optional named inputs { true: target, false: target }
 * @returns IfElseBuilder (if no inputs) or IfElseComposite (if inputs provided)
 *
 * @example
 * ```typescript
 * // First declare the IF node:
 * const checkCondition = node({
 *   type: 'n8n-nodes-base.if',
 *   version: 2.2,
 *   config: {
 *     name: 'Check Value',
 *     parameters: {
 *       conditions: { conditions: [...] }
 *     }
 *   }
 * });
 *
 * // Fluent builder API (recommended):
 * workflow('id', 'Test')
 *   .add(trigger)
 *   .then(ifElse(checkCondition)
 *     .onTrue(formatData.then(sendReport))
 *     .onFalse(logError)
 *   )
 *   .toJSON();
 *
 * // Object syntax (backward compatible):
 * workflow('id', 'Test')
 *   .add(trigger)
 *   .then(ifElse(checkCondition, {
 *     true: trueBranch,
 *     false: falseBranch
 *   }))
 *   .toJSON();
 *
 * // Single branch (only true branch connected):
 * ifElse(checkCondition)
 *   .onTrue(trueBranch)
 *   .onFalse(null)
 *
 * // Fan-out: true branch connects to multiple parallel nodes:
 * ifElse(checkCondition)
 *   .onTrue(fanOut(node1, node2, node3))
 *   .onFalse(null)
 * ```
 */
// Overload: without inputs returns builder
export function ifElse(ifNode: NodeInstance<'n8n-nodes-base.if', string, unknown>): IfElseBuilder;
// Overload: with inputs returns composite
export function ifElse(
	ifNode: NodeInstance<'n8n-nodes-base.if', string, unknown>,
	inputs: IfElseNamedInputs,
): IfElseComposite;
// Implementation
export function ifElse(
	ifNode: NodeInstance<'n8n-nodes-base.if', string, unknown>,
	inputs?: IfElseNamedInputs,
): IfElseBuilder | IfElseComposite {
	// Validate that first argument is an IF node
	if (!isNodeInstance(ifNode) || ifNode.type !== 'n8n-nodes-base.if') {
		throw new Error(
			'ifElse() requires an IF node as first argument. Use: ifElse(ifNode, { true: ..., false: ... }) or ifElse(ifNode).onTrue(...).onFalse(...)',
		);
	}

	// Without inputs: return builder for fluent API
	if (inputs === undefined) {
		return new IfElseBuilderImpl(ifNode);
	}

	// With inputs: validate and return composite (backward compatible)
	if (!isIfElseNamedInputs(inputs)) {
		throw new Error(
			'ifElse() requires named inputs as second argument. Use: ifElse(ifNode, { true: ..., false: ... }) or ifElse(ifNode).onTrue(...).onFalse(...)',
		);
	}

	return new IfElseCompositeNamedSyntax(ifNode, inputs);
}
