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

import type { Agent } from '@/modules/agents/entities/agent.entity';
import type { AgentRepository } from '@/modules/agents/repositories/agent.repository';
import type { DataTableService } from '@/modules/data-table/data-table.service';
import type { EvalAgentExecutionService } from '@/modules/instance-ai/eval/agent-execution.service';

import { AgentEvalRunnerService } from '../agent-eval-runner.service';

// Stub the cross-module specifiers the service statically imports so the unit
// test doesn't pull in the real agents / data-table / instance-ai module graph.
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
	let service: AgentEvalRunnerService;

	const dataset = mock<AgentEvalDataset>({
		id: 'ds-1',
		agentId: 'agent-1',
		datasetSource: 'data_table',
		datasetRef: { dataTableId: 'dt-1' },
		columnMapping: { input: 'question', expectedOutput: 'answer', criteria: 'check' },
	});

	beforeEach(() => {
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

		datasetRepository.findById.mockResolvedValue(dataset);
		agentRepository.findByIdAndProjectId.mockResolvedValue(
			mock<Agent>({ id: 'agent-1', activeVersionId: 'v-1' }),
		);
		runRepository.createRun.mockResolvedValue(mock({ id: 'run-1' }));
		runRepository.isCancellationRequested.mockResolvedValue(false);
		dataTableService.getProjectIdForDataTable.mockResolvedValue('proj-table');

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
		);
	});

	const seedFor = (rows: Array<Record<string, unknown>>) => {
		dataTableService.getManyRowsAndCount.mockResolvedValue({
			count: rows.length,
			data: rows as never,
		});
		// seedResults returns one persisted row per case, in order.
		resultRepository.seedResults.mockImplementation(async (cases) =>
			cases.map((_c, i) => mock<AgentEvalResult>({ id: `res-${i}`, status: 'new' })),
		);
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
			seedFor([
				{ id: 'row-1', question: 'What is 2+2?', answer: '4', check: 'is 4' },
				{ id: 'row-2', question: 'Capital of France?', answer: 'Paris', check: 'is Paris' },
			]);
			evalAgentExecutionService.executeWithLlmMock.mockResolvedValue(successExec() as never);
			resultRepository.findByRunId.mockResolvedValue([
				mock<AgentEvalResult>({ status: 'success' }),
				mock<AgentEvalResult>({ status: 'success' }),
			]);

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
			seedFor([{ id: 'row-1', question: 'Q', answer: 'A', check: 'C' }]);
			evalAgentExecutionService.executeWithLlmMock.mockResolvedValue(successExec() as never);
			resultRepository.findByRunId.mockResolvedValue([
				mock<AgentEvalResult>({ status: 'success' }),
			]);

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
			seedFor([{ id: 'row-1', question: 'Q' }]);
			evalAgentExecutionService.executeWithLlmMock.mockResolvedValue(failExec() as never);
			resultRepository.findByRunId.mockResolvedValue([mock<AgentEvalResult>({ status: 'error' })]);

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
			seedFor([
				{ id: 'row-1', question: 'Q1' },
				{ id: 'row-2', question: 'Q2' },
			]);
			// Run serially so the thrown call is deterministically the first case.
			evalAgentExecutionService.executeWithLlmMock
				.mockRejectedValueOnce(new Error('transient failure'))
				.mockResolvedValueOnce(successExec() as never);
			resultRepository.findByRunId.mockResolvedValue([
				mock<AgentEvalResult>({ status: 'error' }),
				mock<AgentEvalResult>({ status: 'success' }),
			]);

			const { finished } = await service.startRun('ds-1', 'proj-1', user, { concurrency: 1 });
			await finished;

			expect(resultRepository.markAsError).toHaveBeenCalledWith(
				'res-0',
				'execution_failed',
				expect.objectContaining({ message: 'transient failure' }),
			);
			// One thrown case must not abort the batch or error the whole run.
			expect(resultRepository.markAsCompleted).toHaveBeenCalledTimes(1);
			expect(runRepository.markAsCompleted).toHaveBeenCalled();
			expect(runRepository.markAsError).not.toHaveBeenCalled();
		});

		it('errors an empty-input case without invoking the agent', async () => {
			seedFor([{ id: 'row-1', question: '   ' }]);
			resultRepository.findByRunId.mockResolvedValue([mock<AgentEvalResult>({ status: 'error' })]);

			const { finished } = await service.startRun('ds-1', 'proj-1', user);
			await finished;

			expect(evalAgentExecutionService.executeWithLlmMock).not.toHaveBeenCalled();
			expect(resultRepository.markAsError).toHaveBeenCalledWith(
				'res-0',
				'empty_input',
				expect.anything(),
			);
		});
	});

	describe('cancellation', () => {
		it('marks cases and the run cancelled when cancellation is requested', async () => {
			seedFor([
				{ id: 'row-1', question: 'Q' },
				{ id: 'row-2', question: 'Q2' },
			]);
			runRepository.isCancellationRequested.mockResolvedValue(true);
			resultRepository.findByRunId.mockResolvedValue([
				mock<AgentEvalResult>({ status: 'cancelled' }),
				mock<AgentEvalResult>({ status: 'cancelled' }),
			]);

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
	});
});
