import { z } from 'zod';

import { Tool } from '../../sdk/tool';
import type { BuiltTool } from '../../types/sdk/tool';
import type { WorkspaceFilesystem } from '../types';

export function createDeleteFileTool(filesystem: WorkspaceFilesystem): BuiltTool {
	return new Tool('workspace_delete_file')
		.description('Delete a file or directory from the workspace')
		.input(
			z.object({
				path: z.string().describe('Path to the file or directory to delete'),
				recursive: z
					.boolean()
					.optional()
					.describe('Delete directories and their contents recursively'),
				force: z.boolean().optional().describe('Ignore errors if the file does not exist'),
			}),
		)
		.output(
			z.object({
				success: z.boolean().describe('Whether the deletion was successful'),
			}),
		)
		.handler(async (input) => {
			await filesystem.deleteFile(input.path, { recursive: input.recursive, force: input.force });
			return { success: true };
		})
		.build();
}
