import type { AgentProposalEdit, AgentProposalEvalCase } from '@n8n/api-types';
import type { Logger, ModuleRegistry } from '@n8n/backend-common';
import { DataTableService } from '@n8n/backend-module-data-table';
import { InstanceWriteAccessService } from '@n8n/backend-services';
import type { GlobalConfig } from '@n8n/config';
import type { AgentEvalDataset, User } from '@n8n/db';
import { AgentEvalDatasetRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { ForbiddenError, NotFoundError, OperationalError, UserError } from '@n8n/errors';
import { mock, type MockProxy } from 'vitest-mock-extended';

import { CredentialsService } from '@/credentials/credentials.service';
import { AgentConfigService } from '@/modules/agents/agent-config.service';
import { AgentRepository } from '@/modules/agents/repositories/agent.repository';
import { EvalAgentExecutionService } from '@/modules/instance-ai/eval/agent-execution.service';
import { userHasScopes } from '@/permissions.ee/check-access';

import { AgentEvalCaseGenerationService } from '../agent-eval-case-generation.service';
import { judgeAgentAnswer } from '../agent-eval-judge';
import {
	AgentEvalProposalService,
	type AgentEvalComparisonCase,
} from '../agent-eval-proposal.service';

// Stub the cross-module specifiers so the unit test does not load the real
// agents, data-table and instance-ai module graphs.
vi.mock('@/credentials/credentials.service', () => ({
	CredentialsService: class CredentialsService {},
}));
vi.mock('@/modules/agents/agent-config.service', () => ({
	AgentConfigService: class AgentConfigService {},
}));
vi.mock('@/modules/agents/repositories/agent.repository', () => ({
	AgentRepository: class AgentRepository {},
}));
vi.mock('@n8n/backend-module-data-table', () => ({
	DataTableService: class DataTableService {},
}));
vi.mock('@/modules/instance-ai/eval/agent-execution.service', () => ({
	EvalAgentExecutionService: class EvalAgentExecutionService {},
	createAgentEvalMockWorld: () => ({
		httpResponses: new Map(),
		mcpTools: new Map(),
		mcpResults: new Map(),
		webSearches: new Map(),
	}),
}));
vi.mock('../agent-eval-case-generation.service', () => ({
	AgentEvalCaseGenerationService: class AgentEvalCaseGenerationService {},
}));
vi.mock('@/permissions.ee/check-access', () => ({ userHasScopes: vi.fn() }));
vi.mock('../agent-eval-judge', () => ({ judgeAgentAnswer: vi.fn() }));
const { helperUsage } = vi.hoisted(() => ({
	helperUsage: [
		{
			agent: 'eval-mock-responder',
			model: 'helper',
			calls: 1,
			uncachedInputTokens: 10,
			cacheReadTokens: 0,
			cacheWriteTokens: 0,
			outputTokens: 5,
		},
	],
}));
vi.mock('@n8n/instance-ai', () => ({
	meterEvalUsage: async (fn: () => Promise<unknown>) => ({
		result: await fn(),
		usage: helperUsage,
	}),
}));

const successExec = (overrides: Record<string, unknown> = {}) => ({
	runId: 'exec',
	success: true,
	errors: [],
	finalText: 'the answer',
	toolCalls: [
		{
			tool: 'lookup_order',
			kind: 'node',
			input: { id: 1 },
			output: { ok: true },
			mocked: true,
			interceptedRequests: [{ url: 'https://example.com', method: 'GET' }],
		},
		{
			tool: 'sub_tool',
			kind: 'other',
			error: 'Not attributed to a reported tool call',
			mocked: true,
			interceptedRequests: [],
		},
		{
			tool: 'slow_tool',
			kind: 'workflow',
			error: 'canceled',
			mocked: false,
			interceptedRequests: [],
		},
	],
	modelTurns: [],
	usage: { inputTokens: 3, outputTokens: 7, costUsd: 0.01 },
	durationMs: 1200,
	seed: { openingMessage: 'hi', globalContext: '', toolHints: {}, warnings: [] },
	skippedFeatures: [],
	mockedCredentials: [],
	...overrides,
});

const failExec = (error = 'model exploded') =>
	successExec({ success: false, errors: [error], finalText: '', toolCalls: [], usage: undefined });

const comparisonCase = (
	overrides: Partial<AgentEvalComparisonCase> = {},
): AgentEvalComparisonCase => ({
	caseKey: 'case-1',
	origin: 'proposal',
	motivating: true,
	input: 'Where is my order?',
	criteria: 'Gives a shipping date.',
	expectedOutput: null,
	expectedTools: ['lookup_order'],
	...overrides,
});

const edits: AgentProposalEdit[] = [
	{ kind: 'instructions', before: 'old', after: 'new' } as AgentProposalEdit,
];

describe('AgentEvalProposalService', () => {
	const user = mock<User>({ id: 'user-1' });

	let globalConfig: GlobalConfig;
	let moduleRegistry: MockProxy<ModuleRegistry>;
	let datasetRepository: MockProxy<AgentEvalDatasetRepository>;
	let agentRepository: MockProxy<AgentRepository>;
	let dataTableService: MockProxy<DataTableService>;
	let execution: MockProxy<EvalAgentExecutionService>;
	let caseGeneration: MockProxy<AgentEvalCaseGenerationService>;
	let instanceWriteAccess: MockProxy<InstanceWriteAccessService>;
	let service: AgentEvalProposalService;

	// Plain objects: a deep mock makes each unset mapping role a mock function.
	const dataset = (overrides: Partial<AgentEvalDataset> = {}) =>
		({
			id: 'ds-1',
			agentId: 'agent-1',
			datasetSource: 'data_table',
			datasetRef: { dataTableId: 'dt-1' },
			columnMapping: { input: 'question', criteria: 'check', expectedTools: 'tools' },
			...overrides,
		}) as AgentEvalDataset;

	beforeEach(() => {
		vi.mocked(userHasScopes).mockReset().mockResolvedValue(true);
		vi.mocked(judgeAgentAnswer)
			.mockReset()
			.mockResolvedValue({ status: 'completed', outcome: 'pass', reasoning: 'Good.' });

		globalConfig = mock<GlobalConfig>({ executions: { mode: 'regular' } });
		moduleRegistry = mock<ModuleRegistry>();
		moduleRegistry.isActive.mockReturnValue(true);
		datasetRepository = mock<AgentEvalDatasetRepository>();
		agentRepository = mock<AgentRepository>();
		agentRepository.findByIdAndProjectId.mockResolvedValue({
			id: 'agent-1',
			name: 'Support',
		} as never);
		dataTableService = mock<DataTableService>();
		dataTableService.getProjectIdForDataTable.mockResolvedValue('proj-table');
		dataTableService.getColumns.mockResolvedValue([
			{ name: 'question' },
			{ name: 'check' },
			{ name: 'tools' },
		] as never);
		execution = mock<EvalAgentExecutionService>();
		caseGeneration = mock<AgentEvalCaseGenerationService>();
		instanceWriteAccess = mock<InstanceWriteAccessService>();
		instanceWriteAccess.isReadOnly.mockReturnValue(false);

		Container.set(AgentEvalDatasetRepository, datasetRepository);
		Container.set(AgentRepository, agentRepository);
		Container.set(DataTableService, dataTableService);
		Container.set(EvalAgentExecutionService, execution);
		Container.set(AgentEvalCaseGenerationService, caseGeneration);
		Container.set(InstanceWriteAccessService, instanceWriteAccess);
		Container.set(AgentConfigService, mock<AgentConfigService>());
		Container.set(CredentialsService, mock<CredentialsService>());

		service = new AgentEvalProposalService(mock<Logger>(), globalConfig, moduleRegistry);
	});

	afterEach(() => {
		Container.reset();
	});

	describe('availability', () => {
		it('returns ok when the modules are active and the instance is not in queue mode', () => {
			expect(service.availability()).toBe('ok');
		});

		it.each(['agents', 'data-table', 'agent-evals'])(
			'returns modules_inactive when the %s module is inactive',
			(inactive) => {
				moduleRegistry.isActive.mockImplementation((name) => name !== inactive);

				expect(service.availability()).toBe('modules_inactive');
			},
		);

		it('returns queue_mode in queue mode', () => {
			globalConfig.executions.mode = 'queue';

			expect(service.availability()).toBe('queue_mode');
		});
	});

	describe('listCases', () => {
		const rows = (data: Array<Record<string, unknown>>) =>
			dataTableService.getManyRowsAndCount.mockResolvedValue({
				count: data.length,
				data: data as never,
			});

		it('returns the cases of a Data Table dataset with the dataset ID and the row ID as the case ID', async () => {
			datasetRepository.findByAgentId.mockResolvedValue([dataset()]);
			rows([{ id: 7, question: 'Q', check: 'C', tools: 'lookup_order, !refund' }]);

			const cases = await service.listCases(user, 'proj-1', 'agent-1');

			expect(cases).toEqual([
				{
					caseId: 'ds-1:7',
					input: 'Q',
					criteria: 'C',
					expectedOutput: null,
					expectedTools: ['lookup_order', '!refund'],
				},
			]);
		});

		it('skips a dataset that the user cannot read and a dataset that is not a Data Table', async () => {
			datasetRepository.findByAgentId.mockResolvedValue([
				dataset({ id: 'ds-denied', datasetRef: { dataTableId: 'dt-denied' } }),
				dataset({ id: 'ds-sheet', datasetSource: 'google_sheets' }),
				dataset(),
			]);
			vi.mocked(userHasScopes).mockImplementation(
				async (_user, _scopes, _global, resource) => resource.dataTableId !== 'dt-denied',
			);
			rows([{ id: 1, question: 'Q', check: null, tools: null }]);

			const cases = await service.listCases(user, 'proj-1', 'agent-1');

			expect(cases.map((entry) => entry.caseId)).toEqual(['ds-1:1']);
		});

		it('skips a row that has no input', async () => {
			datasetRepository.findByAgentId.mockResolvedValue([dataset()]);
			rows([
				{ id: 1, question: '  ' },
				{ id: 2, question: 'Q' },
			]);

			const cases = await service.listCases(user, 'proj-1', 'agent-1');

			expect(cases.map((entry) => entry.caseId)).toEqual(['ds-1:2']);
		});

		it('stops at 200 cases', async () => {
			datasetRepository.findByAgentId.mockResolvedValue([dataset(), dataset({ id: 'ds-2' })]);
			rows(Array.from({ length: 150 }, (_, index) => ({ id: index + 1, question: 'Q' })));

			const cases = await service.listCases(user, 'proj-1', 'agent-1');

			expect(cases).toHaveLength(200);
		});

		it('rejects a user without agent:read', async () => {
			vi.mocked(userHasScopes).mockResolvedValue(false);

			await expect(service.listCases(user, 'proj-1', 'agent-1')).rejects.toThrow(ForbiddenError);
			expect(datasetRepository.findByAgentId).not.toHaveBeenCalled();
		});

		it('rejects an agent that is not in the project', async () => {
			agentRepository.findByIdAndProjectId.mockResolvedValue(null);

			await expect(service.listCases(user, 'proj-1', 'agent-1')).rejects.toThrow(NotFoundError);
		});
	});

	describe('compare', () => {
		const input = (overrides = {}) => ({
			projectId: 'proj-1',
			agentId: 'agent-1',
			baseVersionId: 'version-1',
			edits,
			cases: [comparisonCase()],
			...overrides,
		});

		beforeEach(() => {
			execution.executeWithLlmMock.mockResolvedValue(successExec() as never);
		});

		it('runs the published version, then the proposed version, in one mocked world', async () => {
			await service.compare(user, input());

			const calls = execution.executeWithLlmMock.mock.calls;
			expect(calls).toHaveLength(2);
			expect(calls[0].slice(0, 4)).toEqual([
				'agent-1',
				user,
				{ projectId: 'proj-1', timeoutMs: 180_000 },
				'Where is my order?',
			]);
			expect(calls[0][4]?.source).toEqual({ kind: 'published', versionId: 'version-1' });
			expect(calls[1][4]?.source).toEqual({ kind: 'published', versionId: 'version-1', edits });
			expect(calls[0][4]?.world).toBeDefined();
			expect(calls[1][4]?.world).toBe(calls[0][4]?.world);
		});

		it('uses a different mocked world for each case', async () => {
			await service.compare(
				user,
				input({ cases: [comparisonCase(), comparisonCase({ caseKey: 'case-2' })] }),
			);

			const worlds = execution.executeWithLlmMock.mock.calls.map((call) => call[4]?.world);
			expect(new Set(worlds).size).toBe(2);
		});

		it('runs only the published version when there are no edits', async () => {
			const evidence = await service.compare(user, input({ edits: [] }));

			expect(execution.executeWithLlmMock).toHaveBeenCalledTimes(1);
			expect(evidence.cases[0].proposed).toBeNull();
		});

		it('judges both versions with the same subject and returns the case with both arms', async () => {
			const evidence = await service.compare(user, input());

			const subjects = vi.mocked(judgeAgentAnswer).mock.calls.map((call) => call[1]);
			expect(subjects).toHaveLength(2);
			expect(subjects[1]).toEqual(subjects[0]);
			expect(subjects[0]).toMatchObject({
				input: 'Where is my order?',
				output: 'the answer',
				criteria: 'Gives a shipping date.',
				expectedOutput: null,
				expectedTools: ['lookup_order'],
			});
			// Calls that are not attributed to the parent are part of the tool check.
			expect(subjects[0].toolCalls?.map((call) => call.tool)).toEqual([
				'lookup_order',
				'sub_tool',
				'slow_tool',
			]);
			expect(evidence.cases[0]).toMatchObject({
				caseKey: 'case-1',
				origin: 'proposal',
				motivating: true,
				input: 'Where is my order?',
				expectedTools: ['lookup_order'],
				published: { status: 'success', answer: 'the answer' },
				proposed: { status: 'success', answer: 'the answer' },
			});
			expect(typeof evidence.ranAt).toBe('string');
		});

		it('keeps tool input and output, and drops intercepted requests and error text', async () => {
			const evidence = await service.compare(user, input({ edits: [] }));

			expect(evidence.cases[0].published.toolCalls).toEqual([
				{
					tool: 'lookup_order',
					kind: 'node',
					input: { id: 1 },
					output: { ok: true },
					failed: false,
				},
				{ tool: 'sub_tool', kind: 'other', failed: false },
				{ tool: 'slow_tool', kind: 'workflow', failed: true },
			]);
		});

		it('fills the usage of an arm from the run', async () => {
			const evidence = await service.compare(user, input({ edits: [] }));

			expect(evidence.cases[0].published.usage).toEqual({
				inputTokens: 3,
				outputTokens: 7,
				costUsd: 0.01,
				durationMs: 1200,
			});
		});

		it('gives an error arm with the first run error, and does not judge it', async () => {
			execution.executeWithLlmMock
				.mockResolvedValueOnce(successExec() as never)
				.mockResolvedValueOnce(failExec('x'.repeat(600)) as never);

			const evidence = await service.compare(user, input());

			expect(evidence.cases[0].proposed).toEqual({
				status: 'error',
				answer: null,
				verdict: { status: 'error', outcome: null, reasoning: 'x'.repeat(500) },
				toolCalls: [],
				usage: { inputTokens: null, outputTokens: null, costUsd: null, durationMs: 1200 },
			});
			expect(judgeAgentAnswer).toHaveBeenCalledTimes(1);
		});

		it('gives an error arm when the run throws', async () => {
			execution.executeWithLlmMock
				.mockResolvedValueOnce(successExec() as never)
				.mockRejectedValueOnce(new Error('boom'));

			const evidence = await service.compare(user, input());

			expect(evidence.cases[0].published.status).toBe('success');
			expect(evidence.cases[0].proposed?.verdict).toEqual({
				status: 'error',
				outcome: null,
				reasoning: 'boom',
			});
		});

		it('throws when the published version did not run for any case', async () => {
			execution.executeWithLlmMock.mockResolvedValue(failExec('Agents are disabled') as never);

			const promise = service.compare(
				user,
				input({ cases: [comparisonCase(), comparisonCase({ caseKey: 'case-2' })] }),
			);

			await expect(promise).rejects.toThrow(OperationalError);
			await expect(promise).rejects.toThrow('Agents are disabled');
		});

		it('does not throw when the published version ran for one case', async () => {
			execution.executeWithLlmMock
				.mockResolvedValueOnce(failExec() as never)
				.mockResolvedValue(successExec() as never);

			const evidence = await service.compare(
				user,
				input({ edits: [], cases: [comparisonCase(), comparisonCase({ caseKey: 'case-2' })] }),
			);

			expect(evidence.cases.map((result) => result.published.status)).toEqual(['error', 'success']);
		});

		it('reports the helper model usage of each run', async () => {
			const onHelperUsage = vi.fn();

			await service.compare(user, input({ onHelperUsage }));

			expect(onHelperUsage).toHaveBeenCalledTimes(2);
			expect(onHelperUsage).toHaveBeenCalledWith(helperUsage);
		});

		it('keeps the result of a run when the usage report fails', async () => {
			const onHelperUsage = vi.fn().mockRejectedValue(new Error('no credits'));

			const evidence = await service.compare(user, input({ edits: [], onHelperUsage }));

			expect(evidence.cases[0].published.status).toBe('success');
		});

		it('passes the helper model and the abort signal to each run', async () => {
			const abortSignal = new AbortController().signal;

			await service.compare(user, input({ edits: [], helperModel: 'helper/model', abortSignal }));

			expect(execution.executeWithLlmMock.mock.calls[0][4]).toMatchObject({
				helperModel: 'helper/model',
				abortSignal,
			});
		});

		it('starts no run after the signal is aborted', async () => {
			await expect(
				service.compare(user, input({ abortSignal: AbortSignal.abort() })),
			).rejects.toThrow(OperationalError);

			expect(execution.executeWithLlmMock).not.toHaveBeenCalled();
		});

		it.each([0, 26])('rejects a comparison with %i cases', async (count) => {
			const cases = Array.from({ length: count }, (_, index) =>
				comparisonCase({ caseKey: `case-${index}` }),
			);

			await expect(service.compare(user, input({ cases }))).rejects.toThrow(UserError);
			expect(execution.executeWithLlmMock).not.toHaveBeenCalled();
		});
	});

	describe('applyCases', () => {
		const evalCase = (overrides: Partial<AgentProposalEvalCase> = {}): AgentProposalEvalCase => ({
			caseKey: 'case-1',
			change: 'added',
			caseId: null,
			before: null,
			motivating: true,
			input: 'Where is my order?',
			criteria: 'Gives a shipping date.',
			expectedTools: ['lookup_order', '!refund'],
			...overrides,
		});
		const apply = async (cases: AgentProposalEvalCase[]) =>
			await service.applyCases(user, { projectId: 'proj-1', agentId: 'agent-1', cases });

		beforeEach(() => {
			datasetRepository.findByAgentId.mockResolvedValue([dataset()]);
			datasetRepository.findByIdAndAgentId.mockResolvedValue(dataset());
			dataTableService.getManyRowsAndCount.mockResolvedValue({ count: 0, data: [] });
			dataTableService.updateRows.mockResolvedValue([{ id: 7 }] as never);
		});

		it('adds a case as a row of the newest Data Table dataset, in the project of the table', async () => {
			await apply([evalCase()]);

			expect(dataTableService.insertRows).toHaveBeenCalledWith('dt-1', 'proj-table', [
				{
					question: 'Where is my order?',
					check: 'Gives a shipping date.',
					tools: 'lookup_order, !refund',
				},
			]);
			expect(dataTableService.addColumn).not.toHaveBeenCalled();
		});

		it('skips a dataset without an input mapping when it selects the target', async () => {
			datasetRepository.findByAgentId.mockResolvedValue([
				dataset({ id: 'ds-new', columnMapping: null }),
				dataset({ id: 'ds-sheet', datasetSource: 'google_sheets' }),
				dataset({ id: 'ds-old', datasetRef: { dataTableId: 'dt-old' } }),
			]);

			await apply([evalCase()]);

			expect(dataTableService.insertRows).toHaveBeenCalledWith(
				'dt-old',
				'proj-table',
				expect.anything(),
			);
		});

		it('does not add a case whose row is already in the suite', async () => {
			dataTableService.getManyRowsAndCount.mockResolvedValue({
				count: 1,
				data: [
					{
						id: 3,
						question: 'Where is my order?',
						check: 'Gives a shipping date.',
						tools: 'lookup_order, !refund',
					},
				] as never,
			});

			await apply([evalCase()]);

			expect(dataTableService.insertRows).not.toHaveBeenCalled();
		});

		it('adds a case when a row has the same input and a different rule', async () => {
			dataTableService.getManyRowsAndCount.mockResolvedValue({
				count: 1,
				data: [
					{ id: 3, question: 'Where is my order?', check: 'Other rule', tools: null },
				] as never,
			});

			await apply([evalCase()]);

			expect(dataTableService.insertRows).toHaveBeenCalledTimes(1);
		});

		it('writes an empty expected tools cell as null', async () => {
			await apply([evalCase({ expectedTools: [] })]);

			expect(dataTableService.insertRows).toHaveBeenCalledWith('dt-1', 'proj-table', [
				expect.objectContaining({ tools: null }),
			]);
		});

		it('adds the expected tools column and its mapping when the dataset has none', async () => {
			datasetRepository.findByAgentId.mockResolvedValue([
				dataset({ columnMapping: { input: 'question', criteria: 'check' } }),
			]);
			dataTableService.getColumns.mockResolvedValue([
				{ name: 'question' },
				{ name: 'check' },
			] as never);

			await apply([evalCase()]);

			expect(dataTableService.addColumn).toHaveBeenCalledWith('dt-1', 'proj-table', {
				name: 'expectedTools',
				type: 'string',
			});
			expect(datasetRepository.updateDataset).toHaveBeenCalledWith('ds-1', 'agent-1', {
				columnMapping: { input: 'question', criteria: 'check', expectedTools: 'expectedTools' },
			});
			expect(dataTableService.insertRows).toHaveBeenCalledWith('dt-1', 'proj-table', [
				expect.objectContaining({ expectedTools: 'lookup_order, !refund' }),
			]);
		});

		it('maps an existing column of the role name and adds no column', async () => {
			datasetRepository.findByAgentId.mockResolvedValue([
				dataset({ columnMapping: { input: 'question', expectedOutput: 'answer' } }),
			]);
			dataTableService.getColumns.mockResolvedValue([
				{ name: 'question' },
				{ name: 'answer' },
				{ name: 'criteria' },
				{ name: 'expectedTools' },
			] as never);

			await apply([evalCase()]);

			expect(dataTableService.addColumn).not.toHaveBeenCalled();
			expect(datasetRepository.updateDataset).toHaveBeenCalledWith('ds-1', 'agent-1', {
				columnMapping: {
					input: 'question',
					expectedOutput: 'answer',
					criteria: 'criteria',
					expectedTools: 'expectedTools',
				},
			});
			// The mapped gold answer cell is not written.
			expect(dataTableService.insertRows).toHaveBeenCalledWith('dt-1', 'proj-table', [
				{
					question: 'Where is my order?',
					criteria: 'Gives a shipping date.',
					expectedTools: 'lookup_order, !refund',
				},
			]);
		});

		it('adds no column for a role that the case does not use', async () => {
			datasetRepository.findByAgentId.mockResolvedValue([
				dataset({ columnMapping: { input: 'question', criteria: 'check' } }),
			]);

			await apply([evalCase({ expectedTools: [] })]);

			expect(dataTableService.addColumn).not.toHaveBeenCalled();
			expect(datasetRepository.updateDataset).not.toHaveBeenCalled();
		});

		it('creates a dataset in the project of the agent when the agent has none', async () => {
			datasetRepository.findByAgentId.mockResolvedValue([]);
			caseGeneration.createDatasetForAgent.mockResolvedValue({
				datasetId: 'ds-new',
				dataTableId: 'dt-new',
				columnMapping: { input: 'input', criteria: 'criteria' },
			});

			await apply([evalCase(), evalCase({ caseKey: 'case-2', input: 'Second' })]);

			expect(caseGeneration.createDatasetForAgent).toHaveBeenCalledTimes(1);
			expect(caseGeneration.createDatasetForAgent).toHaveBeenCalledWith(
				'proj-1',
				'agent-1',
				'user-1',
				'Checks for Support',
				{ input: 'input', criteria: 'criteria', expectedTools: 'expectedTools' },
			);
			expect(dataTableService.insertRows).toHaveBeenCalledTimes(2);
			expect(dataTableService.insertRows).toHaveBeenCalledWith('dt-new', 'proj-1', [
				{
					input: 'Where is my order?',
					criteria: 'Gives a shipping date.',
					expectedTools: 'lookup_order, !refund',
				},
			]);
		});

		it('updates the row of the case ID in the dataset of this agent', async () => {
			await apply([evalCase({ change: 'updated', caseId: 'ds-1:7' })]);

			expect(datasetRepository.findByIdAndAgentId).toHaveBeenCalledWith('ds-1', 'agent-1');
			expect(dataTableService.updateRows).toHaveBeenCalledWith(
				'dt-1',
				'proj-table',
				{
					filter: { type: 'and', filters: [{ columnName: 'id', condition: 'eq', value: 7 }] },
					data: {
						question: 'Where is my order?',
						check: 'Gives a shipping date.',
						tools: 'lookup_order, !refund',
					},
				},
				true,
			);
			expect(dataTableService.insertRows).not.toHaveBeenCalled();
		});

		it.each(['ds-1', 'ds-1:', ':7', 'ds-1:row', 'ds-1:7x', null])(
			'rejects an update with the case ID %s',
			async (caseId) => {
				await expect(apply([evalCase({ change: 'updated', caseId })])).rejects.toThrow(UserError);
				expect(dataTableService.updateRows).not.toHaveBeenCalled();
			},
		);

		it('rejects an update of a case in the dataset of another agent', async () => {
			datasetRepository.findByIdAndAgentId.mockResolvedValue(null);

			await expect(apply([evalCase({ change: 'updated', caseId: 'ds-other:7' })])).rejects.toThrow(
				UserError,
			);
			expect(dataTableService.updateRows).not.toHaveBeenCalled();
		});

		it('rejects an update of a case in a dataset that is not a Data Table', async () => {
			datasetRepository.findByIdAndAgentId.mockResolvedValue(
				dataset({ datasetSource: 'google_sheets' }),
			);

			await expect(apply([evalCase({ change: 'updated', caseId: 'ds-1:7' })])).rejects.toThrow(
				UserError,
			);
		});

		it('rejects an update when the row is not in the table', async () => {
			dataTableService.updateRows.mockResolvedValue([] as never);

			await expect(apply([evalCase({ change: 'updated', caseId: 'ds-1:7' })])).rejects.toThrow(
				UserError,
			);
		});

		it('rejects on a read-only instance', async () => {
			instanceWriteAccess.isReadOnly.mockReturnValue(true);

			await expect(apply([evalCase()])).rejects.toThrow(ForbiddenError);
			expect(dataTableService.insertRows).not.toHaveBeenCalled();
		});

		it.each([
			['agent:update', {}],
			['dataTable:writeRow', {}],
			['dataTable:update', { columnMapping: { input: 'question', criteria: 'check' } }],
		] as const)('rejects a user without %s', async (deniedScope, datasetOverrides) => {
			datasetRepository.findByAgentId.mockResolvedValue([dataset(datasetOverrides)]);
			dataTableService.getColumns.mockResolvedValue([
				{ name: 'question' },
				{ name: 'check' },
			] as never);
			vi.mocked(userHasScopes).mockImplementation(
				async (_user, scopes) => !scopes.includes(deniedScope),
			);

			await expect(apply([evalCase()])).rejects.toThrow(ForbiddenError);
			expect(dataTableService.insertRows).not.toHaveBeenCalled();
			expect(dataTableService.addColumn).not.toHaveBeenCalled();
		});

		it('rejects a user without dataTable:create when a dataset must be created', async () => {
			datasetRepository.findByAgentId.mockResolvedValue([]);
			vi.mocked(userHasScopes).mockImplementation(
				async (_user, scopes) => !scopes.includes('dataTable:create'),
			);

			await expect(apply([evalCase()])).rejects.toThrow(ForbiddenError);
			expect(caseGeneration.createDatasetForAgent).not.toHaveBeenCalled();
		});

		it('checks each scope on the correct resource', async () => {
			await apply([evalCase()]);

			expect(userHasScopes).toHaveBeenCalledWith(user, ['agent:update'], false, {
				projectId: 'proj-1',
			});
			expect(userHasScopes).toHaveBeenCalledWith(user, ['dataTable:writeRow'], false, {
				dataTableId: 'dt-1',
			});
		});

		it('does nothing for an empty case list', async () => {
			await apply([]);

			expect(userHasScopes).not.toHaveBeenCalled();
		});
	});
});
