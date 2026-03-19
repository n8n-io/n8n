import { z } from 'zod';

// ---------------------------------------------------------------------------
// Branded ID types — prevent swapping runId/agentId/threadId/toolCallId
// ---------------------------------------------------------------------------

export type RunId = string & { readonly __brand: 'RunId' };
export type AgentId = string & { readonly __brand: 'AgentId' };
export type ThreadId = string & { readonly __brand: 'ThreadId' };
export type ToolCallId = string & { readonly __brand: 'ToolCallId' };

// ---------------------------------------------------------------------------
// Event type enum
// ---------------------------------------------------------------------------

export const instanceAiEventTypeSchema = z.enum([
	'run-start',
	'run-finish',
	'agent-spawned',
	'agent-completed',
	'text-delta',
	'reasoning-delta',
	'tool-call',
	'tool-result',
	'tool-error',
	'confirmation-request',
	'tasks-update',
	'filesystem-request',
	'status',
	'error',
]);
export type InstanceAiEventType = z.infer<typeof instanceAiEventTypeSchema>;

// ---------------------------------------------------------------------------
// Run status
// ---------------------------------------------------------------------------

export const instanceAiRunStatusSchema = z.enum(['completed', 'cancelled', 'error']);
export type InstanceAiRunStatus = z.infer<typeof instanceAiRunStatusSchema>;

// ---------------------------------------------------------------------------
// Confirmation severity
// ---------------------------------------------------------------------------

export const instanceAiConfirmationSeveritySchema = z.enum(['destructive', 'warning', 'info']);
export type InstanceAiConfirmationSeverity = z.infer<typeof instanceAiConfirmationSeveritySchema>;

// ---------------------------------------------------------------------------
// Agent status (frontend rendering state)
// ---------------------------------------------------------------------------

export const instanceAiAgentStatusSchema = z.enum(['active', 'completed', 'cancelled', 'error']);
export type InstanceAiAgentStatus = z.infer<typeof instanceAiAgentStatusSchema>;

export const instanceAiAgentKindSchema = z.enum([
	'builder',
	'data-table',
	'researcher',
	'delegate',
	'browser-setup',
]);
export type InstanceAiAgentKind = z.infer<typeof instanceAiAgentKindSchema>;

// ---------------------------------------------------------------------------
// Domain access gating (shared across any tool that fetches external URLs)
// ---------------------------------------------------------------------------

export const domainAccessActionSchema = z.enum(['allow_once', 'allow_domain', 'allow_all']);
export type DomainAccessAction = z.infer<typeof domainAccessActionSchema>;

export const domainAccessMetaSchema = z.object({
	url: z.string(),
	host: z.string(),
});
export type DomainAccessMeta = z.infer<typeof domainAccessMetaSchema>;

export const UNSAFE_OBJECT_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

export function isSafeObjectKey(key: string): boolean {
	return !UNSAFE_OBJECT_KEYS.has(key);
}

// ---------------------------------------------------------------------------
// Event payloads
// ---------------------------------------------------------------------------

export const runStartPayloadSchema = z.object({
	messageId: z.string().describe('Correlates with the user message that triggered this run'),
	messageGroupId: z
		.string()
		.optional()
		.describe(
			'Stable ID across auto-follow-up runs within one user turn. When present, follow-up runs share this ID so the frontend merges them into one assistant message.',
		),
});

export const runFinishPayloadSchema = z.object({
	status: instanceAiRunStatusSchema,
	reason: z.string().optional(),
});

export const agentSpawnedTargetResourceSchema = z.object({
	type: z.enum(['workflow', 'data-table', 'credential', 'other']),
	id: z.string().optional(),
	name: z.string().optional(),
});
export type InstanceAiTargetResource = z.infer<typeof agentSpawnedTargetResourceSchema>;

export const agentSpawnedPayloadSchema = z.object({
	parentId: z.string().describe("Orchestrator's agentId"),
	role: z.string().describe('Free-form role description'),
	tools: z.array(z.string()).describe('Tool names the sub-agent received'),
	taskId: z.string().optional().describe('Background task ID (only for background agents)'),
	// Display metadata — enriched identity for the UI
	kind: instanceAiAgentKindSchema.optional().describe('Agent kind for card dispatch'),
	title: z.string().optional().describe('Short display title, e.g. "Building workflow"'),
	subtitle: z
		.string()
		.optional()
		.describe('Brief task description for distinguishing sibling agents'),
	goal: z.string().optional().describe('Full task description for tooltip/details'),
	targetResource: agentSpawnedTargetResourceSchema
		.optional()
		.describe('Resource this agent works on'),
});

export const agentCompletedPayloadSchema = z.object({
	role: z.string(),
	result: z.string().describe('Synthesized answer'),
	error: z.string().optional(),
});

export const textDeltaPayloadSchema = z.object({
	text: z.string(),
});

export const reasoningDeltaPayloadSchema = z.object({
	text: z.string(),
});

export const toolCallPayloadSchema = z.object({
	toolCallId: z.string(),
	toolName: z.string(),
	args: z.record(z.unknown()),
});

export const toolResultPayloadSchema = z.object({
	toolCallId: z.string(),
	result: z.unknown(),
});

export const toolErrorPayloadSchema = z.object({
	toolCallId: z.string(),
	error: z.string(),
});

export const credentialRequestSchema = z.object({
	credentialType: z.string(),
	reason: z.string(),
	existingCredentials: z.array(z.object({ id: z.string(), name: z.string() })),
});

export type InstanceAiCredentialRequest = z.infer<typeof credentialRequestSchema>;

export const confirmationRequestPayloadSchema = z.object({
	requestId: z.string(),
	toolCallId: z.string().describe('Correlates to the tool-call that needs approval'),
	toolName: z.string(),
	args: z.record(z.unknown()),
	severity: instanceAiConfirmationSeveritySchema,
	message: z.string().describe('Human-readable description of the action'),
	credentialRequests: z.array(credentialRequestSchema).optional(),
	projectId: z
		.string()
		.optional()
		.describe(
			'Target project ID — used to scope actions (e.g. credential creation) to the correct project',
		),
	inputType: z
		.enum(['approval', 'text'])
		.optional()
		.describe('UI mode: approval (default) shows approve/deny, text shows a text input'),
	domainAccess: domainAccessMetaSchema
		.optional()
		.describe('When present, renders domain-access approval UI instead of generic confirm'),
});

export const statusPayloadSchema = z.object({
	message: z.string().describe('Transient status message. Empty string clears the indicator.'),
});

export const errorPayloadSchema = z.object({
	content: z.string(),
	statusCode: z.number().optional(),
	provider: z.string().optional(),
	technicalDetails: z.string().optional(),
});

// ---------------------------------------------------------------------------
// MCP protocol types (used by the filesystem gateway)
// ---------------------------------------------------------------------------

// Plain object schema: { type: "object", properties: { ... } }
const mcpObjectInputSchema = z.object({
	type: z.literal('object'),
	properties: z.record(z.unknown()),
	required: z.array(z.string()).optional(),
});

// Union schemas produced by z.discriminatedUnion / z.union via zodToJsonSchema
const mcpAnyOfInputSchema = z.object({ anyOf: z.array(mcpObjectInputSchema) });
const mcpOneOfInputSchema = z.object({ oneOf: z.array(mcpObjectInputSchema) });

const mcpInputSchema = z.union([mcpObjectInputSchema, mcpAnyOfInputSchema, mcpOneOfInputSchema]);

export const mcpToolSchema = z.object({
	name: z.string(),
	description: z.string().optional(),
	inputSchema: mcpInputSchema,
});
export type McpTool = z.infer<typeof mcpToolSchema>;

export const mcpToolCallRequestSchema = z.object({
	name: z.string(),
	arguments: z.record(z.unknown()),
});
export type McpToolCallRequest = z.infer<typeof mcpToolCallRequestSchema>;

const mcpTextContentSchema = z.object({ type: z.literal('text'), text: z.string() });

const mcpImageContentSchema = z.object({
	type: z.literal('image'),
	data: z.string(),
	mimeType: z.string(),
});
export const mcpToolCallResultSchema = z.object({
	content: z.array(z.union([mcpTextContentSchema, mcpImageContentSchema])),
	structuredContent: z.record(z.string(), z.unknown()).optional(),
	isError: z.boolean().optional(),
});
export type McpToolCallResult = z.infer<typeof mcpToolCallResultSchema>;

// Sent by the daemon on connect — replaces the old file-tree upload
export const instanceAiGatewayCapabilitiesSchema = z.object({
	rootPath: z.string(),
	tools: z.array(mcpToolSchema).default([]),
});
export type InstanceAiGatewayCapabilities = z.infer<typeof instanceAiGatewayCapabilitiesSchema>;

// ---------------------------------------------------------------------------
// Filesystem bridge payloads (browser ↔ server round-trip)
// ---------------------------------------------------------------------------

export const filesystemRequestPayloadSchema = z.object({
	requestId: z.string(),
	toolCall: mcpToolCallRequestSchema,
});

export const instanceAiFilesystemResponseSchema = z.object({
	result: mcpToolCallResultSchema.optional(),
	error: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Task list schemas (lightweight checklist for multi-step work)
// ---------------------------------------------------------------------------

export const taskItemSchema = z.object({
	id: z.string().describe('Unique task identifier'),
	description: z.string().describe('What this task accomplishes'),
	status: z.enum(['todo', 'in_progress', 'done']).describe('Current status'),
});

export type TaskItem = z.infer<typeof taskItemSchema>;

export const taskListSchema = z.object({
	tasks: z.array(taskItemSchema).describe('Ordered list of tasks'),
});

export type TaskList = z.infer<typeof taskListSchema>;

export const tasksUpdatePayloadSchema = z.object({
	tasks: taskListSchema,
});

// ---------------------------------------------------------------------------
// Event schema (Zod discriminated union — single source of truth)
// ---------------------------------------------------------------------------

const eventBase = { runId: z.string(), agentId: z.string(), userId: z.string().optional() };

export const instanceAiEventSchema = z.discriminatedUnion('type', [
	z.object({ type: z.literal('run-start'), ...eventBase, payload: runStartPayloadSchema }),
	z.object({ type: z.literal('run-finish'), ...eventBase, payload: runFinishPayloadSchema }),
	z.object({ type: z.literal('agent-spawned'), ...eventBase, payload: agentSpawnedPayloadSchema }),
	z.object({
		type: z.literal('agent-completed'),
		...eventBase,
		payload: agentCompletedPayloadSchema,
	}),
	z.object({ type: z.literal('text-delta'), ...eventBase, payload: textDeltaPayloadSchema }),
	z.object({
		type: z.literal('reasoning-delta'),
		...eventBase,
		payload: reasoningDeltaPayloadSchema,
	}),
	z.object({ type: z.literal('tool-call'), ...eventBase, payload: toolCallPayloadSchema }),
	z.object({ type: z.literal('tool-result'), ...eventBase, payload: toolResultPayloadSchema }),
	z.object({ type: z.literal('tool-error'), ...eventBase, payload: toolErrorPayloadSchema }),
	z.object({
		type: z.literal('confirmation-request'),
		...eventBase,
		payload: confirmationRequestPayloadSchema,
	}),
	z.object({ type: z.literal('tasks-update'), ...eventBase, payload: tasksUpdatePayloadSchema }),
	z.object({ type: z.literal('status'), ...eventBase, payload: statusPayloadSchema }),
	z.object({ type: z.literal('error'), ...eventBase, payload: errorPayloadSchema }),
	z.object({
		type: z.literal('filesystem-request'),
		...eventBase,
		payload: filesystemRequestPayloadSchema,
	}),
]);

// ---------------------------------------------------------------------------
// Derived event types (from the schema — single source of truth)
// ---------------------------------------------------------------------------

export type InstanceAiEvent = z.infer<typeof instanceAiEventSchema>;

// Named event types as Extract aliases for consumers that need specific types
export type InstanceAiRunStartEvent = Extract<InstanceAiEvent, { type: 'run-start' }>;
export type InstanceAiRunFinishEvent = Extract<InstanceAiEvent, { type: 'run-finish' }>;
export type InstanceAiAgentSpawnedEvent = Extract<InstanceAiEvent, { type: 'agent-spawned' }>;
export type InstanceAiAgentCompletedEvent = Extract<InstanceAiEvent, { type: 'agent-completed' }>;
export type InstanceAiTextDeltaEvent = Extract<InstanceAiEvent, { type: 'text-delta' }>;
export type InstanceAiReasoningDeltaEvent = Extract<InstanceAiEvent, { type: 'reasoning-delta' }>;
export type InstanceAiToolCallEvent = Extract<InstanceAiEvent, { type: 'tool-call' }>;
export type InstanceAiToolResultEvent = Extract<InstanceAiEvent, { type: 'tool-result' }>;
export type InstanceAiToolErrorEvent = Extract<InstanceAiEvent, { type: 'tool-error' }>;
export type InstanceAiConfirmationRequestEvent = Extract<
	InstanceAiEvent,
	{ type: 'confirmation-request' }
>;
export type InstanceAiTasksUpdateEvent = Extract<InstanceAiEvent, { type: 'tasks-update' }>;
export type InstanceAiStatusEvent = Extract<InstanceAiEvent, { type: 'status' }>;
export type InstanceAiErrorEvent = Extract<InstanceAiEvent, { type: 'error' }>;
export type InstanceAiFilesystemRequestEvent = Extract<
	InstanceAiEvent,
	{ type: 'filesystem-request' }
>;

export type InstanceAiFilesystemResponse = z.infer<typeof instanceAiFilesystemResponseSchema>;

// ---------------------------------------------------------------------------
// API types
// ---------------------------------------------------------------------------

export interface InstanceAiAttachment {
	data: string;
	mimeType: string;
	fileName: string;
}

export interface InstanceAiSendMessageRequest {
	message: string;
	researchMode?: boolean;
	attachments?: InstanceAiAttachment[];
}

export interface InstanceAiSendMessageResponse {
	runId: string;
}

export interface InstanceAiConfirmResponse {
	approved: boolean;
	credentialId?: string;
	credentials?: Record<string, string>;
	autoSetup?: { credentialType: string };
	/** When true, the user chose to continue with mock data instead of providing credentials. */
	mockCredentials?: boolean;
	userInput?: string;
	domainAccessAction?: DomainAccessAction;
}

// ---------------------------------------------------------------------------
// Frontend store types (shared so both sides agree on structure)
// ---------------------------------------------------------------------------

export interface InstanceAiToolCallState {
	toolCallId: string;
	toolName: string;
	args: Record<string, unknown>;
	result?: unknown;
	error?: string;
	isLoading: boolean;
	renderHint?: 'tasks' | 'delegate' | 'builder' | 'data-table' | 'researcher' | 'default';
	confirmation?: {
		requestId: string;
		severity: InstanceAiConfirmationSeverity;
		message: string;
		credentialRequests?: InstanceAiCredentialRequest[];
		projectId?: string;
		inputType?: 'approval' | 'text';
		domainAccess?: DomainAccessMeta;
	};
	confirmationStatus?: 'pending' | 'approved' | 'denied';
	startedAt?: string;
	completedAt?: string;
}

export type InstanceAiTimelineEntry =
	| { type: 'text'; content: string }
	| { type: 'tool-call'; toolCallId: string }
	| { type: 'child'; agentId: string };

export interface InstanceAiAgentNode {
	agentId: string;
	role: string;
	tools?: string[];
	/** Background task ID — present only for background agents (workflow-builder, data-table-manager). */
	taskId?: string;
	/** Agent kind for card dispatch (builder, data-table, researcher, delegate, browser-setup). */
	kind?: InstanceAiAgentKind;
	/** Short display title, e.g. "Building workflow". */
	title?: string;
	/** Brief task description for distinguishing sibling agents. */
	subtitle?: string;
	/** Full task description for tooltip/details. */
	goal?: string;
	/** Resource this agent works on. */
	targetResource?: InstanceAiTargetResource;
	/** Transient status message (e.g. "Recalling conversation..."). Cleared when empty. */
	statusMessage?: string;
	status: InstanceAiAgentStatus;
	textContent: string;
	reasoning: string;
	toolCalls: InstanceAiToolCallState[];
	children: InstanceAiAgentNode[];
	/** Chronological ordering of text segments, tool calls, and sub-agents. */
	timeline: InstanceAiTimelineEntry[];
	/** Latest task list — updated by tasks-update events. */
	tasks?: TaskList;
	result?: string;
	error?: string;
	errorDetails?: {
		statusCode?: number;
		provider?: string;
		technicalDetails?: string;
	};
}

export interface InstanceAiMessage {
	id: string;
	runId?: string;
	/** Stable group ID across auto-follow-up runs within one user turn. */
	messageGroupId?: string;
	/** All runIds in this message group — used to rebuild routing table on restore. */
	runIds?: string[];
	role: 'user' | 'assistant';
	createdAt: string;
	content: string;
	reasoning: string;
	isStreaming: boolean;
	agentTree?: InstanceAiAgentNode;
	attachments?: InstanceAiAttachment[];
}

export interface InstanceAiThreadSummary {
	id: string;
	title: string;
	createdAt: string;
}

export type InstanceAiSSEConnectionState =
	| 'disconnected'
	| 'connecting'
	| 'connected'
	| 'reconnecting';

// ---------------------------------------------------------------------------
// Thread Inspector types (debug panel — raw Mastra storage inspection)
// ---------------------------------------------------------------------------

export interface InstanceAiThreadInfo {
	id: string;
	title?: string;
	resourceId: string;
	createdAt: string;
	updatedAt: string;
	metadata?: Record<string, unknown>;
}

export interface InstanceAiThreadListResponse {
	threads: InstanceAiThreadInfo[];
	total: number;
	page: number;
	hasMore: boolean;
}

export interface InstanceAiEnsureThreadResponse {
	thread: InstanceAiThreadInfo;
	created: boolean;
}

export interface InstanceAiStoredMessage {
	id: string;
	role: string;
	content: unknown;
	type?: string;
	createdAt: string;
}

export interface InstanceAiThreadMessagesResponse {
	messages: InstanceAiStoredMessage[];
	threadId: string;
}

export interface InstanceAiThreadContextResponse {
	threadId: string;
	workingMemory: string | null;
}

// ---------------------------------------------------------------------------
// Rich messages response (session-restored view with agent trees)
// ---------------------------------------------------------------------------

export interface InstanceAiRichMessagesResponse {
	threadId: string;
	messages: InstanceAiMessage[];
	/** Next SSE event ID for this thread — use as cursor to avoid replaying events already covered by these messages. */
	nextEventId: number;
}

// ---------------------------------------------------------------------------
// Thread status response (background task visibility)
// ---------------------------------------------------------------------------

export interface InstanceAiThreadStatusResponse {
	hasActiveRun: boolean;
	isSuspended: boolean;
	backgroundTasks: Array<{
		taskId: string;
		role: string;
		agentId: string;
		status: 'running' | 'completed' | 'failed' | 'cancelled';
		startedAt: number;
		/** The runId this background task belongs to — used for run-sync on reconnect. */
		runId?: string;
		/** The messageGroupId this task was spawned under. */
		messageGroupId?: string;
	}>;
}

// ---------------------------------------------------------------------------
// Shared utility: maps tool names to render hints (used by both FE and BE)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Settings types (runtime-configurable subset of InstanceAiConfig)
// ---------------------------------------------------------------------------

export type InstanceAiPermissionMode = 'require_approval' | 'always_allow';

export interface InstanceAiPermissions {
	runWorkflow: InstanceAiPermissionMode;
	publishWorkflow: InstanceAiPermissionMode;
	deleteWorkflow: InstanceAiPermissionMode;
	buildWorkflow: InstanceAiPermissionMode;
	patchWorkflow: InstanceAiPermissionMode;
	deleteCredential: InstanceAiPermissionMode;
	createFolder: InstanceAiPermissionMode;
	deleteFolder: InstanceAiPermissionMode;
	moveWorkflowToFolder: InstanceAiPermissionMode;
	tagWorkflow: InstanceAiPermissionMode;
	createDataTable: InstanceAiPermissionMode;
	mutateDataTableSchema: InstanceAiPermissionMode;
	mutateDataTableRows: InstanceAiPermissionMode;
	cleanupTestExecutions: InstanceAiPermissionMode;
	readFilesystem: InstanceAiPermissionMode;
	fetchUrl: InstanceAiPermissionMode;
	restoreWorkflowVersion: InstanceAiPermissionMode;
}

export const DEFAULT_INSTANCE_AI_PERMISSIONS: InstanceAiPermissions = {
	runWorkflow: 'require_approval',
	publishWorkflow: 'require_approval',
	deleteWorkflow: 'require_approval',
	buildWorkflow: 'require_approval',
	patchWorkflow: 'require_approval',
	deleteCredential: 'require_approval',
	createFolder: 'require_approval',
	deleteFolder: 'require_approval',
	moveWorkflowToFolder: 'require_approval',
	tagWorkflow: 'require_approval',
	createDataTable: 'require_approval',
	mutateDataTableSchema: 'require_approval',
	mutateDataTableRows: 'require_approval',
	cleanupTestExecutions: 'require_approval',
	readFilesystem: 'require_approval',
	fetchUrl: 'require_approval',
	restoreWorkflowVersion: 'require_approval',
};

// ---------------------------------------------------------------------------
// Admin settings — instance-scoped, admin-only
// ---------------------------------------------------------------------------

export interface InstanceAiAdminSettingsResponse {
	lastMessages: number;
	embedderModel: string;
	semanticRecallTopK: number;
	timeout: number;
	subAgentMaxSteps: number;
	browserMcp: boolean;
	permissions: InstanceAiPermissions;
	mcpServers: string;
	sandboxEnabled: boolean;
	sandboxProvider: string;
	sandboxImage: string;
	sandboxTimeout: number;
	daytonaCredentialId: string | null;
	searchCredentialId: string | null;
}

export interface InstanceAiAdminSettingsUpdateRequest {
	lastMessages?: number;
	embedderModel?: string;
	semanticRecallTopK?: number;
	timeout?: number;
	subAgentMaxSteps?: number;
	browserMcp?: boolean;
	permissions?: Partial<InstanceAiPermissions>;
	mcpServers?: string;
	sandboxEnabled?: boolean;
	sandboxProvider?: string;
	sandboxImage?: string;
	sandboxTimeout?: number;
	daytonaCredentialId?: string | null;
	searchCredentialId?: string | null;
}

// ---------------------------------------------------------------------------
// User preferences — per-user, self-service
// ---------------------------------------------------------------------------

export interface InstanceAiUserPreferencesResponse {
	credentialId: string | null;
	credentialType: string | null;
	credentialName: string | null;
	modelName: string;
	filesystemDisabled: boolean;
}

export interface InstanceAiUserPreferencesUpdateRequest {
	credentialId?: string | null;
	modelName?: string;
	filesystemDisabled?: boolean;
}

export interface InstanceAiModelCredential {
	id: string;
	name: string;
	type: string;
	provider: string;
}

export function getRenderHint(toolName: string): InstanceAiToolCallState['renderHint'] {
	if (toolName === 'update-tasks') return 'tasks';
	if (toolName === 'delegate') return 'delegate';
	if (toolName === 'build-workflow-with-agent') return 'builder';
	if (toolName === 'manage-data-tables-with-agent') return 'data-table';
	if (toolName === 'research-with-agent') return 'researcher';
	return 'default';
}
