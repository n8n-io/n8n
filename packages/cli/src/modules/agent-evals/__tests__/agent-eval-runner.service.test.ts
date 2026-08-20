import type { ModuleRegistry } from '@n8n/backend-common';
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
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { resolveEvaluationConcurrencyLimit } from '@/evaluation.ee/evaluation-concurrency.helper';
import type { License } from '@/license';
import type { Agent } from '@/modules/agents/entities/agent.entity';
import type { AgentRepository } from '@/modules/agents/repositories/agent.repository';
import type { DataTableService } from '@/modules/data-table/data-table.service';
import type { EvalAgentExecutionService } from '@/modules/instance-ai/eval/agent-execution.service';
import { userHasScopes } from '@/permissions.ee/check-access';

import { AgentEvalRunnerService } from '../agent-eval-runner.service';
import type { AgentEvalsFlagGate } from '../agent-evals-flag-gate';

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
	let moduleRegistry: MockProxy<ModuleRegistry>;
	let datasetRepository: MockProxy<AgentEvalDatasetRepository>;
	let runRepository: MockProxy<AgentEvalRunRepository>;
	let resultRepository: MockProxy<AgentEvalResultRepository>;
	let agentRepository: MockProxy<AgentRepository>;
	let dataTableService: MockProxy<DataTableService>;
	let evalAgentExecutionService: MockProxy<EvalAgentExecutionService>;
	let concurrencyControl: MockProxy<ConcurrencyControlService>;
	let license: MockProxy<License>;
	let flagGate: MockProxy<AgentEvalsFlagGate>;
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
			// `agentEvalsEnabled` is gone from here: the flag is the gate's business now.
			evaluation: { agentEvalsRunTimeoutMinutes: 60 },
			executions: { mode: 'regular' },
		} as unknown as GlobalConfig;
		instanceSettings = { hostId: 'main-1' } as unknown as InstanceSettings;
		moduleRegistry = mock<ModuleRegistry>();
		moduleRegistry.isActive.mockReturnValue(true);
		datasetRepository = mock<AgentEvalDatasetRepository>();
		runRepository = mock<AgentEvalRunRepository>();
		resultRepository = mock<AgentEvalResultRepository>();
		agentRepository = mock<AgentRepository>();
		dataTableService = mock<DataTableService>();
		evalAgentExecutionService = mock<EvalAgentExecutionService>();
		concurrencyControl = mock<ConcurrencyControlService>();
		license = mock<License>();
		flagGate = mock<AgentEvalsFlagGate>();

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
			moduleRegistry,
			datasetRepository,
			runRepository,
			resultRepository,
			agentRepository,
			dataTableService,
			evalAgentExecutionService,
			concurrencyControl,
			license,
			flagGate,
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
		// The flag is resolved per requesting user (PostHog owns cohort rollout),
		// not per instance — so the gate is asked about `user`, not a config value.
		it('refuses when the flag is off for the requesting user', async () => {
			flagGate.assertEnabled.mockRejectedValue(new NotFoundError('Not found'));

			await expect(service.startRun('ds-1', 'proj-1', user)).rejects.toThrow(NotFoundError);

			expect(flagGate.assertEnabled).toHaveBeenCalledWith(user);
			expect(runRepository.createRun).not.toHaveBeenCalled();
		});

		it('refuses in queue mode', async () => {
			globalConfig.executions.mode = 'queue';
			await expect(service.startRun('ds-1', 'proj-1', user)).rejects.toThrow('queue mode');
			expect(runRepository.createRun).not.toHaveBeenCalled();
		});

		it('refuses when a module the run depends on is inactive', async () => {
			// Entities are registered per module: without this guard the run reaches
			// TypeORM with no `data_table` entity and dies there instead.
			moduleRegistry.isActive.mockImplementation((name) => name !== 'data-table');

			await expect(service.startRun('ds-1', 'proj-1', user)).rejects.toThrow(
				'require these modules to be active: data-table',
			);
			// Not-found, so the whole agent-eval surface reads as absent when a module
			// it depends on is off, rather than half-present.
			await expect(service.startRun('ds-1', 'proj-1', user)).rejects.toThrow(NotFoundError);
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
			// Screened out before the queue: an unusable case must never hold a slot.
			expect(concurrencyControl.throttle).not.toHaveBeenCalled();
			expect(resultRepository.markAsRunning).not.toHaveBeenCalled();
		});

		it('still completes the run when recording an empty-input case fails', async () => {
			seedFor(
				[
					{ id: 'row-1', question: '   ' },
					{ id: 'row-2', question: 'Q2' },
				],
				{ success: 1, error: 1 },
			);
			// This write sits outside `runCase`'s catch, so left unguarded the rejection
			// would settle as a dispatch failure and error an otherwise-successful run.
			resultRepository.markAsError.mockRejectedValueOnce(new Error('db unavailable'));
			evalAgentExecutionService.executeWithLlmMock.mockResolvedValue(successExec() as never);

			const { finished } = await service.startRun('ds-1', 'proj-1', user);
			await finished;

			expect(runRepository.markAsCompleted).toHaveBeenCalled();
			expect(runRepository.markAsError).not.toHaveBeenCalled();
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

	describe('settling the run', () => {
		it('tallies the run even when a cancellation write throws mid-pool', async () => {
			seedFor(
				[
					{ id: 'row-1', question: 'Q1' },
					{ id: 'row-2', question: 'Q2' },
				],
				{ cancelled: 1, new: 1 },
			);
			runRepository.isCancellationRequested.mockResolvedValue(true);
			// This write sits outside `runCase`'s safety net: it used to reject the
			// whole pool, leaving the run errored with no counts recorded.
			resultRepository.markAsCancelled
				.mockRejectedValueOnce(new Error('db down'))
				.mockResolvedValue(undefined as never);

			const { finished } = await service.startRun('ds-1', 'proj-1', user);
			await finished;

			// The surviving case is still processed rather than abandoned mid-flight.
			expect(resultRepository.markAsCancelled).toHaveBeenCalledTimes(2);
			expect(runRepository.markAsCancelled).toHaveBeenCalledWith(
				'run-1',
				expect.objectContaining({ total: 2, cancelled: 1, pending: 1 }),
			);
			expect(runRepository.markAsError).not.toHaveBeenCalled();
		});

		it('reports a dispatch failure with the counts rather than losing the tally', async () => {
			seedFor(
				[
					{ id: 'row-1', question: 'Q1' },
					{ id: 'row-2', question: 'Q2' },
				],
				{ success: 1, new: 1 },
			);
			// The first case's cancellation read blows up; the run itself is not
			// cancelled, so the second case runs to completion.
			runRepository.isCancellationRequested
				.mockRejectedValueOnce(new Error('db down'))
				.mockResolvedValue(false);
			evalAgentExecutionService.executeWithLlmMock.mockResolvedValue(successExec() as never);

			const { finished } = await service.startRun('ds-1', 'proj-1', user);
			await finished;

			expect(evalAgentExecutionService.executeWithLlmMock).toHaveBeenCalledTimes(1);
			expect(runRepository.markAsError).toHaveBeenCalledWith(
				'run-1',
				'case_dispatch_failed',
				expect.objectContaining({ errors: ['db down'] }),
				expect.objectContaining({ total: 2, success: 1 }),
			);
			expect(runRepository.markAsCompleted).not.toHaveBeenCalled();
		});

		it('keeps the tally when the final cancellation read throws', async () => {
			seedFor([{ id: 'row-1', question: 'Q1' }], { success: 1 });
			evalAgentExecutionService.executeWithLlmMock.mockResolvedValue(successExec() as never);
			// Both per-case checks pass, then the post-pool re-read fails. Letting it
			// escape would reach `failRun` and drop the counts entirely.
			runRepository.isCancellationRequested
				.mockResolvedValueOnce(false)
				.mockResolvedValueOnce(false)
				.mockRejectedValue(new Error('db down'));

			const { finished } = await service.startRun('ds-1', 'proj-1', user);
			await finished;

			expect(runRepository.markAsError).toHaveBeenCalledWith(
				'run-1',
				'case_dispatch_failed',
				expect.objectContaining({ errors: ['db down'] }),
				expect.objectContaining({ total: 1, success: 1 }),
			);
			// Not the tally-less `run_failed` path.
			expect(runRepository.markAsError).not.toHaveBeenCalledWith(
				'run-1',
				'run_failed',
				expect.anything(),
			);
		});
	});

	describe('run deadline', () => {
		afterEach(() => {
			vi.useRealTimers();
		});

		it('stops starting cases at the deadline and errors the run as timed out', async () => {
			vi.useFakeTimers();
			globalConfig.evaluation.agentEvalsRunTimeoutMinutes = 30;
			seedFor(
				[
					{ id: 'row-1', question: 'Q1' },
					{ id: 'row-2', question: 'Q2' },
				],
				{ cancelled: 2 },
			);
			// Never granted a slot: on a 1-concurrency plan this is the run that would
			// otherwise sit here until the process restarts.
			concurrencyControl.throttle.mockImplementation(async () => await new Promise<void>(() => {}));

			const { finished } = await service.startRun('ds-1', 'proj-1', user);
			await vi.advanceTimersByTimeAsync(30 * 60_000);
			await finished;

			expect(evalAgentExecutionService.executeWithLlmMock).not.toHaveBeenCalled();
			// The queued case is evicted so it stops holding a place in the queue.
			expect(concurrencyControl.remove).toHaveBeenCalledWith(
				expect.objectContaining({ mode: 'evaluation' }),
			);
			expect(resultRepository.markAsCancelled).toHaveBeenCalledTimes(2);
			expect(runRepository.markAsError).toHaveBeenCalledWith(
				'run-1',
				'timeout',
				expect.objectContaining({
					message: expect.stringContaining('2 case(s) were not started'),
				}),
				// counts land under `metrics`, same as every other terminal status
				expect.objectContaining({ total: 2, cancelled: 2 }),
			);
			// A deadline is a failure, not the user's Stop.
			expect(runRepository.markAsCancelled).not.toHaveBeenCalled();
			expect(runRepository.markAsCompleted).not.toHaveBeenCalled();
		});

		it('reports a user Stop as cancelled even when the deadline also fired', async () => {
			vi.useFakeTimers();
			globalConfig.evaluation.agentEvalsRunTimeoutMinutes = 30;
			seedFor([{ id: 'row-1', question: 'Q1' }], { cancelled: 1 });
			concurrencyControl.throttle.mockImplementation(async () => await new Promise<void>(() => {}));
			// Stop was requested; the case is parked, so only the post-pool re-read
			// observes it.
			runRepository.isCancellationRequested.mockResolvedValueOnce(false).mockResolvedValue(true);

			const { finished } = await service.startRun('ds-1', 'proj-1', user);
			await vi.advanceTimersByTimeAsync(30 * 60_000);
			await finished;

			expect(runRepository.markAsCancelled).toHaveBeenCalledWith('run-1', expect.anything());
			expect(runRepository.markAsError).not.toHaveBeenCalled();
		});

		it('completes a run whose last case finished just past the deadline', async () => {
			vi.useFakeTimers();
			globalConfig.evaluation.agentEvalsRunTimeoutMinutes = 30;
			seedFor([{ id: 'row-1', question: 'Q1' }], { success: 1 });
			// The only case is still executing when the deadline fires, so the abort
			// has nothing left to skip. Expiry alone must not fail a run that finished.
			let caseStarted: (() => void) | undefined;
			const started = new Promise<void>((resolve) => {
				caseStarted = resolve;
			});
			let finishCase: (() => void) | undefined;
			evalAgentExecutionService.executeWithLlmMock.mockImplementation(async () => {
				caseStarted?.();
				await new Promise<void>((resolve) => {
					finishCase = resolve;
				});
				return successExec() as never;
			});

			const { finished } = await service.startRun('ds-1', 'proj-1', user);
			await started;
			await vi.advanceTimersByTimeAsync(30 * 60_000);
			finishCase?.();
			await finished;

			expect(runRepository.markAsCompleted).toHaveBeenCalledWith(
				'run-1',
				expect.objectContaining({ total: 1, success: 1 }),
			);
			expect(runRepository.markAsError).not.toHaveBeenCalled();
		});

		it('does not fire instantly when the configured deadline overflows the timer', async () => {
			vi.useFakeTimers();
			// Past the 32-bit ms ceiling, where an unclamped delay collapses to 1ms.
			globalConfig.evaluation.agentEvalsRunTimeoutMinutes = 40_000;
			seedFor([{ id: 'row-1', question: 'Q1' }], { success: 1 });
			evalAgentExecutionService.executeWithLlmMock.mockResolvedValue(successExec() as never);
			// Park the case on the clock, so an over-eager deadline gets to abort it
			// before the pool can finish on microtasks alone.
			let releaseSlot: (() => void) | undefined;
			concurrencyControl.throttle.mockImplementation(async () => {
				await new Promise<void>((resolve) => {
					releaseSlot = resolve;
				});
			});

			const { finished } = await service.startRun('ds-1', 'proj-1', user);
			await vi.advanceTimersByTimeAsync(60_000);
			releaseSlot?.();
			await finished;

			expect(evalAgentExecutionService.executeWithLlmMock).toHaveBeenCalledTimes(1);
			expect(runRepository.markAsCompleted).toHaveBeenCalled();
			expect(runRepository.markAsError).not.toHaveBeenCalled();
		});

		it('runs without a deadline when the timeout is disabled', async () => {
			vi.useFakeTimers();
			globalConfig.evaluation.agentEvalsRunTimeoutMinutes = 0;
			seedFor([{ id: 'row-1', question: 'Q1' }], { success: 1 });
			evalAgentExecutionService.executeWithLlmMock.mockResolvedValue(successExec() as never);

			const { finished } = await service.startRun('ds-1', 'proj-1', user);
			await finished;

			expect(vi.getTimerCount()).toBe(0);
			expect(runRepository.markAsCompleted).toHaveBeenCalled();
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
			// Prefixed so a throttled id is attributable to agent evals in log streaming.
			expect(concurrencyControl.throttle).toHaveBeenCalledWith(
				expect.objectContaining({
					mode: 'evaluation',
					executionId: expect.stringMatching(/^agent-eval:/),
				}),
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
			runRepository.findByIdAndAgentId.mockResolvedValue(null);
			await expect(service.getRunSummary('run-x', 'agent-1')).rejects.toThrow('not found');
		});

		it('404s a run belonging to a different agent, without counting its cases', async () => {
			// The agent-scoped read is the whole permission check on this path: a
			// caller authorized for one agent must not be able to poll another
			// agent's run by id.
			runRepository.findByIdAndAgentId.mockResolvedValue(null);

			await expect(service.getRunSummary('run-1', 'other-agent')).rejects.toThrow('not found');
			expect(runRepository.findByIdAndAgentId).toHaveBeenCalledWith('run-1', 'other-agent');
			expect(resultRepository.countByStatus).not.toHaveBeenCalled();
		});

		it('reports status + per-status counts from the count query', async () => {
			runRepository.findByIdAndAgentId.mockResolvedValue(
				mock({ id: 'run-1', status: 'completed' }),
			);
			resultRepository.countByStatus.mockResolvedValue(
				counts({ success: 3, error: 1, running: 1 }),
			);

			const summary = await service.getRunSummary('run-1', 'agent-1');

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
