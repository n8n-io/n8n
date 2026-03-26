import { z } from 'zod';

import { Tool } from '../../sdk/tool';
import type { BuiltTool } from '../../types/sdk/tool';
import type { WorkspaceFilesystem } from '../types';

export function createAppendFileTool(filesystem: WorkspaceFilesystem): BuiltTool {
	return new Tool('workspace_append_file')
		.description('Append content to a file in the workspace')
		.input(
			z.object({
				path: z.string().describe('Path to the file to append to'),
				content: z.string().describe('Content to append to the file'),
			}),
		)
		.output(
			z.object({
				success: z.boolean().describe('Whether the append was successful'),
			}),
		)
		.handler(async (input) => {
			await filesystem.appendFile(input.path, input.content);
			return { success: true };
		})
		.build();
}
