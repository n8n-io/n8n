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
import { isNodeChain } from './types/base';
import { createChainWithMergeComposite } from './node-builder';
import { isFanIn } from './fan-in';
import type { FanInSources } from './fan-in';

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
 * Source for a merge input in named syntax.
 * Can be:
 * - NodeInstance: single source
 * - NodeChain: a chain of nodes (the tail connects to merge)
 * - FanInSources: multiple sources via fanIn()
 */
export type MergeInputSource =
	| NodeInstance<string, string, unknown>
	| NodeChain<NodeInstance<string, string, unknown>, NodeInstance<string, string, unknown>>
	| FanInSources;

/**
 * Named input syntax for merge.
 * Keys are input0, input1, input2, etc.
 */
export interface MergeNamedInputs {
	[key: `input${number}`]: MergeInputSource;
}

/**
 * Check if an object is a MergeNamedInputs config
 */
function isMergeNamedInputs(obj: unknown): obj is MergeNamedInputs {
	if (obj === null || typeof obj !== 'object') return false;
	// Must have at least one inputN key
	const keys = Object.keys(obj);
	if (keys.length === 0) return false;
	// All keys must be inputN format
	return keys.every((key) => /^input\d+$/.test(key));
}

/**
 * Extract nodes from a MergeInputSource
 */
function extractNodesFromInputSource(
	source: MergeInputSource,
): NodeInstance<string, string, unknown>[] {
	if (isFanIn(source)) {
		return source.sources;
	}
	if (isNodeChain(source)) {
		return source.allNodes;
	}
	// It's a single NodeInstance
	return [source];
}

/**
 * Get the tail node from a MergeInputSource (the node that connects to merge)
 */
function getTailNode(source: MergeInputSource): NodeInstance<string, string, unknown>[] {
	if (isFanIn(source)) {
		// For fanIn, all sources connect to the merge
		return source.sources;
	}
	if (isNodeChain(source)) {
		return [source.tail];
	}
	// It's a single NodeInstance
	return [source];
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
 * Merge composite using named input syntax.
 * This allows explicit mapping of sources to input indices.
 */
class MergeCompositeNamedInputs<TBranches extends NodeInstance<string, string, unknown>[]>
	implements MergeComposite<TBranches>
{
	readonly mergeNode: NodeInstance<'n8n-nodes-base.merge', string, unknown>;
	readonly branches: TBranches;
	readonly mode: MergeMode;
	/** Map from input index to source nodes */
	readonly inputMapping: Map<number, NodeInstance<string, string, unknown>[]>;
	/** All nodes from all inputs (for workflow-builder) */
	readonly _allInputNodes: NodeInstance<string, string, unknown>[];
	/** Marker to identify this as named input syntax */
	readonly _isNamedInputSyntax = true;

	constructor(
		mergeNode: NodeInstance<'n8n-nodes-base.merge', string, unknown>,
		inputs: MergeNamedInputs,
	) {
		this.mergeNode = mergeNode;

		// Parse input indices and build mapping
		this.inputMapping = new Map();
		const allNodes: NodeInstance<string, string, unknown>[] = [];
		const headNodes: NodeInstance<string, string, unknown>[] = [];

		for (const [key, source] of Object.entries(inputs)) {
			const inputIndex = parseInt(key.replace('input', ''), 10);
			const tailNodes = getTailNode(source);
			this.inputMapping.set(inputIndex, tailNodes);

			// Collect all nodes for branches array
			const sourceNodes = extractNodesFromInputSource(source);
			allNodes.push(...sourceNodes);

			// Collect head nodes for the branches array (entry points)
			if (isFanIn(source)) {
				headNodes.push(...source.sources);
			} else if (isNodeChain(source)) {
				headNodes.push(source.head);
			} else {
				headNodes.push(source);
			}
		}

		this._allInputNodes = allNodes;
		// branches is used by workflow-builder to know what nodes to add
		this.branches = headNodes as TBranches;

		// Extract mode from merge node config
		const params = mergeNode.config.parameters as { mode?: MergeMode } | undefined;
		this.mode = params?.mode ?? 'append';
	}

	then<T extends NodeInstance<string, string, unknown>>(
		target: T | T[],
		outputIndex: number = 0,
	): NodeChain<NodeInstance<'n8n-nodes-base.merge', string, unknown>, T> {
		const baseChain = this.mergeNode.then(target, outputIndex);
		return createChainWithMergeComposite(baseChain, this);
	}
}

/**
 * Type guard to check if a MergeComposite uses named input syntax
 */
export function isMergeNamedInputSyntax(
	composite: MergeComposite<NodeInstance<string, string, unknown>[]>,
): composite is MergeCompositeNamedInputs<NodeInstance<string, string, unknown>[]> {
	return '_isNamedInputSyntax' in composite && composite._isNamedInputSyntax === true;
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
 *
 * // Named input syntax (for explicit input index mapping):
 * merge(mergeNode, {
 *   input0: sourceA,
 *   input1: sourceB
 * })
 *
 * // With fanIn for multiple sources to same input:
 * merge(mergeNode, {
 *   input0: fanIn(sourceA, sourceB),  // both go to input 0
 *   input1: sourceC
 * })
 * ```
 */
export function merge<TBranches extends NodeInstance<string, string, unknown>[]>(
	branchesOrNode: TBranches | NodeInstance<'n8n-nodes-base.merge', string, unknown>,
	configOrNodeOrInputs?:
		| MergeConfig
		| NodeInstance<'n8n-nodes-base.merge', string, unknown>
		| MergeNamedInputs,
): MergeComposite<TBranches> {
	// Named input syntax: merge(mergeNode, { input0, input1, ... })
	if (
		isNodeInstance(branchesOrNode) &&
		branchesOrNode.type === 'n8n-nodes-base.merge' &&
		configOrNodeOrInputs !== undefined &&
		isMergeNamedInputs(configOrNodeOrInputs)
	) {
		return new MergeCompositeNamedInputs(
			branchesOrNode as NodeInstance<'n8n-nodes-base.merge', string, unknown>,
			configOrNodeOrInputs,
		) as unknown as MergeComposite<TBranches>;
	}

	// Original API: merge(branches, configOrNode)
	const branches = branchesOrNode as TBranches;
	const configOrNode = configOrNodeOrInputs as
		| MergeConfig
		| NodeInstance<'n8n-nodes-base.merge', string, unknown>
		| undefined;

	// Check if the second argument is a NodeInstance (pre-declared merge node)
	if (
		configOrNode &&
		isNodeInstance(configOrNode) &&
		configOrNode.type === 'n8n-nodes-base.merge'
	) {
		return new MergeCompositeWithExistingNode(
			branches,
			configOrNode as NodeInstance<'n8n-nodes-base.merge', string, unknown>,
		);
	}
	// Otherwise, treat it as a MergeConfig
	return new MergeCompositeImpl(branches, (configOrNode as MergeConfig) ?? {});
}
