/**
 * Verify Built Workflow Tool
 *
 * Runs a built workflow using sidecar verification pin data from the build outcome.
 * The verification pin data is never persisted to the workflow — it only exists
 * for this execution.
 *
 * When useLlmMockExecution is true, uses LLM-mocked HTTP execution with an
 * automated judge instead of standard execution. This generates realistic API
 * responses via LLM interception and evaluates the result against success criteria.
 * Mock data can be persisted as pin data for instant re-runs.
 */

import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import type { OrchestrationContext } from '../../types';

export const verifyBuiltWorkflowInputSchema = z.object({
	workItemId: z
		.string()
		.optional()
		.describe(
			'The work item ID from the build (wi_XXXXXXXX). Required for standard execution, not needed for useLlmMockExecution.',
		),
	workflowId: z.string().describe('The workflow ID to verify'),
	inputData: z.record(z.unknown()).optional().describe('Input data passed to the workflow trigger'),
	timeout: z
		.number()
		.int()
		.min(1000)
		.max(600_000)
		.optional()
		.describe('Max wait time in milliseconds (default 300000)'),
	useLlmMockExecution: z
		.boolean()
		.optional()
		.describe(
			'When true, use LLM mock HTTP execution with automated judge instead of standard execution. ' +
				'Generates realistic API responses via LLM interception and evaluates against successCriteria.',
		),
	successCriteria: z
		.string()
		.optional()
		.describe(
			'Success criteria for the automated judge to evaluate against. ' +
				'Only used when useLlmMockExecution is true. ' +
				'Describe what the workflow should accomplish (e.g. "sends a Slack message with the user name").',
		),
	persistMockData: z
		.boolean()
		.optional()
		.describe(
			'When true and useLlmMockExecution is true, persist mocked node outputs as pin data ' +
				'on the workflow for instant re-runs without LLM calls.',
		),
});

export const verifyBuiltWorkflowOutputSchema = z.object({
	executionId: z.string().optional(),
	success: z.boolean(),
	status: z.enum(['running', 'success', 'error', 'waiting', 'unknown']).optional(),
	data: z.record(z.unknown()).optional(),
	error: z.string().optional(),
	/** Judge verdict — present when useLlmMockExecution + successCriteria were provided */
	verdict: z
		.object({
			pass: z.boolean(),
			reasoning: z.string(),
			failureCategory: z.string().optional(),
			rootCause: z.string().optional(),
		})
		.optional(),
	/** Whether mock data was persisted as pin data */
	pinDataPersisted: z.boolean().optional(),
});

export function createVerifyBuiltWorkflowTool(context: OrchestrationContext) {
	return createTool({
		id: 'verify-built-workflow',
		description:
			'Run a built workflow that has mocked credentials, using sidecar verification pin data ' +
			'from the build outcome. Use this instead of run-workflow when the build had mocked credentials. ' +
			'Set useLlmMockExecution=true with successCriteria for automated evaluation with LLM-generated mock HTTP responses.',
		inputSchema: verifyBuiltWorkflowInputSchema,
		outputSchema: verifyBuiltWorkflowOutputSchema,
		execute: async (input: z.infer<typeof verifyBuiltWorkflowInputSchema>) => {
			if (!context.workflowTaskService || !context.domainContext) {
				return { success: false, error: 'Verification support not available.' };
			}

			// ── LLM mock execution path ─────────────────────────────────────
			if (input.useLlmMockExecution) {
				const evalFn = context.domainContext.executionService.executeAndEvaluate;
				if (!evalFn) {
					return { success: false, error: 'LLM mock execution not available on this instance.' };
				}

				const evalResult = await evalFn(input.workflowId, {
					successCriteria: input.successCriteria,
					persistMockData: input.persistMockData,
				});

				return {
					executionId: evalResult.execution.executionId,
					success: evalResult.execution.success && (evalResult.verification?.pass ?? true),
					status: evalResult.execution.success ? ('success' as const) : ('error' as const),
					data: evalResult.execution.nodeResults as Record<string, unknown>,
					error:
						evalResult.execution.errors.length > 0
							? evalResult.execution.errors.join('; ')
							: undefined,
					verdict: evalResult.verification
						? {
								pass: evalResult.verification.pass,
								reasoning: evalResult.verification.reasoning,
								failureCategory: evalResult.verification.failureCategory,
								rootCause: evalResult.verification.rootCause,
							}
						: undefined,
					pinDataPersisted: evalResult.pinDataPersisted,
				};
			}

			// ── Standard execution path (existing behavior) ─────────────────
			if (!input.workItemId) {
				return {
					success: false,
					error:
						'workItemId is required for standard execution. Use useLlmMockExecution=true to verify without a work item.',
				};
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
