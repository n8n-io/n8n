import { z } from 'zod';

/**
 * JSON shape of an agent's configuration, as stored on the backend and
 * consumed by the UI. The backend has a Zod schema that produces a
 * structurally-compatible type (see `agent-json-config.ts` in the CLI module);
 * keep this interface in sync when the schema changes.
 */

import {
	CHAT_TRIGGER_NODE_TYPE,
	EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE,
	FORM_TRIGGER_NODE_TYPE,
	MANUAL_TRIGGER_NODE_TYPE,
	SCHEDULE_TRIGGER_NODE_TYPE,
} from 'n8n-workflow';

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

export interface NodeToolConfig {
	nodeType: string;
	nodeTypeVersion: number;
	nodeParameters?: Record<string, unknown>;
	credentials?: Record<string, { id: string; name: string }>;
}

export interface AgentJsonToolRef {
	type: 'custom' | 'workflow' | 'node';
	id?: string;
	workflow?: string;
	name?: string;
	description?: string;
	node?: NodeToolConfig;
	inputSchema?: Record<string, unknown>;
	requireApproval?: boolean;
	allOutputs?: boolean;
}

export interface AgentJsonConfig {
	name: string;
	description?: string;
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
	providerTools?: Record<string, Record<string, unknown>>;
	config?: {
		thinking?: {
			provider: 'anthropic' | 'openai';
			budgetTokens?: number;
			reasoningEffort?: string;
		};
		toolCallConcurrency?: number;
		requireToolApproval?: boolean;
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
	type: 'text' | 'reasoning' | 'tool-call' | 'tool-result' | (string & {});
	text?: string;
	toolName?: string;
	toolCallId?: string;
	input?: unknown;
	result?: unknown;
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
	role: 'user' | 'assistant' | 'tool' | (string & {});
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
