import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import type { InstanceAiContext } from '../../types';

export function createSearchFilesTool(context: InstanceAiContext) {
	return createTool({
		id: 'search-files',
		description:
			'Search file contents for a text pattern or regex across a directory. Returns matching lines with file paths and line numbers. Always use absolute paths or ~/relative paths.',
		inputSchema: z.object({
			dirPath: z
				.string()
				.describe(
					'Absolute directory path or ~/relative path (e.g. "/home/user/project" or "~/project"). Do NOT use bare relative paths.',
				),
			query: z.string().describe('Search query — supports regex patterns'),
			filePattern: z
				.string()
				.optional()
				.describe('File pattern to restrict search (e.g. "*.ts", "*.json")'),
			ignoreCase: z
				.boolean()
				.default(true)
				.optional()
				.describe('Case-insensitive search (default: true)'),
			maxResults: z
				.number()
				.int()
				.positive()
				.max(100)
				.default(50)
				.optional()
				.describe('Maximum number of matching lines to return (default 50, max 100)'),
		}),
		outputSchema: z.object({
			query: z.string(),
			matches: z.array(
				z.object({
					path: z.string(),
					lineNumber: z.number(),
					line: z.string(),
				}),
			),
			truncated: z.boolean(),
			totalMatches: z.number(),
		}),
		execute: async ({ dirPath, query, filePattern, ignoreCase, maxResults }) => {
			if (!context.filesystemService) {
				throw new Error('No filesystem access available.');
			}
			return await context.filesystemService.searchFiles(dirPath, {
				query,
				filePattern: filePattern ?? undefined,
				ignoreCase: ignoreCase ?? undefined,
				maxResults: maxResults ?? undefined,
			});
		},
	});
}
