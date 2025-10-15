import { z } from 'zod';
import { Z } from 'zod-class';

/**
 * Supported AI model providers
 */
export const chatHubProviderSchema = z.enum(['openai', 'anthropic', 'google']);

export type ChatHubProvider = z.infer<typeof chatHubProviderSchema>;

/**
 * Map of providers to their credential types
 */
export const PROVIDER_CREDENTIAL_TYPE_MAP: Record<ChatHubProvider, string> = {
	openai: 'openAiApi',
	anthropic: 'anthropicApi',
	google: 'googlePalmApi',
};

/**
 * Chat Hub conversation model configuration
 */
export const chatHubConversationModelSchema = z.object({
	provider: chatHubProviderSchema,
	model: z.string(),
	workflowId: z.string().nullable().default(null),
});

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
	{ models: Array<{ name: string }>; error?: string }
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

export type ChatHubMessageType = 'human' | 'ai' | 'system' | 'tool' | 'generic';
export type ChatHubMessageState = 'active' | 'superseded' | 'hidden' | 'deleted';

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
	state: ChatHubMessageState;
	createdAt: string;
	updatedAt: string;

	previousMessageId: ChatMessageId | null;
	turnId: ChatMessageId | null;
	retryOfMessageId: ChatMessageId | null;
	revisionOfMessageId: ChatMessageId | null;
	runIndex: number;

	responseIds: ChatMessageId[];
	retryIds: ChatMessageId[];
	revisionIds: ChatMessageId[];
}

export type ChatHubConversationsResponse = ChatHubSessionDto[];

export interface ChatHubConversationResponse {
	session: ChatHubSessionDto;

	conversation: {
		messages: Record<string, ChatHubMessageDto>;
		rootIds: string[];
		activeMessageChain: string[];
	};
}
