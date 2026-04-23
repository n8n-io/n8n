// Mock heavy Mastra dependencies to avoid ESM issues in Jest
jest.mock('@mastra/core/agent', () => ({
	Agent: jest.fn(),
}));
jest.mock('@mastra/core/mastra', () => ({
	Mastra: jest.fn(),
}));
jest.mock('@mastra/core/tools', () => ({
	createTool: jest.fn((config: Record<string, unknown>) => config),
}));

import type { OrchestrationContext } from '../../../types';
import type { SubmitWorkflowAttempt } from '../../workflows/submit-workflow.tool';

const { resultFromPostStreamError, createBuildWorkflowAgentTool } =
	// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/consistent-type-imports
	require('../build-workflow-agent.tool') as typeof import('../build-workflow-agent.tool');

type BuildExecutable = {
	execute: (input: Record<string, unknown>) => Promise<{ result: string; taskId: string }>;
};

function createMockContext(overrides: Partial<OrchestrationContext> = {}): OrchestrationContext {
	return {
		threadId: 'test-thread',
		runId: 'test-run',
		userId: 'test-user',
		orchestratorAgentId: 'test-agent',
		modelId: 'test-model' as OrchestrationContext['modelId'],
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
		logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
		domainTools: {},
		abortSignal: new AbortController().signal,
		...overrides,
	} as OrchestrationContext;
}

const MAIN_PATH = '/home/daytona/workspace/src/workflow.ts';

describe('resultFromPostStreamError', () => {
	it('preserves the submitted workflow when the stream errors after a successful submit', () => {
		const submitAttempts: SubmitWorkflowAttempt[] = [
			{
				filePath: MAIN_PATH,
				sourceHash: 'abc',
				success: true,
				workflowId: 'WF_123',
			},
		];

		const result = resultFromPostStreamError({
			error: new Error('Unauthorized'),
			submitAttempts,
			mainWorkflowPath: MAIN_PATH,
			workItemId: 'wi_test',
			taskId: 'task_test',
		});

		expect(result).toBeDefined();
		expect(result!.outcome).toMatchObject({
			workItemId: 'wi_test',
			taskId: 'task_test',
			workflowId: 'WF_123',
			submitted: true,
		});
		expect(result!.text).toContain('Unauthorized');
	});

	it('returns undefined when no submit happened before the error', () => {
		const result = resultFromPostStreamError({
			error: new Error('Unauthorized'),
			submitAttempts: [],
			mainWorkflowPath: MAIN_PATH,
			workItemId: 'wi_test',
			taskId: 'task_test',
		});

		expect(result).toBeUndefined();
	});

	it('returns undefined when the only submit attempt failed', () => {
		const submitAttempts: SubmitWorkflowAttempt[] = [
			{
				filePath: MAIN_PATH,
				sourceHash: 'abc',
				success: false,
				errors: ['validation failed'],
			},
		];

		const result = resultFromPostStreamError({
			error: new Error('Unauthorized'),
			submitAttempts,
			mainWorkflowPath: MAIN_PATH,
			workItemId: 'wi_test',
			taskId: 'task_test',
		});

		expect(result).toBeUndefined();
	});

	it('returns undefined when only sub-workflows were submitted (not the main path)', () => {
		const submitAttempts: SubmitWorkflowAttempt[] = [
			{
				filePath: '/home/daytona/workspace/src/subworkflow.ts',
				sourceHash: 'abc',
				success: true,
				workflowId: 'SUB_123',
			},
		];

		const result = resultFromPostStreamError({
			error: new Error('Unauthorized'),
			submitAttempts,
			mainWorkflowPath: MAIN_PATH,
			workItemId: 'wi_test',
			taskId: 'task_test',
		});

		expect(result).toBeUndefined();
	});

	it('preserves an earlier successful main-path submit when a later submit failed', () => {
		const submitAttempts: SubmitWorkflowAttempt[] = [
			{
				filePath: MAIN_PATH,
				sourceHash: 'a',
				success: true,
				workflowId: 'WF_123',
			},
			{
				filePath: MAIN_PATH,
				sourceHash: 'b',
				success: false,
				errors: ['validation failed'],
			},
		];

		const result = resultFromPostStreamError({
			error: new Error('Unauthorized'),
			submitAttempts,
			mainWorkflowPath: MAIN_PATH,
			workItemId: 'wi_test',
			taskId: 'task_test',
		});

		expect(result).toBeDefined();
		expect(result!.outcome).toMatchObject({
			workflowId: 'WF_123',
			submitted: true,
		});
	});
});

describe('createBuildWorkflowAgentTool — plan-enforcement guard', () => {
	const ORIGINAL_ENV = process.env.N8N_INSTANCE_AI_ENFORCE_BUILD_VIA_PLAN;

	afterEach(() => {
		if (ORIGINAL_ENV === undefined) {
			delete process.env.N8N_INSTANCE_AI_ENFORCE_BUILD_VIA_PLAN;
		} else {
			process.env.N8N_INSTANCE_AI_ENFORCE_BUILD_VIA_PLAN = ORIGINAL_ENV;
		}
	});

	it('rejects direct calls outside a replan/checkpoint follow-up', async () => {
		const context = createMockContext();
		const tool = createBuildWorkflowAgentTool(context) as unknown as BuildExecutable;

		const out = await tool.execute({ task: 'Build a Slack notifier' });

		expect(out.taskId).toBe('');
		expect(out.result).toContain('must go through `plan`');
		expect(out.result).toContain('bypassPlan');
		expect(context.logger.warn).toHaveBeenCalledWith(
			'build-workflow-with-agent called outside plan/replan context — rejecting',
			expect.objectContaining({ threadId: 'test-thread' }),
		);
	});

	it('rejects bypassPlan=true without a reason', async () => {
		const context = createMockContext();
		const tool = createBuildWorkflowAgentTool(context) as unknown as BuildExecutable;

		const out = await tool.execute({ task: 'patch one expression', bypassPlan: true });

		expect(out.taskId).toBe('');
		expect(out.result).toContain('requires a one-sentence `reason`');
	});

	it('allows the call when bypassPlan=true with a reason is provided', async () => {
		const context = createMockContext();
		const tool = createBuildWorkflowAgentTool(context) as unknown as BuildExecutable;

		const out = await tool.execute({
			task: 'patch one expression',
			workflowId: 'WF_EXISTING',
			bypassPlan: true,
			reason: 'Single expression tweak — full plan + checkpoint is overkill.',
		});

		// Guard passes → reaches startBuildWorkflowAgentTask, which short-circuits on
		// missing spawnBackgroundTask. The point is we got past the guard, not what
		// the downstream does. (No "must go through plan" rejection text.)
		expect(out.result).not.toContain('must go through `plan`');
		const warnMock = context.logger.warn as jest.Mock<void, [string, Record<string, unknown>?]>;
		expect(warnMock.mock.calls.some((c) => c[0].includes('bypassing plan'))).toBe(true);
	});

	it('allows direct calls in a replan follow-up', async () => {
		const context = createMockContext({ isReplanFollowUp: true });
		const tool = createBuildWorkflowAgentTool(context) as unknown as BuildExecutable;

		const out = await tool.execute({ task: 'retry after failure' });

		expect(out.result).not.toContain('must go through `plan`');
		expect(context.logger.warn).not.toHaveBeenCalledWith(
			'build-workflow-with-agent called outside plan/replan context — rejecting',
			expect.anything(),
		);
	});

	it('allows direct calls in a checkpoint follow-up', async () => {
		const context = createMockContext({ isCheckpointFollowUp: true });
		const tool = createBuildWorkflowAgentTool(context) as unknown as BuildExecutable;

		const out = await tool.execute({ task: 'checkpoint branch' });

		expect(out.result).not.toContain('must go through `plan`');
	});

	it('skips the guard when the env flag is disabled', async () => {
		process.env.N8N_INSTANCE_AI_ENFORCE_BUILD_VIA_PLAN = 'false';
		const context = createMockContext();
		const tool = createBuildWorkflowAgentTool(context) as unknown as BuildExecutable;

		const out = await tool.execute({ task: 'build directly' });

		expect(out.result).not.toContain('must go through `plan`');
	});
});
