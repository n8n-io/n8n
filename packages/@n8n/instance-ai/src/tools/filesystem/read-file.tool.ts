import { createTool } from '@mastra/core/tools';
import { instanceAiConfirmationSeveritySchema } from '@n8n/api-types';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import type { InstanceAiContext } from '../../types';
import { wrapUntrustedData } from '../web-research/sanitize-web-content';

export const readFileInputSchema = z.object({
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
});

export const readFileResumeSchema = z.object({
	approved: z.boolean(),
});

export function createReadFileTool(context: InstanceAiContext) {
	return createTool({
		id: 'read-file',
		description:
			'Read the contents of a file. Returns the text content with optional line range. Use after list-files or search-files to read specific files. Always use absolute paths or ~/relative paths.',
		inputSchema: readFileInputSchema,
		outputSchema: z.object({
			path: z.string(),
			content: z.string(),
			truncated: z.boolean(),
			totalLines: z.number(),
			denied: z.boolean().optional(),
			reason: z.string().optional(),
		}),
		suspendSchema: z.object({
			requestId: z.string(),
			message: z.string(),
			severity: instanceAiConfirmationSeveritySchema,
		}),
		resumeSchema: readFileResumeSchema,
		execute: async (
			{ filePath, startLine, maxLines }: z.infer<typeof readFileInputSchema>,
			ctx,
		) => {
			const resumeData = ctx?.agent?.resumeData as z.infer<typeof readFileResumeSchema> | undefined;
			const suspend = ctx?.agent?.suspend;
			if (context.permissions?.readFilesystem === 'blocked') {
				return {
					path: '',
					content: '',
					truncated: false,
					totalLines: 0,
					denied: true,
					reason: 'Action blocked by admin',
				};
			}

			const needsApproval = context.permissions?.readFilesystem !== 'always_allow';

			if (needsApproval && (resumeData === undefined || resumeData === null)) {
				await suspend?.({
					requestId: nanoid(),
					message: `Read file "${filePath}"?`,
					severity: 'info' as const,
				});
				return { path: '', content: '', truncated: false, totalLines: 0 };
			}

			if (resumeData !== undefined && resumeData !== null && !resumeData.approved) {
				return {
					path: '',
					content: '',
					truncated: false,
					totalLines: 0,
					denied: true,
					reason: 'User denied the action',
				};
			}

			if (!context.filesystemService) {
				throw new Error('No filesystem access available.');
			}
			const result = await context.filesystemService.readFile(filePath, {
				startLine: startLine ?? undefined,
				maxLines: maxLines ?? undefined,
			});
			return {
				...result,
				content: wrapUntrustedData(result.content, 'file', filePath),
			};
		},
	});
}
