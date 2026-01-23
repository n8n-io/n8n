import { v4 as uuid } from 'uuid';
import type {
	IfBranchComposite,
	NodeInstance,
	NodeConfig,
	DeclaredConnection,
	NodeChain,
	IDataObject,
} from './types/base';
import { isNodeChain } from './types/base';
import { isFanOut } from './fan-out';
import type { FanOutTargets } from './fan-out';

/**
 * A branch target - can be a node, node chain, null, or fanOut
 */
export type IfBranchTarget =
	| null
	| NodeInstance<string, string, unknown>
	| NodeChain<NodeInstance<string, string, unknown>, NodeInstance<string, string, unknown>>
	| FanOutTargets;

/**
 * Named input syntax for IF branch
 * Keys are 'true' and 'false' for the respective branches
 */
export interface IfBranchNamedInputs {
	true: IfBranchTarget;
	false: IfBranchTarget;
}

/**
 * Extended config for IF branch that includes version and id
 */
export interface IfBranchConfig extends NodeConfig<IDataObject> {
	/** Node version (defaults to 2.3) */
	version?: number | string;
	/** Node ID (auto-generated if omitted) */
	id?: string;
}

/**
 * Internal IF node implementation
 */
class IfNodeInstance implements NodeInstance<'n8n-nodes-base.if', string, unknown> {
	readonly type = 'n8n-nodes-base.if' as const;
	readonly version: string;
	readonly config: NodeConfig;
	readonly id: string;
	readonly name: string;
	private _connections: DeclaredConnection[] = [];

	constructor(config?: IfBranchConfig) {
		this.version = config?.version != null ? String(config.version) : '2.3';
		this.id = config?.id ?? uuid();
		this.name = config?.name ?? 'IF';
		this.config = {
			...config,
			parameters: config?.parameters as NodeConfig['parameters'],
		};
	}

	update(config: Partial<NodeConfig>): NodeInstance<'n8n-nodes-base.if', string, unknown> {
		return new IfNodeInstance({ ...this.config, ...config } as IfBranchConfig);
	}

	then<T extends NodeInstance<string, string, unknown>>(
		target: T | T[],
		outputIndex: number = 0,
	): NodeChain<NodeInstance<'n8n-nodes-base.if', string, unknown>, T> {
		const targets = Array.isArray(target) ? target : [target];
		for (const t of targets) {
			this._connections.push({ target: t, outputIndex });
		}
		// Return a chain-like object that proxies to the last target
		const lastTarget = targets[targets.length - 1];
		const self = this;
		return {
			_isChain: true,
			head: this,
			tail: lastTarget,
			allNodes: [this, ...targets],
			type: lastTarget.type,
			version: lastTarget.version,
			config: lastTarget.config,
			id: lastTarget.id,
			name: lastTarget.name,
			_outputType: lastTarget._outputType,
			update: lastTarget.update.bind(lastTarget),
			then: lastTarget.then.bind(lastTarget),
			onError: function <H extends NodeInstance<string, string, unknown>>(handler: H) {
				lastTarget.onError(handler);
				return this;
			},
			getConnections: () => [...self._connections, ...lastTarget.getConnections()],
		} as unknown as NodeChain<NodeInstance<'n8n-nodes-base.if', string, unknown>, T>;
	}

	onError<T extends NodeInstance<string, string, unknown>>(_handler: T): this {
		throw new Error('IF node error handling is managed by IfBranchComposite');
	}

	getConnections(): DeclaredConnection[] {
		return [...this._connections];
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
 * Branch type - can be a single node, array of nodes (fan-out), or null
 */
type BranchType =
	| NodeInstance<string, string, unknown>
	| NodeInstance<string, string, unknown>[]
	| null;

/**
 * Internal IF branch composite implementation
 */
class IfBranchCompositeImpl implements IfBranchComposite {
	readonly ifNode: NodeInstance<'n8n-nodes-base.if', string, unknown>;
	readonly trueBranch:
		| NodeInstance<string, string, unknown>
		| NodeInstance<string, string, unknown>[];
	readonly falseBranch:
		| NodeInstance<string, string, unknown>
		| NodeInstance<string, string, unknown>[];

	constructor(branches: [BranchType, BranchType], config?: IfBranchConfig) {
		this.ifNode = new IfNodeInstance(config);
		// Use NoOp placeholders for null branches (they won't be connected)
		// Arrays are supported for fan-out within a branch
		this.trueBranch = branches[0] as
			| NodeInstance<string, string, unknown>
			| NodeInstance<string, string, unknown>[]; // Output 0 = true
		this.falseBranch = branches[1] as
			| NodeInstance<string, string, unknown>
			| NodeInstance<string, string, unknown>[]; // Output 1 = false
	}
}

/**
 * IF branch composite implementation that wraps an existing node instance
 */
class IfBranchCompositeWithExistingNode implements IfBranchComposite {
	readonly ifNode: NodeInstance<'n8n-nodes-base.if', string, unknown>;
	readonly trueBranch:
		| NodeInstance<string, string, unknown>
		| NodeInstance<string, string, unknown>[];
	readonly falseBranch:
		| NodeInstance<string, string, unknown>
		| NodeInstance<string, string, unknown>[];

	constructor(
		branches: [BranchType, BranchType],
		existingNode: NodeInstance<'n8n-nodes-base.if', string, unknown>,
	) {
		this.ifNode = existingNode;
		this.trueBranch = branches[0] as
			| NodeInstance<string, string, unknown>
			| NodeInstance<string, string, unknown>[];
		this.falseBranch = branches[1] as
			| NodeInstance<string, string, unknown>
			| NodeInstance<string, string, unknown>[];
	}
}

/**
 * Check if an object is an IfBranchNamedInputs (has 'true' and 'false' keys)
 */
function isIfBranchNamedInputs(obj: unknown): obj is IfBranchNamedInputs {
	if (obj === null || typeof obj !== 'object') return false;
	// Check it's not a NodeInstance or array
	if (Array.isArray(obj)) return false;
	if (isNodeInstance(obj)) return false;
	// Check it has 'true' or 'false' keys
	return 'true' in obj || 'false' in obj;
}

/**
 * Extract all nodes from an IfBranchTarget
 */
function extractNodesFromBranchTarget(
	target: IfBranchTarget,
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
 * IF branch composite using named syntax.
 * This allows explicit mapping of true/false branches.
 */
class IfBranchCompositeNamedSyntax implements IfBranchComposite {
	readonly ifNode: NodeInstance<'n8n-nodes-base.if', string, unknown>;
	readonly trueBranch:
		| NodeInstance<string, string, unknown>
		| NodeInstance<string, string, unknown>[];
	readonly falseBranch:
		| NodeInstance<string, string, unknown>
		| NodeInstance<string, string, unknown>[];
	/** Original targets before conversion (for workflow-builder) */
	readonly _trueBranchTarget: IfBranchTarget;
	readonly _falseBranchTarget: IfBranchTarget;
	/** All nodes from both branches (for workflow-builder) */
	readonly _allBranchNodes: NodeInstance<string, string, unknown>[];
	/** Marker to identify this as named syntax */
	readonly _isNamedSyntax = true;

	constructor(
		ifNode: NodeInstance<'n8n-nodes-base.if', string, unknown>,
		inputs: IfBranchNamedInputs,
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
 * Type guard to check if an IfBranchComposite uses named syntax
 */
export function isIfBranchNamedSyntax(
	composite: IfBranchComposite,
): composite is IfBranchCompositeNamedSyntax {
	return '_isNamedSyntax' in composite && composite._isNamedSyntax === true;
}

/**
 * Create an IF branching composite for conditional execution
 *
 * @param branchesOrNode - Tuple of [trueBranch, falseBranch] nodes, OR a pre-declared IF node for named syntax
 * @param configOrNodeOrInputs - Full IF node config, a pre-declared IF node, OR named inputs { true, false }
 *
 * @example
 * ```typescript
 * // Array syntax (original API):
 * workflow('id', 'Test')
 *   .add(trigger)
 *   .then(ifBranch([truePath, falsePath], {
 *     name: 'Check Value',
 *     version: 2.2,
 *     parameters: {
 *       conditions: { conditions: [...] },
 *       looseTypeValidation: false,
 *     },
 *   }))
 *   .toJSON();
 *
 * // Single branch (only true branch connected)
 * workflow('id', 'Test')
 *   .add(trigger)
 *   .then(ifBranch([truePath, null], { name: 'Check Value' }));
 *
 * // Fan-out: true branch connects to multiple parallel nodes
 * workflow('id', 'Test')
 *   .add(trigger)
 *   .then(ifBranch([[node1, node2, node3], null], { name: 'Check Value' }));
 *
 * // Using a pre-declared IF node:
 * const ifNode = node({ type: 'n8n-nodes-base.if', ... });
 * workflow('id', 'Test')
 *   .add(trigger)
 *   .then(ifBranch([truePath, falsePath], ifNode));
 *
 * // Named input syntax (for explicit branch mapping):
 * ifBranch(ifNode, {
 *   true: nodeA,
 *   false: fanOut(nodeB, nodeC)  // fanOut to multiple targets
 * })
 * ```
 */
export function ifBranch(
	branchesOrNode: [BranchType, BranchType] | NodeInstance<'n8n-nodes-base.if', string, unknown>,
	configOrNodeOrInputs?:
		| IfBranchConfig
		| NodeInstance<'n8n-nodes-base.if', string, unknown>
		| IfBranchNamedInputs,
): IfBranchComposite {
	// Named input syntax: ifBranch(ifNode, { true, false })
	if (
		isNodeInstance(branchesOrNode) &&
		branchesOrNode.type === 'n8n-nodes-base.if' &&
		configOrNodeOrInputs !== undefined &&
		isIfBranchNamedInputs(configOrNodeOrInputs)
	) {
		return new IfBranchCompositeNamedSyntax(
			branchesOrNode as NodeInstance<'n8n-nodes-base.if', string, unknown>,
			configOrNodeOrInputs,
		);
	}

	// Original API: ifBranch([true, false], configOrNode)
	const branches = branchesOrNode as [BranchType, BranchType];
	const configOrNode = configOrNodeOrInputs as
		| IfBranchConfig
		| NodeInstance<'n8n-nodes-base.if', string, unknown>
		| undefined;

	// Check if the second argument is a NodeInstance (pre-declared IF node)
	if (isNodeInstance(configOrNode) && configOrNode.type === 'n8n-nodes-base.if') {
		return new IfBranchCompositeWithExistingNode(
			branches,
			configOrNode as NodeInstance<'n8n-nodes-base.if', string, unknown>,
		);
	}
	// Otherwise, treat it as an IfBranchConfig
	return new IfBranchCompositeImpl(branches, configOrNode as IfBranchConfig);
}
