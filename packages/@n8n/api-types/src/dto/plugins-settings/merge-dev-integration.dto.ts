import { z } from 'zod';

export const mergeDevIntegrationSchema = z.object({
	name: z.string(),
	slug: z.string(),
	categories: z.array(z.string()),
	squareImage: z.string(),
	color: z.string(),
});

export type MergeDevIntegrationDto = z.infer<typeof mergeDevIntegrationSchema>;

export const mergeDevIntegrationsResponseSchema = z.object({
	integrations: z.array(mergeDevIntegrationSchema),
});

export type MergeDevIntegrationsResponseDto = z.infer<typeof mergeDevIntegrationsResponseSchema>;
