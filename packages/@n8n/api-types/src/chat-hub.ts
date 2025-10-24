import { z } from 'zod';
import { Z } from 'zod-class';

/**
 * Supported AI model providers
 */
export const chatHubLLMProviderSchema = z.enum(['openai', 'anthropic', 'google']);
export type ChatHubLLMProvider = z.infer<typeof chatHubLLMProviderSchema>;

export const chatHubProviderSchema = z.enum([...chatHubLLMProviderSchema.options, 'n8n'] as const);
export type ChatHubProvider = z.infer<typeof chatHubProviderSchema>;

/**
 * Map of providers to their credential types
 */
export const PROVIDER_CREDENTIAL_TYPE_MAP: Record<ChatHubLLMProvider, string> = {
	openai: 'openAiApi',
	anthropic: 'anthropicApi',
	google: 'googlePalmApi',
};

/**
 * Chat Hub conversation model configuration
 */
const openAIModelSchema = z.object({
	provider: z.literal('openai'),
	name: z.string(),
	model: z.string(),
});

const anthropicModelSchema = z.object({
	provider: z.literal('anthropic'),
	name: z.string(),
	model: z.string(),
});

const googleModelSchema = z.object({
	provider: z.literal('google'),
	name: z.string(),
	model: z.string(),
});

const n8nModelSchema = z.object({
	provider: z.literal('n8n'),
	name: z.string(),
	workflowId: z.string(),
});

export const chatHubConversationModelSchema = z.discriminatedUnion('provider', [
	openAIModelSchema,
	anthropicModelSchema,
	googleModelSchema,
	n8nModelSchema,
]);

export type ChatHubConversationModel = z.infer<typeof chatHubConversationModelSchema>;

/**
 * Request schema for fetching available chat models
 * Maps provider names to credential IDs (null if no credential available)
 */
export const chatModelsRequestSchema = z.object({
	credentials: z.record(chatHubProviderSchema, z.string().nullable()),
});

export type ChatModelsRequest = z.infer<typeof chatModelsRequestSchema>;

/**
 * Response type for fetching available chat models
 */
export type ChatModelsResponse = Record<
	ChatHubProvider,
	{
		models: ChatHubConversationModel[];
		error?: string;
	}
>;

export class ChatHubSendMessageRequest extends Z.class({
	messageId: z.string().uuid(),
	sessionId: z.string().uuid(),
	replyId: z.string().uuid(),
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
	replyId: z.string().uuid(),
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
	replyId: z.string().uuid(),
	model: chatHubConversationModelSchema,
	credentials: z.record(
		z.object({
			id: z.string(),
			name: z.string(),
		}),
	),
}) {}

export class ChatHubChangeConversationTitleRequest extends Z.class({
	title: z.string(),
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
