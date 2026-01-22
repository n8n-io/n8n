import { v4 as uuid } from 'uuid';
import type {
	SwitchCaseComposite,
	NodeInstance,
	NodeConfig,
	DeclaredConnection,
	NodeChain,
	IDataObject,
} from './types/base';

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
 * Create a Switch case composite for multi-way branching
 *
 * @param cases - Array of nodes for each case output (index = output number)
 * @param configOrNode - Full Switch node config including optional version and id, OR a pre-declared Switch node instance
 *
 * @example
 * ```typescript
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
 * ```
 */
export function switchCase(
	cases: NodeInstance<string, string, unknown>[],
	configOrNode?: SwitchCaseConfig | NodeInstance<'n8n-nodes-base.switch', string, unknown>,
): SwitchCaseComposite {
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
