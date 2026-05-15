import {
	CHAT_TRIGGER_NODE_TYPE,
	EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE,
	FORM_TRIGGER_NODE_TYPE,
	MANUAL_TRIGGER_NODE_TYPE,
	SCHEDULE_TRIGGER_NODE_TYPE,
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
] as const;

export const INCOMPATIBLE_WORKFLOW_TOOL_BODY_NODE_TYPES = [
	'n8n-nodes-base.wait',
	'n8n-nodes-base.form',
	'n8n-nodes-base.respondToWebhook',
] as const;

export const AGENT_WORKFLOW_TRIGGER_TYPE = 'workflow';

export const DEFAULT_AGENT_SCHEDULE_WAKE_UP_PROMPT =
	'Automated message: you were triggered on schedule.';

export interface ChatIntegrationDescriptor {
	type: string;
	label: string;
	icon: string;
	credentialTypes: string[];
}

export interface AgentScheduleConfig {
	active: boolean;
	cronExpression: string;
	wakeUpPrompt: string;
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

export interface AgentPublishedVersionDto {
	schema: AgentJsonConfig | null;
	skills: Record<string, AgentSkill> | null;
	publishedFromVersionId: string;
	model: string | null;
	provider: string | null;
	credentialId: string | null;
	publishedById: string | null;
}

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

export interface AgentPersistedMessageDto {
	id: string;
	role: 'user' | 'assistant' | (string & {});
	content: AgentPersistedMessageContentPart[];
}

export const AGENT_BUILDER_DEFAULT_MODEL = 'claude-sonnet-4-5' as const;

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
