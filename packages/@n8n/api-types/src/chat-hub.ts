import { z } from 'zod';

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
export type ChatModelsResponse = ChatHubConversationModel[];
