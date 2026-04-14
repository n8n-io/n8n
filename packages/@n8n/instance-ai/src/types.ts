import type { LanguageModelV2 } from '@ai-sdk/provider-v5';
import type { ToolsInput } from '@mastra/core/agent';
import type { MastraCompositeStore } from '@mastra/core/storage';
import type { Workspace } from '@mastra/core/workspace';
import type { Memory } from '@mastra/memory';
import type {
	TaskList,
	InstanceAiAttachment,
	InstanceAiPermissions,
	McpTool,
	McpToolCallRequest,
	McpToolCallResult,
} from '@n8n/api-types';
import type { WorkflowJSON } from '@n8n/workflow-sdk';

// Service interfaces — dependency inversion so the package stays decoupled from n8n internals.
// The backend module provides concrete implementations via InstanceAiAdapterService.

import type { DomainAccessTracker } from './domain-access/domain-access-tracker';
import type { InstanceAiEventBus } from './event-bus/event-bus.interface';
import type { Logger } from './logger';
import type { IterationLog } from './storage/iteration-log';
import type { IdRemapper, TraceIndex, TraceWriter } from './tracing/trace-replay';
import type {
	VerificationResult,
	WorkflowBuildOutcome,
	WorkflowLoopAction,
} from './workflow-loop/workflow-loop-state';
import type { BuilderSandboxFactory } from './workspace/builder-sandbox-factory';

// ── Data shapes ──────────────────────────────────────────────────────────────

export interface WorkflowSummary {
	id: string;
	name: string;
	versionId: string;
	activeVersionId: string | null;
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

export interface ExecutionDebugInfo extends ExecutionResult {
	failedNode?: {
		name: string;
		type: string;
		error: string;
		inputData?: Record<string, unknown> | string;
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
	credentials?: Array<{ name: string; required?: boolean }>;
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

export interface InstanceAiWorkflowService {
	list(options?: { query?: string; limit?: number }): Promise<WorkflowSummary[]>;
	get(workflowId: string): Promise<WorkflowDetail>;
	/** Get the workflow as the SDK's WorkflowJSON (full node data for generateWorkflowCode). */
	getAsWorkflowJSON(workflowId: string): Promise<WorkflowJSON>;
	/** Create a workflow from SDK-produced WorkflowJSON (full NodeJSON with typeVersion, credentials, etc.). */
	createFromWorkflowJSON(
		json: WorkflowJSON,
		options?: { projectId?: string },
	): Promise<WorkflowDetail>;
	/** Update a workflow from SDK-produced WorkflowJSON. */
	updateFromWorkflowJSON(
		workflowId: string,
		json: WorkflowJSON,
		options?: { projectId?: string },
	): Promise<WorkflowDetail>;
	archive(workflowId: string): Promise<void>;
	delete(workflowId: string): Promise<void>;
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
}

export interface CredentialTypeSearchResult {
	type: string;
	displayName: string;
}

export interface InstanceAiCredentialService {
	list(options?: { type?: string }): Promise<CredentialSummary[]>;
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
	paginationToken?: unknown;
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
	): Promise<{ content: string; version?: string; error?: string } | null>;
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

export interface InstanceAiDataTableService {
	list(options?: { projectId?: string }): Promise<DataTableSummary[]>;
	create(
		name: string,
		columns: Array<{ name: string; type: 'string' | 'number' | 'boolean' | 'date' }>,
		options?: { projectId?: string },
	): Promise<DataTableSummary>;
	delete(dataTableId: string): Promise<void>;
	getSchema(dataTableId: string): Promise<DataTableColumnInfo[]>;
	addColumn(
		dataTableId: string,
		column: { name: string; type: 'string' | 'number' | 'boolean' | 'date' },
	): Promise<DataTableColumnInfo>;
	deleteColumn(dataTableId: string, columnId: string): Promise<void>;
	renameColumn(dataTableId: string, columnId: string, newName: string): Promise<void>;
	queryRows(
		dataTableId: string,
		options?: { filter?: DataTableFilterInput; limit?: number; offset?: number },
	): Promise<{ count: number; data: Array<Record<string, unknown>> }>;
	insertRows(
		dataTableId: string,
		rows: Array<Record<string, unknown>>,
	): Promise<{ insertedCount: number; dataTableId: string; tableName: string; projectId: string }>;
	updateRows(
		dataTableId: string,
		filter: DataTableFilterInput,
		data: Record<string, unknown>,
	): Promise<{ updatedCount: number; dataTableId: string; tableName: string; projectId: string }>;
	deleteRows(
		dataTableId: string,
		filter: DataTableFilterInput,
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
	| { status: 'connected' }
	| { status: 'disconnected'; capabilities: string[] }
	| { status: 'disabled' };

// ── Context bundle ───────────────────────────────────────────────────────────

export interface InstanceAiContext {
	userId: string;
	workflowService: InstanceAiWorkflowService;
	executionService: InstanceAiExecutionService;
	credentialService: InstanceAiCredentialService;
	nodeService: InstanceAiNodeService;
	dataTableService: InstanceAiDataTableService;
	webResearchService?: InstanceAiWebResearchService;
	workspaceService?: InstanceAiWorkspaceService;
	/**
	 * Connected remote MCP server (e.g. computer-use daemon). When set, dynamic tools are created from its advertised capabilities.
	 */
	localMcpServer?: LocalMcpServer;
	/** Connection state of the local gateway — drives system prompt guidance. */
	localGatewayStatus?: LocalGatewayStatus;
	/** Per-action HITL permission overrides. When absent, tools default to requiring approval. */
	permissions?: InstanceAiPermissions;
	/** When true, the instance is in read-only mode (source control branchReadOnly). */
	branchReadOnly?: boolean;
	/** Human-readable hints about licensed features that are NOT available on this instance.
	 *  Injected into the system prompt so the agent can explain why certain capabilities are missing. */
	licenseHints?: string[];
	/** Domain access tracker for HITL gating of fetch-url and similar tools. */
	domainAccessTracker?: DomainAccessTracker;
	/** Current run ID — used for transient (allow_once) domain approvals. */
	runId?: string;
	/**
	 * Attachments from the current user message. Runtime-only — not persisted.
	 * Used to register `parse-file` and supply data to the parser.
	 */
	currentUserAttachments?: InstanceAiAttachment[];
}

// ── Task storage ─────────────────────────────────────────────────────────────

export interface TaskStorage {
	get(threadId: string): Promise<TaskList | null>;
	save(threadId: string, tasks: TaskList): Promise<void>;
}

// ── Planned task graphs ─────────────────────────────────────────────────────

export type PlannedTaskKind = 'delegate' | 'build-workflow' | 'manage-data-tables' | 'research';

export interface PlannedTask {
	id: string;
	title: string;
	kind: PlannedTaskKind;
	spec: string;
	deps: string[];
	tools?: string[];
	/** Existing workflow ID for build-workflow tasks that modify an existing workflow. */
	workflowId?: string;
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

export type PlannedTaskGraphStatus = 'active' | 'awaiting_replan' | 'completed' | 'cancelled';

export interface PlannedTaskGraph {
	planRunId: string;
	messageGroupId?: string;
	status: PlannedTaskGraphStatus;
	tasks: PlannedTaskRecord[];
}

export type PlannedTaskSchedulerAction =
	| { type: 'none'; graph: PlannedTaskGraph | null }
	| { type: 'dispatch'; graph: PlannedTaskGraph; tasks: PlannedTaskRecord[] }
	| { type: 'replan'; graph: PlannedTaskGraph; failedTask: PlannedTaskRecord }
	| { type: 'synthesize'; graph: PlannedTaskGraph };

export interface PlannedTaskService {
	createPlan(
		threadId: string,
		tasks: PlannedTask[],
		metadata: { planRunId: string; messageGroupId?: string },
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
	tick(
		threadId: string,
		options?: { availableSlots?: number },
	): Promise<PlannedTaskSchedulerAction>;
	clear(threadId: string): Promise<void>;
}

// ── MCP ──────────────────────────────────────────────────────────────────────

export interface McpServerConfig {
	name: string;
	url?: string;
	command?: string;
	args?: string[];
	env?: Record<string, string>;
}

// ── Memory ───────────────────────────────────────────────────────────────────

export interface InstanceAiMemoryConfig {
	storage: MastraCompositeStore;
	embedderModel?: string;
	lastMessages?: number;
	semanticRecallTopK?: number;
	/** Thread TTL in days. Threads older than this are auto-expired on cleanup. 0 = no expiration. */
	threadTtlDays?: number;
}

// ── Model configuration ─────────────────────────────────────────────────────

/** Model identifier: plain string for built-in providers, object for OpenAI-compatible endpoints,
 *  or a pre-built LanguageModelV2 instance (e.g. from @ai-sdk/anthropic with a custom baseURL).
 *
 *  The LanguageModelV2 variant exists because Mastra's model router forces all object configs
 *  with a `url` field through `createOpenAICompatible`, which calls `/chat/completions`.
 *  When routing through a proxy that forwards to Vertex AI (which only supports the native
 *  Anthropic Messages API at `/v1/messages`), we must use `@ai-sdk/anthropic` directly to
 *  produce a model instance that speaks the correct protocol. */
export type ModelConfig =
	| string
	| { id: `${string}/${string}`; url: string; apiKey?: string; headers?: Record<string, string> }
	| LanguageModelV2;

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

export interface InstanceAiTraceContext {
	projectName: string;
	traceKind: 'message_turn' | 'detached_subagent';
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
	finishRun: (run: InstanceAiTraceRun, options?: InstanceAiTraceRunFinishOptions) => Promise<void>;
	failRun: (
		run: InstanceAiTraceRun,
		error: unknown,
		metadata?: Record<string, unknown>,
	) => Promise<void>;
	toHeaders: (run: InstanceAiTraceRun) => Record<string, string>;
	wrapTools: (tools: ToolsInput, options?: InstanceAiToolTraceOptions) => ToolsInput;
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
	traceContext?: InstanceAiTraceContext;
	/** When set, links the background task back to a planned task in the scheduler. */
	plannedTaskId?: string;
	/** Unique work item ID for workflow loop tracking. When set, the service
	 *  uses the workflow loop controller to manage verify/repair transitions. */
	workItemId?: string;
	run: (
		signal: AbortSignal,
		drainCorrections: () => string[],
		waitForCorrection: () => Promise<void>,
	) => Promise<string | BackgroundTaskResult>;
}

export interface WorkflowTaskService {
	reportBuildOutcome(outcome: WorkflowBuildOutcome): Promise<WorkflowLoopAction>;
	reportVerificationVerdict(verdict: VerificationResult): Promise<WorkflowLoopAction>;
	getBuildOutcome(workItemId: string): Promise<WorkflowBuildOutcome | undefined>;
	updateBuildOutcome(workItemId: string, update: Partial<WorkflowBuildOutcome>): Promise<void>;
}

// ── Orchestration context (plan + delegate tools) ───────────────────────────

export interface OrchestrationContext {
	threadId: string;
	runId: string;
	messageGroupId?: string;
	userId: string;
	orchestratorAgentId: string;
	modelId: ModelConfig;
	storage: MastraCompositeStore;
	subAgentMaxSteps: number;
	eventBus: InstanceAiEventBus;
	logger: Logger;
	domainTools: ToolsInput;
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
	/** Chrome DevTools MCP config — only present when browser automation is enabled */
	browserMcpConfig?: McpServerConfig;
	/** Local MCP server (computer-use daemon) — when connected and advertising browser_* tools,
	 *  browser-credential-setup prefers these over chrome-devtools-mcp. */
	localMcpServer?: LocalMcpServer;
	/** MCP tools loaded from external servers — available for delegation to sub-agents */
	mcpTools?: ToolsInput;
	/** OAuth2 callback URL for the n8n instance (e.g. http://localhost:5678/rest/oauth2-credential/callback) */
	oauth2CallbackUrl?: string;
	/** Webhook base URL for the n8n instance (e.g. http://localhost:5678/webhook) — used to construct webhook URLs for created workflows */
	webhookBaseUrl?: string;
	/** Spawn a detached background task that outlives the current orchestrator run */
	spawnBackgroundTask?: (opts: SpawnBackgroundTaskOptions) => void;
	/** Cancel a running background task by its ID */
	cancelBackgroundTask?: (taskId: string) => Promise<void>;
	/** Persist and inspect dependency-aware planned tasks for this thread. */
	plannedTaskService?: PlannedTaskService;
	/** Run one scheduler pass after plan/task state changes. */
	schedulePlannedTasks?: () => Promise<void>;
	/** Sandbox workspace — when present, enables sandbox-based workflow building */
	workspace?: Workspace;
	/** Factory for creating per-builder ephemeral sandboxes from a pre-warmed snapshot */
	builderSandboxFactory?: BuilderSandboxFactory;
	/** Directories containing node type definition files (.ts) for materializing into sandbox */
	nodeDefinitionDirs?: string[];
	/** Mastra memory instance — used to retrieve thread message history for sub-agents */
	memory?: Memory;
	/** The current user message being processed — needed because memory.recall() only
	 *  returns previously-saved messages, so the in-flight message isn't available yet. */
	currentUserMessage?: string;
	/** The domain context — gives sub-agent tools access to n8n services */
	domainContext?: InstanceAiContext;
	/** When true, research guidance may suggest planned research tasks and the builder gets web-search/fetch-url */
	researchMode?: boolean;
	/** Thread-scoped iteration log for accumulating attempt history across retries */
	iterationLog?: IterationLog;
	/** Send a correction message to a running background task */
	sendCorrectionToTask?: (
		taskId: string,
		correction: string,
	) => 'queued' | 'task-completed' | 'task-not-found';
	/** Shared workflow-task state service for build / verify / credential-finalize flows */
	workflowTaskService?: WorkflowTaskService;
	/** When set, LangSmith traces are routed through the AI service proxy. */
	tracingProxyConfig?: ServiceProxyConfig;
	/** Summaries of currently running background tasks in this thread.
	 *  Used to give sub-agents thread-state awareness (what else is happening). */
	getRunningTaskSummaries?: () => Array<{ taskId: string; role: string; goal?: string }>;
}

// ── Agent factory options ────────────────────────────────────────────────────

export interface CreateInstanceAgentOptions {
	modelId: ModelConfig;
	context: InstanceAiContext;
	orchestrationContext?: OrchestrationContext;
	mcpServers?: McpServerConfig[];
	memoryConfig: InstanceAiMemoryConfig;
	/** Pre-built Memory instance. When provided, `memoryConfig` is ignored for memory creation. */
	memory?: Memory;
	/** Workspace with sandbox for code execution. When provided, the agent gets execute_command tool. */
	workspace?: Workspace;
	/** When true, all tools are loaded eagerly (no ToolSearchProcessor). Workaround for Mastra bug where toModelOutput is not called for deferred tools. */
	disableDeferredTools?: boolean;
	/** IANA time zone for the current user (e.g. "Europe/Helsinki"). Falls back to instance default. */
	timeZone?: string;
}
