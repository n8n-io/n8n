import { z } from 'zod';

import { Tool } from '../../sdk/tool';
import type { BuiltTool } from '../../types/sdk/tool';
import type { WorkspaceFilesystem } from '../types';

export function createReadFileTool(filesystem: WorkspaceFilesystem): BuiltTool {
	return new Tool('workspace_read_file')
		.description(
			'Read the contents of a file from the workspace. For large files prefer targeted inspection (grep/sed via workspace_execute_command) or str-replace edits over re-reading the whole file.',
		)
		.input(
			z.object({
				path: z.string().describe('Path to the file to read'),
				encoding: z.enum(['utf-8', 'base64']).optional().describe('File encoding (default: utf-8)'),
			}),
		)
		.output(
			z.object({
				content: z.string().describe('File content'),
			}),
		)
		.handler(async (input) => {
			const content = await filesystem.readFile(input.path, {
				encoding: (input.encoding ?? 'utf-8') as BufferEncoding,
			});
			return { content: content.toString() };
		})
		.build();
}
