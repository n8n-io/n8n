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
		_target: T | T[],
		_outputIndex?: number,
	): NodeChain<NodeInstance<'n8n-nodes-base.switch', string, unknown>, T> {
		throw new Error('Switch node connections are managed by SwitchCaseComposite');
	}

	onError<T extends NodeInstance<string, string, unknown>>(_handler: T): this {
		throw new Error('Switch node error handling is managed by SwitchCaseComposite');
	}

	getConnections(): DeclaredConnection[] {
		return [];
	}
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
 * Create a Switch case composite for multi-way branching
 *
 * @param cases - Array of nodes for each case output (index = output number)
 * @param config - Full Switch node config including optional version and id
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
 * ```
 */
export function switchCase(
	cases: NodeInstance<string, string, unknown>[],
	config?: SwitchCaseConfig,
): SwitchCaseComposite {
	return new SwitchCaseCompositeImpl(cases, config);
}
