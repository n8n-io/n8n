import { z } from 'zod';

import { Tool } from '../../sdk/tool';
import type { BuiltTool } from '../../types/sdk/tool';
import type { WorkspaceFilesystem } from '../types';

export function createFileStatTool(filesystem: WorkspaceFilesystem): BuiltTool {
	return new Tool('workspace_file_stat')
		.description('Get metadata about a file or directory')
		.input(
			z.object({
				path: z.string().describe('Path to the file or directory'),
			}),
		)
		.output(
			z.object({
				name: z.string(),
				path: z.string(),
				type: z.enum(['file', 'directory']),
				size: z.number(),
				createdAt: z.string(),
				modifiedAt: z.string(),
			}),
		)
		.handler(async (input) => {
			const stat = await filesystem.stat(input.path);
			return {
				name: stat.name,
				path: stat.path,
				type: stat.type,
				size: stat.size,
				createdAt: stat.createdAt.toISOString(),
				modifiedAt: stat.modifiedAt.toISOString(),
			};
		})
		.build();
}
