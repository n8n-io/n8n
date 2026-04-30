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

import {
	applyBranchReadOnlyOverrides,
	DEFAULT_INSTANCE_AI_PERMISSIONS,
	type InstanceAiPermissions,
} from '@n8n/api-types';

import type { InstanceAiContext, OrchestrationContext } from '../../../types';
import type { SubmitWorkflowAttempt } from '../../workflows/submit-workflow.tool';

const { resultFromPostStreamError, createBuildWorkflowAgentTool, recordSuccessfulWorkflowBuilds } =
	// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/consistent-type-imports
	require('../build-workflow-agent.tool') as typeof import('../build-workflow-agent.tool');

type BuildExecutable = {
	execute: (
		input: Record<string, unknown>,
		ctx?: { agent?: { resumeData?: unknown; suspend?: jest.Mock<Promise<void>, [unknown]> } },
	) => Promise<{ result: string; taskId: string }>;
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

function createMockDomainContext(
	permissionOverrides: Partial<InstanceAiPermissions> = {},
	workflowName = 'Existing Workflow',
): InstanceAiContext {
	return {
		userId: 'test-user',
		permissions: { ...DEFAULT_INSTANCE_AI_PERMISSIONS, ...permissionOverrides },
		workflowService: {
			get: jest.fn().mockResolvedValue({ name: workflowName }),
		} as unknown as InstanceAiContext['workflowService'],
		executionService: {} as InstanceAiContext['executionService'],
		credentialService: {} as InstanceAiContext['credentialService'],
		nodeService: {} as InstanceAiContext['nodeService'],
		dataTableService: {} as InstanceAiContext['dataTableService'],
	};
}

function createSpawnableContext(
	permissionOverrides: Partial<InstanceAiPermissions> = {},
	overrides: Partial<OrchestrationContext> = {},
): OrchestrationContext {
	return createMockContext({
		domainContext: createMockDomainContext(permissionOverrides),
		domainTools: { 'build-workflow': {} },
		spawnBackgroundTask: jest.fn().mockReturnValue({
			status: 'started',
			taskId: 'build-task',
			agentId: 'agent-builder',
		}),
		...overrides,
	});
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
		expect(out.result).toContain('bypassPlan');
		expect(out.result).toMatch(
			/For new workflows, multi-workflow builds, or data-table schema changes/,
		);
		expect(out.result).toContain('`plan`');
		expect(context.logger.warn).toHaveBeenCalledWith(
			'build-workflow-with-agent called outside plan/replan context — rejecting',
			expect.objectContaining({ threadId: 'test-thread' }),
		);
	});

	it('rejects bypassPlan=true without a workflowId (new builds must go through plan)', async () => {
		const context = createMockContext();
		const tool = createBuildWorkflowAgentTool(context) as unknown as BuildExecutable;

		const out = await tool.execute({
			task: 'build something shiny',
			bypassPlan: true,
			reason: 'I feel like skipping the plan today',
		});

		expect(out.taskId).toBe('');
		expect(out.result).toMatch(/edits to an EXISTING workflow and requires a `workflowId`/);
	});

	it('rejects bypassPlan=true without a reason', async () => {
		const context = createMockContext();
		const tool = createBuildWorkflowAgentTool(context) as unknown as BuildExecutable;

		const out = await tool.execute({
			task: 'patch one expression',
			workflowId: 'WF_EXISTING',
			bypassPlan: true,
		});

		expect(out.taskId).toBe('');
		expect(out.result).toContain('requires a one-sentence `reason`');
	});

	it('allows the call when bypassPlan=true with a reason is provided', async () => {
		const context = createMockContext({
			domainContext: createMockDomainContext({ updateWorkflow: 'always_allow' }),
		});
		const tool = createBuildWorkflowAgentTool(context) as unknown as BuildExecutable;

		const out = await tool.execute({
			task: 'patch one expression',
			workflowId: 'WF_EXISTING',
			bypassPlan: true,
			reason: 'Swap Slack channel on this notifier.',
		});

		// Guard passes → reaches startBuildWorkflowAgentTask, which short-circuits on
		// missing spawnBackgroundTask. The point is we got past the guard, not what
		// the downstream does.
		expect(out.result).not.toMatch(/`bypassPlan: true` is for edits/);
		const warnMock = context.logger.warn as jest.Mock<void, [string, Record<string, unknown>?]>;
		expect(warnMock.mock.calls.some((c) => c[0].includes('bypassing plan'))).toBe(true);
	});

	it('allows direct calls in a replan follow-up', async () => {
		const context = createMockContext({ isReplanFollowUp: true });
		const tool = createBuildWorkflowAgentTool(context) as unknown as BuildExecutable;

		const out = await tool.execute({ task: 'retry after failure' });

		expect(out.result).not.toContain('direct builder calls require');
		expect(context.logger.warn).not.toHaveBeenCalledWith(
			'build-workflow-with-agent called outside plan/replan context — rejecting',
			expect.anything(),
		);
	});

	it('allows direct calls in a checkpoint follow-up', async () => {
		const context = createMockContext({ isCheckpointFollowUp: true });
		const tool = createBuildWorkflowAgentTool(context) as unknown as BuildExecutable;

		const out = await tool.execute({ task: 'checkpoint branch' });

		expect(out.result).not.toContain('direct builder calls require');
	});

	it('skips the guard when the env flag is disabled', async () => {
		process.env.N8N_INSTANCE_AI_ENFORCE_BUILD_VIA_PLAN = 'false';
		const context = createMockContext();
		const tool = createBuildWorkflowAgentTool(context) as unknown as BuildExecutable;

		const out = await tool.execute({ task: 'build directly' });

		expect(out.result).not.toContain('direct builder calls require');
	});
});

describe('createBuildWorkflowAgentTool — existing workflow approval', () => {
	const ORIGINAL_ENV = process.env.N8N_INSTANCE_AI_ENFORCE_BUILD_VIA_PLAN;

	afterEach(() => {
		if (ORIGINAL_ENV === undefined) {
			delete process.env.N8N_INSTANCE_AI_ENFORCE_BUILD_VIA_PLAN;
		} else {
			process.env.N8N_INSTANCE_AI_ENFORCE_BUILD_VIA_PLAN = ORIGINAL_ENV;
		}
	});

	const editInput = {
		task: 'patch one expression',
		workflowId: 'WF_EXISTING',
		bypassPlan: true,
		reason: 'Swap Slack channel on this notifier.',
	};

	it('suspends before spawning when updateWorkflow requires approval', async () => {
		const context = createSpawnableContext({ updateWorkflow: 'require_approval' });
		const suspend = jest.fn().mockResolvedValue(undefined);
		const tool = createBuildWorkflowAgentTool(context) as unknown as BuildExecutable;

		const out = await tool.execute(editInput, { agent: { suspend } });

		expect(out).toEqual({ result: '', taskId: '' });
		expect(suspend).toHaveBeenCalledWith(
			expect.objectContaining({
				message:
					'Edit existing workflow "Existing Workflow" (ID: WF_EXISTING)? Reason: Swap Slack channel on this notifier.',
				severity: 'warning',
			}),
		);
		expect(context.spawnBackgroundTask).not.toHaveBeenCalled();
	});

	it('spawns when approval resume data is approved', async () => {
		const context = createSpawnableContext({ updateWorkflow: 'require_approval' });
		const tool = createBuildWorkflowAgentTool(context) as unknown as BuildExecutable;

		const out = await tool.execute(editInput, {
			agent: { resumeData: { approved: true } },
		});

		expect(out.taskId).toMatch(/^build-/);
		expect(context.spawnBackgroundTask).toHaveBeenCalledTimes(1);
	});

	it('does not spawn when approval resume data is denied', async () => {
		const context = createSpawnableContext({ updateWorkflow: 'require_approval' });
		const tool = createBuildWorkflowAgentTool(context) as unknown as BuildExecutable;

		const out = await tool.execute(editInput, {
			agent: { resumeData: { approved: false } },
		});

		expect(out).toEqual({ result: 'User declined the workflow edit.', taskId: '' });
		expect(context.spawnBackgroundTask).not.toHaveBeenCalled();
	});

	it('skips suspend when updateWorkflow is always_allow', async () => {
		const context = createSpawnableContext({ updateWorkflow: 'always_allow' });
		const suspend = jest.fn().mockResolvedValue(undefined);
		const tool = createBuildWorkflowAgentTool(context) as unknown as BuildExecutable;

		await tool.execute(editInput, { agent: { suspend } });

		expect(suspend).not.toHaveBeenCalled();
		expect(context.spawnBackgroundTask).toHaveBeenCalledTimes(1);
	});

	it('does not apply the edit approval gate without a workflowId', async () => {
		process.env.N8N_INSTANCE_AI_ENFORCE_BUILD_VIA_PLAN = 'false';
		const context = createSpawnableContext({ updateWorkflow: 'require_approval' });
		const suspend = jest.fn().mockResolvedValue(undefined);
		const tool = createBuildWorkflowAgentTool(context) as unknown as BuildExecutable;

		await tool.execute({ task: 'build a new workflow' }, { agent: { suspend } });

		expect(suspend).not.toHaveBeenCalled();
		expect(context.spawnBackgroundTask).toHaveBeenCalledTimes(1);
	});

	it('does not apply the edit approval gate without domain context', async () => {
		const context = createMockContext({
			domainTools: { 'build-workflow': {} },
			spawnBackgroundTask: jest.fn().mockReturnValue({
				status: 'started',
				taskId: 'build-task',
				agentId: 'agent-builder',
			}),
		});
		const suspend = jest.fn().mockResolvedValue(undefined);
		const tool = createBuildWorkflowAgentTool(context) as unknown as BuildExecutable;

		await tool.execute(editInput, { agent: { suspend } });

		expect(suspend).not.toHaveBeenCalled();
		expect(context.spawnBackgroundTask).toHaveBeenCalledTimes(1);
	});

	it('skips suspend in a replan follow-up', async () => {
		const context = createSpawnableContext(
			{ updateWorkflow: 'require_approval' },
			{ isReplanFollowUp: true },
		);
		const suspend = jest.fn().mockResolvedValue(undefined);
		const tool = createBuildWorkflowAgentTool(context) as unknown as BuildExecutable;

		await tool.execute(editInput, { agent: { suspend } });

		expect(suspend).not.toHaveBeenCalled();
		expect(context.spawnBackgroundTask).toHaveBeenCalledTimes(1);
	});

	it('skips suspend in a checkpoint follow-up', async () => {
		const context = createSpawnableContext(
			{ updateWorkflow: 'require_approval' },
			{ isCheckpointFollowUp: true },
		);
		const suspend = jest.fn().mockResolvedValue(undefined);
		const tool = createBuildWorkflowAgentTool(context) as unknown as BuildExecutable;

		await tool.execute(editInput, { agent: { suspend } });

		expect(suspend).not.toHaveBeenCalled();
		expect(context.spawnBackgroundTask).toHaveBeenCalledTimes(1);
	});

	it('denies without suspend or spawn when updateWorkflow is blocked', async () => {
		const context = createSpawnableContext({ updateWorkflow: 'blocked' });
		const suspend = jest.fn().mockResolvedValue(undefined);
		const tool = createBuildWorkflowAgentTool(context) as unknown as BuildExecutable;

		const out = await tool.execute(editInput, { agent: { suspend } });

		expect(out).toEqual({ result: 'Action blocked by admin', taskId: '' });
		expect(suspend).not.toHaveBeenCalled();
		expect(context.spawnBackgroundTask).not.toHaveBeenCalled();
	});

	it('denies branch read-only edits without suspend or spawn', async () => {
		const readOnlyPermissions = applyBranchReadOnlyOverrides({
			...DEFAULT_INSTANCE_AI_PERMISSIONS,
		});
		const context = createSpawnableContext(readOnlyPermissions);
		const suspend = jest.fn().mockResolvedValue(undefined);
		const tool = createBuildWorkflowAgentTool(context) as unknown as BuildExecutable;

		const out = await tool.execute(editInput, { agent: { suspend } });

		expect(out).toEqual({ result: 'Action blocked by admin', taskId: '' });
		expect(suspend).not.toHaveBeenCalled();
		expect(context.spawnBackgroundTask).not.toHaveBeenCalled();
	});

	it('skips suspend when the workflow was created earlier in the plan cycle', async () => {
		const context = createSpawnableContext({ updateWorkflow: 'require_approval' });
		(context.domainContext as InstanceAiContext).aiCreatedWorkflowIds = new Set([
			editInput.workflowId,
		]);
		const suspend = jest.fn().mockResolvedValue(undefined);
		const tool = createBuildWorkflowAgentTool(context) as unknown as BuildExecutable;

		await tool.execute(editInput, { agent: { suspend } });

		expect(suspend).not.toHaveBeenCalled();
		expect(context.spawnBackgroundTask).toHaveBeenCalledTimes(1);
	});

	it('still denies blocked edits even when the workflow is in the active plan cycle', async () => {
		const context = createSpawnableContext({ updateWorkflow: 'blocked' });
		(context.domainContext as InstanceAiContext).aiCreatedWorkflowIds = new Set([
			editInput.workflowId,
		]);
		const suspend = jest.fn().mockResolvedValue(undefined);
		const tool = createBuildWorkflowAgentTool(context) as unknown as BuildExecutable;

		const out = await tool.execute(editInput, { agent: { suspend } });

		expect(out).toEqual({ result: 'Action blocked by admin', taskId: '' });
		expect(suspend).not.toHaveBeenCalled();
		expect(context.spawnBackgroundTask).not.toHaveBeenCalled();
	});
});

describe('recordSuccessfulWorkflowBuilds', () => {
	it('records workflow IDs returned from successful build-workflow executions', async () => {
		const onWorkflowId = jest.fn();
		const input = { prompt: 'build it' };
		const context = { runId: 'run-1' };
		const result = { success: true, workflowId: 'wf-main', displayName: 'Main' };
		const execute = jest.fn(
			async (_input: unknown, _context?: unknown) => await Promise.resolve(result),
		);
		const tool = { execute };

		recordSuccessfulWorkflowBuilds(tool, onWorkflowId);

		await expect(tool.execute(input, context)).resolves.toBe(result);
		expect(execute).toHaveBeenCalledWith(input, context);
		expect(onWorkflowId).toHaveBeenCalledWith('wf-main');
	});

	it('does not record failed or incomplete build-workflow results', async () => {
		const onWorkflowId = jest.fn();
		const execute = jest
			.fn()
			.mockResolvedValueOnce({ success: false, workflowId: 'wf-failed' })
			.mockResolvedValueOnce({ success: true });
		const tool = { execute };

		recordSuccessfulWorkflowBuilds(tool, onWorkflowId);

		await tool.execute({});
		await tool.execute({});
		expect(onWorkflowId).not.toHaveBeenCalled();
	});
});
