import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import type { InstanceAiContext } from '../../types';

export const listCredentialsInputSchema = z.object({
	type: z.string().optional().describe('Filter by credential type (e.g. "notionApi")'),
});

export function createListCredentialsTool(context: InstanceAiContext) {
	return createTool({
		id: 'list-credentials',
		description:
			'List credentials accessible to the current user. Never exposes secret data. ' +
			'Returns a masked accountIdentifier (e.g. "al***@gmail.com") when available, so you know which account each credential is connected to.',
		inputSchema: listCredentialsInputSchema,
		outputSchema: z.object({
			credentials: z.array(
				z.object({
					id: z.string(),
					name: z.string(),
					type: z.string(),
					createdAt: z.string(),
					updatedAt: z.string(),
					accountIdentifier: z.string().optional(),
				}),
			),
		}),
		execute: async (inputData: z.infer<typeof listCredentialsInputSchema>) => {
			const credentials = await context.credentialService.list({
				type: inputData.type,
			});

			if (!context.credentialService.getAccountContext) {
				return { credentials };
			}

			const enriched = await Promise.all(
				credentials.map(async (cred) => {
					const ctx = await context.credentialService.getAccountContext!(cred.id);
					return { ...cred, accountIdentifier: ctx?.accountIdentifier };
				}),
			);

			return { credentials: enriched };
		},
	});
}
