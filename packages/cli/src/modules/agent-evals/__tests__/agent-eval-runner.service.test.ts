import type { GlobalConfig } from '@n8n/config';
import type {
	AgentEvalDataset,
	AgentEvalResult,
	AgentEvalDatasetRepository,
	AgentEvalResultRepository,
	AgentEvalRunRepository,
	User,
} from '@n8n/db';
import type { InstanceSettings } from 'n8n-core';
import { mock, type MockProxy } from 'vitest-mock-extended';

import type { ConcurrencyControlService } from '@/concurrency/concurrency-control.service';
import { resolveEvaluationConcurrencyLimit } from '@/evaluation.ee/evaluation-concurrency.helper';
import type { License } from '@/license';
import type { Agent } from '@/modules/agents/entities/agent.entity';
import type { AgentRepository } from '@/modules/agents/repositories/agent.repository';
import type { DataTableService } from '@/modules/data-table/data-table.service';
import type { EvalAgentExecutionService } from '@/modules/instance-ai/eval/agent-execution.service';
import { userHasScopes } from '@/permissions.ee/check-access';

import { AgentEvalRunnerService } from '../agent-eval-runner.service';

// Stub the cross-module specifiers the service statically imports so the unit
// test doesn't pull in the real agents / data-table / instance-ai module graph.
vi.mock('@/concurrency/concurrency-control.service', () => ({
	ConcurrencyControlService: class ConcurrencyControlService {},
}));
vi.mock('@/license', () => ({ License: class License {} }));
vi.mock('@/evaluation.ee/evaluation-concurrency.helper', () => ({
	// Fixed per-run limit keeps the pool deterministic (serial) in unit tests.
	resolveEvaluationConcurrencyLimit: vi.fn().mockReturnValue(1),
}));
vi.mock('@/modules/agents/repositories/agent.repository', () => ({
	AgentRepository: class AgentRepository {},
}));
vi.mock('@/modules/data-table/data-table.service', () => ({
	DataTableService: class DataTableService {},
}));
vi.mock('@/modules/instance-ai/eval/agent-execution.service', () => ({
	EvalAgentExecutionService: class EvalAgentExecutionService {},
}));
vi.mock('@/permissions.ee/check-access', () => ({
	userHasScopes: vi.fn().mockResolvedValue(true),
}));

type StatusCounts = {
	new: number;
	running: number;
	success: number;
	error: number;
	cancelled: number;
};
const counts = (partial: Partial<StatusCounts>): StatusCounts => ({
	new: 0,
	running: 0,
	success: 0,
	error: 0,
	cancelled: 0,
	...partial,
});

const successExec = (usage = { inputTokens: 3, outputTokens: 7 }) => ({
	runId: 'exec',
	success: true,
	errors: [],
	finalText: 'the answer',
	model: 'test-model',
	finishReason: 'stop',
	toolCalls: [{ tool: 'lookup', kind: 'node', mocked: true, interceptedRequests: [] }],
	modelTurns: [],
	usage,
	seed: { openingMessage: 'hi', globalContext: '', toolHints: {}, warnings: [] },
	skippedFeatures: [],
	mockedCredentials: [],
});

const failExec = () => ({
	runId: '',
	success: false,
	errors: ['model exploded'],
	finalText: '',
	toolCalls: [],
	modelTurns: [],
	seed: { openingMessage: '', globalContext: '', toolHints: {}, warnings: [] },
	skippedFeatures: [],
	mockedCredentials: [],
});

describe('AgentEvalRunnerService', () => {
	const user = mock<User>({ id: 'user-1' });

	let globalConfig: GlobalConfig;
	let instanceSettings: InstanceSettings;
	let datasetRepository: MockProxy<AgentEvalDatasetRepository>;
	let runRepository: MockProxy<AgentEvalRunRepository>;
	let resultRepository: MockProxy<AgentEvalResultRepository>;
	let agentRepository: MockProxy<AgentRepository>;
	let dataTableService: MockProxy<DataTableService>;
	let evalAgentExecutionService: MockProxy<EvalAgentExecutionService>;
	let concurrencyControl: MockProxy<ConcurrencyControlService>;
	let license: MockProxy<License>;
	let service: AgentEvalRunnerService;

	const dataset = mock<AgentEvalDataset>({
		id: 'ds-1',
		agentId: 'agent-1',
		datasetSource: 'data_table',
		datasetRef: { dataTableId: 'dt-1' },
		columnMapping: { input: 'question', expectedOutput: 'answer', criteria: 'check' },
	});

	beforeEach(() => {
		vi.mocked(userHasScopes).mockResolvedValue(true);
		vi.mocked(resolveEvaluationConcurrencyLimit).mockReturnValue(1); // serial by default

		globalConfig = {
			evaluation: { agentEvalsEnabled: true },
			executions: { mode: 'regular' },
		} as unknown as GlobalConfig;
		instanceSettings = { hostId: 'main-1' } as unknown as InstanceSettings;
		datasetRepository = mock<AgentEvalDatasetRepository>();
		runRepository = mock<AgentEvalRunRepository>();
		resultRepository = mock<AgentEvalResultRepository>();
		agentRepository = mock<AgentRepository>();
		dataTableService = mock<DataTableService>();
		evalAgentExecutionService = mock<EvalAgentExecutionService>();
		concurrencyControl = mock<ConcurrencyControlService>();
		license = mock<License>();

		datasetRepository.findById.mockResolvedValue(dataset);
		agentRepository.findByIdAndProjectId.mockResolvedValue(
			mock<Agent>({ id: 'agent-1', activeVersionId: 'v-1' }),
		);
		runRepository.createRun.mockResolvedValue(mock({ id: 'run-1' }));
		runRepository.isCancellationRequested.mockResolvedValue(false);
		concurrencyControl.throttle.mockResolvedValue(undefined); // slot acquired
		dataTableService.getProjectIdForDataTable.mockResolvedValue('proj-table');
		// Columns backing the dataset's mapping (input/expectedOutput/criteria).
		dataTableService.getColumns.mockResolvedValue([
			{ name: 'question' },
			{ name: 'answer' },
			{ name: 'check' },
		] as never);

		service = new AgentEvalRunnerService(
			mock(),
			globalConfig,
			instanceSettings,
			datasetRepository,
			runRepository,
			resultRepository,
			agentRepository,
			dataTableService,
			evalAgentExecutionService,
			concurrencyControl,
			license,
		);
	});

	/** Set up one page of rows + seeded results + a final status count. */
	const seedFor = (rows: Array<Record<string, unknown>>, endCounts: Partial<StatusCounts> = {}) => {
		dataTableService.getManyRowsAndCount.mockResolvedValue({
			count: rows.length,
			data: rows as never,
		});
		resultRepository.seedResults.mockImplementation(async (cases) =>
			cases.map((_c, i) => mock<AgentEvalResult>({ id: `res-${i}`, status: 'new' })),
		);
		resultRepository.countByStatus.mockResolvedValue(counts(endCounts));
	};

	describe('gating', () => {
		it('refuses when the flag is off', async () => {
			globalConfig.evaluation.agentEvalsEnabled = false;
			await expect(service.startRun('ds-1', 'proj-1', user)).rejects.toThrow(
				'Agent evals are not enabled',
			);
			expect(runRepository.createRun).not.toHaveBeenCalled();
		});

		it('refuses in queue mode', async () => {
			globalConfig.executions.mode = 'queue';
			await expect(service.startRun('ds-1', 'proj-1', user)).rejects.toThrow('queue mode');
			expect(runRepository.createRun).not.toHaveBeenCalled();
		});

		it('rejects when the user cannot run agents in the project', async () => {
			vi.mocked(userHasScopes).mockResolvedValueOnce(false); // agent:execute check
			await expect(service.startRun('ds-1', 'proj-1', user)).rejects.toThrow(
				'permission to run agents',
			);
			expect(runRepository.createRun).not.toHaveBeenCalled();
		});

		it('404s when the dataset is missing', async () => {
			datasetRepository.findById.mockResolvedValue(null);
			await expect(service.startRun('ds-x', 'proj-1', user)).rejects.toThrow('not found');
		});

		it('rejects non-data_table datasets', async () => {
			datasetRepository.findById.mockResolvedValue(
				mock<AgentEvalDataset>({ ...dataset, datasetSource: 'google_sheets' }),
			);
			await expect(service.startRun('ds-1', 'proj-1', user)).rejects.toThrow('data_table');
		});

		it('rejects a dataset with no rows', async () => {
			seedFor([]);
			await expect(service.startRun('ds-1', 'proj-1', user)).rejects.toThrow('no rows');
			expect(runRepository.createRun).not.toHaveBeenCalled();
		});

		it('rejects a dataset that exceeds the case limit', async () => {
			dataTableService.getManyRowsAndCount.mockResolvedValue({ count: 501, data: [] as never });
			await expect(service.startRun('ds-1', 'proj-1', user)).rejects.toThrow(
				'exceeding the 500-case limit',
			);
			expect(runRepository.createRun).not.toHaveBeenCalled();
		});

		it('rejects when a mapped column is missing from the table', async () => {
			dataTableService.getColumns.mockResolvedValue([
				{ name: 'answer' },
				{ name: 'check' },
			] as never);
			await expect(service.startRun('ds-1', 'proj-1', user)).rejects.toThrow("input → 'question'");
			expect(runRepository.createRun).not.toHaveBeenCalled();
		});
	});

	describe('run creation', () => {
		it('marks the run errored (not left `new`) when seeding fails', async () => {
			seedFor([{ id: 'row-1', question: 'Q' }]);
			resultRepository.seedResults.mockRejectedValue(new Error('db down'));

			await expect(service.startRun('ds-1', 'proj-1', user)).rejects.toThrow('db down');

			expect(runRepository.markAsError).toHaveBeenCalledWith(
				'run-1',
				'seed_failed',
				expect.objectContaining({ message: 'db down' }),
			);
			expect(runRepository.markAsRunning).not.toHaveBeenCalled();
		});
	});

	describe('running cases', () => {
		it('runs each case with its input verbatim, persists results, aggregates the run', async () => {
			seedFor(
				[
					{ id: 'row-1', question: 'What is 2+2?', answer: '4', check: 'is 4' },
					{ id: 'row-2', question: 'Capital of France?', answer: 'Paris', check: 'is Paris' },
				],
				{ success: 2 },
			);
			evalAgentExecutionService.executeWithLlmMock.mockResolvedValue(successExec() as never);

			const { runId, finished } = await service.startRun('ds-1', 'proj-1', user);
			await finished;

			expect(runId).toBe('run-1');
			// records who started it; version is left unpinned (execution runs the
			// live agent config, so no version is claimed).
			expect(runRepository.createRun).toHaveBeenCalledWith({
				datasetId: 'ds-1',
				agentVersionId: null,
				createdById: 'user-1',
			});
			// each case fed its own input as the 4th arg (caseInput)
			expect(evalAgentExecutionService.executeWithLlmMock).toHaveBeenCalledTimes(2);
			expect(evalAgentExecutionService.executeWithLlmMock).toHaveBeenCalledWith(
				'agent-1',
				user,
				{ projectId: 'proj-1' },
				'What is 2+2?',
			);
			expect(runRepository.markAsRunning).toHaveBeenCalledWith('run-1', 'main-1');
			expect(resultRepository.markAsCompleted).toHaveBeenCalledTimes(2);
			expect(runRepository.markAsCompleted).toHaveBeenCalledWith(
				'run-1',
				expect.objectContaining({
					success: 2,
					error: 0,
					usage: { inputTokens: 6, outputTokens: 14 },
				}),
			);
		});

		it('snapshots input/expectedOutput/criteria onto the seeded case', async () => {
			seedFor([{ id: 'row-1', question: 'Q', answer: 'A', check: 'C' }], { success: 1 });
			evalAgentExecutionService.executeWithLlmMock.mockResolvedValue(successExec() as never);

			const { finished } = await service.startRun('ds-1', 'proj-1', user);
			await finished;

			expect(resultRepository.seedResults).toHaveBeenCalledWith([
				{
					runId: 'run-1',
					sourceRowId: 'row-1',
					runIndex: 0,
					input: { input: 'Q', expectedOutput: 'A', criteria: 'C' },
				},
			]);
		});

		it('records a failed execution as an errored result but still completes the run', async () => {
			seedFor([{ id: 'row-1', question: 'Q' }], { error: 1 });
			evalAgentExecutionService.executeWithLlmMock.mockResolvedValue(failExec() as never);

			const { finished } = await service.startRun('ds-1', 'proj-1', user);
			await finished;

			expect(resultRepository.markAsError).toHaveBeenCalledWith(
				'res-0',
				'execution_failed',
				expect.objectContaining({ errors: ['model exploded'] }),
			);
			expect(runRepository.markAsCompleted).toHaveBeenCalled();
		});

		it('isolates a thrown execution error as a per-case error and still completes the run', async () => {
			seedFor(
				[
					{ id: 'row-1', question: 'Q1' },
					{ id: 'row-2', question: 'Q2' },
				],
				{ success: 1, error: 1 },
			);
			// Fail deterministically by input (cases run concurrently, so call order
			// isn't guaranteed): the 'Q1' case throws, the other succeeds.
			evalAgentExecutionService.executeWithLlmMock.mockImplementation(async (_a, _u, _o, input) => {
				if (input === 'Q1') throw new Error('transient failure');
				return successExec() as never;
			});

			const { finished } = await service.startRun('ds-1', 'proj-1', user);
			await finished;

			expect(resultRepository.markAsError).toHaveBeenCalledWith(
				'res-0',
				'execution_failed',
				expect.objectContaining({ message: 'transient failure' }),
			);
			expect(resultRepository.markAsCompleted).toHaveBeenCalledTimes(1);
			expect(runRepository.markAsCompleted).toHaveBeenCalled();
			expect(runRepository.markAsError).not.toHaveBeenCalled();
		});

		it('errors an empty-input case without invoking the agent', async () => {
			seedFor([{ id: 'row-1', question: '   ' }], { error: 1 });

			const { finished } = await service.startRun('ds-1', 'proj-1', user);
			await finished;

			expect(evalAgentExecutionService.executeWithLlmMock).not.toHaveBeenCalled();
			expect(resultRepository.markAsError).toHaveBeenCalledWith(
				'res-0',
				'empty_input',
				expect.anything(),
			);
		});

		it('pages through every row when the table exceeds one page', async () => {
			const page = (start: number, len: number) =>
				Array.from({ length: len }, (_, i) => ({ id: `r${start + i}`, question: `Q${start + i}` }));
			dataTableService.getManyRowsAndCount.mockImplementation(async (_id, _p, dto) =>
				(dto?.skip ?? 0) === 0
					? { count: 120, data: page(0, 100) as never }
					: { count: 120, data: page(100, 20) as never },
			);
			resultRepository.seedResults.mockImplementation(async (cases) =>
				cases.map((_c, i) => mock<AgentEvalResult>({ id: `res-${i}`, status: 'new' })),
			);
			resultRepository.countByStatus.mockResolvedValue(counts({ success: 120 }));
			evalAgentExecutionService.executeWithLlmMock.mockResolvedValue(successExec() as never);

			const { finished } = await service.startRun('ds-1', 'proj-1', user);
			await finished;

			expect(resultRepository.seedResults).toHaveBeenCalledTimes(1);
			expect(resultRepository.seedResults.mock.calls[0]?.[0]).toHaveLength(120);
			expect(evalAgentExecutionService.executeWithLlmMock).toHaveBeenCalledTimes(120);
		});
	});

	describe('cancellation', () => {
		it('marks cases and the run cancelled when cancellation is requested', async () => {
			seedFor(
				[
					{ id: 'row-1', question: 'Q' },
					{ id: 'row-2', question: 'Q2' },
				],
				{ cancelled: 2 },
			);
			runRepository.isCancellationRequested.mockResolvedValue(true);

			const { finished } = await service.startRun('ds-1', 'proj-1', user);
			await finished;

			expect(evalAgentExecutionService.executeWithLlmMock).not.toHaveBeenCalled();
			expect(resultRepository.markAsCancelled).toHaveBeenCalled();
			// cancel still records the partial metrics gathered before stopping
			expect(runRepository.markAsCancelled).toHaveBeenCalledWith(
				'run-1',
				expect.objectContaining({ cancelled: 2 }),
			);
			expect(runRepository.markAsCompleted).not.toHaveBeenCalled();
		});

		it('cancels the run when Stop arrives after every case has already run', async () => {
			seedFor([{ id: 'row-1', question: 'Q' }], { success: 1 });
			// The case's pre-throttle and post-acquire checks see no cancel (so it
			// runs); the cancel only lands by the final post-pool re-check.
			runRepository.isCancellationRequested
				.mockResolvedValueOnce(false)
				.mockResolvedValueOnce(false)
				.mockResolvedValue(true);
			evalAgentExecutionService.executeWithLlmMock.mockResolvedValue(successExec() as never);

			const { finished } = await service.startRun('ds-1', 'proj-1', user);
			await finished;

			expect(evalAgentExecutionService.executeWithLlmMock).toHaveBeenCalledTimes(1);
			expect(runRepository.markAsCancelled).toHaveBeenCalled();
			expect(runRepository.markAsCompleted).not.toHaveBeenCalled();
		});
	});

	describe('concurrency', () => {
		it('runs each case through the shared evaluation queue and releases the slot', async () => {
			seedFor(
				[
					{ id: 'row-1', question: 'Q1' },
					{ id: 'row-2', question: 'Q2' },
				],
				{ success: 2 },
			);
			evalAgentExecutionService.executeWithLlmMock.mockResolvedValue(successExec() as never);

			const { finished } = await service.startRun('ds-1', 'proj-1', user);
			await finished;

			expect(concurrencyControl.throttle).toHaveBeenCalledTimes(2);
			expect(concurrencyControl.throttle).toHaveBeenCalledWith(
				expect.objectContaining({ mode: 'evaluation' }),
			);
			expect(concurrencyControl.release).toHaveBeenCalledTimes(2);
			expect(concurrencyControl.release).toHaveBeenCalledWith({ mode: 'evaluation' });
		});

		it('evicts a still-queued case from the shared queue when the run is cancelled', async () => {
			vi.mocked(resolveEvaluationConcurrencyLimit).mockReturnValue(2); // admit both at once
			seedFor(
				[
					{ id: 'row-1', question: 'Q0' },
					{ id: 'row-2', question: 'Q1' },
				],
				{ cancelled: 2 },
			);
			// case-0 acquires immediately; case-1 stays parked in the queue.
			concurrencyControl.throttle.mockImplementation(async ({ executionId }) => {
				if (executionId.endsWith('-case-1')) return await new Promise<void>(() => {}); // parked
				return undefined;
			});
			// Both pass the pre-throttle check; case-0's post-acquire check then sees
			// the cancel and aborts, which must evict the parked case-1.
			runRepository.isCancellationRequested
				.mockResolvedValueOnce(false)
				.mockResolvedValueOnce(false)
				.mockResolvedValue(true);

			const { finished } = await service.startRun('ds-1', 'proj-1', user);
			await finished;

			expect(concurrencyControl.remove).toHaveBeenCalledWith(
				expect.objectContaining({
					mode: 'evaluation',
					executionId: expect.stringContaining('-case-1'),
				}),
			);
			expect(runRepository.markAsCancelled).toHaveBeenCalledWith('run-1', expect.anything());
			expect(evalAgentExecutionService.executeWithLlmMock).not.toHaveBeenCalled();
		});

		it('releases a slot granted at the same moment the run is cancelled (no leak)', async () => {
			vi.mocked(resolveEvaluationConcurrencyLimit).mockReturnValue(2); // admit both at once
			seedFor(
				[
					{ id: 'row-1', question: 'Q0' },
					{ id: 'row-2', question: 'Q1' },
				],
				{ cancelled: 2 },
			);
			// case-0 acquires immediately; case-1 stays parked until granted below.
			let grantParkedCase: (() => void) | undefined;
			concurrencyControl.throttle.mockImplementation(async ({ executionId }) => {
				if (executionId.endsWith('-case-1')) {
					await new Promise<void>((resolve) => {
						grantParkedCase = resolve;
					});
				}
			});
			// case-0 runs, then its post-acquire check sees the cancel and aborts.
			runRepository.isCancellationRequested
				.mockResolvedValueOnce(false)
				.mockResolvedValueOnce(false)
				.mockResolvedValue(true);

			const { finished } = await service.startRun('ds-1', 'proj-1', user);
			await finished;

			// case-1 was aborted while parked, so only case-0's slot is released so far.
			expect(concurrencyControl.release).toHaveBeenCalledTimes(1);

			// The queue grants case-1 late (racing the abort) — its slot must be
			// released, not silently dropped (which would leak a slot forever).
			grantParkedCase?.();
			await new Promise((resolve) => setImmediate(resolve));
			expect(concurrencyControl.release).toHaveBeenCalledTimes(2);
		});
	});

	describe('getRunSummary', () => {
		it('404s when the run is missing', async () => {
			runRepository.findById.mockResolvedValue(null);
			await expect(service.getRunSummary('run-x')).rejects.toThrow('not found');
		});

		it('reports status + per-status counts from the count query', async () => {
			runRepository.findById.mockResolvedValue(mock({ id: 'run-1', status: 'completed' }));
			resultRepository.countByStatus.mockResolvedValue(
				counts({ success: 3, error: 1, running: 1 }),
			);

			const summary = await service.getRunSummary('run-1');

			expect(summary).toEqual({
				runId: 'run-1',
				status: 'completed',
				counts: { total: 5, success: 3, error: 1, cancelled: 0, pending: 1 },
			});
		});
	});

	describe('cleanupInterruptedRuns', () => {
		it('sweeps incomplete runs and never throws', async () => {
			runRepository.markAllIncompleteAsError.mockResolvedValue({
				affected: 2,
				raw: [],
				generatedMaps: [],
			});
			await expect(service.cleanupInterruptedRuns()).resolves.toBeUndefined();
			expect(runRepository.markAllIncompleteAsError).toHaveBeenCalled();
		});

		it('swallows a sweep failure so it cannot block startup', async () => {
			runRepository.markAllIncompleteAsError.mockRejectedValue(new Error('db down'));
			await expect(service.cleanupInterruptedRuns()).resolves.toBeUndefined();
		});

		it('does not sweep in queue mode (never touches another main’s runs)', async () => {
			globalConfig.executions.mode = 'queue';
			await service.cleanupInterruptedRuns();
			expect(runRepository.markAllIncompleteAsError).not.toHaveBeenCalled();
		});
	});
});
