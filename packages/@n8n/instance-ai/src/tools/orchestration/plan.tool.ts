import { createTool } from '@mastra/core/tools';
import { taskListSchema } from '@n8n/api-types';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import type { OrchestrationContext, PlannedTask } from '../../types';

const plannedTaskSchema = z.object({
	id: z.string().describe('Stable task identifier used by dependency edges'),
	title: z.string().describe('Short user-facing task title'),
	kind: z.enum(['delegate', 'build-workflow', 'manage-data-tables', 'research', 'checkpoint']),
	spec: z.string().describe('Detailed executor briefing for this task'),
	deps: z
		.array(z.string())
		.describe(
			'Task IDs that must succeed before this task can start. ' +
				'Data stores before workflows that use them; independent workflows in parallel.',
		),
	tools: z.array(z.string()).optional().describe('Required tool subset for delegate tasks'),
	workflowId: z
		.string()
		.optional()
		.describe('Existing workflow ID to modify (build-workflow tasks only)'),
});

const planInputSchema = z.object({
	tasks: z.array(plannedTaskSchema).min(1).describe('Dependency-aware execution plan'),
	skipPlannerDiscovery: z
		.boolean()
		.optional()
		.describe(
			'Set to true to intentionally bypass the planner and call create-tasks for initial (non-replan) work. ' +
				'Requires `reason`. Use sparingly — the planner sub-agent discovers credentials, data tables, and ' +
				'best practices you would otherwise miss.',
		),
	reason: z
		.string()
		.optional()
		.describe(
			'One sentence explaining why the planner is being bypassed. Required when skipPlannerDiscovery is true.',
		),
});

function isReplanContext(context: OrchestrationContext): boolean {
	return context.isReplanFollowUp === true;
}

/**
 * Returns true when the thread has a non-terminal planned-task graph — meaning
 * `create-tasks` is being called as a revision (after user rejection of a
 * previous plan) or a mid-flight follow-up, not as initial planning. The guard
 * should not fire in these cases because a planner cycle has already run for
 * this thread and is still in progress. Terminal graphs (`completed`,
 * `cancelled`) must not bypass the guard — a fresh user request on a long-
 * lived thread needs to go through `plan` for discovery, same as any first
 * request.
 *
 * `awaiting_approval` is treated as "existing" only within the run that
 * created it. The rejection path leaves the graph in `awaiting_approval` so a
 * same-turn revision can call `create-tasks` again, but an orphaned
 * `awaiting_approval` graph from a previous turn (the LLM never revised after
 * a rejection) must not bypass planner discovery for a fresh user request.
 */
async function threadHasExistingPlan(context: OrchestrationContext): Promise<boolean> {
	if (!context.plannedTaskService) return false;
	try {
		const graph = await context.plannedTaskService.getGraph(context.threadId);
		if (!graph) return false;
		if (graph.status === 'awaiting_approval') {
			return graph.planRunId === context.runId;
		}
		return graph.status === 'active' || graph.status === 'awaiting_replan';
	} catch {
		return false;
	}
}

function isReplanGuardEnabled(): boolean {
	const raw = process.env.N8N_INSTANCE_AI_ENFORCE_CREATE_TASKS_REPLAN;
	if (raw === undefined) return true;
	return raw.toLowerCase() !== 'false' && raw !== '0';
}

const planOutputSchema = z.object({
	result: z.string(),
	taskCount: z.number(),
});

export const planResumeSchema = z.object({
	approved: z.boolean(),
	userInput: z.string().optional(),
});

export function createPlanTool(context: OrchestrationContext) {
	return createTool({
		id: 'create-tasks',
		description:
			'Submit a pre-built task list for detached multi-step execution. ' +
			'Use ONLY for replanning after a failure — when you already have the task context ' +
			'and do not need resource discovery. For initial planning, call `plan` instead. ' +
			'A runtime guard rejects this tool when no replan context (`<planned-task-follow-up type="replan">`) ' +
			'is present; if you intentionally need to bypass the planner, set `skipPlannerDiscovery: true` ' +
			'and pass a one-sentence `reason`. ' +
			'The task list is shown to the user for approval before execution starts. ' +
			'After calling create-tasks, reply briefly and end your turn.',
		inputSchema: planInputSchema,
		outputSchema: planOutputSchema,
		suspendSchema: z.object({
			requestId: z.string(),
			message: z.string(),
			severity: z.literal('info'),
			inputType: z.literal('plan-review'),
			tasks: taskListSchema,
		}),
		resumeSchema: planResumeSchema,
		execute: async (input: z.infer<typeof planInputSchema>, ctx) => {
			if (!context.plannedTaskService || !context.schedulePlannedTasks) {
				return {
					result: 'Planning failed: planned task scheduling is not available.',
					taskCount: 0,
				};
			}

			const resumeData = ctx?.agent?.resumeData as z.infer<typeof planResumeSchema> | undefined;
			const suspend = ctx?.agent?.suspend;

			// Replan-only guard: reject initial-planning misuse on the first call.
			// Legitimate callers pass the guard when any of these hold:
			//   - `<planned-task-follow-up type="replan">` is present in the user message
			//   - the thread already has a planned-task graph (revision loop after a
			//     user rejection, or replan after a failed background task)
			//   - the orchestrator opts in with `skipPlannerDiscovery: true` + a `reason`
			const isFirstCall = resumeData === undefined || resumeData === null;
			const hasExistingPlan = await threadHasExistingPlan(context);
			if (isFirstCall && isReplanGuardEnabled() && !isReplanContext(context) && !hasExistingPlan) {
				if (!input.skipPlannerDiscovery) {
					context.logger.warn('create-tasks called without replan context — rejecting', {
						threadId: context.threadId,
						taskCount: input.tasks.length,
					});
					return {
						result:
							'Error: `create-tasks` is for replanning only. For initial planning, call `plan` instead — ' +
							'the planner sub-agent will discover credentials, data tables, and best practices for you. ' +
							'If you intentionally want to skip the planner (rare), call `create-tasks` again with ' +
							'`skipPlannerDiscovery: true` and a one-sentence `reason`.',
						taskCount: 0,
					};
				}
				if (!input.reason || input.reason.trim().length === 0) {
					return {
						result:
							'Error: `skipPlannerDiscovery: true` requires a one-sentence `reason` explaining ' +
							'why the planner is being bypassed.',
						taskCount: 0,
					};
				}
				context.logger.warn('create-tasks bypassing planner with skipPlannerDiscovery=true', {
					threadId: context.threadId,
					taskCount: input.tasks.length,
					reason: input.reason,
				});
			}

			// First call — persist plan, show to user, suspend for approval
			if (isFirstCall) {
				await context.plannedTaskService.createPlan(
					context.threadId,
					input.tasks as PlannedTask[],
					{
						planRunId: context.runId,
						messageGroupId: context.messageGroupId,
					},
				);

				// Emit tasks-update so the checklist appears in the chat immediately
				const taskItems = input.tasks.map((t: z.infer<typeof plannedTaskSchema>) => ({
					id: t.id,
					description: t.title,
					status: 'todo' as const,
				}));
				context.eventBus.publish(context.threadId, {
					type: 'tasks-update',
					runId: context.runId,
					agentId: context.orchestratorAgentId,
					payload: { tasks: { tasks: taskItems } },
				});

				// Suspend — frontend renders plan review UI
				await suspend?.({
					requestId: nanoid(),
					message: `Review the plan (${input.tasks.length} task${input.tasks.length === 1 ? '' : 's'}) before execution starts.`,
					severity: 'info' as const,
					inputType: 'plan-review' as const,
					tasks: { tasks: taskItems },
				});
				// suspend() never resolves
				return { result: 'Awaiting approval', taskCount: input.tasks.length };
			}

			// User approved — flip graph status from awaiting_approval → active,
			// then start execution.
			if (resumeData.approved) {
				await context.plannedTaskService.approvePlan(context.threadId);
				await context.schedulePlannedTasks();
				return {
					result: `Plan approved. Started ${input.tasks.length} task${input.tasks.length === 1 ? '' : 's'}.`,
					taskCount: input.tasks.length,
				};
			}

			// User rejected or requested changes. Reset the UI checklist so the
			// rejected plan's "todo" items don't linger on screen, but keep the
			// persisted graph in `awaiting_approval` so the LLM's next
			// `create-tasks` revision passes the replan guard via
			// `threadHasExistingPlan` (scoped to the current runId). The
			// scheduler ignores `awaiting_approval` graphs, so leaving the graph
			// in place can't dispatch the rejected plan; the next createPlan
			// call overwrites it with the revised tasks.
			// Best-effort: a storage failure here must not abort the revision flow.
			try {
				await context.taskStorage.save(context.threadId, { tasks: [] });
			} catch (error) {
				context.logger.warn('Failed to clear rejected plan checklist', { error });
			}
			context.eventBus.publish(context.threadId, {
				type: 'tasks-update',
				runId: context.runId,
				agentId: context.orchestratorAgentId,
				payload: { tasks: { tasks: [] }, planItems: [] },
			});
			return {
				result: `User requested changes: ${resumeData.userInput ?? 'No feedback provided'}. Revise the tasks and call create-tasks again.`,
				taskCount: 0,
			};
		},
	});
}
