import { createTool } from '@mastra/core/tools';
import { instanceAiConfirmationSeveritySchema } from '@n8n/api-types';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import type { InstanceAiContext } from '../../types';

export const deleteFolderInputSchema = z.object({
	folderId: z.string().describe('ID of the folder to delete'),
	folderName: z.string().optional().describe('Name of the folder (for confirmation message)'),
	projectId: z.string().describe('ID of the project the folder belongs to'),
	transferToFolderId: z
		.string()
		.optional()
		.describe(
			'ID of a folder to move contents into before deletion. If omitted, contents are flattened to project root and archived.',
		),
	transferToFolderName: z
		.string()
		.optional()
		.describe('Name of the transfer folder (for confirmation message)'),
});

export const deleteFolderResumeSchema = z.object({
	approved: z.boolean(),
});

export function createDeleteFolderTool(context: InstanceAiContext) {
	return createTool({
		id: 'delete-folder',
		description:
			'Delete a folder. Without transferToFolderId, contents are flattened to root and archived. With transferToFolderId, contents are moved first. Requires confirmation.',
		inputSchema: deleteFolderInputSchema,
		outputSchema: z.object({
			success: z.boolean(),
			denied: z.boolean().optional(),
			reason: z.string().optional(),
		}),
		suspendSchema: z.object({
			requestId: z.string(),
			message: z.string(),
			severity: instanceAiConfirmationSeveritySchema,
		}),
		resumeSchema: deleteFolderResumeSchema,
		execute: async (input: z.infer<typeof deleteFolderInputSchema>, ctx) => {
			const resumeData = ctx?.agent?.resumeData as
				| z.infer<typeof deleteFolderResumeSchema>
				| undefined;
			const suspend = ctx?.agent?.suspend;

			const needsApproval = context.permissions?.deleteFolder !== 'always_allow';

			// State 1: First call — suspend for confirmation (unless always_allow)
			if (needsApproval && (resumeData === undefined || resumeData === null)) {
				const transferNote = input.transferToFolderId
					? ` Contents will be moved to folder "${input.transferToFolderName ?? input.transferToFolderId}".`
					: ' Contents will be flattened to project root and archived.';
				await suspend?.({
					requestId: nanoid(),
					message: `Delete folder "${input.folderName ?? input.folderId}"?${transferNote}`,
					severity: 'destructive' as const,
				});
				// suspend() never resolves — this line is unreachable but satisfies the type checker
				return { success: false };
			}

			// State 2: Denied
			if (resumeData !== undefined && resumeData !== null && !resumeData.approved) {
				return { success: false, denied: true, reason: 'User denied the action' };
			}

			// State 3: Approved or always_allow — execute
			await context.workspaceService!.deleteFolder!(
				input.folderId,
				input.projectId,
				input.transferToFolderId,
			);
			return { success: true };
		},
	});
}
