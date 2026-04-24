/**
 * complete-checkpoint tool — called by the orchestrator to settle a planned-task
 * checkpoint.
 *
 * The service enqueues an internal follow-up run carrying a checkpoint's spec.
 * The orchestrator executes the spec using its normal tools (verify-built-workflow,
 * executions(action="run"), etc.) and then MUST call this tool exactly once to
 * report the outcome. The service's post-run deadlock fallback guarantees
 * progress even if the orchestrator forgets.
 */

import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import type { OrchestrationContext } from '../../types';

const inputSchema = z.object({
	taskId: z.string().describe('The checkpoint task ID from the <planned-task-follow-up> payload'),
	status: z
		.enum(['succeeded', 'failed'])
		.describe('Whether the verification passed (succeeded) or failed (failed)'),
	result: z
		.string()
		.optional()
		.describe('Short user-visible note describing the verification outcome'),
	error: z.string().optional().describe('Error message when status=failed'),
	outcome: z
		.record(z.unknown())
		.optional()
		.describe('Structured outcome payload (e.g., executionId, failureNode, data excerpt)'),
});

const outputSchema = z.object({
	result: z.string(),
	ok: z.boolean(),
});

export function createCompleteCheckpointTool(context: OrchestrationContext) {
	return createTool({
		id: 'complete-checkpoint',
		description:
			'Report the outcome of a planned-task checkpoint you just executed. ' +
			'Call this exactly once per <planned-task-follow-up type="checkpoint"> block. ' +
			'Only valid for tasks of kind "checkpoint" that are currently running; ' +
			'calling with any other taskId returns an error and does not modify the graph.',
		inputSchema,
		outputSchema,
		execute: async (input: z.infer<typeof inputSchema>) => {
			if (!context.plannedTaskService) {
				return { ok: false, result: 'Error: planned task service not available.' };
			}

			const settleResult =
				input.status === 'succeeded'
					? await context.plannedTaskService.markCheckpointSucceeded(
							context.threadId,
							input.taskId,
							{
								result: input.result,
								outcome: input.outcome,
							},
						)
					: await context.plannedTaskService.markCheckpointFailed(context.threadId, input.taskId, {
							error: input.error ?? input.result ?? 'Checkpoint verification failed',
							// Preserve structured outcome (executionId, failureNode, data excerpt).
							// Without this, replans only see a flat error string and lose execution
							// context that would otherwise seed a targeted retry.
							outcome: input.outcome,
						});

			if (settleResult.ok) {
				return {
					ok: true,
					result: `Checkpoint ${input.taskId} marked ${input.status}.`,
				};
			}

			const reason = settleResult.reason;
			if (reason === 'not-found') {
				return {
					ok: false,
					result: `Error: no task with id "${input.taskId}" exists in the current plan.`,
				};
			}
			if (reason === 'wrong-kind') {
				return {
					ok: false,
					result:
						`Error: task "${input.taskId}" is not a checkpoint ` +
						`(actual kind: ${settleResult.actual?.kind ?? 'unknown'}). ` +
						'complete-checkpoint can only settle checkpoint tasks.',
				};
			}
			return {
				ok: false,
				result:
					`Error: checkpoint "${input.taskId}" is not in running state ` +
					`(actual status: ${settleResult.actual?.status ?? 'unknown'}).`,
			};
		},
	});
}
