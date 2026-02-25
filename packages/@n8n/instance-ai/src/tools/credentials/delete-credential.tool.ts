import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import type { InstanceAiContext } from '../../types';

export function createDeleteCredentialTool(context: InstanceAiContext) {
	return createTool({
		id: 'delete-credential',
		description:
			'Permanently delete a credential. This is irreversible — confirm with the user first.',
		inputSchema: z.object({
			credentialId: z.string().describe('ID of the credential to delete'),
		}),
		outputSchema: z.object({
			success: z.boolean(),
		}),
		execute: async (inputData) => {
			await context.credentialService.delete(inputData.credentialId);
			return { success: true };
		},
	});
}
