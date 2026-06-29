import { Tool } from '@n8n/agents';
import { taskListSchema } from '@n8n/api-types';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import { PlanValidationError } from '../../planned-tasks/planned-task-service';
import { PLANNED_TASK_KINDS, type OrchestrationContext, type PlannedTask } from '../../types';

const plannedTaskSchema = z.object({
	id: z.string().describe('Stable task identifier used by dependency edges'),
	title: z.string().describe('Short user-facing task title'),
	kind: z.enum(PLANNED_TASK_KINDS),
	spec: z.string().describe('Detailed executor briefing for this task'),
	deps: z
		.array(z.string())
		.describe(
			'Task IDs that must succeed before this task can start. ' +
				'Workflows that consume outputs depend on workflows that produce them; independent workflows run in parallel.',
		),
	tools: z.array(z.string()).optional().describe('Required tool subset for delegate tasks'),
	workflowId: z
		.string()
		.optional()
		.describe('Existing workflow ID to modify (build-workflow tasks only)'),
	isSupportingWorkflow: z
		.boolean()
		.optional()
		.describe(
			'Set true only when this build-workflow task is complete after saving a supporting sub-workflow. Do not set for helper sub-workflows created inside a larger main-workflow task.',
		),
});

const planInputSchema = z.object({
	tasks: z.array(plannedTaskSchema).min(1).describe('Dependency-aware execution plan'),
	planningContext: z
		.object({
			source: z
				.enum(['planning-skill', 'replan'])
				.describe(
					'Use "planning-skill" for initial plan-worthy work after loading the planning skill; use "replan" only in planned-task replan follow-up turns.',
				),
			summary: z.string().min(1).describe('Brief summary of the plan and why it is needed'),
			assumptions: z.array(z.string()).optional().describe('Important assumptions behind the plan'),
			postBuildRunRequested: z
				.boolean()
				.optional()
				.describe(
					'Set true when the user explicitly asked to run, execute, or test a workflow after it is built. Omit or false otherwise.',
				),
		})
		.describe('How this task graph was produced'),
});

function isReplanContext(context: OrchestrationContext): boolean {
	return context.isReplanFollowUp === true;
}

const planOutputSchema = z.object({
	result: z.string(),
	taskCount: z.number(),
});

export const planResumeSchema = z.object({
	approved: z.boolean(),
	userInput: z.string().optional(),
	denied: z.boolean().optional(),
});

function hasDataTableRequirements(tasks: PlannedTask[]): boolean {
	return tasks.some((task) =>
		/\bdata[- ]?tables?\b|\btable schema\b|\btable rows?\b/i.test(`${task.title}\n${task.spec}`),
	);
}

function hasCheckpointTasks(tasks: PlannedTask[]): boolean {
	return tasks.some((task) => task.kind === 'checkpoint');
}

function trackPlanningRoute(
	context: OrchestrationContext,
	tasks: PlannedTask[],
	properties: {
		route: string;
		approvalOutcome?: string;
		source?: string;
	},
): void {
	context.trackTelemetry?.('instance_ai_planning_route', {
		thread_id: context.threadId,
		run_id: context.runId,
		route: properties.route,
		task_count: tasks.length,
		has_data_table_requirements: hasDataTableRequirements(tasks),
		has_checkpoint_tasks: hasCheckpointTasks(tasks),
		...(properties.approvalOutcome ? { approval_outcome: properties.approvalOutcome } : {}),
		...(properties.source ? { source: properties.source } : {}),
	});
}

function validatePlanningContext(
	input: z.infer<typeof planInputSchema>,
	context: OrchestrationContext,
): string | undefined {
	const { planningContext } = input;
	if (!planningContext) {
		trackPlanningRoute(context, input.tasks as PlannedTask[], {
			route: 'contract_violation',
			source: 'missing',
		});
		return (
			'Error: `create-tasks` requires `planningContext`. For initial plan-worthy work, load the ' +
			'`planning` skill first, perform discovery with normal tools, then call `create-tasks` with ' +
			'`planningContext.source: "planning-skill"`. For planned-task replan follow-ups, use ' +
			'`planningContext.source: "replan"`.'
		);
	}

	if (isReplanContext(context)) {
		if (planningContext.source !== 'replan') {
			trackPlanningRoute(context, input.tasks as PlannedTask[], {
				route: 'contract_violation',
				source: planningContext.source,
			});
			return (
				'Error: `<planned-task-follow-up type="replan">` turns must call `create-tasks` with ' +
				'`planningContext.source: "replan"` when scheduling multiple dependent tasks.'
			);
		}
		return undefined;
	}

	if (planningContext.source !== 'planning-skill') {
		trackPlanningRoute(context, input.tasks as PlannedTask[], {
			route: 'contract_violation',
			source: planningContext.source,
		});
		return (
			'Error: `planningContext.source: "replan"` is only valid in planned-task replan follow-up turns. ' +
			'For initial plan-worthy work, load the `planning` skill, perform discovery with normal tools, ' +
			'then call `create-tasks` with `planningContext.source: "planning-skill"`.'
		);
	}

	return undefined;
}

export function createPlanTool(context: OrchestrationContext) {
	return new Tool('create-tasks')
		.description(
			'Submit a dependency-aware task graph for detached multi-step execution. ' +
				'Use after loading the `planning` skill for initial plan-worthy work, or during ' +
				'`<planned-task-follow-up type="replan">` when multiple dependent tasks still need scheduling. ' +
				'Requires `planningContext.source` to be `planning-skill` or `replan` as appropriate. ' +
				'The task list is shown to the user for approval before execution starts. ' +
				'After calling create-tasks, do not write visible text; the approval card is the user-visible surface.',
		)
		.input(planInputSchema)
		.output(planOutputSchema)
		.suspend(
			z.object({
				requestId: z.string(),
				message: z.string(),
				severity: z.literal('info'),
				inputType: z.literal('plan-review'),
				tasks: taskListSchema,
			}),
		)
		.resume(planResumeSchema)
		.handler(async (input: z.infer<typeof planInputSchema>, ctx) => {
			if (!context.plannedTaskService || !context.schedulePlannedTasks) {
				return {
					result: 'Planning failed: planned task scheduling is not available.',
					taskCount: 0,
				};
			}

			const resumeData = ctx.resumeData;
			const isFirstCall = resumeData === undefined || resumeData === null;

			// Same-turn denial guard: if the user denied a plan earlier in this
			// message group, refuse to start a new one within the same turn.
			// Only applies on the initial call — resumes are valid continuations
			// of an already-suspended invocation (including the denial path itself).
			if (isFirstCall && context.messageGroupId) {
				const existing = await context.plannedTaskService.getGraph(context.threadId);
				if (
					existing?.status === 'cancelled' &&
					existing.messageGroupId === context.messageGroupId
				) {
					context.logger.info('create-tasks blocked: user denied a plan earlier in this turn', {
						threadId: context.threadId,
						messageGroupId: context.messageGroupId,
					});
					return {
						result:
							'The user denied a plan earlier in this turn. Do not invoke create-tasks again — acknowledge briefly and wait for the next user message.',
						taskCount: 0,
					};
				}
			}

			if (isFirstCall) {
				const contextError = validatePlanningContext(input, context);
				if (contextError) {
					context.logger.warn('create-tasks called with invalid planning context — rejecting', {
						threadId: context.threadId,
						taskCount: input.tasks.length,
						planningSource: input.planningContext?.source,
					});
					return {
						result: contextError,
						taskCount: 0,
					};
				}
			}

			// First call — persist plan, show to user, suspend for approval
			if (isFirstCall) {
				try {
					trackPlanningRoute(context, input.tasks as PlannedTask[], {
						route: input.planningContext.source === 'planning-skill' ? 'skill' : 'replan',
						source: input.planningContext.source,
					});
					await context.plannedTaskService.createPlan(
						context.threadId,
						input.tasks as PlannedTask[],
						{
							planRunId: context.runId,
							messageGroupId: context.messageGroupId,
							postBuildRunApprovalRequired: input.planningContext.postBuildRunRequested === true,
						},
					);
				} catch (error) {
					// Surface only validator rejections back to the LLM as a tool result
					// so it can re-call with a corrected graph. Storage failures, abort
					// signals, and bugs propagate.
					if (!(error instanceof PlanValidationError)) {
						throw error;
					}
					context.logger.warn('create-tasks rejected by planned task validator', {
						threadId: context.threadId,
						taskCount: input.tasks.length,
						error: error.message,
					});
					return {
						result: `Error: ${error.message}. Revise the task graph and call this tool again.`,
						taskCount: 0,
					};
				}

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
				return await ctx.suspend({
					requestId: nanoid(),
					message: `Review the plan (${input.tasks.length} task${input.tasks.length === 1 ? '' : 's'}) before execution starts.`,
					severity: 'info' as const,
					inputType: 'plan-review' as const,
					tasks: { tasks: taskItems },
				});
			}

			// User approved — flip graph status from awaiting_approval → active,
			// then start execution.
			if (resumeData.approved) {
				await context.plannedTaskService.approvePlan(context.threadId);
				await context.schedulePlannedTasks();
				context.requestRunHandoff?.('planned-tasks-scheduled');
				trackPlanningRoute(context, input.tasks as PlannedTask[], {
					route: input.planningContext?.source === 'replan' ? 'replan' : 'skill',
					source: input.planningContext?.source,
					approvalOutcome: 'approved',
				});
				return {
					result: `Plan approved. Started ${input.tasks.length} task${input.tasks.length === 1 ? '' : 's'}.`,
					taskCount: input.tasks.length,
				};
			}

			// Reset the UI checklist so the rejected plan's "todo" items don't
			// linger on screen. Best-effort: a storage failure here must not
			// abort the rejection / denial flow.
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

			// User denied the plan outright. Cancel the graph so the next
			// `create-tasks` call goes through the fresh-plan path instead of
			// being treated as a revision, and tell the LLM to stop.
			if (resumeData.denied) {
				await context.plannedTaskService.denyPlan(context.threadId);
				trackPlanningRoute(context, input.tasks as PlannedTask[], {
					route: input.planningContext?.source === 'replan' ? 'replan' : 'skill',
					source: input.planningContext?.source,
					approvalOutcome: 'denied',
				});
				return {
					result:
						'User denied the plan. Do not revise or call create-tasks again — acknowledge and wait for new instructions.',
					taskCount: 0,
				};
			}

			// User requested changes. Keep the persisted graph in
			// `awaiting_approval`: the scheduler ignores it, so the rejected
			// graph cannot dispatch, and the next `create-tasks` call overwrites
			// it with the revised graph.
			return {
				result: `User requested changes: ${resumeData.userInput ?? 'No feedback provided'}. Revise the tasks and call create-tasks again.`,
				taskCount: 0,
			};
		})
		.build();
}
