import type {
	AttributeValue,
	BuiltTelemetry,
	BuiltMemory,
	BuiltTool,
	CheckpointStore,
	RedactionOptions,
	RuntimeSkillSource,
	ModelConfig as NativeModelConfig,
	ScopedMemoryTaskEvent,
	Telemetry,
	Workspace,
} from '@n8n/agents';
import type {
	TaskList,
	InstanceAiFileAttachment,
	InstanceAiPermissions,
	McpTool,
	McpToolCallRequest,
	McpToolCallResult,
} from '@n8n/api-types';
import type { WorkflowJSON } from '@n8n/workflow-sdk';
import type {
	GenericValue,
	INodeInputConfiguration,
	INodeTypes,
	ITaskData,
	NodeConnectionType,
} from 'n8n-workflow';

// Service interfaces — dependency inversion so the package stays decoupled from n8n internals.
// The backend module provides concrete implementations via InstanceAiAdapterService.

import type { WorkflowCodeSnapshotInput } from './debug/run-debug-buffer';
import type { DomainAccessTracker } from './domain-access/domain-access-tracker';
import type { InstanceAiEventBus } from './event-bus/event-bus.interface';
import type { Logger } from './logger';
import type { McpClientManager } from './mcp/mcp-client-manager';
import type { IterationLog } from './storage/iteration-log';
import type { PatchableThreadMemory } from './storage/thread-patch';
import type { IdRemapper, TraceIndex, TraceWriter } from './tracing/trace-replay';
import type {
	VerificationResult,
	WorkflowBuildOutcome,
	WorkflowLoopAction,
	WorkflowLoopState,
	WorkflowVerificationObligation,
} from './workflow-loop/workflow-loop-state';
import type { BuilderTemplatesService } from './workspace/builder-templates-service';

// ── Data shapes ──────────────────────────────────────────────────────────────

export type InstanceAiToolRegistry = Map<string, BuiltTool>;

export interface WorkflowSummary {
	id: string;
	name: string;
	versionId: string;
	activeVersionId: string | null;
	isArchived: boolean;
	createdAt: string;
	updatedAt: string;
	tags?: string[];
}

export interface WorkflowDetail extends WorkflowSummary {
	nodes: WorkflowNode[];
	connections: Record<string, unknown>;
	settings?: Record<string, unknown>;
}

export interface WorkflowNode {
	name: string;
	type: string;
	parameters?: Record<string, unknown>;
	position: number[];
	webhookId?: string;
}

export interface ExecutionResult {
	executionId: string;
	status: 'running' | 'success' | 'error' | 'waiting' | 'unknown';
	data?: Record<string, unknown>;
	/**
	 * Every node that ran, including those whose last run produced zero output
	 * items (`data` omits those). Lets verification tell "ran and returned
	 * nothing" apart from "never reached".
	 */
	executedNodeNames?: string[];
	/** Name of the last node the execution processed, when available. */
	lastNodeExecuted?: string;
	error?: string;
	startedAt?: string;
	finishedAt?: string;
}

export interface NodeOutputResult {
	nodeName: string;
	items: unknown[];
	totalItems: number;
	returned: { from: number; to: number };
}

export interface ResolvedExpressionFailure {
	/** Dot-path into the parameters tree, e.g. "headers.parameters[0].value". */
	path: string;
	/** The raw expression as authored in the node parameters (incl. leading `=`). */
	raw: string;
	/** Error message from the expression engine. */
	error: string;
	/**
	 * `unreconstructable-context` flags failures stemming from expression contexts that
	 * only exist during a live execution (e.g. `$ai`, `$response`, `$request`,
	 * `$pageCount`, `$secrets`). These are expected and not real expression bugs.
	 */
	reason?: 'expression-error' | 'unreconstructable-context';
}

export interface EmptyExpressionResolution {
	/** Dot-path into the parameters tree. */
	path: string;
	/** The raw expression as authored in the node parameters (incl. leading `=`). */
	raw: string;
	/** The resolved value — one of `null`, `undefined`, or `""`. */
	resolved: null | undefined | '';
	/** Set when the expression references a non-reconstructed context var (`$vars`, `$secrets`, `$ai`, `$response`, `$request`, `$pageCount`) */
	reason?: 'unreconstructable-context';
}

export interface ResolvedNodeParametersResult {
	nodeName: string;
	runIndex: number;
	itemIndex: number;
	/**
	 * The node's parameters straight from the execution's workflow snapshot, with
	 * `{{ ... }}` expressions intact. Pair with `resolved` to see which value came
	 * from which expression. `null` when resolution was refused — see `suppressed`.
	 */
	parameters: Record<string, unknown> | null;
	/**
	 * Mirror of `parameters` with each expression leaf replaced by its resolved
	 * value (or `null` if it threw). Oversized leaves are replaced with a
	 * `{ _truncated, preview, originalLength }` marker.
	 *
	 * Returned as a JSON-stringified blob inside `<untrusted_data>` markers —
	 * resolved values can echo content from upstream nodes (webhook bodies,
	 * HTTP responses, etc.) and must be treated as untrusted by the agent.
	 *
	 * `null` when resolution was refused — see `suppressed`.
	 */
	resolved: string | null;
	/** Flat list of expressions that failed to resolve. Empty when all resolved cleanly. */
	failedExpressions: ResolvedExpressionFailure[];
	/**
	 * Expressions that resolved to `null`, `undefined`, or `""` — common cause of
	 * "this node ran but a parameter looked empty". Often the root cause for missing
	 * fields downstream when the runtime did not throw.
	 */
	emptyResolutions: EmptyExpressionResolution[];
	/** Present only when the resolution was refused (e.g. parameter-values gate is off). */
	suppressed?: 'parameter-values-disabled';
}

/**
 * Resolved-parameter bundle attached to a debug failedNode.
 * Same payload as `ResolvedNodeParametersResult` minus `nodeName` (redundant —
 * `failedNode.name` already carries it).
 */
export type ResolvedParametersDebugBundle = Omit<
	ResolvedNodeParametersResult,
	'nodeName' | 'suppressed'
>;

export interface ExecutionDebugInfo extends ExecutionResult {
	failedNode?: {
		name: string;
		type: string;
		error: string;
		inputData?: Record<string, unknown> | string;
		/**
		 * Re-resolved parameters for the failed node (parameters tree with expressions
		 * intact + the same tree with expressions substituted + failed/empty expression
		 * lists). Omitted when parameter values are gated off, when resolution itself
		 * errors (debug must not fail), or when the snapshot lacks node-type info.
		 */
		resolvedParameters?: ResolvedParametersDebugBundle;
	};
	nodeTrace: Array<{
		name: string;
		type: string;
		status: 'success' | 'error';
		startedAt?: string;
		finishedAt?: string;
	}>;
}

export interface CredentialSummary {
	id: string;
	name: string;
	type: string;
}

export interface CredentialDetail extends CredentialSummary {
	// NOTE: never include decrypted credential data
	nodesWithAccess?: Array<{ nodeType: string }>;
}

export interface NodeSummary {
	name: string;
	displayName: string;
	description: string;
	group: string[];
	version: number;
}

export interface NodeDescription extends NodeSummary {
	properties: Array<{
		displayName: string;
		name: string;
		type: string;
		required?: boolean;
		description?: string;
		default?: unknown;
		options?: Array<{ name: string; value: string | number | boolean }>;
	}>;
	credentials?: Array<{
		name: string;
		required?: boolean;
		displayOptions?: Record<string, unknown>;
	}>;
	inputs: string[];
	outputs: string[];
	webhooks?: unknown[];
	polling?: boolean;
	triggerPanel?: unknown;
}

// ── Service interfaces ───────────────────────────────────────────────────────

export interface WorkflowVersionSummary {
	versionId: string;
	name: string | null;
	description: string | null;
	authors: string;
	createdAt: string;
	autosaved: boolean;
	isActive: boolean;
	isCurrentDraft: boolean;
}

export interface WorkflowVersionDetail extends WorkflowVersionSummary {
	nodes: WorkflowNode[];
	connections: Record<string, unknown>;
}

export type WorkflowListStatus = 'active' | 'archived' | 'all';

export interface InstanceAiWorkflowService {
	list(options?: {
		query?: string;
		limit?: number;
		status?: WorkflowListStatus;
		scope?: 'project' | 'instance';
	}): Promise<WorkflowSummary[]>;
	get(workflowId: string): Promise<WorkflowDetail>;
	/** Get the workflow as the SDK's WorkflowJSON (full node data for generateWorkflowCode). */
	getAsWorkflowJSON(workflowId: string): Promise<WorkflowJSON>;
	/** Cheap version-only lookup. The adapter projects just `versionId` and
	 *  `updatedAt` from the workflow row, skipping `nodes`/`connections`/etc.
	 *  Use to validate per-session caches when the body isn't needed. */
	getWorkflowHead(workflowId: string): Promise<{ versionId: string; updatedAt: number }>;
	/** Single fetch returning the SDK WorkflowJSON together with the version it
	 *  was derived from. Use on cache miss (or drift) so the fresh body and the
	 *  versionId you'll pin to it land in one round-trip. */
	getWorkflowSnapshot(
		workflowId: string,
	): Promise<{ json: WorkflowJSON; versionId: string; updatedAt: number }>;
	/** Create a workflow from SDK-produced WorkflowJSON (full NodeJSON with typeVersion, credentials, etc.). */
	createFromWorkflowJSON(
		json: WorkflowJSON,
		options?: { projectId?: string; markAsAiTemporary?: boolean },
	): Promise<WorkflowDetail>;
	/** Update a workflow from SDK-produced WorkflowJSON. */
	updateFromWorkflowJSON(
		workflowId: string,
		json: WorkflowJSON,
		options?: { projectId?: string },
	): Promise<WorkflowDetail>;
	archive(workflowId: string): Promise<void>;
	unarchive(workflowId: string): Promise<void>;
	/**
	 * Clear the AI-builder temporary marker on a workflow — used to promote the
	 * main deliverable so the run-finish reap leaves it alone.
	 */
	clearAiTemporary(workflowId: string): Promise<void>;
	/**
	 * Archive the workflow only if it still carries the AI-builder temporary
	 * marker. Check-and-archive used by the run-finish reap so a main
	 * workflow whose marker was cleared survives even if its id is still in
	 * the orchestrator's in-memory created-set.
	 */
	archiveIfAiTemporary(workflowId: string): Promise<boolean>;
	publish(
		workflowId: string,
		options?: { versionId?: string; name?: string; description?: string },
	): Promise<{ activeVersionId: string }>;
	unpublish(workflowId: string): Promise<void>;
	/** List version history for a workflow (metadata only, no nodes/connections). */
	listVersions?(
		workflowId: string,
		options?: { limit?: number; skip?: number },
	): Promise<WorkflowVersionSummary[]>;
	/** Get full details of a specific version (including nodes and connections). */
	getVersion?(workflowId: string, versionId: string): Promise<WorkflowVersionDetail>;
	/** Restore a workflow to a previous version by overwriting the current draft. */
	restoreVersion?(workflowId: string, versionId: string): Promise<void>;
	/** Update name/description of a workflow version (licensed: namedVersions). */
	updateVersion?(
		workflowId: string,
		versionId: string,
		data: { name?: string | null; description?: string | null },
	): Promise<void>;
	/** Per-node `ITaskData[]` of the workflow's most recent execution.
	 *  Equivalent to `workflowsStore.getWorkflowRunData` on the canvas — used by
	 *  workflow validation to detect previously-failed nodes. Returns `null`
	 *  when the workflow has no execution history or the caller has no access. */
	getLatestRunData?(workflowId: string): Promise<Record<string, ITaskData[]> | null>;
}

export interface ExecutionSummary {
	id: string;
	workflowId: string;
	workflowName: string;
	status: string;
	startedAt: string;
	finishedAt?: string;
	mode: string;
}

export interface InstanceAiExecutionService {
	list(options?: {
		workflowId?: string;
		status?: string;
		limit?: number;
	}): Promise<ExecutionSummary[]>;
	run(
		workflowId: string,
		inputData?: Record<string, unknown>,
		options?: {
			timeout?: number;
			pinData?: Record<string, unknown[]>;
			/**
			 * Nodes whose pin data simulates a destructive operation, keyed by node
			 * name. Persisted onto the saved execution (`resultData.simulation`) so
			 * the editor can label simulated outputs.
			 */
			simulation?: Record<string, { reason: string }>;
			/** When set, execute this specific trigger node instead of auto-detecting. */
			triggerNodeName?: string;
		},
	): Promise<ExecutionResult>;
	getStatus(executionId: string): Promise<ExecutionResult>;
	getResult(executionId: string): Promise<ExecutionResult>;
	stop(executionId: string): Promise<{ success: boolean; message: string }>;
	getDebugInfo(executionId: string): Promise<ExecutionDebugInfo>;
	getNodeOutput(
		executionId: string,
		nodeName: string,
		options?: { startIndex?: number; maxItems?: number },
	): Promise<NodeOutputResult>;
	/**
	 * Re-resolve a node's parameter expressions against a saved execution's data.
	 * Server-side replay of the editor's resolved-parameter view, so the agent can
	 * see exactly what each parameter resolved to (and which expressions failed)
	 * for a given item in a past run.
	 */
	getResolvedNodeParameters(
		executionId: string,
		nodeName: string,
		options?: { itemIndex?: number; runIndex?: number },
	): Promise<ResolvedNodeParametersResult>;
}

export interface CredentialTypeSearchResult {
	type: string;
	displayName: string;
}

export interface InstanceAiCredentialService {
	/**
	 * List credentials.
	 *
	 * Without `workflowId` / `projectId`: returns every credential the user has
	 * read access to anywhere in the instance. Use this for informational lookups.
	 *
	 * With `workflowId` or `projectId`: returns only credentials usable in that
	 * workflow / project (the same scoping the editor's credential picker uses).
	 * Use this whenever the result feeds a setup card the user will pick from —
	 * the save path enforces the same scope and will reject anything outside it.
	 */
	list(options?: {
		type?: string;
		workflowId?: string;
		projectId?: string;
	}): Promise<CredentialSummary[]>;
	get(credentialId: string): Promise<CredentialDetail>;
	delete(credentialId: string): Promise<void>;
	test(credentialId: string): Promise<{ success: boolean; message?: string }>;
	/** Whether a credential type has a test function. When false, skip testing. */
	isTestable?(credentialType: string): Promise<boolean>;
	getDocumentationUrl?(credentialType: string): Promise<string | null>;
	getCredentialFields?(
		credentialType: string,
	): CredentialFieldInfo[] | Promise<CredentialFieldInfo[]>;
	/** Search available credential types by keyword. Returns matching types with display names. */
	searchCredentialTypes?(query: string): Promise<CredentialTypeSearchResult[]>;
	getAccountContext?(credentialId: string): Promise<{ accountIdentifier?: string }>;
}

export interface CredentialFieldInfo {
	name: string;
	displayName: string;
	type: string;
	required: boolean;
	description?: string;
}

export interface ExploreResourcesParams {
	nodeType: string;
	version: number;
	methodName: string;
	methodType: 'listSearch' | 'loadOptions';
	credentialType: string;
	credentialId: string;
	filter?: string;
	paginationToken?: string;
	currentNodeParameters?: Record<string, unknown>;
}

export interface ExploreResourcesResult {
	results: Array<{
		name: string;
		value: string | number | boolean;
		url?: string;
		description?: string;
	}>;
	paginationToken?: string;
	/** The `@builderHint` from the node property whose method was queried, if any.
	 *  Surfaced alongside results so agents that skip the `type-definition` step
	 *  still receive selection guidance at the point of decision. */
	builderHint?: string;
}

export interface InstanceAiNodeService {
	listAvailable(options?: { query?: string }): Promise<NodeSummary[]>;
	getDescription(nodeType: string, version?: number): Promise<NodeDescription>;
	/** Return all node types with the richer fields needed by NodeSearchEngine. */
	listSearchable(): Promise<SearchableNodeDescription[]>;
	/** Return the TypeScript type definition for a node (from dist/node-definitions/). */
	getNodeTypeDefinition?(
		nodeType: string,
		options?: {
			version?: string;
			resource?: string;
			operation?: string;
			mode?: string;
		},
	): Promise<{ content: string; version?: string; error?: string; builderHint?: string } | null>;
	/** List available resource/operation discriminators for a node. Null for flat nodes. */
	listDiscriminators?(
		nodeType: string,
	): Promise<{ resources: Array<{ name: string; operations: string[] }> } | null>;
	/** Query real resources via a node's listSearch or loadOptions methods (e.g. list spreadsheets, models). */
	exploreResources?(params: ExploreResourcesParams): Promise<ExploreResourcesResult>;
	/** Compute parameter issues for a node (mirrors builder's NodeHelpers.getNodeParametersIssues). */
	getParameterIssues?(
		nodeType: string,
		typeVersion: number,
		parameters: Record<string, unknown>,
	): Promise<Record<string, string[]>>;
	/** Return all credential types a node requires (displayable + dynamic + assigned). */
	getNodeCredentialTypes?(
		nodeType: string,
		typeVersion: number,
		parameters: Record<string, unknown>,
		existingCredentials?: Record<string, unknown>,
	): Promise<string[]>;
	/** Resolve a node's input definitions in the context of a full workflow so
	 *  expression-based dynamic inputs evaluate against current parameter values.
	 *  Mirrors NodeHelpers.getNodeInputs. Returns the same post-evaluation shape
	 *  as INodeTypeDescription['inputs']. Used by workflow validation to detect
	 *  required-but-unconnected inputs (e.g. AI Agent missing language model). */
	getResolvedNodeInputs?(
		workflow: WorkflowJSON,
		nodeName: string,
	): Promise<Array<NodeConnectionType | INodeInputConfiguration>>;
}

/** Richer node type shape that includes inputs, outputs, codex, and builderHint.
 *  Returned by `listSearchable()` and consumed by `NodeSearchEngine`. */
export interface SearchableNodeDescription {
	name: string;
	displayName: string;
	description: string;
	version: number | number[];
	inputs: string[] | string;
	outputs: string[] | string;
	codex?: { alias?: string[] };
	builderHint?: {
		message?: string;
		inputs?: Record<string, { required: boolean; displayOptions?: Record<string, unknown> }>;
		outputs?: Record<string, { required?: boolean; displayOptions?: Record<string, unknown> }>;
	};
}

// ── Data table shapes ────────────────────────────────────────────────────────

export interface DataTableSummary {
	id: string;
	name: string;
	projectId?: string;
	columns: Array<{ id: string; name: string; type: string }>;
	createdAt: string;
	updatedAt: string;
}

export interface DataTableReference {
	id: string;
	name: string;
	projectId: string;
}

export interface DataTableColumnInfo {
	id: string;
	name: string;
	type: 'string' | 'number' | 'boolean' | 'date';
	index: number;
}

export interface DataTableFilterInput {
	type: 'and' | 'or';
	filters: Array<{
		columnName: string;
		condition: 'eq' | 'neq' | 'like' | 'gt' | 'gte' | 'lt' | 'lte';
		value: string | number | boolean | null;
	}>;
}

// ── Data table service ───────────────────────────────────────────────────────

/**
 * Optional disambiguator accepted by every id-based data-table service call.
 * When the orchestrator passes a table NAME instead of a UUID, the adapter's
 * resolver filters the name lookup to this project so collisions across
 * projects don't require the orchestrator to guess the right UUID. When the
 * orchestrator passes a UUID AND a mismatched `projectId`, the adapter rejects
 * the call (the resolver never silently drops `projectId`).
 */
export interface DataTableIdOptions {
	projectId?: string;
}

export type DataTableReferencePermission = 'read' | 'readRow' | 'writeRow' | 'update' | 'delete';

export interface InstanceAiDataTableService {
	list(options?: { projectId?: string }): Promise<DataTableSummary[]>;
	create(
		name: string,
		columns: Array<{ name: string; type: 'string' | 'number' | 'boolean' | 'date' }>,
		options?: { projectId?: string },
	): Promise<DataTableSummary>;
	delete(dataTableId: string, options?: DataTableIdOptions): Promise<void>;
	resolveTableReference?(
		dataTableId: string,
		options?: DataTableIdOptions & { permission?: DataTableReferencePermission },
	): Promise<DataTableReference>;
	getSchema(dataTableId: string, options?: DataTableIdOptions): Promise<DataTableColumnInfo[]>;
	addColumn(
		dataTableId: string,
		column: { name: string; type: 'string' | 'number' | 'boolean' | 'date' },
		options?: DataTableIdOptions,
	): Promise<DataTableColumnInfo>;
	deleteColumn(dataTableId: string, columnId: string, options?: DataTableIdOptions): Promise<void>;
	renameColumn(
		dataTableId: string,
		columnId: string,
		newName: string,
		options?: DataTableIdOptions,
	): Promise<void>;
	queryRows(
		dataTableId: string,
		options?: {
			filter?: DataTableFilterInput;
			limit?: number;
			offset?: number;
			projectId?: string;
		},
	): Promise<{ count: number; data: Array<Record<string, unknown>> }>;
	insertRows(
		dataTableId: string,
		rows: Array<Record<string, unknown>>,
		options?: DataTableIdOptions,
	): Promise<{ insertedCount: number; dataTableId: string; tableName: string; projectId: string }>;
	updateRows(
		dataTableId: string,
		filter: DataTableFilterInput,
		data: Record<string, unknown>,
		options?: DataTableIdOptions,
	): Promise<{ updatedCount: number; dataTableId: string; tableName: string; projectId: string }>;
	deleteRows(
		dataTableId: string,
		filter: DataTableFilterInput,
		options?: DataTableIdOptions,
	): Promise<{ deletedCount: number; dataTableId: string; tableName: string; projectId: string }>;
}

// ── Web Research ────────────────────────────────────────────────────────────

export interface FetchedPage {
	url: string;
	finalUrl: string;
	title: string;
	content: string;
	truncated: boolean;
	contentLength: number;
	safetyFlags?: {
		jsRenderingSuspected?: boolean;
		loginRequired?: boolean;
	};
}

export interface WebSearchResult {
	title: string;
	url: string;
	snippet: string;
	publishedDate?: string;
}

export interface WebSearchResponse {
	query: string;
	results: WebSearchResult[];
}

export interface InstanceAiWebResearchService {
	/** Search the web. Only available when a search API key is configured. */
	search?(
		query: string,
		options?: {
			maxResults?: number;
			includeDomains?: string[];
			excludeDomains?: string[];
		},
	): Promise<WebSearchResponse>;

	fetchUrl(
		url: string,
		options?: {
			maxContentLength?: number;
			maxResponseBytes?: number;
			timeoutMs?: number;
			/**
			 * Called before following each redirect hop and on cache hits with a
			 * cross-host `finalUrl`. Throw to abort the fetch (the tool will
			 * suspend for HITL approval). Internal — not part of the public API.
			 */
			authorizeUrl?: (url: string) => Promise<void>;
		},
	): Promise<FetchedPage>;
}

// ── Filesystem MCP server ────────────────────────────────────────────────────

/**
 * Minimal interface for a connected filesystem MCP server.
 * Implemented by `LocalGateway` (remote daemon) in the CLI module.
 */
export interface LocalMcpServer {
	getAvailableTools(): McpTool[];
	/** Return tools that belong to the given category (based on annotations.category). */
	getToolsByCategory(category: string): McpTool[];
	callTool(req: McpToolCallRequest): Promise<McpToolCallResult>;
}

// ── Workspace shapes ────────────────────────────────────────────────────────

export interface ProjectSummary {
	id: string;
	name: string;
	type: 'personal' | 'team';
}

export interface FolderSummary {
	id: string;
	name: string;
	parentFolderId: string | null;
}

// ── Workspace service ───────────────────────────────────────────────────────

export interface InstanceAiWorkspaceService {
	// Projects
	getProject?(projectId: string): Promise<ProjectSummary | null>;
	listProjects(): Promise<ProjectSummary[]>;

	// Folders (licensed: feat:folders)
	listFolders?(projectId: string): Promise<FolderSummary[]>;
	createFolder?(name: string, projectId: string, parentFolderId?: string): Promise<FolderSummary>;
	deleteFolder?(folderId: string, projectId: string, transferToFolderId?: string): Promise<void>;

	// Workflow organization (moveWorkflowToFolder requires feat:folders)
	moveWorkflowToFolder?(workflowId: string, folderId: string): Promise<void>;
	tagWorkflow(workflowId: string, tagNames: string[]): Promise<string[]>;

	// Tags
	listTags(): Promise<Array<{ id: string; name: string }>>;
	createTag(name: string): Promise<{ id: string; name: string }>;

	// Execution cleanup
	cleanupTestExecutions(
		workflowId: string,
		options?: { olderThanHours?: number },
	): Promise<{ deletedCount: number }>;
}

// ── Local gateway status ─────────────────────────────────────────────────────

export type LocalGatewayStatus =
	| {
			status: 'connected';
			capabilities: string[];
	  }
	| {
			status: 'disabledGlobally' | 'disconnected' | 'disabled';
	  };

// ── Context bundle ───────────────────────────────────────────────────────────

export interface InstanceAiContext {
	userId: string;
	projectId?: string;
	workflowService: InstanceAiWorkflowService;
	executionService: InstanceAiExecutionService;
	credentialService: InstanceAiCredentialService;
	nodeService: InstanceAiNodeService;
	dataTableService: InstanceAiDataTableService;
	webResearchService?: InstanceAiWebResearchService;
	/** Curated workflow-template provider — materializes `knowledge-base/templates/` in the sandbox. */
	templatesService?: BuilderTemplatesService;
	workspaceService?: InstanceAiWorkspaceService;
	/**
	 * Connected remote MCP server (e.g. computer-use daemon). When set, dynamic tools are created from its advertised capabilities.
	 */
	localMcpServer?: LocalMcpServer;
	/** Connection state of the local gateway — drives system prompt guidance. */
	localGatewayStatus?: LocalGatewayStatus;
	/** Per-action HITL permission overrides. When absent, tools default to requiring approval. */
	permissions?: InstanceAiPermissions;
	/** When set, `runWorkflow: 'always_allow'` only short-circuits HITL approval for these workflow IDs.
	 *  Used by checkpoint follow-up runs to scope the override to the workflows the checkpoint is
	 *  verifying — `executions(action="run")` on any other workflow still requires user approval. */
	allowedRunWorkflowIds?: ReadonlySet<string>;
	/** Fallback scope for checkpoint follow-up runs when replay/runtime workflow IDs are remapped. */
	allowedRunWorkflowNames?: ReadonlySet<string>;
	/** Force `executions(action="run")` through HITL even when a scoped checkpoint override exists. */
	requireRunWorkflowApproval?: boolean;
	/** Thread-level "always allow" grants the user has approved (keys like `executions:run`).
	 *  Loaded per run from persisted thread state so a grant survives reload/navigation and
	 *  is visible across mains. Tools consult this to skip HITL for already-granted actions. */
	sessionApprovedToolKeys?: ReadonlySet<string>;
	/** Persist a thread-level "always allow" grant for the given key. Invoked by a tool when it
	 *  resumes from a `scope: 'session'` approval. No-op in contexts without persistence. */
	grantSessionToolApproval?: (key: string) => Promise<void>;
	/** When true, the instance is in read-only mode (source control branchReadOnly). */
	branchReadOnly?: boolean;
	/** When `false`, callers must avoid surfacing node parameter values (or anything derived from them
	 *  — e.g. raw execution-error text) to the LLM. Defaults to `true` when
	 *  absent so package-only / test contexts behave unchanged. */
	allowSendingParameterValues?: boolean;
	/** Human-readable hints about licensed features that are NOT available on this instance.
	 *  Injected into the system prompt so the agent can explain why certain capabilities are missing. */
	licenseHints?: string[];
	/** Domain access tracker for HITL gating of fetch-url and similar tools. */
	domainAccessTracker?: DomainAccessTracker;
	/** Current run ID — used for transient (allow_once) domain approvals. */
	runId?: string;
	/** Records workflow code snapshots for the run debug buffer (dev tooling). */
	recordWorkflowCodeSnapshot?: (snapshot: WorkflowCodeSnapshotInput) => void;
	/**
	 * IDs of workflows the agent created during the **currently active plan
	 * cycle**. Populated by build-workflow on every successful create, and
	 * hydrated at run start from the persisted plan graph when — and only when —
	 * the plan is still `active` or
	 * `awaiting_replan`, so replan follow-up runs keep the bypass active but
	 * the window closes as soon as the plan settles. Consumed by the delete
	 * handler to skip the confirmation gate when the agent cleans up its own
	 * in-flight artifacts. Lazily initialized on first create.
	 */
	aiCreatedWorkflowIds?: Set<string>;
	/**
	 * File attachments from the current user message. Runtime-only — not
	 * persisted. Used to register `parse-file` and supply data to the parser.
	 * Workflow (resource) attachments are handled separately by the adapter.
	 */
	currentUserAttachments?: InstanceAiFileAttachment[];
	/** Logger for diagnostics from domain tools. */
	logger: Logger;
	/** Optional telemetry sink for domain tools. */
	trackTelemetry?: (eventName: string, properties: Record<string, GenericValue>) => void;
	/** Shared runtime workspace for workflow source files and other sandbox-backed artifacts. */
	workspace?: Workspace;
	/** Current thread identity, used by workflow source file bindings and other thread-local state. */
	threadId?: string;
	/** Thread memory adapter used for thread-local metadata. */
	threadMemory?: PatchableThreadMemory;
	/** Synchronous node-types provider used by host-side schema validation
	 *  (`validateWorkflow` from `@n8n/workflow-sdk`). Plumbed from the CLI
	 *  adapter; absent in pure-package contexts where no NodeTypes instance
	 *  is reachable. */
	nodeTypesProvider?: INodeTypes;
	/**
	 * Runtime-only workflow build loop context. The direct `build-workflow` tool
	 * reports build outcomes here so planned build follow-ups and verification
	 * tools can share the same work item without a detached builder sub-agent.
	 */
	workflowBuildContext?: {
		threadId: string;
		runId: string;
		taskId: string;
		workItemId: string;
		/**
		 * True for replan/checkpoint follow-ups where an approved plan already
		 * exists and the builder may retry directly without creating a new plan.
		 */
		allowPostPlanWorkflowCreate?: boolean;
		/** True when the active planned build task's final deliverable is a supporting workflow. */
		isSupportingWorkflowTask?: boolean;
		plannedTaskService?: PlannedTaskService;
		workflowTaskService?: WorkflowTaskService;
		onBuildOutcome?: (outcome: WorkflowBuildOutcome) => void | Promise<void>;
	};
}

// ── Task storage ─────────────────────────────────────────────────────────────

export interface TaskStorage {
	get(threadId: string): Promise<TaskList | null>;
	save(threadId: string, tasks: TaskList): Promise<void>;
}

// ── Planned task graphs ─────────────────────────────────────────────────────

export const PLANNED_TASK_KINDS = ['delegate', 'build-workflow', 'checkpoint'] as const;
export const STORED_PLANNED_TASK_KINDS = PLANNED_TASK_KINDS;
export type PlannedTaskKind = (typeof STORED_PLANNED_TASK_KINDS)[number];

export interface PlannedTask {
	id: string;
	title: string;
	kind: PlannedTaskKind;
	spec: string;
	deps: string[];
	tools?: string[];
	/** Existing workflow ID for build-workflow tasks that modify an existing workflow. */
	workflowId?: string;
	/**
	 * True when the build-workflow task's final deliverable is intentionally a
	 * supporting sub-workflow. Auxiliary supporting workflows created inside a
	 * larger main-workflow task should not set this.
	 */
	isSupportingWorkflow?: boolean;
}

export type PlannedTaskStatus = 'planned' | 'running' | 'succeeded' | 'failed' | 'cancelled';

export interface PlannedTaskRecord extends PlannedTask {
	status: PlannedTaskStatus;
	agentId?: string;
	backgroundTaskId?: string;
	result?: string;
	error?: string;
	outcome?: Record<string, unknown>;
	startedAt?: number;
	finishedAt?: number;
}

export type PlannedTaskGraphStatus =
	| 'awaiting_approval'
	| 'active'
	| 'awaiting_replan'
	| 'completed'
	| 'cancelled';

export interface PlannedTaskGraph {
	planRunId: string;
	messageGroupId?: string;
	postBuildRunApprovalRequired?: boolean;
	status: PlannedTaskGraphStatus;
	tasks: PlannedTaskRecord[];
}

export interface PlannedWorkflowVerification {
	task: PlannedTaskRecord;
	obligation: WorkflowVerificationObligation;
	outcome?: WorkflowBuildOutcome;
}

export type PlannedTaskSchedulerAction =
	| { type: 'none'; graph: PlannedTaskGraph | null }
	| { type: 'dispatch'; graph: PlannedTaskGraph; tasks: PlannedTaskRecord[] }
	| { type: 'orchestrate-build-workflow'; graph: PlannedTaskGraph; tasks: PlannedTaskRecord[] }
	| { type: 'orchestrate-checkpoint'; graph: PlannedTaskGraph; tasks: PlannedTaskRecord[] }
	| {
			type: 'orchestrate-workflow-verification';
			graph: PlannedTaskGraph;
			verification: PlannedWorkflowVerification;
	  }
	| { type: 'replan'; graph: PlannedTaskGraph; failedTask: PlannedTaskRecord }
	| { type: 'synthesize'; graph: PlannedTaskGraph };

export interface PlannedTaskService {
	createPlan(
		threadId: string,
		tasks: PlannedTask[],
		metadata: {
			planRunId: string;
			messageGroupId?: string;
			postBuildRunApprovalRequired?: boolean;
		},
	): Promise<PlannedTaskGraph>;
	getGraph(threadId: string): Promise<PlannedTaskGraph | null>;
	markRunning(
		threadId: string,
		taskId: string,
		update: { agentId?: string; backgroundTaskId?: string; startedAt?: number },
	): Promise<PlannedTaskGraph | null>;
	markSucceeded(
		threadId: string,
		taskId: string,
		update: { result?: string; outcome?: Record<string, unknown>; finishedAt?: number },
	): Promise<PlannedTaskGraph | null>;
	markFailed(
		threadId: string,
		taskId: string,
		update: { error?: string; finishedAt?: number },
	): Promise<PlannedTaskGraph | null>;
	markCancelled(
		threadId: string,
		taskId: string,
		update?: { error?: string; finishedAt?: number },
	): Promise<PlannedTaskGraph | null>;
	markCheckpointSucceeded(
		threadId: string,
		taskId: string,
		update: { result?: string; outcome?: Record<string, unknown>; finishedAt?: number },
	): Promise<CheckpointSettleResult>;
	markCheckpointFailed(
		threadId: string,
		taskId: string,
		update: {
			error?: string;
			/** Structured verification outcome (executionId, failureNode, etc.) so
			 *  replans have execution context, not just a flat error string. */
			outcome?: Record<string, unknown>;
			finishedAt?: number;
		},
	): Promise<CheckpointSettleResult>;
	/** Rewind a running checkpoint back to `planned` after a scheduling race
	 *  prevented its follow-up from starting. Non-destructive — dependents are
	 *  untouched and the next tick re-emits `orchestrate-checkpoint`. */
	revertCheckpointToPlanned(threadId: string, taskId: string): Promise<CheckpointSettleResult>;
	/** Rewind a running build-workflow task after a scheduling race prevented
	 *  its orchestrator follow-up from starting. */
	revertBuildWorkflowToPlanned(threadId: string, taskId: string): Promise<CheckpointSettleResult>;
	tick(
		threadId: string,
		options?: {
			availableSlots?: number;
			pendingWorkflowVerification?: PlannedWorkflowVerification;
		},
	): Promise<PlannedTaskSchedulerAction>;
	clear(threadId: string): Promise<void>;
	/** Transition an `awaiting_approval` graph → `active` after the user
	 *  approves the plan. No-op on any other status. */
	approvePlan(threadId: string): Promise<PlannedTaskGraph | null>;
	/** Transition an `awaiting_approval` graph → `cancelled` after the user
	 *  denies the plan outright. No-op on any other status. */
	denyPlan(threadId: string): Promise<PlannedTaskGraph | null>;
	/** Revert an `awaiting_replan` or `completed` graph back to `active`. Used by
	 *  the service when a replan or synthesize follow-up couldn't start. */
	revertToActive(threadId: string): Promise<PlannedTaskGraph | null>;
}

/**
 * Result of a guarded checkpoint settlement. The mutators only transition a task
 * when its kind is `checkpoint` AND its status is `running`, so callers can read
 * the `reason` to report a precise error back to the LLM.
 */
export type CheckpointSettleResult =
	| { ok: true; graph: PlannedTaskGraph }
	| {
			ok: false;
			reason: 'not-found' | 'wrong-kind' | 'wrong-status';
			actual?: { kind?: PlannedTaskKind; status?: PlannedTaskStatus };
	  };

// ── MCP ──────────────────────────────────────────────────────────────────────

export interface McpServerConfig {
	name: string;
	url?: string;
	transport?: 'sse' | 'streamableHttp';
	command?: string;
	args?: string[];
	env?: Record<string, string>;
	toolFilter?: { mode: 'allow' | 'exclude'; tools: string[] };
	fetch?: typeof fetch;
	/**
	 * Optional cache discriminator used by `McpClientManager` when a server's
	 * connection behavior depends on runtime context (for example, per-user auth
	 * in a custom `fetch` implementation).
	 */
	cacheKey?: string;
}

// ── Memory ───────────────────────────────────────────────────────────────────

export interface InstanceAiMemoryConfig {
	/** Thread TTL in days. Threads older than this are auto-expired on cleanup. 0 = no expiration. */
	threadTtlDays?: number;
	observationalMemory?: {
		observerThresholdTokens: number;
		reflectorThresholdTokens: number;
	};
}

// ── Model configuration ─────────────────────────────────────────────────────

type NativeLanguageModelConfig = Extract<NativeModelConfig, { specificationVersion: string }>;

/** Model identifier: plain string for built-in providers, object for OpenAI-compatible endpoints,
 *  or a pre-built LanguageModel instance (e.g. from @ai-sdk/anthropic with a custom baseURL).
 *
 *  The LanguageModel variant exists for proxy routes that need a provider-native transport.
 *  For example, Vertex AI Anthropic routes use the native Messages API at `/v1/messages`, so
 *  we must use `@ai-sdk/anthropic` directly instead of routing through an OpenAI-compatible
 *  `/chat/completions` adapter. */
export type ModelConfig =
	| string
	| { id: `${string}/${string}`; url: string; apiKey?: string; headers?: Record<string, string> }
	| NativeLanguageModelConfig;

/** Configuration for routing requests through an AI service proxy (LangSmith tracing, Brave Search, etc.). */
export interface ServiceProxyConfig {
	/** Proxy endpoint, e.g. '{baseUrl}/langsmith' or '{baseUrl}/brave-search' */
	apiUrl: string;
	/**
	 * Returns fresh auth headers for proxied requests.
	 *
	 * Called on each outbound request so that short-lived proxy tokens are
	 * transparently refreshed during long-running agent turns.
	 */
	getAuthHeaders: () => Promise<Record<string, string>>;
}

// ── LangSmith tracing ────────────────────────────────────────────────────────

export interface InstanceAiTraceRun {
	id: string;
	name: string;
	runType: string;
	projectName: string;
	startTime: number;
	endTime?: number;
	traceId: string;
	otelTraceId?: string;
	otelSpanId?: string;
	dottedOrder: string;
	executionOrder: number;
	childExecutionOrder: number;
	parentRunId?: string;
	tags?: string[];
	metadata?: Record<string, unknown>;
	inputs?: Record<string, unknown>;
	outputs?: Record<string, unknown>;
	error?: string;
}

export interface InstanceAiTraceRunInit {
	name: string;
	canonicalName?: string;
	runType?: string;
	tags?: string[];
	metadata?: Record<string, unknown>;
	inputs?: unknown;
}

export interface InstanceAiTraceRunFinishOptions {
	outputs?: unknown;
	metadata?: Record<string, unknown>;
	error?: string;
}

export interface InstanceAiToolTraceOptions {
	agentRole?: string;
	tags?: string[];
	metadata?: Record<string, unknown>;
}

export type TraceReplayMode = 'record' | 'replay' | 'off';

export interface InstanceAiTelemetryOptions {
	agentRole: string;
	functionId?: string;
	executionMode?: 'foreground' | 'background' | 'background_subagent' | 'resume' | 'internal';
	metadata?: Record<string, AttributeValue | undefined>;
}

export interface InstanceAiTraceContext {
	projectName: string;
	traceKind:
		| 'message_turn'
		| 'orchestrator_resume'
		| 'background_subagent'
		| 'detached_subagent'
		| 'internal_operation';
	proxyConfig?: ServiceProxyConfig;
	rootRun: InstanceAiTraceRun;
	actorRun: InstanceAiTraceRun;
	/** Compatibility alias for existing foreground-trace call sites. */
	messageRun: InstanceAiTraceRun;
	/** Compatibility alias for existing foreground-trace call sites. */
	orchestratorRun: InstanceAiTraceRun;
	startChildRun: (
		parentRun: InstanceAiTraceRun,
		options: InstanceAiTraceRunInit,
	) => Promise<InstanceAiTraceRun>;
	withRunTree: <T>(run: InstanceAiTraceRun, fn: () => Promise<T>) => Promise<T>;
	withActiveSpan: <T>(run: InstanceAiTraceRun, fn: () => Promise<T>) => Promise<T>;
	toHeaders: (run: InstanceAiTraceRun) => Record<string, string>;
	finishRun: (run: InstanceAiTraceRun, options?: InstanceAiTraceRunFinishOptions) => Promise<void>;
	failRun: (
		run: InstanceAiTraceRun,
		error: unknown,
		metadata?: Record<string, unknown>,
	) => Promise<void>;
	wrapTools: (
		tools: InstanceAiToolRegistry,
		options?: InstanceAiToolTraceOptions,
	) => InstanceAiToolRegistry;
	getTelemetry?: (options: InstanceAiTelemetryOptions) => Telemetry | BuiltTelemetry;
	/** Trace replay mode: 'record' captures tool I/O, 'replay' remaps IDs, 'off' disables. */
	replayMode: TraceReplayMode;
	/** Shared ID remapper instance — available in 'replay' mode. */
	idRemapper?: IdRemapper;
	/** Trace index for cursor-based replay — available in 'replay' mode. */
	traceIndex?: TraceIndex;
	/** Trace writer for recording — available in 'record' mode. */
	traceWriter?: TraceWriter;
}

// ── Background task spawning ─────────────────────────────────────────────────

/** Structured result from a background task. The `text` field is the human-readable
 *  summary; `outcome` carries an optional typed payload consumed by the workflow
 *  loop controller (additive — existing callers that return a plain string still work). */
export interface BackgroundTaskResult {
	text: string;
	outcome?: Record<string, unknown>;
}

export interface SpawnBackgroundTaskOptions {
	taskId: string;
	threadId: string;
	agentId: string;
	role: string;
	/** Existing trace context for legacy callers. Prefer createTraceContext for new background tasks. */
	traceContext?: InstanceAiTraceContext;
	/** Lazily creates the background trace only after the task is accepted and starts executing. */
	createTraceContext?: () => Promise<InstanceAiTraceContext | undefined>;
	/** When set, links the background task back to a planned task in the scheduler. */
	plannedTaskId?: string;
	/** Unique work item ID for workflow loop tracking. When set, the service
	 *  uses the workflow loop controller to manage verify/repair transitions. */
	workItemId?: string;
	/**
	 * Identity used for single-flight dedupe. When present, a spawn with the same
	 * `plannedTaskId` (primary) or `role + workflowId` (fallback) as a currently-running
	 * task returns `{ status: 'duplicate', existing }` instead of starting a new task.
	 */
	dedupeKey?: {
		plannedTaskId?: string;
		workflowId?: string;
		role: string;
	};
	/**
	 * Link this background task to a running checkpoint in the planned-task
	 * graph. Set when the orchestrator spawns a detached sub-agent (builder,
	 * research, data-table, delegate) from inside a
	 * `<planned-task-follow-up type="checkpoint">` turn. The post-run safety
	 * net defers failing the checkpoint while a child with this id is still
	 * running, and settlement re-emits the checkpoint follow-up when the last
	 * child settles — so the orchestrator re-enters the checkpoint context
	 * instead of a bare `<background-task-completed>` shell.
	 */
	parentCheckpointId?: string;
	run: (
		signal: AbortSignal,
		drainCorrections: () => string[],
		waitForCorrection: () => Promise<void>,
		taskContext: { traceContext?: InstanceAiTraceContext },
	) => Promise<string | BackgroundTaskResult>;
}

/** Result of a {@link SpawnBackgroundTaskOptions} spawn. */
export type SpawnBackgroundTaskResult =
	| { status: 'started'; taskId: string; agentId: string }
	| { status: 'limit-reached' }
	| {
			status: 'duplicate';
			/** The live background task that matched on `dedupeKey`. */
			existing: {
				taskId: string;
				agentId: string;
				role: string;
				plannedTaskId?: string;
				workItemId?: string;
			};
	  };

export interface WorkflowTaskService {
	reportBuildOutcome(outcome: WorkflowBuildOutcome): Promise<WorkflowLoopAction>;
	reportVerificationVerdict(verdict: VerificationResult): Promise<WorkflowLoopAction>;
	getBuildOutcome(workItemId: string): Promise<WorkflowBuildOutcome | undefined>;
	getWorkflowLoopState(workItemId: string): Promise<WorkflowLoopState | undefined>;
	updateBuildOutcome(workItemId: string, update: Partial<WorkflowBuildOutcome>): Promise<void>;
}

// ── Orchestration context (plan + delegate tools) ───────────────────────────

export interface OrchestrationContext {
	threadId: string;
	runId: string;
	messageGroupId?: string;
	userId: string;
	projectId?: string;
	orchestratorAgentId: string;
	modelId: ModelConfig;
	checkpointStore?: CheckpointStore;
	subAgentMaxSteps: number;
	eventBus: InstanceAiEventBus;
	logger: Logger;
	/** Output-redaction policy for sub-agent streams: omit for the safe default, or `false` to disable. */
	outputRedaction?: RedactionOptions | false;
	trackTelemetry?: (eventName: string, properties: Record<string, GenericValue>) => void;
	domainTools: InstanceAiToolRegistry;
	abortSignal: AbortSignal;
	taskStorage: TaskStorage;
	tracing?: InstanceAiTraceContext;
	waitForConfirmation?: (requestId: string) => Promise<{
		approved: boolean;
		credentialId?: string;
		credentials?: Record<string, string>;
		autoSetup?: { credentialType: string };
		userInput?: string;
		domainAccessAction?: string;
		resourceDecision?: string;
		answers?: Array<{
			questionId: string;
			selectedOptions: string[];
			customText?: string;
			skipped?: boolean;
		}>;
	}>;
	/** Local MCP server (Computer Use daemon) for filesystem, shell, browser, and related tools. */
	localMcpServer?: LocalMcpServer;
	/** Safe MCP tools loaded from external servers and the local Computer Use gateway. */
	mcpTools?: InstanceAiToolRegistry;
	/**
	 * Runtime-loadable skills available to the agent. Workspace-backed agents may
	 * replace this with a workspace-materialized source before attaching it.
	 */
	runtimeSkills?: RuntimeSkillSource;
	/**
	 * Raw bundled runtime skill source. Use this when materializing skills for a
	 * concrete workspace target so already-materialized paths are not copied.
	 */
	runtimeSkillCatalog?: RuntimeSkillSource;
	/** OAuth2 callback URL for the n8n instance (e.g. http://localhost:5678/rest/oauth2-credential/callback) */
	oauth2CallbackUrl?: string;
	/** Webhook base URL for the n8n instance (e.g. http://localhost:5678/webhook) — used to construct webhook URLs for created workflows */
	webhookBaseUrl?: string;
	/** Form base URL for the n8n instance (e.g. http://localhost:5678/form) — distinct from webhookBaseUrl since Form Triggers serve at /form/, not /webhook/ */
	formBaseUrl?: string;
	/** Spawn a detached background task that outlives the current orchestrator run */
	spawnBackgroundTask?: (opts: SpawnBackgroundTaskOptions) => SpawnBackgroundTaskResult;
	/** Cancel a running background task by its ID */
	cancelBackgroundTask?: (taskId: string) => Promise<void>;
	/** Persist and inspect dependency-aware planned tasks for this thread. */
	plannedTaskService?: PlannedTaskService;
	/** Run one scheduler pass after plan/task state changes. */
	schedulePlannedTasks?: () => Promise<void>;
	/** Shared runtime workspace for the current orchestration context. */
	workspace?: Workspace;
	/** Absolute or host-relative sandbox workspace root for `<workspace_root>` paths in prompts. */
	workspaceRoot?: string;
	/** Directories containing node type definition files (.ts) for materializing into sandbox */
	nodeDefinitionDirs?: string[];
	/** Native memory store — used to retrieve thread message history for sub-agents. */
	memory?: BuiltMemory;
	/** The current user message being processed — needed because memory history only
	 *  returns previously-saved messages, so the in-flight message isn't available yet. */
	currentUserMessage?: string;
	/** True when the current run was started by the replan pipeline after a failed
	 *  background task. Set by the host, not by user text — the create-tasks guard
	 *  reads this instead of substring-matching `currentUserMessage`. */
	isReplanFollowUp?: boolean;
	/** True when the current run was started to execute a planned-task checkpoint.
	 *  The orchestrator should run the checkpoint's spec and call complete-checkpoint. */
	isCheckpointFollowUp?: boolean;
	/** When isCheckpointFollowUp is true, the task ID of the checkpoint being executed.
	 *  Used by the post-run deadlock fallback in the service. */
	checkpointTaskId?: string;
	/** The domain context — gives sub-agent tools access to n8n services */
	domainContext?: InstanceAiContext;
	/** Thread-scoped iteration log for accumulating attempt history across retries */
	iterationLog?: IterationLog;
	/** Send a correction message to a running background task */
	sendCorrectionToTask?: (
		taskId: string,
		correction: string,
	) => 'queued' | 'task-completed' | 'task-not-found';
	/**
	 * Persist the current user message to thread memory immediately, so it
	 * survives a restart that happens while the orchestrator is suspended on
	 * an inline HITL tool call. The SDK only flushes the turn delta on a clean
	 * loop completion, which a suspended run never reaches — without this the
	 * user's bubble is invisible on reload until the turn eventually completes.
	 * Idempotent: safe to call multiple times within a run.
	 */
	persistInFlightUserMessage?: () => Promise<void>;
	/** Mark the current orchestrator run as making progress. */
	touchRun?: () => boolean;
	/** Mark a running background task as making progress. */
	touchBackgroundTask?: (taskId: string) => boolean;
	/** Shared workflow-task state service for build / verify / credential-finalize flows */
	workflowTaskService?: WorkflowTaskService;
	/** When set, LangSmith traces are routed through the AI service proxy. */
	tracingProxyConfig?: ServiceProxyConfig;
	/** Summaries of currently running background tasks in this thread.
	 *  Used to give sub-agents thread-state awareness (what else is happening). */
	getRunningTaskSummaries?: () => Array<{ taskId: string; role: string; goal?: string }>;
	/** IANA time zone for the current user (e.g. "Europe/Helsinki"). Propagated to sub-agents
	 *  so they can resolve "now" consistently with the orchestrator. */
	timeZone?: string;
}

// ── Agent factory options ────────────────────────────────────────────────────

export interface CreateInstanceAgentOptions {
	modelId: ModelConfig;
	context: InstanceAiContext;
	orchestrationContext?: OrchestrationContext;
	mcpServers?: McpServerConfig[];
	/** Owns MCP client connections + tool listing caches; the service passes its singleton in. */
	mcpManager: McpClientManager;
	memoryConfig: InstanceAiMemoryConfig;
	/** Pre-built native Memory instance. When provided, `memoryConfig` controls options only. */
	memory?: BuiltMemory;
	/** Native checkpoint store for HITL/suspend state. */
	checkpointStore?: CheckpointStore;
	/**
	 * Eager-load all orchestrator tools instead of exposing most tools through search/load.
	 * Intended for tests and fallback paths that need the full toolset visible immediately.
	 */
	disableDeferredTools?: boolean;
	/** When false, extended thinking / reasoning is not enabled. Defaults to true. */
	thinkingEnabled?: boolean;
	onMemoryTaskEvent?: (event: ScopedMemoryTaskEvent) => void;
}
