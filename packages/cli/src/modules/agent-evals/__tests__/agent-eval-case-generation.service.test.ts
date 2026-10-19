import type { AgentJsonConfig } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import type { AgentEvalDataset, AgentEvalDatasetRepository, User } from '@n8n/db';
import type { Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { CredentialsService } from '@/credentials/credentials.service';
import { ForbiddenError, NotFoundError } from '@n8n/errors';
import type { InstanceWriteAccessService } from '@n8n/backend-services';

import type { AgentConfigService } from '../../agents/agent-config.service';
import type { AgentTestRunService } from '../../agents/agent-test-run.service';
import type { DataTable } from '../../data-table/data-table.entity';
import type { DataTableService } from '../../data-table/data-table.service';
import { DataTableNameConflictError } from '../../data-table/errors/data-table-name-conflict.error';
import { AgentEvalCaseGenerationService } from '../agent-eval-case-generation.service';
import type { AgentEvalsFlagGate } from '../agent-evals-flag-gate';

// Stub the @n8n/agents SDK: fluent builder is a no-op; `generate` is a
// controllable mock so tests drive the model's (in)valid structured output.
const { generateMock, criteriaRunMock } = vi.hoisted(() => ({
	generateMock: vi.fn(),
	criteriaRunMock: vi.fn(),
}));
vi.mock('@n8n/agents', async (importOriginal) => ({
	// Channel action tools import APPROVAL_* schemas from the SDK; keep those real.
	...(await importOriginal<typeof import('@n8n/agents')>()),
	// The preview judges its run with the rule judge; `criteriaRunMock` drives its verdict.
	evals: {
		criteria: () => ({
			model: () => ({ run: (...args: unknown[]) => criteriaRunMock(...args) }),
		}),
	},
	Agent: class {
		model() {
			return this;
		}
		instructions() {
			return this;
		}
		structuredOutput() {
			return this;
		}
		async generate(...args: unknown[]) {
			return await generateMock(...args);
		}
	},
}));

// Model + credential resolution touches credentials/DB — stub it. The provider
// support check (`isSupportedAgentProvider`) and `getProviderPrefix` stay real
// so the "unsupported provider" path is exercised for real.
const { resolveModelMock } = vi.hoisted(() => ({ resolveModelMock: vi.fn() }));
vi.mock('../../agents/json-config/model-config', () => ({
	resolveCredentialAwareModelConfig: (...args: unknown[]) => resolveModelMock(...args),
}));
vi.mock('../../agents/utils/agent-credential-provider', () => ({
	createAgentCredentialProvider: vi.fn(() => ({})),
}));

const user = mock<User>({ id: 'user-1' });

function makeConfig(over: Partial<AgentJsonConfig> = {}): AgentJsonConfig {
	return {
		name: 'Support Bot',
		model: 'anthropic/claude-sonnet-4-5',
		credential: 'cred-1',
		instructions: 'Help customers with billing questions.',
		tools: [{ type: 'node', name: 'lookupOrder', node: {} }],
		...over,
	} as AgentJsonConfig;
}

function makeCases(n: number) {
	return Array.from({ length: n }, (_, i) => ({
		input: `input ${i + 1}`,
		whatToCheck: `check ${i + 1}`,
		scenario: `scenario ${i + 1}`,
	}));
}

describe('AgentEvalCaseGenerationService', () => {
	let service: AgentEvalCaseGenerationService;
	let logger: Mocked<Logger>;
	let agentConfigService: Mocked<AgentConfigService>;
	let credentialsService: Mocked<CredentialsService>;
	let dataTableService: Mocked<DataTableService>;
	let datasetRepository: Mocked<AgentEvalDatasetRepository>;
	let flagGate: Mocked<AgentEvalsFlagGate>;
	let instanceWriteAccess: Mocked<InstanceWriteAccessService>;
	let agentTestRunService: Mocked<AgentTestRunService>;

	beforeEach(() => {
		logger = mock<Logger>();
		logger.scoped.mockReturnValue(logger);
		agentConfigService = mock<AgentConfigService>();
		credentialsService = mock<CredentialsService>();
		dataTableService = mock<DataTableService>();
		datasetRepository = mock<AgentEvalDatasetRepository>();
		flagGate = mock<AgentEvalsFlagGate>();
		instanceWriteAccess = mock<InstanceWriteAccessService>();
		instanceWriteAccess.isReadOnly.mockReturnValue(false);
		agentTestRunService = mock<AgentTestRunService>();

		generateMock.mockReset();
		resolveModelMock.mockReset();
		resolveModelMock.mockResolvedValue({ id: 'anthropic/claude-sonnet-4-5' });
		criteriaRunMock.mockReset();
		criteriaRunMock.mockResolvedValue({ pass: true, reasoning: 'Satisfies the rule.' });

		flagGate.assertEnabled.mockResolvedValue(undefined);
		agentConfigService.getConfig.mockResolvedValue(makeConfig());
		dataTableService.createDataTable.mockResolvedValue({ id: 'dt-1' } as DataTable);
		dataTableService.insertRows.mockResolvedValue(undefined as never);
		datasetRepository.createDataset.mockResolvedValue({ id: 'ds-1' } as AgentEvalDataset);

		service = new AgentEvalCaseGenerationService(
			logger,
			agentConfigService,
			credentialsService,
			dataTableService,
			datasetRepository,
			flagGate,
			instanceWriteAccess,
			agentTestRunService,
		);
	});

	it('rejects when the agent-evals flag is disabled (as not-found, leaking no flag state)', async () => {
		flagGate.assertEnabled.mockRejectedValue(new NotFoundError('Not found'));

		await expect(service.generateDraftCases(user, 'project-1', 'agent-1')).rejects.toThrow(
			NotFoundError,
		);
		expect(agentConfigService.getConfig).not.toHaveBeenCalled();
	});

	it('rejects on a source-control read-only instance', async () => {
		instanceWriteAccess.isReadOnly.mockReturnValue(true);

		await expect(service.generateDraftCases(user, 'project-1', 'agent-1')).rejects.toThrow(
			ForbiddenError,
		);
		expect(agentConfigService.getConfig).not.toHaveBeenCalled();
	});

	it('rejects an agent without a configured model + credential', async () => {
		agentConfigService.getConfig.mockResolvedValue(makeConfig({ model: '', credential: '' }));

		await expect(service.generateDraftCases(user, 'project-1', 'agent-1')).rejects.toThrow(
			/configured model and API-key credential/,
		);
		expect(generateMock).not.toHaveBeenCalled();
	});

	it('rejects a managed-credential agent (no bring-your-own key)', async () => {
		agentConfigService.getConfig.mockResolvedValue(makeConfig({ credential: 'managed' }));

		await expect(service.generateDraftCases(user, 'project-1', 'agent-1')).rejects.toThrow(
			/configured model and API-key credential/,
		);
	});

	it('rejects an unsupported model provider', async () => {
		agentConfigService.getConfig.mockResolvedValue(makeConfig({ model: 'ollama/llama3' }));

		await expect(service.generateDraftCases(user, 'project-1', 'agent-1')).rejects.toThrow(
			/not supported for case generation/,
		);
		expect(generateMock).not.toHaveBeenCalled();
	});

	it('generates cases and persists them as a Data Table + dataset pointer', async () => {
		const cases = makeCases(6);
		generateMock.mockResolvedValue({ structuredOutput: { cases } });

		const result = await service.generateDraftCases(user, 'project-1', 'agent-1');

		// Prompt asks for the default count.
		expect(generateMock).toHaveBeenCalledWith(
			expect.stringContaining('Write exactly 6'),
			expect.anything(),
		);
		// Table has the input + criteria string columns.
		expect(dataTableService.createDataTable).toHaveBeenCalledWith('project-1', {
			name: 'Draft cases for Support Bot',
			columns: [
				{ name: 'input', type: 'string' },
				{ name: 'criteria', type: 'string' },
			],
		});
		// Rows map input → input, whatToCheck → criteria.
		expect(dataTableService.insertRows).toHaveBeenCalledWith(
			'dt-1',
			'project-1',
			cases.map((c) => ({ input: c.input, criteria: c.whatToCheck })),
		);
		// Dataset points at the table and never carries an expectedOutput (no gold).
		expect(datasetRepository.createDataset).toHaveBeenCalledWith({
			name: 'Draft cases for Support Bot',
			agentId: 'agent-1',
			datasetSource: 'data_table',
			datasetRef: { dataTableId: 'dt-1' },
			columnMapping: { input: 'input', criteria: 'criteria' },
			createdById: 'user-1',
		});
		expect(result).toEqual({ datasetId: 'ds-1', dataTableId: 'dt-1', cases });
	});

	it('honors a custom count in the prompt', async () => {
		generateMock.mockResolvedValue({ structuredOutput: { cases: makeCases(3) } });

		await service.generateDraftCases(user, 'project-1', 'agent-1', { count: 3 });

		expect(generateMock).toHaveBeenCalledWith(
			expect.stringContaining('Write exactly 3'),
			expect.anything(),
		);
	});

	it('passes suggestion + previous input/output through as revision context', async () => {
		generateMock.mockResolvedValue({ structuredOutput: { cases: makeCases(1) } });

		await service.generateDraftCases(user, 'project-1', 'agent-1', {
			count: 1,
			suggestion: 'It should have included the ticket number.',
			previousInput: 'Summarize the Acme outage thread',
			previousOutput: 'SSO is down for some users.',
		});

		const [prompt] = generateMock.mock.calls[0];
		expect(prompt).toContain('Write exactly 1 replacement test case');
		expect(prompt).toContain('Summarize the Acme outage thread');
		expect(prompt).toContain('SSO is down for some users.');
		expect(prompt).toContain('It should have included the ticket number.');
	});

	it('forces count to 1 for a revision even when a larger count is requested', async () => {
		// A revision always replaces one case — a caller passing a stale or
		// wrong `count` must not change that, in the prompt or in what the
		// model is required to return.
		generateMock.mockResolvedValue({ structuredOutput: { cases: makeCases(1) } });

		const result = await service.generateDraftCases(user, 'project-1', 'agent-1', {
			count: 3,
			suggestion: 'It should have included the ticket number.',
			previousInput: 'Summarize the Acme outage thread',
			previousOutput: 'SSO is down for some users.',
		});

		const [prompt] = generateMock.mock.calls[0];
		expect(prompt).toContain('Write exactly 1 replacement test case');
		expect(prompt).not.toContain('Write exactly 3');
		// If `count` had leaked through, `invokeModel` would require 3 cases
		// and this single-case response would fail and retry, then throw.
		expect(generateMock).toHaveBeenCalledTimes(1);
		expect(result.cases).toHaveLength(1);
	});

	it('asks for one case that tests the rule, whatever count was requested', async () => {
		generateMock.mockResolvedValue({ structuredOutput: { cases: makeCases(1) } });

		const result = await service.generateDraftCases(user, 'project-1', 'agent-1', {
			count: 5,
			rule: '  Never share a customer’s phone number  ',
			save: false,
		});

		const [prompt] = generateMock.mock.calls[0];
		expect(prompt).toContain('Rule: Never share a customer’s phone number');
		expect(prompt).toContain('Write exactly 1 test case');
		expect(prompt).not.toContain('Write exactly 5');
		expect(generateMock).toHaveBeenCalledTimes(1);
		expect(result.cases).toHaveLength(1);
	});

	it('ignores a blank rule and generates a fresh batch', async () => {
		generateMock.mockResolvedValue({ structuredOutput: { cases: makeCases(3) } });

		await service.generateDraftCases(user, 'project-1', 'agent-1', {
			count: 3,
			rule: '   ',
			save: false,
		});

		const [prompt] = generateMock.mock.calls[0];
		expect(prompt).toContain('Write exactly 3');
		expect(prompt).not.toContain('Rule:');
	});

	it('revises with an empty previous output and still requests exactly one case', async () => {
		generateMock.mockResolvedValue({ structuredOutput: { cases: makeCases(1) } });

		await service.generateDraftCases(user, 'project-1', 'agent-1', {
			count: 1,
			suggestion: 'It should have included the ticket number.',
			previousInput: 'Summarize the Acme outage thread',
			previousOutput: '',
		});

		const [prompt] = generateMock.mock.calls[0];
		expect(prompt).toContain('Write exactly 1 replacement test case');
		expect(prompt).toContain('(the agent did not produce an output)');
	});

	it('revises with no previous output field at all (not just empty), same as an explicit empty one', async () => {
		generateMock.mockResolvedValue({ structuredOutput: { cases: makeCases(1) } });

		await service.generateDraftCases(user, 'project-1', 'agent-1', {
			count: 1,
			suggestion: 'It should have included the ticket number.',
			previousInput: 'Summarize the Acme outage thread',
		});

		const [prompt] = generateMock.mock.calls[0];
		expect(prompt).toContain('Write exactly 1 replacement test case');
		expect(prompt).toContain('(the agent did not produce an output)');
	});

	it('ignores a partial revision (suggestion with no prior input/output) and generates fresh cases', async () => {
		generateMock.mockResolvedValue({ structuredOutput: { cases: makeCases(1) } });

		await service.generateDraftCases(user, 'project-1', 'agent-1', {
			count: 1,
			suggestion: 'It should have included the ticket number.',
		});

		expect(generateMock).toHaveBeenCalledWith(
			expect.not.stringContaining('replacement test case'),
			expect.anything(),
		);
	});

	it('passes an approved example pair through to the prompt', async () => {
		generateMock.mockResolvedValue({ structuredOutput: { cases: makeCases(6) } });

		await service.generateDraftCases(user, 'project-1', 'agent-1', {
			exampleInput: 'Summarize the Acme outage thread',
			exampleOutput: 'Ticket #48219 · SSO failing for 340 users.',
		});

		const [prompt] = generateMock.mock.calls[0];
		expect(prompt).toContain('already approved');
		expect(prompt).toContain('Summarize the Acme outage thread');
		expect(prompt).toContain('Ticket #48219 · SSO failing for 340 users.');
	});

	it('ignores a partial example (only one of input/output given)', async () => {
		generateMock.mockResolvedValue({ structuredOutput: { cases: makeCases(6) } });

		await service.generateDraftCases(user, 'project-1', 'agent-1', {
			exampleInput: 'Summarize the Acme outage thread',
		});

		expect(generateMock).toHaveBeenCalledWith(
			expect.not.stringContaining('already approved'),
			expect.anything(),
		);
	});

	it('retries once on invalid structured output, then succeeds', async () => {
		generateMock
			.mockResolvedValueOnce({ structuredOutput: { not: 'valid' } })
			.mockResolvedValueOnce({ structuredOutput: { cases: makeCases(6) } });

		await expect(service.generateDraftCases(user, 'project-1', 'agent-1')).resolves.toMatchObject({
			datasetId: 'ds-1',
		});
		expect(generateMock).toHaveBeenCalledTimes(2);
	});

	it('fails without persisting when the model returns no cases after a retry', async () => {
		generateMock.mockResolvedValue({ structuredOutput: { cases: [] } });

		await expect(service.generateDraftCases(user, 'project-1', 'agent-1')).rejects.toThrow(
			/fewer valid cases than requested/,
		);
		expect(dataTableService.createDataTable).not.toHaveBeenCalled();
	});

	it('fails without persisting when the model returns fewer cases than requested', async () => {
		// Default count is 6; the model only returns 4 on both attempts.
		generateMock.mockResolvedValue({ structuredOutput: { cases: makeCases(4) } });

		await expect(service.generateDraftCases(user, 'project-1', 'agent-1')).rejects.toThrow(
			/fewer valid cases than requested/,
		);
		expect(generateMock).toHaveBeenCalledTimes(2);
		expect(dataTableService.createDataTable).not.toHaveBeenCalled();
	});

	it('retries when the first response is underfilled, then succeeds', async () => {
		generateMock
			.mockResolvedValueOnce({ structuredOutput: { cases: makeCases(4) } })
			.mockResolvedValueOnce({ structuredOutput: { cases: makeCases(6) } });

		await expect(service.generateDraftCases(user, 'project-1', 'agent-1')).resolves.toMatchObject({
			datasetId: 'ds-1',
		});
		expect(generateMock).toHaveBeenCalledTimes(2);
	});

	it('trims fields and drops blank cases from the model output', async () => {
		generateMock.mockResolvedValue({
			structuredOutput: {
				cases: [
					{ input: '  needs trimming  ', whatToCheck: '  ok  ', scenario: '  Vague  ' },
					...makeCases(5),
					{ input: '   ', whatToCheck: 'blank input dropped', scenario: 'x' },
					{ input: 'blank check dropped', whatToCheck: '  ', scenario: 'x' },
					{ input: 'blank scenario dropped', whatToCheck: 'ok', scenario: '   ' },
				],
			},
		});

		const result = await service.generateDraftCases(user, 'project-1', 'agent-1');

		// 9 returned, 3 blank dropped → 6 valid, capped at the requested 6.
		expect(result.cases).toHaveLength(6);
		expect(result.cases[0]).toEqual({
			input: 'needs trimming',
			whatToCheck: 'ok',
			scenario: 'Vague',
		});
		const insertedRows = dataTableService.insertRows.mock.calls[0][2] as Array<{
			input: string;
			criteria: string;
		}>;
		expect(insertedRows.every((r) => r.input.length > 0 && r.criteria.length > 0)).toBe(true);
	});

	it('cleans up the Data Table if inserting rows fails', async () => {
		generateMock.mockResolvedValue({ structuredOutput: { cases: makeCases(6) } });
		dataTableService.insertRows.mockRejectedValue(new Error('insert failed'));

		await expect(service.generateDraftCases(user, 'project-1', 'agent-1')).rejects.toThrow(
			'insert failed',
		);
		expect(dataTableService.deleteDataTable).toHaveBeenCalledWith('dt-1', 'project-1');
		expect(datasetRepository.createDataset).not.toHaveBeenCalled();
	});

	it('cleans up the Data Table if creating the dataset pointer fails', async () => {
		generateMock.mockResolvedValue({ structuredOutput: { cases: makeCases(6) } });
		datasetRepository.createDataset.mockRejectedValue(new Error('dataset insert failed'));

		await expect(service.generateDraftCases(user, 'project-1', 'agent-1')).rejects.toThrow(
			'dataset insert failed',
		);
		// The rows were inserted, but the pointer failed — so the table must be rolled back.
		expect(dataTableService.insertRows).toHaveBeenCalled();
		expect(dataTableService.deleteDataTable).toHaveBeenCalledWith('dt-1', 'project-1');
	});

	it('caps and truncates untrusted model output before persisting', async () => {
		// Model returns more cases than requested (default 6), with oversized fields.
		const overLimit = Array.from({ length: 8 }, (_, i) => ({
			input: i === 0 ? 'x'.repeat(5000) : `input ${i + 1}`,
			whatToCheck: `check ${i + 1}`,
			scenario: i === 0 ? 'y'.repeat(100) : `scenario ${i + 1}`,
		}));
		generateMock.mockResolvedValue({ structuredOutput: { cases: overLimit } });

		const result = await service.generateDraftCases(user, 'project-1', 'agent-1');

		expect(result.cases).toHaveLength(6);
		expect(result.cases[0].scenario).toHaveLength(40);
		const insertedRows = dataTableService.insertRows.mock.calls[0][2] as Array<{
			input: string;
			criteria: string;
		}>;
		expect(insertedRows).toHaveLength(6);
		expect(insertedRows[0].input).toHaveLength(2000);
	});

	it('retries with a suffixed name on a per-project name clash', async () => {
		generateMock.mockResolvedValue({ structuredOutput: { cases: makeCases(6) } });
		dataTableService.createDataTable
			.mockRejectedValueOnce(new DataTableNameConflictError('Draft cases for Support Bot'))
			.mockResolvedValueOnce({ id: 'dt-1' } as DataTable);

		await service.generateDraftCases(user, 'project-1', 'agent-1');

		expect(dataTableService.createDataTable).toHaveBeenCalledTimes(2);
		expect(dataTableService.createDataTable).toHaveBeenLastCalledWith('project-1', {
			name: 'Draft cases for Support Bot (2)',
			columns: [
				{ name: 'input', type: 'string' },
				{ name: 'criteria', type: 'string' },
			],
		});
		expect(datasetRepository.createDataset).toHaveBeenCalledWith(
			expect.objectContaining({ name: 'Draft cases for Support Bot (2)' }),
		);
	});

	describe('save: false (preview, no persistence)', () => {
		it('returns the drafted cases without creating a Data Table or dataset', async () => {
			const cases = makeCases(10);
			generateMock.mockResolvedValue({ structuredOutput: { cases } });

			const result = await service.generateDraftCases(user, 'project-1', 'agent-1', {
				count: 10,
				save: false,
			});

			expect(result).toEqual({ cases });
			expect(dataTableService.createDataTable).not.toHaveBeenCalled();
			expect(dataTableService.insertRows).not.toHaveBeenCalled();
			expect(datasetRepository.createDataset).not.toHaveBeenCalled();
		});

		it('still generates from the agent model (only persistence is skipped)', async () => {
			generateMock.mockResolvedValue({ structuredOutput: { cases: makeCases(3) } });

			await service.generateDraftCases(user, 'project-1', 'agent-1', { count: 3, save: false });

			expect(generateMock).toHaveBeenCalledWith(
				expect.stringContaining('Write exactly 3'),
				expect.anything(),
			);
		});
	});

	describe('createEmptyDataset', () => {
		it('creates the Data Table + dataset pointer with no rows, no LLM call', async () => {
			const result = await service.createEmptyDataset(user, 'project-1', 'agent-1');

			expect(generateMock).not.toHaveBeenCalled();
			expect(dataTableService.createDataTable).toHaveBeenCalledWith('project-1', {
				name: 'Draft cases for Support Bot',
				columns: [
					{ name: 'input', type: 'string' },
					{ name: 'criteria', type: 'string' },
				],
			});
			expect(dataTableService.insertRows).not.toHaveBeenCalled();
			expect(datasetRepository.createDataset).toHaveBeenCalledWith({
				name: 'Draft cases for Support Bot',
				agentId: 'agent-1',
				datasetSource: 'data_table',
				datasetRef: { dataTableId: 'dt-1' },
				columnMapping: { input: 'input', criteria: 'criteria' },
				createdById: 'user-1',
			});
			expect(result).toEqual({
				datasetId: 'ds-1',
				dataTableId: 'dt-1',
				columnMapping: { input: 'input', criteria: 'criteria' },
			});
		});

		it('honors a custom dataset name', async () => {
			await service.createEmptyDataset(user, 'project-1', 'agent-1', 'My checks');

			expect(dataTableService.createDataTable).toHaveBeenCalledWith(
				'project-1',
				expect.objectContaining({ name: 'My checks' }),
			);
		});

		it('rejects when the agent-evals flag is disabled', async () => {
			flagGate.assertEnabled.mockRejectedValue(new NotFoundError('Not found'));

			await expect(service.createEmptyDataset(user, 'project-1', 'agent-1')).rejects.toThrow(
				NotFoundError,
			);
			expect(dataTableService.createDataTable).not.toHaveBeenCalled();
		});

		it('rejects on a source-control read-only instance', async () => {
			instanceWriteAccess.isReadOnly.mockReturnValue(true);

			await expect(service.createEmptyDataset(user, 'project-1', 'agent-1')).rejects.toThrow(
				ForbiddenError,
			);
			expect(dataTableService.createDataTable).not.toHaveBeenCalled();
		});
	});

	describe('deleteDraftTable', () => {
		it('deletes the table in its own project', async () => {
			dataTableService.deleteDataTable.mockResolvedValue(true);

			await service.deleteDraftTable('dt-1', 'project-1');

			expect(dataTableService.deleteDataTable).toHaveBeenCalledWith('dt-1', 'project-1');
		});

		// Unlike the rollback after a failed persist, this is the cleanup itself:
		// swallowing the error would report a table that is still there as gone.
		it('lets a failure propagate instead of logging it', async () => {
			dataTableService.deleteDataTable.mockRejectedValue(new Error('table is locked'));

			await expect(service.deleteDraftTable('dt-1', 'project-1')).rejects.toThrow(
				'table is locked',
			);
		});
	});

	describe('previewRun', () => {
		it('drafts one case and runs it against the agent, persisting nothing', async () => {
			generateMock.mockResolvedValue({ structuredOutput: { cases: makeCases(1) } });
			agentTestRunService.executeDraftRun.mockResolvedValue({
				status: 'completed',
				response: 'The answer is 42.',
				executionId: 'exec-1',
				sessionId: 'session-1',
			});

			const result = await service.previewRun(user, 'project-1', 'agent-1');

			expect(agentTestRunService.executeDraftRun).toHaveBeenCalledWith(
				expect.objectContaining({
					agentId: 'agent-1',
					projectId: 'project-1',
					user,
					message: 'input 1',
					source: 'agent-eval-preview',
				}),
			);
			expect(result).toEqual({
				status: 'completed',
				input: 'input 1',
				whatToCheck: 'check 1',
				scenario: 'scenario 1',
				response: 'The answer is 42.',
				verdict: { status: 'completed', outcome: 'pass', reasoning: 'Satisfies the rule.' },
			});
			expect(dataTableService.createDataTable).not.toHaveBeenCalled();
			expect(datasetRepository.createDataset).not.toHaveBeenCalled();
		});

		describe('judging the run', () => {
			beforeEach(() => {
				generateMock.mockResolvedValue({ structuredOutput: { cases: makeCases(1) } });
				agentTestRunService.executeDraftRun.mockResolvedValue({
					status: 'completed',
					response: 'The answer is 42.',
					executionId: 'exec-1',
					sessionId: 'session-1',
				});
			});

			it('grades the response against the rule the case was drafted with', async () => {
				await service.previewRun(user, 'project-1', 'agent-1');

				expect(criteriaRunMock).toHaveBeenCalledWith({
					input: 'input 1',
					output: 'The answer is 42.',
					criteria: 'check 1',
				});
			});

			it('returns a fail verdict with the judge’s reasoning', async () => {
				criteriaRunMock.mockResolvedValue({ pass: false, reasoning: 'Never gives a number.' });

				const result = await service.previewRun(user, 'project-1', 'agent-1');

				expect(result).toMatchObject({
					status: 'completed',
					verdict: { status: 'completed', outcome: 'fail', reasoning: 'Never gives a number.' },
				});
			});

			describe('suggesting a fix', () => {
				const suggestionOutput = { structuredOutput: { suggestion: 'Always state a number.' } };

				it('attaches one suggestion to the verdict of a failed rule', async () => {
					criteriaRunMock.mockResolvedValue({ pass: false, reasoning: 'Never gives a number.' });
					generateMock
						.mockResolvedValueOnce({ structuredOutput: { cases: makeCases(1) } })
						.mockResolvedValueOnce(suggestionOutput);

					const result = await service.previewRun(user, 'project-1', 'agent-1');

					expect(result).toMatchObject({
						status: 'completed',
						verdict: {
							status: 'completed',
							outcome: 'fail',
							reasoning: 'Never gives a number.',
							suggestion: 'Always state a number.',
						},
					});
					const [prompt] = generateMock.mock.calls[1];
					expect(prompt).toContain('check 1');
					expect(prompt).toContain('Never gives a number.');
				});

				it('leaves the suggestion off when none comes back', async () => {
					criteriaRunMock.mockResolvedValue({ pass: false, reasoning: 'Never gives a number.' });
					generateMock
						.mockResolvedValueOnce({ structuredOutput: { cases: makeCases(1) } })
						.mockResolvedValueOnce({ structuredOutput: { suggestion: '   ' } });

					const result = await service.previewRun(user, 'project-1', 'agent-1');

					expect(result).toMatchObject({ status: 'completed', verdict: { outcome: 'fail' } });
					expect(result).not.toHaveProperty('verdict.suggestion');
				});

				it('does not suggest for a passing rule', async () => {
					criteriaRunMock.mockResolvedValue({ pass: true, reasoning: 'Gives a number.' });

					const result = await service.previewRun(user, 'project-1', 'agent-1');

					expect(generateMock).toHaveBeenCalledTimes(1);
					expect(result).not.toHaveProperty('verdict.suggestion');
				});

				it('does not suggest when the judge errored', async () => {
					criteriaRunMock.mockRejectedValue(new Error('judge model timed out'));

					const result = await service.previewRun(user, 'project-1', 'agent-1');

					expect(generateMock).toHaveBeenCalledTimes(1);
					expect(result).not.toHaveProperty('verdict.suggestion');
				});

				it('does not suggest when the case has no rule to grade against', async () => {
					generateMock.mockReset();

					const result = await service.runPreviewCase(user, 'project-1', 'agent-1', {
						input: 'input 1',
						whatToCheck: '  ',
						scenario: '',
					});

					expect(generateMock).not.toHaveBeenCalled();
					expect(result).toMatchObject({ verdict: { status: 'skipped' } });
				});
			});

			// A judge outage must not throw away an agent run that finished.
			it('still completes the preview, with an error verdict, when the judge throws', async () => {
				criteriaRunMock.mockRejectedValue(new Error('judge model timed out'));

				const result = await service.previewRun(user, 'project-1', 'agent-1');

				expect(result).toMatchObject({
					status: 'completed',
					response: 'The answer is 42.',
					verdict: { status: 'error', outcome: null, reasoning: 'judge model timed out' },
				});
			});

			it('still completes the preview, with an error verdict, when the agent has no judge credential', async () => {
				// Drafting needs the credential too, so only the judge's own lookup lacks it.
				agentConfigService.getConfig
					.mockResolvedValueOnce(makeConfig())
					.mockResolvedValueOnce(makeConfig({ credential: '' }));

				const result = await service.previewRun(user, 'project-1', 'agent-1');

				expect(result).toMatchObject({ status: 'completed', verdict: { status: 'error' } });
				expect(criteriaRunMock).not.toHaveBeenCalled();
			});

			it('does not judge a run that failed', async () => {
				agentTestRunService.executeDraftRun.mockResolvedValue({
					status: 'agent_misconfigured',
					missing: ['model'],
				});

				await expect(service.previewRun(user, 'project-1', 'agent-1')).resolves.toEqual({
					status: 'failed',
				});
				expect(criteriaRunMock).not.toHaveBeenCalled();
			});
		});

		describe('runPreviewCase', () => {
			it('runs the given case without drafting a new one', async () => {
				agentTestRunService.executeDraftRun.mockResolvedValue({
					status: 'completed',
					response: 'The answer is 42.',
					executionId: 'exec-1',
					sessionId: 'session-1',
				});
				criteriaRunMock.mockResolvedValue({ pass: true, reasoning: 'Gives a number.' });

				const result = await service.runPreviewCase(user, 'project-1', 'agent-1', {
					input: 'What is the answer?',
					whatToCheck: 'gives a number',
					scenario: '',
				});

				expect(generateMock).not.toHaveBeenCalled();
				expect(agentTestRunService.executeDraftRun).toHaveBeenCalledWith(
					expect.objectContaining({ message: 'What is the answer?' }),
				);
				expect(result).toEqual({
					status: 'completed',
					input: 'What is the answer?',
					whatToCheck: 'gives a number',
					scenario: '',
					response: 'The answer is 42.',
					verdict: { status: 'completed', outcome: 'pass', reasoning: 'Gives a number.' },
				});
			});
		});

		it('passes revision context through to the one-case draft', async () => {
			generateMock.mockResolvedValue({ structuredOutput: { cases: makeCases(1) } });
			agentTestRunService.executeDraftRun.mockResolvedValue({
				status: 'completed',
				response: 'answer',
				executionId: 'exec-1',
				sessionId: 'session-1',
			});

			await service.previewRun(user, 'project-1', 'agent-1', {
				suggestion: 'Mention the ticket number.',
				previousInput: 'Summarize the outage',
				previousOutput: 'It is down.',
			});

			const [prompt] = generateMock.mock.calls[0];
			expect(prompt).toContain('Write exactly 1 replacement test case');
			expect(prompt).toContain('Mention the ticket number.');
		});

		it('reports failure without calling the agent when generation yields no case', async () => {
			generateMock.mockResolvedValue({ structuredOutput: { cases: [] } });

			await expect(service.previewRun(user, 'project-1', 'agent-1')).rejects.toThrow(
				/fewer valid cases than requested/,
			);
			expect(agentTestRunService.executeDraftRun).not.toHaveBeenCalled();
		});

		it('reports failure when the run suspends on a tool approval', async () => {
			generateMock.mockResolvedValue({ structuredOutput: { cases: makeCases(1) } });
			agentTestRunService.executeDraftRun.mockResolvedValue({
				status: 'suspended',
				suspensions: [],
				response: '',
				executionId: 'exec-1',
				sessionId: 'session-1',
			});

			const result = await service.previewRun(user, 'project-1', 'agent-1');

			expect(result).toEqual({ status: 'failed' });
		});

		it('reports failure when the agent is misconfigured', async () => {
			generateMock.mockResolvedValue({ structuredOutput: { cases: makeCases(1) } });
			agentTestRunService.executeDraftRun.mockResolvedValue({
				status: 'agent_misconfigured',
				missing: ['model'],
			});

			const result = await service.previewRun(user, 'project-1', 'agent-1');

			expect(result).toEqual({ status: 'failed' });
		});

		// A `'completed'` run that hit `maxIterations` was cut off, not finished —
		// treating it as success would present an incomplete response as an
		// approved example.
		it('reports failure when the run completes but hit max iterations', async () => {
			generateMock.mockResolvedValue({ structuredOutput: { cases: makeCases(1) } });
			agentTestRunService.executeDraftRun.mockResolvedValue({
				status: 'completed',
				maxIterations: true,
				response: 'partial answer',
				executionId: 'exec-1',
				sessionId: 'session-1',
			});

			const result = await service.previewRun(user, 'project-1', 'agent-1');

			expect(result).toEqual({ status: 'failed' });
		});
	});
});
