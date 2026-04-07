import { createTool } from '@mastra/core/tools';
import { instanceAiConfirmationSeveritySchema } from '@n8n/api-types';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import type { InstanceAiContext } from '../../types';

export const renameDataTableColumnInputSchema = z.object({
	dataTableId: z.string().describe('ID of the data table'),
	columnId: z.string().describe('ID of the column to rename'),
	newName: z.string().describe('New column name'),
});

export const renameDataTableColumnResumeSchema = z.object({
	approved: z.boolean(),
});

export function createRenameDataTableColumnTool(context: InstanceAiContext) {
	return createTool({
		id: 'rename-data-table-column',
		description: 'Rename a column in a data table.',
		inputSchema: renameDataTableColumnInputSchema,
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
		resumeSchema: renameDataTableColumnResumeSchema,
		execute: async (input: z.infer<typeof renameDataTableColumnInputSchema>, ctx) => {
			const resumeData = ctx?.agent?.resumeData as
				| z.infer<typeof renameDataTableColumnResumeSchema>
				| undefined;
			const suspend = ctx?.agent?.suspend;

			if (context.permissions?.mutateDataTableSchema === 'blocked') {
				return { success: false, denied: true, reason: 'Action blocked by admin' };
			}

			const needsApproval = context.permissions?.mutateDataTableSchema !== 'always_allow';

			// State 1: First call — suspend for confirmation (unless always_allow)
			if (needsApproval && (resumeData === undefined || resumeData === null)) {
				await suspend?.({
					requestId: nanoid(),
					message: `Rename column "${input.columnId}" to "${input.newName}" in data table "${input.dataTableId}"?`,
					severity: 'warning' as const,
				});
				return { success: false };
			}

			// State 2: Denied
			if (resumeData !== undefined && resumeData !== null && !resumeData.approved) {
				return { success: false, denied: true, reason: 'User denied the action' };
			}

			// State 3: Approved or always_allow — execute
			await context.dataTableService.renameColumn(input.dataTableId, input.columnId, input.newName);
			return { success: true };
		},
	});
}
