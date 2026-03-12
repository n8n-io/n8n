import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import type { InstanceAiContext } from '../../types';

export function createCreateFolderTool(context: InstanceAiContext) {
	return createTool({
		id: 'create-folder',
		description: 'Create a new folder in a project. Supports nesting via parentFolderId.',
		inputSchema: z.object({
			name: z.string().describe('Name for the new folder'),
			projectId: z.string().describe('ID of the project to create the folder in'),
			parentFolderId: z
				.string()
				.optional()
				.describe('ID of the parent folder for nesting. Omit for root-level folder.'),
		}),
		outputSchema: z.object({
			id: z.string(),
			name: z.string(),
			parentFolderId: z.string().nullable(),
		}),
		execute: async (input) => {
			return await context.workspaceService!.createFolder(
				input.name,
				input.projectId,
				input.parentFolderId,
			);
		},
	});
}
