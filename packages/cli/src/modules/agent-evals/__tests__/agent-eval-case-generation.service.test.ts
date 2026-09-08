import type { AgentJsonConfig } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import type { AgentEvalDataset, AgentEvalDatasetRepository, User } from '@n8n/db';
import type { Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { CredentialsService } from '@/credentials/credentials.service';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import type { InstanceWriteAccessService } from '@/services/instance-write-access.service';

import type { AgentConfigService } from '../../agents/agent-config.service';
import type { DataTable } from '../../data-table/data-table.entity';
import type { DataTableService } from '../../data-table/data-table.service';
import { DataTableNameConflictError } from '../../data-table/errors/data-table-name-conflict.error';
import { AgentEvalCaseGenerationService } from '../agent-eval-case-generation.service';
import type { AgentEvalsFlagGate } from '../agent-evals-flag-gate';

// Stub the @n8n/agents SDK: fluent builder is a no-op; `generate` is a
// controllable mock so tests drive the model's (in)valid structured output.
const { generateMock } = vi.hoisted(() => ({ generateMock: vi.fn() }));
vi.mock('@n8n/agents', () => ({
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

		generateMock.mockReset();
		resolveModelMock.mockReset();
		resolveModelMock.mockResolvedValue({ id: 'anthropic/claude-sonnet-4-5' });

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
					{ input: '  needs trimming  ', whatToCheck: '  ok  ' },
					...makeCases(5),
					{ input: '   ', whatToCheck: 'blank input dropped' },
					{ input: 'blank check dropped', whatToCheck: '  ' },
				],
			},
		});

		const result = await service.generateDraftCases(user, 'project-1', 'agent-1');

		// 8 returned, 2 blank dropped → 6 valid, capped at the requested 6.
		expect(result.cases).toHaveLength(6);
		expect(result.cases[0]).toEqual({ input: 'needs trimming', whatToCheck: 'ok' });
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
		// Model returns more cases than requested (default 6), with an oversized field.
		const overLimit = Array.from({ length: 8 }, (_, i) => ({
			input: i === 0 ? 'x'.repeat(5000) : `input ${i + 1}`,
			whatToCheck: `check ${i + 1}`,
		}));
		generateMock.mockResolvedValue({ structuredOutput: { cases: overLimit } });

		const result = await service.generateDraftCases(user, 'project-1', 'agent-1');

		expect(result.cases).toHaveLength(6);
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
});
