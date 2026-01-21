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
		_target: T | T[],
		_outputIndex?: number,
	): NodeChain<NodeInstance<'n8n-nodes-base.if', string, unknown>, T> {
		throw new Error('IF node connections are managed by IfBranchComposite');
	}

	onError<T extends NodeInstance<string, string, unknown>>(_handler: T): this {
		throw new Error('IF node error handling is managed by IfBranchComposite');
	}

	getConnections(): DeclaredConnection[] {
		return [];
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
