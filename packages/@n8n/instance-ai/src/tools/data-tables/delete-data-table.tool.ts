import { createTool } from '@mastra/core/tools';
import { instanceAiConfirmationSeveritySchema } from '@n8n/api-types';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import type { InstanceAiContext } from '../../types';

export const deleteDataTableInputSchema = z.object({
	dataTableId: z.string().describe('ID of the data table to delete'),
});

export const deleteDataTableResumeSchema = z.object({
	approved: z.boolean(),
});

export function createDeleteDataTableTool(context: InstanceAiContext) {
	return createTool({
		id: 'delete-data-table',
		description: 'Permanently delete a data table and all its rows. Irreversible.',
		inputSchema: deleteDataTableInputSchema,
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
		resumeSchema: deleteDataTableResumeSchema,
		execute: async (input: z.infer<typeof deleteDataTableInputSchema>, ctx) => {
			const resumeData = ctx?.agent?.resumeData as
				| z.infer<typeof deleteDataTableResumeSchema>
				| undefined;
			const suspend = ctx?.agent?.suspend;

			if (context.permissions?.deleteDataTable === 'blocked') {
				return { success: false, denied: true, reason: 'Action blocked by admin' };
			}

			const needsApproval = context.permissions?.deleteDataTable !== 'always_allow';

			// State 1: First call — suspend for confirmation (unless always_allow)
			if (needsApproval && (resumeData === undefined || resumeData === null)) {
				await suspend?.({
					requestId: nanoid(),
					message: `Delete data table "${input.dataTableId}"? This will permanently remove the table and all its data.`,
					severity: 'destructive' as const,
				});
				return { success: false };
			}

			// State 2: Denied
			if (resumeData !== undefined && resumeData !== null && !resumeData.approved) {
				return { success: false, denied: true, reason: 'User denied the action' };
			}

			// State 3: Approved — execute
			await context.dataTableService.delete(input.dataTableId);
			return { success: true };
		},
	});
}
