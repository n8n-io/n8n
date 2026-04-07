import { createTool } from '@mastra/core/tools';
import { instanceAiConfirmationSeveritySchema } from '@n8n/api-types';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import type { InstanceAiContext } from '../../types';

export function createCleanupTestExecutionsTool(context: InstanceAiContext) {
	return createTool({
		id: 'cleanup-test-executions',
		description:
			'Delete manual/test execution records for a workflow. Defaults to executions older than 1 hour. Requires confirmation.',
		inputSchema: z.object({
			workflowId: z.string().describe('ID of the workflow whose test executions to clean up'),
			workflowName: z
				.string()
				.optional()
				.describe('Name of the workflow (for confirmation message)'),
			olderThanHours: z
				.number()
				.optional()
				.describe('Only delete executions older than this many hours. Defaults to 1.'),
		}),
		outputSchema: z.object({
			deletedCount: z.number(),
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

			const needsApproval = context.permissions?.cleanupTestExecutions !== 'always_allow';

			// State 1: First call — suspend for confirmation (unless always_allow)
			if (needsApproval && (resumeData === undefined || resumeData === null)) {
				const hours = input.olderThanHours ?? 1;
				await suspend?.({
					requestId: nanoid(),
					message: `Delete test executions for workflow "${input.workflowName ?? input.workflowId}" older than ${hours} hour(s)?`,
					severity: 'warning' as const,
				});
				return { deletedCount: 0 };
			}

			// State 2: Denied
			if (resumeData !== undefined && resumeData !== null && !resumeData.approved) {
				return { deletedCount: 0, denied: true, reason: 'User denied the action' };
			}

			// State 3: Approved or always_allow — execute
			const result = await context.workspaceService!.cleanupTestExecutions(input.workflowId, {
				olderThanHours: input.olderThanHours,
			});
			return { deletedCount: result.deletedCount };
		},
	});
}
