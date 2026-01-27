import { v4 as uuid } from 'uuid';
import {
	isNodeChain,
	type NodeInstance,
	type TriggerInstance,
	type NodeConfig,
	type NodeInput,
	type TriggerInput,
	type StickyNoteConfig,
	type PlaceholderValue,
	type NewCredentialValue,
	type CredentialReference,
	type DeclaredConnection,
	type NodeChain,
	type MergeComposite,
	type SwitchCaseComposite,
	type IfElseComposite,
	type SplitInBatchesBuilder,
	type InputTarget,
	type OutputSelector,
	type IfElseBuilder,
	type SwitchCaseBuilder,
	type IfElseTarget,
	type SwitchCaseTarget,
	type IDataObject,
} from './types/base';
import { isFanOut, type FanOutTargets } from './fan-out';

/**
 * Type guard to check if a value is an InputTarget
 */
export function isInputTarget(value: unknown): value is InputTarget {
	return (
		typeof value === 'object' &&
		value !== null &&
		'_isInputTarget' in value &&
		(value as InputTarget)._isInputTarget === true
	);
}

/**
 * Type guard to check if a value is an OutputSelector
 */
export function isOutputSelector(value: unknown): value is OutputSelector<string, string, unknown> {
	return (
		typeof value === 'object' &&
		value !== null &&
		'_isOutputSelector' in value &&
		(value as OutputSelector<string, string, unknown>)._isOutputSelector === true
	);
}

/**
 * Check if value is a MergeComposite
 */
function isMergeComposite(value: unknown): value is MergeComposite {
	return (
		typeof value === 'object' &&
		value !== null &&
		'mergeNode' in value &&
		'branches' in value &&
		Array.isArray((value as MergeComposite).branches)
	);
}

/**
 * Check if value is a SwitchCaseComposite
 */
function isSwitchCaseComposite(value: unknown): value is SwitchCaseComposite {
	return (
		typeof value === 'object' &&
		value !== null &&
		'switchNode' in value &&
		'cases' in value &&
		Array.isArray((value as SwitchCaseComposite).cases)
	);
}

/**
 * Check if value is an IfElseComposite
 */
function isIfElseComposite(value: unknown): value is IfElseComposite {
	return (
		typeof value === 'object' &&
		value !== null &&
		'ifNode' in value &&
		'trueBranch' in value &&
		'falseBranch' in value
	);
}

/**
 * Check if value is a SplitInBatchesBuilder or a chain (DoneChain/EachChain) from one
 */
function isSplitInBatchesBuilderOrChain(value: unknown): value is SplitInBatchesBuilder<unknown> {
	if (value === null || typeof value !== 'object') return false;

	// Direct builder check (has sibNode, _doneNodes, _eachNodes)
	if ('sibNode' in value && '_doneNodes' in value && '_eachNodes' in value) {
		return true;
	}

	// Check if it's a DoneChain or EachChain with a _parent that's a builder
	if ('_parent' in value && '_nodes' in value) {
		const parent = (value as { _parent: unknown })._parent;
		return (
			parent !== null &&
			typeof parent === 'object' &&
			'sibNode' in parent &&
			'_doneNodes' in parent &&
			'_eachNodes' in parent
		);
	}

	return false;
}

/**
 * Extract the SplitInBatchesBuilder from a value (handles both direct builder and chains)
 */
function extractSplitInBatchesBuilder(value: unknown): SplitInBatchesBuilder<unknown> {
	// Direct builder
	if ('sibNode' in (value as object)) {
		return value as SplitInBatchesBuilder<unknown>;
	}

	// Chain with _parent - extract the parent builder
	const chain = value as { _parent: unknown };
	return chain._parent as SplitInBatchesBuilder<unknown>;
}

/**
 * Get the output node from a composite (the node that should receive connections)
 */
function getCompositeOutputNode(value: unknown): NodeInstance<string, string, unknown> | null {
	if (isMergeComposite(value)) {
		return value.mergeNode;
	}
	if (isSwitchCaseComposite(value)) {
		return value.switchNode;
	}
	if (isIfElseComposite(value)) {
		return value.ifNode;
	}
	if (isSplitInBatchesBuilderOrChain(value)) {
		return extractSplitInBatchesBuilder(value).sibNode;
	}
	return null;
}

/**
 * Generate a human-readable name from a node type
 * @example 'n8n-nodes-base.httpRequest' -> 'HTTP Request'
 */
function generateNodeName(type: string): string {
	// Extract the node name after the package prefix
	const parts = type.split('.');
	const nodeName = parts[parts.length - 1];

	// Convert camelCase/PascalCase to Title Case with spaces
	return nodeName
		.replace(/([a-z])([A-Z])/g, '$1 $2') // Insert space before capitals
		.replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2') // Handle consecutive capitals
		.replace(/^./, (str) => str.toUpperCase()) // Capitalize first letter
		.replace(/Http/g, 'HTTP') // Fix common acronyms
		.replace(/Api/g, 'API')
		.replace(/Url/g, 'URL')
		.replace(/Id/g, 'ID')
		.replace(/Json/g, 'JSON')
		.replace(/Xml/g, 'XML')
		.replace(/Sql/g, 'SQL')
		.replace(/Ssh/g, 'SSH')
		.replace(/Ftp/g, 'FTP')
		.replace(/Aws/g, 'AWS')
		.replace(/Gcp/g, 'GCP');
}

/**
 * Internal node instance implementation
 */
class NodeInstanceImpl<TType extends string, TVersion extends string, TOutput = unknown>
	implements NodeInstance<TType, TVersion, TOutput>
{
	readonly type: TType;
	readonly version: TVersion;
	readonly config: NodeConfig;
	readonly id: string;
	readonly name: string;
	readonly _outputType?: TOutput;
	private _connections: DeclaredConnection[] = [];

	constructor(
		type: TType,
		version: TVersion,
		config: NodeConfig,
		id?: string,
		name?: string,
		connections?: DeclaredConnection[],
	) {
		this.type = type;
		this.version = version;
		this.config = { ...config };
		this.id = id ?? uuid();
		this.name = name ?? config.name ?? generateNodeName(type);
		this._connections = connections ?? [];
	}

	update(config: Partial<NodeConfig>): NodeInstance<TType, TVersion, TOutput> {
		const mergedConfig = {
			...this.config,
			...config,
			parameters: config.parameters ?? this.config.parameters,
			credentials: config.credentials ?? this.config.credentials,
		};
		return new NodeInstanceImpl(
			this.type,
			this.version,
			mergedConfig,
			this.id,
			this.name,
			this._connections,
		);
	}

	then<T extends NodeInstance<string, string, unknown>>(
		target: T | T[] | FanOutTargets | InputTarget,
		outputIndex: number = 0,
	): NodeChain<NodeInstance<TType, TVersion, TOutput>, T> {
		// Handle InputTarget - terminal target with specific input index
		if (isInputTarget(target)) {
			this._connections.push({
				target: target.node,
				outputIndex,
				targetInputIndex: target.inputIndex,
			});
			// Return a chain ending at the input target's node
			return new NodeChainImpl(this, target.node as T, [this, target.node]);
		}

		// Handle FanOutTargets - extract targets array
		let targets: (T | NodeInstance<string, string, unknown>)[];
		if (isFanOut(target)) {
			targets = target.targets;
		} else {
			targets = Array.isArray(target) ? target : [target];
		}

		for (const t of targets) {
			this._connections.push({ target: t, outputIndex });
		}

		// Helper to extract all nodes from a target (handles NodeChain, builders, etc.)
		const flattenTarget = (t: unknown): NodeInstance<string, string, unknown>[] => {
			if (isNodeChain(t)) {
				return t.allNodes;
			}
			// For SplitInBatchesBuilder, return it as-is so it can be detected and handled
			// by workflow-builder's addSplitInBatchesChainNodes
			if (isSplitInBatchesBuilderOrChain(t)) {
				return [t as unknown as NodeInstance<string, string, unknown>];
			}
			// For IfElseBuilder, return it as-is so it can be detected and handled
			// by workflow-builder's addIfElseBuilderNodes
			if (isIfElseBuilder(t)) {
				return [t as unknown as NodeInstance<string, string, unknown>];
			}
			// For SwitchCaseBuilder, return it as-is so it can be detected and handled
			// by workflow-builder's addSwitchCaseBuilderNodes
			if (isSwitchCaseBuilder(t)) {
				return [t as unknown as NodeInstance<string, string, unknown>];
			}
			return [t as NodeInstance<string, string, unknown>];
		};

		// Flatten all targets (some may be NodeChains with multiple nodes)
		const allTargetNodes = targets.flatMap(flattenTarget);

		// Return chain with last target as tail (for type compatibility)
		const lastTarget = targets[targets.length - 1];
		return new NodeChainImpl(this, lastTarget as T, [this, ...allTargetNodes]);
	}

	/**
	 * Alias for then() - connect this node to one or more target nodes.
	 */
	to<T extends NodeInstance<string, string, unknown>>(
		target: T | T[] | FanOutTargets | InputTarget,
		outputIndex: number = 0,
	): NodeChain<NodeInstance<TType, TVersion, TOutput>, T> {
		return this.then(target, outputIndex);
	}

	/**
	 * Create a terminal input target for connecting to a specific input index.
	 * Use this to connect a node to a specific input of a multi-input node like Merge.
	 */
	input(index: number): InputTarget {
		return {
			_isInputTarget: true,
			node: this,
			inputIndex: index,
		};
	}

	/**
	 * Create an output selector for connecting from a specific output index.
	 * Use this for multi-output nodes (like text classifiers) to connect from specific outputs.
	 */
	output(index: number): OutputSelector<TType, TVersion, TOutput> {
		return new OutputSelectorImpl(this, index);
	}

	/**
	 * Start building an IF branch with the true branch target.
	 * Only available on IF nodes (n8n-nodes-base.if).
	 *
	 * @example
	 * ifNode.onTrue(trueHandler).onFalse(falseHandler)
	 */
	onTrue(target: IfElseTarget): IfElseBuilder<TOutput> {
		if (this.type !== 'n8n-nodes-base.if') {
			throw new Error('.onTrue() is only available on IF nodes (n8n-nodes-base.if)');
		}
		const builder = new IfElseBuilderImpl<TOutput>(
			this as unknown as NodeInstance<'n8n-nodes-base.if', string, TOutput>,
		);
		return builder.onTrue(target);
	}

	/**
	 * Start building an IF branch with the false branch target.
	 * Only available on IF nodes (n8n-nodes-base.if).
	 *
	 * @example
	 * ifNode.onFalse(falseHandler).onTrue(trueHandler)
	 */
	onFalse(target: IfElseTarget): IfElseBuilder<TOutput> {
		if (this.type !== 'n8n-nodes-base.if') {
			throw new Error('.onFalse() is only available on IF nodes (n8n-nodes-base.if)');
		}
		const builder = new IfElseBuilderImpl<TOutput>(
			this as unknown as NodeInstance<'n8n-nodes-base.if', string, TOutput>,
		);
		return builder.onFalse(target);
	}

	/**
	 * Start building a Switch case with a case target.
	 * Only available on Switch nodes (n8n-nodes-base.switch).
	 *
	 * @example
	 * switchNode.onCase(0, caseA).onCase(1, caseB)
	 */
	onCase(index: number, target: SwitchCaseTarget): SwitchCaseBuilder<TOutput> {
		if (this.type !== 'n8n-nodes-base.switch') {
			throw new Error('.onCase() is only available on Switch nodes (n8n-nodes-base.switch)');
		}
		const builder = new SwitchCaseBuilderImpl<TOutput>(
			this as unknown as NodeInstance<'n8n-nodes-base.switch', string, TOutput>,
		);
		return builder.onCase(index, target);
	}

	onError<T extends NodeInstance<string, string, unknown>>(handler: T): this {
		const errorOutputIndex = this.calculateErrorOutputIndex();
		this._connections.push({ target: handler, outputIndex: errorOutputIndex });
		return this;
	}

	/**
	 * Calculate the error output index based on node type.
	 * Error outputs are always the last output after regular outputs:
	 * - Regular nodes: index 1 (after main output 0)
	 * - IF nodes: index 2 (after true=0, false=1)
	 * - Switch nodes: index = numberOfOutputs (determined from parameters)
	 */
	private calculateErrorOutputIndex(): number {
		// IF nodes have true (0) and false (1) branches, error at index 2
		if (this.type === 'n8n-nodes-base.if') {
			return 2;
		}

		// Switch nodes have variable outputs based on parameters
		if (this.type === 'n8n-nodes-base.switch') {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const params = this.config.parameters as Record<string, any> | undefined;
			const numberOutputs = params?.numberOutputs ?? params?.rules?.rules?.length ?? 4;
			return numberOutputs;
		}

		// Regular nodes: error at index 1 (after main output 0)
		return 1;
	}

	getConnections(): DeclaredConnection[] {
		return [...this._connections];
	}
}

/**
 * Internal trigger instance implementation
 */
class TriggerInstanceImpl<TType extends string, TVersion extends string, TOutput = unknown>
	extends NodeInstanceImpl<TType, TVersion, TOutput>
	implements TriggerInstance<TType, TVersion, TOutput>
{
	readonly isTrigger: true = true;
}

/**
 * Internal NodeChain implementation
 *
 * Proxies NodeInstance properties to the tail node while tracking all nodes in the chain.
 */
class NodeChainImpl<
	THead extends NodeInstance<string, string, unknown>,
	TTail extends NodeInstance<string, string, unknown>,
> implements NodeChain<THead, TTail>
{
	readonly _isChain: true = true;
	readonly head: THead;
	readonly tail: TTail;
	readonly allNodes: NodeInstance<string, string, unknown>[];

	constructor(head: THead, tail: TTail, allNodes: NodeInstance<string, string, unknown>[]) {
		this.head = head;
		this.tail = tail;
		this.allNodes = allNodes;
	}

	// Proxy NodeInstance properties to tail
	get type(): TTail['type'] {
		return this.tail.type;
	}

	get version(): TTail['version'] {
		return this.tail.version;
	}

	get config(): NodeConfig {
		return this.tail.config;
	}

	get id(): string {
		return this.tail.id;
	}

	get name(): string {
		return this.tail.name;
	}

	get _outputType(): TTail['_outputType'] {
		return this.tail._outputType;
	}

	update(
		config: Partial<NodeConfig>,
	): NodeInstance<TTail['type'], TTail['version'], TTail['_outputType']> {
		return this.tail.update(config);
	}

	then<T extends NodeInstance<string, string, unknown>>(
		target: T | T[] | FanOutTargets | InputTarget,
		outputIndex: number = 0,
	): NodeChain<THead, T> {
		// Handle InputTarget - terminal target with specific input index
		if (isInputTarget(target)) {
			// Delegate to tail's then method which handles InputTarget
			this.tail.then(target, outputIndex);
			return new NodeChainImpl(this.head, target.node as T, [...this.allNodes, target.node]);
		}

		// Handle FanOutTargets - extract targets array
		let targets: (T | NodeInstance<string, string, unknown>)[];
		if (isFanOut(target)) {
			targets = target.targets;
		} else {
			targets = Array.isArray(target) ? target : [target];
		}

		// Helper to extract all nodes from a target (handles NodeChain, builders, etc.)
		const flattenTarget = (t: unknown): NodeInstance<string, string, unknown>[] => {
			if (isNodeChain(t)) {
				return t.allNodes;
			}
			// For SplitInBatchesBuilder, return it as-is so it can be detected and handled
			// by workflow-builder's addSplitInBatchesChainNodes
			if (isSplitInBatchesBuilderOrChain(t)) {
				return [t as unknown as NodeInstance<string, string, unknown>];
			}
			// For IfElseBuilder, return it as-is so it can be detected and handled
			// by workflow-builder's addIfElseBuilderNodes
			if (isIfElseBuilder(t)) {
				return [t as unknown as NodeInstance<string, string, unknown>];
			}
			// For SwitchCaseBuilder, return it as-is so it can be detected and handled
			// by workflow-builder's addSwitchCaseBuilderNodes
			if (isSwitchCaseBuilder(t)) {
				return [t as unknown as NodeInstance<string, string, unknown>];
			}
			return [t as NodeInstance<string, string, unknown>];
		};

		// Flatten all targets (some may be NodeChains with multiple nodes)
		const allTargetNodes = targets.flatMap(flattenTarget);

		// Check if the tail is a composite - if so, get its output node
		const outputNode = getCompositeOutputNode(this.tail);
		if (outputNode) {
			// For composites, connect the output node (mergeNode, switchNode, ifNode) to the targets.
			// The output node supports .then() to declare the connection.
			if (typeof outputNode.then === 'function') {
				outputNode.then(targets, outputIndex);
			}
			const lastTarget = targets[targets.length - 1];
			return new NodeChainImpl(this.head, lastTarget as T, [...this.allNodes, ...allTargetNodes]);
		}

		// Connect tail to all targets (use the tail's then method which handles connections)
		this.tail.then(targets, outputIndex);
		// Return chain with last target as tail
		const lastTarget = targets[targets.length - 1];
		return new NodeChainImpl(this.head, lastTarget as T, [...this.allNodes, ...allTargetNodes]);
	}

	/**
	 * Alias for then() - connect to target nodes.
	 */
	to<T extends NodeInstance<string, string, unknown>>(
		target: T | T[] | FanOutTargets | InputTarget,
		outputIndex: number = 0,
	): NodeChain<THead, T> {
		return this.then(target, outputIndex);
	}

	/**
	 * Create a terminal input target for connecting to a specific input index.
	 * Delegates to the tail node's input method.
	 */
	input(index: number): InputTarget {
		return this.tail.input(index);
	}

	/**
	 * Create an output selector for connecting from a specific output index.
	 * Delegates to the tail node's output method.
	 */
	output(index: number): OutputSelector<TTail['type'], TTail['version'], TTail['_outputType']> {
		return this.tail.output(index);
	}

	/**
	 * Start building an IF branch with the true branch target.
	 * Delegates to the tail node's onTrue method.
	 */
	onTrue(target: IfElseTarget): IfElseBuilder<TTail['_outputType']> {
		if (!this.tail.onTrue) {
			throw new Error('.onTrue() is only available on IF nodes (n8n-nodes-base.if)');
		}
		return this.tail.onTrue(target);
	}

	/**
	 * Start building an IF branch with the false branch target.
	 * Delegates to the tail node's onFalse method.
	 */
	onFalse(target: IfElseTarget): IfElseBuilder<TTail['_outputType']> {
		if (!this.tail.onFalse) {
			throw new Error('.onFalse() is only available on IF nodes (n8n-nodes-base.if)');
		}
		return this.tail.onFalse(target);
	}

	/**
	 * Start building a Switch case with a case target.
	 * Delegates to the tail node's onCase method.
	 */
	onCase(index: number, target: SwitchCaseTarget): SwitchCaseBuilder<TTail['_outputType']> {
		if (!this.tail.onCase) {
			throw new Error('.onCase() is only available on Switch nodes (n8n-nodes-base.switch)');
		}
		return this.tail.onCase(index, target);
	}

	onError<T extends NodeInstance<string, string, unknown>>(handler: T): this {
		this.tail.onError(handler);
		return this;
	}

	getConnections(): DeclaredConnection[] {
		// Aggregate connections from all nodes in the chain
		const allConnections: DeclaredConnection[] = [];
		for (const node of this.allNodes) {
			// Skip null values (can occur when .then([null, node]) is used for multi-output nodes)
			if (node === null) {
				continue;
			}
			// Skip composites (SwitchCaseComposite, etc.) which don't have getConnections
			if (typeof node.getConnections === 'function') {
				allConnections.push(...node.getConnections());
			}
		}
		return allConnections;
	}
}

/**
 * Internal output selector implementation
 *
 * Allows connecting from a specific output index of a node.
 */
class OutputSelectorImpl<TType extends string, TVersion extends string, TOutput = unknown>
	implements OutputSelector<TType, TVersion, TOutput>
{
	readonly _isOutputSelector: true = true;
	readonly node: NodeInstance<TType, TVersion, TOutput>;
	readonly outputIndex: number;

	constructor(node: NodeInstance<TType, TVersion, TOutput>, outputIndex: number) {
		this.node = node;
		this.outputIndex = outputIndex;
	}

	then<T extends NodeInstance<string, string, unknown>>(
		target: T | T[] | InputTarget,
	): NodeChain<NodeInstance<TType, TVersion, TOutput>, T> {
		// Delegate to the node's then method with the specific outputIndex
		return this.node.then(target, this.outputIndex);
	}

	/**
	 * Alias for then() - connect from this output to a target node.
	 */
	to<T extends NodeInstance<string, string, unknown>>(
		target: T | T[] | InputTarget,
	): NodeChain<NodeInstance<TType, TVersion, TOutput>, T> {
		return this.then(target);
	}
}

// =============================================================================
// Fluent API builders for IF and Switch nodes
// =============================================================================

/**
 * Extract all nodes from a target (node, chain, composite, or fanOut)
 */
function extractNodesFromTarget(target: unknown): NodeInstance<string, string, unknown>[] {
	if (target === null) return [];

	// Handle FanOut
	if (isFanOut(target)) {
		const nodes: NodeInstance<string, string, unknown>[] = [];
		for (const t of target.targets) {
			nodes.push(...extractNodesFromTarget(t));
		}
		return nodes;
	}

	// Handle NodeChain
	if (isNodeChain(target)) {
		const nodes: NodeInstance<string, string, unknown>[] = [];
		for (const chainNode of target.allNodes) {
			nodes.push(...extractNodesFromTarget(chainNode));
		}
		return nodes;
	}

	// Handle IfElseBuilder (fluent API)
	if (
		target !== null &&
		typeof target === 'object' &&
		'_isIfElseBuilder' in target &&
		(target as { _isIfElseBuilder: boolean })._isIfElseBuilder === true
	) {
		const builder = target as IfElseBuilder<unknown>;
		const nodes: NodeInstance<string, string, unknown>[] = [builder.ifNode];
		nodes.push(...extractNodesFromTarget(builder.trueBranch));
		nodes.push(...extractNodesFromTarget(builder.falseBranch));
		return nodes;
	}

	// Handle SwitchCaseBuilder (fluent API)
	if (
		target !== null &&
		typeof target === 'object' &&
		'_isSwitchCaseBuilder' in target &&
		(target as { _isSwitchCaseBuilder: boolean })._isSwitchCaseBuilder === true
	) {
		const builder = target as SwitchCaseBuilder<unknown>;
		const nodes: NodeInstance<string, string, unknown>[] = [builder.switchNode];
		for (const caseTarget of builder.caseMapping.values()) {
			nodes.push(...extractNodesFromTarget(caseTarget));
		}
		return nodes;
	}

	// Check if it's a node-like object with type, version, config
	if (
		target !== null &&
		typeof target === 'object' &&
		'type' in target &&
		'version' in target &&
		'config' in target
	) {
		return [target as NodeInstance<string, string, unknown>];
	}

	return [];
}

/**
 * Type guard to check if a value is an IfElseBuilder
 */
export function isIfElseBuilder(value: unknown): value is IfElseBuilder<unknown> {
	return (
		value !== null &&
		typeof value === 'object' &&
		'_isIfElseBuilder' in value &&
		(value as IfElseBuilder<unknown>)._isIfElseBuilder === true
	);
}

/**
 * Type guard to check if a value is a SwitchCaseBuilder
 */
export function isSwitchCaseBuilder(value: unknown): value is SwitchCaseBuilder<unknown> {
	return (
		value !== null &&
		typeof value === 'object' &&
		'_isSwitchCaseBuilder' in value &&
		(value as SwitchCaseBuilder<unknown>)._isSwitchCaseBuilder === true
	);
}

/**
 * Internal IF else builder implementation
 *
 * Provides fluent .onTrue()/.onFalse() methods for IF node branching.
 */
class IfElseBuilderImpl<TOutput = unknown> implements IfElseBuilder<TOutput> {
	readonly _isIfElseBuilder: true = true;
	readonly ifNode: NodeInstance<'n8n-nodes-base.if', string, TOutput>;
	trueBranch: IfElseTarget = null;
	falseBranch: IfElseTarget = null;
	/** All nodes from both branches (for workflow-builder) */
	_allBranchNodes: NodeInstance<string, string, unknown>[] = [];

	constructor(ifNode: NodeInstance<'n8n-nodes-base.if', string, TOutput>) {
		this.ifNode = ifNode;
	}

	onTrue(target: IfElseTarget): IfElseBuilder<TOutput> {
		this.trueBranch = target;
		this._updateAllBranchNodes();
		return this;
	}

	onFalse(target: IfElseTarget): IfElseBuilder<TOutput> {
		this.falseBranch = target;
		this._updateAllBranchNodes();
		return this;
	}

	then<T extends NodeInstance<string, string, unknown>>(
		target: T | T[],
		outputIndex: number = 0,
	): NodeChain<NodeInstance<'n8n-nodes-base.if', string, TOutput>, T> {
		// Delegate to the IF node's then method
		return this.ifNode.then(target, outputIndex);
	}

	private _updateAllBranchNodes(): void {
		const allNodes: NodeInstance<string, string, unknown>[] = [];
		for (const node of extractNodesFromTarget(this.trueBranch)) {
			if (!allNodes.some((n) => n.name === node.name)) {
				allNodes.push(node);
			}
		}
		for (const node of extractNodesFromTarget(this.falseBranch)) {
			if (!allNodes.some((n) => n.name === node.name)) {
				allNodes.push(node);
			}
		}
		this._allBranchNodes = allNodes;
	}
}

/**
 * Internal Switch case builder implementation
 *
 * Provides fluent .onCase() method for Switch node branching.
 */
class SwitchCaseBuilderImpl<TOutput = unknown> implements SwitchCaseBuilder<TOutput> {
	readonly _isSwitchCaseBuilder: true = true;
	readonly switchNode: NodeInstance<'n8n-nodes-base.switch', string, TOutput>;
	readonly caseMapping: Map<number, SwitchCaseTarget> = new Map();
	/** All nodes from all cases (for workflow-builder) */
	_allCaseNodes: NodeInstance<string, string, unknown>[] = [];

	constructor(switchNode: NodeInstance<'n8n-nodes-base.switch', string, TOutput>) {
		this.switchNode = switchNode;
	}

	onCase(index: number, target: SwitchCaseTarget): SwitchCaseBuilder<TOutput> {
		this.caseMapping.set(index, target);
		this._updateAllCaseNodes();
		return this;
	}

	then<T extends NodeInstance<string, string, unknown>>(
		target: T | T[],
		outputIndex: number = 0,
	): NodeChain<NodeInstance<'n8n-nodes-base.switch', string, TOutput>, T> {
		// Delegate to the Switch node's then method
		return this.switchNode.then(target, outputIndex);
	}

	private _updateAllCaseNodes(): void {
		const allNodes: NodeInstance<string, string, unknown>[] = [];
		for (const target of this.caseMapping.values()) {
			for (const node of extractNodesFromTarget(target)) {
				if (!allNodes.some((n) => n.name === node.name)) {
					allNodes.push(node);
				}
			}
		}
		this._allCaseNodes = allNodes;
	}
}

/**
 * Create an IfElseBuilder for an IF node.
 * This is called internally when .onTrue() or .onFalse() is called on an IF node.
 */
export function createIfElseBuilder<TOutput>(
	ifNode: NodeInstance<'n8n-nodes-base.if', string, TOutput>,
): IfElseBuilder<TOutput> {
	return new IfElseBuilderImpl(ifNode);
}

/**
 * Create a SwitchCaseBuilder for a Switch node.
 * This is called internally when .onCase() is called on a Switch node.
 */
export function createSwitchCaseBuilder<TOutput>(
	switchNode: NodeInstance<'n8n-nodes-base.switch', string, TOutput>,
): SwitchCaseBuilder<TOutput> {
	return new SwitchCaseBuilderImpl(switchNode);
}

/**
 * Create a node instance
 *
 * @param input - Node input with type, version, and config
 * @returns A configured node instance
 *
 * @example
 * ```typescript
 * // With generated types (recommended)
 * import { LcAgentV31Node } from './types/generated';
 * const agent = node({
 *   type: '@n8n/n8n-nodes-langchain.agent',
 *   version: 3.1,
 *   config: { parameters: { promptType: 'auto', text: 'Hello' } }
 * } satisfies LcAgentV31Node);
 *
 * // Generic usage
 * const httpNode = node({
 *   type: 'n8n-nodes-base.httpRequest',
 *   version: 4.2,
 *   config: {
 *     parameters: { url: 'https://api.example.com', method: 'GET' },
 *     credentials: { httpBasicAuth: { name: 'My Creds', id: '123' } }
 *   }
 * });
 * ```
 */
export function node<TNode extends NodeInput>(
	input: TNode,
): NodeInstance<TNode['type'], `${TNode['version']}`, unknown> {
	const versionStr = String(input.version) as `${TNode['version']}`;
	return new NodeInstanceImpl<TNode['type'], `${TNode['version']}`, unknown>(
		input.type,
		versionStr,
		input.config as NodeConfig,
	);
}

/**
 * Config for ifElse() factory function
 */
export interface IfElseFactoryConfig {
	name?: string;
	version?: number;
	parameters?: IDataObject;
	credentials?: Record<string, CredentialReference | NewCredentialValue>;
	position?: [number, number];
}

/**
 * Create an IF node with the specified config.
 * Convenience wrapper around node() with type preset to 'n8n-nodes-base.if'.
 *
 * @param config - Optional config with name, version (defaults to 2.3), and other node properties
 * @returns A configured IF node instance with .onTrue()/.onFalse() methods
 *
 * @example
 * ```typescript
 * const ifNode = ifElse({ name: 'Check Value' })
 *   .onTrue(trueHandler)
 *   .onFalse(falseHandler);
 * ```
 */
export function ifElse<TOutput = unknown>(
	config?: IfElseFactoryConfig,
): NodeInstance<'n8n-nodes-base.if', string, TOutput> {
	return node({
		type: 'n8n-nodes-base.if',
		version: config?.version ?? 2.3,
		config: {
			name: config?.name,
			parameters: config?.parameters,
			credentials: config?.credentials,
			position: config?.position,
		},
	}) as NodeInstance<'n8n-nodes-base.if', string, TOutput>;
}

/** Alias for ifElse() */
export const ifNode = ifElse;

/**
 * Create a trigger node instance
 *
 * @param input - Trigger input with type, version, and config
 * @returns A configured trigger node instance
 *
 * @example
 * ```typescript
 * const schedule = trigger({
 *   type: 'n8n-nodes-base.scheduleTrigger',
 *   version: 1.1,
 *   config: { parameters: { rule: { interval: [{ field: 'hours', hour: 8 }] } } }
 * });
 * ```
 */
export function trigger<TTrigger extends TriggerInput>(
	input: TTrigger,
): TriggerInstance<TTrigger['type'], `${TTrigger['version']}`, unknown> {
	const versionStr = String(input.version) as `${TTrigger['version']}`;
	return new TriggerInstanceImpl<TTrigger['type'], `${TTrigger['version']}`, unknown>(
		input.type,
		versionStr,
		input.config as NodeConfig,
	);
}

// Default node dimensions for bounding box calculation
const DEFAULT_NODE_WIDTH = 200;
const DEFAULT_NODE_HEIGHT = 100;
const STICKY_PADDING = 50;

/**
 * Calculate bounding box around a set of nodes
 */
function calculateNodesBoundingBox(nodes: NodeInstance<string, string, unknown>[]): {
	position: [number, number];
	width: number;
	height: number;
} | null {
	if (nodes.length === 0) return null;

	let minX = Infinity;
	let minY = Infinity;
	let maxX = -Infinity;
	let maxY = -Infinity;

	for (const node of nodes) {
		const pos = node.config.position ?? [0, 0];
		const x = pos[0];
		const y = pos[1];

		minX = Math.min(minX, x);
		minY = Math.min(minY, y);
		maxX = Math.max(maxX, x + DEFAULT_NODE_WIDTH);
		maxY = Math.max(maxY, y + DEFAULT_NODE_HEIGHT);
	}

	return {
		position: [minX - STICKY_PADDING, minY - STICKY_PADDING],
		width: maxX - minX + STICKY_PADDING * 2,
		height: maxY - minY + STICKY_PADDING * 2,
	};
}

/**
 * Sticky note node instance
 */
class StickyNoteInstance implements NodeInstance<'n8n-nodes-base.stickyNote', 'v1', void> {
	readonly type = 'n8n-nodes-base.stickyNote' as const;
	readonly version = 'v1' as const;
	readonly config: NodeConfig;
	readonly id: string;
	readonly name: string;

	constructor(content: string, stickyConfig: StickyNoteConfig = {}) {
		this.id = uuid();
		// Use a unique default name to prevent multiple stickies from overwriting each other
		// when added to a workflow (Map uses name as key)
		this.name = stickyConfig.name ?? `Sticky Note ${this.id.slice(0, 8)}`;

		// If nodes are provided, calculate bounding box to wrap around them
		const boundingBox = stickyConfig.nodes ? calculateNodesBoundingBox(stickyConfig.nodes) : null;

		this.config = {
			name: this.name,
			position: stickyConfig.position ?? boundingBox?.position,
			parameters: {
				content,
				...(stickyConfig.color !== undefined && { color: stickyConfig.color }),
				...((stickyConfig.width ?? boundingBox?.width) !== undefined && {
					width: stickyConfig.width ?? boundingBox?.width,
				}),
				...((stickyConfig.height ?? boundingBox?.height) !== undefined && {
					height: stickyConfig.height ?? boundingBox?.height,
				}),
			},
		};
	}

	update(config: Partial<NodeConfig>): NodeInstance<'n8n-nodes-base.stickyNote', 'v1', void> {
		const newContent = (config.parameters?.content as string) ?? this.config.parameters?.content;
		const newConfig: StickyNoteConfig = {
			position: config.position ?? this.config.position,
			color: (config.parameters?.color as number) ?? (this.config.parameters?.color as number),
			width: (config.parameters?.width as number) ?? (this.config.parameters?.width as number),
			height: (config.parameters?.height as number) ?? (this.config.parameters?.height as number),
			name: config.name ?? this.name,
		};
		return new StickyNoteInstance(newContent as string, newConfig);
	}

	input(_index: number): InputTarget {
		throw new Error('Sticky notes do not support input connections');
	}

	output(_index: number): OutputSelector<'n8n-nodes-base.stickyNote', 'v1', void> {
		throw new Error('Sticky notes do not support output connections');
	}

	then<T extends NodeInstance<string, string, unknown>>(
		_target: T | T[] | InputTarget,
		_outputIndex?: number,
	): NodeChain<NodeInstance<'n8n-nodes-base.stickyNote', 'v1', void>, T> {
		throw new Error('Sticky notes do not support connections');
	}

	to<T extends NodeInstance<string, string, unknown>>(
		_target: T | T[] | InputTarget,
		_outputIndex?: number,
	): NodeChain<NodeInstance<'n8n-nodes-base.stickyNote', 'v1', void>, T> {
		throw new Error('Sticky notes do not support connections');
	}

	onError<T extends NodeInstance<string, string, unknown>>(_handler: T): this {
		throw new Error('Sticky notes do not support error handlers');
	}

	getConnections(): DeclaredConnection[] {
		return [];
	}
}

/**
 * Create a sticky note for workflow documentation
 *
 * @param content - Markdown content for the sticky note
 * @param config - Optional configuration (color, position, size, nodes to wrap)
 * @returns A sticky note node instance
 *
 * @example
 * ```typescript
 * // Manual positioning
 * const note = sticky('## API Integration\nThis section handles API calls', {
 *   color: 4,
 *   position: [80, -176]
 * });
 *
 * // Auto-position around nodes
 * const httpNode = node({ type: 'n8n-nodes-base.httpRequest', ... });
 * const setNode = node({ type: 'n8n-nodes-base.set', ... });
 * const note = sticky('## Data Processing', { nodes: [httpNode, setNode], color: 2 });
 * ```
 */
export function sticky(
	content: string,
	config: StickyNoteConfig = {},
): NodeInstance<'n8n-nodes-base.stickyNote', 'v1', void> {
	return new StickyNoteInstance(content, config);
}

/**
 * Placeholder implementation
 */
class PlaceholderImpl implements PlaceholderValue {
	readonly __placeholder: true = true;
	readonly hint: string;

	constructor(hint: string) {
		this.hint = hint;
	}

	toString(): string {
		return `<__PLACEHOLDER_VALUE__${this.hint}__>`;
	}

	toJSON(): string {
		return this.toString();
	}
}

/**
 * Create a placeholder value for template parameters
 *
 * Placeholders are used to mark values that need to be filled in
 * when a workflow template is instantiated.
 *
 * @param hint - Description shown to users (e.g., 'Enter Channel')
 * @returns A placeholder value that serializes to the placeholder format
 *
 * @example
 * ```typescript
 * const slackNode = node('n8n-nodes-base.slack', 'v2.2', {
 *   parameters: { channel: placeholder('Enter Channel') }
 * });
 * // Serializes channel as: '<__PLACEHOLDER_VALUE__Enter Channel__>'
 * ```
 */
export function placeholder(hint: string): PlaceholderValue {
	return new PlaceholderImpl(hint);
}

/**
 * New credential implementation
 * Currently serializes to undefined (not yet implemented).
 * Will be implemented to create actual credentials later.
 */
class NewCredentialImpl implements NewCredentialValue {
	readonly __newCredential: true = true;
	readonly name: string;

	constructor(name: string) {
		this.name = name;
	}

	toJSON(): undefined {
		// TODO: Implement credential creation
		return undefined;
	}
}

/**
 * Create a new credential marker for credentials that need to be created
 *
 * Use this when a workflow needs a credential that doesn't exist yet.
 * Currently serializes to undefined (not yet implemented).
 *
 * @param name - Display name for the credential (e.g., 'My Slack Bot')
 * @returns A credential marker (currently serializes to undefined)
 *
 * @example
 * ```typescript
 * const slackNode = node('n8n-nodes-base.slack', 'v2.2', {
 *   parameters: { channel: '#general' },
 *   credentials: { slackApi: newCredential('My Slack Bot') }
 * });
 * // Currently: credential is omitted from JSON output
 * // TODO: Will create actual credentials when implemented
 * ```
 */
export function newCredential(name: string): NewCredentialValue {
	return new NewCredentialImpl(name);
}

/**
 * Create a NodeChain with additional nodes prepended to allNodes.
 * This is used by MergeComposite to ensure branch nodes are included
 * when .then() is called on a merge.
 *
 * @param baseChain - The base chain created by mergeNode.then()
 * @param additionalNodes - Additional nodes to prepend to allNodes (e.g., merge branches)
 * @returns A new chain with the additional nodes included
 */
export function createChainWithAdditionalNodes<
	THead extends NodeInstance<string, string, unknown>,
	TTail extends NodeInstance<string, string, unknown>,
>(
	baseChain: NodeChain<THead, TTail>,
	additionalNodes: NodeInstance<string, string, unknown>[],
): NodeChain<THead, TTail> {
	// Filter out nodes that are already in allNodes to avoid duplicates
	const existingNames = new Set(baseChain.allNodes.map((n) => n.name));
	const newNodes = additionalNodes.filter((n) => !existingNames.has(n.name));

	// Create a new chain with the additional nodes prepended
	const allNodes = [...newNodes, ...baseChain.allNodes];

	return new NodeChainImpl(baseChain.head, baseChain.tail, allNodes);
}

/**
 * Create a NodeChain that includes a MergeComposite in allNodes.
 * This is used by MergeComposite.then() to ensure the composite is processed
 * by addBranchToGraph which calls addMergeNodes to set up branch connections.
 *
 * @param baseChain - The base chain created by mergeNode.then()
 * @param mergeComposite - The MergeComposite to include in allNodes
 * @returns A new chain with the MergeComposite prepended to allNodes
 */
export function createChainWithMergeComposite<
	THead extends NodeInstance<string, string, unknown>,
	TTail extends NodeInstance<string, string, unknown>,
>(baseChain: NodeChain<THead, TTail>, mergeComposite: MergeComposite): NodeChain<THead, TTail> {
	// Include the MergeComposite at the front of allNodes
	// The workflow-builder's addBranchToGraph will detect it via isMergeComposite
	// and call addMergeNodes which properly sets up branch connections
	// Note: The type cast is safe because addBranchToGraph handles MergeComposite in allNodes
	const allNodes = [
		mergeComposite as unknown as NodeInstance<string, string, unknown>,
		...baseChain.allNodes,
	];

	return new NodeChainImpl(baseChain.head, baseChain.tail, allNodes);
}
