import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import type { InstanceAiContext } from '../../types';

export const listFoldersInputSchema = z.object({
	projectId: z.string().describe('ID of the project to list folders in'),
});

export function createListFoldersTool(context: InstanceAiContext) {
	return createTool({
		id: 'list-folders',
		description:
			'List folders in a project. Use this to understand the existing folder structure before organizing workflows.',
		inputSchema: listFoldersInputSchema,
		outputSchema: z.object({
			folders: z.array(
				z.object({
					id: z.string(),
					name: z.string(),
					parentFolderId: z.string().nullable(),
				}),
			),
		}),
		execute: async (input: z.infer<typeof listFoldersInputSchema>) => {
			const folders = await context.workspaceService!.listFolders!(input.projectId);
			return { folders };
		},
	});
}
