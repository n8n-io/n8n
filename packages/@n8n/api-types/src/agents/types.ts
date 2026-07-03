import {
	CHAT_TRIGGER_NODE_TYPE,
	EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE,
	FORM_TRIGGER_NODE_TYPE,
	MANUAL_TRIGGER_NODE_TYPE,
	SCHEDULE_TRIGGER_NODE_TYPE,
	WEBHOOK_NODE_TYPE,
} from 'n8n-workflow';
import { z } from 'zod';

import type { AgentIntegrationSettings } from './agent-integration.schema';
import type { AgentJsonConfig } from './agent-json-config.schema';

export const SUPPORTED_WORKFLOW_TOOL_TRIGGERS = [
	MANUAL_TRIGGER_NODE_TYPE,
	EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE,
	CHAT_TRIGGER_NODE_TYPE,
	SCHEDULE_TRIGGER_NODE_TYPE,
	FORM_TRIGGER_NODE_TYPE,
	WEBHOOK_NODE_TYPE,
] as const;

export const INCOMPATIBLE_WORKFLOW_TOOL_BODY_NODE_TYPES = [
	'n8n-nodes-base.wait',
	'n8n-nodes-base.form',
] as const;

export const AGENT_WORKFLOW_TRIGGER_TYPE = 'workflow';

export interface ChatIntegrationDescriptor {
	type: string;
	label: string;
	icon: string;
	credentialTypes: string[];
	capabilities?: string[];
	useIntegrationWhen?: string[];
	useNodeToolWhen?: string[];
}

export interface AgentIntegrationStatusEntry {
	type: string;
	credentialId?: string;
	settings?: AgentIntegrationSettings;
}

export interface AgentIntegrationStatusResponse {
	status: 'connected' | 'disconnected';
	integrations: AgentIntegrationStatusEntry[];
}

export interface CreateSlackAgentAppResponse {
	appId: string;
	installUrl: string;
}

export interface SlackAgentAppManifest {
	display_information: {
		name: string;
	};
	features: {
		app_home: {
			home_tab_enabled: boolean;
			messages_tab_enabled: boolean;
			messages_tab_read_only_enabled: boolean;
		};
		bot_user: {
			display_name: string;
			always_online: boolean;
		};
	};
	oauth_config: {
		redirect_urls?: string[];
		scopes: {
			bot: string[];
		};
	};
	settings: {
		event_subscriptions: {
			request_url: string;
			bot_events: string[];
		};
		interactivity: {
			is_enabled: boolean;
			request_url: string;
		};
		org_deploy_enabled: boolean;
		socket_mode_enabled: boolean;
		token_rotation_enabled: boolean;
	};
}

export interface SlackAgentAppManifestResponse {
	manifest: SlackAgentAppManifest;
}

export interface AgentSkillReference {
	path: string;
	content: string;
}

export interface AgentSkill {
	name: string;
	description: string;
	instructions: string;
	allowedTools?: string[];
	references?: AgentSkillReference[];
}

export interface AgentSkillMutationResponse {
	id: string;
	skill: AgentSkill;
	versionId: string | null;
}

export interface AgentVersionDto {
	versionId: string;
	schema: AgentJsonConfig | null;
	skills: Record<string, AgentSkill> | null;
	author: string;
}

export interface AgentFileDto {
	id: string;
	agentId: string;
	fileName: string;
	mimeType: string;
	fileSizeBytes: number;
	createdAt: string;
}

export interface AgentVersionListItemDto {
	versionId: string;
	agentId: string;
	createdAt: string;
	updatedAt: string;
	author: string;
	isActive: boolean;
}

export interface AgentPersistedMessageContentPart {
	type: 'text' | 'reasoning' | 'tool-call' | (string & {});
	text?: string;
	toolName?: string;
	toolCallId?: string;
	input?: unknown;
	state?: string;
	output?: unknown;
	canceled?: boolean;
	error?: string;
	/** Epoch ms when the tool handler started executing. */
	startTime?: number;
	/** Epoch ms when the tool handler settled. */
	endTime?: number;
}

export interface AgentPersistedMessageDto {
	id: string;
	role: 'user' | 'assistant' | (string & {});
	content: AgentPersistedMessageContentPart[];
}

export const AGENT_BUILDER_DEFAULT_MODEL = 'claude-sonnet-4-6' as const;

export const agentBuilderModeSchema = z.enum(['default', 'custom']);
export type AgentBuilderMode = z.infer<typeof agentBuilderModeSchema>;

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

export const AgentBuilderAdminSettingsUpdateDto = agentBuilderAdminSettingsSchema;
export type AgentBuilderAdminSettingsUpdateRequest = AgentBuilderAdminSettings;

export const agentBuilderStatusResponseSchema = z.object({
	isConfigured: z.boolean(),
});
export type AgentBuilderStatusResponse = z.infer<typeof agentBuilderStatusResponseSchema>;

export interface AgentBuilderOpenSuspension {
	toolCallId: string;
	runId: string;
}

export interface AgentBuilderMessagesResponse {
	messages: AgentPersistedMessageDto[];
	openSuspensions: AgentBuilderOpenSuspension[];
}

/**
 * Internal integration type for the in-app chat channel. Injected per-run for
 * `/chat` executions — never persisted in an agent's `integrations` array.
 */
export const N8N_CHAT_INTEGRATION_TYPE = 'n8n_chat' as const;
/** Fixed tool names for the implicit in-app chat integration (no credential suffixes). */
export const N8N_CHAT_ACTION_TOOL_NAME = 'chat_action' as const;
export const N8N_CHAT_CONTEXT_TOOL_NAME = 'chat_context' as const;

/** Chat history envelope — same contract as {@link AgentBuilderMessagesResponse}. */
export type AgentChatMessagesResponse = AgentBuilderMessagesResponse;
