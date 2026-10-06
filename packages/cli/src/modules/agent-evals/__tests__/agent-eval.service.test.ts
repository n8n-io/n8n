import type { ModuleRegistry } from '@n8n/backend-common';
import type {
	AgentEvalDataset,
	AgentEvalDatasetRepository,
	AgentEvalResult,
	AgentEvalResultRepository,
	AgentEvalRun,
	AgentEvalRunRepository,
	User,
} from '@n8n/db';
import { mock, type MockProxy } from 'vitest-mock-extended';

import { BadRequestError, NotFoundError } from '@n8n/errors';
import type { Agent } from '@/modules/agents/entities/agent.entity';
import type { AgentRepository } from '@/modules/agents/repositories/agent.repository';

import type { AgentEvalCaseGenerationService } from '../agent-eval-case-generation.service';
import type { AgentEvalRunnerService } from '../agent-eval-runner.service';
import { AgentEvalService } from '../agent-eval.service';

// Stub the cross-module specifiers the service statically imports so this unit
// test doesn't pull in the real agents / instance-ai module graph.
vi.mock('@/modules/agents/repositories/agent.repository', () => ({
	AgentRepository: class AgentRepository {},
}));
vi.mock('../agent-eval-runner.service', () => ({
	AgentEvalRunnerService: class AgentEvalRunnerService {},
}));
vi.mock('../agent-eval-case-generation.service', () => ({
	AgentEvalCaseGenerationService: class AgentEvalCaseGenerationService {},
}));

const AGENT_ID = 'agent-1';
const PROJECT_ID = 'proj-1';
// What `PaginationDto` hands the service once the route has defaulted it.
const PAGE = { take: 10, skip: 0 };

describe('AgentEvalService', () => {
	const user = mock<User>({ id: 'user-1' });

	let moduleRegistry: MockProxy<ModuleRegistry>;
	let agentRepository: MockProxy<AgentRepository>;
	let datasetRepository: MockProxy<AgentEvalDatasetRepository>;
	let runRepository: MockProxy<AgentEvalRunRepository>;
	let resultRepository: MockProxy<AgentEvalResultRepository>;
	let runner: MockProxy<AgentEvalRunnerService>;
	let caseGenerationService: MockProxy<AgentEvalCaseGenerationService>;
	let service: AgentEvalService;

	const makeDataset = (over: Partial<AgentEvalDataset> = {}) =>
		mock<AgentEvalDataset>({
			id: 'ds-1',
			name: 'cases',
			description: null,
			agentId: AGENT_ID,
			datasetSource: 'data_table',
			datasetRef: { dataTableId: 'dt-1' },
			columnMapping: { input: 'question' },
			createdById: 'user-1',
			createdAt: new Date('2026-01-01T00:00:00.000Z'),
			updatedAt: new Date('2026-01-02T00:00:00.000Z'),
			...over,
		});

	const makeRun = (over: Partial<AgentEvalRun> = {}) =>
		mock<AgentEvalRun>({
			id: 'run-1',
			datasetId: 'ds-1',
			agentVersionId: null,
			status: 'running',
			runAt: new Date('2026-01-03T00:00:00.000Z'),
			completedAt: null,
			metrics: null,
			errorCode: null,
			errorDetails: null,
			createdById: 'user-1',
			createdAt: new Date('2026-01-03T00:00:00.000Z'),
			updatedAt: new Date('2026-01-03T00:00:00.000Z'),
			runningInstanceId: 'main-1',
			cancelRequested: false,
			...over,
		});

	const makeResult = (over: Partial<AgentEvalResult> = {}) =>
		mock<AgentEvalResult>({
			id: 'result-1',
			runId: 'run-1',
			sourceRowId: '1',
			runIndex: 0,
			status: 'success',
			input: { input: 'hello' },
			output: { finalText: 'hi' },
			toolCalls: null,
			metrics: null,
			runAt: new Date('2026-01-03T00:00:00.000Z'),
			completedAt: new Date('2026-01-03T00:00:05.000Z'),
			errorCode: null,
			errorDetails: null,
			createdAt: new Date('2026-01-03T00:00:00.000Z'),
			updatedAt: new Date('2026-01-03T00:00:05.000Z'),
			...over,
		});

	beforeEach(() => {
		moduleRegistry = mock<ModuleRegistry>();
		moduleRegistry.isActive.mockReturnValue(true);
		agentRepository = mock<AgentRepository>();
		datasetRepository = mock<AgentEvalDatasetRepository>();
		runRepository = mock<AgentEvalRunRepository>();
		resultRepository = mock<AgentEvalResultRepository>();
		runner = mock<AgentEvalRunnerService>();
		caseGenerationService = mock<AgentEvalCaseGenerationService>();

		agentRepository.findByIdAndProjectId.mockResolvedValue(mock<Agent>({ id: AGENT_ID }));
		datasetRepository.findByIdAndAgentId.mockResolvedValue(makeDataset());
		runRepository.findByIdAndAgentId.mockResolvedValue(makeRun());
		runRepository.findAndCountByDatasetIdAndAgentId.mockResolvedValue([[], 0]);
		resultRepository.findAndCountByRunId.mockResolvedValue([[], 0]);
		resultRepository.findById.mockResolvedValue(makeResult());

		service = new AgentEvalService(
			moduleRegistry,
			agentRepository,
			datasetRepository,
			runRepository,
			resultRepository,
			runner,
			caseGenerationService,
		);
	});

	// `@ProjectScope` proves the caller may act on the project in the URL. It says
	// nothing about whether the addressed agent is in that project, so every entry
	// point has to resolve the agent through the pair.
	describe('agent scoping', () => {
		const callsRequiringAnAgent: Array<[string, () => Promise<unknown>]> = [
			['listDatasets', async () => await service.listDatasets(AGENT_ID, PROJECT_ID)],
			['getDataset', async () => await service.getDataset(AGENT_ID, PROJECT_ID, 'ds-1')],
			[
				'createDataset',
				async () =>
					await service.createDataset(user, AGENT_ID, PROJECT_ID, {
						name: 'cases',
						agentId: AGENT_ID,
						datasetSource: 'data_table',
						datasetRef: { dataTableId: 'dt-1' },
					}),
			],
			[
				'updateDataset',
				async () => await service.updateDataset(AGENT_ID, PROJECT_ID, 'ds-1', { name: 'x' }),
			],
			['deleteDataset', async () => await service.deleteDataset(AGENT_ID, PROJECT_ID, 'ds-1')],
			[
				'generateDraftCases',
				async () => await service.generateDraftCases(user, AGENT_ID, PROJECT_ID, {}),
			],
			[
				'createDraftDataset',
				async () => await service.createDraftDataset(user, AGENT_ID, PROJECT_ID),
			],
			['previewRun', async () => await service.previewRun(user, AGENT_ID, PROJECT_ID, {})],
			['startRun', async () => await service.startRun(user, AGENT_ID, PROJECT_ID, 'ds-1', {})],
			['listRuns', async () => await service.listRuns(AGENT_ID, PROJECT_ID, 'ds-1', PAGE)],
			['getRunDetail', async () => await service.getRunDetail(AGENT_ID, PROJECT_ID, 'run-1', PAGE)],
			['getRunSummary', async () => await service.getRunSummary(AGENT_ID, PROJECT_ID, 'run-1')],
			['cancelRun', async () => await service.cancelRun(AGENT_ID, PROJECT_ID, 'run-1')],
			[
				'rerunResult',
				async () => await service.rerunResult(user, AGENT_ID, PROJECT_ID, 'result-1'),
			],
			['acceptResult', async () => await service.acceptResult(AGENT_ID, PROJECT_ID, 'result-1')],
			['deleteResult', async () => await service.deleteResult(AGENT_ID, PROJECT_ID, 'result-1')],
			[
				'deleteDraftDataset',
				async () => await service.deleteDraftDataset(AGENT_ID, PROJECT_ID, 'ds-1'),
			],
		];

		it.each(callsRequiringAnAgent)(
			'%s 404s when the agent is not in the project',
			async (_name, call) => {
				agentRepository.findByIdAndProjectId.mockResolvedValue(null);

				await expect(call()).rejects.toThrow(NotFoundError);
			},
		);

		it.each(callsRequiringAnAgent)('%s resolves the agent against the project', async (_, call) => {
			await call().catch(() => {});

			expect(agentRepository.findByIdAndProjectId).toHaveBeenCalledWith(AGENT_ID, PROJECT_ID);
		});

		// The agent lookup below reads a module entity, so the dependency check has
		// to land before it — otherwise TypeORM raises missing metadata first.
		// Not-found, not bad-request: with `agents` off there is no agent to address,
		// matching the 404 that module's own unregistered routes already give.
		it.each(callsRequiringAnAgent)(
			'%s reports the inactive module as not-found instead of querying the agent',
			async (_, call) => {
				moduleRegistry.isActive.mockImplementation((name) => name !== 'agents');

				await expect(call()).rejects.toThrow(NotFoundError);
				await expect(call()).rejects.toThrow('Agent evals require these modules to be active');
				expect(agentRepository.findByIdAndProjectId).not.toHaveBeenCalled();
			},
		);
	});

	// A dataset/run id from another agent must not resolve just because the caller
	// legitimately holds the scope on this one.
	describe('cross-agent id isolation', () => {
		it('404s a dataset belonging to another agent', async () => {
			datasetRepository.findByIdAndAgentId.mockResolvedValue(null);

			await expect(service.getDataset(AGENT_ID, PROJECT_ID, 'ds-other')).rejects.toThrow(
				NotFoundError,
			);
			expect(datasetRepository.findByIdAndAgentId).toHaveBeenCalledWith('ds-other', AGENT_ID);
		});

		it('404s a run belonging to another agent, and reads no results for it', async () => {
			runRepository.findByIdAndAgentId.mockResolvedValue(null);

			await expect(service.getRunDetail(AGENT_ID, PROJECT_ID, 'run-other', PAGE)).rejects.toThrow(
				NotFoundError,
			);
			expect(resultRepository.findAndCountByRunId).not.toHaveBeenCalled();
		});

		it('refuses to start a run on another agent’s dataset, without touching the runner', async () => {
			datasetRepository.findByIdAndAgentId.mockResolvedValue(null);

			await expect(service.startRun(user, AGENT_ID, PROJECT_ID, 'ds-other', {})).rejects.toThrow(
				NotFoundError,
			);
			expect(runner.startRun).not.toHaveBeenCalled();
		});

		it('passes the agent through to the summary read so it is scoped there too', async () => {
			runner.getRunSummary.mockResolvedValue({
				runId: 'run-1',
				status: 'running',
				counts: { total: 1, success: 0, error: 0, cancelled: 0, pending: 1 },
			});

			await service.getRunSummary(AGENT_ID, PROJECT_ID, 'run-1');

			expect(runner.getRunSummary).toHaveBeenCalledWith('run-1', AGENT_ID);
		});

		// A result is owned through its run, so a bare result id can't be trusted
		// on its own — the run it points at has to resolve against this agent too.
		it('404s a result whose run belongs to another agent, without touching the runner', async () => {
			runRepository.findByIdAndAgentId.mockResolvedValue(null);

			await expect(service.rerunResult(user, AGENT_ID, PROJECT_ID, 'result-other')).rejects.toThrow(
				NotFoundError,
			);
			expect(runner.rerunResult).not.toHaveBeenCalled();
		});
	});

	describe('rerunResult', () => {
		it.each(['new', 'running'] as const)('refuses to rerun a %s result', async (status) => {
			resultRepository.findById.mockResolvedValue(makeResult({ status }));

			await expect(service.rerunResult(user, AGENT_ID, PROJECT_ID, 'result-1')).rejects.toThrow(
				BadRequestError,
			);
			expect(runner.rerunResult).not.toHaveBeenCalled();
		});

		it.each(['success', 'error', 'cancelled'] as const)(
			'reruns a %s result through the runner and maps the response',
			async (status) => {
				const toRerun = makeResult({ status });
				resultRepository.findById.mockResolvedValue(toRerun);
				runner.rerunResult.mockResolvedValue(makeResult({ status: 'success' }));

				const result = await service.rerunResult(user, AGENT_ID, PROJECT_ID, 'result-1');

				expect(runner.rerunResult).toHaveBeenCalledWith(toRerun, AGENT_ID, PROJECT_ID, user, {});
				expect(result.status).toBe('success');
			},
		);

		it('forwards an edited rule through to the runner', async () => {
			const toRerun = makeResult({ status: 'error' });
			resultRepository.findById.mockResolvedValue(toRerun);
			runner.rerunResult.mockResolvedValue(makeResult({ status: 'success' }));

			await service.rerunResult(user, AGENT_ID, PROJECT_ID, 'result-1', {
				whatToCheck: 'Mentions the refund window.',
			});

			expect(runner.rerunResult).toHaveBeenCalledWith(toRerun, AGENT_ID, PROJECT_ID, user, {
				whatToCheck: 'Mentions the refund window.',
			});
		});
	});

	describe('acceptResult', () => {
		it('records a passing verdict on a successful result and returns the refreshed record', async () => {
			const verdict = { status: 'completed', outcome: 'pass', reasoning: null };
			resultRepository.findById
				.mockResolvedValueOnce(makeResult({ status: 'success' }))
				.mockResolvedValueOnce(makeResult({ status: 'success', verdict }));

			const record = await service.acceptResult(AGENT_ID, PROJECT_ID, 'result-1');

			expect(resultRepository.updateVerdict).toHaveBeenCalledWith('result-1', verdict);
			expect(record.verdict).toEqual(verdict);
		});

		// The user's call outranks an execution error, so an errored or cancelled
		// case can be accepted too — it is the only way it ends up with a pass.
		it.each(['error', 'cancelled'] as const)(
			'records a passing verdict on a %s result',
			async (status) => {
				const verdict = { status: 'completed', outcome: 'pass', reasoning: null };
				resultRepository.findById
					.mockResolvedValueOnce(makeResult({ status }))
					.mockResolvedValueOnce(makeResult({ status, verdict }));

				const record = await service.acceptResult(AGENT_ID, PROJECT_ID, 'result-1');

				expect(resultRepository.updateVerdict).toHaveBeenCalledWith('result-1', verdict);
				expect(record.verdict).toEqual(verdict);
			},
		);

		it.each(['new', 'running'] as const)('rejects a result that is %s', async (status) => {
			resultRepository.findById.mockResolvedValue(makeResult({ status }));

			await expect(service.acceptResult(AGENT_ID, PROJECT_ID, 'result-1')).rejects.toThrow(
				BadRequestError,
			);
			expect(resultRepository.updateVerdict).not.toHaveBeenCalled();
		});

		it('404s when the result belongs to another agent', async () => {
			resultRepository.findById.mockResolvedValue(makeResult());
			runRepository.findByIdAndAgentId.mockResolvedValue(null);

			await expect(service.acceptResult(AGENT_ID, PROJECT_ID, 'result-1')).rejects.toThrow(
				NotFoundError,
			);
			expect(resultRepository.updateVerdict).not.toHaveBeenCalled();
		});
	});

	describe('deleteResult', () => {
		it('deletes the result scoped to its own run', async () => {
			const toDelete = makeResult({ runId: 'run-1' });
			resultRepository.findById.mockResolvedValue(toDelete);
			resultRepository.deleteById.mockResolvedValue(true);

			await expect(service.deleteResult(AGENT_ID, PROJECT_ID, 'result-1')).resolves.toBeUndefined();

			expect(resultRepository.deleteById).toHaveBeenCalledWith('result-1', 'run-1');
		});

		it('404s without deleting when the result belongs to another agent’s run', async () => {
			resultRepository.findById.mockResolvedValue(
				makeResult({ status: 'success', runId: 'run-9' }),
			);
			runRepository.findByIdAndAgentId.mockResolvedValue(null);

			await expect(service.deleteResult(AGENT_ID, PROJECT_ID, 'result-1')).rejects.toThrow(
				NotFoundError,
			);
			expect(runRepository.findByIdAndAgentId).toHaveBeenCalledWith('run-9', AGENT_ID);
			expect(resultRepository.deleteById).not.toHaveBeenCalled();
		});

		it('404s without deleting when the result does not exist', async () => {
			resultRepository.findById.mockResolvedValue(null);

			await expect(service.deleteResult(AGENT_ID, PROJECT_ID, 'result-1')).rejects.toThrow(
				NotFoundError,
			);
			expect(resultRepository.deleteById).not.toHaveBeenCalled();
		});

		it('404s when nothing was removed', async () => {
			resultRepository.deleteById.mockResolvedValue(false);

			await expect(service.deleteResult(AGENT_ID, PROJECT_ID, 'result-1')).rejects.toThrow(
				NotFoundError,
			);
		});

		// A pending or running case keeps writing to its row, so deleting it would
		// drop work the run then reports as done.
		it.each(['new', 'running'] as const)('rejects a result that is still %s', async (status) => {
			resultRepository.findById.mockResolvedValue(makeResult({ status }));

			await expect(service.deleteResult(AGENT_ID, PROJECT_ID, 'result-1')).rejects.toThrow(
				BadRequestError,
			);
			expect(resultRepository.deleteById).not.toHaveBeenCalled();
		});

		it('brings a settled run’s recorded counts back in line, keeping the rest of its metrics', async () => {
			resultRepository.findById.mockResolvedValue(makeResult({ runId: 'run-1' }));
			resultRepository.deleteById.mockResolvedValue(true);
			// A plain object: `mock()` proxies don't enumerate nested values when spread.
			runRepository.findById.mockResolvedValue({
				id: 'run-1',
				status: 'completed',
				metrics: { total: 3, success: 3, error: 0, cancelled: 0, pending: 0, usage: { x: 1 } },
			} as unknown as AgentEvalRun);
			runner.getRunSummary.mockResolvedValue({
				runId: 'run-1',
				status: 'completed',
				counts: { total: 2, success: 2, error: 0, cancelled: 0, pending: 0 },
			});

			await service.deleteResult(AGENT_ID, PROJECT_ID, 'result-1');

			expect(runRepository.updateMetrics).toHaveBeenCalledWith('run-1', {
				total: 2,
				success: 2,
				error: 0,
				cancelled: 0,
				pending: 0,
				usage: { x: 1 },
			});
		});

		it('leaves the metrics of a run that is still going alone, since it records them when it settles', async () => {
			resultRepository.findById.mockResolvedValue(makeResult({ runId: 'run-1' }));
			resultRepository.deleteById.mockResolvedValue(true);
			runRepository.findById.mockResolvedValue(makeRun({ status: 'running', metrics: null }));

			await service.deleteResult(AGENT_ID, PROJECT_ID, 'result-1');

			expect(runRepository.updateMetrics).not.toHaveBeenCalled();
		});
	});

	describe('deleteDraftDataset', () => {
		beforeEach(() => {
			datasetRepository.findByIdAndAgentId.mockResolvedValue(makeDataset());
			datasetRepository.findByAgentId.mockResolvedValue([makeDataset()]);
			datasetRepository.deleteDataset.mockResolvedValue(true);
			runRepository.findByDatasetId.mockResolvedValue([]);
		});

		it('removes the dataset and the table that was made for it', async () => {
			await service.deleteDraftDataset(AGENT_ID, PROJECT_ID, 'ds-1');

			expect(datasetRepository.deleteDataset).toHaveBeenCalledWith('ds-1', AGENT_ID);
			expect(caseGenerationService.deleteDraftTable).toHaveBeenCalledWith('dt-1', PROJECT_ID);
		});

		it('keeps a table another dataset still reads from', async () => {
			datasetRepository.findByAgentId.mockResolvedValue([
				makeDataset(),
				makeDataset({ id: 'ds-2' }),
			]);

			await service.deleteDraftDataset(AGENT_ID, PROJECT_ID, 'ds-1');

			expect(datasetRepository.deleteDataset).toHaveBeenCalledWith('ds-1', AGENT_ID);
			expect(caseGenerationService.deleteDraftTable).not.toHaveBeenCalled();
		});

		it('refuses a dataset that has runs, since that is history rather than a draft', async () => {
			runRepository.findByDatasetId.mockResolvedValue([makeRun()]);

			await expect(service.deleteDraftDataset(AGENT_ID, PROJECT_ID, 'ds-1')).rejects.toThrow(
				BadRequestError,
			);
			expect(datasetRepository.deleteDataset).not.toHaveBeenCalled();
			expect(caseGenerationService.deleteDraftTable).not.toHaveBeenCalled();
		});

		it('404s without touching the table when the dataset belongs to another agent', async () => {
			datasetRepository.findByIdAndAgentId.mockResolvedValue(null);

			await expect(service.deleteDraftDataset(AGENT_ID, PROJECT_ID, 'ds-1')).rejects.toThrow(
				NotFoundError,
			);
			expect(caseGenerationService.deleteDraftTable).not.toHaveBeenCalled();
		});

		it('leaves a dataset without a Data Table to the plain delete', async () => {
			datasetRepository.findByIdAndAgentId.mockResolvedValue(
				makeDataset({
					datasetSource: 'google_sheets',
					datasetRef: { credentialId: 'cred-1', spreadsheetId: 'sheet-1', sheetName: 'Cases' },
				}),
			);

			await service.deleteDraftDataset(AGENT_ID, PROJECT_ID, 'ds-1');

			expect(datasetRepository.deleteDataset).toHaveBeenCalled();
			expect(caseGenerationService.deleteDraftTable).not.toHaveBeenCalled();
		});
	});

	describe('createDataset', () => {
		it('rejects a body whose agentId contradicts the URL', async () => {
			await expect(
				service.createDataset(user, AGENT_ID, PROJECT_ID, {
					name: 'cases',
					agentId: 'agent-2',
					datasetSource: 'data_table',
					datasetRef: { dataTableId: 'dt-1' },
				}),
			).rejects.toThrow(BadRequestError);

			expect(datasetRepository.createDataset).not.toHaveBeenCalled();
		});

		it('persists with the URL agent and the creating user, defaulting optionals', async () => {
			datasetRepository.createDataset.mockResolvedValue(makeDataset());

			await service.createDataset(user, AGENT_ID, PROJECT_ID, {
				name: 'cases',
				agentId: AGENT_ID,
				datasetSource: 'data_table',
				datasetRef: { dataTableId: 'dt-1' },
			});

			expect(datasetRepository.createDataset).toHaveBeenCalledWith({
				name: 'cases',
				description: null,
				agentId: AGENT_ID,
				datasetSource: 'data_table',
				datasetRef: { dataTableId: 'dt-1' },
				columnMapping: null,
				createdById: 'user-1',
			});
		});
	});

	describe('deleteDataset', () => {
		it('404s when nothing was removed', async () => {
			datasetRepository.deleteDataset.mockResolvedValue(false);

			await expect(service.deleteDataset(AGENT_ID, PROJECT_ID, 'ds-1')).rejects.toThrow(
				NotFoundError,
			);
		});

		it('resolves when the dataset was removed', async () => {
			datasetRepository.deleteDataset.mockResolvedValue(true);

			await expect(service.deleteDataset(AGENT_ID, PROJECT_ID, 'ds-1')).resolves.toBeUndefined();
		});
	});

	describe('startRun', () => {
		beforeEach(() => {
			runner.startRun.mockResolvedValue({ runId: 'run-1', finished: Promise.resolve() });
			runRepository.findById.mockResolvedValue(makeRun());
		});

		it('returns the seeded run without waiting for the cases to finish', async () => {
			let settled = false;
			runner.startRun.mockResolvedValue({
				runId: 'run-1',
				// A promise that never settles stands in for a long-running batch: if
				// the service awaited it, this test would time out.
				finished: new Promise<void>(() => {}).finally(() => {
					settled = true;
				}),
			});

			const run = await service.startRun(user, AGENT_ID, PROJECT_ID, 'ds-1', {});

			expect(run.id).toBe('run-1');
			expect(settled).toBe(false);
		});

		it('refuses a pinned agent version while the runner can only run the live agent', async () => {
			await expect(
				service.startRun(user, AGENT_ID, PROJECT_ID, 'ds-1', { agentVersionId: 'v-1' }),
			).rejects.toThrow(BadRequestError);

			expect(runner.startRun).not.toHaveBeenCalled();
		});
	});

	describe('cancelRun', () => {
		it.each(['completed', 'error', 'cancelled'] as const)(
			'refuses to cancel a run that already finished as %s',
			async (status) => {
				runRepository.findByIdAndAgentId.mockResolvedValue(makeRun({ status }));

				await expect(service.cancelRun(AGENT_ID, PROJECT_ID, 'run-1')).rejects.toThrow(
					BadRequestError,
				);
				expect(runRepository.requestCancellation).not.toHaveBeenCalled();
			},
		);

		it.each(['new', 'running'] as const)('requests cancellation of a %s run', async (status) => {
			runRepository.findByIdAndAgentId.mockResolvedValue(makeRun({ status }));
			runRepository.findById.mockResolvedValue(makeRun({ status }));

			await service.cancelRun(AGENT_ID, PROJECT_ID, 'run-1');

			expect(runRepository.requestCancellation).toHaveBeenCalledWith('run-1');
		});

		it('falls back to the pre-cancel run when the re-read comes up empty', async () => {
			runRepository.findById.mockResolvedValue(null);

			const run = await service.cancelRun(AGENT_ID, PROJECT_ID, 'run-1');

			expect(run.id).toBe('run-1');
		});
	});

	describe('response mapping', () => {
		it('serializes dates as ISO strings and keeps run coordination columns off the wire', async () => {
			const detail = await service.getRunDetail(AGENT_ID, PROJECT_ID, 'run-1', PAGE);

			expect(detail.runAt).toBe('2026-01-03T00:00:00.000Z');
			expect(detail.createdAt).toBe('2026-01-03T00:00:00.000Z');
			expect(detail).not.toHaveProperty('runningInstanceId');
			expect(detail).not.toHaveProperty('cancelRequested');
		});

		it('reassembles the dataset source pointer as a narrowable pair', async () => {
			const record = await service.getDataset(AGENT_ID, PROJECT_ID, 'ds-1');

			expect(record).toMatchObject({
				datasetSource: 'data_table',
				datasetRef: { dataTableId: 'dt-1' },
				createdAt: '2026-01-01T00:00:00.000Z',
				updatedAt: '2026-01-02T00:00:00.000Z',
			});
		});

		it('maps a google-sheets dataset onto its own source arm', async () => {
			datasetRepository.findByIdAndAgentId.mockResolvedValue(
				makeDataset({
					datasetSource: 'google_sheets',
					datasetRef: { credentialId: 'c-1', spreadsheetId: 's-1', sheetName: 'Sheet1' },
				}),
			);

			const record = await service.getDataset(AGENT_ID, PROJECT_ID, 'ds-1');

			expect(record).toMatchObject({
				datasetSource: 'google_sheets',
				datasetRef: { credentialId: 'c-1', spreadsheetId: 's-1', sheetName: 'Sheet1' },
			});
		});

		// The source column is authoritative, so a ref that doesn't match it means a
		// corrupt row. Failing loudly beats reporting a wrong-but-well-typed
		// `datasetSource` the client would then narrow on.
		it('refuses to map a dataset whose source and ref disagree', async () => {
			datasetRepository.findByIdAndAgentId.mockResolvedValue(
				makeDataset({
					datasetSource: 'google_sheets',
					datasetRef: { dataTableId: 'dt-1' },
				}),
			);

			await expect(service.getDataset(AGENT_ID, PROJECT_ID, 'ds-1')).rejects.toThrow(
				/does not match that shape/,
			);
		});

		it('maps every per-case result on the requested page of a run detail', async () => {
			resultRepository.findAndCountByRunId.mockResolvedValue([
				[
					mock<AgentEvalResult>({
						id: 'res-1',
						runId: 'run-1',
						status: 'success',
						runAt: new Date('2026-01-03T00:00:01.000Z'),
						completedAt: new Date('2026-01-03T00:00:02.000Z'),
						createdAt: new Date('2026-01-03T00:00:00.000Z'),
						updatedAt: new Date('2026-01-03T00:00:02.000Z'),
					}),
				],
				1,
			]);

			const detail = await service.getRunDetail(AGENT_ID, PROJECT_ID, 'run-1', PAGE);

			expect(detail.results.data).toHaveLength(1);
			expect(detail.results.data[0]).toMatchObject({
				id: 'res-1',
				status: 'success',
				runAt: '2026-01-03T00:00:01.000Z',
				completedAt: '2026-01-03T00:00:02.000Z',
			});
		});
	});

	// The window has to reach the repositories: slicing in memory would still
	// grow without bound as a dataset ages.
	describe('pagination', () => {
		it('passes the run-list window to the repository and reports the total', async () => {
			runRepository.findAndCountByDatasetIdAndAgentId.mockResolvedValue([[makeRun()], 342]);

			const page = await service.listRuns(AGENT_ID, PROJECT_ID, 'ds-1', { take: 25, skip: 50 });

			expect(runRepository.findAndCountByDatasetIdAndAgentId).toHaveBeenCalledWith(
				'ds-1',
				AGENT_ID,
				{ take: 25, skip: 50 },
			);
			expect(page).toMatchObject({ count: 342 });
			expect(page.data).toHaveLength(1);
		});

		it('passes the run-detail window to the repository and reports the case total', async () => {
			resultRepository.findAndCountByRunId.mockResolvedValue([[], 500]);

			const detail = await service.getRunDetail(AGENT_ID, PROJECT_ID, 'run-1', {
				take: 25,
				skip: 50,
			});

			expect(resultRepository.findAndCountByRunId).toHaveBeenCalledWith('run-1', {
				take: 25,
				skip: 50,
			});
			expect(detail.results).toEqual({ count: 500, data: [] });
		});

		// A client sizing its pager off `data.length` would misread the total.
		it('reports a total larger than the page it returned', async () => {
			runRepository.findAndCountByDatasetIdAndAgentId.mockResolvedValue([[makeRun()], 342]);

			const page = await service.listRuns(AGENT_ID, PROJECT_ID, 'ds-1', { take: 1, skip: 0 });

			expect(page.count).toBeGreaterThan(page.data.length);
		});
	});

	describe('generateDraftCases', () => {
		it('delegates with the project resolved from the URL', async () => {
			caseGenerationService.generateDraftCases.mockResolvedValue({
				datasetId: 'ds-1',
				dataTableId: 'dt-1',
				cases: [],
			});

			await service.generateDraftCases(user, AGENT_ID, PROJECT_ID, { count: 3 });

			expect(caseGenerationService.generateDraftCases).toHaveBeenCalledWith(
				user,
				PROJECT_ID,
				AGENT_ID,
				{ count: 3 },
			);
		});
	});

	describe('createDraftDataset', () => {
		it('delegates with the project resolved from the URL', async () => {
			caseGenerationService.createEmptyDataset.mockResolvedValue({
				datasetId: 'ds-1',
				dataTableId: 'dt-1',
				columnMapping: { input: 'input', criteria: 'criteria' },
			});

			await service.createDraftDataset(user, AGENT_ID, PROJECT_ID, 'My checks');

			expect(caseGenerationService.createEmptyDataset).toHaveBeenCalledWith(
				user,
				PROJECT_ID,
				AGENT_ID,
				'My checks',
			);
		});
	});

	describe('previewRun', () => {
		it('delegates with the project resolved from the URL', async () => {
			caseGenerationService.previewRun.mockResolvedValue({
				status: 'completed',
				input: 'hi',
				whatToCheck: 'is polite',
				scenario: 'Vague',
				response: 'Hello!',
			});

			await service.previewRun(user, AGENT_ID, PROJECT_ID, { suggestion: 'be nicer' });

			expect(caseGenerationService.previewRun).toHaveBeenCalledWith(user, PROJECT_ID, AGENT_ID, {
				suggestion: 'be nicer',
			});
		});
	});
});
