import type {
	CheckpointSettleResult,
	OrchestrationContext,
	PlannedTaskService,
} from '../../../types';

// Mock heavy Mastra dependencies to avoid ESM issues in Jest
jest.mock('@mastra/core/tools', () => ({
	createTool: jest.fn((config: Record<string, unknown>) => config),
}));

const { createCompleteCheckpointTool } =
	// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/consistent-type-imports
	require('../complete-checkpoint.tool') as typeof import('../complete-checkpoint.tool');

type Executable = {
	execute: (input: unknown) => Promise<{ ok: boolean; result: string }>;
};

function makeService(overrides: Partial<PlannedTaskService> = {}): PlannedTaskService {
	return {
		markCheckpointSucceeded: jest.fn(),
		markCheckpointFailed: jest.fn(),
		...overrides,
	} as unknown as PlannedTaskService;
}

function makeContext(service: PlannedTaskService): OrchestrationContext {
	return {
		threadId: 'thread-1',
		runId: 'run-1',
		userId: 'user-1',
		orchestratorAgentId: 'orc',
		modelId: 'model' as OrchestrationContext['modelId'],
		storage: {} as OrchestrationContext['storage'],
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
		taskStorage: { get: jest.fn(), save: jest.fn() },
		plannedTaskService: service,
	};
}

describe('createCompleteCheckpointTool', () => {
	it('marks a checkpoint succeeded via markCheckpointSucceeded', async () => {
		const service = makeService({
			markCheckpointSucceeded: jest
				.fn()
				.mockResolvedValue({ ok: true, graph: { tasks: [], planRunId: 'r', status: 'active' } }),
		});
		const tool = createCompleteCheckpointTool(makeContext(service)) as unknown as Executable;

		const res = await tool.execute({
			taskId: 'verify-1',
			status: 'succeeded',
			result: 'Verified',
		});

		expect(res.ok).toBe(true);
		expect(res.result).toContain('succeeded');
		expect(service.markCheckpointSucceeded).toHaveBeenCalledWith('thread-1', 'verify-1', {
			result: 'Verified',
			outcome: undefined,
		});
		expect(service.markCheckpointFailed).not.toHaveBeenCalled();
	});

	it('marks a checkpoint failed via markCheckpointFailed', async () => {
		const service = makeService({
			markCheckpointFailed: jest
				.fn()
				.mockResolvedValue({ ok: true, graph: { tasks: [], planRunId: 'r', status: 'active' } }),
		});
		const tool = createCompleteCheckpointTool(makeContext(service)) as unknown as Executable;

		const res = await tool.execute({
			taskId: 'verify-1',
			status: 'failed',
			error: 'Workflow errored',
		});

		expect(res.ok).toBe(true);
		expect(service.markCheckpointFailed).toHaveBeenCalledWith('thread-1', 'verify-1', {
			error: 'Workflow errored',
			outcome: undefined,
		});
	});

	it('forwards structured outcome to markCheckpointFailed so replans keep execution context', async () => {
		const service = makeService({
			markCheckpointFailed: jest
				.fn()
				.mockResolvedValue({ ok: true, graph: { tasks: [], planRunId: 'r', status: 'active' } }),
		});
		const tool = createCompleteCheckpointTool(makeContext(service)) as unknown as Executable;

		await tool.execute({
			taskId: 'verify-1',
			status: 'failed',
			error: 'Node crashed',
			outcome: {
				executionId: 'exec-42',
				failureNode: 'Insert Row',
				errorMessage: 'constraint violation',
			},
		});

		expect(service.markCheckpointFailed).toHaveBeenCalledWith('thread-1', 'verify-1', {
			error: 'Node crashed',
			outcome: {
				executionId: 'exec-42',
				failureNode: 'Insert Row',
				errorMessage: 'constraint violation',
			},
		});
	});

	it('returns error string (not throw) on not-found', async () => {
		const not: CheckpointSettleResult = { ok: false, reason: 'not-found' };
		const service = makeService({
			markCheckpointSucceeded: jest.fn().mockResolvedValue(not),
		});
		const tool = createCompleteCheckpointTool(makeContext(service)) as unknown as Executable;

		const res = await tool.execute({ taskId: 'missing', status: 'succeeded' });

		expect(res.ok).toBe(false);
		expect(res.result).toContain('no task with id');
	});

	it('returns error string on wrong-kind', async () => {
		const wk: CheckpointSettleResult = {
			ok: false,
			reason: 'wrong-kind',
			actual: { kind: 'build-workflow' },
		};
		const service = makeService({
			markCheckpointSucceeded: jest.fn().mockResolvedValue(wk),
		});
		const tool = createCompleteCheckpointTool(makeContext(service)) as unknown as Executable;

		const res = await tool.execute({ taskId: 'wf-1', status: 'succeeded' });

		expect(res.ok).toBe(false);
		expect(res.result).toContain('not a checkpoint');
		expect(res.result).toContain('build-workflow');
	});

	it('returns error string on wrong-status', async () => {
		const ws: CheckpointSettleResult = {
			ok: false,
			reason: 'wrong-status',
			actual: { status: 'planned' },
		};
		const service = makeService({
			markCheckpointSucceeded: jest.fn().mockResolvedValue(ws),
		});
		const tool = createCompleteCheckpointTool(makeContext(service)) as unknown as Executable;

		const res = await tool.execute({ taskId: 'verify-1', status: 'succeeded' });

		expect(res.ok).toBe(false);
		expect(res.result).toContain('not in running state');
		expect(res.result).toContain('planned');
	});

	it('returns an error when planned task service is absent', async () => {
		const tool = createCompleteCheckpointTool({
			...makeContext(makeService()),
			plannedTaskService: undefined,
		} as OrchestrationContext) as unknown as Executable;

		const res = await tool.execute({ taskId: 'verify-1', status: 'succeeded' });

		expect(res.ok).toBe(false);
		expect(res.result).toContain('not available');
	});

	it('defaults failed-error to result or a sensible default', async () => {
		const service = makeService({
			markCheckpointFailed: jest
				.fn()
				.mockResolvedValue({ ok: true, graph: { tasks: [], planRunId: 'r', status: 'active' } }),
		});
		const tool = createCompleteCheckpointTool(makeContext(service)) as unknown as Executable;

		await tool.execute({
			taskId: 'verify-1',
			status: 'failed',
			result: 'Workflow hit 429 during verify',
		});

		expect(service.markCheckpointFailed).toHaveBeenCalledWith('thread-1', 'verify-1', {
			error: 'Workflow hit 429 during verify',
			outcome: undefined,
		});
	});
});
