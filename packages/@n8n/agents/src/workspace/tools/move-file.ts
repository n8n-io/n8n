import { z } from 'zod';

import { Tool } from '../../sdk/tool';
import type { BuiltTool } from '../../types/sdk/tool';
import type { WorkspaceFilesystem } from '../types';

export function createMoveFileTool(filesystem: WorkspaceFilesystem): BuiltTool {
	return new Tool('workspace_move_file')
		.description('Move or rename a file or directory in the workspace')
		.input(
			z.object({
				src: z.string().describe('Source path of the file or directory to move'),
				dest: z.string().describe('Destination path'),
				overwrite: z
					.boolean()
					.optional()
					.describe('Overwrite the destination if it already exists'),
			}),
		)
		.output(
			z.object({
				success: z.boolean().describe('Whether the move was successful'),
			}),
		)
		.handler(async (input) => {
			await filesystem.moveFile(input.src, input.dest, { overwrite: input.overwrite });
			return { success: true };
		})
		.build();
}
