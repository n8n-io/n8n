import { v4 as uuid } from 'uuid';
import type {
	IfBranchComposite,
	NodeInstance,
	NodeConfig,
	DeclaredConnection,
	NodeChain,
	IDataObject,
} from './types/base';

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
 * Internal IF branch composite implementation
 */
class IfBranchCompositeImpl implements IfBranchComposite {
	readonly ifNode: NodeInstance<'n8n-nodes-base.if', string, unknown>;
	readonly trueBranch: NodeInstance<string, string, unknown>;
	readonly falseBranch: NodeInstance<string, string, unknown>;

	constructor(
		branches: [
			NodeInstance<string, string, unknown> | null,
			NodeInstance<string, string, unknown> | null,
		],
		config?: IfBranchConfig,
	) {
		this.ifNode = new IfNodeInstance(config);
		// Use NoOp placeholders for null branches (they won't be connected)
		this.trueBranch = branches[0] as NodeInstance<string, string, unknown>; // Output 0 = true
		this.falseBranch = branches[1] as NodeInstance<string, string, unknown>; // Output 1 = false
	}
}

/**
 * Create an IF branching composite for conditional execution
 *
 * @param branches - Tuple of [trueBranch, falseBranch] nodes (output 0 and 1). Either can be null for single-branch patterns.
 * @param config - Full IF node config including optional version and id
 *
 * @example
 * ```typescript
 * // Both branches connected
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
 * ```
 */
export function ifBranch(
	branches: [
		NodeInstance<string, string, unknown> | null,
		NodeInstance<string, string, unknown> | null,
	],
	config?: IfBranchConfig,
): IfBranchComposite {
	return new IfBranchCompositeImpl(branches, config);
}
