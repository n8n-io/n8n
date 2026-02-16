/**
 * Workflow SDK Types
 *
 * Core types for building n8n workflows programmatically.
 */

import type { ValidationOptions, ValidationResult } from '../validation/index';
import type { PluginRegistry } from '../workflow-builder/plugins/registry';

// =============================================================================
// Data Types
// =============================================================================

/**
 * Generic data object for node parameters and data.
 * Supports nested objects and arrays.
 */
export interface IDataObject {
	[key: string]:
		| string
		| number
		| boolean
		| null
		| undefined
		| object
		| IDataObject
		| Array<string | number | boolean | null | object | IDataObject>;
}

/**
 * Binary data attached to an item.
 */
export interface BinaryData {
	[key: string]: {
		fileName?: string;
		mimeType?: string;
		fileExtension?: string;
		fileSize?: string;
		data?: string;
	};
}

/**
 * A single n8n item with JSON data and optional binary attachments.
 */
export interface Item<T = IDataObject> {
	json: T;
	binary?: BinaryData;
}

/**
 * An array of n8n items.
 */
export type Items<T = IDataObject> = Array<Item<T>>;

// =============================================================================
// Credentials
// =============================================================================

/**
 * Reference to existing credentials
 */
export interface CredentialReference {
	name: string;
	id: string;
}

/**
 * Marker for new credentials that need to be created.
 */
export interface NewCredentialValue {
	readonly __newCredential: true;
	readonly name: string;
}

// =============================================================================
// Placeholder Values
// =============================================================================

/**
 * Placeholder for values the user needs to fill in.
 */
export interface PlaceholderValue {
	readonly __placeholder: true;
	readonly hint: string;
}

// =============================================================================
// Error Handling
// =============================================================================

/**
 * Error handling behavior for nodes
 */
export type OnError = 'stopWorkflow' | 'continueRegularOutput' | 'continueErrorOutput';

// =============================================================================
// Workflow Settings (with extensibility)
// =============================================================================

/**
 * Workflow-level settings configuration
 */
export interface WorkflowSettings {
	timezone?: string;
	errorWorkflow?: string;
	saveDataErrorExecution?: 'all' | 'none';
	saveDataSuccessExecution?: 'all' | 'none';
	saveManualExecutions?: boolean;
	saveExecutionProgress?: boolean;
	executionTimeout?: number;
	executionOrder?: 'v0' | 'v1';
	callerPolicy?: 'any' | 'none' | 'workflowsFromAList' | 'workflowsFromSameOwner';
	callerIds?: string;
	/** Allow additional settings fields */
	[key: string]: unknown;
}

// =============================================================================
// Internal: n8n-workflow type duplicates
// =============================================================================

/**
 * Generic value type for data objects
 * Duplicate of n8n-workflow GenericValue
 */
export type GenericValue = string | object | number | boolean | undefined | null;

/**
 * Single connection target in n8n workflow
 * Duplicate of n8n-workflow IConnection
 */
export interface IConnection {
	node: string;
	type: string;
	index: number;
}

/**
 * Array of connections for each output index
 */
export type NodeInputConnections = Array<IConnection[] | null>;

/**
 * Node connections organized by input type
 */
export interface INodeConnections {
	[key: string]: NodeInputConnections;
}

/**
 * All connections in a workflow, organized by source node
 */
export interface IConnections {
	[key: string]: INodeConnections;
}

// =============================================================================
// Internal: Serialization types
// =============================================================================

/**
 * Node JSON representation (for serialization)
 */
export interface NodeJSON {
	id: string;
	name?: string; // Optional - some nodes like sticky notes may not have a name
	type: string;
	typeVersion: number;
	position: [number, number];
	parameters?: IDataObject;
	credentials?: Record<string, { id?: string; name: string }>;
	disabled?: boolean;
	notes?: string;
	notesInFlow?: boolean;
	executeOnce?: boolean;
	retryOnFail?: boolean;
	alwaysOutputData?: boolean;
	onError?: OnError;
}

/**
 * n8n workflow JSON format
 */
export interface WorkflowJSON {
	id?: string;
	name: string;
	nodes: NodeJSON[];
	connections: IConnections;
	settings?: WorkflowSettings;
	pinData?: Record<string, IDataObject[]>;
	meta?: {
		templateId?: string;
		instanceId?: string;
	};
}

// =============================================================================
// Internal: Graph representation
// =============================================================================

/**
 * Connection target in workflow connections
 */
export interface ConnectionTarget {
	node: string;
	type: string;
	index: number;
}

/**
 * Internal graph node representation for workflow builder
 */
export interface GraphNode {
	instance: NodeInstance<string, string, unknown>;
	connections: Map<string, Map<number, ConnectionTarget[]>>;
}

/**
 * Declared connection from a node to a target
 */
export interface DeclaredConnection {
	target: NodeInstance<string, string, unknown> | InputTarget;
	outputIndex: number;
	targetInputIndex?: number;
}

/**
 * Terminal input target marker for connecting to a specific input index.
 * Created by calling .input(n) on a NodeInstance.
 * Cannot be chained further (no .to() method).
 */
export interface InputTarget {
	readonly _isInputTarget: true;
	readonly node: NodeInstance<string, string, unknown>;
	readonly inputIndex: number;
}

/**
 * Output selector for connecting from a specific output index.
 * Created by calling .output(n) on a NodeInstance.
 * Can chain .to() to connect to targets from this specific output.
 */
export interface OutputSelector<TType extends string, TVersion extends string, TOutput = unknown> {
	readonly _isOutputSelector: true;
	readonly node: NodeInstance<TType, TVersion, TOutput>;
	readonly outputIndex: number;

	/**
	 * Connect from this output to a target node.
	 */
	to<T extends NodeInstance<string, string, unknown>>(
		target: T | T[] | InputTarget,
	): NodeChain<NodeInstance<TType, TVersion, TOutput>, T>;
}

// =============================================================================
// Internal: Expression context types (full versions)
// =============================================================================

/**
 * Binary data field properties
 */
export interface BinaryField {
	fileName?: string;
	directory?: string;
	mimeType?: string;
	fileExtension?: string;
	fileSize?: string;
}

/**
 * Binary data context
 */
export type BinaryContext = {
	[fieldName: string]: BinaryField | (() => string[]);
} & {
	keys(): string[];
};

/**
 * Input data context
 */
export interface InputContext {
	first(): IDataObject;
	all(): IDataObject[];
	item: IDataObject;
}

/**
 * Execution context
 */
export interface ExecutionContext {
	id: string;
	mode: 'test' | 'production';
	resumeUrl?: string;
}

/**
 * Workflow metadata context
 */
export interface WorkflowContext {
	id?: string;
	name?: string;
	active: boolean;
}

/**
 * Expression context providing access to n8n runtime data
 */
export interface ExpressionContext {
	json: IDataObject;
	binary: BinaryContext;
	input: InputContext;
	env: IDataObject;
	vars: IDataObject;
	secrets: IDataObject;
	now: Date;
	today: Date;
	itemIndex: number;
	runIndex: number;
	execution: ExecutionContext;
	workflow: WorkflowContext;
}

/**
 * Expression function type
 */
export type Expression<T> = ($: ExpressionContext) => T;

// =============================================================================
// Node configuration (full version with all options)
// =============================================================================

/**
 * Configuration options for creating a node
 */
export interface NodeConfig<TParams = IDataObject> {
	parameters?: TParams;
	credentials?: Record<string, CredentialReference | NewCredentialValue>;
	name?: string;
	position?: [number, number];
	disabled?: boolean;
	notes?: string;
	notesInFlow?: boolean;
	executeOnce?: boolean;
	retryOnFail?: boolean;
	alwaysOutputData?: boolean;
	onError?: OnError;
	pinData?: IDataObject[];
	/**
	 * Declared output shape for data flow validation.
	 * Used by the code builder agent to declare what output a node produces.
	 * Takes priority over pinData for expression path validation.
	 */
	output?: IDataObject[];
	subnodes?: SubnodeConfig;
}

/**
 * Configuration for sticky notes
 */
export interface StickyNoteConfig {
	color?: number;
	position?: [number, number];
	width?: number;
	height?: number;
	name?: string;
}

// =============================================================================
// Subnode configuration
// =============================================================================

/**
 * Subnode configuration for AI nodes
 */
export interface SubnodeConfig {
	model?: LanguageModelInstance | LanguageModelInstance[];
	memory?: MemoryInstance;
	tools?: ToolInstance[];
	outputParser?: OutputParserInstance;
	embedding?: EmbeddingInstance | EmbeddingInstance[];
	/** @deprecated Use 'embedding' instead. Alias for backward compatibility. */
	embeddings?: EmbeddingInstance | EmbeddingInstance[];
	vectorStore?: VectorStoreInstance;
	retriever?: RetrieverInstance;
	documentLoader?: DocumentLoaderInstance | DocumentLoaderInstance[];
	textSplitter?: TextSplitterInstance;
	reranker?: RerankerInstance;
}

// =============================================================================
// Node instances (full version with implementation details)
// =============================================================================

/**
 * Node instance representing a configured node in the workflow
 */
export interface NodeInstance<TType extends string, TVersion extends string, TOutput = unknown> {
	readonly type: TType;
	readonly version: TVersion;
	readonly config: NodeConfig;
	readonly id: string;
	readonly name: string;
	readonly _outputType?: TOutput;

	update(config: Partial<NodeConfig>): NodeInstance<TType, TVersion, TOutput>;

	to<T extends NodeInstance<string, string, unknown>>(
		target: T | T[] | InputTarget,
		outputIndex?: number,
	): NodeChain<NodeInstance<TType, TVersion, TOutput>, T>;

	to<T>(
		target: IfElseBuilder<T>,
		outputIndex?: number,
	): NodeChain<
		NodeInstance<TType, TVersion, TOutput>,
		NodeInstance<'n8n-nodes-base.if', string, T>
	>;

	to<T>(
		target: SwitchCaseBuilder<T>,
		outputIndex?: number,
	): NodeChain<
		NodeInstance<TType, TVersion, TOutput>,
		NodeInstance<'n8n-nodes-base.switch', string, T>
	>;

	to<T>(
		target: SplitInBatchesBuilder<T>,
		outputIndex?: number,
	): NodeChain<NodeInstance<TType, TVersion, TOutput>, NodeInstance<TType, TVersion, TOutput>>;

	/**
	 * Create a terminal input target for connecting to a specific input index.
	 * Use this to connect a node to a specific input of a multi-input node like Merge.
	 *
	 * @example
	 * // Connect to input 1 of a merge node
	 * nodeA.to(mergeNode.input(1))
	 */
	input(index: number): InputTarget;

	/**
	 * Create an output selector for connecting from a specific output index.
	 * Use this for multi-output nodes (like text classifiers) to connect from specific outputs.
	 *
	 * @example
	 * // Connect from output 1 of a classifier
	 * classifier.output(1).to(categoryB)
	 */
	output(index: number): OutputSelector<TType, TVersion, TOutput>;

	/**
	 * Start building an IF branch with the true branch target.
	 * Only available on IF nodes (n8n-nodes-base.if).
	 *
	 * @example
	 * ifNode.onTrue(trueHandler).onFalse(falseHandler)
	 */
	onTrue?(target: IfElseTarget): IfElseBuilder<TOutput>;

	/**
	 * Start building an IF branch with the false branch target.
	 * Only available on IF nodes (n8n-nodes-base.if).
	 *
	 * @example
	 * ifNode.onFalse(falseHandler).onTrue(trueHandler)
	 */
	onFalse?(target: IfElseTarget): IfElseBuilder<TOutput>;

	/**
	 * Start building a Switch case with a case target.
	 * Only available on Switch nodes (n8n-nodes-base.switch).
	 *
	 * @example
	 * switchNode.onCase(0, caseA).onCase(1, caseB)
	 */
	onCase?(index: number, target: SwitchCaseTarget): SwitchCaseBuilder<TOutput>;

	onError<T extends NodeInstance<string, string, unknown>>(handler: T): this;

	getConnections(): DeclaredConnection[];
}

/**
 * Trigger node instance
 */
export interface TriggerInstance<TType extends string, TVersion extends string, TOutput = unknown>
	extends NodeInstance<TType, TVersion, TOutput> {
	readonly isTrigger: true;
}

/**
 * NodeChain with implementation details
 */
export interface NodeChain<
	THead extends NodeInstance<string, string, unknown> = NodeInstance<string, string, unknown>,
	TTail extends NodeInstance<string, string, unknown> = NodeInstance<string, string, unknown>,
> extends NodeInstance<TTail['type'], TTail['version'], TTail['_outputType']> {
	readonly _isChain: true;
	readonly head: THead;
	readonly tail: TTail;
	readonly allNodes: Array<NodeInstance<string, string, unknown>>;

	to<T extends NodeInstance<string, string, unknown>>(
		target: T | T[] | InputTarget,
		outputIndex?: number,
	): NodeChain<THead, T>;

	to<T>(
		target: IfElseBuilder<T>,
		outputIndex?: number,
	): NodeChain<THead, NodeInstance<'n8n-nodes-base.if', string, T>>;

	to<T>(
		target: SwitchCaseBuilder<T>,
		outputIndex?: number,
	): NodeChain<THead, NodeInstance<'n8n-nodes-base.switch', string, T>>;

	to<T>(target: SplitInBatchesBuilder<T>, outputIndex?: number): NodeChain<THead, TTail>;
}

/**
 * Type guard to check if a value is a NodeChain
 */
export function isNodeChain(
	value: unknown,
): value is NodeChain<
	NodeInstance<string, string, unknown>,
	NodeInstance<string, string, unknown>
> {
	if (value === null || typeof value !== 'object') return false;
	if (!('_isChain' in value)) return false;
	// After 'in' check, access the property safely
	const isChainValue = (value as Record<string, unknown>)._isChain;
	return isChainValue === true;
}

/**
 * Type guard to check if a value is a NodeInstance (has type, version, config, to method)
 */
export function isNodeInstance(value: unknown): value is NodeInstance<string, string, unknown> {
	if (value === null || typeof value !== 'object') return false;
	if (!('type' in value && 'version' in value && 'config' in value && 'to' in value)) {
		return false;
	}
	// After 'in' checks, safely access the to property
	const toProp = (value as Record<string, unknown>).to;
	return typeof toProp === 'function';
}

// =============================================================================
// Subnode instance types (with category markers)
// =============================================================================

/**
 * Base interface for subnode instances with a category marker
 */
export interface SubnodeInstance<
	TType extends string,
	TVersion extends string,
	TOutput,
	TSubnodeType extends string,
> extends NodeInstance<TType, TVersion, TOutput> {
	readonly _subnodeType: TSubnodeType;
}

export type LanguageModelInstance<
	TType extends string = string,
	TVersion extends string = string,
	TOutput = unknown,
> = SubnodeInstance<TType, TVersion, TOutput, 'ai_languageModel'>;

export type MemoryInstance<
	TType extends string = string,
	TVersion extends string = string,
	TOutput = unknown,
> = SubnodeInstance<TType, TVersion, TOutput, 'ai_memory'>;

export type ToolInstance<
	TType extends string = string,
	TVersion extends string = string,
	TOutput = unknown,
> = SubnodeInstance<TType, TVersion, TOutput, 'ai_tool'>;

export type OutputParserInstance<
	TType extends string = string,
	TVersion extends string = string,
	TOutput = unknown,
> = SubnodeInstance<TType, TVersion, TOutput, 'ai_outputParser'>;

export type EmbeddingInstance<
	TType extends string = string,
	TVersion extends string = string,
	TOutput = unknown,
> = SubnodeInstance<TType, TVersion, TOutput, 'ai_embedding'>;

export type VectorStoreInstance<
	TType extends string = string,
	TVersion extends string = string,
	TOutput = unknown,
> = SubnodeInstance<TType, TVersion, TOutput, 'ai_vectorStore'>;

export type RetrieverInstance<
	TType extends string = string,
	TVersion extends string = string,
	TOutput = unknown,
> = SubnodeInstance<TType, TVersion, TOutput, 'ai_retriever'>;

export type DocumentLoaderInstance<
	TType extends string = string,
	TVersion extends string = string,
	TOutput = unknown,
> = SubnodeInstance<TType, TVersion, TOutput, 'ai_document'>;

export type TextSplitterInstance<
	TType extends string = string,
	TVersion extends string = string,
	TOutput = unknown,
> = SubnodeInstance<TType, TVersion, TOutput, 'ai_textSplitter'>;

export type RerankerInstance<
	TType extends string = string,
	TVersion extends string = string,
	TOutput = unknown,
> = SubnodeInstance<TType, TVersion, TOutput, 'ai_reranker'>;

// =============================================================================
// Composite types
// =============================================================================

/**
 * Configuration for IF else
 */
export interface IfElseConfig {
	/** Node version (required) */
	version: number;
	/** Node configuration (name, parameters, etc.) */
	config?: NodeConfig;
}

/**
 * IF else composite
 * trueBranch/falseBranch can be:
 * - single NodeInstance: one target
 * - array of NodeInstance: fan-out to multiple parallel targets
 */
export interface IfElseComposite {
	readonly ifNode: NodeInstance<'n8n-nodes-base.if', string, unknown>;
	readonly trueBranch:
		| NodeInstance<string, string, unknown>
		| Array<NodeInstance<string, string, unknown>>;
	readonly falseBranch:
		| NodeInstance<string, string, unknown>
		| Array<NodeInstance<string, string, unknown>>;
}

/**
 * Configuration for Switch case
 */
export interface SwitchCaseConfig {
	/** Node version (required) */
	version: number;
	/** Node configuration (name, parameters, etc.) */
	config?: NodeConfig;
}

/**
 * Switch case composite
 */
export interface SwitchCaseComposite {
	readonly switchNode: NodeInstance<'n8n-nodes-base.switch', string, unknown>;
	/** Cases can be null (no connection), single node, or array (fan-out to multiple parallel nodes) */
	readonly cases: Array<
		NodeInstance<string, string, unknown> | Array<NodeInstance<string, string, unknown>> | null
	>;
}

// =============================================================================
// Fluent API builders for IF and Switch nodes
// =============================================================================

/**
 * Target type for IF else branches - can be a node, chain, null, plain array (fan-out), or nested builder
 */
export type IfElseTarget =
	| null
	| NodeInstance<string, string, unknown>
	| NodeChain<NodeInstance<string, string, unknown>, NodeInstance<string, string, unknown>>
	| Array<
			| NodeInstance<string, string, unknown>
			| NodeChain<NodeInstance<string, string, unknown>, NodeInstance<string, string, unknown>>
	  >
	| IfElseBuilder<unknown>
	| SwitchCaseBuilder<unknown>;

/**
 * Target type for Switch case branches - can be a node, chain, null, plain array (fan-out), or nested builder
 */
export type SwitchCaseTarget =
	| null
	| NodeInstance<string, string, unknown>
	| NodeChain<NodeInstance<string, string, unknown>, NodeInstance<string, string, unknown>>
	| Array<
			| NodeInstance<string, string, unknown>
			| NodeChain<NodeInstance<string, string, unknown>, NodeInstance<string, string, unknown>>
	  >
	| IfElseBuilder<unknown>
	| SwitchCaseBuilder<unknown>;

/**
 * Fluent builder for IF nodes with onTrue/onFalse methods.
 * Created by calling .onTrue() or .onFalse() on an IF node instance.
 *
 * @example
 * ```typescript
 * const ifNode = node({ type: 'n8n-nodes-base.if', version: 2.2, config: {...} });
 * workflow('id', 'Test')
 *   .add(trigger)
 *   .to(ifNode.onTrue(trueHandler).onFalse(falseHandler))
 * ```
 */
export interface IfElseBuilder<TOutput = unknown> {
	/** Marker for workflow-builder detection */
	readonly _isIfElseBuilder: true;
	/** The IF node this builder wraps */
	readonly ifNode: NodeInstance<'n8n-nodes-base.if', string, TOutput>;
	/** The true branch target (set via .onTrue()) */
	readonly trueBranch: IfElseTarget;
	/** The false branch target (set via .onFalse()) */
	readonly falseBranch: IfElseTarget;

	/**
	 * Set the target for the true branch (output 0).
	 * Can be called in any order with onFalse().
	 *
	 * @param target - The node, chain, or array (fan-out) to execute when condition is true
	 */
	onTrue(target: IfElseTarget): IfElseBuilder<TOutput>;

	/**
	 * Set the target for the false branch (output 1).
	 * Can be called in any order with onTrue().
	 *
	 * @param target - The node, chain, or array (fan-out) to execute when condition is false
	 */
	onFalse(target: IfElseTarget): IfElseBuilder<TOutput>;

	/**
	 * Chain a target node after the IF branches.
	 */
	to<T extends NodeInstance<string, string, unknown>>(
		target: T | T[],
		outputIndex?: number,
	): NodeChain<NodeInstance<'n8n-nodes-base.if', string, TOutput>, T>;
}

/**
 * Fluent builder for Switch nodes with onCase method.
 * Created by calling .onCase() on a Switch node instance.
 *
 * @example
 * ```typescript
 * const switchNode = node({ type: 'n8n-nodes-base.switch', version: 3.4, config: {...} });
 * workflow('id', 'Test')
 *   .add(trigger)
 *   .to(switchNode.onCase(0, caseA).onCase(1, caseB).onCase(2, caseC))
 * ```
 */
export interface SwitchCaseBuilder<TOutput = unknown> {
	/** Marker for workflow-builder detection */
	readonly _isSwitchCaseBuilder: true;
	/** The Switch node this builder wraps */
	readonly switchNode: NodeInstance<'n8n-nodes-base.switch', string, TOutput>;
	/** Map from output index to case target */
	readonly caseMapping: Map<number, SwitchCaseTarget>;

	/**
	 * Set the target for a specific case (output index).
	 * Can be called multiple times for different cases.
	 *
	 * @param index - The output index (0-based)
	 * @param target - The node, chain, or array (fan-out) to execute for this case
	 */
	onCase(index: number, target: SwitchCaseTarget): SwitchCaseBuilder<TOutput>;

	/**
	 * Chain a target node after the Switch branches.
	 */
	to<T extends NodeInstance<string, string, unknown>>(
		target: T | T[],
		outputIndex?: number,
	): NodeChain<NodeInstance<'n8n-nodes-base.switch', string, TOutput>, T>;
}

// =============================================================================
// Split in batches
// =============================================================================

/**
 * Configuration for splitInBatches() factory function.
 * Uses { version, config } pattern matching ifElse/merge/switchCase.
 */
export interface SplitInBatchesFactoryConfig {
	/** Node version (required) */
	version: number | string;
	/** Node configuration (name, parameters, etc.) */
	config?: NodeConfig;
}

/**
 * @deprecated Use SplitInBatchesFactoryConfig instead (the { version, config } pattern)
 */
export interface SplitInBatchesConfig extends NodeConfig {
	version?: number | string;
	id?: string;
}

export interface SplitInBatchesBuilder<TOutput = unknown> {
	readonly sibNode: NodeInstance<'n8n-nodes-base.splitInBatches', string, unknown>;

	/**
	 * Fluent API: Set the "each batch" branch target (output 1).
	 * This executes for each batch and can loop back to the SIB node.
	 * Methods can be called in any order.
	 *
	 * @example
	 * splitInBatches(sibNode)
	 *   .onEachBatch(processNode.to(sibNode))
	 *   .onDone(finalizeNode)
	 */
	onEachBatch(
		target:
			| null
			| NodeInstance<string, string, unknown>
			| NodeChain<NodeInstance<string, string, unknown>, NodeInstance<string, string, unknown>>
			| Array<
					| NodeInstance<string, string, unknown>
					| NodeChain<NodeInstance<string, string, unknown>, NodeInstance<string, string, unknown>>
			  >,
	): SplitInBatchesBuilder<TOutput>;

	/**
	 * Fluent API: Set the "done" branch target (output 0).
	 * This executes when all batches are processed.
	 * Methods can be called in any order.
	 *
	 * @example
	 * splitInBatches(sibNode)
	 *   .onDone(finalizeNode)
	 *   .onEachBatch(processNode.to(sibNode))
	 */
	onDone(
		target:
			| null
			| NodeInstance<string, string, unknown>
			| NodeChain<NodeInstance<string, string, unknown>, NodeInstance<string, string, unknown>>
			| Array<
					| NodeInstance<string, string, unknown>
					| NodeChain<NodeInstance<string, string, unknown>, NodeInstance<string, string, unknown>>
			  >,
	): SplitInBatchesBuilder<TOutput>;
}

// =============================================================================
// Workflow builder
// =============================================================================

/**
 * Options for generating pin data from node output declarations
 */
export interface GeneratePinDataOptions {
	/** Only generate for nodes not in this workflow (new nodes) */
	beforeWorkflow?: WorkflowJSON;
}

/**
 * Workflow builder for constructing workflows with a fluent API
 */
export interface WorkflowBuilder {
	readonly id: string;
	readonly name: string;

	add<
		N extends
			| NodeInstance<string, string, unknown>
			| TriggerInstance<string, string, unknown>
			| NodeChain
			| IfElseBuilder<unknown>
			| SwitchCaseBuilder<unknown>,
	>(node: N): WorkflowBuilder;

	to<N extends NodeInstance<string, string, unknown>>(node: N): WorkflowBuilder;
	to(inputTarget: InputTarget): WorkflowBuilder;
	to(ifElse: IfElseComposite): WorkflowBuilder;
	to(switchCase: SwitchCaseComposite): WorkflowBuilder;
	to<T>(splitInBatches: SplitInBatchesBuilder<T>): WorkflowBuilder;
	to<T>(ifElseBuilder: IfElseBuilder<T>): WorkflowBuilder;
	to<T>(switchCaseBuilder: SwitchCaseBuilder<T>): WorkflowBuilder;
	/** Connect to multiple outputs (branching). Each array element connects to incrementing output index. Use null to skip an output. */
	to(nodes: Array<NodeInstance<string, string, unknown> | NodeChain | null>): WorkflowBuilder;

	settings(settings: WorkflowSettings): WorkflowBuilder;

	/**
	 * Create an explicit connection between two nodes with specific output and input indices.
	 * This is useful for patterns where the same source node needs to connect to different
	 * inputs of the same target node (e.g., SplitInBatches outputs to Merge inputs).
	 *
	 * @param source - The source node
	 * @param sourceOutput - The output index of the source node (0-based)
	 * @param target - The target node
	 * @param targetInput - The input index of the target node (0-based)
	 * @returns The workflow builder for chaining
	 *
	 * @example
	 * ```typescript
	 * const sib = node({ type: 'n8n-nodes-base.splitInBatches', ... });
	 * const mergeNode = node({ type: 'n8n-nodes-base.merge', ... });
	 *
	 * workflow('id', 'Test')
	 *   .add(sib)
	 *   .add(mergeNode)
	 *   .connect(sib, 0, mergeNode, 0)  // done → merge input 0
	 *   .connect(sib, 1, mergeNode, 1)  // each → merge input 1
	 *   .connect(mergeNode, 0, sib, 0); // merge → sib
	 * ```
	 */
	connect(
		source: NodeInstance<string, string, unknown>,
		sourceOutput: number,
		target: NodeInstance<string, string, unknown>,
		targetInput: number,
	): WorkflowBuilder;

	getNode(name: string): NodeInstance<string, string, unknown> | undefined;

	/**
	 * Validate the workflow graph structure.
	 * Returns errors and warnings without converting to JSON.
	 */
	validate(options?: ValidationOptions): ValidationResult;

	toJSON(): WorkflowJSON;

	/**
	 * Serialize the workflow to a specific format using registered serializers.
	 * @param format - The format identifier (e.g., 'json')
	 * @returns The serialized workflow in the requested format
	 * @throws Error if no serializer is registered for the format
	 */
	toFormat<T>(format: string): T;

	toString(): string;

	/**
	 * Generate pin data from node output declarations.
	 * Uses the `output` property from each node's config directly as pinData.
	 * Pin data allows running workflows without credentials by providing mock data.
	 *
	 * @param options - Options for filtering which nodes to generate pin data for
	 * @returns The workflow builder for chaining
	 */
	generatePinData(options?: GeneratePinDataOptions): WorkflowBuilder;

	/**
	 * Regenerate all node IDs using deterministic hashing based on workflow ID, node type, and node name.
	 * This ensures that the same workflow structure always produces the same node IDs,
	 * which is critical for the AI workflow builder where code may be re-parsed multiple times.
	 *
	 * Node IDs are generated using SHA-256 hash of `${workflowId}:${nodeType}:${nodeName}`,
	 * formatted as a valid UUID v4 structure.
	 */
	regenerateNodeIds(): void;
}

/**
 * Options for creating a workflow builder
 */
export interface WorkflowBuilderOptions {
	/** Workflow settings */
	settings?: WorkflowSettings;
	/** Plugin registry to use (optional, defaults to global registry) */
	registry?: PluginRegistry;
}

/**
 * Static workflow builder methods
 */
export interface WorkflowBuilderStatic {
	(id: string, name: string, options?: WorkflowSettings | WorkflowBuilderOptions): WorkflowBuilder;
	fromJSON(json: WorkflowJSON): WorkflowBuilder;
}

// =============================================================================
// Factory function types
// =============================================================================

/**
 * Input shape for node factory function
 */
export interface NodeInput<
	TType extends string = string,
	TVersion extends number = number,
	TParams = unknown,
> {
	type: TType;
	version: TVersion;
	config: NodeConfig<TParams>;
	/** Declared output data for data flow validation and pinData generation */
	output?: IDataObject[];
}

/**
 * Input shape for trigger factory function
 */
export interface TriggerInput<
	TType extends string = string,
	TVersion extends number = number,
	TParams = unknown,
> {
	type: TType;
	version: TVersion;
	config: NodeConfig<TParams>;
	/** Declared output data for data flow validation and pinData generation */
	output?: IDataObject[];
}

export type WorkflowFn = WorkflowBuilderStatic;

export type NodeFn = <TNode extends NodeInput>(
	input: TNode,
) => NodeInstance<TNode['type'], `${TNode['version']}`, unknown>;

export type TriggerFn = <TTrigger extends TriggerInput>(
	input: TTrigger,
) => TriggerInstance<TTrigger['type'], `${TTrigger['version']}`, unknown>;

export type StickyFn = (
	content: string,
	nodes?: Array<NodeInstance<string, string, unknown>>,
	config?: StickyNoteConfig,
) => NodeInstance<'n8n-nodes-base.stickyNote', 'v1', void>;

export type PlaceholderFn = (hint: string) => PlaceholderValue;

export type NewCredentialFn = (name: string) => NewCredentialValue;

export type IfElseFn = (
	branches: [
		NodeInstance<string, string, unknown> | null,
		NodeInstance<string, string, unknown> | null,
	],
	config?: IfElseConfig,
) => IfElseComposite;

export type SwitchCaseFn = (
	config?: SwitchCaseConfig,
) => NodeInstance<'n8n-nodes-base.switch', string, unknown>;

export type SplitInBatchesFn = (
	configOrNode:
		| SplitInBatchesFactoryConfig
		| NodeInstance<'n8n-nodes-base.splitInBatches', string, unknown>,
) => SplitInBatchesBuilder<unknown>;

// =============================================================================
// Code helper types
// =============================================================================

/**
 * Code node execution context for runOnceForAllItems
 */
export interface AllItemsContext {
	$input: {
		all(): IDataObject[];
		first(): IDataObject;
		last(): IDataObject;
		itemMatching(index: number): IDataObject;
	};
	$env: IDataObject;
	$vars: IDataObject;
	$secrets: IDataObject;
	$now: Date;
	$today: Date;
	$runIndex: number;
	$execution: ExecutionContext;
	$workflow: WorkflowContext;
	(nodeName: string): { json: IDataObject };
	$jmespath: (data: unknown, expr: string) => unknown;
}

/**
 * Code node execution context for runOnceForEachItem
 */
export interface EachItemContext {
	$input: {
		item: IDataObject;
	};
	$itemIndex: number;
	$env: IDataObject;
	$vars: IDataObject;
	$secrets: IDataObject;
	$now: Date;
	$today: Date;
	$runIndex: number;
	$execution: ExecutionContext;
	$workflow: WorkflowContext;
	(nodeName: string): { json: IDataObject };
	$jmespath: (data: unknown, expr: string) => unknown;
}

/**
 * Code helper result type
 */
export interface CodeResult<T> {
	mode: 'runOnceForAllItems' | 'runOnceForEachItem';
	jsCode: string;
	_outputType?: T;
}

export type RunOnceForAllItemsFn = <T = unknown>(
	fn: (ctx: AllItemsContext) => Array<{ json: T }>,
) => CodeResult<T>;

export type RunOnceForEachItemFn = <T = unknown>(
	fn: (ctx: EachItemContext) => { json: T } | null,
) => CodeResult<T>;

// =============================================================================
// $fromAI types for Tool Nodes
// =============================================================================

/**
 * Valid types for $fromAI parameter values
 */
export type FromAIArgumentType = 'string' | 'number' | 'boolean' | 'json';
