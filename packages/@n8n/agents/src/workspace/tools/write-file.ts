import { z } from 'zod';

import { Tool } from '../../sdk/tool';
import type { BuiltTool } from '../../types/sdk/tool';
import type { WorkspaceAfterWrite, WorkspaceFilesystem } from '../types';
import { afterWriteDiagnostics, diagnosticsOutputSchema } from './after-write';

export function createWriteFileTool(
	filesystem: WorkspaceFilesystem,
	afterWrite?: WorkspaceAfterWrite,
): BuiltTool {
	return new Tool('workspace_write_file')
		.description('Write content to a file in the workspace')
		.input(
			z.object({
				path: z
					.string()
					.describe(
						'Path to the file to write, relative to the workspace root (absolute paths must be under it)',
					),
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
				diagnostics: diagnosticsOutputSchema,
			}),
		)
		.handler(async (input, ctx) => {
			await filesystem.writeFile(input.path, input.content, {
				recursive: input.recursive,
				abortSignal: ctx.abortSignal,
			});
			const file = { path: input.path, content: input.content };
			return {
				success: true,
				...(await afterWriteDiagnostics(afterWrite, file, {
					abortSignal: ctx.abortSignal,
					toolCallId: ctx.toolCallId,
				})),
			};
		})
		.build();
}
