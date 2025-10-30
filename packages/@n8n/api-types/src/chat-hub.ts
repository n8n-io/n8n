import type { StructuredChunk } from 'n8n-workflow';
import { z } from 'zod';
import { Z } from 'zod-class';

/**
 * Supported AI model providers
 */
export const chatHubLLMProviderSchema = z.enum(['openai', 'anthropic', 'google']);
export type ChatHubLLMProvider = z.infer<typeof chatHubLLMProviderSchema>;

export const chatHubProviderSchema = z.enum([
	...chatHubLLMProviderSchema.options,
	'n8n',
	'custom-agent',
] as const);
export type ChatHubProvider = z.infer<typeof chatHubProviderSchema>;

/**
 * Map of providers to their credential types
 * Only LLM providers (openai, anthropic, google) have credentials
 */
export const PROVIDER_CREDENTIAL_TYPE_MAP: Record<
	Exclude<ChatHubProvider, 'n8n' | 'custom-agent'>,
	string
> = {
	openai: 'openAiApi',
	anthropic: 'anthropicApi',
	google: 'googlePalmApi',
};

/**
 * Chat Hub conversation model configuration
 */
const openAIModelSchema = z.object({
	provider: z.literal('openai'),
	model: z.string(),
});

const anthropicModelSchema = z.object({
	provider: z.literal('anthropic'),
	model: z.string(),
});

const googleModelSchema = z.object({
	provider: z.literal('google'),
	model: z.string(),
});

const n8nModelSchema = z.object({
	provider: z.literal('n8n'),
	workflowId: z.string(),
});

const chatAgentSchema = z.object({
	provider: z.literal('custom-agent'),
	agentId: z.string(),
});

export const chatHubConversationModelSchema = z.discriminatedUnion('provider', [
	openAIModelSchema,
	anthropicModelSchema,
	googleModelSchema,
	n8nModelSchema,
	chatAgentSchema,
]);

export type ChatHubOpenAIModel = z.infer<typeof openAIModelSchema>;
export type ChatHubAnthropicModel = z.infer<typeof anthropicModelSchema>;
export type ChatHubGoogleModel = z.infer<typeof googleModelSchema>;
export type ChatHubN8nModel = z.infer<typeof n8nModelSchema>;
export type ChatHubCustomAgentModel = z.infer<typeof chatAgentSchema>;
export type ChatHubConversationModel = z.infer<typeof chatHubConversationModelSchema>;

/**
 * Request schema for fetching available chat models
 * Maps provider names to credential IDs (null if no credential available)
 */
export const chatModelsRequestSchema = z.object({
	credentials: z.record(chatHubProviderSchema, z.string().nullable()),
});

export type ChatModelsRequest = z.infer<typeof chatModelsRequestSchema>;

export interface ChatModelDto {
	model: ChatHubConversationModel;
	name: string;
	description: string | null;
}

/**
 * Response type for fetching available chat models
 */
export type ChatModelsResponse = Record<
	ChatHubProvider,
	{
		models: ChatModelDto[];
		error?: string;
	}
>;

export class ChatHubSendMessageRequest extends Z.class({
	messageId: z.string().uuid(),
	sessionId: z.string().uuid(),
	message: z.string(),
	model: chatHubConversationModelSchema,
	previousMessageId: z.string().uuid().nullable(),
	credentials: z.record(
		z.object({
			id: z.string(),
			name: z.string(),
		}),
	),
}) {}

export class ChatHubRegenerateMessageRequest extends Z.class({
	model: chatHubConversationModelSchema,
	credentials: z.record(
		z.object({
			id: z.string(),
			name: z.string(),
		}),
	),
}) {}

export class ChatHubEditMessageRequest extends Z.class({
	message: z.string(),
	messageId: z.string().uuid(),
	model: chatHubConversationModelSchema,
	credentials: z.record(
		z.object({
			id: z.string(),
			name: z.string(),
		}),
	),
}) {}

export class ChatHubUpdateConversationRequest extends Z.class({
	title: z.string().optional(),
	credentialId: z.string().max(36).optional(),
	provider: chatHubProviderSchema.optional(),
	model: z.string().max(64).optional(),
	workflowId: z.string().max(36).optional(),
	agentId: z.string().uuid().optional(),
}) {}

export type ChatHubMessageType = 'human' | 'ai' | 'system' | 'tool' | 'generic';
export type ChatHubMessageStatus = 'success' | 'error' | 'running' | 'cancelled';

export type ChatSessionId = string; // UUID
export type ChatMessageId = string; // UUID

export interface ChatHubSessionDto {
	id: ChatSessionId;
	title: string;
	ownerId: string;
	lastMessageAt: string | null;
	credentialId: string | null;
	provider: ChatHubProvider | null;
	model: string | null;
	workflowId: string | null;
	agentId: string | null;
	agentName: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface ChatHubMessageDto {
	id: ChatMessageId;
	sessionId: ChatSessionId;
	type: ChatHubMessageType;
	name: string;
	content: string;
	provider: ChatHubProvider | null;
	model: string | null;
	workflowId: string | null;
	agentId: string | null;
	executionId: number | null;
	status: ChatHubMessageStatus;
	createdAt: string;
	updatedAt: string;

	previousMessageId: ChatMessageId | null;
	retryOfMessageId: ChatMessageId | null;
	revisionOfMessageId: ChatMessageId | null;
}

export type ChatHubConversationsResponse = ChatHubSessionDto[];

export interface ChatHubConversationDto {
	messages: Record<ChatMessageId, ChatHubMessageDto>;
}

export interface ChatHubConversationResponse {
	session: ChatHubSessionDto;
	conversation: ChatHubConversationDto;
}

export interface ChatHubAgentDto {
	id: string;
	name: string;
	description: string | null;
	systemPrompt: string;
	ownerId: string;
	credentialId: string | null;
	provider: ChatHubProvider;
	model: string;
	createdAt: string;
	updatedAt: string;
}

export class ChatHubCreateAgentRequest extends Z.class({
	name: z.string().min(1).max(128),
	description: z.string().max(512).optional(),
	systemPrompt: z.string().min(1),
	credentialId: z.string(),
	provider: chatHubProviderSchema.exclude(['n8n', 'custom-agent']),
	model: z.string().max(64),
}) {}

export class ChatHubUpdateAgentRequest extends Z.class({
	name: z.string().min(1).max(128).optional(),
	description: z.string().max(512).optional(),
	systemPrompt: z.string().min(1).optional(),
	credentialId: z.string().optional(),
	provider: chatHubProviderSchema.optional(),
	model: z.string().max(64).optional(),
}) {}

export interface EnrichedStructuredChunk extends StructuredChunk {
	metadata: StructuredChunk['metadata'] & {
		messageId: ChatMessageId;
		previousMessageId: ChatMessageId | null;
		retryOfMessageId: ChatMessageId | null;
	};
}
