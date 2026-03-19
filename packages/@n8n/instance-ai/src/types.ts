import type { ToolsInput } from '@mastra/core/agent';
import type { MastraCompositeStore } from '@mastra/core/storage';
import type { Workspace } from '@mastra/core/workspace';
import type { Memory } from '@mastra/memory';
import type {
	TaskList,
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
import type { IterationLog } from './storage/iteration-log';
import type { VerificationResult, WorkflowLoopAction } from './workflow-loop/workflow-loop-state';
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
		inputData?: Record<string, unknown>;
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
	createdAt: string;
	updatedAt: string;
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
		options?: { versionId?: string },
	): Promise<{ activeVersionId: string }>;
	unpublish(workflowId: string): Promise<void>;
	/** Patch a single node's parameters, credentials, or disabled state in-place. */
	patchNode?(
		workflowId: string,
		nodeName: string,
		patch: {
			parameters?: Record<string, unknown>;
			credentials?: Record<string, { id: string; name: string }>;
			disabled?: boolean;
		},
	): Promise<WorkflowDetail>;
	/** List version history for a workflow (metadata only, no nodes/connections). */
	listVersions?(
		workflowId: string,
		options?: { limit?: number; skip?: number },
	): Promise<WorkflowVersionSummary[]>;
	/** Get full details of a specific version (including nodes and connections). */
	getVersion?(workflowId: string, versionId: string): Promise<WorkflowVersionDetail>;
	/** Restore a workflow to a previous version by overwriting the current draft. */
	restoreVersion?(workflowId: string, versionId: string): Promise<void>;
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
		options?: { timeout?: number },
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

export interface InstanceAiCredentialService {
	list(options?: { type?: string }): Promise<CredentialSummary[]>;
	get(credentialId: string): Promise<CredentialDetail>;
	delete(credentialId: string): Promise<void>;
	test(credentialId: string): Promise<{ success: boolean; message?: string }>;
	getDocumentationUrl?(credentialType: string): Promise<string | null>;
	getCredentialFields?(
		credentialType: string,
	): CredentialFieldInfo[] | Promise<CredentialFieldInfo[]>;
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
	getDescription(nodeType: string): Promise<NodeDescription>;
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
	projectId: string;
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
	): Promise<{ insertedCount: number }>;
	updateRows(
		dataTableId: string,
		filter: DataTableFilterInput,
		data: Record<string, unknown>,
	): Promise<{ updatedCount: number }>;
	deleteRows(dataTableId: string, filter: DataTableFilterInput): Promise<{ deletedCount: number }>;
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

// ── Filesystem data shapes ───────────────────────────────────────────────────

export interface FileEntry {
	path: string;
	type: 'file' | 'directory';
	sizeBytes?: number;
}

export interface FileContent {
	path: string;
	content: string;
	truncated: boolean;
	totalLines: number;
}

export interface FileSearchMatch {
	path: string;
	lineNumber: number;
	line: string;
}

export interface FileSearchResult {
	query: string;
	matches: FileSearchMatch[];
	truncated: boolean;
	totalMatches: number;
}

// ── Filesystem service ──────────────────────────────────────────────────────

export interface InstanceAiFilesystemService {
	listFiles(
		dirPath: string,
		opts?: {
			pattern?: string;
			maxResults?: number;
			type?: 'file' | 'directory' | 'all';
			recursive?: boolean;
		},
	): Promise<FileEntry[]>;

	readFile(
		filePath: string,
		opts?: { maxLines?: number; startLine?: number },
	): Promise<FileContent>;

	searchFiles(
		dirPath: string,
		opts: {
			query: string;
			filePattern?: string;
			ignoreCase?: boolean;
			maxResults?: number;
		},
	): Promise<FileSearchResult>;

	getFileTree(dirPath: string, opts?: { maxDepth?: number; exclude?: string[] }): Promise<string>;
}

// ── Filesystem MCP server ────────────────────────────────────────────────────

/**
 * Minimal interface for a connected filesystem MCP server.
 * Implemented by `LocalGateway` (remote daemon) in the CLI module.
 */
export interface LocalMcpServer {
	getAvailableTools(): McpTool[];
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

	// Folders
	listFolders(projectId: string): Promise<FolderSummary[]>;
	createFolder(name: string, projectId: string, parentFolderId?: string): Promise<FolderSummary>;
	deleteFolder(folderId: string, projectId: string, transferToFolderId?: string): Promise<void>;

	// Workflow organization
	moveWorkflowToFolder(workflowId: string, folderId: string): Promise<void>;
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

// ── Context bundle ───────────────────────────────────────────────────────────

export interface InstanceAiContext {
	userId: string;
	workflowService: InstanceAiWorkflowService;
	executionService: InstanceAiExecutionService;
	credentialService: InstanceAiCredentialService;
	nodeService: InstanceAiNodeService;
	dataTableService: InstanceAiDataTableService;
	webResearchService?: InstanceAiWebResearchService;
	filesystemService?: InstanceAiFilesystemService;
	workspaceService?: InstanceAiWorkspaceService;
	/**
	 * Connected remote MCP server (e.g. fs-proxy daemon). When set, dynamic tools are created from its advertised capabilities. Takes precedence over `filesystemService`.
	 */
	localMcpServer?: LocalMcpServer;
	/** Per-action HITL permission overrides. When absent, tools default to requiring approval. */
	permissions?: InstanceAiPermissions;
	/** Domain access tracker for HITL gating of fetch-url and similar tools. */
	domainAccessTracker?: DomainAccessTracker;
	/** Current run ID — used for transient (allow_once) domain approvals. */
	runId?: string;
}

// ── Task storage ─────────────────────────────────────────────────────────────

export interface TaskStorage {
	get(threadId: string): Promise<TaskList | null>;
	save(threadId: string, tasks: TaskList): Promise<void>;
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
	/** Model ID for title generation (e.g. "anthropic/claude-sonnet-4-5"). When set, custom title instructions are used. */
	titleModel?: string;
	/** Thread TTL in days. Threads older than this are auto-expired on cleanup. 0 = no expiration. */
	threadTtlDays?: number;
}

// ── Model configuration ─────────────────────────────────────────────────────

/** Model identifier: plain string for built-in providers, or object for OpenAI-compatible endpoints. */
export type ModelConfig = string | { id: `${string}/${string}`; url: string; apiKey?: string };

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
	/** Unique work item ID for workflow loop tracking. When set, the service
	 *  uses the workflow loop controller to manage verify/repair transitions. */
	workItemId?: string;
	run: (
		signal: AbortSignal,
		drainCorrections: () => string[],
	) => Promise<string | BackgroundTaskResult>;
}

// ── Orchestration context (plan + delegate tools) ───────────────────────────

export interface OrchestrationContext {
	threadId: string;
	runId: string;
	userId: string;
	orchestratorAgentId: string;
	modelId: ModelConfig;
	storage: MastraCompositeStore;
	subAgentMaxSteps: number;
	eventBus: InstanceAiEventBus;
	domainTools: ToolsInput;
	abortSignal: AbortSignal;
	taskStorage: TaskStorage;
	waitForConfirmation?: (requestId: string) => Promise<{
		approved: boolean;
		credentialId?: string;
		credentials?: Record<string, string>;
		autoSetup?: { credentialType: string };
		mockCredentials?: boolean;
	}>;
	/** Chrome DevTools MCP config — only present when browser automation is enabled */
	browserMcpConfig?: McpServerConfig;
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
	/** Sandbox workspace — when present, enables sandbox-based workflow building */
	workspace?: Workspace;
	/** Factory for creating per-builder ephemeral sandboxes from a pre-warmed snapshot */
	builderSandboxFactory?: BuilderSandboxFactory;
	/** Directories containing node type definition files (.ts) for materializing into sandbox */
	nodeDefinitionDirs?: string[];
	/** The domain context — gives sub-agent tools access to n8n services */
	domainContext?: InstanceAiContext;
	/** When true, the research-with-agent tool is available and the builder gets web-search/fetch-url */
	researchMode?: boolean;
	/** Thread-scoped iteration log for accumulating attempt history across retries */
	iterationLog?: IterationLog;
	/** Send a correction message to a running background task */
	sendCorrectionToTask?: (taskId: string, correction: string) => void;
	/** Report a verification verdict to the deterministic workflow loop controller */
	reportVerificationVerdict?: (verdict: VerificationResult) => Promise<WorkflowLoopAction>;
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
}
