import { createTool } from '@mastra/core/tools';
import { instanceAiConfirmationSeveritySchema } from '@n8n/api-types';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import type { InstanceAiContext } from '../../types';

export function createDeleteDataTableTool(context: InstanceAiContext) {
	return createTool({
		id: 'delete-data-table',
		description: 'Permanently delete a data table and all its rows. Irreversible.',
		inputSchema: z.object({
			dataTableId: z.string().describe('ID of the data table to delete'),
		}),
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
		resumeSchema: z.object({
			approved: z.boolean(),
		}),
		execute: async (input, ctx) => {
			const { resumeData, suspend } = ctx?.agent ?? {};

			// State 1: First call — suspend for confirmation
			if (resumeData === undefined || resumeData === null) {
				await suspend?.({
					requestId: nanoid(),
					message: `Delete data table "${input.dataTableId}"? This will permanently remove the table and all its data.`,
					severity: 'destructive' as const,
				});
				return { success: false };
			}

			// State 2: Denied
			if (!resumeData.approved) {
				return { success: false, denied: true, reason: 'User denied the action' };
			}

			// State 3: Approved — execute
			await context.dataTableService.delete(input.dataTableId);
			return { success: true };
		},
	});
}
