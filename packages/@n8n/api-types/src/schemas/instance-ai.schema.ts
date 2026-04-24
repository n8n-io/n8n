import { z } from 'zod';

import { Z } from '../zod-class';
import { TimeZoneSchema } from './timezone.schema';

// ---------------------------------------------------------------------------
// Credits
// ---------------------------------------------------------------------------

/**
 * Sentinel value returned by `GET /instance-ai/credits` when the AI service
 * proxy is disabled (credits are not metered). Consumers should treat this as "unlimited".
 */
export const UNLIMITED_CREDITS = -1;

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
	'thread-title-updated',
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
	'planner',
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
			'Stable ID for the assistant message group that owns this run. Used to reconnect live activity back to the correct assistant bubble.',
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
	suggestedName: z.string().optional(),
});

export type InstanceAiCredentialRequest = z.infer<typeof credentialRequestSchema>;

export const credentialFlowSchema = z.object({
	stage: z.enum(['generic', 'finalize']),
});
export type InstanceAiCredentialFlow = z.infer<typeof credentialFlowSchema>;

export const workflowSetupNodeSchema = z.object({
	node: z.object({
		name: z.string(),
		type: z.string(),
		typeVersion: z.number(),
		parameters: z.record(z.unknown()),
		credentials: z.record(z.object({ id: z.string(), name: z.string() })).optional(),
		position: z.tuple([z.number(), z.number()]),
		id: z.string(),
	}),
	credentialType: z.string().optional(),
	existingCredentials: z.array(z.object({ id: z.string(), name: z.string() })).optional(),
	isTrigger: z.boolean(),
	isFirstTrigger: z.boolean().optional(),
	isTestable: z.boolean().optional(),
	isAutoApplied: z.boolean().optional(),
	credentialTestResult: z
		.object({
			success: z.boolean(),
			message: z.string().optional(),
		})
		.optional(),
	triggerTestResult: z
		.object({
			status: z.enum(['success', 'error', 'listening']),
			error: z.string().optional(),
		})
		.optional(),
	parameterIssues: z.record(z.array(z.string())).optional(),
	editableParameters: z
		.array(
			z.object({
				name: z.string(),
				displayName: z.string(),
				type: z.string(),
				required: z.boolean().optional(),
				default: z.unknown().optional(),
				options: z
					.array(
						z.object({
							name: z.string(),
							value: z.union([z.string(), z.number(), z.boolean()]),
						}),
					)
					.optional(),
			}),
		)
		.optional(),
	needsAction: z
		.boolean()
		.optional()
		.describe(
			'Whether this node still requires user intervention. ' +
				'False when credentials are set and valid, parameters are resolved, etc.',
		),
});
export type InstanceAiWorkflowSetupNode = z.infer<typeof workflowSetupNodeSchema>;

// ---------------------------------------------------------------------------
// Task list schemas (lightweight checklist for multi-step work)
// ---------------------------------------------------------------------------

export const taskItemSchema = z.object({
	id: z.string().describe('Unique task identifier'),
	description: z.string().describe('What this task accomplishes'),
	status: z.enum(['todo', 'in_progress', 'done', 'failed', 'cancelled']).describe('Current status'),
});

export type TaskItem = z.infer<typeof taskItemSchema>;

export const taskListSchema = z.object({
	tasks: z.array(taskItemSchema).describe('Ordered list of tasks'),
});

export type TaskList = z.infer<typeof taskListSchema>;

export const plannedTaskArgSchema = z.object({
	id: z.string(),
	title: z.string(),
	kind: z.string(),
	spec: z.string(),
	deps: z.array(z.string()),
	tools: z.array(z.string()).optional(),
	workflowId: z.string().optional(),
});

export type PlannedTaskArg = z.infer<typeof plannedTaskArgSchema>;

// ── Gateway resource confirmation (instance permission mode) ─────────────────

/** Protocol prefix used by the daemon to signal a resource-access confirmation is required. */
export const GATEWAY_CONFIRMATION_REQUIRED_PREFIX = 'GATEWAY_CONFIRMATION_REQUIRED::';

export const gatewayConfirmationRequiredPayloadSchema = z.object({
	toolGroup: z.string(),
	resource: z.string(),
	description: z.string(),
	/** Available decision options. */
	options: z.array(z.string()),
});

export type GatewayConfirmationRequiredPayload = z.infer<
	typeof gatewayConfirmationRequiredPayloadSchema
>;

// ---------------------------------------------------------------------------

export const confirmationRequestPayloadSchema = z.object({
	requestId: z.string(),
	inputThreadId: z
		.string()
		.optional()
		.describe('Unique ID linking input-related telemetry events in a confirmation session'),
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
		.enum(['approval', 'text', 'questions', 'plan-review', 'resource-decision'])
		.optional()
		.describe(
			'UI mode: approval (default) shows approve/deny, text shows a text input, ' +
				'questions shows structured Q&A wizard, plan-review shows plan approval with feedback, ' +
				'resource-decision shows 5-option gateway permission dialog',
		),
	questions: z
		.array(
			z.object({
				id: z.string(),
				question: z.string(),
				type: z.enum(['single', 'multi', 'text']),
				options: z.array(z.string()).optional(),
			}),
		)
		.optional()
		.describe('Structured questions for the Q&A wizard (inputType=questions)'),
	introMessage: z.string().optional().describe('Intro text shown above questions or plan review'),
	tasks: taskListSchema
		.optional()
		.describe('Task checklist for plan review (inputType=plan-review)'),
	planItems: z
		.array(plannedTaskArgSchema)
		.optional()
		.describe('Full planned task details for plan review (title, kind, spec, deps)'),
	domainAccess: domainAccessMetaSchema
		.optional()
		.describe('When present, renders domain-access approval UI instead of generic confirm'),
	credentialFlow: credentialFlowSchema
		.optional()
		.describe(
			'Credential flow stage — finalize renders post-verification credential picker with different copy',
		),
	setupRequests: z
		.array(workflowSetupNodeSchema)
		.optional()
		.describe('Per-node setup cards for workflow credential/parameter configuration'),
	workflowId: z.string().optional().describe('Workflow ID for setup-workflow tool'),
	resourceDecision: gatewayConfirmationRequiredPayloadSchema
		.optional()
		.describe('Gateway resource-access decision data (inputType=resource-decision)'),
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

export const mcpToolAnnotationsSchema = z.object({
	/** Tool category — used to route tools to the correct sub-agent (e.g. 'browser', 'filesystem') */
	category: z.string().optional(),
	/** If true, the tool does not modify its environment */
	readOnlyHint: z.boolean().optional(),
	/** If true, the tool may perform destructive updates */
	destructiveHint: z.boolean().optional(),
	/** If true, repeated calls with same args have no additional effect */
	idempotentHint: z.boolean().optional(),
	/** If true, tool interacts with external entities */
	openWorldHint: z.boolean().optional(),
});
export type McpToolAnnotations = z.infer<typeof mcpToolAnnotationsSchema>;

export const mcpToolSchema = z.object({
	name: z.string(),
	description: z.string().optional(),
	inputSchema: mcpInputSchema,
	annotations: mcpToolAnnotationsSchema.optional(),
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
export const toolCategorySchema = z.object({
	name: z.string(),
	enabled: z.boolean(),
	writeAccess: z.boolean().optional(),
});
export type ToolCategory = z.infer<typeof toolCategorySchema>;

export class InstanceAiGatewayCapabilitiesDto extends Z.class({
	rootPath: z.string(),
	tools: z.array(mcpToolSchema).default([]),
	hostIdentifier: z.string().optional(),
	toolCategories: z.array(toolCategorySchema).default([]),
}) {}
export type InstanceAiGatewayCapabilities = InstanceType<typeof InstanceAiGatewayCapabilitiesDto>;

// ---------------------------------------------------------------------------
// Filesystem bridge payloads (browser ↔ server round-trip)
// ---------------------------------------------------------------------------

export const filesystemRequestPayloadSchema = z.object({
	requestId: z.string(),
	toolCall: mcpToolCallRequestSchema,
});

export class InstanceAiFilesystemResponseDto extends Z.class({
	result: mcpToolCallResultSchema.optional(),
	error: z.string().optional(),
}) {}

export const tasksUpdatePayloadSchema = z.object({
	tasks: taskListSchema,
	planItems: z.array(plannedTaskArgSchema).optional(),
});

export const threadTitleUpdatedPayloadSchema = z.object({
	title: z.string(),
});

// ---------------------------------------------------------------------------
// Event schema (Zod discriminated union — single source of truth)
// ---------------------------------------------------------------------------

const eventBase = {
	runId: z.string(),
	agentId: z.string(),
	userId: z.string().optional(),
	/** Anthropic API response ID (msg_01...) — groups events from the same LLM response. */
	responseId: z.string().optional(),
};

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
	z.object({
		type: z.literal('thread-title-updated'),
		...eventBase,
		payload: threadTitleUpdatedPayloadSchema,
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
export type InstanceAiThreadTitleUpdatedEvent = Extract<
	InstanceAiEvent,
	{ type: 'thread-title-updated' }
>;

export type InstanceAiFilesystemResponse = InstanceType<typeof InstanceAiFilesystemResponseDto>;

// ---------------------------------------------------------------------------
// API types
// ---------------------------------------------------------------------------

const instanceAiAttachmentSchema = z.object({
	data: z.string().max(700_000), // ~512 KB decoded + base64 overhead
	mimeType: z.string().max(100),
	fileName: z.string().max(300),
});

export type InstanceAiAttachment = z.infer<typeof instanceAiAttachmentSchema>;

export class InstanceAiSendMessageRequest extends Z.class({
	message: z.string().default(''),
	researchMode: z.boolean().optional(),
	attachments: z.array(instanceAiAttachmentSchema).max(10).optional(),
	timeZone: TimeZoneSchema,
	pushRef: z.string().optional(),
}) {}

export class InstanceAiCorrectTaskRequest extends Z.class({
	message: z.string().min(1),
}) {}

export class InstanceAiEnsureThreadRequest extends Z.class({
	threadId: z.string().uuid().optional(),
}) {}

export const instanceAiGatewayKeySchema = z.string().min(1).max(256);

export class InstanceAiGatewayEventsQuery extends Z.class({
	apiKey: instanceAiGatewayKeySchema,
}) {}

export class InstanceAiEventsQuery extends Z.class({
	lastEventId: z.coerce.number().int().nonnegative().optional(),
}) {}

export class InstanceAiThreadMessagesQuery extends Z.class({
	limit: z.coerce.number().int().positive().default(50),
	page: z.coerce.number().int().nonnegative().default(0),
	raw: z.enum(['true', 'false']).optional(),
}) {}

export interface InstanceAiSendMessageResponse {
	runId: string;
}

export interface InstanceAiConfirmResponse {
	approved: boolean;
	credentialId?: string;
	credentials?: Record<string, string>;
	/** Per-node credential assignments: `{ nodeName: { credType: credId } }`.
	 *  Preferred over `credentials` when present — enables card-scoped selection. */
	nodeCredentials?: Record<string, Record<string, string>>;
	autoSetup?: { credentialType: string };
	userInput?: string;
	domainAccessAction?: DomainAccessAction;
	resourceDecision?: string;
	action?: 'apply' | 'test-trigger';
	nodeParameters?: Record<string, Record<string, unknown>>;
	testTriggerNode?: string;
	answers?: Array<{
		questionId: string;
		selectedOptions: string[];
		customText?: string;
		skipped?: boolean;
	}>;
}

// ---------------------------------------------------------------------------
// Frontend store types (shared so both sides agree on structure)
// ---------------------------------------------------------------------------

export interface InstanceAiConfirmation {
	requestId: string;
	inputThreadId?: string;
	severity: InstanceAiConfirmationSeverity;
	message: string;
	credentialRequests?: InstanceAiCredentialRequest[];
	projectId?: string;
	inputType?: 'approval' | 'text' | 'questions' | 'plan-review' | 'resource-decision';
	domainAccess?: DomainAccessMeta;
	credentialFlow?: InstanceAiCredentialFlow;
	setupRequests?: InstanceAiWorkflowSetupNode[];
	workflowId?: string;
	planItems?: PlannedTaskArg[];
	questions?: Array<{
		id: string;
		question: string;
		type: 'single' | 'multi' | 'text';
		options?: string[];
	}>;
	introMessage?: string;
	tasks?: TaskList;
	resourceDecision?: GatewayConfirmationRequiredPayload;
}

export interface InstanceAiToolCallState {
	toolCallId: string;
	toolName: string;
	args: Record<string, unknown>;
	result?: unknown;
	error?: string;
	isLoading: boolean;
	renderHint?:
		| 'tasks'
		| 'delegate'
		| 'builder'
		| 'data-table'
		| 'researcher'
		| 'planner'
		| 'default';
	confirmation?: InstanceAiConfirmation;
	confirmationStatus?: 'pending' | 'approved' | 'denied';
	startedAt?: string;
	completedAt?: string;
}

export type InstanceAiTimelineEntry =
	| { type: 'text'; content: string; responseId?: string }
	| { type: 'tool-call'; toolCallId: string; responseId?: string }
	| { type: 'child'; agentId: string; responseId?: string };

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
	/** Full planned task details — updated progressively by plan-with-agent via tasks-update. */
	planItems?: PlannedTaskArg[];
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
	metadata?: Record<string, unknown>;
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
// Thread status response (detached task visibility)
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

const instanceAiPermissionModeSchema = z.enum(['require_approval', 'always_allow', 'blocked']);

export type InstanceAiPermissionMode = z.infer<typeof instanceAiPermissionModeSchema>;

const instanceAiPermissionsSchema = z.object({
	createWorkflow: instanceAiPermissionModeSchema,
	updateWorkflow: instanceAiPermissionModeSchema,
	runWorkflow: instanceAiPermissionModeSchema,
	publishWorkflow: instanceAiPermissionModeSchema,
	deleteWorkflow: instanceAiPermissionModeSchema,
	deleteCredential: instanceAiPermissionModeSchema,
	createFolder: instanceAiPermissionModeSchema,
	deleteFolder: instanceAiPermissionModeSchema,
	moveWorkflowToFolder: instanceAiPermissionModeSchema,
	tagWorkflow: instanceAiPermissionModeSchema,
	createDataTable: instanceAiPermissionModeSchema,
	deleteDataTable: instanceAiPermissionModeSchema,
	mutateDataTableSchema: instanceAiPermissionModeSchema,
	mutateDataTableRows: instanceAiPermissionModeSchema,
	cleanupTestExecutions: instanceAiPermissionModeSchema,
	readFilesystem: instanceAiPermissionModeSchema,
	fetchUrl: instanceAiPermissionModeSchema,
	restoreWorkflowVersion: instanceAiPermissionModeSchema,
});

export type InstanceAiPermissions = z.infer<typeof instanceAiPermissionsSchema>;

export const DEFAULT_INSTANCE_AI_PERMISSIONS: InstanceAiPermissions = {
	createWorkflow: 'require_approval',
	updateWorkflow: 'require_approval',
	runWorkflow: 'require_approval',
	publishWorkflow: 'require_approval',
	deleteWorkflow: 'require_approval',
	deleteCredential: 'require_approval',
	createFolder: 'require_approval',
	deleteFolder: 'require_approval',
	moveWorkflowToFolder: 'require_approval',
	tagWorkflow: 'require_approval',
	createDataTable: 'require_approval',
	deleteDataTable: 'require_approval',
	mutateDataTableSchema: 'require_approval',
	mutateDataTableRows: 'require_approval',
	cleanupTestExecutions: 'require_approval',
	readFilesystem: 'require_approval',
	fetchUrl: 'require_approval',
	restoreWorkflowVersion: 'require_approval',
};

/** Permission keys that remain active when branchReadOnly is enabled.
 *  When changing this set, also update the read-only section in
 *  `packages/@n8n/instance-ai/src/agent/system-prompt.ts` (`getReadOnlySection`). */
const BRANCH_READ_ONLY_SAFE_PERMISSIONS: ReadonlySet<keyof InstanceAiPermissions> = new Set([
	'readFilesystem',
	'fetchUrl',
	'publishWorkflow',
	'deleteCredential',
	'restoreWorkflowVersion',
]);

/** Returns a copy of permissions with all write operations set to 'blocked',
 *  except for the safelisted ones that are allowed on read-only instances. */
export function applyBranchReadOnlyOverrides(
	permissions: InstanceAiPermissions,
): InstanceAiPermissions {
	const overridden = { ...permissions };
	for (const key of Object.keys(overridden) as Array<keyof InstanceAiPermissions>) {
		if (!BRANCH_READ_ONLY_SAFE_PERMISSIONS.has(key)) {
			overridden[key] = 'blocked';
		}
	}
	return overridden;
}

// ---------------------------------------------------------------------------
// Admin settings — instance-scoped, admin-only
// ---------------------------------------------------------------------------

export interface InstanceAiAdminSettingsResponse {
	enabled: boolean;
	lastMessages: number;
	embedderModel: string;
	semanticRecallTopK: number;
	subAgentMaxSteps: number;
	browserMcp: boolean;
	permissions: InstanceAiPermissions;
	mcpServers: string;
	sandboxEnabled: boolean;
	sandboxProvider: string;
	sandboxImage: string;
	sandboxTimeout: number;
	daytonaCredentialId: string | null;
	n8nSandboxCredentialId: string | null;
	searchCredentialId: string | null;
	localGatewayDisabled: boolean;
	optinModalDismissed: boolean;
}

export class InstanceAiAdminSettingsUpdateRequest extends Z.class({
	enabled: z.boolean().optional(),
	lastMessages: z.number().int().positive().optional(),
	embedderModel: z.string().optional(),
	semanticRecallTopK: z.number().int().positive().optional(),
	subAgentMaxSteps: z.number().int().positive().optional(),
	browserMcp: z.boolean().optional(),
	permissions: instanceAiPermissionsSchema.partial().optional(),
	mcpServers: z.string().optional(),
	sandboxEnabled: z.boolean().optional(),
	sandboxProvider: z.string().optional(),
	sandboxImage: z.string().optional(),
	sandboxTimeout: z.number().int().positive().optional(),
	daytonaCredentialId: z.string().nullable().optional(),
	n8nSandboxCredentialId: z.string().nullable().optional(),
	searchCredentialId: z.string().nullable().optional(),
	localGatewayDisabled: z.boolean().optional(),
	optinModalDismissed: z.boolean().optional(),
}) {}

// ---------------------------------------------------------------------------
// User preferences — per-user, self-service
// ---------------------------------------------------------------------------

export interface InstanceAiUserPreferencesResponse {
	credentialId: string | null;
	credentialType: string | null;
	credentialName: string | null;
	modelName: string;
	localGatewayDisabled: boolean;
}

export class InstanceAiUserPreferencesUpdateRequest extends Z.class({
	credentialId: z.string().nullable().optional(),
	modelName: z.string().optional(),
	localGatewayDisabled: z.boolean().optional(),
}) {}

export interface InstanceAiModelCredential {
	id: string;
	name: string;
	type: string;
	provider: string;
}

const BUILDER_RENDER_HINT_TOOLS = new Set(['build-workflow-with-agent', 'workflow-build-flow']);
const DATA_TABLE_RENDER_HINT_TOOLS = new Set([
	'manage-data-tables-with-agent',
	'agent-data-table-manager',
]);
const RESEARCH_RENDER_HINT_TOOLS = new Set(['research-with-agent']);
const PLANNER_RENDER_HINT_TOOLS = new Set(['plan']);

export function getRenderHint(toolName: string): InstanceAiToolCallState['renderHint'] {
	if (toolName === 'task-control') return 'tasks';
	if (toolName === 'delegate') return 'delegate';
	if (BUILDER_RENDER_HINT_TOOLS.has(toolName)) return 'builder';
	if (DATA_TABLE_RENDER_HINT_TOOLS.has(toolName)) return 'data-table';
	if (RESEARCH_RENDER_HINT_TOOLS.has(toolName)) return 'researcher';
	if (PLANNER_RENDER_HINT_TOOLS.has(toolName)) return 'planner';
	return 'default';
}

// ---------------------------------------------------------------------------
// Eval mock execution — request/response types for LLM-based workflow evaluation
// ---------------------------------------------------------------------------

export type InstanceAiEvalNodeExecutionMode = 'mocked' | 'pinned' | 'real';

export interface InstanceAiEvalInterceptedRequest {
	url: string;
	method: string;
	nodeType: string;
	/** The request body sent by the node (if any) */
	requestBody?: unknown;
	/** The mock response body returned by the LLM handler for this request */
	mockResponse?: unknown;
}

export interface InstanceAiEvalNodeResult {
	output: unknown;
	/** Full count of output items (`output` is truncated for artifact size) */
	outputCount?: number;
	interceptedRequests: InstanceAiEvalInterceptedRequest[];
	executionMode: InstanceAiEvalNodeExecutionMode;
	/** Missing required parameters detected before execution (empty = fully configured) */
	configIssues?: Record<string, string[]>;
	/** Epoch ms when the node started executing — used to sort the execution trace chronologically */
	startTime?: number;
}

export interface InstanceAiEvalMockHints {
	globalContext: string;
	triggerContent: Record<string, unknown>;
	nodeHints: Record<string, string>;
	warnings: string[];
	/** Pin data generated for nodes that bypass the HTTP mock layer (AI roots, protocol nodes) */
	bypassPinData: Record<string, Array<{ json: Record<string, unknown> }>>;
}

export interface InstanceAiEvalExecutionResult {
	executionId: string;
	success: boolean;
	nodeResults: Record<string, InstanceAiEvalNodeResult>;
	errors: string[];
	hints: InstanceAiEvalMockHints;
}

export class InstanceAiEvalExecutionRequest extends Z.class({
	scenarioHints: z.string().max(2000).optional(),
}) {}

// ---------------------------------------------------------------------------
// Sub-agent evaluation endpoint
// ---------------------------------------------------------------------------

export class InstanceAiEvalSubAgentRequest extends Z.class({
	/** Role name from the server's sub-agent registry (currently: "builder"). */
	role: z.string().min(1).max(64),
	/** The task the sub-agent should perform. */
	prompt: z.string().min(1).max(10_000),
	/** Optional model override. Defaults to the server's configured Instance AI model. */
	modelId: z.string().min(1).optional(),
	/** Max agent steps. Defaults to 40. */
	maxSteps: z.number().int().positive().max(200).optional(),
	/** Per-run timeout in ms. Defaults to 120_000. Max: 600_000. */
	timeoutMs: z.number().int().positive().max(600_000).optional(),
}) {}

export interface InstanceAiEvalToolCall {
	toolName: string;
	args: unknown;
}

export interface InstanceAiEvalToolResult {
	toolName: string;
	result: unknown;
	isError: boolean;
}

export interface InstanceAiEvalSubAgentResponse {
	text: string;
	toolCalls: InstanceAiEvalToolCall[];
	toolResults: InstanceAiEvalToolResult[];
	capturedWorkflowIds: string[];
	durationMs: number;
	stopReason?: string;
	error?: string;
}
