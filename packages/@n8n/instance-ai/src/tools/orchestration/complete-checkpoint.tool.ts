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

import { Tool } from '@n8n/agents';
import { isRecord } from '@n8n/utils/is-record';
import { z } from 'zod';

import type { OrchestrationContext } from '../../types';
import { analyzeWorkflow } from '../workflows/setup-workflow.service';

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

function requiresWorkflowSetup(outcome: Record<string, unknown> | undefined): boolean {
	const setupRequirement = outcome?.setupRequirement;
	return isRecord(setupRequirement) && setupRequirement.status === 'required';
}

function getWorkflowId(outcome: Record<string, unknown> | undefined): string | undefined {
	const workflowId = outcome?.workflowId;
	return typeof workflowId === 'string' && workflowId.length > 0 ? workflowId : undefined;
}

async function rejectIfSetupStillRequired(
	context: OrchestrationContext,
	checkpointTaskId: string,
): Promise<{ ok: true } | { ok: false; result: string }> {
	const graph = await context.plannedTaskService?.getGraph(context.threadId);
	if (!graph) return { ok: true };

	const checkpoint = graph.tasks.find((task) => task.id === checkpointTaskId);
	if (!checkpoint || checkpoint.kind !== 'checkpoint') return { ok: true };
	if (checkpoint.status !== 'running') return { ok: true };

	const dependentWorkflowIds = graph.tasks
		.filter((task) => checkpoint.deps.includes(task.id))
		.filter((task) => task.kind === 'build-workflow' && requiresWorkflowSetup(task.outcome))
		.map((task) => getWorkflowId(task.outcome))
		.filter((workflowId): workflowId is string => workflowId !== undefined);

	if (dependentWorkflowIds.length === 0) return { ok: true };

	const domainContext = context.domainContext;
	if (!domainContext) {
		return {
			ok: false,
			result:
				'Error: checkpoint cannot be completed yet because workflow setup is still required, ' +
				'but the workflow context is unavailable. Call workflows(action="setup") before complete-checkpoint.',
		};
	}

	for (const workflowId of dependentWorkflowIds) {
		try {
			const setupRequests = await analyzeWorkflow(domainContext, workflowId);
			const pendingRequests = setupRequests.filter((request) => request.needsAction);
			if (pendingRequests.length > 0) {
				const nodeNames = pendingRequests
					.map((request) => request.node.name)
					.filter((name): name is string => typeof name === 'string' && name.length > 0);
				const suffix = nodeNames.length > 0 ? ` Pending setup nodes: ${nodeNames.join(', ')}.` : '';
				return {
					ok: false,
					result:
						`Error: workflow setup is still required for workflow "${workflowId}". ` +
						`Call workflows(action="setup", workflowId="${workflowId}") before complete-checkpoint.` +
						suffix,
				};
			}
		} catch (error) {
			return {
				ok: false,
				result:
					`Error: workflow setup could not be checked for workflow "${workflowId}": ` +
					`${error instanceof Error ? error.message : String(error)}. ` +
					`Call workflows(action="setup", workflowId="${workflowId}") before complete-checkpoint.`,
			};
		}
	}

	return { ok: true };
}

export function createCompleteCheckpointTool(context: OrchestrationContext) {
	return new Tool('complete-checkpoint')
		.description(
			'Report the outcome of a planned-task checkpoint you just executed. Only call in checkpoint follow-up turns. ' +
				'Call this exactly once per <planned-task-follow-up type="checkpoint"> block. ' +
				'Only valid for tasks of kind "checkpoint" that are currently running; ' +
				'calling with any other taskId returns an error and does not modify the graph.',
		)
		.input(inputSchema)
		.output(outputSchema)
		.handler(async (input: z.infer<typeof inputSchema>) => {
			if (!context.plannedTaskService) {
				return { ok: false, result: 'Error: planned task service not available.' };
			}

			if (input.status === 'succeeded') {
				const setupGuard = await rejectIfSetupStillRequired(context, input.taskId);
				if (!setupGuard.ok) return setupGuard;
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
		})
		.build();
}
