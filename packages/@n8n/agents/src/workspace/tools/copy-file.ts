import { z } from 'zod';

import { Tool } from '../../sdk/tool';
import type { BuiltTool } from '../../types/sdk/tool';
import type { WorkspaceFilesystem } from '../types';

export function createCopyFileTool(filesystem: WorkspaceFilesystem): BuiltTool {
	return new Tool('workspace_copy_file')
		.description('Copy a file or directory in the workspace')
		.input(
			z.object({
				src: z.string().describe('Source path of the file or directory to copy'),
				dest: z.string().describe('Destination path for the copy'),
				overwrite: z
					.boolean()
					.optional()
					.describe('Overwrite the destination if it already exists'),
			}),
		)
		.output(
			z.object({
				success: z.boolean().describe('Whether the copy was successful'),
			}),
		)
		.handler(async (input) => {
			await filesystem.copyFile(input.src, input.dest, { overwrite: input.overwrite });
			return { success: true };
		})
		.build();
}
