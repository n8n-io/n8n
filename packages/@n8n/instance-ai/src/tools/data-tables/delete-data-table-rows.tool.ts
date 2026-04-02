import { createTool } from '@mastra/core/tools';
import { instanceAiConfirmationSeveritySchema } from '@n8n/api-types';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import type { InstanceAiContext } from '../../types';

const filterSchema = z.object({
	type: z.enum(['and', 'or']).describe('Combine filters with AND or OR'),
	filters: z
		.array(
			z.object({
				columnName: z.string(),
				condition: z.enum(['eq', 'neq', 'like', 'gt', 'gte', 'lt', 'lte']),
				value: z.union([z.string(), z.number(), z.boolean()]).nullable(),
			}),
		)
		.min(1),
});

export function createDeleteDataTableRowsTool(context: InstanceAiContext) {
	return createTool({
		id: 'delete-data-table-rows',
		description:
			'Delete rows matching a filter from a data table. Irreversible. ' +
			'Filter is required to prevent accidental deletion of all data.',
		inputSchema: z.object({
			dataTableId: z.string().describe('ID of the data table'),
			filter: filterSchema.describe('Which rows to delete (required)'),
		}),
		outputSchema: z.object({
			success: z.boolean(),
			deletedCount: z.number().optional(),
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
		execute: async (input, ctx) => {
			const { resumeData, suspend } = ctx?.agent ?? {};

			const needsApproval = context.permissions?.mutateDataTableRows !== 'always_allow';

			// State 1: First call — suspend for confirmation (unless always_allow)
			if (needsApproval && (resumeData === undefined || resumeData === null)) {
				const filterDesc = input.filter.filters
					.map((f) => `${f.columnName} ${f.condition} ${String(f.value)}`)
					.join(` ${input.filter.type} `);
				await suspend?.({
					requestId: nanoid(),
					message: `Delete rows where ${filterDesc}? This cannot be undone.`,
					severity: 'destructive' as const,
				});
				return { success: false };
			}

			// State 2: Denied
			if (resumeData !== undefined && resumeData !== null && !resumeData.approved) {
				return { success: false, denied: true, reason: 'User denied the action' };
			}

			// State 3: Approved or always_allow — execute
			const result = await context.dataTableService.deleteRows(input.dataTableId, input.filter);
			return { success: true, deletedCount: result.deletedCount };
		},
	});
}
