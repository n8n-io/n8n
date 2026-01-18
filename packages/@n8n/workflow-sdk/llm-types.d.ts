/**
 * @n8n/workflow-sdk - Type Definitions for LLM Workflow Generation
 *
 * This file contains all types and function signatures needed to programmatically
 * create n8n workflows using the @n8n/workflow-sdk package.
 *
 * USAGE:
 * ```typescript
 * import {
 *   workflow,
 *   node,
 *   trigger,
 *   merge,
 *   sticky,
 *   splitInBatches,
 *   placeholder,
 *   expr,
 *   runOnceForAllItems,
 *   runOnceForEachItem,
 *   validateWorkflow
 * } from '@n8n/workflow-sdk';
 * ```
 */

// =============================================================================
// CORE TYPES
// =============================================================================

/**
 * Generic data object type (key-value pairs)
 */
export interface IDataObject {
	[key: string]: unknown;
}

/**
 * Workflow settings configuration
 */
export interface WorkflowSettings {
	/** Timezone for the workflow (e.g., 'America/New_York', 'Europe/London') */
	timezone?: string;
	/** ID of the error handling workflow to execute on failure */
	errorWorkflow?: string;
	/** When to save data from error executions: 'all' saves always, 'none' never saves */
	saveDataErrorExecution?: 'all' | 'none';
	/** When to save data from successful executions: 'all' saves always, 'none' never saves */
	saveDataSuccessExecution?: 'all' | 'none';
	/** Whether to save manual execution data */
	saveManualExecutions?: boolean;
	/** Whether to save execution progress for resumability */
	saveExecutionProgress?: boolean;
	/** Execution timeout in seconds (0 = no timeout) */
	executionTimeout?: number;
	/** Execution order version ('v0' = legacy, 'v1' = recommended) */
	executionOrder?: 'v0' | 'v1';
	/** Who can call this workflow via webhook/API */
	callerPolicy?: 'any' | 'none' | 'workflowsFromAList' | 'workflowsFromSameOwner';
	/** Comma-separated list of caller workflow IDs (when callerPolicy is 'workflowsFromAList') */
	callerIds?: string;
	/** Additional custom settings */
	[key: string]: unknown;
}

/**
 * Reference to stored credentials in n8n
 */
export interface CredentialReference {
	/** Display name of the credential (for identification) */
	name: string;
	/** Unique ID of the credential in n8n */
	id: string;
}

/**
 * Error handling behavior for nodes
 * - 'stopWorkflow': Stop execution on error (default)
 * - 'continueRegularOutput': Continue with regular output, ignoring the error
 * - 'continueErrorOutput': Send error to error output (second output)
 */
export type OnError = 'stopWorkflow' | 'continueRegularOutput' | 'continueErrorOutput';

/**
 * Configuration options for creating a node
 *
 * @example
 * ```typescript
 * const config: NodeConfig = {
 *   parameters: { url: 'https://api.example.com', method: 'GET' },
 *   credentials: { httpBasicAuth: { name: 'My API Creds', id: 'abc123' } },
 *   onError: 'continueErrorOutput',
 *   name: 'Fetch Data'
 * };
 * ```
 */
export interface NodeConfig<TParams = IDataObject> {
	/** Node-specific parameters (varies by node type) */
	parameters?: TParams;
	/** Credential references keyed by credential type name */
	credentials?: Record<string, CredentialReference>;
	/** Custom node name (auto-generated from type if omitted) */
	name?: string;
	/** Canvas position [x, y] in pixels */
	position?: [number, number];
	/** Whether the node is disabled (skipped during execution) */
	disabled?: boolean;
	/** Documentation notes for the node */
	notes?: string;
	/** Whether to show notes on the canvas */
	notesInFlow?: boolean;
	/** Execute only once regardless of number of input items */
	executeOnce?: boolean;
	/** Automatically retry on failure */
	retryOnFail?: boolean;
	/** Always output data even if empty (prevents downstream nodes from being skipped) */
	alwaysOutputData?: boolean;
	/** Error handling behavior */
	onError?: OnError;
	/** Pinned output data for testing */
	pinData?: IDataObject[];
}

/**
 * Configuration for sticky notes (workflow documentation)
 */
export interface StickyNoteConfig {
	/** Color index (1-7, maps to n8n color palette) */
	color?: number;
	/** Canvas position [x, y] in pixels */
	position?: [number, number];
	/** Width in pixels */
	width?: number;
	/** Height in pixels */
	height?: number;
	/** Custom name for the sticky note */
	name?: string;
}

// =============================================================================
// NODE INSTANCES
// =============================================================================

/**
 * Node instance representing a configured node in the workflow.
 * Created by node() or trigger() factory functions.
 *
 * @typeParam TType - Node type string (e.g., 'n8n-nodes-base.httpRequest')
 * @typeParam TVersion - Node version string (e.g., 'v4.2')
 * @typeParam TOutput - Output type for type inference
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
	/** Node name (displayed on canvas) */
	readonly name: string;
	/** Output type marker (for type inference) */
	readonly _outputType?: TOutput;

	/**
	 * Update node configuration (returns new instance, immutable)
	 */
	update(config: Partial<NodeConfig>): NodeInstance<TType, TVersion, TOutput>;
}

/**
 * Trigger node instance - a node that starts workflow execution.
 * Created by trigger() factory function.
 */
export interface TriggerInstance<TType extends string, TVersion extends string, TOutput = unknown>
	extends NodeInstance<TType, TVersion, TOutput> {
	/** Marker indicating this is a trigger node */
	readonly isTrigger: true;
}

// =============================================================================
// WORKFLOW BUILDER
// =============================================================================

/**
 * Workflow builder for constructing workflows with a fluent API.
 *
 * @example Linear workflow:
 * ```typescript
 * const wf = workflow('my-workflow', 'My Workflow')
 *   .add(trigger('n8n-nodes-base.scheduleTrigger', 'v1.2', {
 *     parameters: { rule: { interval: [{ field: 'hours', hour: 9 }] } }
 *   }))
 *   .then(node('n8n-nodes-base.httpRequest', 'v4.2', {
 *     parameters: { url: 'https://api.example.com/data', method: 'GET' }
 *   }))
 *   .then(node('n8n-nodes-base.slack', 'v2.2', {
 *     parameters: { channel: '#alerts', text: '={{ $json.message }}' },
 *     credentials: { slackApi: { name: 'Slack', id: 'slack-cred-id' } }
 *   }));
 * ```
 *
 * @example Branching with outputs:
 * ```typescript
 * const wf = workflow('branching', 'Branching Workflow')
 *   .add(trigger(...))
 *   .then(node('n8n-nodes-base.if', 'v2', {
 *     parameters: { conditions: { boolean: [{ value1: '={{ $json.active }}', value2: true }] } }
 *   }))
 *   .output(0).then(handleActiveCase)  // true branch
 *   .output(1).then(handleInactiveCase);  // false branch
 * ```
 */
export interface WorkflowBuilder {
	/** Workflow ID */
	readonly id: string;
	/** Workflow name */
	readonly name: string;

	/**
	 * Add a node to the workflow (typically the trigger).
	 * This is the entry point - use this to add the first node.
	 */
	add<N extends NodeInstance<string, string, unknown> | TriggerInstance<string, string, unknown>>(
		node: N,
	): WorkflowBuilder;

	/**
	 * Chain a node after the current node.
	 * Connects from output 0 by default.
	 */
	then<N extends NodeInstance<string, string, unknown>>(node: N): WorkflowBuilder;

	/**
	 * Chain a merge composite (parallel branches).
	 */
	then<M extends MergeComposite>(merge: M): WorkflowBuilder;

	/**
	 * Select an output branch by index.
	 * Use for multi-output nodes like If, Switch, Split In Batches.
	 *
	 * @param index - Output index (0-based)
	 */
	output(index: number): OutputSelector<WorkflowBuilder>;

	/**
	 * Update workflow settings.
	 */
	settings(settings: WorkflowSettings): WorkflowBuilder;

	/**
	 * Get a node by name.
	 */
	getNode(name: string): NodeInstance<string, string, unknown> | undefined;

	/**
	 * Export to n8n JSON format.
	 */
	toJSON(): WorkflowJSON;

	/**
	 * Serialize to JSON string.
	 */
	toString(): string;
}

/**
 * Output selector for branching from multi-output nodes
 */
export interface OutputSelector<TWorkflow extends WorkflowBuilder> {
	/**
	 * Chain a node from this output
	 */
	then<N extends NodeInstance<string, string, unknown>>(node: N): TWorkflow;
}

/**
 * n8n workflow JSON format (for import/export)
 */
export interface WorkflowJSON {
	id?: string;
	name: string;
	nodes: Array<{
		id: string;
		name: string;
		type: string;
		typeVersion: number;
		position: [number, number];
		parameters: IDataObject;
		credentials?: Record<string, { id: string; name: string }>;
		disabled?: boolean;
		notes?: string;
		notesInFlow?: boolean;
		executeOnce?: boolean;
		retryOnFail?: boolean;
		alwaysOutputData?: boolean;
		onError?: OnError;
	}>;
	connections: Record<
		string,
		{
			main?: Array<Array<{ node: string; type: string; index: number }>>;
			[connectionType: string]:
				| Array<Array<{ node: string; type: string; index: number }>>
				| undefined;
		}
	>;
	settings?: WorkflowSettings;
	pinData?: Record<string, IDataObject[]>;
	meta?: {
		templateId?: string;
		instanceId?: string;
		[key: string]: unknown;
	};
}

// =============================================================================
// MERGE COMPOSITE
// =============================================================================

/**
 * Merge mode options:
 * - 'append': Append all items from all inputs
 * - 'combine': Combine items by position (zip)
 * - 'multiplex': Create all combinations (cross join)
 * - 'chooseBranch': Output from only one branch based on which executed
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
 * Merge composite representing parallel branches merging into one node.
 * Created by merge() factory function.
 */
export interface MergeComposite<TBranches extends unknown[] = unknown[]> {
	/** The merge node */
	readonly mergeNode: NodeInstance<'n8n-nodes-base.merge', string, unknown>;
	/** Branches feeding into the merge */
	readonly branches: TBranches;
	/** Merge mode */
	readonly mode: MergeMode;
}

// =============================================================================
// SPLIT IN BATCHES
// =============================================================================

/**
 * Split in batches builder for loop constructs.
 * Created by splitInBatches() factory function.
 *
 * @example
 * ```typescript
 * workflow('batch-process', 'Batch Processing')
 *   .add(trigger(...))
 *   .then(node('n8n-nodes-base.spreadsheetFile', ...))
 *   .then(
 *     splitInBatches('v3', { parameters: { batchSize: 100 } })
 *       .done().then(sendSummaryEmail)  // When all batches complete
 *       .each().then(processItem).then(saveToDb).loop()  // Process each batch
 *   );
 * ```
 */
export interface SplitInBatchesBuilder<TOutput = unknown> {
	/**
	 * Chain from output 0 (all items processed - executes once when done)
	 */
	done(): SplitInBatchesDoneChain<TOutput>;

	/**
	 * Chain from output 1 (current batch - executes for each batch)
	 */
	each(): SplitInBatchesEachChain<TOutput>;
}

/**
 * Chain after .done() for finalization
 */
export interface SplitInBatchesDoneChain<_TOutput> {
	then<N extends NodeInstance<string, string, unknown>>(
		node: N,
	): SplitInBatchesDoneChain<N extends NodeInstance<string, string, infer O> ? O : unknown>;

	/**
	 * Chain to .each() from the done chain
	 */
	each(): SplitInBatchesEachChain<unknown>;
}

/**
 * Chain after .each() for batch processing
 */
export interface SplitInBatchesEachChain<TOutput> {
	then<N extends NodeInstance<string, string, unknown>>(
		node: N,
	): SplitInBatchesEachChain<N extends NodeInstance<string, string, infer O> ? O : unknown>;

	/**
	 * Connect back to the split in batches node (creates the loop)
	 */
	loop(): SplitInBatchesBuilder<TOutput>;
}

// =============================================================================
// EXPRESSIONS
// =============================================================================

/**
 * Expression context providing access to n8n runtime data.
 * Used in expression functions.
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
	/** Current item index (0-based) */
	itemIndex: number;
	/** Current run index */
	runIndex: number;
	/** Execution context */
	execution: ExecutionContext;
	/** Workflow metadata */
	workflow: WorkflowContext;
}

/**
 * Binary data context - provides access to binary data fields
 */
export interface BinaryContext {
	[fieldName: string]: BinaryField | (() => string[]);
	/** Get keys of all binary fields */
	keys(): string[];
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

// =============================================================================
// CODE NODE HELPERS
// =============================================================================

/**
 * Code node execution context for runOnceForAllItems
 */
export interface AllItemsContext {
	$input: {
		/** Get all input items */
		all(): IDataObject[];
		/** Get first input item */
		first(): IDataObject;
		/** Get last input item */
		last(): IDataObject;
		/** Get item at specific index */
		itemMatching(index: number): IDataObject;
	};
	/** Environment variables */
	$env: IDataObject;
	/** Workflow variables */
	$vars: IDataObject;
	/** External secrets */
	$secrets: IDataObject;
	/** Current DateTime */
	$now: Date;
	/** Start of today */
	$today: Date;
	/** Current run index */
	$runIndex: number;
	/** Execution context */
	$execution: ExecutionContext;
	/** Workflow metadata */
	$workflow: WorkflowContext;
	/** Reference another node's output by name */
	(nodeName: string): { json: IDataObject };
	/** JMESPath query helper */
	$jmespath: (data: unknown, expr: string) => unknown;
}

/**
 * Code node execution context for runOnceForEachItem
 */
export interface EachItemContext {
	$input: {
		/** Current input item */
		item: IDataObject;
	};
	/** Current item index (0-based) */
	$itemIndex: number;
	/** Environment variables */
	$env: IDataObject;
	/** Workflow variables */
	$vars: IDataObject;
	/** External secrets */
	$secrets: IDataObject;
	/** Current DateTime */
	$now: Date;
	/** Start of today */
	$today: Date;
	/** Current run index */
	$runIndex: number;
	/** Execution context */
	$execution: ExecutionContext;
	/** Workflow metadata */
	$workflow: WorkflowContext;
	/** Reference another node's output by name */
	(nodeName: string): { json: IDataObject };
	/** JMESPath query helper */
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
// PLACEHOLDER
// =============================================================================

/**
 * Placeholder marker for template parameters.
 * Created by placeholder() factory function.
 */
export interface PlaceholderValue {
	readonly __placeholder: true;
	readonly hint: string;
}

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Validation error codes
 */
export type ValidationErrorCode =
	| 'MISSING_TRIGGER'
	| 'DISCONNECTED_NODE'
	| 'MISSING_PARAMETER'
	| 'INVALID_CONNECTION'
	| 'CIRCULAR_REFERENCE'
	| 'INVALID_EXPRESSION';

/**
 * Validation error class
 */
export declare class ValidationError {
	readonly code: ValidationErrorCode;
	readonly message: string;
	readonly nodeName?: string;
	readonly parameterName?: string;
}

/**
 * Validation warning class (non-fatal issues)
 */
export declare class ValidationWarning {
	readonly code: ValidationErrorCode;
	readonly message: string;
	readonly nodeName?: string;
}

/**
 * Validation result
 */
export interface ValidationResult {
	/** Whether the workflow is valid (no errors) */
	valid: boolean;
	/** Fatal errors that prevent the workflow from running */
	errors: ValidationError[];
	/** Warnings about potential issues */
	warnings: ValidationWarning[];
}

/**
 * Validation options
 */
export interface ValidationOptions {
	/** Enable strict mode with more warnings */
	strictMode?: boolean;
	/** Skip disconnected node warnings */
	allowDisconnectedNodes?: boolean;
	/** Skip trigger requirement */
	allowNoTrigger?: boolean;
}

// =============================================================================
// SUBNODE CONFIGURATION (AI NODES)
// =============================================================================

/**
 * Subnode configuration for AI/LangChain nodes
 */
export interface SubnodeConfig {
	/** Language model subnode (e.g., OpenAI, Anthropic) */
	model?: NodeInstance<string, string, unknown>;
	/** Memory subnode for conversation context */
	memory?: NodeInstance<string, string, unknown>;
	/** Tool subnodes for agent capabilities */
	tools?: NodeInstance<string, string, unknown>[];
	/** Output parser subnode */
	outputParser?: NodeInstance<string, string, unknown>;
}

/**
 * Extended node config for AI nodes with subnodes
 */
export interface AINodeConfig<TParams = IDataObject> extends NodeConfig<TParams> {
	/** Subnodes for AI agent nodes */
	subnodes?: SubnodeConfig;
}

// =============================================================================
// FACTORY FUNCTIONS
// =============================================================================

/**
 * Create a workflow builder.
 *
 * @param id - Unique workflow ID
 * @param name - Display name for the workflow
 * @param settings - Optional workflow settings
 * @returns A workflow builder instance
 *
 * @example
 * ```typescript
 * const wf = workflow('my-workflow-id', 'My Workflow', { timezone: 'UTC' });
 * ```
 */
export declare function workflow(
	id: string,
	name: string,
	settings?: WorkflowSettings,
): WorkflowBuilder;

export declare namespace workflow {
	/**
	 * Import a workflow from n8n JSON format.
	 *
	 * @param json - n8n workflow JSON
	 * @returns A workflow builder instance
	 *
	 * @example
	 * ```typescript
	 * const existingWorkflow = await fetch('/api/workflow/123').then(r => r.json());
	 * const wf = workflow.fromJSON(existingWorkflow);
	 * wf.getNode('HTTP Request')?.update({ parameters: { url: 'new-url' } });
	 * ```
	 */
	export function fromJSON(json: WorkflowJSON): WorkflowBuilder;
}

/**
 * Create a node instance.
 *
 * @param type - Node type (e.g., 'n8n-nodes-base.httpRequest')
 * @param version - Node version (e.g., 'v4.2')
 * @param config - Node configuration
 * @returns A configured node instance
 *
 * @example HTTP Request node:
 * ```typescript
 * const httpNode = node('n8n-nodes-base.httpRequest', 'v4.2', {
 *   parameters: {
 *     url: 'https://api.example.com/users',
 *     method: 'GET',
 *     authentication: 'genericCredentialType',
 *     genericAuthType: 'httpHeaderAuth'
 *   },
 *   credentials: {
 *     httpHeaderAuth: { name: 'API Key', id: 'cred-123' }
 *   }
 * });
 * ```
 *
 * @example If node (conditional branching):
 * ```typescript
 * const ifNode = node('n8n-nodes-base.if', 'v2', {
 *   parameters: {
 *     conditions: {
 *       options: { caseSensitive: true },
 *       conditions: [{
 *         leftValue: '={{ $json.status }}',
 *         rightValue: 'active',
 *         operator: { type: 'string', operation: 'equals' }
 *       }]
 *     }
 *   }
 * });
 * ```
 *
 * @example Code node:
 * ```typescript
 * const codeNode = node('n8n-nodes-base.code', 'v2', {
 *   parameters: {
 *     jsCode: 'return items.map(item => ({ json: { doubled: item.json.value * 2 } }));',
 *     mode: 'runOnceForAllItems'
 *   }
 * });
 * ```
 *
 * @example Set node:
 * ```typescript
 * const setNode = node('n8n-nodes-base.set', 'v3.4', {
 *   parameters: {
 *     mode: 'manual',
 *     duplicateItem: false,
 *     assignments: {
 *       assignments: [
 *         { id: 'uuid1', name: 'fullName', value: '={{ $json.firstName }} {{ $json.lastName }}', type: 'string' },
 *         { id: 'uuid2', name: 'timestamp', value: '={{ $now.toISO() }}', type: 'string' }
 *       ]
 *     }
 *   }
 * });
 * ```
 */
export declare function node<TType extends string, TVersion extends string, TOutput = unknown>(
	type: TType,
	version: TVersion,
	config: NodeConfig,
): NodeInstance<TType, TVersion, TOutput>;

/**
 * Create a trigger node instance.
 *
 * @param type - Trigger node type (e.g., 'n8n-nodes-base.scheduleTrigger')
 * @param version - Node version (e.g., 'v1.2')
 * @param config - Node configuration
 * @returns A configured trigger node instance
 *
 * @example Schedule trigger (cron):
 * ```typescript
 * const schedule = trigger('n8n-nodes-base.scheduleTrigger', 'v1.2', {
 *   parameters: {
 *     rule: {
 *       interval: [{ field: 'cronExpression', expression: '0 9 * * 1-5' }]
 *     }
 *   }
 * });
 * ```
 *
 * @example Webhook trigger:
 * ```typescript
 * const webhook = trigger('n8n-nodes-base.webhook', 'v2', {
 *   parameters: {
 *     path: 'my-webhook',
 *     httpMethod: 'POST',
 *     responseMode: 'onReceived'
 *   }
 * });
 * ```
 *
 * @example Manual trigger:
 * ```typescript
 * const manual = trigger('n8n-nodes-base.manualTrigger', 'v1', {});
 * ```
 */
export declare function trigger<TType extends string, TVersion extends string, TOutput = unknown>(
	type: TType,
	version: TVersion,
	config: NodeConfig,
): TriggerInstance<TType, TVersion, TOutput>;

/**
 * Create a sticky note for workflow documentation.
 *
 * @param content - Markdown content for the sticky note
 * @param config - Optional configuration (color, position, size)
 * @returns A sticky note node instance
 *
 * @example
 * ```typescript
 * const note = sticky('## API Integration\n\nThis section fetches data from the API.', {
 *   color: 4,  // Yellow
 *   position: [80, -176],
 *   width: 300,
 *   height: 150
 * });
 * ```
 */
export declare function sticky(
	content: string,
	config?: StickyNoteConfig,
): NodeInstance<'n8n-nodes-base.stickyNote', 'v1', void>;

/**
 * Create a placeholder value for template parameters.
 * Placeholders are marked for user input when the workflow template is used.
 *
 * @param hint - Description shown to users (e.g., 'Enter your Slack channel')
 * @returns A placeholder value that serializes to placeholder format
 *
 * @example
 * ```typescript
 * const slackNode = node('n8n-nodes-base.slack', 'v2.2', {
 *   parameters: {
 *     channel: placeholder('Enter Slack channel (e.g., #general)'),
 *     text: '={{ $json.message }}'
 *   }
 * });
 * ```
 */
export declare function placeholder(hint: string): PlaceholderValue;

/**
 * Create a merge composite for parallel branch execution.
 * When used with workflow.then(), creates parallel branches that merge.
 *
 * @param branches - Array of nodes that will execute in parallel
 * @param config - Merge configuration
 * @returns A merge composite
 *
 * @example Parallel API calls:
 * ```typescript
 * const api1 = node('n8n-nodes-base.httpRequest', 'v4.2', { parameters: { url: 'https://api1.com' } });
 * const api2 = node('n8n-nodes-base.httpRequest', 'v4.2', { parameters: { url: 'https://api2.com' } });
 * const api3 = node('n8n-nodes-base.httpRequest', 'v4.2', { parameters: { url: 'https://api3.com' } });
 *
 * workflow('parallel-api', 'Parallel API Calls')
 *   .add(trigger(...))
 *   .then(merge([api1, api2, api3], { mode: 'append' }))
 *   .then(processAllResults);
 *
 * // Creates:
 * // trigger -> api1 ─┐
 * //         -> api2 ─┼─> merge -> processAllResults
 * //         -> api3 ─┘
 * ```
 */
export declare function merge<TBranches extends NodeInstance<string, string, unknown>[]>(
	branches: TBranches,
	config?: MergeConfig,
): MergeComposite<TBranches>;

/**
 * Create a split in batches builder for processing items in chunks.
 *
 * Split In Batches has two outputs:
 * - Output 0 (.done()): Executes ONCE when all batches are processed
 * - Output 1 (.each()): Executes for EACH batch, can .loop() back
 *
 * @param version - Node version (e.g., 'v3')
 * @param config - Node configuration including batchSize parameter
 * @returns A split in batches builder
 *
 * @example
 * ```typescript
 * workflow('batch-processing', 'Batch Processing')
 *   .add(trigger('n8n-nodes-base.manualTrigger', 'v1', {}))
 *   .then(node('n8n-nodes-base.spreadsheetFile', 'v4.2', {
 *     parameters: { operation: 'read' }
 *   }))
 *   .then(
 *     splitInBatches('v3', { parameters: { batchSize: 50 } })
 *       .done().then(node('n8n-nodes-base.slack', 'v2.2', {
 *         parameters: { text: 'All batches processed!' }
 *       }))
 *       .each()
 *         .then(node('n8n-nodes-base.httpRequest', 'v4.2', {
 *           parameters: { url: 'https://api.example.com/batch', method: 'POST' }
 *         }))
 *         .loop()  // Connect back to process next batch
 *   );
 * ```
 */
export declare function splitInBatches(
	version: string,
	config?: NodeConfig,
): SplitInBatchesBuilder<unknown>;

/**
 * Create a raw n8n expression string.
 * Use for complex expressions that can't be represented with serializeExpression.
 *
 * @param expression - The inner expression (without {{ }})
 * @returns n8n expression string like '={{ expression }}'
 *
 * @example
 * ```typescript
 * // Node reference
 * expr("$('Config').item.json.apiUrl")  // "={{ $('Config').item.json.apiUrl }}"
 *
 * // Template literal
 * expr('`Bearer ${$env.API_TOKEN}`')  // '={{ `Bearer ${$env.API_TOKEN}` }}'
 *
 * // Array methods
 * expr('$json.items.map(i => i.name).join(", ")')  // '={{ $json.items.map(i => i.name).join(", ") }}'
 * ```
 */
export declare function expr(expression: string): string;

/**
 * Serialize an expression function to n8n expression string.
 *
 * @param fn - Expression function
 * @returns n8n expression string
 *
 * @example
 * ```typescript
 * serializeExpression($ => $.json.name)        // '={{ $json.name }}'
 * serializeExpression($ => $.env.API_TOKEN)    // '={{ $env.API_TOKEN }}'
 * serializeExpression($ => $.itemIndex)        // '={{ $itemIndex }}'
 * ```
 */
export declare function serializeExpression<T>(fn: Expression<T>): string;

/**
 * Parse n8n expression string to extract the inner expression.
 *
 * @param expr - Expression string like '={{ $json.name }}'
 * @returns The inner expression or original string if not an expression
 */
export declare function parseExpression(expr: string): string;

/**
 * Check if a value is an n8n expression.
 */
export declare function isExpression(value: unknown): boolean;

/**
 * Create a code helper for executing once with access to all items.
 *
 * @param fn - Function that processes all items
 * @returns Code configuration for the Code node
 *
 * @example
 * ```typescript
 * const codeNode = node('n8n-nodes-base.code', 'v2', {
 *   parameters: {
 *     ...runOnceForAllItems<{ sum: number }>((ctx) => {
 *       const total = ctx.$input.all().reduce((acc, item) => acc + item.json.value, 0);
 *       return [{ json: { sum: total } }];
 *     })
 *   }
 * });
 * ```
 */
export declare function runOnceForAllItems<T = unknown>(
	fn: (ctx: AllItemsContext) => Array<{ json: T }>,
): CodeResult<T>;

/**
 * Create a code helper for executing once per item.
 *
 * @param fn - Function that processes a single item
 * @returns Code configuration for the Code node
 *
 * @example
 * ```typescript
 * const codeNode = node('n8n-nodes-base.code', 'v2', {
 *   parameters: {
 *     ...runOnceForEachItem<{ doubled: number }>((ctx) => {
 *       return { json: { doubled: ctx.$input.item.json.value * 2 } };
 *     })
 *   }
 * });
 * ```
 */
export declare function runOnceForEachItem<T = unknown>(
	fn: (ctx: EachItemContext) => { json: T } | null,
): CodeResult<T>;

/**
 * Validate a workflow for errors and warnings.
 *
 * @param workflow - The workflow to validate (WorkflowBuilder or WorkflowJSON)
 * @param options - Validation options
 * @returns Validation result with errors and warnings
 *
 * @example
 * ```typescript
 * const wf = workflow('id', 'Test').add(trigger(...)).then(node(...));
 * const result = validateWorkflow(wf);
 *
 * if (!result.valid) {
 *   console.error('Errors:', result.errors);
 * }
 * if (result.warnings.length > 0) {
 *   console.warn('Warnings:', result.warnings);
 * }
 * ```
 */
export declare function validateWorkflow(
	workflowOrJson: WorkflowBuilder | WorkflowJSON,
	options?: ValidationOptions,
): ValidationResult;

// =============================================================================
// COMMON NODE TYPES REFERENCE
// =============================================================================

/**
 * Common n8n node types reference:
 *
 * TRIGGERS:
 * - n8n-nodes-base.manualTrigger (v1) - Manual execution
 * - n8n-nodes-base.scheduleTrigger (v1.2) - Cron/interval scheduling
 * - n8n-nodes-base.webhook (v2) - HTTP webhook
 * - n8n-nodes-base.emailTrigger (v1) - Email trigger
 * - n8n-nodes-base.n8nTrigger (v1) - n8n events trigger
 *
 * DATA TRANSFORMATION:
 * - n8n-nodes-base.set (v3.4) - Set/modify fields
 * - n8n-nodes-base.code (v2) - JavaScript/Python code
 * - n8n-nodes-base.itemLists (v3.1) - List operations
 * - n8n-nodes-base.aggregate (v1) - Aggregate items
 * - n8n-nodes-base.splitOut (v1) - Split arrays
 *
 * FLOW CONTROL:
 * - n8n-nodes-base.if (v2) - Conditional branching
 * - n8n-nodes-base.switch (v3) - Multi-way branching
 * - n8n-nodes-base.merge (v3) - Merge branches
 * - n8n-nodes-base.splitInBatches (v3) - Batch processing with loop
 * - n8n-nodes-base.wait (v1.1) - Pause execution
 * - n8n-nodes-base.noOp (v1) - No operation (passthrough)
 *
 * HTTP/API:
 * - n8n-nodes-base.httpRequest (v4.2) - HTTP requests
 * - n8n-nodes-base.respondToWebhook (v1.1) - Webhook response
 *
 * APPS (examples):
 * - n8n-nodes-base.slack (v2.2) - Slack integration
 * - n8n-nodes-base.gmail (v2.1) - Gmail integration
 * - n8n-nodes-base.googleSheets (v4.5) - Google Sheets
 * - n8n-nodes-base.notion (v2.2) - Notion integration
 * - n8n-nodes-base.airtable (v2.1) - Airtable integration
 * - n8n-nodes-base.postgres (v2.5) - PostgreSQL database
 * - n8n-nodes-base.mysql (v2.4) - MySQL database
 * - n8n-nodes-base.mongodb (v1.2) - MongoDB database
 *
 * FILES:
 * - n8n-nodes-base.spreadsheetFile (v4.2) - Excel/CSV files
 * - n8n-nodes-base.readWriteFile (v1) - Local file operations
 * - n8n-nodes-base.convertToFile (v1.1) - Convert data to file
 *
 * AI/LANGCHAIN:
 * - @n8n/n8n-nodes-langchain.agent (v1.7) - AI agent
 * - @n8n/n8n-nodes-langchain.chainLlm (v1.4) - LLM chain
 * - @n8n/n8n-nodes-langchain.lmChatOpenAi (v1.2) - OpenAI chat model
 * - @n8n/n8n-nodes-langchain.lmChatAnthropic (v1.3) - Anthropic chat model
 * - @n8n/n8n-nodes-langchain.memoryBufferWindow (v1.2) - Buffer memory
 * - @n8n/n8n-nodes-langchain.toolCalculator (v1) - Calculator tool
 *
 * UTILITY:
 * - n8n-nodes-base.stickyNote (v1) - Documentation notes
 * - n8n-nodes-base.executeWorkflow (v1.1) - Call sub-workflow
 * - n8n-nodes-base.errorTrigger (v1) - Error handling trigger
 */

// =============================================================================
// EXPRESSION SYNTAX REFERENCE
// =============================================================================

/**
 * n8n Expression Syntax Reference:
 *
 * All expressions are wrapped in `={{ }}` format.
 *
 * ACCESSING DATA:
 * - `{{ $json.fieldName }}` - Current item's JSON field
 * - `{{ $json.nested.field }}` - Nested field access
 * - `{{ $json['field-with-dashes'] }}` - Bracket notation for special chars
 *
 * NODE REFERENCES:
 * - `{{ $('Node Name').item.json.field }}` - Access another node's output
 * - `{{ $('Node Name').first().json.field }}` - First item from node
 * - `{{ $('Node Name').all() }}` - All items from node
 *
 * CONTEXT VARIABLES:
 * - `{{ $env.VARIABLE_NAME }}` - Environment variable
 * - `{{ $vars.variableName }}` - Workflow variable
 * - `{{ $secrets.secretName }}` - External secret
 * - `{{ $now }}` - Current DateTime
 * - `{{ $today }}` - Start of today
 * - `{{ $itemIndex }}` - Current item index (0-based)
 * - `{{ $runIndex }}` - Current run index
 *
 * METADATA:
 * - `{{ $execution.id }}` - Execution ID
 * - `{{ $execution.mode }}` - 'test' or 'production'
 * - `{{ $workflow.id }}` - Workflow ID
 * - `{{ $workflow.name }}` - Workflow name
 *
 * BINARY DATA:
 * - `{{ $binary.data.fileName }}` - Binary field filename
 * - `{{ $binary.data.mimeType }}` - Binary field MIME type
 *
 * JAVASCRIPT IN EXPRESSIONS:
 * - `{{ $json.name.toUpperCase() }}` - String methods
 * - `{{ $json.items.length }}` - Array length
 * - `{{ $json.items.map(i => i.name).join(', ') }}` - Array methods
 * - `{{ $json.value > 10 ? 'high' : 'low' }}` - Ternary operator
 * - `{{ new Date().toISOString() }}` - Date operations
 *
 * TEMPLATE LITERALS:
 * - `{{ \`Hello ${$json.name}!\` }}` - String interpolation
 * - `{{ \`Bearer ${$env.API_TOKEN}\` }}` - With env vars
 */
