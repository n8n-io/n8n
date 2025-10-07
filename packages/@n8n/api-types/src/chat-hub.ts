import { z } from 'zod';

/**
 * Chat Hub conversation model configuration
 */
export const chatHubConversationModelSchema = z.object({
	provider: z.string(),
	providerDisplayName: z.string().optional(),
	model: z.string(),
	displayName: z.string().optional(),
	credentialType: z.string(),
});

export type ChatHubConversationModel = z.infer<typeof chatHubConversationModelSchema>;
