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
	message: z.string(),
	model: chatHubConversationModelSchema,
	credentials: z.record(
		z.object({
			id: z.string(),
			name: z.string(),
		}),
	),
}) {}

/**
 * Chat message schema
 */
export const chatHubMessageSchema = z.object({
	id: z.string().uuid(),
	conversationId: z.string().uuid(),
	role: z.enum(['user', 'assistant']),
	content: z.string(),
	createdAt: z.string().datetime(),
});

export type ChatHubMessage = z.infer<typeof chatHubMessageSchema>;

/**
 * Chat conversation schema
 */
export const chatHubConversationSchema = z.object({
	id: z.string().uuid(),
	title: z.string(),
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime(),
});

export type ChatHubConversation = z.infer<typeof chatHubConversationSchema>;

/**
 * Response schema for GET /conversations
 */
export const chatHubConversationsResponseSchema = z.array(chatHubConversationSchema);

export type ChatHubConversationsResponse = z.infer<typeof chatHubConversationsResponseSchema>;

/**
 * Response schema for GET /conversations/:id/messages
 */
export const chatHubMessagesResponseSchema = z.array(chatHubMessageSchema);

export type ChatHubMessagesResponse = z.infer<typeof chatHubMessagesResponseSchema>;
