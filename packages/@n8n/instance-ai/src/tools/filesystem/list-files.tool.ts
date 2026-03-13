import { createTool } from '@mastra/core/tools';
import { instanceAiConfirmationSeveritySchema } from '@n8n/api-types';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import type { InstanceAiContext } from '../../types';

export function createListFilesTool(context: InstanceAiContext) {
	return createTool({
		id: 'list-files',
		description:
			"List files and/or directories matching optional filters. Use this to explore what exists in a directory. To see only top-level folders, set type='directory' and recursive=false. Always use absolute paths or ~/relative paths.",
		inputSchema: z.object({
			dirPath: z
				.string()
				.describe(
					'Absolute directory path or ~/relative path (e.g. "/home/user/project" or "~/project"). Do NOT use bare relative paths.',
				),
			pattern: z
				.string()
				.optional()
				.describe('Glob pattern to filter files (e.g. "**/*.ts", "src/**/*.json")'),
			type: z
				.enum(['file', 'directory', 'all'])
				.default('all')
				.optional()
				.describe(
					'Filter by entry type: "file" for files only, "directory" for folders only, "all" for both (default "all")',
				),
			recursive: z
				.boolean()
				.default(true)
				.optional()
				.describe(
					'Whether to recurse into subdirectories (default true). Set to false for a shallow listing of immediate children only.',
				),
			maxResults: z
				.number()
				.int()
				.positive()
				.max(1000)
				.default(200)
				.optional()
				.describe('Maximum number of results to return (default 200, max 1000)'),
		}),
		outputSchema: z.object({
			files: z.array(
				z.object({
					path: z.string(),
					type: z.enum(['file', 'directory']),
					sizeBytes: z.number().optional(),
				}),
			),
			truncated: z.boolean(),
			totalCount: z.number(),
			denied: z.boolean().optional(),
			reason: z.string().optional(),
		}),
		suspendSchema: z.object({
			requestId: z.string(),
			message: z.string(),
			severity: instanceAiConfirmationSeveritySchema,
		}),
		resumeSchema: z.object({
			approved: z.boolean(),
		}),
		execute: async ({ dirPath, pattern, maxResults, type, recursive }, ctx) => {
			const { resumeData, suspend } = ctx?.agent ?? {};
			const needsApproval = context.permissions?.readFilesystem !== 'always_allow';

			if (needsApproval && (resumeData === undefined || resumeData === null)) {
				await suspend?.({
					requestId: nanoid(),
					message: `List files in "${dirPath}"?`,
					severity: 'info' as const,
				});
				return { files: [], truncated: false, totalCount: 0 };
			}

			if (resumeData !== undefined && resumeData !== null && !resumeData.approved) {
				return {
					files: [],
					truncated: false,
					totalCount: 0,
					denied: true,
					reason: 'User denied the action',
				};
			}

			if (!context.filesystemService) {
				throw new Error('No filesystem access available.');
			}
			const limit = maxResults ?? 200;
			const typeFilter = type ?? 'all';
			const isRecursive = recursive ?? true;
			// Fetch one extra to detect truncation without false positives
			const fetched = await context.filesystemService.listFiles(dirPath, {
				pattern: pattern ?? undefined,
				maxResults: limit + 1,
				type: typeFilter,
				recursive: isRecursive,
			});
			const truncated = fetched.length > limit;
			const files = truncated ? fetched.slice(0, limit) : fetched;

			return {
				files,
				truncated,
				totalCount: files.length,
			};
		},
	});
}
