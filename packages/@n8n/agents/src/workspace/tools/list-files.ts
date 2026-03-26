import { z } from 'zod';

import { Tool } from '../../sdk/tool';
import type { BuiltTool } from '../../types/sdk/tool';
import type { WorkspaceFilesystem } from '../types';

export function createListFilesTool(filesystem: WorkspaceFilesystem): BuiltTool {
	return new Tool('workspace_list_files')
		.description('List files and directories in the workspace')
		.input(
			z.object({
				path: z.string().describe('Directory path to list'),
				recursive: z.boolean().optional().describe('List files recursively'),
			}),
		)
		.output(
			z.object({
				entries: z
					.array(
						z.object({
							name: z.string(),
							type: z.enum(['file', 'directory']),
							size: z.number().optional(),
						}),
					)
					.describe('List of file entries'),
			}),
		)
		.handler(async (input) => {
			const entries = await filesystem.readdir(input.path, { recursive: input.recursive });
			return { entries };
		})
		.build();
}
