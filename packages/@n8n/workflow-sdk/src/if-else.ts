import type {
	IfElseComposite,
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
 * Extract all nodes from an IfElseTarget
 */
function extractNodesFromBranchTarget(
	target: IfElseTarget,
): NodeInstance<string, string, unknown>[] {
	if (target === null) return [];
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
 * Create an IF/else branching composite for conditional execution.
 *
 * Requires named syntax: ifElse(ifNode, { true: trueBranch, false: falseBranch })
 *
 * @param ifNode - A pre-declared IF node (n8n-nodes-base.if)
 * @param inputs - Named inputs { true: target, false: target }
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
 * // Then use it with named inputs:
 * workflow('id', 'Test')
 *   .add(trigger)
 *   .then(ifElse(checkCondition, {
 *     true: trueBranch,
 *     false: falseBranch
 *   }))
 *   .toJSON();
 *
 * // Single branch (only true branch connected):
 * ifElse(ifNode, {
 *   true: trueBranch,
 *   false: null
 * })
 *
 * // Fan-out: true branch connects to multiple parallel nodes:
 * ifElse(ifNode, {
 *   true: fanOut(node1, node2, node3),
 *   false: null
 * })
 * ```
 */
export function ifElse(
	ifNode: NodeInstance<'n8n-nodes-base.if', string, unknown>,
	inputs: IfElseNamedInputs,
): IfElseComposite {
	// Validate that first argument is an IF node
	if (!isNodeInstance(ifNode) || ifNode.type !== 'n8n-nodes-base.if') {
		throw new Error(
			'ifElse() requires an IF node as first argument. Use: ifElse(ifNode, { true: ..., false: ... })',
		);
	}

	// Validate that second argument is named inputs
	if (!isIfElseNamedInputs(inputs)) {
		throw new Error(
			'ifElse() requires named inputs as second argument. Use: ifElse(ifNode, { true: ..., false: ... })',
		);
	}

	return new IfElseCompositeNamedSyntax(ifNode, inputs);
}
