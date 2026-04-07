import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import type { InstanceAiContext } from '../../types';

export const listCredentialsInputSchema = z.object({
	type: z.string().optional().describe('Filter by credential type (e.g. "notionApi")'),
});

export function createListCredentialsTool(context: InstanceAiContext) {
	return createTool({
		id: 'list-credentials',
		description: 'List credentials accessible to the current user. Never exposes secret data.',
		inputSchema: listCredentialsInputSchema,
		outputSchema: z.object({
			credentials: z.array(
				z.object({
					id: z.string(),
					name: z.string(),
					type: z.string(),
					createdAt: z.string(),
					updatedAt: z.string(),
				}),
			),
		}),
		execute: async (inputData: z.infer<typeof listCredentialsInputSchema>) => {
			const credentials = await context.credentialService.list({
				type: inputData.type,
			});
			return { credentials };
		},
	});
}
