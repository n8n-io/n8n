import { z } from 'zod';

import { Z } from '../zod-class';
import type { McpRegistryServerIconResponse } from './mcp-registry.schema';
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
// Session grant keys ("always allow")
// ---------------------------------------------------------------------------

/**
 * Builds the thread-level "always allow" grant key for running a specific workflow.
 *
 * The backend executions tool records and checks this key; the frontend mirrors it for
 * in-session auto-approval. They must produce the identical string or a UI grant won't
 * line up with the persisted one — keeping the format here is the single source of truth.
 * New gated actions (e.g. domain access, data-table ops) should add sibling builders here.
 */
export function buildRunWorkflowSessionGrantKey(workflowId: string): string {
	return `executions:run:${workflowId}`;
}

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
	'delegate',
	'planner',
	'eval-setup',
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

export const webSearchMetaSchema = z.object({
	query: z.string(),
});
export type WebSearchMeta = z.infer<typeof webSearchMetaSchema>;

export const UNSAFE_OBJECT_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

export function isSafeObjectKey(key: string): boolean {
	return !UNSAFE_OBJECT_KEYS.has(key);
}

// ---------------------------------------------------------------------------
// Event payloads
// ---------------------------------------------------------------------------

export const runStartPayloadSchema = z.object({
	messageId: z.string().describe('Correlates with the user message that triggered this run'),
	traceId: z.string().optional().describe('OpenTelemetry trace ID for correlating logs and errors'),
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
	/**
	 * Workflow IDs the run-finish reap soft-deleted — intermediate
	 * stepping-stones the agent created but never promoted to the main
	 * deliverable. Surfaced to the UI so the artifacts panel can dim these
	 * entries and label them as archived.
	 */
	archivedWorkflowIds: z.array(z.string()).optional(),
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
	subnodeRootNode: z
		.object({
			name: z.string(),
			type: z.string(),
			typeVersion: z.number(),
			id: z.string(),
		})
		.optional()
		.describe(
			'Snapshot of the root node for this sub-node connected via a non-Main port (e.g. ai_languageModel, ai_memory, ai_tool). Carries the metadata needed to render the group header even when the root node itself has no setup request.',
		),
});
export type InstanceAiWorkflowSetupNode = z.infer<typeof workflowSetupNodeSchema>;

// ---------------------------------------------------------------------------
// Task list schemas (lightweight checklist for multi-step work)
// ---------------------------------------------------------------------------

export const taskItemSchema = z.object({
	id: z.string().describe('Unique task identifier'),
	description: z.string().describe('What this task accomplishes'),
	detail: z.string().optional().describe('Secondary lifecycle state or evidence for this task'),
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
	isSupportingWorkflow: z.boolean().optional(),
});

export type PlannedTaskArg = z.infer<typeof plannedTaskArgSchema>;

// ── Gateway resource confirmation (instance permission mode) ─────────────────

/** Protocol prefix used by the daemon to signal a resource-access confirmation is required. */
export const GATEWAY_CONFIRMATION_REQUIRED_PREFIX = 'GATEWAY_CONFIRMATION_REQUIRED::';

export const instanceGatewayResourceDecisionSchema = z.enum([
	'denyOnce',
	'allowOnce',
	'allowForSession',
]);
export type InstanceGatewayResourceDecision = z.infer<typeof instanceGatewayResourceDecisionSchema>;

export const gatewayConfirmationRequiredWirePayloadSchema = z.object({
	toolGroup: z.string(),
	resource: z.string(),
	description: z.string(),
	/** Available decision options. */
	options: z.array(z.string()),
});

export type GatewayConfirmationRequiredWirePayload = z.infer<
	typeof gatewayConfirmationRequiredWirePayloadSchema
>;

export const gatewayConfirmationRequiredPayloadSchema =
	gatewayConfirmationRequiredWirePayloadSchema.extend({
		options: z.array(instanceGatewayResourceDecisionSchema),
	});

export type GatewayConfirmationRequiredPayload = z.infer<
	typeof gatewayConfirmationRequiredPayloadSchema
>;

// ---------------------------------------------------------------------------

export const confirmationInputTypeSchema = z.enum([
	'approval',
	'text',
	'questions',
	'plan-review',
	'resource-decision',
	'continue',
]);
export type InstanceAiConfirmationInputType = z.infer<typeof confirmationInputTypeSchema>;

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
	inputType: confirmationInputTypeSchema
		.optional()
		.describe(
			'UI mode: approval (default) shows approve/deny, text shows a text input, ' +
				'questions shows structured Q&A wizard, plan-review shows plan approval with feedback, ' +
				'resource-decision shows 5-option gateway permission dialog, ' +
				'continue shows a single primary button (used by pause-for-user)',
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
	webSearch: webSearchMetaSchema
		.optional()
		.describe('When present, renders web-search approval UI instead of generic confirm'),
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
export type InstanceAiConfirmationRequestPayload = z.infer<typeof confirmationRequestPayloadSchema>;

function isNonEmptyString(value: unknown): value is string {
	return typeof value === 'string' && value.trim().length > 0;
}

function hasItems<T>(items: T[] | undefined): items is [T, ...T[]] {
	return Array.isArray(items) && items.length > 0;
}

function argsContainPlannedTasks(args: Record<string, unknown>): boolean {
	const tasks = args.tasks;
	if (!Array.isArray(tasks)) return false;

	return tasks.some((task) => plannedTaskArgSchema.safeParse(task).success);
}

function assertNever(value: never): never {
	throw new Error(`Unhandled confirmation input type: ${String(value)}`);
}

/**
 * True when the current frontend has enough typed confirmation payload to show
 * a meaningful waiting-for-user UI. Correlation metadata alone must not count.
 */
export function isDisplayableConfirmationRequest(
	payload: InstanceAiConfirmationRequestPayload,
): boolean {
	if (hasItems(payload.setupRequests)) return true;
	if (hasItems(payload.credentialRequests)) return true;
	if (payload.domainAccess) return true;

	const inputType = payload.inputType ?? 'approval';
	switch (inputType) {
		case 'approval':
		case 'text':
		case 'continue':
			return isNonEmptyString(payload.message);
		case 'questions':
			return hasItems(payload.questions);
		case 'plan-review':
			return hasItems(payload.planItems) || argsContainPlannedTasks(payload.args);
		case 'resource-decision':
			return payload.resourceDecision !== undefined;
		default:
			return assertNever(inputType);
	}
}

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

const mcpBlobResourceContentSchema = z.object({
	type: z.literal('resource'),
	resource: z.object({
		uri: z.string(),
		mimeType: z.string().optional(),
		blob: z.string(),
	}),
});

export const mcpToolCallResultSchema = z.object({
	content: z.array(
		z.union([mcpTextContentSchema, mcpImageContentSchema, mcpBlobResourceContentSchema]),
	),
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

export class InstanceAiGatewayCreateCredentialDto extends Z.class({
	name: z.string().min(1).max(128),
	type: z.string().min(1).max(128),
	data: z.record(z.unknown()),
	projectId: z.string().optional(),
}) {}

export interface InstanceAiBrowserCreateLinkResponse {
	connectUrl: string;
	expiresAt: string | null;
	ttlSeconds: number | null;
}

export interface InstanceAiBrowserStatusResponse {
	connected: boolean;
	connectedAt: string | null;
	toolCategories: ToolCategory[];
}

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

/** A binary file the user attached to a message (image, CSV, PDF, …). */
export const instanceAiFileAttachmentSchema = z.object({
	type: z.literal('file'),
	// Base64 inflates ~4/3 — 14M chars covers ~10MB decoded.
	data: z.string().max(14_000_000, { message: 'Attachment exceeds 10 MB limit' }),
	mimeType: z.string().max(100),
	fileName: z.string().max(300),
});
export type InstanceAiFileAttachment = z.infer<typeof instanceAiFileAttachmentSchema>;

/**
 * A workflow reference the editor hands off to a message. Carries no bytes — the
 * agent resolves it with its tools and the FE shows it as an artifact tab.
 */
export const instanceAiWorkflowAttachmentSchema = z.object({
	type: z.literal('workflow'),
	id: z.string().min(1).max(64),
	name: z.string().max(255).optional(),
	/** Execution shown on the editor canvas at hand-off. */
	executionId: z.string().min(1).max(64).optional(),
});
export type InstanceAiWorkflowAttachment = z.infer<typeof instanceAiWorkflowAttachmentSchema>;

/** Anything attachable to a message: a binary file or a resource reference. */
export const instanceAiAttachmentSchema = z.discriminatedUnion('type', [
	instanceAiFileAttachmentSchema,
	instanceAiWorkflowAttachmentSchema,
]);
export type InstanceAiAttachment = z.infer<typeof instanceAiAttachmentSchema>;

export const instanceAiCredentialHandoffContextSchema = z.object({
	source: z.literal('credential-modal'),
	credential: z.object({
		credentialType: z.string().min(1).max(255),
		displayName: z.string().min(1).max(255),
		id: z.string().min(1).max(128).optional(),
		nodeName: z.string().min(1).max(255).optional(),
		nodeType: z.string().min(1).max(255).optional(),
		documentationUrl: z.string().url().max(2048).optional(),
		oauthRedirectUrl: z.string().url().max(2048).optional(),
	}),
});
export type InstanceAiCredentialHandoffContext = z.infer<
	typeof instanceAiCredentialHandoffContextSchema
>;

export const instanceAiHandoffContextSchema = z.discriminatedUnion('source', [
	instanceAiCredentialHandoffContextSchema,
]);
export type InstanceAiHandoffContext = z.infer<typeof instanceAiHandoffContextSchema>;

export class InstanceAiSendMessageRequest extends Z.class({
	message: z.string().default(''),
	attachments: z.array(instanceAiAttachmentSchema).max(10).optional(),
	context: instanceAiHandoffContextSchema.optional(),
	timeZone: TimeZoneSchema,
	pushRef: z.string().optional(),
}) {}

export class InstanceAiCorrectTaskRequest extends Z.class({
	message: z.string().min(1),
}) {}

export class InstanceAiEnsureThreadRequest extends Z.class({
	threadId: z.string().uuid().optional(),
	projectId: z.string().min(1),
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
	inputType?: 'approval' | 'text' | 'questions' | 'plan-review' | 'resource-decision' | 'continue';
	domainAccess?: DomainAccessMeta;
	webSearch?: WebSearchMeta;
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
	expired?: boolean;
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
		| 'researcher'
		| 'data-table'
		| 'planner'
		| 'eval-setup'
		| 'skill'
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
	/** Background task ID — present only for background agents. */
	taskId?: string;
	/** Agent kind for card dispatch (builder, data-table, delegate, planner, eval-setup). */
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
	/** Full planned task details — updated by create-tasks via tasks-update. */
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
	updatedAt: string;
	metadata?: Record<string, unknown>;
}

export type InstanceAiSSEConnectionState =
	| 'disconnected'
	| 'connecting'
	| 'connected'
	| 'reconnecting';

// ---------------------------------------------------------------------------
// Thread Inspector types (debug panel — raw agent memory inspection)
// ---------------------------------------------------------------------------

export interface InstanceAiThreadInfo {
	id: string;
	title?: string;
	resourceId: string;
	projectId?: string;
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
// Run debug buffer (dev panel — orchestrator LLM steps + workflow code)
// ---------------------------------------------------------------------------

export interface InstanceAiRunDebugSummary {
	runId: string;
	threadId: string;
	startedAt: number;
	stepCount: number;
	workflowCodeCount: number;
	label?: string;
}

export interface InstanceAiRunDebugStep {
	stepNumber: number;
	input?: Record<string, unknown>;
	output?: Record<string, unknown>;
}

export interface InstanceAiRunDebugWorkflowCodeSnapshot {
	code: string;
	source: 'full-code' | 'patch';
	patches?: unknown;
	workflowId?: string;
	toolCallId?: string;
	success: boolean;
	errors?: string[];
	capturedAt: number;
}

export interface InstanceAiRunDebugResponse {
	threadId: string;
	runId: string;
	startedAt: number;
	label?: string;
	steps: InstanceAiRunDebugStep[];
	workflowCode: InstanceAiRunDebugWorkflowCodeSnapshot[];
}

export interface InstanceAiThreadDebugRunsResponse {
	runs: InstanceAiRunDebugSummary[];
	threadId: string;
}

// ---------------------------------------------------------------------------
// Rich messages response (session-restored view with agent trees)
// ---------------------------------------------------------------------------

export interface InstanceAiRichMessagesResponse {
	threadId: string;
	projectId?: string;
	messages: InstanceAiMessage[];
	/** Next SSE event ID for this thread — use as cursor to avoid replaying events already covered by these messages. */
	nextEventId: number;
}

// ---------------------------------------------------------------------------
// Thread status response (detached task visibility)
// ---------------------------------------------------------------------------

export const INSTANCE_AI_MEMORY_TASK_WAIT_TIMEOUT_MS = 30_000;

export type InstanceAiMemoryTaskKind = 'observer' | 'reflector';

export type InstanceAiMemoryTaskStatus = 'queued' | 'running';

export interface InstanceAiMemoryTaskSnapshot {
	taskId: string;
	taskKind: InstanceAiMemoryTaskKind;
	status: InstanceAiMemoryTaskStatus;
	startedAt?: number;
}

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
	/** In-flight observational-memory jobs (observer/reflector). Used by eval harnesses. */
	memoryTasks?: InstanceAiMemoryTaskSnapshot[];
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
	webSearch: instanceAiPermissionModeSchema,
	restoreWorkflowVersion: instanceAiPermissionModeSchema,
	executeMcpTool: instanceAiPermissionModeSchema,
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
	webSearch: 'require_approval',
	restoreWorkflowVersion: 'require_approval',
	executeMcpTool: 'require_approval',
};

/**
 * Permission keys that remain active when branchReadOnly is enabled.
 *
 * This set mirrors n8n's own backend permission model for protected branches:
 * publish/unpublish, credential delete/update, and workflow update have no
 * hard backend lockout — only project-scope gates. branchReadOnly is a
 * UX-level nudge toward the source-control sync workflow, not a global write
 * block (only data-table mutations have a hard middleware lockout). Trimming
 * this set would make the AI stricter than human users on the same instance.
 *
 * When changing this set, also update the read-only section in
 * `packages/@n8n/instance-ai/src/agent/system-prompt.ts` (`getReadOnlySection`).
 */
const BRANCH_READ_ONLY_SAFE_PERMISSIONS: ReadonlySet<keyof InstanceAiPermissions> = new Set([
	'readFilesystem',
	'fetchUrl',
	'webSearch',
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

export const instanceAiSandboxProviderSchema = z.enum(['n8n-sandbox', 'daytona']);
export type InstanceAiSandboxProvider = z.infer<typeof instanceAiSandboxProviderSchema>;

export function isInstanceAiSandboxProvider(value: unknown): value is InstanceAiSandboxProvider {
	return instanceAiSandboxProviderSchema.safeParse(value).success;
}

export interface InstanceAiAdminSettingsResponse {
	enabled: boolean;
	subAgentMaxSteps: number;
	permissions: InstanceAiPermissions;
	mcpServers: string;
	mcpAccessEnabled: boolean;
	sandboxEnabled: boolean;
	sandboxProvider: InstanceAiSandboxProvider;
	sandboxImage: string;
	sandboxTimeout: number;
	daytonaCredentialId: string | null;
	n8nSandboxCredentialId: string | null;
	searchCredentialId: string | null;
	localGatewayDisabled: boolean;
	browserUseEnabled: boolean;
}

export class InstanceAiAdminSettingsUpdateRequest extends Z.class({
	enabled: z.boolean().optional(),
	subAgentMaxSteps: z.number().int().positive().optional(),
	permissions: instanceAiPermissionsSchema.partial().optional(),
	mcpServers: z.string().optional(),
	mcpAccessEnabled: z.boolean().optional(),
	sandboxEnabled: z.boolean().optional(),
	sandboxProvider: instanceAiSandboxProviderSchema.optional(),
	sandboxImage: z.string().optional(),
	sandboxTimeout: z.number().int().positive().optional(),
	daytonaCredentialId: z.string().nullable().optional(),
	n8nSandboxCredentialId: z.string().nullable().optional(),
	searchCredentialId: z.string().nullable().optional(),
	localGatewayDisabled: z.boolean().optional(),
	browserUseEnabled: z.boolean().optional(),
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

// ---------------------------------------------------------------------------
// MCP registry connections — per-user
// ---------------------------------------------------------------------------

export interface InstanceAiMcpConnectionResponse {
	id: string;
	serverSlug: string;
	/** Display title from the registry server (e.g. "Notion"). Falls back to `serverSlug` if the server is no longer in the registry. */
	serverTitle: string;
	/**
	 * Icons for the registry server, with optional `theme` tagging so the FE
	 * can pick a light- or dark-mode variant. Empty if the server is no longer
	 * in the registry.
	 */
	serverIcons: McpRegistryServerIconResponse[];
	credentialId: string;
	credentialName: string;
	credentialType: string;
	createdAt: string;
	updatedAt: string;
}

export function getRenderHint(toolName: string): InstanceAiToolCallState['renderHint'] {
	if (toolName === 'task-control') return 'tasks';
	if (toolName === 'delegate') return 'delegate';
	if (toolName === 'build-workflow' || toolName === 'build-workflow-with-agent') return 'builder';
	if (toolName === 'research-with-agent') return 'researcher';
	if (toolName === 'create-tasks') return 'planner';
	if (toolName === 'eval-setup-with-agent') return 'eval-setup';
	if (toolName === 'list_skills' || toolName === 'load_skill') return 'skill';
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
	/** Outputs by connection type → per-branch items. Empty when pinned, errored, or didn't run. */
	outputs: Record<string, unknown[][]>;
	/** Total items across all branches (full untruncated count). */
	outputCount: number;
	/** True when any branch in `outputs` was truncated for size. */
	truncated?: boolean;
	/** Number of times this node ran (>1 inside loops). `outputs` captures the LAST iteration. */
	iterationCount: number;
	/** 0-based index of the first iteration that errored, if any. */
	firstErrorIteration?: number;
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

export interface InstanceAiEvalMockedCredential {
	nodeName: string;
	credentialType: string;
	credentialId?: string;
}

/**
 * PostHog kill-switch flag for the eval vendor SDK interception code path.
 *
 * Resolution semantics (consult `EvalExecutionService.isInterceptionEnabled`
 * for the implementation):
 *   - **Flag set to `true`**, or **unset** (no rule configured in PostHog):
 *     interception is ENABLED. The flag is default-on; operators flip it to
 *     `false` to kill the feature in an emergency.
 *   - **Flag set to `false`**: interception is DISABLED. Requests with
 *     `unpinNodes` are refused with a clear error so vendor traffic can
 *     never reach the real provider — the wire server never boots.
 *   - **Resolution error** (PostHog unreachable/unhealthy): treated as
 *     DISABLED (fail-closed). A kill-switch must work when the flag plane
 *     itself is degraded; an outage is the moment to refuse rather than
 *     silently run the rewrite.
 */
export const EVAL_VENDOR_SDK_INTERCEPTION_FLAG = '085_eval_vendor_sdk_interception';

/**
 * Records a credential field that was rewritten (e.g. routed to the eval wire
 * server) during evaluation. Populated for every AI root the server intercepts;
 * empty when the kill-switch is off or every root was auto-/explicit-pinned.
 */
export interface InstanceAiEvalRewrittenCredential {
	nodeName: string;
	credentialType: string;
	credentialId?: string;
	field: string;
}

export interface InstanceAiEvalExecutionResult {
	executionId: string;
	success: boolean;
	nodeResults: Record<string, InstanceAiEvalNodeResult>;
	errors: string[];
	hints: InstanceAiEvalMockHints;
	mockedCredentials: InstanceAiEvalMockedCredential[];
	rewrittenCredentials?: InstanceAiEvalRewrittenCredential[];
}

export class InstanceAiEvalExecutionRequest extends Z.class({
	scenarioHints: z.string().max(2000).optional(),
	/**
	 * AI root nodes (Agent, Chain) that should stay pinned — opt-out from the
	 * default-on wire-server interception path. Useful when the caller wants
	 * to keep a specific root on the pinned baseline (e.g. for A/B comparison)
	 * even though its sub-nodes are interceptable.
	 *
	 * The server auto-pins AI roots whose inbound `ai_*` sub-nodes are
	 * incompatible (protocol-binary memory/vector store, unsupported vendor
	 * LLM, configured `options.baseURL` override, shared with another root)
	 * — callers do not need to list those here.
	 *
	 * Validated up front: unknown / disabled / non-AI-root names come back
	 * as an error-shaped `InstanceAiEvalExecutionResult`.
	 */
	pinNodes: z.array(z.string().min(1)).max(50).optional(),
}) {}

export class InstanceAiEvalCredentialAllowlistRequest extends Z.class({
	threadId: z.string().uuid(),
	/**
	 * Credential IDs the thread's builder context may see. `list()` results are
	 * filtered to this set — an empty array means the thread sees no credentials.
	 */
	credentialIds: z.array(z.string().min(1)).max(50),
}) {}

/** A workflow a conversation seed references, recreated at its given id so the
 *  seeded history resolves. Content is opaque here; the server validates it. */
const instanceAiEvalSeedWorkflowSchema = z.object({
	id: z.string().min(1).max(64),
	name: z.string().min(1).max(255),
	nodes: z.array(z.record(z.unknown())).max(500),
	connections: z.record(z.unknown()),
});

export type InstanceAiEvalSeedWorkflow = z.infer<typeof instanceAiEvalSeedWorkflowSchema>;

/** A data table a seed references. Recreated on restore (its id is server-
 *  generated, so the seed workflows' references are rewritten to the new id).
 *  Schema only — no rows (the table just needs to exist; rows are the trace's
 *  highest-PII payload and are never sent here). */
const instanceAiEvalSeedDataTableSchema = z.object({
	id: z.string().min(1).max(64),
	name: z.string().min(1).max(128),
	columns: z
		.array(
			z.object({
				name: z.string().min(1).max(128),
				type: z.enum(['string', 'number', 'boolean', 'date']),
			}),
		)
		.max(50),
});

export type InstanceAiEvalSeedDataTable = z.infer<typeof instanceAiEvalSeedDataTableSchema>;

export class InstanceAiEvalRestoreThreadRequest extends Z.class({
	threadId: z.string().uuid(),
	/** Native agent message log (ISO `createdAt`), stored verbatim. */
	messages: z.array(z.record(z.unknown())).min(1).max(1000),
	/** Data tables the workflows reference; recreated first so ids can be rewritten. */
	dataTables: z.array(instanceAiEvalSeedDataTableSchema).max(20).optional(),
	/** Workflows the history references; recreated (node credentials stripped). */
	workflows: z.array(instanceAiEvalSeedWorkflowSchema).max(50).optional(),
}) {}
