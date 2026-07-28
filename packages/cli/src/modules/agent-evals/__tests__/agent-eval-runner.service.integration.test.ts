import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import {
	AgentEvalDatasetRepository,
	AgentEvalResultRepository,
	AgentEvalRunRepository,
	GLOBAL_OWNER_ROLE,
	type User,
} from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import type { InstanceSettings } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import type { ConcurrencyControlService } from '@/concurrency/concurrency-control.service';
import { License } from '@/license';
import { Agent } from '@/modules/agents/entities/agent.entity';
import type { AgentRepository } from '@/modules/agents/repositories/agent.repository';
import { DataTableService } from '@/modules/data-table/data-table.service';
import type { EvalAgentExecutionService } from '@/modules/instance-ai/eval/agent-execution.service';
import { createUserShell } from '@test-integration/db/users';

import { AgentEvalRunnerService } from '../agent-eval-runner.service';

// The agent under test runs through the real reconstruction + live-model path,
// which needs credentials/network and is covered by the instance-ai eval suite;
// loading that module graph here also drags in @n8n/task-runner. Stub those two
// specifiers so the runner is exercised for real against the DB (real Data Table
// row resolution, seeded result rows, per-case persistence, run aggregation)
// with only the LLM-backed execution replaced.
vi.mock('@/modules/agents/repositories/agent.repository', () => ({ AgentRepository: class {} }));
vi.mock('@/modules/instance-ai/eval/agent-execution.service', () => ({
	EvalAgentExecutionService: class {},
}));

const agentRepository = mock<AgentRepository>();
const evalAgentExecutionService = mock<EvalAgentExecutionService>();
const instanceSettings = mock<InstanceSettings>({ hostId: 'main-test' });
// No-op throttle: this test targets DB persistence, not concurrency policy.
const concurrencyControl = mock<ConcurrencyControlService>();

let owner: User;

const buildRunner = () =>
	new AgentEvalRunnerService(
		mock(),
		Container.get(GlobalConfig),
		instanceSettings,
		Container.get(AgentEvalDatasetRepository),
		Container.get(AgentEvalRunRepository),
		Container.get(AgentEvalResultRepository),
		agentRepository,
		Container.get(DataTableService),
		evalAgentExecutionService,
		concurrencyControl,
		Container.get(License),
	);

/** Insert a minimal real agent row so `agent_eval_dataset.agentId`'s FK holds. */
async function createAgent(projectId: string): Promise<Agent> {
	return await Container.get(DataSource)
		.getRepository(Agent)
		.save(Object.assign(new Agent(), { name: 'test agent', projectId }));
}

beforeAll(async () => {
	await testModules.loadModules(['data-table', 'agents']);
	await testDb.init();
	owner = await createUserShell(GLOBAL_OWNER_ROLE);
});

beforeEach(async () => {
	vi.clearAllMocks();
	concurrencyControl.throttle.mockResolvedValue(undefined); // no-op queue: slot always granted
	// Not truncating `Agent`/`Project`: each test creates its own in a fresh
	// project and the agent is resolved via a mock, so leftovers are invisible
	// (and `Agent` is a module entity absent from testDb's EntityName union).
	await testDb.truncate([
		'DataTable',
		'DataTableColumn',
		'AgentEvalResult',
		'AgentEvalRun',
		'AgentEvalDataset',
	]);
	Container.get(GlobalConfig).evaluation.agentEvalsEnabled = true;
});

afterAll(async () => {
	await testDb.terminate();
});

describe('AgentEvalRunnerService (integration)', () => {
	it('runs each dataset row against the agent and persists results + run status', async () => {
		const project = await createTeamProject();
		const agent = await createAgent(project.id);
		const dataTableService = Container.get(DataTableService);

		const table = await dataTableService.createDataTable(project.id, {
			name: 'cases',
			columns: [
				{ name: 'question', type: 'string' },
				{ name: 'answer', type: 'string' },
			],
		});
		await dataTableService.insertRows(table.id, project.id, [
			{ question: 'What is 2+2?', answer: '4' },
			{ question: 'Capital of France?', answer: 'Paris' },
		]);

		const dataset = await Container.get(AgentEvalDatasetRepository).createDataset({
			name: 'ds',
			agentId: agent.id,
			datasetSource: 'data_table',
			datasetRef: { dataTableId: table.id },
			columnMapping: { input: 'question', expectedOutput: 'answer' },
		});

		agentRepository.findByIdAndProjectId.mockResolvedValue(
			mock<Agent>({ id: agent.id, activeVersionId: null }),
		);
		evalAgentExecutionService.executeWithLlmMock.mockImplementation(
			async (_agentId, _user, _options, caseInput) =>
				({
					runId: 'exec',
					success: true,
					errors: [],
					finalText: `answer to: ${caseInput}`,
					model: 'test-model',
					finishReason: 'stop',
					toolCalls: [{ tool: 'lookup', kind: 'node', mocked: true, interceptedRequests: [] }],
					modelTurns: [],
					usage: { inputTokens: 5, outputTokens: 9 },
					seed: { openingMessage: caseInput ?? '', globalContext: '', toolHints: {}, warnings: [] },
					skippedFeatures: [],
					mockedCredentials: [],
				}) as never,
		);

		const runner = buildRunner();
		const { runId, finished } = await runner.startRun(dataset.id, project.id, owner);
		await finished;

		const summary = await runner.getRunSummary(runId);
		expect(summary.status).toBe('completed');
		expect(summary.counts).toMatchObject({ total: 2, success: 2, error: 0, cancelled: 0 });

		// Each row's input was sent verbatim as the case input.
		const inputsSent = evalAgentExecutionService.executeWithLlmMock.mock.calls.map((c) => c[3]);
		expect(inputsSent).toEqual(expect.arrayContaining(['What is 2+2?', 'Capital of France?']));

		const results = await Container.get(AgentEvalResultRepository).findByRunId(runId);
		expect(results).toHaveLength(2);
		for (const result of results) {
			expect(result.status).toBe('success');
			expect(result.output).toMatchObject({ finalText: expect.stringContaining('answer to:') });
			expect(result.toolCalls).toMatchObject({ calls: expect.any(Array) });
			// case snapshot retained for later judging
			expect(result.input).toMatchObject({
				input: expect.any(String),
				expectedOutput: expect.any(String),
			});
		}

		const run = await Container.get(AgentEvalRunRepository).findById(runId);
		expect(run?.status).toBe('completed');
		expect(run?.metrics).toMatchObject({ usage: { inputTokens: 10, outputTokens: 18 } });
	});

	it('persists a per-case error without failing the whole run', async () => {
		const project = await createTeamProject();
		const agent = await createAgent(project.id);
		const dataTableService = Container.get(DataTableService);
		const table = await dataTableService.createDataTable(project.id, {
			name: 'cases',
			columns: [{ name: 'question', type: 'string' }],
		});
		await dataTableService.insertRows(table.id, project.id, [{ question: 'boom' }]);

		const dataset = await Container.get(AgentEvalDatasetRepository).createDataset({
			name: 'ds',
			agentId: agent.id,
			datasetSource: 'data_table',
			datasetRef: { dataTableId: table.id },
			columnMapping: { input: 'question' },
		});

		agentRepository.findByIdAndProjectId.mockResolvedValue(
			mock<Agent>({ id: agent.id, activeVersionId: null }),
		);
		evalAgentExecutionService.executeWithLlmMock.mockResolvedValue({
			runId: '',
			success: false,
			errors: ['model exploded'],
			finalText: '',
			toolCalls: [],
			modelTurns: [],
			seed: { openingMessage: '', globalContext: '', toolHints: {}, warnings: [] },
			skippedFeatures: [],
			mockedCredentials: [],
		} as never);

		const runner = buildRunner();
		const { runId, finished } = await runner.startRun(dataset.id, project.id, owner);
		await finished;

		const summary = await runner.getRunSummary(runId);
		expect(summary.status).toBe('completed');
		expect(summary.counts).toMatchObject({ total: 1, success: 0, error: 1 });

		const [result] = await Container.get(AgentEvalResultRepository).findByRunId(runId);
		expect(result.status).toBe('error');
		expect(result.errorCode).toBe('execution_failed');
	});
});
