import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import type { InstanceAiContext } from '../../types';

export function createUpdateCredentialTool(context: InstanceAiContext) {
	return createTool({
		id: 'update-credential',
		description: 'Update an existing credential name or data.',
		inputSchema: z.object({
			credentialId: z.string().describe('ID of the credential to update'),
			name: z.string().optional().describe('New display name'),
			data: z.record(z.unknown()).optional().describe('Updated credential configuration'),
		}),
		outputSchema: z.object({
			id: z.string(),
			name: z.string(),
			type: z.string(),
		}),
		execute: async (inputData) => {
			const { credentialId, ...updates } = inputData;
			return await context.credentialService.update(credentialId, updates);
		},
	});
}
