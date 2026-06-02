import { executeTool } from '../../../__tests__/tool-test-utils';
import { createToolRegistry } from '../../../tool-registry';
import type {
	CheckpointSettleResult,
	OrchestrationContext,
	PlannedTaskGraph,
	PlannedTaskService,
} from '../../../types';

jest.mock('../../workflows/setup-workflow.service', () => ({
	analyzeWorkflow: jest.fn(),
}));

const { analyzeWorkflow } =
	// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/consistent-type-imports
	require('../../workflows/setup-workflow.service') as typeof import('../../workflows/setup-workflow.service');
const { createCompleteCheckpointTool } =
	// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/consistent-type-imports
	require('../complete-checkpoint.tool') as typeof import('../complete-checkpoint.tool');

function makeService(overrides: Partial<PlannedTaskService> = {}): PlannedTaskService {
	return {
		getGraph: jest.fn().mockResolvedValue(null),
		markCheckpointSucceeded: jest.fn(),
		markCheckpointFailed: jest.fn(),
		...overrides,
	} as unknown as PlannedTaskService;
}

function makeContext(
	service: PlannedTaskService,
	overrides: Partial<OrchestrationContext> = {},
): OrchestrationContext {
	return {
		threadId: 'thread-1',
		runId: 'run-1',
		userId: 'user-1',
		orchestratorAgentId: 'orc',
		modelId: 'model' as OrchestrationContext['modelId'],
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
		domainTools: createToolRegistry(),
		abortSignal: new AbortController().signal,
		taskStorage: { get: jest.fn(), save: jest.fn() },
		plannedTaskService: service,
		...overrides,
	};
}

function makeSetupRequiredGraph(): PlannedTaskGraph {
	return {
		planRunId: 'plan-1',
		status: 'active',
		tasks: [
			{
				id: 'wf-1',
				title: 'Build workflow',
				kind: 'build-workflow',
				deps: [],
				spec: 'Build it',
				status: 'succeeded',
				outcome: {
					workflowId: 'saved-wf-1',
					setupRequirement: { status: 'required', reason: 'mocked-credentials' },
				},
			},
			{
				id: 'verify-1',
				title: 'Verify workflow',
				kind: 'checkpoint',
				deps: ['wf-1'],
				spec: 'Verify it',
				status: 'running',
			},
		],
	};
}

describe('createCompleteCheckpointTool', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('marks a checkpoint succeeded via markCheckpointSucceeded', async () => {
		const service = makeService({
			markCheckpointSucceeded: jest
				.fn()
				.mockResolvedValue({ ok: true, graph: { tasks: [], planRunId: 'r', status: 'active' } }),
		});
		const tool = createCompleteCheckpointTool(makeContext(service));

		const res = await executeTool(tool, {
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

	it('does not mark a checkpoint succeeded while dependent workflow setup is pending', async () => {
		const service = makeService({
			getGraph: jest.fn().mockResolvedValue(makeSetupRequiredGraph()),
			markCheckpointSucceeded: jest.fn(),
		});
		(analyzeWorkflow as jest.Mock).mockResolvedValue([
			{
				node: { name: 'Slack' },
				credentialType: 'slackApi',
				needsAction: true,
			},
		]);
		const tool = createCompleteCheckpointTool(
			makeContext(service, { domainContext: {} as OrchestrationContext['domainContext'] }),
		);

		const res = await executeTool(tool, {
			taskId: 'verify-1',
			status: 'succeeded',
			result: 'Verified',
		});

		expect(res.ok).toBe(false);
		expect(res.result).toContain('workflows(action="setup"');
		expect(res.result).toContain('saved-wf-1');
		expect(res.result).toContain('Slack');
		expect(service.markCheckpointSucceeded).not.toHaveBeenCalled();
		expect(service.markCheckpointFailed).not.toHaveBeenCalled();
	});

	it('marks a setup-required checkpoint succeeded after setup has no pending action', async () => {
		const service = makeService({
			getGraph: jest.fn().mockResolvedValue(makeSetupRequiredGraph()),
			markCheckpointSucceeded: jest
				.fn()
				.mockResolvedValue({ ok: true, graph: { tasks: [], planRunId: 'r', status: 'active' } }),
		});
		(analyzeWorkflow as jest.Mock).mockResolvedValue([]);
		const tool = createCompleteCheckpointTool(
			makeContext(service, { domainContext: {} as OrchestrationContext['domainContext'] }),
		);

		const res = await executeTool(tool, {
			taskId: 'verify-1',
			status: 'succeeded',
			result: 'Verified',
		});

		expect(res.ok).toBe(true);
		expect(service.markCheckpointSucceeded).toHaveBeenCalledWith('thread-1', 'verify-1', {
			result: 'Verified',
			outcome: undefined,
		});
	});

	it('marks a checkpoint failed via markCheckpointFailed', async () => {
		const service = makeService({
			markCheckpointFailed: jest
				.fn()
				.mockResolvedValue({ ok: true, graph: { tasks: [], planRunId: 'r', status: 'active' } }),
		});
		const tool = createCompleteCheckpointTool(makeContext(service));

		const res = await executeTool(tool, {
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
		const tool = createCompleteCheckpointTool(makeContext(service));

		await executeTool(tool, {
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
		const tool = createCompleteCheckpointTool(makeContext(service));

		const res = await executeTool(tool, { taskId: 'missing', status: 'succeeded' });

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
		const tool = createCompleteCheckpointTool(makeContext(service));

		const res = await executeTool(tool, { taskId: 'wf-1', status: 'succeeded' });

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
		const tool = createCompleteCheckpointTool(makeContext(service));

		const res = await executeTool(tool, { taskId: 'verify-1', status: 'succeeded' });

		expect(res.ok).toBe(false);
		expect(res.result).toContain('not in running state');
		expect(res.result).toContain('planned');
	});

	it('returns an error when planned task service is absent', async () => {
		const tool = createCompleteCheckpointTool({
			...makeContext(makeService()),
			plannedTaskService: undefined,
		} as OrchestrationContext);

		const res = await executeTool(tool, { taskId: 'verify-1', status: 'succeeded' });

		expect(res.ok).toBe(false);
		expect(res.result).toContain('not available');
	});

	it('defaults failed-error to result or a sensible default', async () => {
		const service = makeService({
			markCheckpointFailed: jest
				.fn()
				.mockResolvedValue({ ok: true, graph: { tasks: [], planRunId: 'r', status: 'active' } }),
		});
		const tool = createCompleteCheckpointTool(makeContext(service));

		await executeTool(tool, {
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
