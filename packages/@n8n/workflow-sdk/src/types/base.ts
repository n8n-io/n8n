import type { IDataObject, INode, IConnections } from 'n8n-workflow';

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
 * Node reference function for accessing other node outputs
 */
export interface NodeReferenceFunction {
	(nodeName: string): { json: IDataObject; item: { json: IDataObject } };
}

/**
 * Extended expression context with node reference function
 */
export interface ExpressionContextWithRefs extends ExpressionContext {
	/** Reference another node's output */
	(nodeName: string): { json: IDataObject; item: { json: IDataObject } };
}

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
 * n8n workflow JSON format
 */
export interface WorkflowJSON {
	id?: string;
	name: string;
	nodes: INode[];
	connections: IConnections;
	settings?: WorkflowSettings;
	pinData?: Record<string, IDataObject[]>;
	meta?: {
		templateId?: string;
		instanceId?: string;
	};
}

/**
 * Subnode configuration for AI nodes
 */
export interface SubnodeConfig {
	/** Language model subnode */
	model?: NodeInstance<string, string, unknown>;
	/** Memory subnode */
	memory?: NodeInstance<string, string, unknown>;
	/** Tool subnodes */
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
