import type { InstanceAiPlanSpec } from '@n8n/api-types';

import type { OrchestrationContext } from '../../../types';

jest.mock('@mastra/core/tools', () => ({
	createTool: jest.fn((config: Record<string, unknown>) => config),
}));

const { createCreatePlanTool } =
	// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/consistent-type-imports
	require('../create-plan.tool') as typeof import('../create-plan.tool');
const { createRequestPlanApprovalTool } =
	// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/consistent-type-imports
	require('../request-plan-approval.tool') as typeof import('../request-plan-approval.tool');
const { createUpdatePhaseStatusTool } =
	// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/consistent-type-imports
	require('../update-phase-status.tool') as typeof import('../update-phase-status.tool');

function createMockContext(plan?: InstanceAiPlanSpec): OrchestrationContext {
	return {
		threadId: 'test-thread',
		runId: 'test-run',
		userId: 'test-user',
		orchestratorAgentId: 'test-agent',
		modelId: 'test-model',
		storage: { id: 'test-storage' } as OrchestrationContext['storage'],
		subAgentMaxSteps: 5,
		eventBus: {
			publish: jest.fn(),
			subscribe: jest.fn(),
			getEventsAfter: jest.fn(),
			getNextEventId: jest.fn(),
			getEventsForRun: jest.fn().mockReturnValue([]),
			getEventsForRuns: jest.fn().mockReturnValue([]),
		},
		domainTools: {} as OrchestrationContext['domainTools'],
		abortSignal: new AbortController().signal,
		taskStorage: {
			get: jest.fn(),
			save: jest.fn(),
		},
		planStorage: {
			get: jest.fn().mockResolvedValue(plan),
			save: jest.fn(),
		},
	};
}

function makePlan(): InstanceAiPlanSpec {
	return {
		planId: 'plan_123',
		goal: 'Build the workflow',
		summary: 'Phase-based plan',
		assumptions: ['Slack access is available'],
		externalSystems: ['Slack'],
		dataContracts: ['Incoming payload contains email'],
		acceptanceCriteria: ['Workflow runs successfully'],
		openQuestions: [],
		status: 'awaiting_approval',
		lastUpdatedAt: '2026-03-18T10:00:00.000Z',
		phases: [
			{
				id: 'phase-1',
				title: 'Set up trigger',
				description: 'Create the entry point',
				objective: 'Receive new submissions',
				dependsOn: [],
				inputs: ['Form submission'],
				deliverable: 'Runnable trigger workflow',
				targetResource: { type: 'workflow' },
				executionGroup: undefined,
				status: 'pending',
				artifacts: [],
				verification: {
					mode: 'run-workflow',
					expectedOutcome: 'Trigger receives sample input',
					successCriteria: 'The trigger can be executed with sample input.',
				},
				blockingQuestions: [],
				blocker: undefined,
			},
		],
	};
}

describe('plan orchestration tools', () => {
	it('create-plan saves a new plan and publishes a plan-created event', async () => {
		const context = createMockContext();
		const tool = createCreatePlanTool(context);

		const output = await tool.execute!(
			{
				goal: 'Build the workflow',
				summary: 'Phase-based plan',
				assumptions: ['Slack access is available'],
				externalSystems: ['Slack'],
				dataContracts: ['Incoming payload contains email'],
				acceptanceCriteria: ['Workflow runs successfully'],
				openQuestions: [],
				phases: [
					{
						id: 'phase-1',
						title: 'Set up trigger',
						description: 'Create the entry point',
						objective: 'Receive new submissions',
						dependsOn: [],
						inputs: ['Form submission'],
						deliverable: 'Runnable trigger workflow',
						targetResource: { type: 'workflow' },
						verification: {
							mode: 'run-workflow',
							expectedOutcome: 'Trigger receives sample input',
							successCriteria: 'The trigger can be executed with sample input.',
						},
						blockingQuestions: [],
					},
				],
			},
			{} as never,
		);

		if (!('saved' in output)) {
			throw new Error('Expected create-plan to return a success payload');
		}

		expect(output.saved).toBe(true);
		expect(output.planId).toMatch(/^plan_/);
		expect(context.planStorage.save).toHaveBeenCalledTimes(1);
		const publishCalls = (context.eventBus.publish as jest.Mock).mock.calls as Array<
			[
				string,
				{
					type: string;
					runId: string;
					agentId: string;
					payload: { plan: InstanceAiPlanSpec };
				},
			]
		>;
		expect(publishCalls).toHaveLength(1);
		const planCreatedEvent = publishCalls[0][1] as {
			type: string;
			runId: string;
			agentId: string;
			payload: { plan: InstanceAiPlanSpec };
		};
		expect(planCreatedEvent.type).toBe('plan-created');
		expect(planCreatedEvent.runId).toBe('test-run');
		expect(planCreatedEvent.agentId).toBe('test-agent');
		expect(planCreatedEvent.payload.plan).toMatchObject({
			planId: output.planId,
			status: 'awaiting_approval',
			phases: [{ id: 'phase-1', status: 'ready', artifacts: [] }],
		});
	});

	it('create-plan normalizes draft status to awaiting_approval', async () => {
		const context = createMockContext();
		const tool = createCreatePlanTool(context);

		await tool.execute!(
			{
				goal: 'Build the workflow',
				summary: 'Phase-based plan',
				status: 'draft',
				assumptions: [],
				externalSystems: [],
				dataContracts: [],
				acceptanceCriteria: [],
				openQuestions: [],
				phases: [
					{
						id: 'phase-1',
						title: 'Set up trigger',
						description: 'Create the entry point',
						objective: 'Receive new submissions',
						dependsOn: [],
						inputs: [],
						deliverable: 'Runnable trigger workflow',
						verification: {
							mode: 'run-workflow',
							expectedOutcome: 'Trigger receives sample input',
							successCriteria: 'The trigger can be executed with sample input.',
						},
						blockingQuestions: [],
					},
				],
			},
			{} as never,
		);

		expect(context.planStorage.save).toHaveBeenCalledWith(
			'test-thread',
			expect.objectContaining({
				status: 'awaiting_approval',
			}),
		);
	});

	it('create-plan suspends for approval and resumes with feedback', async () => {
		const context = createMockContext();
		const tool = createCreatePlanTool(context);
		const suspend = jest.fn();

		const firstResult = await tool.execute!(
			{
				goal: 'Build the workflow',
				summary: 'Phase-based plan',
				assumptions: [],
				externalSystems: [],
				dataContracts: [],
				acceptanceCriteria: [],
				openQuestions: [],
				phases: [
					{
						id: 'phase-1',
						title: 'Set up trigger',
						description: 'Create the entry point',
						objective: 'Receive new submissions',
						dependsOn: [],
						inputs: [],
						deliverable: 'Runnable trigger workflow',
						verification: {
							mode: 'run-workflow',
							expectedOutcome: 'Trigger receives sample input',
							successCriteria: 'The trigger can be executed with sample input.',
						},
						blockingQuestions: [],
					},
				],
			},
			{
				agent: {
					suspend,
					resumeData: undefined,
				},
			} as never,
		);

		expect(firstResult).toEqual(
			expect.objectContaining({
				saved: true,
				approved: false,
			}),
		);
		expect(suspend).toHaveBeenCalledWith(
			expect.objectContaining({
				inputType: 'approval',
			}),
		);

		const savedPlan = (context.planStorage.save as jest.Mock).mock.calls[0]?.[1] as InstanceAiPlanSpec;
		(context.planStorage.get as jest.Mock).mockResolvedValue(savedPlan);

		const resumedResult = await tool.execute!(
			{
				goal: 'Build the workflow',
				summary: 'Phase-based plan',
				assumptions: [],
				externalSystems: [],
				dataContracts: [],
				acceptanceCriteria: [],
				openQuestions: [],
				phases: [
					{
						id: 'phase-1',
						title: 'Set up trigger',
						description: 'Create the entry point',
						objective: 'Receive new submissions',
						dependsOn: [],
						inputs: [],
						deliverable: 'Runnable trigger workflow',
						verification: {
							mode: 'run-workflow',
							expectedOutcome: 'Trigger receives sample input',
							successCriteria: 'The trigger can be executed with sample input.',
						},
						blockingQuestions: [],
					},
				],
			},
			{
				agent: {
					suspend,
					resumeData: {
						approved: false,
						userInput: 'Use Airtable instead',
					},
				},
			} as never,
		);

		expect(resumedResult).toEqual({
			saved: true,
			planId: savedPlan.planId,
			approved: false,
			feedback: 'Use Airtable instead',
		});
		expect(context.planStorage.save).toHaveBeenCalledTimes(1);
	});

	it('request-plan-approval promotes draft plans to awaiting_approval before suspending', async () => {
		const context = createMockContext({
			...makePlan(),
			status: 'draft',
		});
		const tool = createRequestPlanApprovalTool(context);
		const suspend = jest.fn();

		const output = await tool.execute!(
			{
				planId: 'plan_123',
				message: 'Please review the plan.',
			},
			{
				agent: {
					suspend,
					resumeData: undefined,
				},
			} as never,
		);

		expect(output).toEqual({ approved: false });
		expect(context.planStorage.save).toHaveBeenCalledWith(
			'test-thread',
			expect.objectContaining({
				planId: 'plan_123',
				status: 'awaiting_approval',
			}),
		);
		expect(context.eventBus.publish).toHaveBeenCalledWith(
			'test-thread',
			expect.objectContaining({
				type: 'plan-status-updated',
				payload: {
					planId: 'plan_123',
					status: 'awaiting_approval',
				},
			}),
		);
		expect(suspend).toHaveBeenCalledWith(
			expect.objectContaining({
				inputType: 'approval',
				message: 'Please review the plan.',
			}),
		);
	});

	it('update-phase-status persists the phase change and publishes phase and plan status events', async () => {
		const context = createMockContext(makePlan());
		const tool = createUpdatePhaseStatusTool(context);

		const output = await tool.execute!(
			{
				planId: 'plan_123',
				phaseId: 'phase-1',
				status: 'building',
			},
			{} as never,
		);

		expect(output).toEqual({ saved: true });
		expect(context.planStorage.save).toHaveBeenCalledTimes(1);
		expect(context.planStorage.save).toHaveBeenCalledWith(
			'test-thread',
			expect.objectContaining({
				planId: 'plan_123',
				status: 'running',
				phases: [
					expect.objectContaining({
						id: 'phase-1',
						status: 'building',
					}),
				],
			}),
		);
		const publishCalls = (context.eventBus.publish as jest.Mock).mock.calls as Array<
			[
				string,
				{
					type: string;
					runId: string;
					agentId: string;
					payload:
						| { planId: string; phase: { id: string; status: string } }
						| { planId: string; status: string };
				},
			]
		>;
		expect(publishCalls).toHaveLength(2);
		const phaseStatusEvent = publishCalls[0][1] as {
			type: string;
			payload: { planId: string; phase: { id: string; status: string } };
		};
		const planStatusEvent = publishCalls[1][1] as {
			type: string;
			runId: string;
			agentId: string;
			payload: { planId: string; status: string };
		};
		expect(phaseStatusEvent).toMatchObject({
			type: 'phase-status-updated',
			payload: {
				planId: 'plan_123',
				phase: {
					id: 'phase-1',
					status: 'building',
				},
			},
		});
		expect(planStatusEvent).toEqual({
			type: 'plan-status-updated',
			runId: 'test-run',
			agentId: 'test-agent',
			payload: {
				planId: 'plan_123',
				status: 'running',
			},
		});
	});
});
