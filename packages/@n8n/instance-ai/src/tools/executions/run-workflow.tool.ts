import { createTool } from '@mastra/core/tools';
import { instanceAiConfirmationSeveritySchema } from '@n8n/api-types';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import type { InstanceAiContext } from '../../types';

const MAX_TIMEOUT_MS = 600_000;

export function createRunWorkflowTool(context: InstanceAiContext) {
	return createTool({
		id: 'run-workflow',
		description:
			'Execute a workflow, wait for completion (with timeout), and return the full result including output data and any errors. For webhook triggers, pass only the parsed request body as inputData, not an envelope like { body: ... }, because the tool constructs the webhook shape automatically. Default timeout is 5 minutes.',
		inputSchema: z.object({
			workflowId: z.string().describe('ID of the workflow to execute'),
			inputData: z
				.record(z.unknown())
				.optional()
				.describe(
					'Input data passed to the workflow trigger. For webhook triggers, pass only the parsed request body, not an envelope like { body: ... }.',
				),
			timeout: z
				.number()
				.int()
				.min(1000)
				.max(MAX_TIMEOUT_MS)
				.optional()
				.describe('Max wait time in milliseconds (default 300000, max 600000)'),
		}),
		outputSchema: z.object({
			executionId: z.string(),
			status: z.enum(['running', 'success', 'error', 'waiting']),
			data: z.record(z.unknown()).optional(),
			error: z.string().optional(),
			startedAt: z.string().optional(),
			finishedAt: z.string().optional(),
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

			const needsApproval = context.permissions?.runWorkflow !== 'always_allow';

			// If approval is required and this is the first call, suspend for confirmation
			if (needsApproval && (resumeData === undefined || resumeData === null)) {
				await suspend?.({
					requestId: nanoid(),
					message: `Execute workflow "${input.workflowId}"?`,
					severity: 'warning' as const,
				});
				return {
					executionId: '',
					status: 'error' as const,
					denied: true,
					reason: 'Awaiting confirmation',
				};
			}

			// If resumed with denial
			if (resumeData !== undefined && resumeData !== null && !resumeData.approved) {
				return {
					executionId: '',
					status: 'error' as const,
					denied: true,
					reason: 'User denied the action',
				};
			}

			// Approved or always_allow — execute
			return await context.executionService.run(input.workflowId, input.inputData, {
				timeout: input.timeout,
			});
		},
	});
}
