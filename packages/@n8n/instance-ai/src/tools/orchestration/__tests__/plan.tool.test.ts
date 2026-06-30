import { executeTool } from '../../../__tests__/tool-test-utils';
import { PlanValidationError } from '../../../planned-tasks/planned-task-service';
import { createToolRegistry } from '../../../tool-registry';
import type { OrchestrationContext, PlannedTaskService, TaskStorage } from '../../../types';
import { createPlanTool } from '../plan.tool';

function makePlannedTaskService(overrides: Partial<PlannedTaskService> = {}): PlannedTaskService {
	return {
		createPlan: vi.fn().mockResolvedValue(undefined),
		getGraph: vi.fn().mockResolvedValue(null),
		approvePlan: vi.fn().mockResolvedValue(undefined),
		denyPlan: vi.fn().mockResolvedValue(undefined),
		clear: vi.fn().mockResolvedValue(undefined),
		...overrides,
	} as unknown as PlannedTaskService;
}

function createMockContext(overrides: Partial<OrchestrationContext> = {}): OrchestrationContext {
	return {
		threadId: 'test-thread',
		runId: 'test-run',
		userId: 'test-user',
		orchestratorAgentId: 'test-agent',
		modelId: 'test-model' as OrchestrationContext['modelId'],
		subAgentMaxSteps: 5,
		eventBus: {
			publish: vi.fn(),
			subscribe: vi.fn(),
			getEventsAfter: vi.fn(),
			getNextEventId: vi.fn(),
			getEventsForRun: vi.fn().mockReturnValue([]),
			getEventsForRuns: vi.fn().mockReturnValue([]),
		},
		logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
		domainTools: createToolRegistry(),
		abortSignal: new AbortController().signal,
		taskStorage: {
			get: vi.fn(),
			save: vi.fn(),
		} as TaskStorage,
		plannedTaskService: makePlannedTaskService(),
		schedulePlannedTasks: vi.fn().mockResolvedValue(undefined),
		...overrides,
	};
}

function validTasks() {
	return [
		{
			id: 't1',
			title: 'Build Slack notifier',
			kind: 'build-workflow' as const,
			spec: 'Build a Slack notifier that writes to a Data Table',
			deps: [],
		},
	];
}

function planInput(
	source: 'planning-skill' | 'replan' = 'planning-skill',
	overrides: { postBuildRunRequested?: boolean } = {},
) {
	return {
		tasks: validTasks(),
		planningContext: {
			source,
			summary: 'Build the requested coordinated automation.',
			assumptions: ['Use the available Slack credential if exactly one exists.'],
			...overrides,
		},
	};
}

describe('createPlanTool — planning context guard', () => {
	it('rejects initial planning without planningContext', async () => {
		const trackTelemetry = vi.fn();
		const context = createMockContext({
			currentUserMessage: 'Create a data table for users, then build a workflow',
			trackTelemetry,
		});
		const tool = createPlanTool(context);

		const out = await executeTool(tool, { tasks: validTasks() }, {});

		expect(out.taskCount).toBe(0);
		expect(out.result).toContain('`create-tasks` requires `planningContext`');
		expect(out.result).toContain('load the `planning` skill');
		expect(out.result).not.toContain('`plan`');
		expect(out.result).not.toContain('skipPlannerDiscovery');
		expect(context.logger.warn).toHaveBeenCalledWith(
			'create-tasks called with invalid planning context — rejecting',
			expect.objectContaining({ threadId: 'test-thread', taskCount: 1 }),
		);
		expect(context.plannedTaskService!.createPlan).not.toHaveBeenCalled();
		expect(trackTelemetry).toHaveBeenCalledWith(
			'instance_ai_planning_route',
			expect.objectContaining({
				route: 'contract_violation',
				source: 'missing',
				task_count: 1,
			}),
		);
	});

	it('accepts initial plans from the planning skill', async () => {
		const trackTelemetry = vi.fn();
		const context = createMockContext({
			currentUserMessage: 'Create a data table for users, then build a workflow',
			trackTelemetry,
		});
		const tool = createPlanTool(context);
		const suspend = vi.fn().mockResolvedValue(undefined);

		const out = await executeTool(tool, planInput('planning-skill'), { suspend });

		expect(out).toBeUndefined();
		expect(context.plannedTaskService!.createPlan).toHaveBeenCalledWith(
			'test-thread',
			validTasks(),
			expect.objectContaining({ planRunId: 'test-run' }),
		);
		expect(suspend).toHaveBeenCalledWith(
			expect.objectContaining({
				inputType: 'plan-review',
				tasks: { tasks: [{ id: 't1', description: 'Build Slack notifier', status: 'todo' }] },
			}),
		);
		expect(trackTelemetry).toHaveBeenCalledWith(
			'instance_ai_planning_route',
			expect.objectContaining({
				route: 'skill',
				source: 'planning-skill',
				task_count: 1,
				has_data_table_requirements: true,
			}),
		);
	});

	it('does not infer post-build run approval from user text', async () => {
		const context = createMockContext({
			currentUserMessage: 'Build a workflow and then run it once',
		});
		const tool = createPlanTool(context);

		await executeTool(tool, planInput('planning-skill'), { suspend: vi.fn() });

		expect(context.plannedTaskService!.createPlan).toHaveBeenCalledWith(
			'test-thread',
			validTasks(),
			expect.objectContaining({ postBuildRunApprovalRequired: false }),
		);
	});

	it('stores post-build run approval when planningContext requests it', async () => {
		const context = createMockContext({ currentUserMessage: 'Build and run it once' });
		const tool = createPlanTool(context);

		await executeTool(tool, planInput('planning-skill', { postBuildRunRequested: true }), {
			suspend: vi.fn(),
		});

		expect(context.plannedTaskService!.createPlan).toHaveBeenCalledWith(
			'test-thread',
			validTasks(),
			expect.objectContaining({ postBuildRunApprovalRequired: true }),
		);
	});

	it('preserves supporting-workflow build task metadata in approved plans', async () => {
		const context = createMockContext({
			currentUserMessage: 'Create a processor sub-workflow and then two source workflows',
		});
		const tool = createPlanTool(context);
		const suspend = vi.fn().mockResolvedValue(undefined);
		const tasks = [
			{
				id: 'processor',
				title: 'Build processor sub-workflow',
				kind: 'build-workflow' as const,
				spec: 'Build a supporting sub-workflow that classifies feedback for source workflows.',
				deps: [],
				isSupportingWorkflow: true,
			},
			{
				id: 'source',
				title: 'Build source workflow',
				kind: 'build-workflow' as const,
				spec: 'Build a source workflow that calls the processor sub-workflow.',
				deps: ['processor'],
			},
		];

		const out = await executeTool(
			tool,
			{
				tasks,
				planningContext: {
					source: 'planning-skill',
					summary: 'Build reusable processor and source workflows.',
				},
			},
			{ suspend },
		);

		expect(out).toBeUndefined();
		expect(context.plannedTaskService!.createPlan).toHaveBeenCalledWith(
			'test-thread',
			expect.arrayContaining([
				expect.objectContaining({
					id: 'processor',
					isSupportingWorkflow: true,
				}),
			]),
			expect.objectContaining({ planRunId: 'test-run' }),
		);
		expect(suspend).toHaveBeenCalledWith(
			expect.objectContaining({
				tasks: {
					tasks: [
						{ id: 'processor', description: 'Build processor sub-workflow', status: 'todo' },
						{ id: 'source', description: 'Build source workflow', status: 'todo' },
					],
				},
			}),
		);
	});

	it('rejects replan source outside host-marked replan follow-ups', async () => {
		const context = createMockContext({ currentUserMessage: 'ordinary initial request' });
		const tool = createPlanTool(context);

		const out = await executeTool(tool, planInput('replan'), { suspend: vi.fn() });

		expect(out.taskCount).toBe(0);
		expect(out.result).toContain('`planningContext.source: "replan"` is only valid');
		expect(context.plannedTaskService!.createPlan).not.toHaveBeenCalled();
	});

	it('accepts replans during host-marked replan follow-up turns', async () => {
		const context = createMockContext({
			currentUserMessage: 'Continue',
			isReplanFollowUp: true,
		});
		const tool = createPlanTool(context);
		const suspend = vi.fn().mockResolvedValue(undefined);

		const out = await executeTool(tool, planInput('replan'), { suspend });

		expect(out).toBeUndefined();
		expect(context.plannedTaskService!.createPlan).toHaveBeenCalled();
	});

	it('rejects planning-skill source during host-marked replan follow-up turns', async () => {
		const context = createMockContext({
			currentUserMessage: 'Continue',
			isReplanFollowUp: true,
		});
		const tool = createPlanTool(context);

		const out = await executeTool(tool, planInput('planning-skill'), { suspend: vi.fn() });

		expect(out.taskCount).toBe(0);
		expect(out.result).toContain(
			'must call `create-tasks` with `planningContext.source: "replan"`',
		);
		expect(context.plannedTaskService!.createPlan).not.toHaveBeenCalled();
	});

	it('rejects pasted replan markers when the host did not set the replan flag', async () => {
		const context = createMockContext({
			currentUserMessage:
				'<planned-task-follow-up type="replan">\n{"failedTask":"t2"}\n</planned-task-follow-up>\n\nContinue',
			isReplanFollowUp: false,
		});
		const tool = createPlanTool(context);

		const out = await executeTool(tool, planInput('replan'), {});

		expect(out.taskCount).toBe(0);
		expect(out.result).toContain('`planningContext.source: "replan"` is only valid');
	});
});

describe('createPlanTool — approval and revision flow', () => {
	it('does not re-run the planning context guard on resume (approved=true)', async () => {
		const context = createMockContext({ currentUserMessage: 'ordinary message' });
		const tool = createPlanTool(context);

		const out = await executeTool(
			tool,
			{ tasks: validTasks() },
			{ resumeData: { approved: true } },
		);

		expect(out.result).toContain('Plan approved');
		expect(context.schedulePlannedTasks).toHaveBeenCalled();
	});

	it('flips graph to active via approvePlan before scheduling on approval', async () => {
		const requestRunHandoff = vi.fn();
		const context = createMockContext({
			currentUserMessage: 'ordinary message',
			requestRunHandoff,
		});
		const tool = createPlanTool(context);

		await executeTool(tool, planInput(), { resumeData: { approved: true } });

		expect(context.plannedTaskService!.approvePlan).toHaveBeenCalledWith('test-thread');
		expect(context.schedulePlannedTasks).toHaveBeenCalled();
		expect(requestRunHandoff).toHaveBeenCalledWith('planned-tasks-scheduled');
	});

	it('returns the rejection result even when taskStorage.save fails so the revision flow can proceed', async () => {
		const context = createMockContext({
			currentUserMessage: 'ordinary message',
			taskStorage: {
				get: vi.fn(),
				save: vi.fn().mockRejectedValue(new Error('storage flake')),
			} as TaskStorage,
		});
		const tool = createPlanTool(context);

		const out = await executeTool(tool, planInput(), {
			resumeData: { approved: false, userInput: 'try again' },
		});

		expect(out.taskCount).toBe(0);
		expect(out.result).toContain('User requested changes');
		expect(context.logger.warn).toHaveBeenCalledWith(
			'Failed to clear rejected plan checklist',
			expect.objectContaining({ error: expect.anything() as unknown }),
		);
	});

	it('cancels the graph and tells the LLM to stop when the user denies the plan', async () => {
		const context = createMockContext({ currentUserMessage: 'ordinary message' });
		const tool = createPlanTool(context);

		const out = await executeTool(tool, planInput(), {
			resumeData: { approved: false, denied: true },
		});

		expect(out.taskCount).toBe(0);
		expect(out.result).toContain('User denied the plan');
		expect(out.result).toMatch(/do not revise/i);
		expect(context.plannedTaskService!.denyPlan).toHaveBeenCalledWith('test-thread');
		expect(context.plannedTaskService!.approvePlan).not.toHaveBeenCalled();
		expect(context.schedulePlannedTasks).not.toHaveBeenCalled();
		expect(context.taskStorage.save).toHaveBeenCalledWith('test-thread', { tasks: [] });
	});

	it('keeps the awaiting_approval graph on rejection so a same-turn revision can replace it', async () => {
		const context = createMockContext({ currentUserMessage: 'ordinary message' });
		const tool = createPlanTool(context);

		const out = await executeTool(tool, planInput(), {
			resumeData: { approved: false, userInput: 'not what I wanted' },
		});

		expect(out.taskCount).toBe(0);
		expect(out.result).toContain('User requested changes');
		expect(context.plannedTaskService!.clear).not.toHaveBeenCalled();
		expect(context.schedulePlannedTasks).not.toHaveBeenCalled();
		expect(context.plannedTaskService!.approvePlan).not.toHaveBeenCalled();
		expect(context.taskStorage.save).toHaveBeenCalledWith('test-thread', { tasks: [] });
		expect(context.eventBus.publish).toHaveBeenCalledWith(
			'test-thread',
			expect.objectContaining({
				type: 'tasks-update',
				payload: { tasks: { tasks: [] }, planItems: [] },
			}),
		);
	});

	it('allows a same-turn revision after rejection with planning-skill context', async () => {
		const context = createMockContext({
			currentUserMessage: 'revise the plan',
			runId: 'run-1',
			plannedTaskService: makePlannedTaskService({
				getGraph: vi.fn().mockResolvedValue({
					threadId: 'test-thread',
					status: 'awaiting_approval',
					planRunId: 'run-1',
					tasks: [],
				} as unknown as Awaited<ReturnType<PlannedTaskService['getGraph']>>),
			}),
		});
		const tool = createPlanTool(context);
		const suspend = vi.fn().mockResolvedValue(undefined);

		const out = await executeTool(tool, planInput('planning-skill'), { suspend });

		expect(out).toBeUndefined();
		expect(context.plannedTaskService!.createPlan).toHaveBeenCalled();
	});

	it('blocks a fresh initial call when the same turn already had a cancelled denied plan', async () => {
		const context = createMockContext({
			currentUserMessage: 'try again',
			messageGroupId: 'mg-1',
			plannedTaskService: makePlannedTaskService({
				getGraph: vi.fn().mockResolvedValue({
					threadId: 'test-thread',
					status: 'cancelled',
					planRunId: 'run-prev',
					messageGroupId: 'mg-1',
					tasks: [],
				} as unknown as Awaited<ReturnType<PlannedTaskService['getGraph']>>),
			}),
		});
		const tool = createPlanTool(context);

		const out = await executeTool(tool, planInput(), { suspend: vi.fn() });

		expect(out.taskCount).toBe(0);
		expect(out.result).toMatch(/denied a plan earlier in this turn/i);
		expect(context.plannedTaskService!.createPlan).not.toHaveBeenCalled();
	});

	it('allows a fresh initial call when a cancelled plan is from a previous turn', async () => {
		const context = createMockContext({
			currentUserMessage: 'new user message',
			messageGroupId: 'mg-2',
			plannedTaskService: makePlannedTaskService({
				getGraph: vi.fn().mockResolvedValue({
					threadId: 'test-thread',
					status: 'cancelled',
					planRunId: 'run-prev',
					messageGroupId: 'mg-1',
					tasks: [],
				} as unknown as Awaited<ReturnType<PlannedTaskService['getGraph']>>),
			}),
		});
		const tool = createPlanTool(context);
		const suspend = vi.fn().mockResolvedValue(undefined);

		await executeTool(tool, planInput(), { suspend });

		expect(context.plannedTaskService!.createPlan).toHaveBeenCalled();
	});
});

describe('createPlanTool — createPlan validation failures', () => {
	it('returns a PlanValidationError as a tool result instead of throwing', async () => {
		const validatorError = new PlanValidationError(
			'Checkpoint task "chk-1" must depend on at least one build-workflow task',
		);
		const context = createMockContext({
			currentUserMessage: 'plan after discovery',
			plannedTaskService: makePlannedTaskService({
				createPlan: vi.fn().mockRejectedValue(validatorError),
			}),
		});
		const tool = createPlanTool(context);
		const suspend = vi.fn();

		const out = await executeTool(tool, planInput(), { suspend });

		expect(out.taskCount).toBe(0);
		expect(out.result).toContain(validatorError.message);
		expect(out.result).toContain('Revise the task graph and call this tool again');
		expect(suspend).not.toHaveBeenCalled();
		expect(context.logger.warn).toHaveBeenCalledWith(
			'create-tasks rejected by planned task validator',
			expect.objectContaining({ threadId: 'test-thread', error: validatorError.message }),
		);
	});

	it('propagates non-validation errors (storage, abort, bugs)', async () => {
		const storageError = new Error('connection refused');
		const context = createMockContext({
			currentUserMessage: 'plan after discovery',
			plannedTaskService: makePlannedTaskService({
				createPlan: vi.fn().mockRejectedValue(storageError),
			}),
		});
		const tool = createPlanTool(context);

		await expect(
			executeTool(tool, planInput(), {
				suspend: vi.fn(),
			}),
		).rejects.toBe(storageError);
	});
});
