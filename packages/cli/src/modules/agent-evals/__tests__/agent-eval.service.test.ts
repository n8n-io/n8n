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

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
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
			['startRun', async () => await service.startRun(user, AGENT_ID, PROJECT_ID, 'ds-1', {})],
			['listRuns', async () => await service.listRuns(AGENT_ID, PROJECT_ID, 'ds-1')],
			['getRunDetail', async () => await service.getRunDetail(AGENT_ID, PROJECT_ID, 'run-1')],
			['getRunSummary', async () => await service.getRunSummary(AGENT_ID, PROJECT_ID, 'run-1')],
			['cancelRun', async () => await service.cancelRun(AGENT_ID, PROJECT_ID, 'run-1')],
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
		it.each(callsRequiringAnAgent)(
			'%s reports the inactive module instead of querying the agent',
			async (_, call) => {
				moduleRegistry.isActive.mockImplementation((name) => name !== 'agents');

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

			await expect(service.getRunDetail(AGENT_ID, PROJECT_ID, 'run-other')).rejects.toThrow(
				NotFoundError,
			);
			expect(resultRepository.findByRunId).not.toHaveBeenCalled();
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
			resultRepository.findByRunId.mockResolvedValue([]);

			const detail = await service.getRunDetail(AGENT_ID, PROJECT_ID, 'run-1');

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

		it('includes every per-case result in a run detail', async () => {
			resultRepository.findByRunId.mockResolvedValue([
				mock<AgentEvalResult>({
					id: 'res-1',
					runId: 'run-1',
					status: 'success',
					runAt: new Date('2026-01-03T00:00:01.000Z'),
					completedAt: new Date('2026-01-03T00:00:02.000Z'),
					createdAt: new Date('2026-01-03T00:00:00.000Z'),
					updatedAt: new Date('2026-01-03T00:00:02.000Z'),
				}),
			]);

			const detail = await service.getRunDetail(AGENT_ID, PROJECT_ID, 'run-1');

			expect(detail.results).toHaveLength(1);
			expect(detail.results[0]).toMatchObject({
				id: 'res-1',
				status: 'success',
				runAt: '2026-01-03T00:00:01.000Z',
				completedAt: '2026-01-03T00:00:02.000Z',
			});
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
});
