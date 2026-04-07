import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import type { InstanceAiContext } from '../../types';

export function createGetCredentialTool(context: InstanceAiContext) {
	return createTool({
		id: 'get-credential',
		description:
			'Get credential metadata (name, type, node access). Never returns decrypted secrets.',
		inputSchema: z.object({
			credentialId: z.string().describe('ID of the credential'),
		}),
		outputSchema: z.object({
			id: z.string(),
			name: z.string(),
			type: z.string(),
			createdAt: z.string(),
			updatedAt: z.string(),
			nodesWithAccess: z.array(z.object({ nodeType: z.string() })).optional(),
		}),
		execute: async (inputData) => {
			return await context.credentialService.get(inputData.credentialId);
		},
	});
}
