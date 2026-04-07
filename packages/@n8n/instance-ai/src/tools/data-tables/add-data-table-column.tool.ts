import { createTool } from '@mastra/core/tools';
import { instanceAiConfirmationSeveritySchema } from '@n8n/api-types';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import type { InstanceAiContext } from '../../types';

const columnTypeSchema = z.enum(['string', 'number', 'boolean', 'date']);

export const addDataTableColumnInputSchema = z.object({
	dataTableId: z.string().describe('ID of the data table'),
	name: z.string().describe('Column name (alphanumeric + underscores)'),
	type: columnTypeSchema.describe('Column data type'),
});

export const addDataTableColumnResumeSchema = z.object({
	approved: z.boolean(),
});

export function createAddDataTableColumnTool(context: InstanceAiContext) {
	return createTool({
		id: 'add-data-table-column',
		description: 'Add a new column to an existing data table.',
		inputSchema: addDataTableColumnInputSchema,
		outputSchema: z.object({
			column: z
				.object({
					id: z.string(),
					name: z.string(),
					type: z.string(),
					index: z.number(),
				})
				.optional(),
			denied: z.boolean().optional(),
			reason: z.string().optional(),
		}),
		suspendSchema: z.object({
			requestId: z.string(),
			message: z.string(),
			severity: instanceAiConfirmationSeveritySchema,
		}),
		resumeSchema: addDataTableColumnResumeSchema,
		execute: async (input: z.infer<typeof addDataTableColumnInputSchema>, ctx) => {
			const resumeData = ctx?.agent?.resumeData as
				| z.infer<typeof addDataTableColumnResumeSchema>
				| undefined;
			const suspend = ctx?.agent?.suspend;

			const needsApproval = context.permissions?.mutateDataTableSchema !== 'always_allow';

			// State 1: First call — suspend for confirmation (unless always_allow)
			if (needsApproval && (resumeData === undefined || resumeData === null)) {
				await suspend?.({
					requestId: nanoid(),
					message: `Add column "${input.name}" (${input.type}) to data table "${input.dataTableId}"?`,
					severity: 'warning' as const,
				});
				return {};
			}

			// State 2: Denied
			if (resumeData !== undefined && resumeData !== null && !resumeData.approved) {
				return { denied: true, reason: 'User denied the action' };
			}

			// State 3: Approved or always_allow — execute
			const column = await context.dataTableService.addColumn(input.dataTableId, {
				name: input.name,
				type: input.type,
			});
			return { column };
		},
	});
}
