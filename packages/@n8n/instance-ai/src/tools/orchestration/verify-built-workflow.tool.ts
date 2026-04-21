/**
 * Verify Built Workflow Tool
 *
 * Runs a built workflow using sidecar verification pin data from the build outcome.
 * The verification pin data is never persisted to the workflow — it only exists
 * for this execution.
 */

import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import type { OrchestrationContext } from '../../types';

export const verifyBuiltWorkflowInputSchema = z.object({
	workItemId: z.string().describe('The work item ID from the build (wi_XXXXXXXX)'),
	workflowId: z.string().describe('The workflow ID to verify'),
	inputData: z.record(z.unknown()).optional().describe('Input data passed to the workflow trigger'),
	timeout: z
		.number()
		.int()
		.min(1000)
		.max(600_000)
		.optional()
		.describe('Max wait time in milliseconds (default 300000)'),
});

export function createVerifyBuiltWorkflowTool(context: OrchestrationContext) {
	return createTool({
		id: 'verify-built-workflow',
		description:
			'Run a built workflow that has mocked credentials, using sidecar verification pin data ' +
			'from the build outcome. Use this instead of run-workflow when the build had mocked credentials.',
		inputSchema: verifyBuiltWorkflowInputSchema,
		outputSchema: z.object({
			executionId: z.string().optional(),
			success: z.boolean(),
			status: z.enum(['running', 'success', 'error', 'waiting', 'unknown']).optional(),
			data: z.record(z.unknown()).optional(),
			error: z.string().optional(),
		}),
		execute: async (input: z.infer<typeof verifyBuiltWorkflowInputSchema>) => {
			if (!context.workflowTaskService || !context.domainContext) {
				return { success: false, error: 'Verification support not available.' };
			}

			const buildOutcome = await context.workflowTaskService.getBuildOutcome(input.workItemId);
			if (!buildOutcome) {
				return {
					success: false,
					error: `No build outcome found for work item ${input.workItemId}.`,
				};
			}

			const result = await context.domainContext.executionService.run(
				input.workflowId,
				input.inputData,
				{
					timeout: input.timeout,
					pinData: buildOutcome.verificationPinData as Record<string, unknown[]> | undefined,
				},
			);

			return {
				executionId: result.executionId || undefined,
				success: result.status === 'success',
				status: result.status,
				data: result.data,
				error: result.error,
			};
		},
	});
}
