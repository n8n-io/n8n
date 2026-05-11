import {
	CHAT_TRIGGER_NODE_TYPE,
	EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE,
	FORM_TRIGGER_NODE_TYPE,
	MANUAL_TRIGGER_NODE_TYPE,
	SCHEDULE_TRIGGER_NODE_TYPE,
} from 'n8n-workflow';
import { z } from 'zod';

/**
 * Describes a chat platform integration that agents can connect to.
 * Source of truth: the backend `ChatIntegrationRegistry`.
 */
export interface ChatIntegrationDescriptor {
	type: string;
	label: string;
	icon: string;
	credentialTypes: string[];
}

/**
 * Node types a workflow can use as its trigger to be eligible as an agent
 * tool. Single source of truth for both the backend compatibility check
 * (`workflow-tool-factory.ts:SUPPORTED_TRIGGERS`) and the frontend Available
 * list's pre-filter. Body-node incompatibility (Wait / RespondToWebhook) is
 * enforced separately at save time.
 */
export const SUPPORTED_WORKFLOW_TOOL_TRIGGERS = [
	MANUAL_TRIGGER_NODE_TYPE,
	EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE,
	CHAT_TRIGGER_NODE_TYPE,
	SCHEDULE_TRIGGER_NODE_TYPE,
	FORM_TRIGGER_NODE_TYPE,
] as const;

/**
 * Node types in a workflow's body that disqualify it from being used as an
 * agent tool (execution model can't handle pause/respond-style nodes). Single
 * source of truth for the backend `validateCompatibility` check in
 * `workflow-tool-factory.ts` and the frontend pre-check in
 * `AgentToolsModal.vue` so the two sides can't drift.
 */
export const INCOMPATIBLE_WORKFLOW_TOOL_BODY_NODE_TYPES = [
	'n8n-nodes-base.wait',
	'n8n-nodes-base.form',
	'n8n-nodes-base.respondToWebhook',
] as const;

export const AGENT_SCHEDULE_TRIGGER_TYPE = 'schedule';

/**
 * Source string recorded on agent executions invoked from a workflow via the
 * MessageAnAgent node. Mirrors the pattern set by chat/slack/schedule sources
 * so the session detail view can attribute thread origin uniformly.
 */
export const AGENT_WORKFLOW_TRIGGER_TYPE = 'workflow';

export const DEFAULT_AGENT_SCHEDULE_WAKE_UP_PROMPT =
	'Automated message: you were triggered on schedule.';

export interface AgentCredentialIntegration {
	type: string;
	credentialId: string;
	credentialName: string;
}

export interface AgentScheduleIntegration {
	type: typeof AGENT_SCHEDULE_TRIGGER_TYPE;
	active: boolean;
	cronExpression: string;
	wakeUpPrompt: string;
}

export type AgentIntegration = AgentCredentialIntegration | AgentScheduleIntegration;

export interface AgentScheduleConfig {
	active: boolean;
	cronExpression: string;
	wakeUpPrompt: string;
}

export interface AgentIntegrationStatusEntry {
	type: string;
	credentialId?: string;
}

export interface AgentIntegrationStatusResponse {
	status: 'connected' | 'disconnected';
	integrations: AgentIntegrationStatusEntry[];
}

export function isAgentScheduleIntegration(
	integration: AgentIntegration | null | undefined,
): integration is AgentScheduleIntegration {
	return integration?.type === AGENT_SCHEDULE_TRIGGER_TYPE;
}

export function isAgentCredentialIntegration(
	integration: AgentIntegration | null | undefined,
): integration is AgentCredentialIntegration {
	return (
		integration !== null &&
		integration !== undefined &&
		integration.type !== AGENT_SCHEDULE_TRIGGER_TYPE &&
		'credentialId' in integration &&
		typeof integration.credentialId === 'string'
	);
}

export interface NodeToolConfig {
	nodeType: string;
	nodeTypeVersion: number;
	nodeParameters?: Record<string, unknown>;
	credentials?: Record<string, { id: string; name: string }>;
}

interface BaseAgentJsonToolRef {
	name?: string;
	description?: string;
	workflow?: string;
	node?: NodeToolConfig;
	requireApproval?: boolean;
	allOutputs?: boolean;
}

export type AgentJsonToolRef =
	| (BaseAgentJsonToolRef & {
			type: 'custom';
			id: string;
	  })
	| (BaseAgentJsonToolRef & {
			type: 'workflow';
			id?: never;
	  })
	| (BaseAgentJsonToolRef & {
			type: 'node';
			id?: never;
	  });

export interface AgentJsonSkillRef {
	type: 'skill';
	id: string;
}

export type AgentJsonConfigRef = AgentJsonToolRef | AgentJsonSkillRef;

export interface AgentSkill {
	name: string;
	description: string;
	instructions: string;
}

export interface AgentSkillMutationResponse {
	id: string;
	skill: AgentSkill;
	versionId: string | null;
}

export interface AgentJsonConfig {
	name: string;
	description?: string;
	/** Optional icon/emoji shown in the agent builder header. */
	icon?: { type: 'icon' | 'emoji'; value: string };
	model: string;
	credential?: string;
	instructions: string;
	memory?: {
		enabled: boolean;
		storage: 'n8n' | 'sqlite' | 'postgres';
		connection?: Record<string, unknown>;
		lastMessages?: number;
		semanticRecall?: {
			topK: number;
			scope?: 'thread' | 'resource';
			messageRange?: { before: number; after: number };
			embedder?: string;
		};
	};
	tools?: AgentJsonToolRef[];
	skills?: AgentJsonSkillRef[];
	providerTools?: Record<string, Record<string, unknown>>;
	/**
	 * Triggers (scheduled execution + chat integrations) attached to this agent.
	 * Mirrors the contents of `agent.integrations` storage column so the builder
	 * can read and modify triggers through the same JSON config flow as tools.
	 */
	integrations?: AgentIntegration[];
	config?: {
		thinking?: {
			provider: 'anthropic' | 'openai';
			budgetTokens?: number;
			reasoningEffort?: string;
		};
		toolCallConcurrency?: number;
		nodeTools?: {
			enabled: boolean;
		};
	};
}

/**
 * The snapshot of an agent at publish time. Returned by publish/unpublish
 * endpoints as part of the agent payload so the UI can derive publish state
 * (`not-published` / `published-no-changes` / `published-with-changes`) from
 * `agent.versionId` vs `publishedVersion.publishedFromVersionId`.
 */
export interface AgentPublishedVersionDto {
	schema: AgentJsonConfig | null;
	skills: Record<string, AgentSkill> | null;
	publishedFromVersionId: string;
	model: string | null;
	provider: string | null;
	credentialId: string | null;
	publishedById: string | null;
}

/**
 * A single part inside a persisted chat/builder message. Mirrors the content
 * parts emitted by the agents SDK; known `type` values are enumerated for
 * autocomplete but the field is left open because new SDK versions may
 * introduce additional kinds.
 */
export interface AgentPersistedMessageContentPart {
	type: 'text' | 'reasoning' | 'tool-call' | (string & {});
	text?: string;
	toolName?: string;
	toolCallId?: string;
	input?: unknown;
	state?: string;
	output?: unknown;
	error?: string;
}

/**
 * Persisted chat/builder message shape returned by
 * `GET /projects/:projectId/agents/v2/:agentId/chat/messages` and
 * `GET /projects/:projectId/agents/v2/:agentId/build/messages`. The UI
 * converts these into its own display-oriented representation.
 *
 * Distinct from the request-body `AgentChatMessageDto` (a single outbound
 * message) — this is the history shape, one entry per persisted turn.
 */
export interface AgentPersistedMessageDto {
	id: string;
	role: 'user' | 'assistant' | (string & {});
	content: AgentPersistedMessageContentPart[];
}
// ─── Agent builder admin settings ─────────────────────────────────────────
// The agent builder uses a model picked by the instance admin. By default it
// runs through the n8n AI assistant proxy; admins can switch to a custom
// provider + credential at any time.

/** Default model name used when the builder runs through the proxy or the env-var backstop. */
export const AGENT_BUILDER_DEFAULT_MODEL = 'claude-sonnet-4-5' as const;

export const agentBuilderModeSchema = z.enum(['default', 'custom']);
export type AgentBuilderMode = z.infer<typeof agentBuilderModeSchema>;

/**
 * Discriminated union of the persisted admin settings.
 *
 * The builder defaults to the n8n AI assistant proxy. An admin can switch to
 * a custom provider/credential at any time. Provider id values must come from
 * the agent runtime's supported list (see `mapCredentialForProvider` on the
 * backend) — the schema accepts any non-empty string here so the api-types
 * package doesn't need to know the runtime list; the backend validates the
 * provider against the runtime mapper.
 */
export const agentBuilderAdminSettingsSchema = z.discriminatedUnion('mode', [
	z.object({ mode: z.literal('default') }),
	z.object({
		mode: z.literal('custom'),
		provider: z.string().min(1),
		credentialId: z.string().min(1),
		modelName: z.string().min(1),
	}),
]);
export type AgentBuilderAdminSettings = z.infer<typeof agentBuilderAdminSettingsSchema>;

export const agentBuilderAdminSettingsResponseSchema = z.object({
	settings: agentBuilderAdminSettingsSchema,
	isConfigured: z.boolean(),
});
export type AgentBuilderAdminSettingsResponse = z.infer<
	typeof agentBuilderAdminSettingsResponseSchema
>;

/** Body schema for the PATCH /agent-builder/settings endpoint. */
export const AgentBuilderAdminSettingsUpdateDto = agentBuilderAdminSettingsSchema;
export type AgentBuilderAdminSettingsUpdateRequest = AgentBuilderAdminSettings;

export const agentBuilderStatusResponseSchema = z.object({
	isConfigured: z.boolean(),
});
export type AgentBuilderStatusResponse = z.infer<typeof agentBuilderStatusResponseSchema>;

/**
 * One still-open interactive tool call, surfaced alongside persisted messages
 * so the FE can re-attach a `runId` to suspended interactive cards after a
 * page refresh.
 */
export interface AgentBuilderOpenSuspension {
	toolCallId: string;
	runId: string;
}

/**
 * Response body of `GET /projects/:projectId/agents/v2/:agentId/build/messages`.
 *
 * `messages` is the merged history (persisted memory + any in-flight checkpoint
 * messages). `openSuspensions` carries the runIds for every still-open
 * interactive tool call so the FE can resume them.
 */
export interface AgentBuilderMessagesResponse {
	messages: AgentPersistedMessageDto[];
	openSuspensions: AgentBuilderOpenSuspension[];
}
