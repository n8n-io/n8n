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
