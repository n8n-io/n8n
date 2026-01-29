/**
 * Embedded SDK API Content
 *
 */

/**
 * Escape curly brackets for LangChain prompt templates
 */
export function escapeCurlyBrackets(text: string): string {
	return text.replace(/\{/g, '{{').replace(/\}/g, '}}');
}

export const SDK_API_CONTENT = `/**
 * Workflow SDK API Reference
 *
 * The SDK handles all internal complexity (connections, node IDs, positioning)
 * automatically - just chain nodes with .to() and the SDK does the rest.
 */

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
 * Configuration for AI node subnodes.
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
	embeddings?: EmbeddingInstance | EmbeddingInstance[];
	/** Vector store subnode */
	vectorStore?: VectorStoreInstance;
	/** Retriever subnode */
	retriever?: RetrieverInstance;
	/** Document loader subnode(s) */
	documentLoader?: DocumentLoaderInstance | DocumentLoaderInstance[];
	/** Text splitter subnode */
	textSplitter?: TextSplitterInstance;
}

/**
 * Subnode instances for AI/LangChain nodes.
 * Each type corresponds to a slot in SubnodeConfig.
 * All extend NodeInstance with the same interface.
 */
export interface LanguageModelInstance extends NodeInstance {}  // → subnodes.model
export interface MemoryInstance extends NodeInstance {}         // → subnodes.memory
export interface ToolInstance extends NodeInstance {}           // → subnodes.tools
export interface OutputParserInstance extends NodeInstance {}   // → subnodes.outputParser
export interface EmbeddingInstance extends NodeInstance {}      // → subnodes.embeddings
export interface VectorStoreInstance extends NodeInstance {}    // → subnodes.vectorStore
export interface RetrieverInstance extends NodeInstance {}      // → subnodes.retriever
export interface DocumentLoaderInstance extends NodeInstance {} // → subnodes.documentLoader
export interface TextSplitterInstance extends NodeInstance {}   // → subnodes.textSplitter

/**
 * Configuration for creating a node.
 * Only 'parameters' is typically needed - other options are for advanced use.
 */
export interface NodeConfig<TParams = IDataObject, TOutput = IDataObject> {
	/** Node-specific parameters - the main configuration */
	parameters?: TParams;
	/** Credentials keyed by type. Use newCredential() for new ones. */
	credentials?: Record<string, CredentialReference | NewCredentialFn>;
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

/**
 * Terminal input target for connecting to a specific input index.
 * Created by calling .input(n) on a NodeInstance.
 * Use for multi-input nodes like Merge.
 *
 * @example
 * nodeA.to(mergeNode.input(0))  // Connect nodeA to merge input 0
 * nodeB.to(mergeNode.input(1))  // Connect nodeB to merge input 1
 */
export interface InputTarget {
	readonly node: NodeInstance;
	readonly inputIndex: number;
}

/**
 * Output selector for connecting from a specific output index.
 * Created by calling .output(n) on a NodeInstance.
 * Use for multi-output nodes (IF, Switch, text classifiers).
 *
 * @example
 * classifier.output(1).to(categoryB)  // Connect from output 1
 */
export interface OutputSelector<
	TType extends string = string,
	TVersion extends string = string,
	TOutput = unknown,
> {
	readonly node: NodeInstance<TType, TVersion, TOutput>;
	readonly outputIndex: number;

	/** Connect from this output to a target node */
	to<T extends NodeInstance>(target: T | InputTarget): NodeChain;
	/** Alias for to() */
	then<T extends NodeInstance>(target: T | InputTarget): NodeChain;
}

/**
 * A configured node instance.
 * Chain nodes together using .to() to connect them.
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
	 * Connect this node's output 0 to another node.
	 * Use .output(n).to() for other outputs.
	 * Can pass an array for parallel targets: .to([nodeA, nodeB])
	 *
	 * @example
	 * trigger.to(nodeA.to(nodeB))  // Linear chain
	 * nodeA.to(mergeNode.input(0))   // Connect to specific input
	 * nodeA.to([nodeB, nodeC])  // Fan-out to multiple parallel targets
	 */
	to<T extends NodeInstance<string, string, unknown>>(
		target: T | T[] | InputTarget,
	): NodeChain<NodeInstance<TType, TVersion, TOutput>, T>;

	/**
	 * Create a terminal input target for connecting to a specific input index.
	 * Use for multi-input nodes like Merge.
	 *
	 * @example
	 * nodeA.to(mergeNode.input(0))
	 * nodeB.to(mergeNode.input(1))
	 */
	input(index: number): InputTarget;

	/**
	 * Select a specific output index for connection.
	 * Used for multi-output nodes
	 */
	output(index: number): OutputSelector<TType, TVersion, TOutput>;

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
 * Builder for IF branching - allows chaining .onTrue()/.onFalse() in any order.
 */
export interface IfElseBuilder {
	onTrue<T extends NodeInstance>(target: T): IfElseBuilder;
	onFalse<T extends NodeInstance>(target: T): IfElseBuilder;
}

/**
 * Builder for Switch cases - allows chaining multiple .onCase() calls.
 */
export interface SwitchCaseBuilder {
	onCase<T extends NodeInstance>(index: number, target: T): SwitchCaseBuilder;
}

/**
 * IF node instance with branching methods.
 *
 * @example
 * const ifElseNode = ifElse({ version: 2.2, config: { name: 'Check', parameters: {...} } });
 * ifElseNode.onTrue(trueHandler).onFalse(falseHandler)
 */
export interface IfElseNodeInstance extends NodeInstance<'n8n-nodes-base.if', string, unknown> {
	/** Connect the true branch (output 0) */
	onTrue<T extends NodeInstance>(target: T): IfElseBuilder;
	/** Connect the false branch (output 1) */
	onFalse<T extends NodeInstance>(target: T): IfElseBuilder;
}

/**
 * Switch node instance with case routing methods.
 * Created by node() with type 'n8n-nodes-base.switch'.
 *
 * @example
 * const switchNode = node({ type: 'n8n-nodes-base.switch', ... });
 * switchNode.onCase(0, handlerA).onCase(1, handlerB)
 */
export interface SwitchNodeInstance extends NodeInstance<'n8n-nodes-base.switch', string, unknown> {
	/** Connect a case output to a target */
	onCase<T extends NodeInstance>(index: number, target: T): SwitchCaseBuilder;
}

/**
 * Merge node instance with input targeting. Created by merge() factory.
 *
 * @example
 * const mergeNode = merge({ version: 3.2, config: { name: 'Combine' } });
 * branch1.to(mergeNode.input(0));  // Connect branch1 to input 0
 * branch2.to(mergeNode.input(1));  // Connect branch2 to input 1
 */
export interface MergeNodeInstance extends NodeInstance<'n8n-nodes-base.merge', string, unknown> {
	/** Connect to a specific merge input: branch.to(mergeNode.input(0)) */
	input(index: number): InputTarget;
}

/**
 * A chain of connected nodes.
 * Created when you call .to() on a node.
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
	 * Use .output(n).to() to connect from a specific output.
	 * Can pass an array for parallel targets: .to([nodeA, nodeB])
	 */
	to<T extends NodeInstance<string, string, unknown>>(
		target: T | T[] | InputTarget,
	): NodeChain<THead, T>;

	/** Alias for to() */
	then<T extends NodeInstance<string, string, unknown>>(
		target: T | InputTarget,
	): NodeChain<THead, T>;
}

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
 * splitInBatches(sibNode)
 *   .onDone(finalizeNode)                  // When all batches done
 *   .onEachBatch(processNode.to(sibNode))  // For each batch (loops back)
 */
export interface SplitInBatchesBuilder {
	/** The split in batches node instance */
	readonly sibNode: NodeInstance<'n8n-nodes-base.splitInBatches', string, unknown>;
	/** Set the done branch target (output 0) - when all batches processed */
	onDone(target: NodeInstance | null): SplitInBatchesBuilder;
	/** Set the each batch branch target (output 1) - for each batch */
	onEachBatch(target: NodeInstance | null): SplitInBatchesBuilder;
}

/**
 * Workflow builder - the main interface for constructing workflows.
 *
 * @example
 * workflow('my-id', 'My Workflow')
 *   .add(trigger({ ... }).to(node({ ... })))
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
	to<N extends NodeInstance<string, string, unknown>>(node: N): WorkflowBuilder;

	/**
	 * Chain a split in batches builder (loop pattern)
	 */
	to(splitInBatches: SplitInBatchesBuilder): WorkflowBuilder;

	/** Alias for to() */
	then<N extends NodeInstance<string, string, unknown>>(node: N): WorkflowBuilder;
	then(splitInBatches: SplitInBatchesBuilder): WorkflowBuilder;

	/**
	 * Update workflow settings
	 */
	settings(settings: WorkflowSettings): WorkflowBuilder;
}

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
 *   .add(trigger({ ... }).to(node({ ... })));
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
) => NodeInstance<TNode['type'], \`\${TNode['version']}\`, unknown>;

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
) => TriggerInstance<TTrigger['type'], \`\${TTrigger['version']}\`, unknown>;

/**
 * sticky(content, config?) - Creates a sticky note
 *
 * @example
 * sticky('## API Integration\\nThis section handles API calls', {
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
export type PlaceholderFn = (hint: string) => string;

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
export type NewCredentialFn = (name: string) => CredentialReference;

/**
 * merge({ version, config? }) - Creates a merge node for combining multiple branches
 *
 * Use .input(n) to connect sources to specific input indices.
 *
 * @example
 * const mergeNode = merge({
 *   version: 3.2,
 *   config: { name: 'Combine Results', parameters: { mode: 'combine' } }
 * });
 * branch1.to(mergeNode.input(0));  // Connect to input 0
 * branch2.to(mergeNode.input(1));  // Connect to input 1
 * mergeNode.to(downstream);        // Connect merge output to downstream
 */
export type MergeFn = (input: { version: number; config?: NodeConfig }) => MergeNodeInstance;

/**
 * splitInBatches(config?) - Creates batch processing with loop
 *
 * Returns a SplitInBatchesBuilder with .onDone()/.onEachBatch() fluent methods.
 * Use nextBatch() to make loop-back connections explicit.
 *
 * @example
 * const sibNode = splitInBatches({
 *   name: 'Loop',
 *   parameters: { batchSize: 10 },
 *   position: [840, 300]
 * });
 *
 * // Fluent API with nextBatch() for explicit loop-back
 * workflow('id', 'Batch Process')
 *   .add(startTrigger.to(fetchRecords.to(
 *     sibNode
 *       .onDone(finalizeNode)                            // When all batches done
 *       .onEachBatch(processNode.to(nextBatch(sibNode))) // Loop back with nextBatch()
 *   ));
 */
export type SplitInBatchesFn = (config?: SplitInBatchesConfig) => SplitInBatchesBuilder;

/**
 * nextBatch(sibNode) - Semantic helper for loop-back connections
 *
 * Makes loop-back intent explicit in generated code. Functionally equivalent
 * to passing the sibNode directly, but provides semantic clarity that this
 * is an intentional loop-back to the split in batches node.
 *
 * @param sib - The split in batches builder or node instance to loop back to
 * @returns The SIB node instance for use with .to()
 *
 * @example
 * const sibNode = splitInBatches({ name: 'Loop', parameters: { batchSize: 10 } });
 *
 * // Using nextBatch() for explicit loop-back (recommended)
 * sibNode
 *   .onDone(finalizeNode)
 *   .onEachBatch(processNode.to(nextBatch(sibNode)));
 *
 * // Equivalent but less clear intent
 * sibNode
 *   .onDone(finalizeNode)
 *   .onEachBatch(processNode.to(sibNode.sibNode));
 */
export type NextBatchFn = (
	sib: NodeInstance<'n8n-nodes-base.splitInBatches', string, unknown> | SplitInBatchesBuilder,
) => NodeInstance<'n8n-nodes-base.splitInBatches', string, unknown>;

/**
 * Valid types for \$fromAI parameter values
 */
export type FromAIArgumentType = 'string' | 'number' | 'boolean' | 'json';

/**
 * Context provided to tool() config callbacks.
 * Use \$.fromAI() to create AI-driven parameter values.
 */
export interface ToolConfigContext {
	/**
	 * Create a \$fromAI placeholder for AI-driven parameter values.
	 * The AI agent will determine the actual value at runtime.
	 *
	 * @param key - Unique identifier for the parameter (1-64 chars, alphanumeric/underscore/hyphen)
	 * @param description - Description to help the AI understand what value to provide
	 * @param type - Expected value type: 'string' | 'number' | 'boolean' | 'json' (default: 'string')
	 * @param defaultValue - Fallback value if AI doesn't provide one
	 * @returns Expression string like "={{ \$fromAI('key', 'desc', 'type') }}"
	 *
	 * @example Basic usage
	 * \$.fromAI('recipient_email')
	 * // Returns: "={{ /*n8n-auto-generated-fromAI-override*\\/ \$fromAI('recipient_email') }}"
	 *
	 * @example With description (helps AI understand the parameter)
	 * \$.fromAI('subject', 'The email subject line')
	 *
	 * @example With type
	 * \$.fromAI('count', 'Number of items to fetch', 'number')
	 *
	 * @example With default value
	 * \$.fromAI('limit', 'Max results', 'number', 10)
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
 * Use the callback form when you need \$.fromAI() for AI-driven parameter values.
 */
export type ToolConfigInput<TParams = unknown> =
	| NodeConfig<TParams>
	| ((\$: ToolConfigContext) => NodeConfig<TParams>);

/**
 * Input for tool() factory with config callback support for \$fromAI.
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
	 * 1. Static NodeConfig object (when \$fromAI not needed)
	 * 2. Callback function receiving \$ context with \$.fromAI() (when AI should fill values)
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
 * // 1. Define subnodes first
 * const openAiModel = languageModel({
 *   type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
 *   version: 1.3,
 *   config: { name: 'OpenAI Model', parameters: { model: 'gpt-4' }, position: [540, 500] }
 * });
 *
 * // 2. Define main nodes
 * const aiAgent = node({
 *   type: '@n8n/n8n-nodes-langchain.agent',
 *   version: 1.7,
 *   config: {
 *     name: 'AI Agent',
 *     subnodes: { model: openAiModel },
 *     position: [540, 300]
 *   }
 * });
 */
export type LanguageModelFn = (input: NodeInput) => LanguageModelInstance;

/**
 * memory(input) - Creates a memory subnode
 */
export type MemoryFn = (input: NodeInput) => MemoryInstance;

/**
 * tool(input) - Creates a tool subnode for AI agents
 *
 * Tools are subnodes that give AI agents capabilities (send email, search, etc.).
 * Use \$.fromAI() in the config callback to let the AI determine parameter values.
 *
 * @example Static config (no AI-driven values)
 * // 1. Define subnodes first
 * const calculatorTool = tool({
 *   type: '@n8n/n8n-nodes-langchain.toolCalculator',
 *   version: 1,
 *   config: { name: 'Calculator', parameters: {}, position: [700, 500] }
 * });
 *
 * @example Config callback with \$.fromAI() for AI-driven values
 * // 1. Define subnodes first
 * const gmailTool = tool({
 *   type: 'n8n-nodes-base.gmailTool',
 *   version: 1,
 *   config: (\$) => ({
 *     name: 'Gmail Tool',
 *     parameters: {
 *       sendTo: \$.fromAI('recipient', 'Email address to send to'),
 *       subject: \$.fromAI('subject', 'Email subject line'),
 *       message: \$.fromAI('body', 'Email body content', 'string')
 *     },
 *     credentials: { gmailOAuth2: newCredential('Gmail') },
 *     position: [700, 500]
 *   })
 * });
 *
 * // 2. Define main nodes with subnodes
 * const emailAgent = node({
 *   type: '@n8n/n8n-nodes-langchain.agent',
 *   version: 3.1,
 *   config: {
 *     name: 'Email Agent',
 *     parameters: { promptType: 'define', text: 'You can send emails' },
 *     subnodes: { model: openAiModel, tools: [gmailTool] },
 *     position: [540, 300]
 *   }
 * });
 */
export type ToolFn = (input: ToolInput) => ToolInstance;

/**
 * outputParser(input) - Creates an output parser subnode
 */
export type OutputParserFn = (input: NodeInput) => OutputParserInstance;

/**
 * embeddings(input) - Creates an embedding subnode
 */
export type EmbeddingsFn = (input: NodeInput) => EmbeddingInstance;

/**
 * vectorStore(input) - Creates a vector store subnode
 */
export type VectorStoreFn = (input: NodeInput) => VectorStoreInstance;

/**
 * retriever(input) - Creates a retriever subnode
 */
export type RetrieverFn = (input: NodeInput) => RetrieverInstance;

/**
 * documentLoader(input) - Creates a document loader subnode
 */
export type DocumentLoaderFn = (input: NodeInput) => DocumentLoaderInstance;

/**
 * textSplitter(input) - Creates a text splitter subnode
 */
export type TextSplitterFn = (input: NodeInput) => TextSplitterInstance;

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

`;

/**
 * Pre-escaped SDK API content for direct use in LangChain prompt templates.
 * This version has all curly brackets escaped to prevent LangChain template interpolation issues.
 */
export const SDK_API_CONTENT_ESCAPED = escapeCurlyBrackets(SDK_API_CONTENT);
