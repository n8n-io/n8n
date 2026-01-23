import { v4 as uuid } from 'uuid';
import type {
	MergeComposite,
	MergeConfig,
	MergeMode,
	NodeInstance,
	NodeConfig,
	DeclaredConnection,
	NodeChain,
	IDataObject,
} from './types/base';
import { createChainWithMergeComposite } from './node-builder';

/**
 * Internal merge node implementation
 */
class MergeNodeInstance implements NodeInstance<'n8n-nodes-base.merge', string, unknown> {
	readonly type = 'n8n-nodes-base.merge' as const;
	readonly version: string;
	readonly config: NodeConfig;
	readonly id: string;
	readonly name: string;
	private _connections: DeclaredConnection[] = [];

	constructor(
		version: string,
		mode: MergeMode | undefined,
		numInputs: number,
		config?: { name?: string; id?: string; parameters?: NodeConfig['parameters'] },
	) {
		this.version = version;
		this.id = config?.id ?? uuid();
		this.name = config?.name ?? 'Merge';
		// Build parameters - only include mode/numberInputs if explicitly provided or needed
		const baseParams = config?.parameters ?? {};
		const params: IDataObject = { ...baseParams };

		// If mode is provided, set numberInputs (auto-calculated from branches)
		if (mode !== undefined) {
			if (params.numberInputs === undefined) {
				params.numberInputs = numInputs;
			}
			if (params.mode === undefined) {
				params.mode = mode;
			}
		}

		this.config = {
			...config,
			parameters: Object.keys(params).length > 0 ? params : undefined,
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

	then<T extends NodeInstance<string, string, unknown>>(
		target: T | T[],
		outputIndex: number = 0,
	): NodeChain<NodeInstance<'n8n-nodes-base.merge', string, unknown>, T> {
		const targets = Array.isArray(target) ? target : [target];

		// Helper to extract the actual node from a composite or target
		const getActualNode = (t: unknown): NodeInstance<string, string, unknown> | null => {
			if (t === null || t === undefined) return null;
			// Check if target is a MergeComposite (has mergeNode and branches)
			if (typeof t === 'object' && 'mergeNode' in t && 'branches' in t) {
				return (t as MergeComposite<NodeInstance<string, string, unknown>[]>).mergeNode;
			}
			return t as NodeInstance<string, string, unknown>;
		};

		// Process targets, extracting actual nodes from composites
		const actualTargets: NodeInstance<string, string, unknown>[] = [];
		for (const t of targets) {
			const actualNode = getActualNode(t);
			if (actualNode) {
				this._connections.push({ target: actualNode, outputIndex });
				actualTargets.push(actualNode);
			}
		}

		// Handle empty targets case
		if (actualTargets.length === 0) {
			// Return a minimal chain-like object that proxies back to self
			const self = this;
			return {
				_isChain: true,
				head: this,
				tail: this,
				allNodes: [this],
				type: this.type,
				version: this.version,
				config: this.config,
				id: this.id,
				name: this.name,
				_outputType: undefined,
				update: this.update.bind(this),
				then: this.then.bind(this),
				onError: this.onError.bind(this),
				getConnections: () => self._connections,
			} as unknown as NodeChain<NodeInstance<'n8n-nodes-base.merge', string, unknown>, T>;
		}

		// Return a chain-like object that proxies to the last target
		const lastTarget = actualTargets[actualTargets.length - 1];
		const self = this;

		// Defensive check: ensure lastTarget has required methods
		// This can fail if the target is malformed or is a composite without proper methods
		if (
			!lastTarget ||
			typeof lastTarget.update !== 'function' ||
			typeof lastTarget.then !== 'function'
		) {
			// Fall back to returning self as the chain endpoint
			return {
				_isChain: true,
				head: this,
				tail: this,
				allNodes: [this, ...actualTargets.filter(Boolean)],
				type: this.type,
				version: this.version,
				config: this.config,
				id: this.id,
				name: this.name,
				_outputType: undefined,
				update: this.update.bind(this),
				then: this.then.bind(this),
				onError: this.onError.bind(this),
				getConnections: () => self._connections,
			} as unknown as NodeChain<NodeInstance<'n8n-nodes-base.merge', string, unknown>, T>;
		}

		return {
			_isChain: true,
			head: this,
			tail: lastTarget,
			allNodes: [this, ...actualTargets],
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
		} as unknown as NodeChain<NodeInstance<'n8n-nodes-base.merge', string, unknown>, T>;
	}

	onError<T extends NodeInstance<string, string, unknown>>(_handler: T): this {
		throw new Error('Merge node error handling is managed by MergeComposite');
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
		const version = config.version != null ? String(config.version) : '3';
		// Only pass mode to MergeNodeInstance if explicitly provided in config
		this.mergeNode = new MergeNodeInstance(version, config.mode, branches.length, {
			name: config.name,
			id: config.id,
			parameters: config.parameters,
		});
	}

	/**
	 * Chain a downstream node to the merge output.
	 * Delegates to the mergeNode's then() method to declare the connection,
	 * then includes this MergeComposite in allNodes so addBranchToGraph
	 * can call addMergeNodes to properly set up branch connections.
	 */
	then<T extends NodeInstance<string, string, unknown>>(
		target: T | T[],
		outputIndex: number = 0,
	): NodeChain<NodeInstance<'n8n-nodes-base.merge', string, unknown>, T> {
		const baseChain = this.mergeNode.then(target, outputIndex);
		// Include the MergeComposite itself in allNodes so workflow-builder can
		// call addMergeNodes which properly sets up branch-to-merge connections
		return createChainWithMergeComposite(baseChain, this);
	}
}

/**
 * Merge composite implementation that wraps an existing node instance
 */
class MergeCompositeWithExistingNode<TBranches extends NodeInstance<string, string, unknown>[]>
	implements MergeComposite<TBranches>
{
	readonly mergeNode: NodeInstance<'n8n-nodes-base.merge', string, unknown>;
	readonly branches: TBranches;
	readonly mode: MergeMode;

	constructor(
		branches: TBranches,
		existingNode: NodeInstance<'n8n-nodes-base.merge', string, unknown>,
	) {
		this.branches = branches;
		this.mergeNode = existingNode;
		// Extract mode from the existing node's config if available
		const params = existingNode.config.parameters as { mode?: MergeMode } | undefined;
		this.mode = params?.mode ?? 'append';
	}

	/**
	 * Chain a downstream node to the merge output.
	 * Delegates to the mergeNode's then() method to declare the connection,
	 * then includes this MergeComposite in allNodes so addBranchToGraph
	 * can call addMergeNodes to properly set up branch connections.
	 */
	then<T extends NodeInstance<string, string, unknown>>(
		target: T | T[],
		outputIndex: number = 0,
	): NodeChain<NodeInstance<'n8n-nodes-base.merge', string, unknown>, T> {
		const baseChain = this.mergeNode.then(target, outputIndex);
		// Include the MergeComposite itself in allNodes so workflow-builder can
		// call addMergeNodes which properly sets up branch-to-merge connections
		return createChainWithMergeComposite(baseChain, this);
	}
}

/**
 * Create a merge composite for parallel branch execution
 *
 * When used with workflow.then(), this creates parallel branches that
 * all execute from the previous node and then merge into a single stream.
 *
 * @param branches - Array of nodes that will execute in parallel
 * @param configOrNode - Merge configuration OR a pre-declared merge node instance
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
 *
 * // Using a pre-declared merge node:
 * const mergeNode = node({ type: 'n8n-nodes-base.merge', ... });
 * workflow('id', 'Test')
 *   .add(trigger(...))
 *   .then(merge([api1, api2], mergeNode))
 *   .then(processResults);
 * ```
 */
export function merge<TBranches extends NodeInstance<string, string, unknown>[]>(
	branches: TBranches,
	configOrNode: MergeConfig | NodeInstance<'n8n-nodes-base.merge', string, unknown> = {},
): MergeComposite<TBranches> {
	// Check if the second argument is a NodeInstance (pre-declared merge node)
	if (isNodeInstance(configOrNode) && configOrNode.type === 'n8n-nodes-base.merge') {
		return new MergeCompositeWithExistingNode(
			branches,
			configOrNode as NodeInstance<'n8n-nodes-base.merge', string, unknown>,
		);
	}
	// Otherwise, treat it as a MergeConfig
	return new MergeCompositeImpl(branches, configOrNode as MergeConfig);
}
