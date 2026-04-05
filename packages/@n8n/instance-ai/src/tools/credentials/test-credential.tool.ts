import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import type { InstanceAiContext } from '../../types';

export function createTestCredentialTool(context: InstanceAiContext) {
	return createTool({
		id: 'test-credential',
		description: 'Test whether a credential is valid and can connect to its service.',
		inputSchema: z.object({
			credentialId: z.string().describe('ID of the credential to test'),
		}),
		outputSchema: z.object({
			success: z.boolean(),
			message: z.string().optional(),
		}),
		execute: async (inputData) => {
			try {
				return await context.credentialService.test(inputData.credentialId);
			} catch (error) {
				return {
					success: false,
					message: error instanceof Error ? error.message : 'Credential test failed',
				};
			}
		},
	});
}
