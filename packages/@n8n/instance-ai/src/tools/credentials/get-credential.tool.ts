import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import type { InstanceAiContext } from '../../types';

export const getCredentialInputSchema = z.object({
	credentialId: z.string().describe('ID of the credential'),
});

export function createGetCredentialTool(context: InstanceAiContext) {
	return createTool({
		id: 'get-credential',
		description:
			'Get credential metadata (name, type, node access, account identifier). Never returns decrypted secrets.',
		inputSchema: getCredentialInputSchema,
		outputSchema: z.object({
			id: z.string(),
			name: z.string(),
			type: z.string(),
			nodesWithAccess: z.array(z.object({ nodeType: z.string() })).optional(),
			accountIdentifier: z.string().optional(),
		}),
		execute: async (inputData: z.infer<typeof getCredentialInputSchema>) => {
			const detail = await context.credentialService.get(inputData.credentialId);

			if (!context.credentialService.getAccountContext) {
				return detail;
			}

			const ctx = await context.credentialService.getAccountContext(inputData.credentialId);
			return { ...detail, accountIdentifier: ctx?.accountIdentifier };
		},
	});
}
