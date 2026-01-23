/**
 * Workflow SDK Types
 *
 * This file re-exports public API types from sdk-api.ts and defines
 * internal implementation types not exposed to the LLM.
 */

// =============================================================================
// Re-export primitive types from sdk-api.ts (types that are truly identical)
// =============================================================================

export type {
	// Data types
	IDataObject,
	// Credentials
	CredentialReference,
	NewCredentialValue,
	// Placeholder
	PlaceholderValue,
	// Error handling
	OnError,
	// Merge mode (simple union)
	MergeMode,
} from './sdk-api';

// Import for internal use
import type {
	IDataObject,
	CredentialReference,
	NewCredentialValue,
	PlaceholderValue,
	OnError,
	MergeMode,
} from './sdk-api';

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
	name: string;
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
	target: NodeInstance<string, string, unknown>;
	outputIndex: number;
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
	subnodes?: SubnodeConfig;
}

/**
 * Configuration for sticky notes (with nodes for wrapping)
 */
export interface StickyNoteConfig {
	color?: number;
	position?: [number, number];
	width?: number;
	height?: number;
	name?: string;
	nodes?: NodeInstance<string, string, unknown>[];
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

	then<T extends NodeInstance<string, string, unknown>>(
		target: T | T[],
		outputIndex?: number,
	): NodeChain<NodeInstance<TType, TVersion, TOutput>, T>;

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
	readonly allNodes: NodeInstance<string, string, unknown>[];

	then<T extends NodeInstance<string, string, unknown>>(
		target: T | T[],
		outputIndex?: number,
	): NodeChain<THead, T>;
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
	return (
		value !== null &&
		typeof value === 'object' &&
		'_isChain' in value &&
		(value as { _isChain: unknown })._isChain === true
	);
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

export interface LanguageModelInstance<
	TType extends string = string,
	TVersion extends string = string,
	TOutput = unknown,
> extends SubnodeInstance<TType, TVersion, TOutput, 'ai_languageModel'> {}

export interface MemoryInstance<
	TType extends string = string,
	TVersion extends string = string,
	TOutput = unknown,
> extends SubnodeInstance<TType, TVersion, TOutput, 'ai_memory'> {}

export interface ToolInstance<
	TType extends string = string,
	TVersion extends string = string,
	TOutput = unknown,
> extends SubnodeInstance<TType, TVersion, TOutput, 'ai_tool'> {}

export interface OutputParserInstance<
	TType extends string = string,
	TVersion extends string = string,
	TOutput = unknown,
> extends SubnodeInstance<TType, TVersion, TOutput, 'ai_outputParser'> {}

export interface EmbeddingInstance<
	TType extends string = string,
	TVersion extends string = string,
	TOutput = unknown,
> extends SubnodeInstance<TType, TVersion, TOutput, 'ai_embedding'> {}

export interface VectorStoreInstance<
	TType extends string = string,
	TVersion extends string = string,
	TOutput = unknown,
> extends SubnodeInstance<TType, TVersion, TOutput, 'ai_vectorStore'> {}

export interface RetrieverInstance<
	TType extends string = string,
	TVersion extends string = string,
	TOutput = unknown,
> extends SubnodeInstance<TType, TVersion, TOutput, 'ai_retriever'> {}

export interface DocumentLoaderInstance<
	TType extends string = string,
	TVersion extends string = string,
	TOutput = unknown,
> extends SubnodeInstance<TType, TVersion, TOutput, 'ai_document'> {}

export interface TextSplitterInstance<
	TType extends string = string,
	TVersion extends string = string,
	TOutput = unknown,
> extends SubnodeInstance<TType, TVersion, TOutput, 'ai_textSplitter'> {}

export interface RerankerInstance<
	TType extends string = string,
	TVersion extends string = string,
	TOutput = unknown,
> extends SubnodeInstance<TType, TVersion, TOutput, 'ai_reranker'> {}

// =============================================================================
// Composite types
// =============================================================================

/**
 * Merge configuration
 */
export interface MergeConfig {
	mode?: MergeMode;
	parameters?: IDataObject;
	version?: number | string;
	name?: string;
	id?: string;
}

/**
 * Merge composite representing parallel branches merging into one node
 */
export interface MergeComposite<TBranches extends unknown[] = unknown[]> {
	readonly mergeNode: NodeInstance<'n8n-nodes-base.merge', string, unknown>;
	readonly branches: TBranches;
	readonly mode: MergeMode;
}

/**
 * Configuration for IF branch
 */
export interface IfBranchConfig extends NodeConfig {
	version?: number | string;
	id?: string;
}

/**
 * IF branch composite
 * trueBranch/falseBranch can be:
 * - single NodeInstance: one target
 * - array of NodeInstance: fan-out to multiple parallel targets
 */
export interface IfBranchComposite {
	readonly ifNode: NodeInstance<'n8n-nodes-base.if', string, unknown>;
	readonly trueBranch:
		| NodeInstance<string, string, unknown>
		| NodeInstance<string, string, unknown>[];
	readonly falseBranch:
		| NodeInstance<string, string, unknown>
		| NodeInstance<string, string, unknown>[];
}

/**
 * Configuration for Switch case
 */
export interface SwitchCaseConfig extends NodeConfig {
	version?: number | string;
	id?: string;
}

/**
 * Switch case composite
 */
export interface SwitchCaseComposite {
	readonly switchNode: NodeInstance<'n8n-nodes-base.switch', string, unknown>;
	readonly cases: NodeInstance<string, string, unknown>[];
}

// =============================================================================
// Split in batches
// =============================================================================

/**
 * Configuration for Split in Batches
 */
export interface SplitInBatchesConfig extends NodeConfig {
	version?: number | string;
	id?: string;
}

export interface SplitInBatchesBuilder<TOutput = unknown> {
	readonly sibNode: NodeInstance<'n8n-nodes-base.splitInBatches', string, unknown>;
	done(): SplitInBatchesDoneChain<TOutput>;
	each(): SplitInBatchesEachChain<TOutput>;
}

export interface SplitInBatchesDoneChain<_TOutput> {
	then<N extends NodeInstance<string, string, unknown>>(
		nodeOrNodes: N | N[],
	): SplitInBatchesDoneChain<N extends NodeInstance<string, string, infer O> ? O : unknown>;
	each(): SplitInBatchesEachChain<unknown>;
}

export interface SplitInBatchesEachChain<TOutput> {
	then<N extends NodeInstance<string, string, unknown>>(
		nodeOrNodes: N | N[],
	): SplitInBatchesEachChain<N extends NodeInstance<string, string, infer O> ? O : unknown>;
	loop(): SplitInBatchesBuilder<TOutput>;
}

// =============================================================================
// Workflow builder
// =============================================================================

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
			| NodeChain,
	>(node: N): WorkflowBuilder;

	then<N extends NodeInstance<string, string, unknown>>(node: N): WorkflowBuilder;
	then<M extends MergeComposite>(merge: M): WorkflowBuilder;
	then(ifBranch: IfBranchComposite): WorkflowBuilder;
	then(switchCase: SwitchCaseComposite): WorkflowBuilder;
	then<T>(splitInBatches: SplitInBatchesBuilder<T>): WorkflowBuilder;

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

	toJSON(): WorkflowJSON;

	toString(): string;
}

/**
 * Static workflow builder methods
 */
export interface WorkflowBuilderStatic {
	(id: string, name: string, settings?: WorkflowSettings): WorkflowBuilder;
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
	config?: StickyNoteConfig,
) => NodeInstance<'n8n-nodes-base.stickyNote', 'v1', void>;

export type PlaceholderFn = (hint: string) => PlaceholderValue;

export type NewCredentialFn = (name: string) => NewCredentialValue;

export type MergeFn = <TBranches extends NodeInstance<string, string, unknown>[]>(
	branches: TBranches,
	config?: MergeConfig,
) => MergeComposite<TBranches>;

export type IfBranchFn = (
	branches: [
		NodeInstance<string, string, unknown> | null,
		NodeInstance<string, string, unknown> | null,
	],
	config?: IfBranchConfig,
) => IfBranchComposite;

export type SwitchCaseFn = (
	cases: NodeInstance<string, string, unknown>[],
	config?: SwitchCaseConfig,
) => SwitchCaseComposite;

export type SplitInBatchesFn = (config?: SplitInBatchesConfig) => SplitInBatchesBuilder<unknown>;

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

/**
 * Context provided to tool() config callbacks.
 * Use $.fromAI() to create AI-driven parameter values.
 */
export interface ToolConfigContext {
	/**
	 * Create a $fromAI placeholder for AI-driven parameter values.
	 * The AI agent will determine the actual value at runtime.
	 */
	fromAI(
		key: string,
		description?: string,
		type?: FromAIArgumentType,
		defaultValue?: string | number | boolean | object,
	): string;
}

/**
 * Tool configuration - can be a static NodeConfig or a callback receiving ToolConfigContext.
 */
export type ToolConfigInput<TParams = IDataObject> =
	| NodeConfig<TParams>
	| (($: ToolConfigContext) => NodeConfig<TParams>);

/**
 * Input for tool() factory with config callback support for $fromAI.
 */
export interface ToolInput<
	TType extends string = string,
	TVersion extends number = number,
	TParams = unknown,
> {
	type: TType;
	version: TVersion;
	config: ToolConfigInput<TParams>;
}
