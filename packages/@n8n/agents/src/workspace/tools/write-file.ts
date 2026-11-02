import { z } from 'zod';

import { Tool } from '../../sdk/tool';
import type { BuiltTool } from '../../types/sdk/tool';
import type { WorkspaceFilesystem } from '../types';

export const writeFileInputSchema = z.object({
	path: z
		.string()
		.describe(
			'Path to the file to write, relative to the workspace root (absolute paths must be under it)',
		),
	content: z.string().describe('Content to write to the file'),
	recursive: z.boolean().optional().describe('Create parent directories if they do not exist'),
});

/** Write one file. Shared by `workspace_write_file` and `workspace_edit_files`. */
export async function writeFile(
	filesystem: WorkspaceFilesystem,
	input: z.infer<typeof writeFileInputSchema>,
	abortSignal?: AbortSignal,
) {
	await filesystem.writeFile(input.path, input.content, {
		recursive: input.recursive,
		abortSignal,
	});
	return { success: true };
}

export function createWriteFileTool(filesystem: WorkspaceFilesystem): BuiltTool {
	return new Tool('workspace_write_file')
		.description('Write content to a file in the workspace')
		.input(writeFileInputSchema)
		.output(
			z.object({
				success: z.boolean().describe('Whether the write was successful'),
			}),
		)
		.handler(async (input, ctx) => await writeFile(filesystem, input, ctx.abortSignal))
		.build();
}
