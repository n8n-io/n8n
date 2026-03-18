import { createTool } from '@mastra/core/tools';
import { instanceAiConfirmationSeveritySchema } from '@n8n/api-types';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import type { InstanceAiContext } from '../../types';

const columnTypeSchema = z.enum(['string', 'number', 'boolean', 'date']);

export function createCreateDataTableTool(context: InstanceAiContext) {
	return createTool({
		id: 'create-data-table',
		description:
			'Create a new data table with typed columns. ' +
			'Column names must be alphanumeric with underscores, no leading numbers.',
		inputSchema: z.object({
			name: z.string().min(1).max(128).describe('Table name'),
			columns: z
				.array(
					z.object({
						name: z.string().describe('Column name (alphanumeric + underscores)'),
						type: columnTypeSchema.describe('Column data type'),
					}),
				)
				.min(1)
				.describe('Column definitions'),
		}),
		outputSchema: z.object({
			table: z
				.object({
					id: z.string(),
					name: z.string(),
					projectId: z.string(),
					columns: z.array(z.object({ id: z.string(), name: z.string(), type: z.string() })),
					createdAt: z.string(),
					updatedAt: z.string(),
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
		resumeSchema: z.object({
			approved: z.boolean(),
		}),
		execute: async (input, ctx) => {
			const { resumeData, suspend } = ctx?.agent ?? {};

			const needsApproval = context.permissions?.createDataTable !== 'always_allow';

			// State 1: First call — suspend for confirmation (unless always_allow)
			if (needsApproval && (resumeData === undefined || resumeData === null)) {
				await suspend?.({
					requestId: nanoid(),
					message: `Create data table "${input.name}"?`,
					severity: 'info' as const,
				});
				return {};
			}

			// State 2: Denied
			if (resumeData !== undefined && resumeData !== null && !resumeData.approved) {
				return { denied: true, reason: 'User denied the action' };
			}

			// State 3: Approved or always_allow — execute
			const table = await context.dataTableService.create(input.name, input.columns);
			return { table };
		},
	});
}
