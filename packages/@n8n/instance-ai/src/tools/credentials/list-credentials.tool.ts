import { createTool } from '@mastra/core/tools';
import pLimit from 'p-limit';
import { z } from 'zod';

import type { InstanceAiContext } from '../../types';

const DEFAULT_LIMIT = 50;

export const listCredentialsInputSchema = z.object({
	type: z.string().optional().describe('Filter by credential type (e.g. "notionApi")'),
	limit: z
		.number()
		.int()
		.min(1)
		.max(200)
		.optional()
		.describe(
			`Max credentials to return (default ${DEFAULT_LIMIT}, max 200). Use with offset to paginate.`,
		),
	offset: z
		.number()
		.int()
		.min(0)
		.optional()
		.describe('Number of credentials to skip (default 0). Use with limit to paginate.'),
});

export function createListCredentialsTool(context: InstanceAiContext) {
	return createTool({
		id: 'list-credentials',
		description:
			'List credentials accessible to the current user. Never exposes secret data. ' +
			'Returns a masked accountIdentifier (e.g. "al***@gmail.com") when available, so you know which account each credential is connected to. ' +
			'Results are paginated — use limit/offset to page through large sets, or filter by type to narrow results.',
		inputSchema: listCredentialsInputSchema,
		outputSchema: z.object({
			credentials: z.array(
				z.object({
					id: z.string(),
					name: z.string(),
					type: z.string(),
					accountIdentifier: z.string().optional(),
				}),
			),
			total: z.number().describe('Total number of credentials matching the query'),
		}),
		execute: async (inputData: z.infer<typeof listCredentialsInputSchema>) => {
			const allCredentials = await context.credentialService.list({
				type: inputData.type,
			});

			const total = allCredentials.length;
			const offset = inputData.offset ?? 0;
			const limit = inputData.limit ?? DEFAULT_LIMIT;
			const page = allCredentials.slice(offset, offset + limit);

			if (!context.credentialService.getAccountContext) {
				return {
					credentials: page.map(({ id, name, type }) => ({ id, name, type })),
					total,
				};
			}

			const concurrencyLimit = pLimit(10);
			const enriched = await Promise.all(
				page.map(
					async (cred) =>
						await concurrencyLimit(async () => {
							const ctx = await context.credentialService.getAccountContext!(cred.id);
							return {
								id: cred.id,
								name: cred.name,
								type: cred.type,
								accountIdentifier: ctx?.accountIdentifier,
							};
						}),
				),
			);

			return { credentials: enriched, total };
		},
	});
}
