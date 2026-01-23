/**
 * Workflow SDK API Reference
 *
 * This file contains the complete TypeScript API for building n8n workflows.
 * Use the factory functions (workflow, node, trigger, etc.) to build workflows.
 *
 * The SDK handles all internal complexity (connections, node IDs, positioning)
 * automatically - just chain nodes with .then() and the SDK does the rest.
 */

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

// =============================================================================
// Workflow Configuration
// =============================================================================

/**
 * Workflow-level settings
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
}

// =============================================================================
// Credentials
// =============================================================================

/**
 * Reference to existing credentials
 */
export interface CredentialReference {
	/** Display name of the credential */
	name: string;
	/** Unique ID of the credential */
	id: string;
}

/**
 * Marker for new credentials that need to be created.
 * Use newCredential('name') to create this.
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
 * Use placeholder('description') to create this.
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
// AI/LangChain Subnode Types
// =============================================================================

/**
 * Configuration for AI node subnodes.
 * Subnodes connect to special AI input ports (ai_languageModel, ai_memory, etc.)
 */
export interface SubnodeConfig {
	/** Language model subnode(s) - single or array for modelSelector */
	model?: LanguageModelInstance | LanguageModelInstance[];
	/** Memory subnode for conversation history */
	memory?: MemoryInstance;
	/** Tool subnodes for agent capabilities */
	tools?: ToolInstance[];
	/** Output parser subnode */
	outputParser?: OutputParserInstance;
	/** Embedding subnode(s) */
	embedding?: EmbeddingInstance | EmbeddingInstance[];
	/** Vector store subnode */
	vectorStore?: VectorStoreInstance;
	/** Retriever subnode */
	retriever?: RetrieverInstance;
	/** Document loader subnode(s) */
	documentLoader?: DocumentLoaderInstance | DocumentLoaderInstance[];
	/** Text splitter subnode */
	textSplitter?: TextSplitterInstance;
}

/** Language model subnode (ai_languageModel) */
export interface LanguageModelInstance<
	TType extends string = string,
	TVersion extends string = string,
	TOutput = unknown,
> extends NodeInstance<TType, TVersion, TOutput> {}

/** Memory subnode (ai_memory) */
export interface MemoryInstance<
	TType extends string = string,
	TVersion extends string = string,
	TOutput = unknown,
> extends NodeInstance<TType, TVersion, TOutput> {}

/** Tool subnode (ai_tool) */
export interface ToolInstance<
	TType extends string = string,
	TVersion extends string = string,
	TOutput = unknown,
> extends NodeInstance<TType, TVersion, TOutput> {}

/** Output parser subnode (ai_outputParser) */
export interface OutputParserInstance<
	TType extends string = string,
	TVersion extends string = string,
	TOutput = unknown,
> extends NodeInstance<TType, TVersion, TOutput> {}

/** Embedding subnode (ai_embedding) */
export interface EmbeddingInstance<
	TType extends string = string,
	TVersion extends string = string,
	TOutput = unknown,
> extends NodeInstance<TType, TVersion, TOutput> {}

/** Vector store subnode (ai_vectorStore) */
export interface VectorStoreInstance<
	TType extends string = string,
	TVersion extends string = string,
	TOutput = unknown,
> extends NodeInstance<TType, TVersion, TOutput> {}

/** Retriever subnode (ai_retriever) */
export interface RetrieverInstance<
	TType extends string = string,
	TVersion extends string = string,
	TOutput = unknown,
> extends NodeInstance<TType, TVersion, TOutput> {}

/** Document loader subnode (ai_document) */
export interface DocumentLoaderInstance<
	TType extends string = string,
	TVersion extends string = string,
	TOutput = unknown,
> extends NodeInstance<TType, TVersion, TOutput> {}

/** Text splitter subnode (ai_textSplitter) */
export interface TextSplitterInstance<
	TType extends string = string,
	TVersion extends string = string,
	TOutput = unknown,
> extends NodeInstance<TType, TVersion, TOutput> {}

// =============================================================================
// Node Configuration
// =============================================================================

/**
 * Configuration for creating a node.
 * Only 'parameters' is typically needed - other options are for advanced use.
 */
export interface NodeConfig<TParams = IDataObject, TOutput = IDataObject> {
	/** Node-specific parameters - the main configuration */
	parameters?: TParams;
	/** Credentials keyed by type. Use newCredential() for new ones. */
	credentials?: Record<string, CredentialReference | NewCredentialValue>;
	/** Custom node name (auto-generated if omitted) */
	name?: string;
	/** Canvas position [x, y] (auto-positioned if omitted) */
	position?: [number, number];
	/** Whether the node is disabled */
	disabled?: boolean;
	/** Documentation notes */
	notes?: string;
	/** Show notes on canvas */
	notesInFlow?: boolean;
	/** Execute only once (not per item) */
	executeOnce?: boolean;
	/** Retry on failure */
	retryOnFail?: boolean;
	/** Always output data even if empty */
	alwaysOutputData?: boolean;
	/** Error handling behavior */
	onError?: OnError;
	/** Pinned output data for testing - typed based on node's TOutput */
	pinData?: TOutput[];
	/** Subnodes for AI nodes (model, memory, tools, etc.) */
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
	/** Custom name */
	name?: string;
}

// =============================================================================
// Node Instances
// =============================================================================

/**
 * A configured node instance.
 * Chain nodes together using .then() to connect them.
 */
export interface NodeInstance<
	TType extends string = string,
	TVersion extends string = string,
	TOutput = unknown,
> {
	/** Node type (e.g., 'n8n-nodes-base.httpRequest') */
	readonly type: TType;
	/** Node version */
	readonly version: TVersion;
	/** Node name */
	readonly name: string;
	/** Marker property for output type inference */
	readonly _outputType?: TOutput;

	/**
	 * Connect this node to another node.
	 * Returns a chain for further connections.
	 *
	 * @example
	 * trigger({ ... })
	 *   .then(node({ ... }))  // Connect trigger to first node
	 *   .then(node({ ... })); // Connect first node to second
	 */
	then<T extends NodeInstance<string, string, unknown>>(
		target: T,
		outputIndex?: number,
	): NodeChain<NodeInstance<TType, TVersion, TOutput>, T>;

	/**
	 * Connect this node's error output to an error handler.
	 * Only works when node has onError: 'continueErrorOutput'.
	 *
	 * @example
	 * node({
	 *   type: 'n8n-nodes-base.httpRequest',
	 *   config: { onError: 'continueErrorOutput' }
	 * }).onError(errorHandlerNode);
	 */
	onError<T extends NodeInstance<string, string, unknown>>(handler: T): this;
}

/**
 * A trigger node instance.
 * Every workflow needs at least one trigger.
 */
export interface TriggerInstance<
	TType extends string = string,
	TVersion extends string = string,
	TOutput = unknown,
> extends NodeInstance<TType, TVersion, TOutput> {
	readonly isTrigger: true;
}

/**
 * A chain of connected nodes.
 * Created when you call .then() on a node.
 * Can be added to a workflow with .add().
 */
export interface NodeChain<
	THead extends NodeInstance<string, string, unknown> = NodeInstance,
	TTail extends NodeInstance<string, string, unknown> = NodeInstance,
> extends NodeInstance<TTail['type'], TTail['version'], unknown> {
	/** The first node in the chain */
	readonly head: THead;
	/** The last node in the chain */
	readonly tail: TTail;

	/**
	 * Continue the chain by connecting to another node.
	 */
	then<T extends NodeInstance<string, string, unknown>>(
		target: T,
		outputIndex?: number,
	): NodeChain<THead, T>;
}

// =============================================================================
// Composite Patterns
// =============================================================================

/**
 * Merge mode options
 */
export type MergeMode = 'append' | 'combine' | 'multiplex' | 'chooseBranch';

/**
 * Configuration for merge()
 */
export interface MergeConfig {
	/** Merge mode */
	mode?: MergeMode;
	/** Additional merge node parameters */
	parameters?: IDataObject;
	/** Node version (defaults to 3) */
	version?: number | string;
	/** Custom node name */
	name?: string;
}

/**
 * Merge composite - parallel branches merging into one.
 * Created by merge([branch1, branch2, ...]).
 */
export interface MergeComposite<TBranches extends unknown[] = unknown[]> {
	readonly mergeNode: NodeInstance<'n8n-nodes-base.merge', string, unknown>;
	readonly branches: TBranches;
	readonly mode: MergeMode;
}

/**
 * Configuration for ifElse()
 */
export interface IfElseConfig extends NodeConfig {
	/** Node version (defaults to 2.3) */
	version?: number | string;
}

/**
 * IF branch composite - conditional true/false branching.
 * Created by ifElse([trueNode, falseNode], config).
 */
export interface IfElseComposite {
	readonly ifNode: NodeInstance<'n8n-nodes-base.if', string, unknown>;
	readonly trueBranch: NodeInstance<string, string, unknown>;
	readonly falseBranch: NodeInstance<string, string, unknown>;
}

/**
 * Configuration for switchCase()
 */
export interface SwitchCaseConfig extends NodeConfig {
	/** Node version (defaults to 3.4) */
	version?: number | string;
}

/**
 * Switch case composite - multi-way routing.
 * Created by switchCase([case0, case1, case2, fallback], config).
 */
export interface SwitchCaseComposite {
	readonly switchNode: NodeInstance<'n8n-nodes-base.switch', string, unknown>;
	/** Cases can be null (no connection), single node, or array (fan-out to multiple parallel nodes) */
	readonly cases: (
		| NodeInstance<string, string, unknown>
		| NodeInstance<string, string, unknown>[]
		| null
	)[];
}

// =============================================================================
// Split In Batches (Loop Pattern)
// =============================================================================

/**
 * Configuration for splitInBatches()
 */
export interface SplitInBatchesConfig extends NodeConfig {
	/** Node version (defaults to 3) */
	version?: number | string;
}

/**
 * Split in batches builder for loop patterns.
 *
 * @example
 * splitInBatches({ parameters: { batchSize: 10 } })
 *   .done().then(finalizeNode)  // When all batches done
 *   .each().then(processNode)   // For each batch
 *   .loop();                    // Loop back for next batch
 */
export interface SplitInBatchesBuilder {
	/** The split in batches node instance */
	readonly sibNode: NodeInstance<'n8n-nodes-base.splitInBatches', string, unknown>;
	/** Chain from output 0 (all items processed) */
	done(): SplitInBatchesDoneChain;
	/** Chain from output 1 (current batch) */
	each(): SplitInBatchesEachChain;
}

export interface SplitInBatchesDoneChain {
	then<N extends NodeInstance<string, string, unknown>>(
		nodeOrNodes: N | N[],
	): SplitInBatchesDoneChain;
	each(): SplitInBatchesEachChain;
}

export interface SplitInBatchesEachChain {
	then<N extends NodeInstance<string, string, unknown>>(
		nodeOrNodes: N | N[],
	): SplitInBatchesEachChain;
	/** Connect back to split in batches and return the builder */
	loop(): SplitInBatchesBuilder;
}

// =============================================================================
// Workflow Builder
// =============================================================================

/**
 * Workflow builder - the main interface for constructing workflows.
 *
 * @example
 * workflow('my-id', 'My Workflow')
 *   .add(trigger({ ... }).then(node({ ... })))
 *   .settings({ timezone: 'UTC' });
 */
export interface WorkflowBuilder {
	/** Workflow ID */
	readonly id: string;
	/** Workflow name */
	readonly name: string;

	/**
	 * Add a node, trigger, or chain to the workflow.
	 * When adding a chain, all nodes and connections are preserved.
	 */
	add<
		N extends
			| NodeInstance<string, string, unknown>
			| TriggerInstance<string, string, unknown>
			| NodeChain,
	>(node: N): WorkflowBuilder;

	/**
	 * Chain a node after the last added node.
	 */
	then<N extends NodeInstance<string, string, unknown>>(node: N): WorkflowBuilder;

	/**
	 * Chain a merge composite (parallel branches merging)
	 */
	then<M extends MergeComposite>(merge: M): WorkflowBuilder;

	/**
	 * Chain an IF branch composite (conditional branching)
	 */
	then(ifElse: IfElseComposite): WorkflowBuilder;

	/**
	 * Chain a switch case composite (multi-way routing)
	 */
	then(switchCase: SwitchCaseComposite): WorkflowBuilder;

	/**
	 * Chain a split in batches builder (loop pattern)
	 */
	then(splitInBatches: SplitInBatchesBuilder): WorkflowBuilder;

	/**
	 * Update workflow settings
	 */
	settings(settings: WorkflowSettings): WorkflowBuilder;
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Input for node() factory
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
 * Input for trigger() factory
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
 * workflow(id, name, settings?) - Creates a new workflow builder
 *
 * @example
 * workflow('my-workflow', 'My Workflow', { timezone: 'UTC' })
 *   .add(trigger({ ... }))
 *   .then(node({ ... }));
 */
export type WorkflowFn = (id: string, name: string, settings?: WorkflowSettings) => WorkflowBuilder;

/**
 * node(input) - Creates a regular node instance
 *
 * @example
 * node({
 *   type: 'n8n-nodes-base.httpRequest',
 *   version: 4.2,
 *   config: {
 *     name: 'Fetch Data',
 *     parameters: { url: 'https://api.example.com' }
 *   }
 * });
 */
export type NodeFn = <TNode extends NodeInput>(
	input: TNode,
) => NodeInstance<TNode['type'], `${TNode['version']}`, unknown>;

/**
 * trigger(input) - Creates a trigger node instance
 *
 * @example
 * trigger({
 *   type: 'n8n-nodes-base.manualTrigger',
 *   version: 1.1,
 *   config: { name: 'Start' }
 * });
 */
export type TriggerFn = <TTrigger extends TriggerInput>(
	input: TTrigger,
) => TriggerInstance<TTrigger['type'], `${TTrigger['version']}`, unknown>;

/**
 * sticky(content, config?) - Creates a sticky note
 *
 * @example
 * sticky('## API Integration\nThis section handles API calls', {
 *   color: 4,
 *   position: [80, -176]
 * });
 */
export type StickyFn = (
	content: string,
	config?: StickyNoteConfig,
) => NodeInstance<'n8n-nodes-base.stickyNote', 'v1', unknown>;

/**
 * placeholder(hint) - Creates a placeholder for user input
 *
 * @example
 * node({
 *   type: 'n8n-nodes-base.slack',
 *   version: 2.2,
 *   config: {
 *     parameters: { channel: placeholder('Enter Slack channel') }
 *   }
 * });
 */
export type PlaceholderFn = (hint: string) => PlaceholderValue;

/**
 * newCredential(name) - Creates a new credential marker
 *
 * @example
 * node({
 *   type: 'n8n-nodes-base.httpRequest',
 *   version: 4.2,
 *   config: {
 *     credentials: { httpBasicAuth: newCredential('My API Auth') }
 *   }
 * });
 */
export type NewCredentialFn = (name: string) => NewCredentialValue;

/**
 * merge(branches, config?) - Creates parallel branches that merge
 *
 * @example
 * workflow('id', 'Parallel APIs')
 *   .add(trigger({ ... }))
 *   .then(merge([
 *     node({ type: 'n8n-nodes-base.httpRequest', ... }),
 *     node({ type: 'n8n-nodes-base.httpRequest', ... }),
 *     node({ type: 'n8n-nodes-base.httpRequest', ... })
 *   ], { mode: 'combine' }))
 *   .then(processResults);
 */
export type MergeFn = <TBranches extends NodeInstance<string, string>[]>(
	branches: TBranches,
	config?: MergeConfig,
) => MergeComposite<TBranches>;

/**
 * ifElse([trueNode, falseNode], config) - Creates conditional branching
 *
 * @example
 * workflow('id', 'Conditional')
 *   .add(trigger({ ... }))
 *   .then(ifElse([
 *     node({ ... }),  // True branch (output 0)
 *     node({ ... })   // False branch (output 1)
 *   ], {
 *     name: 'Check Value',
 *     parameters: {
 *       conditions: {
 *         conditions: [{
 *           leftValue: '={{ $json.status }}',
 *           rightValue: 'success',
 *           operator: { type: 'string', operation: 'equals' }
 *         }]
 *       }
 *     }
 *   }));
 */
export type IfElseFn = (
	branches: [NodeInstance<string, string> | null, NodeInstance<string, string> | null],
	config?: IfElseConfig,
) => IfElseComposite;

/**
 * switchCase(cases, config) - Creates multi-way routing
 *
 * @example
 * workflow('id', 'Router')
 *   .add(trigger({ ... }))
 *   .then(switchCase([
 *     node({ ... }),  // Case 0 (output 0)
 *     node({ ... }),  // Case 1 (output 1)
 *     node({ ... }),  // Case 2 (output 2)
 *     node({ ... })   // Fallback (last output)
 *   ], {
 *     name: 'Route by Type',
 *     parameters: {
 *       mode: 'rules',
 *       rules: { ... }
 *     }
 *   }));
 */
export type SwitchCaseFn = (
	cases: NodeInstance<string, string>[],
	config?: SwitchCaseConfig,
) => SwitchCaseComposite;

/**
 * splitInBatches(config?) - Creates batch processing with loop
 *
 * @example
 * workflow('id', 'Batch Process')
 *   .add(trigger({ ... }))
 *   .then(
 *     splitInBatches({ parameters: { batchSize: 10 } })
 *       .done().then(finalizeNode)  // When all done
 *       .each().then(processNode)   // Each batch
 *       .loop()                     // Loop back
 *   );
 */
export type SplitInBatchesFn = (config?: SplitInBatchesConfig) => SplitInBatchesBuilder;

// =============================================================================
// $fromAI for Tool Nodes
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
	 *
	 * @param key - Unique identifier for the parameter (1-64 chars, alphanumeric/underscore/hyphen)
	 * @param description - Description to help the AI understand what value to provide
	 * @param type - Expected value type: 'string' | 'number' | 'boolean' | 'json' (default: 'string')
	 * @param defaultValue - Fallback value if AI doesn't provide one
	 * @returns Expression string like "={{ $fromAI('key', 'desc', 'type') }}"
	 *
	 * @example Basic usage
	 * $.fromAI('recipient_email')
	 * // Returns: "={{ /*n8n-auto-generated-fromAI-override*\/ $fromAI('recipient_email') }}"
	 *
	 * @example With description (helps AI understand the parameter)
	 * $.fromAI('subject', 'The email subject line')
	 *
	 * @example With type
	 * $.fromAI('count', 'Number of items to fetch', 'number')
	 *
	 * @example With default value
	 * $.fromAI('limit', 'Max results', 'number', 10)
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
 * Use the callback form when you need $.fromAI() for AI-driven parameter values.
 */
export type ToolConfigInput<TParams = unknown> =
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
	/** Tool node type (e.g., 'n8n-nodes-base.gmailTool') */
	type: TType;
	/** Tool node version */
	version: TVersion;
	/**
	 * Tool configuration - can be:
	 * 1. Static NodeConfig object (when $fromAI not needed)
	 * 2. Callback function receiving $ context with $.fromAI() (when AI should fill values)
	 */
	config: ToolConfigInput<TParams>;
}

// =============================================================================
// Subnode Builder Functions (for AI/LangChain nodes)
// =============================================================================

/**
 * languageModel(input) - Creates a language model subnode
 *
 * @example
 * node({
 *   type: '@n8n/n8n-nodes-langchain.agent',
 *   version: 1.7,
 *   config: {
 *     subnodes: {
 *       model: languageModel({
 *         type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
 *         version: 1.2,
 *         config: { parameters: { model: 'gpt-4' } }
 *       })
 *     }
 *   }
 * });
 */
export type LanguageModelFn = <T extends NodeInput>(
	input: T,
) => LanguageModelInstance<T['type'], `${T['version']}`, unknown>;

/**
 * memory(input) - Creates a memory subnode
 */
export type MemoryFn = <T extends NodeInput>(
	input: T,
) => MemoryInstance<T['type'], `${T['version']}`, unknown>;

/**
 * tool(input) - Creates a tool subnode for AI agents
 *
 * Tools are subnodes that give AI agents capabilities (send email, search, etc.).
 * Use $.fromAI() in the config callback to let the AI determine parameter values.
 *
 * @example Static config (no AI-driven values)
 * tool({
 *   type: '@n8n/n8n-nodes-langchain.toolCalculator',
 *   version: 1,
 *   config: { parameters: {} }
 * });
 *
 * @example Config callback with $.fromAI() for AI-driven values
 * tool({
 *   type: 'n8n-nodes-base.gmailTool',
 *   version: 1,
 *   config: ($) => ({
 *     parameters: {
 *       sendTo: $.fromAI('recipient', 'Email address to send to'),
 *       subject: $.fromAI('subject', 'Email subject line'),
 *       message: $.fromAI('body', 'Email body content', 'string')
 *     },
 *     credentials: { gmailOAuth2: { id: 'cred-123', name: 'Gmail' } }
 *   })
 * });
 *
 * @example Tool with typed parameters
 * tool({
 *   type: 'n8n-nodes-base.googleSheetsTool',
 *   version: 4.5,
 *   config: ($) => ({
 *     parameters: {
 *       operation: 'append',
 *       sheetName: $.fromAI('sheet', 'Name of the sheet'),
 *       columns: {
 *         value: {
 *           Name: $.fromAI('name', 'Person name'),
 *           Email: $.fromAI('email', 'Person email')
 *         }
 *       }
 *     }
 *   })
 * });
 */
export type ToolFn = <T extends ToolInput>(
	input: T,
) => ToolInstance<T['type'], `${T['version']}`, unknown>;

/**
 * outputParser(input) - Creates an output parser subnode
 */
export type OutputParserFn = <T extends NodeInput>(
	input: T,
) => OutputParserInstance<T['type'], `${T['version']}`, unknown>;

/**
 * embedding(input) - Creates an embedding subnode
 */
export type EmbeddingFn = <T extends NodeInput>(
	input: T,
) => EmbeddingInstance<T['type'], `${T['version']}`, unknown>;

/**
 * vectorStore(input) - Creates a vector store subnode
 */
export type VectorStoreFn = <T extends NodeInput>(
	input: T,
) => VectorStoreInstance<T['type'], `${T['version']}`, unknown>;

/**
 * retriever(input) - Creates a retriever subnode
 */
export type RetrieverFn = <T extends NodeInput>(
	input: T,
) => RetrieverInstance<T['type'], `${T['version']}`, unknown>;

/**
 * documentLoader(input) - Creates a document loader subnode
 */
export type DocumentLoaderFn = <T extends NodeInput>(
	input: T,
) => DocumentLoaderInstance<T['type'], `${T['version']}`, unknown>;

/**
 * textSplitter(input) - Creates a text splitter subnode
 */
export type TextSplitterFn = <T extends NodeInput>(
	input: T,
) => TextSplitterInstance<T['type'], `${T['version']}`, unknown>;

// =============================================================================
// Code Node Helpers (for n8n-nodes-base.code)
// =============================================================================

/**
 * Context for runOnceForAllItems - access to all input items
 * TInput allows typing based on upstream node's output type
 */
export interface AllItemsContext<TInput = IDataObject> {
	$input: {
		all(): TInput[];
		first(): TInput;
		last(): TInput;
		itemMatching(index: number): TInput;
	};
	$json: TInput;
	$env: IDataObject;
	$vars: IDataObject;
	$secrets: IDataObject;
	$now: Date;
	$today: Date;
	$runIndex: number;
	$execution: { id: string; mode: 'test' | 'production' };
	$workflow: { id?: string; name?: string; active: boolean };
	/**
	 * Access output of a specific node by name.
	 * Returns the node's output data with shape defined by its Output type.
	 * Example: $('Fetch User').json.email
	 */
	(nodeName: string): { json: IDataObject };
	$jmespath: (data: unknown, expr: string) => unknown;
}

/**
 * Context for runOnceForEachItem - access to current item
 * TInput allows typing based on upstream node's output type
 */
export interface EachItemContext<TInput = IDataObject> {
	$input: { item: TInput };
	$json: TInput;
	$itemIndex: number;
	$env: IDataObject;
	$vars: IDataObject;
	$secrets: IDataObject;
	$now: Date;
	$today: Date;
	$runIndex: number;
	$execution: { id: string; mode: 'test' | 'production' };
	$workflow: { id?: string; name?: string; active: boolean };
	/**
	 * Access output of a specific node by name.
	 * Returns the node's output data with shape defined by its Output type.
	 * Example: $('Fetch User').json.email
	 */
	(nodeName: string): { json: IDataObject };
	$jmespath: (data: unknown, expr: string) => unknown;
}

/**
 * runOnceForAllItems(fn) - Code helper for processing all items at once
 *
 * @example
 * node({
 *   type: 'n8n-nodes-base.code',
 *   version: 2,
 *   config: {
 *     parameters: {
 *       ...runOnceForAllItems((ctx) => {
 *         const total = ctx.$input.all().reduce((sum, item) => sum + item.json.value, 0);
 *         return [{ json: { total } }];
 *       })
 *     }
 *   }
 * });
 */
export type RunOnceForAllItemsFn = <T = unknown>(
	fn: (ctx: AllItemsContext) => Array<{ json: T }>,
) => { mode: 'runOnceForAllItems'; jsCode: string };

/**
 * runOnceForEachItem(fn) - Code helper for processing each item
 *
 * @example
 * node({
 *   type: 'n8n-nodes-base.code',
 *   version: 2,
 *   config: {
 *     parameters: {
 *       ...runOnceForEachItem((ctx) => {
 *         return { json: { doubled: ctx.$input.item.json.value * 2 } };
 *       })
 *     }
 *   }
 * });
 */
export type RunOnceForEachItemFn = <T = unknown>(
	fn: (ctx: EachItemContext) => { json: T } | null,
) => { mode: 'runOnceForEachItem'; jsCode: string };

// =============================================================================
// Expression Helper
// =============================================================================

/**
 * Context available in n8n expressions (inside {{ }}).
 * TJson allows typing based on upstream node's output type.
 */
export interface ExpressionContext<TJson = IDataObject> {
	/** Current item's JSON data from the previous node */
	json: TJson;
	/** Current item's binary data */
	binary: {
		[fieldName: string]: {
			fileName?: string;
			mimeType?: string;
			fileExtension?: string;
			fileSize?: string;
		};
	};
	/** Input data access - typed based on upstream node's output */
	input: { first(): TJson; all(): TJson[]; item: TJson };
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
	execution: { id: string; mode: 'test' | 'production' };
	/** Workflow metadata */
	workflow: { id?: string; name?: string; active: boolean };
}

/**
 * Expression function type for type-safe expressions.
 * Use as: `{{ ($: ExpressionContext) => $.json.fieldName }}`
 */
export type Expression<T> = ($: ExpressionContext) => T;
