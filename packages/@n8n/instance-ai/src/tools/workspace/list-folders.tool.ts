import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import type { InstanceAiContext } from '../../types';

export function createListFoldersTool(context: InstanceAiContext) {
	return createTool({
		id: 'list-folders',
		description:
			'List folders in a project. Use this to understand the existing folder structure before organizing workflows.',
		inputSchema: z.object({
			projectId: z.string().describe('ID of the project to list folders in'),
		}),
		outputSchema: z.object({
			folders: z.array(
				z.object({
					id: z.string(),
					name: z.string(),
					parentFolderId: z.string().nullable(),
				}),
			),
		}),
		execute: async (input) => {
			const folders = await context.workspaceService!.listFolders!(input.projectId);
			return { folders };
		},
	});
}
