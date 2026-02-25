import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import type { InstanceAiContext } from '../../types';

export function createCreateCredentialTool(context: InstanceAiContext) {
	return createTool({
		id: 'create-credential',
		description: 'Create a new credential with the given name, type, and configuration data.',
		inputSchema: z.object({
			name: z.string().describe('Display name for the credential'),
			type: z.string().describe('Credential type identifier (e.g. "notionApi")'),
			data: z.record(z.unknown()).describe('Credential configuration (e.g. { apiKey: "..." })'),
		}),
		outputSchema: z.object({
			id: z.string(),
			name: z.string(),
			type: z.string(),
		}),
		execute: async (inputData) => {
			return await context.credentialService.create({
				name: inputData.name,
				type: inputData.type,
				data: inputData.data,
			});
		},
	});
}
