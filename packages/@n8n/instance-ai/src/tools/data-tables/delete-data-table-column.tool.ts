import { createTool } from '@mastra/core/tools';
import { instanceAiConfirmationSeveritySchema } from '@n8n/api-types';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import type { InstanceAiContext } from '../../types';

export const deleteDataTableColumnInputSchema = z.object({
	dataTableId: z.string().describe('ID of the data table'),
	columnId: z.string().describe('ID of the column to delete'),
});

export const deleteDataTableColumnResumeSchema = z.object({
	approved: z.boolean(),
});

export function createDeleteDataTableColumnTool(context: InstanceAiContext) {
	return createTool({
		id: 'delete-data-table-column',
		description: 'Remove a column from a data table. All data in the column will be lost.',
		inputSchema: deleteDataTableColumnInputSchema,
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
		resumeSchema: deleteDataTableColumnResumeSchema,
		execute: async (input: z.infer<typeof deleteDataTableColumnInputSchema>, ctx) => {
			const resumeData = ctx?.agent?.resumeData as
				| z.infer<typeof deleteDataTableColumnResumeSchema>
				| undefined;
			const suspend = ctx?.agent?.suspend;

			const needsApproval = context.permissions?.mutateDataTableSchema !== 'always_allow';

			// State 1: First call — suspend for confirmation (unless always_allow)
			if (needsApproval && (resumeData === undefined || resumeData === null)) {
				await suspend?.({
					requestId: nanoid(),
					message: `Delete column "${input.columnId}" from data table "${input.dataTableId}"? All data in this column will be permanently lost.`,
					severity: 'destructive' as const,
				});
				return { success: false };
			}

			// State 2: Denied
			if (resumeData !== undefined && resumeData !== null && !resumeData.approved) {
				return { success: false, denied: true, reason: 'User denied the action' };
			}

			// State 3: Approved or always_allow — execute
			await context.dataTableService.deleteColumn(input.dataTableId, input.columnId);
			return { success: true };
		},
	});
}
