import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import type { InstanceAiContext } from '../../types';

export function createGetFileTreeTool(context: InstanceAiContext) {
	return createTool({
		id: 'get-file-tree',
		description:
			'Get a shallow directory tree. Start at depth 1-2 for an overview, then call again on specific subdirectories to drill deeper. Always use absolute paths or ~/relative paths.',
		inputSchema: z.object({
			dirPath: z
				.string()
				.describe(
					'Absolute directory path or ~/relative path (e.g. "/home/user/project" or "~/project/src"). Call with subdirectory paths to explore deeper.',
				),
			maxDepth: z
				.number()
				.int()
				.positive()
				.max(5)
				.default(2)
				.optional()
				.describe(
					'Maximum directory depth to show (default 2, max 5). Start low and increase only if needed.',
				),
		}),
		outputSchema: z.object({
			tree: z.string().describe('Directory tree as indented text'),
			truncated: z.boolean(),
		}),
		execute: async ({ dirPath, maxDepth }) => {
			if (!context.filesystemService) {
				throw new Error('No filesystem access available.');
			}
			const tree = await context.filesystemService.getFileTree(dirPath, {
				maxDepth: maxDepth ?? 2,
			});
			const truncated =
				tree.includes('call get-file-tree on a subdirectory') || tree.includes('... (truncated at');

			return { tree, truncated };
		},
	});
}
