import { createTool } from '@mastra/core/tools';
import { instanceAiConfirmationSeveritySchema } from '@n8n/api-types';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import type { InstanceAiContext } from '../../types';

export const insertDataTableRowsInputSchema = z.object({
	dataTableId: z.string().describe('ID of the data table'),
	rows: z
		.array(z.record(z.unknown()))
		.min(1)
		.max(100)
		.describe('Array of row objects (column name → value)'),
});

export const insertDataTableRowsResumeSchema = z.object({
	approved: z.boolean(),
});

export function createInsertDataTableRowsTool(context: InstanceAiContext) {
	return createTool({
		id: 'insert-data-table-rows',
		description:
			'Insert rows into a data table. Max 100 rows per call. ' +
			'Each row is an object mapping column names to values.',
		inputSchema: insertDataTableRowsInputSchema,
		outputSchema: z.object({
			insertedCount: z.number().optional(),
			denied: z.boolean().optional(),
			reason: z.string().optional(),
		}),
		suspendSchema: z.object({
			requestId: z.string(),
			message: z.string(),
			severity: instanceAiConfirmationSeveritySchema,
		}),
		resumeSchema: insertDataTableRowsResumeSchema,
		execute: async (input: z.infer<typeof insertDataTableRowsInputSchema>, ctx) => {
			const resumeData = ctx?.agent?.resumeData as
				| z.infer<typeof insertDataTableRowsResumeSchema>
				| undefined;
			const suspend = ctx?.agent?.suspend;

			if (context.permissions?.mutateDataTableRows === 'blocked') {
				return { denied: true, reason: 'Action blocked by admin' };
			}

			const needsApproval = context.permissions?.mutateDataTableRows !== 'always_allow';

			// State 1: First call — suspend for confirmation (unless always_allow)
			if (needsApproval && (resumeData === undefined || resumeData === null)) {
				await suspend?.({
					requestId: nanoid(),
					message: `Insert ${input.rows.length} row(s) into data table "${input.dataTableId}"?`,
					severity: 'warning' as const,
				});
				return {};
			}

			// State 2: Denied
			if (resumeData !== undefined && resumeData !== null && !resumeData.approved) {
				return { denied: true, reason: 'User denied the action' };
			}

			// State 3: Approved or always_allow — execute
			return await context.dataTableService.insertRows(input.dataTableId, input.rows);
		},
	});
}
