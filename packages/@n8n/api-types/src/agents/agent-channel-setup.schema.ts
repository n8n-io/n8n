import { z } from 'zod';

export const agentChannelSetupRequiredSchema = z.object({
	setupId: z.string(),
	agentId: z.string(),
	projectId: z.string(),
	type: z.string(),
	credentialId: z.string(),
	path: z.array(z.union([z.string(), z.number()])),
	reason: z.literal('destination-setup-required'),
	setupUrl: z.string(),
});

export type AgentChannelSetupRequired = z.infer<typeof agentChannelSetupRequiredSchema>;
