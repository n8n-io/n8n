import { v4 as uuid } from 'uuid';
import type {
	MergeComposite,
	MergeConfig,
	MergeMode,
	NodeInstance,
	NodeConfig,
} from './types/base';

/**
 * Internal merge node implementation
 */
class MergeNodeInstance implements NodeInstance<'n8n-nodes-base.merge', string, unknown> {
	readonly type = 'n8n-nodes-base.merge' as const;
	readonly version: string;
	readonly config: NodeConfig;
	readonly id: string;
	readonly name: string;

	constructor(version: string, mode: MergeMode, numInputs: number, config?: NodeConfig) {
		this.version = version;
		this.id = uuid();
		this.name = config?.name ?? 'Merge';
		this.config = {
			...config,
			parameters: {
				mode,
				numberInputs: numInputs,
				...config?.parameters,
			},
		};
	}

	update(config: Partial<NodeConfig>): NodeInstance<'n8n-nodes-base.merge', string, unknown> {
		return new MergeNodeInstance(
			this.version,
			this.config.parameters?.mode as MergeMode,
			this.config.parameters?.numberInputs as number,
			{ ...this.config, ...config },
		);
	}
}

/**
 * Internal merge composite implementation
 */
class MergeCompositeImpl<TBranches extends NodeInstance<string, string, unknown>[]>
	implements MergeComposite<TBranches>
{
	readonly mergeNode: NodeInstance<'n8n-nodes-base.merge', string, unknown>;
	readonly branches: TBranches;
	readonly mode: MergeMode;

	constructor(branches: TBranches, config: MergeConfig = {}) {
		this.branches = branches;
		this.mode = config.mode ?? 'append';
		this.mergeNode = new MergeNodeInstance('v3', this.mode, branches.length, {
			parameters: config.parameters,
		});
	}
}

/**
 * Create a merge composite for parallel branch execution
 *
 * When used with workflow.then(), this creates parallel branches that
 * all execute from the previous node and then merge into a single stream.
 *
 * @param branches - Array of nodes that will execute in parallel
 * @param config - Merge configuration
 * @returns A merge composite that can be passed to workflow.then()
 *
 * @example
 * ```typescript
 * // Parallel API calls that merge results
 * workflow('id', 'Test')
 *   .add(trigger(...))
 *   .then(
 *     merge([api1, api2, api3], { mode: 'combine' })
 *   )
 *   .then(processResults);
 *
 * // This creates:
 * // trigger -> api1 ─┐
 * //         -> api2 ─┼─> merge -> processResults
 * //         -> api3 ─┘
 * ```
 */
export function merge<TBranches extends NodeInstance<string, string, unknown>[]>(
	branches: TBranches,
	config: MergeConfig = {},
): MergeComposite<TBranches> {
	return new MergeCompositeImpl(branches, config);
}
