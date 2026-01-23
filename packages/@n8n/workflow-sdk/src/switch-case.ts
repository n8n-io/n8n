import { v4 as uuid } from 'uuid';
import type {
	SwitchCaseComposite,
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
 * A case target - can be a node, node chain, null, or fanOut
 */
export type SwitchCaseTarget =
	| null
	| NodeInstance<string, string, unknown>
	| NodeChain<NodeInstance<string, string, unknown>, NodeInstance<string, string, unknown>>
	| FanOutTargets;

/**
 * Named input syntax for switch case
 * Keys are caseN format where N is the output index
 */
export interface SwitchCaseNamedInputs {
	[key: `case${number}`]: SwitchCaseTarget;
}

/**
 * Extended config for Switch case that includes version and id
 */
export interface SwitchCaseConfig extends NodeConfig<IDataObject> {
	/** Node version (defaults to 3.4) */
	version?: number | string;
	/** Node ID (auto-generated if omitted) */
	id?: string;
}

/**
 * Internal Switch node implementation
 */
class SwitchNodeInstance implements NodeInstance<'n8n-nodes-base.switch', string, unknown> {
	readonly type = 'n8n-nodes-base.switch' as const;
	readonly version: string;
	readonly config: NodeConfig;
	readonly id: string;
	readonly name: string;
	private _connections: DeclaredConnection[] = [];

	constructor(config?: SwitchCaseConfig) {
		this.version = config?.version != null ? String(config.version) : '3.4';
		this.id = config?.id ?? uuid();
		this.name = config?.name ?? 'Switch';
		this.config = {
			...config,
			parameters: config?.parameters,
		};
	}

	update(config: Partial<NodeConfig>): NodeInstance<'n8n-nodes-base.switch', string, unknown> {
		return new SwitchNodeInstance({ ...this.config, ...config } as SwitchCaseConfig);
	}

	then<T extends NodeInstance<string, string, unknown>>(
		target: T | T[],
		outputIndex: number = 0,
	): NodeChain<NodeInstance<'n8n-nodes-base.switch', string, unknown>, T> {
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
		} as unknown as NodeChain<NodeInstance<'n8n-nodes-base.switch', string, unknown>, T>;
	}

	onError<T extends NodeInstance<string, string, unknown>>(_handler: T): this {
		throw new Error('Switch node error handling is managed by SwitchCaseComposite');
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
 * Internal Switch case composite implementation
 */
class SwitchCaseCompositeImpl implements SwitchCaseComposite {
	readonly switchNode: NodeInstance<'n8n-nodes-base.switch', string, unknown>;
	readonly cases: NodeInstance<string, string, unknown>[];

	constructor(cases: NodeInstance<string, string, unknown>[], config?: SwitchCaseConfig) {
		this.cases = cases;
		this.switchNode = new SwitchNodeInstance(config);
	}
}

/**
 * Switch case composite implementation that wraps an existing node instance
 */
class SwitchCaseCompositeWithExistingNode implements SwitchCaseComposite {
	readonly switchNode: NodeInstance<'n8n-nodes-base.switch', string, unknown>;
	readonly cases: NodeInstance<string, string, unknown>[];

	constructor(
		cases: NodeInstance<string, string, unknown>[],
		existingNode: NodeInstance<'n8n-nodes-base.switch', string, unknown>,
	) {
		this.cases = cases;
		this.switchNode = existingNode;
	}
}

/**
 * Check if an object is a SwitchCaseNamedInputs (has caseN keys)
 */
function isSwitchCaseNamedInputs(obj: unknown): obj is SwitchCaseNamedInputs {
	if (obj === null || typeof obj !== 'object') return false;
	// Check it's not a NodeInstance or array
	if (Array.isArray(obj)) return false;
	if (isNodeInstance(obj)) return false;
	// Check keys are caseN format
	const keys = Object.keys(obj);
	if (keys.length === 0) return false;
	// All keys must be caseN format
	return keys.every((key) => /^case\d+$/.test(key));
}

/**
 * Extract all nodes from a SwitchCaseTarget
 */
function extractNodesFromCaseTarget(
	target: SwitchCaseTarget,
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
 * Switch case composite using named syntax.
 * This allows explicit mapping of cases to output indices.
 */
class SwitchCaseCompositeNamedSyntax implements SwitchCaseComposite {
	readonly switchNode: NodeInstance<'n8n-nodes-base.switch', string, unknown>;
	readonly cases: NodeInstance<string, string, unknown>[];
	/** Map from output index to case targets */
	readonly caseMapping: Map<number, SwitchCaseTarget>;
	/** All nodes from all cases (for workflow-builder) */
	readonly _allCaseNodes: NodeInstance<string, string, unknown>[];
	/** Marker to identify this as named syntax */
	readonly _isNamedSyntax = true;

	constructor(
		switchNode: NodeInstance<'n8n-nodes-base.switch', string, unknown>,
		inputs: SwitchCaseNamedInputs,
	) {
		this.switchNode = switchNode;

		// Parse case indices and build mapping
		this.caseMapping = new Map();
		const allNodes: NodeInstance<string, string, unknown>[] = [];

		for (const [key, target] of Object.entries(inputs)) {
			const caseIndex = parseInt(key.replace('case', ''), 10);
			this.caseMapping.set(caseIndex, target);

			// Collect all nodes for _allCaseNodes
			const caseNodes = extractNodesFromCaseTarget(target);
			for (const node of caseNodes) {
				if (!allNodes.some((n) => n.name === node.name)) {
					allNodes.push(node);
				}
			}
		}

		this._allCaseNodes = allNodes;
		// cases is used by workflow-builder - provide empty array, use caseMapping instead
		this.cases = [];
	}
}

/**
 * Type guard to check if a SwitchCaseComposite uses named syntax
 */
export function isSwitchCaseNamedSyntax(
	composite: SwitchCaseComposite,
): composite is SwitchCaseCompositeNamedSyntax {
	return '_isNamedSyntax' in composite && composite._isNamedSyntax === true;
}

/**
 * Create a Switch case composite for multi-way branching
 *
 * @param casesOrNode - Array of nodes for each case output (index = output number), OR a pre-declared Switch node for named syntax
 * @param configOrNodeOrInputs - Full Switch node config, a pre-declared Switch node instance, OR named inputs { case0, case1, ... }
 *
 * @example
 * ```typescript
 * // Array syntax (original API):
 * workflow('id', 'Test')
 *   .add(trigger)
 *   .then(switchCase([case0, case1, case2, fallback], {
 *     name: 'Route by Type',
 *     version: 3.2,
 *     parameters: {
 *       mode: 'rules',
 *       rules: { ... },
 *     },
 *   }))
 *   .toJSON();
 *
 * // Using a pre-declared Switch node:
 * const switchNode = node({ type: 'n8n-nodes-base.switch', ... });
 * workflow('id', 'Test')
 *   .add(trigger)
 *   .then(switchCase([case0, case1], switchNode));
 *
 * // Named input syntax (for explicit output index mapping):
 * switchCase(switchNode, {
 *   case0: nodeA,
 *   case1: nodeB,
 *   case2: fanOut(nodeC, nodeD)  // fanOut to multiple targets
 * })
 * ```
 */
export function switchCase(
	casesOrNode:
		| NodeInstance<string, string, unknown>[]
		| NodeInstance<'n8n-nodes-base.switch', string, unknown>,
	configOrNodeOrInputs?:
		| SwitchCaseConfig
		| NodeInstance<'n8n-nodes-base.switch', string, unknown>
		| SwitchCaseNamedInputs,
): SwitchCaseComposite {
	// Named input syntax: switchCase(switchNode, { case0, case1, ... })
	if (
		isNodeInstance(casesOrNode) &&
		casesOrNode.type === 'n8n-nodes-base.switch' &&
		configOrNodeOrInputs !== undefined &&
		isSwitchCaseNamedInputs(configOrNodeOrInputs)
	) {
		return new SwitchCaseCompositeNamedSyntax(
			casesOrNode as NodeInstance<'n8n-nodes-base.switch', string, unknown>,
			configOrNodeOrInputs,
		);
	}

	// Original API: switchCase(cases, configOrNode)
	const cases = casesOrNode as NodeInstance<string, string, unknown>[];
	const configOrNode = configOrNodeOrInputs as
		| SwitchCaseConfig
		| NodeInstance<'n8n-nodes-base.switch', string, unknown>
		| undefined;

	// Check if the second argument is a NodeInstance (pre-declared Switch node)
	if (isNodeInstance(configOrNode) && configOrNode.type === 'n8n-nodes-base.switch') {
		return new SwitchCaseCompositeWithExistingNode(
			cases,
			configOrNode as NodeInstance<'n8n-nodes-base.switch', string, unknown>,
		);
	}
	// Otherwise, treat it as a SwitchCaseConfig
	return new SwitchCaseCompositeImpl(cases, configOrNode as SwitchCaseConfig);
}
