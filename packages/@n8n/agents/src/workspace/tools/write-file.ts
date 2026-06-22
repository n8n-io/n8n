import { z } from 'zod';

import { Tool } from '../../sdk/tool';
import type { BuiltTool } from '../../types/sdk/tool';
import type { WorkspaceFilesystem } from '../types';

export function createWriteFileTool(filesystem: WorkspaceFilesystem): BuiltTool {
	return new Tool('workspace_write_file')
		.description('Write content to a file in the workspace')
		.input(
			z.object({
				path: z.string().describe('Path to the file to write'),
				content: z.string().describe('Content to write to the file'),
				recursive: z
					.boolean()
					.optional()
					.describe('Create parent directories if they do not exist'),
			}),
		)
		.output(
			z.object({
				success: z.boolean().describe('Whether the write was successful'),
			}),
		)
		.handler(async (input) => {
			await filesystem.writeFile(input.path, input.content, { recursive: input.recursive });
			return { success: true };
		})
		.build();
}
