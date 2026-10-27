import { z } from 'zod';

import { Tool } from '../../sdk/tool';
import type { BuiltTool } from '../../types/sdk/tool';
import type { WorkspaceFilesystem } from '../types';

export function createMkdirTool(filesystem: WorkspaceFilesystem): BuiltTool {
	return new Tool('workspace_mkdir')
		.description('Create a directory in the workspace')
		.input(
			z.object({
				path: z.string().describe('Path of the directory to create'),
				recursive: z.boolean().optional().describe('Create parent directories if needed'),
			}),
		)
		.output(
			z.object({
				success: z.boolean().describe('Whether the directory was created'),
			}),
		)
		.handler(async (input, ctx) => {
			await filesystem.mkdir(input.path, {
				recursive: input.recursive,
				abortSignal: ctx.abortSignal,
			});
			return { success: true };
		})
		.build();
}
