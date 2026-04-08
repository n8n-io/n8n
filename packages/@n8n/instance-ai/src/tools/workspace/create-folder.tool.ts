import { createTool } from '@mastra/core/tools';
import { instanceAiConfirmationSeveritySchema } from '@n8n/api-types';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import type { InstanceAiContext } from '../../types';

export const createFolderInputSchema = z.object({
	name: z.string().describe('Name for the new folder'),
	projectId: z.string().describe('ID of the project to create the folder in'),
	parentFolderId: z
		.string()
		.optional()
		.describe('ID of the parent folder for nesting. Omit for root-level folder.'),
});

export const createFolderResumeSchema = z.object({
	approved: z.boolean(),
});

export function createCreateFolderTool(context: InstanceAiContext) {
	return createTool({
		id: 'create-folder',
		description: 'Create a new folder in a project. Supports nesting via parentFolderId.',
		inputSchema: createFolderInputSchema,
		outputSchema: z.object({
			id: z.string(),
			name: z.string(),
			parentFolderId: z.string().nullable(),
			denied: z.boolean().optional(),
			reason: z.string().optional(),
		}),
		suspendSchema: z.object({
			requestId: z.string(),
			message: z.string(),
			severity: instanceAiConfirmationSeveritySchema,
		}),
		resumeSchema: createFolderResumeSchema,
		execute: async (input: z.infer<typeof createFolderInputSchema>, ctx) => {
			const resumeData = ctx?.agent?.resumeData as
				| z.infer<typeof createFolderResumeSchema>
				| undefined;
			const suspend = ctx?.agent?.suspend;

			if (context.permissions?.createFolder === 'blocked') {
				return {
					id: '',
					name: '',
					parentFolderId: null,
					denied: true,
					reason: 'Action blocked by admin',
				};
			}

			const needsApproval = context.permissions?.createFolder !== 'always_allow';

			// State 1: First call — suspend for confirmation (unless always_allow)
			if (needsApproval && (resumeData === undefined || resumeData === null)) {
				await suspend?.({
					requestId: nanoid(),
					message: `Create folder "${input.name}" in project "${input.projectId}"?`,
					severity: 'info' as const,
				});
				// suspend() never resolves — this line is unreachable but satisfies the type checker
				return { id: '', name: '', parentFolderId: null };
			}

			// State 2: Denied
			if (resumeData !== undefined && resumeData !== null && !resumeData.approved) {
				return {
					id: '',
					name: '',
					parentFolderId: null,
					denied: true,
					reason: 'User denied the action',
				};
			}

			// State 3: Approved or always_allow — execute
			return await context.workspaceService!.createFolder!(
				input.name,
				input.projectId,
				input.parentFolderId,
			);
		},
	});
}
