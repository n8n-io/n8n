import { createTool } from '@mastra/core/tools';
import { instanceAiConfirmationSeveritySchema } from '@n8n/api-types';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import type { InstanceAiContext } from '../../types';

const filterSchema = z.object({
	type: z.enum(['and', 'or']).describe('Combine filters with AND or OR'),
	filters: z.array(
		z.object({
			columnName: z.string(),
			condition: z.enum(['eq', 'neq', 'like', 'gt', 'gte', 'lt', 'lte']),
			value: z.union([z.string(), z.number(), z.boolean()]).nullable(),
		}),
	),
});

export const updateDataTableRowsInputSchema = z.object({
	dataTableId: z.string().describe('ID of the data table'),
	filter: filterSchema.describe('Which rows to update'),
	data: z.record(z.unknown()).describe('Column values to set on matching rows'),
});

export const updateDataTableRowsResumeSchema = z.object({
	approved: z.boolean(),
});

export function createUpdateDataTableRowsTool(context: InstanceAiContext) {
	return createTool({
		id: 'update-data-table-rows',
		description:
			'Update rows matching a filter in a data table. ' +
			'All matching rows receive the same new values.',
		inputSchema: updateDataTableRowsInputSchema,
		outputSchema: z.object({
			updatedCount: z.number().optional(),
			denied: z.boolean().optional(),
			reason: z.string().optional(),
		}),
		suspendSchema: z.object({
			requestId: z.string(),
			message: z.string(),
			severity: instanceAiConfirmationSeveritySchema,
		}),
		resumeSchema: updateDataTableRowsResumeSchema,
		execute: async (input: z.infer<typeof updateDataTableRowsInputSchema>, ctx) => {
			const resumeData = ctx?.agent?.resumeData as
				| z.infer<typeof updateDataTableRowsResumeSchema>
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
					message: `Update rows in data table "${input.dataTableId}"?`,
					severity: 'warning' as const,
				});
				return {};
			}

			// State 2: Denied
			if (resumeData !== undefined && resumeData !== null && !resumeData.approved) {
				return { denied: true, reason: 'User denied the action' };
			}

			// State 3: Approved or always_allow — execute
			return await context.dataTableService.updateRows(input.dataTableId, input.filter, input.data);
		},
	});
}
