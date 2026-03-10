import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import type { InstanceAiContext } from '../../types';

export function createReadFileTool(context: InstanceAiContext) {
	return createTool({
		id: 'read-file',
		description:
			'Read the contents of a file. Returns the text content with optional line range. Use after list-files or search-files to read specific files. Always use absolute paths or ~/relative paths.',
		inputSchema: z.object({
			filePath: z
				.string()
				.describe(
					'Absolute file path or ~/relative path (e.g. "/home/user/project/file.ts" or "~/project/file.ts"). Do NOT use bare relative paths.',
				),
			startLine: z
				.number()
				.int()
				.positive()
				.optional()
				.describe('Start reading from this line (1-indexed, default: 1)'),
			maxLines: z
				.number()
				.int()
				.positive()
				.max(500)
				.default(200)
				.optional()
				.describe('Maximum number of lines to read (default 200, max 500)'),
		}),
		outputSchema: z.object({
			path: z.string(),
			content: z.string(),
			truncated: z.boolean(),
			totalLines: z.number(),
		}),
		execute: async ({ filePath, startLine, maxLines }) => {
			if (!context.filesystemService) {
				throw new Error('No filesystem access available.');
			}
			return await context.filesystemService.readFile(filePath, {
				startLine: startLine ?? undefined,
				maxLines: maxLines ?? undefined,
			});
		},
	});
}
