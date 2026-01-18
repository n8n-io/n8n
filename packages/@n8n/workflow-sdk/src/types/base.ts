// =============================================================================
// Duplicates from n8n-workflow (to avoid external dependency in SDK types)
// =============================================================================

/**
 * Generic value type for data objects
 * Duplicate of n8n-workflow GenericValue
 */
export type GenericValue = string | object | number | boolean | undefined | null;

/**
 * Generic data object with string keys
 * Duplicate of n8n-workflow IDataObject
 */
export interface IDataObject {
	[key: string]: GenericValue | IDataObject | GenericValue[] | IDataObject[];
}

/**
 * Single connection target in n8n workflow
 * Duplicate of n8n-workflow IConnection
 */
export interface IConnection {
	/** The node the connection is to */
	node: string;
	/** The type of the input on destination node (e.g., "main", "ai_tool") */
	type: string;
	/** The output/input-index of destination node */
	index: number;
}

/**
 * Array of connections for each output index
 * Duplicate of n8n-workflow NodeInputConnections
 */
export type NodeInputConnections = Array<IConnection[] | null>;

/**
 * Node connections organized by input type
 * Duplicate of n8n-workflow INodeConnections
 */
export interface INodeConnections {
	/** Input name -> connections */
	[key: string]: NodeInputConnections;
}

/**
 * All connections in a workflow, organized by source node
 * Duplicate of n8n-workflow IConnections
 */
export interface IConnections {
	/** Node name -> node connections */
	[key: string]: INodeConnections;
}

// =============================================================================
// SDK Types
// =============================================================================

/**
 * Workflow settings configuration
 */
export interface WorkflowSettings {
	/** Timezone for the workflow (e.g., 'America/New_York') */
	timezone?: string;
	/** ID of the error handling workflow */
	errorWorkflow?: string;
	/** When to save data from error executions */
	saveDataErrorExecution?: 'all' | 'none';
	/** When to save data from successful executions */
	saveDataSuccessExecution?: 'all' | 'none';
	/** Whether to save manual execution data */
	saveManualExecutions?: boolean;
	/** Whether to save execution progress */
	saveExecutionProgress?: boolean;
	/** Execution timeout in seconds */
	executionTimeout?: number;
	/** Execution order version */
	executionOrder?: 'v0' | 'v1';
	/** Who can call this workflow */
	callerPolicy?: 'any' | 'none' | 'workflowsFromAList' | 'workflowsFromSameOwner';
	/** Comma-separated list of caller workflow IDs */
	callerIds?: string;
	/** Allow additional settings fields */
	[key: string]: unknown;
}

/**
 * Reference to stored credentials
 */
export interface CredentialReference {
	/** Display name of the credential */
	name: string;
	/** Unique ID of the credential */
	id: string;
}

/**
 * Error handling behavior for nodes
 */
export type OnError = 'stopWorkflow' | 'continueRegularOutput' | 'continueErrorOutput';

/**
 * Subnode configuration for AI nodes.
 * Uses typed subnode instances for type safety.
 */
export interface SubnodeConfig {
	/** Language model subnode (ai_languageModel connection type) */
	model?: LanguageModelInstance;
	/** Memory subnode (ai_memory connection type) */
	memory?: MemoryInstance;
	/** Tool subnodes (ai_tool connection type) */
	tools?: ToolInstance[];
	/** Output parser subnode (ai_outputParser connection type) */
	outputParser?: OutputParserInstance;
	/** Embedding subnode (ai_embedding connection type) */
	embedding?: EmbeddingInstance;
	/** Vector store subnode (ai_vectorStore connection type) */
	vectorStore?: VectorStoreInstance;
	/** Retriever subnode (ai_retriever connection type) */
	retriever?: RetrieverInstance;
	/** Document loader subnode (ai_document connection type) */
	documentLoader?: DocumentLoaderInstance;
	/** Text splitter subnode (ai_textSplitter connection type) */
	textSplitter?: TextSplitterInstance;
}

/**
 * Configuration options for creating a node
 */
export interface NodeConfig<TParams = IDataObject> {
	/** Node-specific parameters */
	parameters?: TParams;
	/** Credential references keyed by credential type */
	credentials?: Record<string, CredentialReference>;
	/** Custom node name (auto-generated if omitted) */
	name?: string;
	/** Canvas position [x, y] */
	position?: [number, number];
	/** Whether the node is disabled */
	disabled?: boolean;
	/** Documentation notes for the node */
	notes?: string;
	/** Whether to show notes on the canvas */
	notesInFlow?: boolean;
	/** Execute only once (not per item) */
	executeOnce?: boolean;
	/** Retry on failure */
	retryOnFail?: boolean;
	/** Always output data even if empty */
	alwaysOutputData?: boolean;
	/** Error handling behavior */
	onError?: OnError;
	/** Pinned output data for testing */
	pinData?: IDataObject[];
	/** Subnodes for AI agent nodes (model, memory, tools, outputParser) */
	subnodes?: SubnodeConfig;
}

/**
 * Configuration for sticky notes
 */
export interface StickyNoteConfig {
	/** Color index (1-7) */
	color?: number;
	/** Canvas position [x, y] */
	position?: [number, number];
	/** Width in pixels */
	width?: number;
	/** Height in pixels */
	height?: number;
	/** Custom name for the sticky note */
	name?: string;
	/** Nodes to wrap (auto-positions sticky note around them) */
	nodes?: NodeInstance<string, string, unknown>[];
}

/**
 * Expression context providing access to n8n runtime data
 */
export interface ExpressionContext {
	/** Current item's JSON data */
	json: IDataObject;
	/** Current item's binary data */
	binary: BinaryContext;
	/** Input data access */
	input: InputContext;
	/** Environment variables */
	env: IDataObject;
	/** Workflow variables */
	vars: IDataObject;
	/** External secrets */
	secrets: IDataObject;
	/** Current DateTime */
	now: Date;
	/** Start of today */
	today: Date;
	/** Current item index */
	itemIndex: number;
	/** Current run index */
	runIndex: number;
	/** Execution context */
	execution: ExecutionContext;
	/** Workflow metadata */
	workflow: WorkflowContext;
}

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
 * Binary data context - provides access to binary data fields
 * Access fields via bracket notation: binary[fieldName]
 * Get all field names via keys() method
 */
export type BinaryContext = {
	[fieldName: string]: BinaryField | (() => string[]);
} & {
	/** Get keys of all binary fields */
	keys(): string[];
};

/**
 * Input data context
 */
export interface InputContext {
	/** Get first input item */
	first(): IDataObject;
	/** Get all input items */
	all(): IDataObject[];
	/** Current input item */
	item: IDataObject;
}

/**
 * Execution context
 */
export interface ExecutionContext {
	/** Execution ID */
	id: string;
	/** Execution mode */
	mode: 'test' | 'production';
	/** Resume URL for wait nodes */
	resumeUrl?: string;
}

/**
 * Workflow metadata context
 */
export interface WorkflowContext {
	/** Workflow ID */
	id?: string;
	/** Workflow name */
	name?: string;
	/** Whether workflow is active */
	active: boolean;
}

/**
 * Expression function type
 */
export type Expression<T> = ($: ExpressionContext) => T;

/**
 * Node instance representing a configured node in the workflow
 */
export interface NodeInstance<TType extends string, TVersion extends string, TOutput = unknown> {
	/** Node type (e.g., 'n8n-nodes-base.httpRequest') */
	readonly type: TType;
	/** Node version (e.g., 'v4.2') */
	readonly version: TVersion;
	/** Resolved node configuration */
	readonly config: NodeConfig;
	/** Internal unique ID */
	readonly id: string;
	/** Node name */
	readonly name: string;
	/** Output type marker (for type inference) */
	readonly _outputType?: TOutput;

	/**
	 * Update node configuration
	 */
	update(config: Partial<NodeConfig>): NodeInstance<TType, TVersion, TOutput>;
}

/**
 * Trigger node instance
 */
export interface TriggerInstance<TType extends string, TVersion extends string, TOutput = unknown>
	extends NodeInstance<TType, TVersion, TOutput> {
	/** Marker indicating this is a trigger node */
	readonly isTrigger: true;
}

// =============================================================================
// Subnode Instance Types (for AI/LangChain nodes)
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
	/** Marker indicating the subnode category */
	readonly _subnodeType: TSubnodeType;
}

/**
 * Language model subnode instance (ai_languageModel)
 */
export interface LanguageModelInstance<
	TType extends string = string,
	TVersion extends string = string,
	TOutput = unknown,
> extends SubnodeInstance<TType, TVersion, TOutput, 'ai_languageModel'> {}

/**
 * Memory subnode instance (ai_memory)
 */
export interface MemoryInstance<
	TType extends string = string,
	TVersion extends string = string,
	TOutput = unknown,
> extends SubnodeInstance<TType, TVersion, TOutput, 'ai_memory'> {}

/**
 * Tool subnode instance (ai_tool)
 */
export interface ToolInstance<
	TType extends string = string,
	TVersion extends string = string,
	TOutput = unknown,
> extends SubnodeInstance<TType, TVersion, TOutput, 'ai_tool'> {}

/**
 * Output parser subnode instance (ai_outputParser)
 */
export interface OutputParserInstance<
	TType extends string = string,
	TVersion extends string = string,
	TOutput = unknown,
> extends SubnodeInstance<TType, TVersion, TOutput, 'ai_outputParser'> {}

/**
 * Embedding subnode instance (ai_embedding)
 */
export interface EmbeddingInstance<
	TType extends string = string,
	TVersion extends string = string,
	TOutput = unknown,
> extends SubnodeInstance<TType, TVersion, TOutput, 'ai_embedding'> {}

/**
 * Vector store subnode instance (ai_vectorStore)
 */
export interface VectorStoreInstance<
	TType extends string = string,
	TVersion extends string = string,
	TOutput = unknown,
> extends SubnodeInstance<TType, TVersion, TOutput, 'ai_vectorStore'> {}

/**
 * Retriever subnode instance (ai_retriever)
 */
export interface RetrieverInstance<
	TType extends string = string,
	TVersion extends string = string,
	TOutput = unknown,
> extends SubnodeInstance<TType, TVersion, TOutput, 'ai_retriever'> {}

/**
 * Document loader subnode instance (ai_document)
 */
export interface DocumentLoaderInstance<
	TType extends string = string,
	TVersion extends string = string,
	TOutput = unknown,
> extends SubnodeInstance<TType, TVersion, TOutput, 'ai_document'> {}

/**
 * Text splitter subnode instance (ai_textSplitter)
 */
export interface TextSplitterInstance<
	TType extends string = string,
	TVersion extends string = string,
	TOutput = unknown,
> extends SubnodeInstance<TType, TVersion, TOutput, 'ai_textSplitter'> {}

/**
 * Merge composite representing parallel branches merging into one node
 */
export interface MergeComposite<TBranches extends unknown[] = unknown[]> {
	/** The merge node */
	readonly mergeNode: NodeInstance<'n8n-nodes-base.merge', string, unknown>;
	/** Branches feeding into the merge */
	readonly branches: TBranches;
	/** Merge mode */
	readonly mode: MergeMode;
}

/**
 * Merge mode options
 */
export type MergeMode = 'append' | 'combine' | 'multiplex' | 'chooseBranch';

/**
 * Merge configuration
 */
export interface MergeConfig {
	/** Merge mode */
	mode?: MergeMode;
	/** Additional merge node parameters */
	parameters?: IDataObject;
}

/**
 * Split in batches builder for loop constructs
 */
export interface SplitInBatchesBuilder<TOutput = unknown> {
	/** Chain from output 0 (all items processed) */
	done(): SplitInBatchesDoneChain<TOutput>;
	/** Chain from output 1 (current batch) */
	each(): SplitInBatchesEachChain<TOutput>;
}

/**
 * Chain after .done() for finalization
 */
export interface SplitInBatchesDoneChain<_TOutput> {
	then<N extends NodeInstance<string, string, unknown>>(
		node: N,
	): SplitInBatchesDoneChain<N extends NodeInstance<string, string, infer O> ? O : unknown>;
	/** Chain to .each() from the done chain */
	each(): SplitInBatchesEachChain<unknown>;
}

/**
 * Chain after .each() for batch processing
 */
export interface SplitInBatchesEachChain<TOutput> {
	then<N extends NodeInstance<string, string, unknown>>(
		node: N,
	): SplitInBatchesEachChain<N extends NodeInstance<string, string, infer O> ? O : unknown>;
	/** Connect back to the split in batches node and return the builder */
	loop(): SplitInBatchesBuilder<TOutput>;
}

/**
 * Branch selector for multi-output nodes
 */
export interface OutputSelector<TWorkflow extends WorkflowBuilder> {
	/** Chain from this output */
	then<N extends NodeInstance<string, string, unknown>>(node: N): TWorkflow;
}

/**
 * Workflow builder for constructing workflows with a fluent API
 */
export interface WorkflowBuilder {
	/** Workflow ID */
	readonly id: string;
	/** Workflow name */
	readonly name: string;

	/**
	 * Add a node to the workflow (typically the trigger)
	 */
	add<N extends NodeInstance<string, string, unknown> | TriggerInstance<string, string, unknown>>(
		node: N,
	): WorkflowBuilder;

	/**
	 * Chain a node after the current node
	 */
	then<N extends NodeInstance<string, string, unknown>>(node: N): WorkflowBuilder;

	/**
	 * Chain a merge composite (fans out to branches)
	 */
	then<M extends MergeComposite>(merge: M): WorkflowBuilder;

	/**
	 * Select an output branch by index
	 */
	output(index: number): OutputSelector<WorkflowBuilder>;

	/**
	 * Update workflow settings
	 */
	settings(settings: WorkflowSettings): WorkflowBuilder;

	/**
	 * Get a node by name
	 */
	getNode(name: string): NodeInstance<string, string, unknown> | undefined;

	/**
	 * Export to n8n JSON format
	 */
	toJSON(): WorkflowJSON;

	/**
	 * Serialize to JSON string
	 */
	toString(): string;
}

/**
 * Static workflow builder methods
 */
export interface WorkflowBuilderStatic {
	/**
	 * Create a new workflow
	 */
	(id: string, name: string, settings?: WorkflowSettings): WorkflowBuilder;

	/**
	 * Import from n8n JSON format
	 */
	fromJSON(json: WorkflowJSON): WorkflowBuilder;
}

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
 * Connection target in workflow connections
 */
export interface ConnectionTarget {
	/** Target node name */
	node: string;
	/** Connection type (main, ai_tool, ai_memory, ai_languageModel, etc.) */
	type: string;
	/** Input index on the target node */
	index: number;
}

/**
 * Internal graph node representation for workflow builder
 */
export interface GraphNode {
	instance: NodeInstance<string, string, unknown>;
	// connectionType -> outputIndex -> targets
	connections: Map<string, Map<number, ConnectionTarget[]>>;
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

/**
 * Placeholder marker for template parameters
 */
export interface PlaceholderValue {
	readonly __placeholder: true;
	readonly hint: string;
}

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

// =============================================================================
// Factory Function Types
// =============================================================================

/**
 * Creates a workflow builder
 *
 * @example
 * ```typescript
 * const wf = workflow('my-id', 'My Workflow', { timezone: 'UTC' })
 *   .add(trigger(...))
 *   .then(node(...));
 *
 * // Import existing workflow
 * const imported = workflow.fromJSON(existingJson);
 * ```
 */
export type WorkflowFn = WorkflowBuilderStatic;

/**
 * Input shape for node factory function (object signature)
 * Matches the generated node type structure (e.g., LcAgentV31Node)
 */
export interface NodeInput<
	TType extends string = string,
	TVersion extends number = number,
	TParams = unknown,
> {
	/** Node type (e.g., 'n8n-nodes-base.httpRequest') */
	type: TType;
	/** Node version (e.g., 4.2) */
	version: TVersion;
	/** Node configuration */
	config: NodeConfig<TParams>;
}

/**
 * Input shape for trigger factory function (object signature)
 */
export interface TriggerInput<
	TType extends string = string,
	TVersion extends number = number,
	TParams = unknown,
> {
	/** Trigger type (e.g., 'n8n-nodes-base.scheduleTrigger') */
	type: TType;
	/** Trigger version (e.g., 1.1) */
	version: TVersion;
	/** Trigger configuration */
	config: NodeConfig<TParams>;
}

/**
 * Creates a node instance
 *
 * For type-safe usage, use with generated node types from './types/generated'.
 * The AllNodeTypes union provides autocomplete for all known node types.
 *
 * @example
 * ```typescript
 * import { node, trigger } from '@n8n/workflow-sdk';
 * import type { AllNodeTypes, LcAgentV31Node } from '@n8n/workflow-sdk';
 *
 * // Type-safe with AllNodeTypes constraint
 * const agent = node({
 *   type: '@n8n/n8n-nodes-langchain.agent',
 *   version: 3.1,
 *   config: { parameters: { promptType: 'auto', text: 'Hello' } }
 * } satisfies AllNodeTypes);
 *
 * // Or with specific node type
 * const agent = node({
 *   type: '@n8n/n8n-nodes-langchain.agent',
 *   version: 3.1,
 *   config: { parameters: { promptType: 'auto', text: 'Hello' } }
 * } satisfies LcAgentV31Node);
 *
 * // Generic usage (no type checking on parameters)
 * const httpNode = node({
 *   type: 'n8n-nodes-base.httpRequest',
 *   version: 4.2,
 *   config: { parameters: { url: 'https://api.example.com' } }
 * });
 * ```
 */
export type NodeFn = <TNode extends NodeInput>(
	input: TNode,
) => NodeInstance<TNode['type'], `${TNode['version']}`, unknown>;

/**
 * Creates a trigger node instance
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
export type TriggerFn = <TTrigger extends TriggerInput>(
	input: TTrigger,
) => TriggerInstance<TTrigger['type'], `${TTrigger['version']}`, unknown>;

/**
 * Creates a sticky note for workflow documentation
 *
 * @example
 * ```typescript
 * const note = sticky('## API Integration', { color: 4, position: [80, -176] });
 * ```
 */
export type StickyFn = (
	content: string,
	config?: StickyNoteConfig,
) => NodeInstance<'n8n-nodes-base.stickyNote', 'v1', void>;

/**
 * Creates a placeholder value for template parameters
 *
 * @example
 * ```typescript
 * const slackNode = node('n8n-nodes-base.slack', 'v2.2', {
 *   parameters: { channel: placeholder('Enter Channel') }
 * });
 * ```
 */
export type PlaceholderFn = (hint: string) => PlaceholderValue;

/**
 * Creates a merge composite for parallel branch execution
 *
 * @example
 * ```typescript
 * workflow('id', 'Test')
 *   .add(trigger(...))
 *   .then(merge([api1, api2, api3], { mode: 'combine' }))
 *   .then(processResults);
 * ```
 */
export type MergeFn = <TBranches extends NodeInstance<string, string, unknown>[]>(
	branches: TBranches,
	config?: MergeConfig,
) => MergeComposite<TBranches>;

/**
 * Creates a split in batches builder for processing items in chunks
 *
 * @example
 * ```typescript
 * workflow('id', 'Test')
 *   .add(trigger(...))
 *   .then(
 *     splitInBatches('v3', { parameters: { batchSize: 10 } })
 *       .done().then(finalizeNode)
 *       .each().then(processNode).loop()
 *   );
 * ```
 */
export type SplitInBatchesFn = (
	version: string,
	config?: NodeConfig,
) => SplitInBatchesBuilder<unknown>;

/**
 * Creates a code helper for executing once with access to all items
 *
 * @example
 * ```typescript
 * node('n8n-nodes-base.code', 'v2', {
 *   parameters: {
 *     ...runOnceForAllItems<{ sum: number }>((ctx) => {
 *       const total = ctx.$input.all().reduce((acc, i) => acc + i.json.value, 0);
 *       return [{ json: { sum: total } }];
 *     })
 *   }
 * });
 * ```
 */
export type RunOnceForAllItemsFn = <T = unknown>(
	fn: (ctx: AllItemsContext) => Array<{ json: T }>,
) => CodeResult<T>;

/**
 * Creates a code helper for executing once per item
 *
 * @example
 * ```typescript
 * node('n8n-nodes-base.code', 'v2', {
 *   parameters: {
 *     ...runOnceForEachItem<{ doubled: number }>((ctx) => {
 *       return { json: { doubled: ctx.$input.item.json.value * 2 } };
 *     })
 *   }
 * });
 * ```
 */
export type RunOnceForEachItemFn = <T = unknown>(
	fn: (ctx: EachItemContext) => { json: T } | null,
) => CodeResult<T>;

// =============================================================================
// Type Helpers for Generated Node Types
// =============================================================================

/**
 * Extract parameter types from a node type
 *
 * @example
 * ```typescript
 * import type { CodeNode, ExtractNodeParams } from '@n8n/workflow-sdk';
 * type CodeParams = ExtractNodeParams<CodeNode>; // CodeV2Params
 * ```
 */
export type ExtractNodeParams<T> = T extends NodeInput<string, number, infer P> ? P : never;

/**
 * Extract credential types from a node type
 *
 * @example
 * ```typescript
 * import type { HttpRequestNode, ExtractNodeCredentials } from '@n8n/workflow-sdk';
 * type HttpCreds = ExtractNodeCredentials<HttpRequestNode>;
 * ```
 */
export type ExtractNodeCredentials<T> = T extends { credentials?: infer C } ? C : never;

/**
 * Extract version from a node type
 *
 * @example
 * ```typescript
 * import type { CodeNode, ExtractNodeVersion } from '@n8n/workflow-sdk';
 * type CodeVersion = ExtractNodeVersion<CodeNode>; // 1 | 2
 * ```
 */
export type ExtractNodeVersion<T> = T extends NodeInput<string, infer V, unknown> ? V : never;
