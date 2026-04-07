import { createTool } from '@mastra/core/tools';
import { instanceAiConfirmationSeveritySchema } from '@n8n/api-types';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import type { InstanceAiContext } from '../../types';

const MAX_TIMEOUT_MS = 600_000;

export const runWorkflowInputSchema = z.object({
	workflowId: z.string().describe('ID of the workflow to execute'),
	workflowName: z.string().optional().describe('Name of the workflow (for confirmation message)'),
	inputData: z
		.record(z.unknown())
		.optional()
		.describe(
			'Input data passed to the workflow trigger. ' +
				'For webhook-triggered workflows, inputData IS the request body — ' +
				'do NOT wrap it in { body: ... }. ' +
				'Example: to send { title: "Hello" } as POST body, pass inputData: { title: "Hello" }.',
		),
	timeout: z
		.number()
		.int()
		.min(1000)
		.max(MAX_TIMEOUT_MS)
		.optional()
		.describe('Max wait time in milliseconds (default 300000, max 600000)'),
});

export const runWorkflowResumeSchema = z.object({
	approved: z.boolean(),
});

export function createRunWorkflowTool(context: InstanceAiContext) {
	return createTool({
		id: 'run-workflow',
		description:
			'Execute a workflow, wait for completion (with timeout), and return the full result including output data and any errors. Default timeout is 5 minutes.',
		inputSchema: runWorkflowInputSchema,
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
		resumeSchema: runWorkflowResumeSchema,
		execute: async (input: z.infer<typeof runWorkflowInputSchema>, ctx) => {
			const resumeData = ctx?.agent?.resumeData as
				| z.infer<typeof runWorkflowResumeSchema>
				| undefined;
			const suspend = ctx?.agent?.suspend;

			if (context.permissions?.runWorkflow === 'blocked') {
				return {
					executionId: '',
					status: 'error' as const,
					denied: true,
					reason: 'Action blocked by admin',
				};
			}

			const needsApproval = context.permissions?.runWorkflow !== 'always_allow';

			// If approval is required and this is the first call, suspend for confirmation
			if (needsApproval && (resumeData === undefined || resumeData === null)) {
				await suspend?.({
					requestId: nanoid(),
					message: `Execute workflow "${input.workflowName ?? input.workflowId}" (ID: ${input.workflowId})?`,
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
