import { z } from 'zod';

import { Tool } from '../../sdk/tool';
import type { BuiltTool } from '../../types/sdk/tool';
import type { WorkspaceFilesystem } from '../types';

export function createRmdirTool(filesystem: WorkspaceFilesystem): BuiltTool {
	return new Tool('workspace_rmdir')
		.description('Remove a directory from the workspace')
		.input(
			z.object({
				path: z.string().describe('Path of the directory to remove'),
				recursive: z
					.boolean()
					.optional()
					.describe('Remove the directory and its contents recursively'),
				force: z.boolean().optional().describe('Ignore errors if the directory does not exist'),
			}),
		)
		.output(
			z.object({
				success: z.boolean().describe('Whether the directory was removed'),
			}),
		)
		.handler(async (input) => {
			await filesystem.rmdir(input.path, { recursive: input.recursive, force: input.force });
			return { success: true };
		})
		.build();
}
