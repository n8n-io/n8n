import { z } from 'zod';

import type { McpRegistryServerIconResponse } from './mcp-registry.schema';
import { TimeZoneSchema } from './timezone.schema';
import { AgentJsonConfigSchema } from '../agents/agent-json-config.schema';
import { agentSkillSchema } from '../agents/agent-skill.schema';
import { Z } from '../zod-class';

// ---------------------------------------------------------------------------
// Credits
// ---------------------------------------------------------------------------

/**
 * Sentinel value returned by `GET /instance-ai/credits` when the AI service
 * proxy is disabled (credits are not metered). Consumers should treat this as "unlimited".
 */
export const UNLIMITED_CREDITS = -1;

/**
 * The instance's AI Assistant credit standing, as reported by `GET /instance-ai/credits`, by the
 * `updateInstanceAiCredits` push and by the internal callers that pass it around.
 *
 * `creditsQuota` is {@link UNLIMITED_CREDITS} when credits are not metered — either the proxy is
 * disabled, or the amounts are deliberately withheld from a cohort that must not see a balance.
 */
export type InstanceAiCredits = {
	creditsQuota: number;
	creditsClaimed: number;
	/** Whether the pool has been locked by the activation cap. */
	quotaLocked?: boolean;
};

/**
 * Transient setup-state tag for an AI Gateway managed credential selection.
 * Handlers convert this tag to the Ai Gateway managed credential shape.
 */
export const AI_GATEWAY_MANAGED_TAG = '__AI_GATEWAY_MANAGED__';

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

/**
 * Builds the thread-level grant key for updating a specific workflow without HITL.
 *
 * Written automatically when the agent creates a workflow in this thread, so follow-up
 * edits to that same artifact (same run or later runs in the session) skip the update
 * approval prompt. Foreign workflows still require approval unless the admin policy is
 * `always_allow`.
 */
export function buildUpdateWorkflowSessionGrantKey(workflowId: string): string {
	return `workflows:update:${workflowId}`;
}

/**
 * Builds the thread-level "always allow" grant key for a data-tables action
 * (e.g. `create`, `insert-rows`). Must match the frontend key
 * `${toolName}:${action}` so UI auto-approve and persisted grants stay aligned.
 */
export function buildDataTablesSessionGrantKey(action: string): string {
	return `data-tables:${action}`;
}

// --- Workflow-setup skips ---

const SETUP_SKIP_GRANT_PREFIX = 'workflows:setup-skip:';

/**
 * Builds the thread-level key recording that the user passed on a setup card. Unlike its
 * siblings this records a *declined* decision rather than an approval, but it belongs on the
 * same per-thread, per-user store: the setup flow reads it to stop re-opening the blocking
 * setup card for something the user already skipped in this conversation.
 *
 * `subject` is opaque here — what a skip generalises to is the setup flow's call, so the
 * kind-tagged subjects (`cred:<type>`, `node:<workflowId>:<name>`) are built by
 * `setup-skip-state.ts` in the instance-ai package.
 */
export function buildSetupSkipGrantKey(subject: string): string {
	return `${SETUP_SKIP_GRANT_PREFIX}${subject}`;
}

/** The skip subjects recorded for this thread, parsed out of persisted grant keys. */
export function parseSetupSkipGrants(keys: ReadonlySet<string>): Set<string> {
	const skipped = new Set<string>();
	for (const key of keys) {
		if (key.startsWith(SETUP_SKIP_GRANT_PREFIX)) {
			skipped.add(key.slice(SETUP_SKIP_GRANT_PREFIX.length));
		}
	}
	return skipped;
}

// --- Domain-access grants ("always allow" for web access) ---
// These keys mirror the research tool's action names (`fetch-url`, `web-search`) the same
// way `executions:run:<id>` mirrors the executions `run` action, so a persisted grant row
// names the exact tool action the user approved.

/** Grant key for persistently allowing fetches from a specific host. */
export function buildFetchUrlGrantKey(host: string): string {
	return `fetch-url:${host}`;
}

/** Grant key for allowing fetches from any host (blanket allow). */
export const FETCH_URL_ALLOW_ALL_GRANT_KEY = 'fetch-url:*';

/** Grant key for persistently allowing web search. */
export const WEB_SEARCH_GRANT_KEY = 'web-search';

/** Domain-access state reconstructed from a set of persisted grant keys. */
export interface DomainAccessGrants {
	approvedDomains: Set<string>;
	allDomainsApproved: boolean;
	webSearchApproved: boolean;
}

/**
 * Parse persisted grant keys back into domain-access state. Single source of truth for the
 * key format ↔ tracker state mapping; ignores unrelated grant keys (e.g. `executions:run:*`).
 */
export function parseDomainAccessGrants(keys: ReadonlySet<string>): DomainAccessGrants {
	const approvedDomains = new Set<string>();
	let allDomainsApproved = false;
	let webSearchApproved = false;

	const fetchUrlPrefix = 'fetch-url:';
	for (const key of keys) {
		if (key === FETCH_URL_ALLOW_ALL_GRANT_KEY) {
			allDomainsApproved = true;
		} else if (key === WEB_SEARCH_GRANT_KEY) {
			webSearchApproved = true;
		} else if (key.startsWith(fetchUrlPrefix)) {
			approvedDomains.add(key.slice(fetchUrlPrefix.length));
		}
	}

	return { approvedDomains, allDomainsApproved, webSearchApproved };
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
	'text-block',
	'reasoning-block',
	'tool-input-start',
	'tool-call',
	'tool-result',
	'tool-error',
	'tool-interrupted',
	'confirmation-request',
	'tasks-update',
	'setup-items',
	'filesystem-request',
	'thread-title-updated',
	'status',
	'error',
]);
export type InstanceAiEventType = z.infer<typeof instanceAiEventTypeSchema>;

/**
 * Live-only event types: never persisted, their SSE frames carry no `id:` line,
 * and the browser's
 * replay cursor never points at them. Deltas are transport, not state: a
 * completed segment replays as a coalesced block fact instead. One list,
 * shared by the writer (what to persist) and the frontend (which frames to
 * dedup by id), so the two sides cannot drift.
 */
export const INSTANCE_AI_EPHEMERAL_EVENT_TYPES: ReadonlySet<InstanceAiEventType> = new Set([
	'text-delta',
	'reasoning-delta',
	'status',
	'filesystem-request',
]);

// ---------------------------------------------------------------------------
// Run status
// ---------------------------------------------------------------------------

// 'interrupted' (durable-log RFC, resilience phase): appended by the
// interrupted-run sweep for a run whose process died mid-flight — the fold
// renders every in-flight item as terminated, no walk-and-mutate.
export const instanceAiRunStatusSchema = z.enum(['completed', 'cancelled', 'error', 'interrupted']);
export type InstanceAiRunStatus = z.infer<typeof instanceAiRunStatusSchema>;

// ---------------------------------------------------------------------------
// Confirmation severity
// ---------------------------------------------------------------------------

export const instanceAiConfirmationSeveritySchema = z.enum(['destructive', 'warning', 'info']);
export type InstanceAiConfirmationSeverity = z.infer<typeof instanceAiConfirmationSeveritySchema>;

/**
 * Shared resume envelope for plain-approval HITL tools.
 *
 * Matches the payload fields on the `approval` arm of `InstanceAiConfirmRequestDto`
 * (minus `kind`) that `resumeSuspendedRun` forwards. Tools that only need
 * `approved` still declare these optional keys so checkpointed JSON Schema
 * (`additionalProperties: false`) accepts approve-with-comment / allow-always.
 */
export const instanceAiApprovalResumeSchema = z.object({
	approved: z.boolean(),
	userInput: z.string().optional(),
	/** `'session'` grants the same tool/action without re-asking for the rest of the
	 *  thread ("always allow"). Absent/`'once'` approves this single request only. */
	scope: z.enum(['once', 'session']).optional(),
});
export type InstanceAiApprovalResumeData = z.infer<typeof instanceAiApprovalResumeSchema>;

// ---------------------------------------------------------------------------
// Agent status (frontend rendering state)
// ---------------------------------------------------------------------------

export const instanceAiAgentStatusSchema = z.enum(['active', 'completed', 'cancelled', 'error']);
export type InstanceAiAgentStatus = z.infer<typeof instanceAiAgentStatusSchema>;

export const instanceAiAgentKindSchema = z.enum([
	'builder',
	'data-table',
	'planner',
	'eval-setup',
	'agent-builder',
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
	// 'agent'/'config-eval': provisional eval-artifact discovery signals; the assistant doesn't emit them yet.
	type: z.enum(['workflow', 'data-table', 'credential', 'other', 'agent', 'config-eval']),
	id: z.string().optional(),
	name: z.string().optional(),
	projectId: z.string().optional(),
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
	/**
	 * Terminal state of the sub-agent. Optional: events written before this
	 * field existed (and the backfill migration's synthesized ones) carry only
	 * `error`, and the reducer keeps deriving the status from it for those.
	 */
	status: z.enum(['completed', 'cancelled', 'error']).optional(),
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

/** Emitted when a tool call's arguments BEGIN streaming — args arrive later
 *  via the `tool-call` event. Lets the UI surface the pending call while
 *  large arguments (e.g. generated workflow code) are still streaming. */
export const toolInputStartPayloadSchema = z.object({
	toolCallId: z.string(),
	toolName: z.string(),
});

export const toolResultPayloadSchema = z.object({
	toolCallId: z.string(),
	result: z.unknown(),
});

export const toolErrorPayloadSchema = z.object({
	toolCallId: z.string(),
	error: z.string(),
});

/** The generic credential type that agent-supplied setup recipes create. */
export const TEMPLATED_CUSTOM_AUTH_CREDENTIAL_TYPE = 'httpTemplatedCustomAuth';

/**
 * Auth types where one credential serves many services.
 */
export const GENERIC_AUTH_CREDENTIAL_TYPES: ReadonlySet<string> = new Set([
	TEMPLATED_CUSTOM_AUTH_CREDENTIAL_TYPE,
	'httpHeaderAuth',
	'httpBearerAuth',
	'httpQueryAuth',
	'httpBasicAuth',
	'httpDigestAuth',
	'httpCustomAuth',
	'oAuth1Api',
	'oAuth2Api',
]);

export const shouldAutoResolveCredential = (
	credentialType: string,
	existingCount: number,
): boolean => {
	return !GENERIC_AUTH_CREDENTIAL_TYPES.has(credentialType) && existingCount === 1;
};
/** One user-provided input of a Templated Custom Auth credential. */
export const credentialPlaceholderDefSchema = z.object({
	/** Marker name referenced by the template as `{{name}}`. */
	name: z.string(),
	/** Input label shown to the user (e.g. "API key"). */
	title: z.string(),
	/** One-line clarification of the value itself (format, which token) —
	 *  never where to obtain it; the AI help thread owns navigation. */
	info: z.string().optional(),
	/** Defaults to `password` (masked input). */
	type: z.enum(['password', 'plain']).optional(),
	/** When true the input may be left empty; template entries referencing an
	 *  empty optional placeholder are omitted from the signed request. */
	optional: z.boolean().optional(),
});
export type InstanceAiCredentialPlaceholderDef = z.infer<typeof credentialPlaceholderDefSchema>;

/**
 * Agent-supplied recipe for creating a Templated Custom Auth credential: the
 * auth request parts with `{{placeholder}}` markers where user-provided values
 * go, plus what to ask the user for each marker. Never contains real secrets.
 */
export const credentialSetupHintSchema = z.object({
	template: z.object({
		headers: z.record(z.string()).optional(),
		qs: z.record(z.string()).optional(),
		body: z.record(z.unknown()).optional(),
	}),
	placeholders: z.array(credentialPlaceholderDefSchema).min(1),
	/** The provider page where the user creates/copies the secret. Not rendered
	 *  in the form — handed to the AI help thread so it can point the user at
	 *  the exact page the recipe research already verified. */
	docsUrl: z.string().optional(),
	suggestedName: z.string().optional(),
	/** GET endpoint the created credential is auth-probed against. */
	testUrl: z.string().optional(),
	/** Status codes the probe must not treat as rejection (only relaxes the
	 *  401/403 default — codes outside that pair never fail a probe anyway). */
	acceptedStatusCodes: z.array(z.number().int()).max(10).optional(),
	/** Host of the API the recipe targets, derived server-side from the node
	 *  being set up (never model-supplied). Stamped into the created credential
	 *  so setup surfaces only offer it to nodes calling the same service. */
	serviceHost: z.string().optional(),
});
export type InstanceAiCredentialSetupHint = z.infer<typeof credentialSetupHintSchema>;

export const credentialRequestSchema = z.object({
	credentialType: z.string(),
	reason: z.string(),
	existingCredentials: z.array(z.object({ id: z.string(), name: z.string() })),
	suggestedName: z.string().optional(),
	setupHint: credentialSetupHintSchema.optional(),
	preferNew: z.boolean().optional(),
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
		// `id` is null only when `__aiGatewayManaged` is true
		credentials: z
			.record(
				z.union([
					z.object({ id: z.string(), name: z.string() }),
					z.object({ id: z.null(), name: z.string(), __aiGatewayManaged: z.literal(true) }),
				]),
			)
			.optional(),
		position: z.tuple([z.number(), z.number()]),
		id: z.string(),
	}),
	credentialType: z.string().optional(),
	existingCredentials: z.array(z.object({ id: z.string(), name: z.string() })).optional(),
	setupHint: credentialSetupHintSchema.optional(),
	isTrigger: z.boolean(),
	isFirstTrigger: z.boolean().optional(),
	isTestable: z.boolean().optional(),
	isAutoApplied: z.boolean().optional(),
	preferNewCredential: z.boolean().optional(),
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
	credentialNeedsAction: z
		.boolean()
		.optional()
		.describe(
			'Whether the credential slot itself is what needs intervention. False when the node has a ' +
				'resolvable credential and only a parameter is missing — that card asks about a parameter, ' +
				'not about the service, so a skip of it must not be generalised to the credential type.',
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

export const channelConfigSchema = z.object({
	integrationType: z.string(),
	agentId: z.string(),
});
export type InstanceAiChannelConfig = z.infer<typeof channelConfigSchema>;

export const mcpConnectServerSchema = z.object({
	serverSlug: z.string(),
	title: z.string(),
	tagline: z.string().optional(),
	credentialType: z.string(),
});
export type InstanceAiMcpConnectServer = z.infer<typeof mcpConnectServerSchema>;

export const mcpConnectRequestSchema = z.object({
	servers: z.array(mcpConnectServerSchema).min(1),
});
export type InstanceAiMcpConnectRequest = z.infer<typeof mcpConnectRequestSchema>;

export const mcpConnectResumeSchema = z.object({
	approved: z.boolean(),
	connectedSlugs: z.array(z.string()).optional(),
});
export type InstanceAiMcpConnectResume = z.infer<typeof mcpConnectResumeSchema>;

export const confirmationInputTypeSchema = z.enum([
	'approval',
	'text',
	'questions',
	'plan-review',
	'resource-decision',
	'continue',
]);
export type InstanceAiConfirmationInputType = z.infer<typeof confirmationInputTypeSchema>;

export const instanceAiTargetApprovalSchema = z.object({
	toolName: z.string(),
	displayName: z.string().optional(),
	args: z.unknown(),
});
export type InstanceAiTargetApproval = z.infer<typeof instanceAiTargetApprovalSchema>;

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
	targetApproval: instanceAiTargetApprovalSchema
		.optional()
		.describe('Target-agent tool approval details rendered instead of the outer tool call'),
	credentialRequests: z.array(credentialRequestSchema).optional(),
	requireUserSelection: z
		.boolean()
		.optional()
		.describe(
			'When true, the credential setup card must wait for an explicit user choice instead of automatically submitting a preselected existing credential',
		),
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
	workflowId: z
		.string()
		.optional()
		.describe(
			'Workflow ID for setup cards and per-workflow edit approvals (build-workflow / workflows update)',
		),
	resourceDecision: gatewayConfirmationRequiredPayloadSchema
		.optional()
		.describe('Gateway resource-access decision data (inputType=resource-decision)'),
	channelConfig: channelConfigSchema
		.optional()
		.describe(
			'When present, renders agent chat-channel setup UI for this integration type and agent',
		),
	mcpConnectRequest: mcpConnectRequestSchema
		.optional()
		.describe('When present, renders the inline "Available tools" MCP connect card'),
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
	if (payload.channelConfig) return true;
	if (payload.mcpConnectRequest) return true;

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

/** Machine-readable error classes the UI can render a tailored state for. */
export const INSTANCE_AI_ERROR_CODES = ['quota_exhausted'] as const;

export type InstanceAiErrorCode = (typeof INSTANCE_AI_ERROR_CODES)[number];

/** Whether `code` is a class the UI recognizes and has a tailored state for.
 *  Consumers narrow the permissive wire `code` (a plain string, for forward
 *  compatibility) through this before rendering a code-specific state. */
export function isKnownInstanceAiErrorCode(code: string | undefined): code is InstanceAiErrorCode {
	return code !== undefined && INSTANCE_AI_ERROR_CODES.some((known) => known === code);
}

export const errorPayloadSchema = z.object({
	content: z.string(),
	statusCode: z.number().optional(),
	/** Set when the failure maps to a known class (e.g. out of credits) so the UI
	 *  can tailor it. Kept a plain string (not an enum) so an error event carrying
	 *  a code a newer service added still parses on older clients instead of being
	 *  dropped wholesale — recognized codes are matched via isKnownInstanceAiErrorCode. */
	code: z.string().optional(),
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

/**
 * One entry of the setup panel checklist. Service-keyed (one row per
 * credential type, fanned out to all nodes that use it via `nodeBindings`),
 * not per-node like the wizard's `workflowSetupNodeSchema`. Carries identity
 * and requirements only — done-ness is always derived client-side (usable
 * credential exists / slot bound / parameter filled), never stored, so
 * replay, refresh, and out-of-band completion stay consistent.
 */
const setupItemBase = {
	/** Stable identity: `${workflowId}:${kind}:${key}` — key = credentialType
	 *  for credential items, nodeName for parameter items. */
	id: z.string(),
};

/** No 'question' kind in v1 (agent questions stay in chat); arms are additive. */
export const setupItemSchema = z.discriminatedUnion('kind', [
	z.object({
		...setupItemBase,
		kind: z.literal('credential'),
		credentialType: z.string(),
		appDisplayName: z.string().optional(),
		nodeBindings: z.array(z.object({ nodeName: z.string() })).optional(),
		setupHint: credentialSetupHintSchema.optional(),
		/** Why the app is needed, e.g. "for the docs search". */
		reason: z.string().optional(),
	}),
	// Parameter names only — values always derive from the workflow.
	z.object({
		...setupItemBase,
		kind: z.literal('parameters'),
		nodeName: z.string(),
		parameterNames: z.array(z.string()),
	}),
]);
export type InstanceAiSetupItem = z.infer<typeof setupItemSchema>;

export const setupItemsPayloadSchema = z.object({
	workflowId: z.string().min(1).max(64),
	/** FULL current list for this workflow. Each event replaces the previous
	 *  snapshot — removal is implicit (an item absent from the next snapshot is
	 *  gone). No delta/retraction protocol. */
	items: z.array(setupItemSchema),
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
	/** Epoch ms stamped once at publish — replays (SSE reconnect, snapshot
	 *  rebuilds) use it to reconstruct real timing instead of "now". */
	ts: z.number().optional(),
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
	z.object({
		type: z.literal('tool-input-start'),
		...eventBase,
		payload: toolInputStartPayloadSchema,
	}),
	// Coalesced full text/reasoning of one streamed segment, produced by the
	// durable event log (deltas are live-only and never persisted). On replay the
	// reducer REPLACES the segment's streamed deltas, so a client that reconnects
	// mid-block cannot see partial text twice.
	z.object({ type: z.literal('text-block'), ...eventBase, payload: textDeltaPayloadSchema }),
	z.object({
		type: z.literal('reasoning-block'),
		...eventBase,
		payload: reasoningDeltaPayloadSchema,
	}),
	z.object({ type: z.literal('tool-call'), ...eventBase, payload: toolCallPayloadSchema }),
	z.object({ type: z.literal('tool-result'), ...eventBase, payload: toolResultPayloadSchema }),
	z.object({ type: z.literal('tool-error'), ...eventBase, payload: toolErrorPayloadSchema }),
	// Durable-log RFC (resilience phase): appended by the interrupted-run sweep
	// for a tool call that was in flight when the process died. Same payload
	// shape as tool-error; the effect is unverified, never re-executed blindly.
	z.object({
		type: z.literal('tool-interrupted'),
		...eventBase,
		payload: toolErrorPayloadSchema,
	}),
	z.object({
		type: z.literal('confirmation-request'),
		...eventBase,
		payload: confirmationRequestPayloadSchema,
	}),
	z.object({ type: z.literal('tasks-update'), ...eventBase, payload: tasksUpdatePayloadSchema }),
	z.object({ type: z.literal('setup-items'), ...eventBase, payload: setupItemsPayloadSchema }),
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
export type InstanceAiToolInputStartEvent = Extract<InstanceAiEvent, { type: 'tool-input-start' }>;
export type InstanceAiToolCallEvent = Extract<InstanceAiEvent, { type: 'tool-call' }>;
export type InstanceAiToolResultEvent = Extract<InstanceAiEvent, { type: 'tool-result' }>;
export type InstanceAiToolErrorEvent = Extract<InstanceAiEvent, { type: 'tool-error' }>;
export type InstanceAiConfirmationRequestEvent = Extract<
	InstanceAiEvent,
	{ type: 'confirmation-request' }
>;
export type InstanceAiTasksUpdateEvent = Extract<InstanceAiEvent, { type: 'tasks-update' }>;
export type InstanceAiSetupItemsEvent = Extract<InstanceAiEvent, { type: 'setup-items' }>;
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

/**
 * Per-file attachment ceiling, in **base64-encoded** bytes.
 *
 * The provider measures an image against its encoded size, and `data` is base64
 * (ASCII), so the string's length is exactly the quantity being limited. Stating
 * this bound in decoded bytes would set it ~4/3 too high and admit payloads the
 * provider then rejects — crashing the LLM call instead of failing validation.
 *
 * Shared so the frontend can warn pre-upload against the same value the backend
 * enforces.
 */
export const MAX_ATTACHMENT_BASE64_BYTES = 10 * 1024 * 1024;

/**
 * Budget for all attachments on a single message, in base64-encoded bytes. The
 * provider rejects requests over 32 MB in total; half of that leaves room for the
 * system prompt, replayed thread history, and tool schemas in the same request.
 */
export const MAX_TOTAL_ATTACHMENT_BASE64_BYTES = 16 * 1024 * 1024;

/**
 * Largest raw file that still fits once base64-encoded — i.e. the ceiling as a user
 * experiences it, since `File.size` and the figure their OS shows are both decoded.
 *
 * Enforcement uses the encoded limit above (that is what the provider measures), but
 * **user-facing copy must quote this**: telling someone with an 8 MB file that it
 * "exceeds the 10 MB limit" is the same decoded-vs-encoded confusion this guard exists
 * to prevent.
 */
export const MAX_ATTACHMENT_DECODED_BYTES = (MAX_ATTACHMENT_BASE64_BYTES / 4) * 3;

/** Combined ceiling across one message's attachments, as raw file size. */
export const MAX_TOTAL_ATTACHMENT_DECODED_BYTES = (MAX_TOTAL_ATTACHMENT_BASE64_BYTES / 4) * 3;

function formatMegabyteLimit(bytes: number): string {
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** The per-file limit as a short label for user-facing copy, e.g. `7.5 MB`. */
export function formatAttachmentSizeLimit(): string {
	return formatMegabyteLimit(MAX_ATTACHMENT_DECODED_BYTES);
}

/** The combined per-message limit as a short label for user-facing copy, e.g. `12.0 MB`. */
export function formatTotalAttachmentSizeLimit(): string {
	return formatMegabyteLimit(MAX_TOTAL_ATTACHMENT_DECODED_BYTES);
}

/**
 * Encoded size of `decodedBytes` once base64'd: 3 bytes become 4 characters,
 * padded up to a multiple of 4.
 */
export function base64EncodedSize(decodedBytes: number): number {
	return Math.ceil(decodedBytes / 3) * 4;
}

/**
 * Whether a file of `decodedBytes` (i.e. `File.size`) would breach the per-file
 * limit once encoded.
 *
 * Use this instead of comparing a raw byte count against the limit directly: the
 * limit is denominated in encoded bytes, so a naive comparison passes files ~4/3
 * too large and defers the failure to the provider.
 */
export function exceedsAttachmentSizeLimit(decodedBytes: number): boolean {
	return base64EncodedSize(decodedBytes) > MAX_ATTACHMENT_BASE64_BYTES;
}

/** A binary file the user attached to a message (image, CSV, PDF, …). */
export const instanceAiFileAttachmentSchema = z.object({
	type: z.literal('file'),
	// This message is the copy the user actually sees for a single oversized file:
	// body validation runs before the controller, so it answers first and the
	// controller's richer per-file message never renders on this path.
	data: z.string().max(MAX_ATTACHMENT_BASE64_BYTES, {
		message: `Attachment is too large (limit ${formatAttachmentSizeLimit()}). Attach a smaller file, or resize the image before sending.`,
	}),
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

/**
 * An agent reference the agents page hands off to a message. Carries no bytes —
 * the agent resolves it with its tools and the FE shows it as an artifact tab.
 */
export const instanceAiAgentAttachmentSchema = z.object({
	type: z.literal('agent'),
	id: z.string().min(1).max(64),
	name: z.string().max(255).optional(),
	/** Project that owns the agent — required so the FE artifact preview can render. */
	projectId: z.string().min(1).max(64),
	/** The New Agent artifact has no persisted agent row yet. */
	pending: z.literal(true).optional(),
});
export type InstanceAiAgentAttachment = z.infer<typeof instanceAiAgentAttachmentSchema>;

const instanceAiNodeRefSchema = z.object({
	id: z.string().min(1).max(64),
	name: z.string().max(255).optional(),
});

const instanceAiNodeSetSchema = z.object({
	/** Ordered from the set's input side to its output side. Length 1 = a single loose node; length > 1 = a chain of connected nodes. */
	nodes: z.array(instanceAiNodeRefSchema).min(1).max(50),
	/** The node feeding into this set from outside it, if any (absent when the set starts at a trigger/root). */
	inputNode: instanceAiNodeRefSchema.optional(),
	/** The node this set feeds into from outside it, if any (absent when the set ends at a terminal node). */
	outputNode: instanceAiNodeRefSchema.optional(),
	/**
	 * The canvas group this set belongs to, if any. A group has a single entry/exit
	 * (no islands), so a group's own nodes selected alone always resolve to exactly
	 * one set — no merging/collapsing logic is needed elsewhere for this field.
	 */
	canvasGroupId: z.string().min(1).max(64).optional(),
	/** Paired with canvasGroupId so the model's context and the FE chip agree on the same display name. */
	canvasGroupName: z.string().max(255).optional(),
});

/**
 * A reference to one or more sets of canvas-selected nodes the editor hands off to a
 * message. Carries no bytes — the agent resolves node details via its existing
 * workflow tools; only ids/names travel here.
 */
export const instanceAiNodesAttachmentSchema = z.object({
	type: z.literal('nodes'),
	workflowId: z.string().min(1).max(64),
	sets: z.array(instanceAiNodeSetSchema).min(1).max(50),
});
export type InstanceAiNodesAttachment = z.infer<typeof instanceAiNodesAttachmentSchema>;

/** A resource reference attachable to a message (as opposed to a binary file). */
export const instanceAiResourceAttachmentSchema = z.discriminatedUnion('type', [
	instanceAiWorkflowAttachmentSchema,
	instanceAiAgentAttachmentSchema,
	instanceAiNodesAttachmentSchema,
]);
export type InstanceAiResourceAttachment = z.infer<typeof instanceAiResourceAttachmentSchema>;

/** Anything attachable to a message: a binary file or a resource reference. */
export const instanceAiAttachmentSchema = z.discriminatedUnion('type', [
	instanceAiFileAttachmentSchema,
	...instanceAiResourceAttachmentSchema.options,
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
		/** Guided-form input labels of a pre-filled (recipe-created) credential —
		 *  the user only pastes these values, so the thread gives where-to-find
		 *  guidance instead of configuration steps. */
		placeholderTitles: z.array(z.string().min(1).max(255)).max(20).optional(),
		/** The provider's key page from the recipe (where the user creates/copies
		 *  the secret) — distinct from documentationUrl, the n8n docs page of the
		 *  credential type. The thread directs the user there. */
		docsUrl: z.string().url().max(2048).optional(),
		documentationUrl: z.string().url().max(2048).optional(),
		oauthRedirectUrl: z.string().url().max(2048).optional(),
	}),
});
export type InstanceAiCredentialHandoffContext = z.infer<
	typeof instanceAiCredentialHandoffContextSchema
>;

export const instanceAiAgentPreviewHandoffContextSchema = z.object({
	source: z.literal('agent-preview'),
	agentId: z.string().min(1).max(128),
	threadId: z.string().min(1).max(128),
	executionId: z.string().min(1).max(64).optional(),
	/** Display-only — the target agent's name, surfaced in the context chip. */
	agentName: z.string().max(128).optional(),
	/** Display-only — the target agent's personalisation icon, surfaced in the context chip. */
	agentIcon: z.string().max(64).optional(),
	/** Display-only — the preview session's title, surfaced in the context chip. */
	sessionTitle: z.string().max(200).optional(),
});
export type InstanceAiAgentPreviewHandoffContext = z.infer<
	typeof instanceAiAgentPreviewHandoffContextSchema
>;

export const instanceAiHandoffContextSchema = z.discriminatedUnion('source', [
	instanceAiCredentialHandoffContextSchema,
	instanceAiAgentPreviewHandoffContextSchema,
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

/**
 * Entry-point taxonomy for Instance AI thread creation. Every new entry point
 * must register a value here — `InstanceAiEnsureThreadRequest.source` requires
 * it, so missing values fail at the API boundary.
 *
 * - `website-template` — deep-link from n8n.io template pages (`/assistant/new?templateId=…`)
 * - `template-view` — "Start with AI" from the in-app template preview
 * - `canvas_action_button` — Instance AI button on the workflow canvas
 * - `canvas_choice_prompt` — empty-canvas choice prompt that opens Instance AI
 * - `node_error_view` — "Ask AI" from a node error / failed-execution view
 * - `credential_edit` — credential setup help from the credential edit modal
 * - `credentials_list` — credential setup help from the credentials list
 * - `agent_builder_page` — Instance AI hand-off from the agent builder
 * - `agent_preview` — send a preview chat session to Instance AI
 * - `assistant_page` — first message typed on the Instance AI empty/home page
 * - `evals` — Instance AI evaluation harness / offline eval runners
 * - `playwright` — Playwright E2E helpers that create threads via the REST API
 * Experiment cleanup: remove with openWorkflowInAssistant.
 * - `workflow_list_auto` — treatment redirect: a workflow list card opened in the assistant by default
 * - `workflow_list_button` — deliberate "Edit with AI Assistant" button on a workflow list card
 */
export const INSTANCE_AI_THREAD_SOURCES = [
	'website-template',
	'template-view',
	'canvas_action_button',
	'canvas_choice_prompt',
	'node_error_view',
	'credential_edit',
	'credentials_list',
	'agent_builder_page',
	'agent_preview',
	'assistant_page',
	// Experiment cleanup: remove with openWorkflowInAssistant.
	'workflow_list_auto',
	'workflow_list_button',
	'evals',
	'playwright',
] as const;
export type InstanceAiThreadSource = (typeof INSTANCE_AI_THREAD_SOURCES)[number];

/** Read-path fallback for threads created before source was required. */
export const INSTANCE_AI_THREAD_SOURCE_FALLBACK = 'unknown';
export type InstanceAiThreadSourcePersisted =
	| InstanceAiThreadSource
	| typeof INSTANCE_AI_THREAD_SOURCE_FALLBACK;

export const INSTANCE_AI_THREAD_ORIGINS = ['internal', 'external'] as const;
export type InstanceAiThreadOrigin = (typeof INSTANCE_AI_THREAD_ORIGINS)[number];

const instanceAiSourceContextSchema = z
	.record(z.string(), z.unknown())
	.refine((value) => JSON.stringify(value).length <= 2048, {
		message: 'sourceContext exceeds the maximum allowed size',
	});

export class InstanceAiEnsureThreadRequest extends Z.class({
	threadId: z.string().uuid().optional(),
	projectId: z.string().min(1),
	source: z.enum(INSTANCE_AI_THREAD_SOURCES),
	origin: z.enum(INSTANCE_AI_THREAD_ORIGINS).optional(),
	sourceContext: instanceAiSourceContextSchema.optional(),
}) {}

export const instanceAiGatewayKeySchema = z.string().min(1).max(256);

export class InstanceAiGatewayEventsQuery extends Z.class({
	apiKey: instanceAiGatewayKeySchema,
}) {}

export class InstanceAiEventsQuery extends Z.class({
	lastEventId: z.coerce.number().int().nonnegative().optional(),
}) {}

/** Ceilings for a single thread-history read: `limit` bounds the rows (and the
 *  tree hydration hanging off them) one request can pull, `page` bounds the
 *  offset scan behind it. Both sit above any real client — the UI's largest page
 *  is 100 messages and it never pages past the first — so they only ever bite a
 *  hand-crafted request. */
export const INSTANCE_AI_THREAD_MESSAGES_DEFAULT_LIMIT = 50;
export const INSTANCE_AI_THREAD_MESSAGES_MAX_LIMIT = 200;
export const INSTANCE_AI_THREAD_MESSAGES_MAX_PAGE = 1000;

export class InstanceAiThreadMessagesQuery extends Z.class({
	limit: z.coerce
		.number()
		.int()
		.min(1)
		.max(INSTANCE_AI_THREAD_MESSAGES_MAX_LIMIT)
		.default(INSTANCE_AI_THREAD_MESSAGES_DEFAULT_LIMIT),
	page: z.coerce.number().int().nonnegative().max(INSTANCE_AI_THREAD_MESSAGES_MAX_PAGE).default(0),
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
	targetApproval?: InstanceAiTargetApproval;
	credentialRequests?: InstanceAiCredentialRequest[];
	requireUserSelection?: boolean;
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
	channelConfig?: InstanceAiChannelConfig;
	mcpConnectRequest?: InstanceAiMcpConnectRequest;
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
	| { type: 'reasoning'; content: string; responseId?: string }
	| { type: 'tool-call'; toolCallId: string; responseId?: string }
	| { type: 'child'; agentId: string; responseId?: string };

export interface InstanceAiAgentNode {
	agentId: string;
	role: string;
	tools?: string[];
	/** Background task ID — present only for background agents. */
	taskId?: string;
	/** Agent kind for card dispatch (builder, data-table, planner, eval-setup). */
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
	/**
	 * Full concatenated reasoning across the run. Kept as an aggregate for
	 * previews and old snapshots — per-stage reasoning lives in `timeline`.
	 */
	reasoning: string;
	toolCalls: InstanceAiToolCallState[];
	children: InstanceAiAgentNode[];
	/** Chronological ordering of text/reasoning segments, tool calls, and sub-agents. */
	timeline: InstanceAiTimelineEntry[];
	/** Latest task list — updated by tasks-update events. */
	tasks?: TaskList;
	/** Full planned task details — updated by create-tasks via tasks-update. */
	planItems?: PlannedTaskArg[];
	/**
	 * Latest setup-panel snapshot per workflow — updated by setup-items events
	 * (last event wins per workflowId). Thread-level state: always folded onto
	 * the ROOT node so history restore, which reads the tree root, sees it
	 * regardless of which agent emitted.
	 */
	setupItemsByWorkflowId?: Record<string, InstanceAiSetupItem[]>;
	result?: string;
	error?: string;
	errorDetails?: {
		statusCode?: number;
		/** Mirrors {@link errorPayloadSchema} `code` — lets the UI render a tailored error
		 *  state. A plain string (not the enum) so an unrecognized code from a newer
		 *  service is preserved; recognized codes are matched via isKnownInstanceAiErrorCode. */
		code?: string;
		provider?: string;
		technicalDetails?: string;
	};
	/** Why a `cancelled` run stopped — lets the UI attribute it (user vs timeout vs shutdown). */
	cancellationReason?: InstanceAiCancellationReason;
}

/** Semantic cause of a cancelled run, mapped from the backend's run-finish reason. */
export type InstanceAiCancellationReason = 'user' | 'timeout' | 'shutdown' | 'interrupted';

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
	/** Structured handoff context reconstructed from a stored user message. */
	context?: InstanceAiHandoffContext;
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
	runId?: string;
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

export interface InstanceAiConfirmResponse {
	ok: true;
	runId?: string;
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
	createCredential: instanceAiPermissionModeSchema,
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
	createCredential: 'require_approval',
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
	'createCredential',
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

export const INSTANCE_AI_MODEL_CREDENTIAL_TYPES = [
	'openAiApi',
	'anthropicApi',
	'googlePalmApi',
	'groqApi',
	'deepSeekApi',
	'mistralCloudApi',
	'xAiApi',
	'openRouterApi',
	'cohereApi',
] as const;

export const INSTANCE_AI_SEARCH_CREDENTIAL_TYPES = ['braveSearchApi', 'searXngApi'] as const;

export const INSTANCE_AI_CATALOG_PROVIDERS = ['anthropic', 'openai', 'openrouter'] as const;
export type InstanceAiCatalogProvider = (typeof INSTANCE_AI_CATALOG_PROVIDERS)[number];

export interface InstanceAiCatalogModel {
	id: string;
	name: string;
	releaseDate?: string;
}

export interface InstanceAiModelCatalogResponse {
	models: Record<InstanceAiCatalogProvider, InstanceAiCatalogModel[]>;
}

export interface InstanceAiEnvManagedFields {
	model: {
		provider: boolean;
		apiKey: boolean;
		baseUrl: boolean;
		model: boolean;
	};
	sandbox: {
		provider: boolean;
		serviceUrl: boolean;
		apiKey: boolean;
	};
	search: {
		provider: boolean;
		apiKey: boolean;
		url: boolean;
	};
}

export interface InstanceAiAdminSettingsResponse {
	enabled: boolean;
	permissions: InstanceAiPermissions;
	mcpAccessEnabled: boolean;
	sandboxEnabled: boolean;
	sandboxProvider: InstanceAiSandboxProvider;
	daytonaCredentialId: string | null;
	n8nSandboxCredentialId: string | null;
	searchCredentialId: string | null;
	modelCredentialId: string | null;
	modelName: string | null;
	modelEnvConfigured: boolean;
	sandboxEnvConfigured: boolean;
	searchEnvConfigured: boolean;
	searchDisabled: boolean;
	n8nSandboxServiceUrl: string | null;
	envManaged: InstanceAiEnvManagedFields;
	localGatewayDisabled: boolean;
	browserUseEnabled: boolean;
}

export type InstanceAiComponentSource = 'ui' | 'env' | 'none';
export type InstanceAiWebSearchSource = InstanceAiComponentSource | 'disabled';

export type InstanceAiSetupStateInput = Pick<
	InstanceAiAdminSettingsResponse,
	| 'modelEnvConfigured'
	| 'modelCredentialId'
	| 'modelName'
	| 'sandboxEnabled'
	| 'sandboxEnvConfigured'
	| 'sandboxProvider'
	| 'daytonaCredentialId'
	| 'n8nSandboxCredentialId'
	| 'searchCredentialId'
	| 'searchEnvConfigured'
	| 'searchDisabled'
>;

export interface InstanceAiSetupState {
	modelSource: InstanceAiComponentSource;
	sandboxSource: InstanceAiComponentSource;
	sandboxType: InstanceAiSandboxProvider | null;
	/** Credential assigned for the selected sandbox provider; a credential for the other provider does not count. */
	sandboxCredentialId: string | null;
	webSearchSource: InstanceAiWebSearchSource;
	/** Model and sandbox configured, and web search decided (configured or explicitly disabled). */
	setupCompleted: boolean;
}

/**
 * How each AI Assistant setup component is configured, derived from the admin
 * settings response. Single source of truth for the setup gate and the setup
 * telemetry snapshot, on both backend and frontend. The response already
 * resolves precedence (credential ids are null when env config wins), so env
 * before ui here does not shadow a UI selection.
 */
export function deriveInstanceAiSetupState(
	settings: InstanceAiSetupStateInput,
): InstanceAiSetupState {
	const modelSource: InstanceAiComponentSource = settings.modelEnvConfigured
		? 'env'
		: settings.modelCredentialId && settings.modelName
			? 'ui'
			: 'none';
	const sandboxCredentialId =
		settings.sandboxProvider === 'daytona'
			? settings.daytonaCredentialId
			: settings.n8nSandboxCredentialId;
	const sandboxSource: InstanceAiComponentSource = !settings.sandboxEnabled
		? 'none'
		: settings.sandboxEnvConfigured
			? 'env'
			: sandboxCredentialId
				? 'ui'
				: 'none';
	const webSearchSource: InstanceAiWebSearchSource = settings.searchCredentialId
		? 'ui'
		: settings.searchEnvConfigured
			? 'env'
			: settings.searchDisabled
				? 'disabled'
				: 'none';
	return {
		modelSource,
		sandboxSource,
		sandboxType: sandboxSource === 'none' ? null : settings.sandboxProvider,
		sandboxCredentialId,
		webSearchSource,
		setupCompleted:
			modelSource !== 'none' && sandboxSource !== 'none' && webSearchSource !== 'none',
	};
}

/**
 * Inline provider-connection payload: the credential type plus its field
 * values. `null` clears the connection (and falls back to env config).
 */
export const instanceAiConnectionSchema = z.object({
	type: z.string().min(1),
	data: z.record(z.string(), z.unknown()),
});
export type InstanceAiConnectionUpdate = z.infer<typeof instanceAiConnectionSchema>;

export class InstanceAiAdminSettingsUpdateRequest extends Z.class({
	enabled: z.boolean().optional(),
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
	modelCredentialId: z.string().nullable().optional(),
	modelConnection: instanceAiConnectionSchema.nullable().optional(),
	sandboxConnection: instanceAiConnectionSchema.nullable().optional(),
	searchConnection: instanceAiConnectionSchema.nullable().optional(),
	modelName: z.string().trim().min(1).nullable().optional(),
	searchDisabled: z.boolean().optional(),
	n8nSandboxServiceUrl: z.string().url().nullable().optional(),
	localGatewayDisabled: z.boolean().optional(),
	browserUseEnabled: z.boolean().optional(),
}) {}

export const instanceAiVerificationFailureSchema = z.enum([
	'unauthorized',
	'forbidden',
	'timeout',
	'rate_limited',
	'quota_exceeded',
	'unreachable',
	'invalid_response',
	'provider_error',
]);
export type InstanceAiVerificationFailure = z.infer<typeof instanceAiVerificationFailureSchema>;

export class InstanceAiVerifyModelRequest extends Z.class({
	connection: instanceAiConnectionSchema.optional(),
	modelName: z.string().trim().min(1).optional(),
}) {}

export class InstanceAiVerifySandboxRequest extends Z.class({
	provider: instanceAiSandboxProviderSchema.optional(),
	connection: instanceAiConnectionSchema.optional(),
	serviceUrl: z.string().url().optional(),
}) {}

export class InstanceAiVerifySearchRequest extends Z.class({
	connection: instanceAiConnectionSchema.optional(),
}) {}

export type InstanceAiVerificationResponse =
	| {
			ok: true;
			latencyMs?: number;
			startupMs?: number;
			resultCount?: number;
	  }
	| {
			ok: false;
			failure: InstanceAiVerificationFailure;
			/** Sanitized underlying error message, safe to show to the user. */
			error?: string;
	  };

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

export interface InstanceAiProviderConnection {
	id: string;
	name: string;
	type: string;
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
	toolFilter: InstanceAiMcpConnectionToolFilterResponse | null;
	createdAt: string;
	updatedAt: string;
}

export interface InstanceAiMcpConnectionToolFilterResponse {
	mode: 'allow' | 'exclude';
	tools: string[];
}

export interface InstanceAiMcpConnectionToolResponse {
	name: string;
	description?: string;
}

export type InstanceAiMcpConnectionFailureReason =
	| 'server_unavailable'
	| 'authentication'
	| 'unknown';

export type InstanceAiMcpConnectionToolsResponse =
	| {
			id: string;
			status: 'connected';
			tools: InstanceAiMcpConnectionToolResponse[];
	  }
	| {
			id: string;
			status: 'disconnected';
			tools: InstanceAiMcpConnectionToolResponse[];
			failureReason: InstanceAiMcpConnectionFailureReason;
	  };

export function getRenderHint(toolName: string): InstanceAiToolCallState['renderHint'] {
	if (toolName === 'task-control') return 'tasks';
	if (toolName === 'build-workflow' || toolName === 'build-workflow-with-agent') return 'builder';
	if (toolName === 'research-with-agent') return 'researcher';
	if (toolName === 'create-tasks') return 'planner';
	if (toolName === 'eval-setup-with-agent') return 'eval-setup';
	if (
		['create_skills', 'list_skills', 'read_skill', 'update_skill', 'load_skill'].includes(toolName)
	)
		return 'skill';
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

/** The config-evaluations experiment that surfaces/runs config evals in the UI.
 *  Instance AI's config-based eval tool + skill are gated on it so it can't
 *  create evals the user has no UI to run. Mirrors the editor-ui wizard. */
export const CONFIG_EVALUATIONS_FLAG = '088_config_evaluations';

/** Enabled arm of `CONFIG_EVALUATIONS_FLAG` (matches the editor-ui experiment). */
export const CONFIG_EVALUATIONS_ENABLED_VARIANT = 'variant';

/** Enables MCP connections for Instance AI */
export const INSTANCE_AI_MCP_CONNECTIONS_FLAG = '089_instance_ai_mcp_connections';

export const INSTANCE_AI_MCP_CONNECTIONS_ENABLED_VARIANT = 'variant';

/** Enables adding selected canvas nodes as chat context in the AI Assistant */
export const CANVAS_NODE_CONTEXT_FLAG = '104_canvas_aia_node_context';

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
	/**
	 * Budget for the whole run; the server waits indefinitely without it, leaving
	 * the execution running once the caller gives up. Generous ceiling: a per-case
	 * budget can exceed the 15 minutes a plain run takes.
	 */
	timeoutMs: z.number().int().min(30_000).max(3_600_000).optional(),
}) {}

// ---------------------------------------------------------------------------
// Eval agent execution — run a built first-class Agent for one scenario turn.
// Tool-side HTTP is mocked at the wire (same layer as workflow eval); the
// agent's own model call runs for real and is recorded, not mocked.
// ---------------------------------------------------------------------------

export interface InstanceAiEvalAgentToolCallRecord {
	/** Sanitized tool name — matches what the model called. */
	tool: string;
	/** Where the tool executes. 'other' covers built-ins (skills, todos, environment). */
	kind: 'node' | 'workflow' | 'custom' | 'mcp' | 'other';
	input?: unknown;
	output?: unknown;
	/** Tool-level failure. Unlike workflow node errors, this does NOT flip run `success` — agents may recover. */
	error?: string;
	/** True when at least one outbound HTTP request behind this call was served by the mock layer. */
	mocked: boolean;
	interceptedRequests: InstanceAiEvalInterceptedRequest[];
	/** True when the call required approval and eval auto-approved it. */
	autoApproved?: boolean;
}

/** One recorded (passthrough) call to the agent's real model provider. Bodies are redacted and truncated. */
export interface InstanceAiEvalAgentModelTurnRecord {
	url: string;
	provider?: string;
	status?: number;
	durationMs?: number;
	streamed: boolean;
	requestBody?: unknown;
	responseBody?: unknown;
	error?: string;
}

/** Phase-1 output for agent scenarios: the opening user message plays the role trigger pin data plays for workflows. */
export interface InstanceAiEvalAgentScenarioSeed {
	openingMessage: string;
	globalContext: string;
	/** Per-tool data hints, keyed by sanitized tool name. */
	toolHints: Record<string, string>;
	warnings: string[];
}

/** A config feature the eval runtime pruned before the run (not yet mockable). */
export interface InstanceAiEvalAgentSkippedFeature {
	feature: string;
	reason: string;
}

export interface InstanceAiEvalAgentExecutionResult {
	runId: string;
	/** The run completed without framework/model errors. Tool-level errors live on toolCalls[].error. */
	success: boolean;
	errors: string[];
	/** The agent's final assistant text for the turn. */
	finalText: string;
	model?: string;
	finishReason?: string;
	toolCalls: InstanceAiEvalAgentToolCallRecord[];
	modelTurns: InstanceAiEvalAgentModelTurnRecord[];
	usage?: { inputTokens?: number; outputTokens?: number };
	seed: InstanceAiEvalAgentScenarioSeed;
	skippedFeatures: InstanceAiEvalAgentSkippedFeature[];
	mockedCredentials: InstanceAiEvalMockedCredential[];
}

export class InstanceAiEvalAgentExecutionRequest extends Z.class({
	/** Project the agent lives in (agent routes are project-scoped). */
	projectId: z.string().min(1),
	scenarioHints: z.string().max(2000).optional(),
	/**
	 * Overall run budget. Server default applies when omitted. Shares the workflow
	 * variant's ceiling — the old 900_000 cap truncated a `complex` case's budget.
	 */
	timeoutMs: z.number().int().min(30_000).max(3_600_000).optional(),
}) {}

export class InstanceAiEvalCredentialAllowlistRequest extends Z.class({
	threadId: z.string().uuid(),
	/**
	 * Credential IDs the thread's builder context may see. `list()` results are
	 * filtered to this set — an empty array means the thread sees no credentials.
	 */
	credentialIds: z.array(z.string().min(1)).max(50),
	/**
	 * Credential IDs whose connection test resolves as successful without
	 * contacting the provider. Lets an eval exercise a flow the product gates
	 * behind a passing test (the workflow setup card won't apply a credential
	 * that fails one) while honouring "no stored provider credentials" — the
	 * seeded token stays a placeholder. Omitted/empty reproduces today's
	 * behaviour, so every existing case is unaffected.
	 */
	bypassCredentialTest: z.array(z.string().min(1)).max(50).optional(),
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
 *  Real conversation seeds send `columns` only — rows are the trace's highest-PII
 *  payload and are never sent for those. Authored eval scenarios (TRUST-311) may
 *  additionally send `rows`, so a string id like `row_001` can be seeded into an
 *  explicitly `string`-typed column instead of being rejected by free-text
 *  `dataSetup` landing it in a `number` column. */
export const instanceAiEvalSeedDataTableSchema = z.object({
	// ≥8 chars: restore remaps this id by whole-document string replace, and a
	// short id would risk corrupting unrelated substrings — so the restore path
	// refuses shorter ids. Enforcing it here fails a bad fixture at load time
	// instead of after a workflow has already been built.
	id: z.string().min(8).max(64),
	name: z.string().min(1).max(128),
	columns: z
		.array(
			z.object({
				name: z.string().min(1).max(128),
				type: z.enum(['string', 'number', 'boolean', 'date']),
			}),
		)
		.max(50),
	/** Optional seed rows, keyed by column name. Cell values arrive as JSON
	 *  scalars (dates as ISO strings); the data-table service validates each cell
	 *  against its declared column type on insert. */
	rows: z
		.array(z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])))
		.max(1000)
		.optional(),
});

export type InstanceAiEvalSeedDataTable = z.infer<typeof instanceAiEvalSeedDataTableSchema>;

/** An agent a conversation seed references, recreated at its given id in the
 *  thread's project. `config`/`skills` are the shapes the agent's own config and
 *  skills routes return, so a seed can be authored from a fetched agent verbatim.
 *  Credential ids in the config are blanked on restore. */
export const instanceAiEvalSeedAgentSchema = z
	.object({
		// ≥8 chars like a seed data table: the harness remaps this id by whole-document
		// string replace before restoring.
		id: z.string().min(8).max(64),
		/** Carries the agent's display name as `config.name`. */
		config: AgentJsonConfigSchema,
		/** Skill bodies keyed by the ids `config.skills[].id` references. */
		skills: z.record(agentSkillSchema).optional(),
	})
	// A reference the seed can't back restores an agent that is missing the
	// capability the case grades, which reads as a build failure rather than a
	// broken fixture. Refuse at authoring time instead.
	.superRefine((agent, ctx) => {
		for (const [index, skill] of (agent.config.skills ?? []).entries()) {
			// Own property only: direct indexing treats inherited names like
			// `constructor` as a present body, restoring an agent with none.
			if (!Object.hasOwn(agent.skills ?? {}, skill.id)) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ['config', 'skills', index, 'id'],
					message: `Seed agent references skill "${skill.id}" but carries no body for it under \`skills\``,
				});
			}
		}
		for (const [index, tool] of (agent.config.tools ?? []).entries()) {
			if (tool.type === 'custom') {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ['config', 'tools', index],
					message: `Seed agent references custom tool "${tool.id}", which a seed cannot carry a body for — remove it or use a node/workflow tool`,
				});
			}
		}
		if (agent.config.tasks?.length) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ['config', 'tasks'],
				message: 'Seed agent declares tasks, which a seed cannot carry bodies for — remove them',
			});
		}
	});

export type InstanceAiEvalSeedAgent = z.infer<typeof instanceAiEvalSeedAgentSchema>;

export class InstanceAiEvalRestoreThreadRequest extends Z.class({
	threadId: z.string().uuid(),
	/** Native agent message log (ISO `createdAt`), stored verbatim. May be empty
	 *  when the request only seeds data tables (TRUST-311 scenario seeding). */
	messages: z.array(z.record(z.unknown())).max(1000),
	/** Data tables the workflows reference; recreated first so ids can be rewritten. */
	dataTables: z.array(instanceAiEvalSeedDataTableSchema).max(20).optional(),
	/** Workflows the history references; recreated (node credentials stripped). */
	workflows: z.array(instanceAiEvalSeedWorkflowSchema).max(50).optional(),
	/** Agents the history references; created at their pinned id, with the thread
	 *  bound to them so the next turn continues one instead of resolving it again. */
	agents: z
		.array(instanceAiEvalSeedAgentSchema)
		.max(5)
		.optional()
		.superRefine((agents, ctx) => {
			if (!agents) return;
			// Unlike `workflows`, this array carries no uniqueness invariant of its own —
			// and the harness remaps ids through a Set, so duplicates collapse to ONE
			// fresh id and the second `create` aborts the whole restore on the pinned id.
			const seenIds = new Set<string>();
			for (const [index, agent] of agents.entries()) {
				if (seenIds.has(agent.id)) {
					ctx.addIssue({
						code: z.ZodIssueCode.custom,
						path: [index, 'id'],
						message: `Duplicate seed agent id "${agent.id}" — each seeded agent is created at its pinned id, so the second would abort the restore`,
					});
				}
				seenIds.add(agent.id);
			}
			for (const [index, agent] of agents.entries()) {
				for (const [refIndex, ref] of (agent.config.subAgents?.agents ?? []).entries()) {
					const path = [index, 'config', 'subAgents', 'agents', refIndex, 'agentId'];
					if (ref.agentId === agent.id) {
						ctx.addIssue({
							code: z.ZodIssueCode.custom,
							path,
							message: `Seed agent "${agent.id}" cannot use itself as a sub-agent`,
						});
					} else if (!seenIds.has(ref.agentId)) {
						ctx.addIssue({
							code: z.ZodIssueCode.custom,
							path,
							message: `Seed agent "${agent.id}" references sub-agent "${ref.agentId}", which is not included in the seed`,
						});
					}
				}
			}
		}),
	/** Append a unique suffix to each seed data table's name (default true — safe
	 *  for id-remapped seed workflows). False keeps the EXACT declared name so a
	 *  freshly-built workflow's by-name references resolve. */
	uniquifyNames: z.boolean().optional(),
}) {}

/**
 * A seeded agent's workflow tool addresses its workflow by DISPLAY NAME, and the
 * runtime resolves it that way — so a name no seeded workflow carries restores a
 * dead tool, or binds an unrelated ambient workflow that happens to share it. A
 * workflow ID in that field is the common mistake and looks configured.
 *
 * Cross-field, so it can't live on `agents` alone: only the whole request knows
 * which workflows are being seeded alongside.
 */
export function findUnbackedSeedWorkflowTools(payload: {
	workflows?: Array<{ name?: unknown }>;
	agents?: Array<{ id: string; config: { tools?: Array<Record<string, unknown>> } }>;
}): Array<{ agentId: string; target: unknown }> {
	const seeded = new Set(
		(payload.workflows ?? [])
			.map((workflow) => workflow.name)
			.filter((name): name is string => typeof name === 'string'),
	);
	const unbacked: Array<{ agentId: string; target: unknown }> = [];
	for (const agent of payload.agents ?? []) {
		for (const tool of agent.config.tools ?? []) {
			if (tool.type !== 'workflow') continue;
			const target = tool.workflow;
			if (typeof target !== 'string' || !target || !seeded.has(target)) {
				unbacked.push({ agentId: agent.id, target });
			}
		}
	}
	return unbacked;
}

/**
 * Reset an existing data table's rows to exactly `rows` (clear-then-insert).
 * Unlike restore-thread (which CREATES tables), this targets a table that
 * already exists by id — used for the per-scenario row seeding of a case whose
 * tables were created empty before the build turn (TRUST-311 follow-up). The
 * table is scoped to the thread's project server-side.
 */
export class InstanceAiEvalSeedDataTableRowsRequest extends Z.class({
	threadId: z.string().uuid(),
	/** Id of the (already existing) data table whose rows are reset. */
	tableId: z.string().min(8).max(64),
	/** The exact row set the table should hold after seeding (may be empty to
	 *  clear it). Cell values are validated against each column's type on insert. */
	rows: z
		.array(z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])))
		.max(1000),
}) {}
