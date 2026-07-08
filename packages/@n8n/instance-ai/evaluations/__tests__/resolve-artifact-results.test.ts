import type { EvaluationConfigDto, InstanceAiAgentNode, InstanceAiMessage } from '@n8n/api-types';
import type { Mock, MockedFunction } from 'vitest';
import { vi } from 'vitest';

vi.mock('../../src/utils/eval-agents', () => ({
	createEvalAgent: vi.fn(),
	EPHEMERAL_CACHE: {},
	SONNET_MODEL: 'test-sonnet-model',
}));

import { createEvalAgent } from '../../src/utils/eval-agents';
import type {
	DataTableColumnsResponse,
	DataTableRowsResponse,
	N8nClient,
} from '../clients/n8n-client';
import { resolveArtifactResults } from '../harness/artifacts/resolve-artifact-results';
import type { EvalLogger } from '../harness/logger';
import type { WorkflowTestCase } from '../types';

const mockCreateEvalAgent = createEvalAgent as MockedFunction<typeof createEvalAgent>;

type JudgeResponse = {
	structuredOutput?: { results: Array<{ index: number; pass: boolean; reason: string }> };
};
type GenerateFn = (messages: unknown, opts: unknown) => Promise<JudgeResponse>;
type GenerateMock = Mock<GenerateFn>;

/** Wire createEvalAgent().structuredOutput().generate() to the given generate mock. */
function mockJudge(generate: GenerateMock): void {
	const structuredOutput = vi.fn().mockReturnValue({ generate });
	mockCreateEvalAgent.mockReturnValue({ structuredOutput } as unknown as ReturnType<
		typeof createEvalAgent
	>);
}

const silentLogger: EvalLogger = {
	info: () => {},
	verbose: () => {},
	success: () => {},
	warn: vi.fn(),
	error: () => {},
	isVerbose: false,
};

function agentNode(overrides: Partial<InstanceAiAgentNode> = {}): InstanceAiAgentNode {
	return {
		agentId: 'agent-1',
		role: 'builder',
		status: 'completed',
		textContent: '',
		reasoning: '',
		toolCalls: [],
		children: [],
		timeline: [],
		...overrides,
	};
}

function assistantMessage(agentTree: InstanceAiAgentNode): InstanceAiMessage {
	return {
		id: 'msg-1',
		role: 'assistant',
		createdAt: new Date().toISOString(),
		content: '',
		reasoning: '',
		isStreaming: false,
		agentTree,
	};
}

function baseTestCase(overrides: Partial<WorkflowTestCase> = {}): WorkflowTestCase {
	return { complexity: 'simple', tags: [], datasets: ['full'], ...overrides };
}

function dataTableConfig(workflowId: string, dataTableId: string): EvaluationConfigDto {
	return {
		id: 'config-1',
		workflowId,
		name: 'My eval',
		status: 'valid',
		invalidReason: null,
		startNodeName: 'Start',
		endNodeName: 'End',
		metrics: [
			{ id: 'metric-1', name: 'Correctness', type: 'llm_judge', config: { preset: 'correctness' } },
		],
		datasetSource: 'data_table',
		datasetRef: { dataTableId },
	};
}

describe('resolveArtifactResults', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns [] for a workflow-only case and never touches the client or the judge', async () => {
		const client = {
			getPersonalProjectId: vi.fn(),
			getAgentConfig: vi.fn(),
			getAgentSkills: vi.fn(),
			getWorkflowEvaluationConfigs: vi.fn(),
			getDataTableColumns: vi.fn(),
			getDataTableRows: vi.fn(),
		} as unknown as N8nClient;

		const results = await resolveArtifactResults({
			messages: [],
			testCase: baseTestCase(),
			client,
			logger: silentLogger,
		});

		expect(results).toEqual([]);
		expect(mockCreateEvalAgent).not.toHaveBeenCalled();
		expect(client.getPersonalProjectId).not.toHaveBeenCalled();
	});

	it('flags a discovered agent artifact as unexpected when expectedArtifacts only lists workflow', async () => {
		const messages: InstanceAiMessage[] = [
			assistantMessage(agentNode({ targetResource: { type: 'agent', id: 'agent-x' } })),
		];
		const client = {} as unknown as N8nClient;

		const results = await resolveArtifactResults({
			messages,
			testCase: baseTestCase({ expectedArtifacts: ['workflow'] }),
			client,
			logger: silentLogger,
		});

		expect(results).toEqual([
			{
				type: 'agent',
				id: 'agent-x',
				pass: false,
				unexpected: true,
				reason: 'unexpected agent artifact produced (not in expectedArtifacts)',
			},
		]);
		expect(mockCreateEvalAgent).not.toHaveBeenCalled();
	});

	it('judges an expected, discovered agent artifact and passes when the judge passes every assertion', async () => {
		const messages: InstanceAiMessage[] = [
			assistantMessage(agentNode({ targetResource: { type: 'agent', id: 'agent-x' } })),
		];
		const generate: GenerateMock = vi.fn<GenerateFn>().mockResolvedValue({
			structuredOutput: { results: [{ index: 0, pass: true, reason: 'looks right' }] },
		});
		mockJudge(generate);

		const getPersonalProjectId: Mock = vi.fn().mockResolvedValue('project-1');
		const getAgentConfig: Mock = vi.fn().mockResolvedValue({ name: 'My Agent' });
		const getAgentSkills: Mock = vi.fn().mockResolvedValue({});
		const client = { getPersonalProjectId, getAgentConfig, getAgentSkills } as unknown as N8nClient;

		const results = await resolveArtifactResults({
			messages,
			testCase: baseTestCase({
				expectedArtifacts: ['agent'],
				artifactExpectations: { agent: ['agent has a system prompt'] },
			}),
			client,
			logger: silentLogger,
		});

		expect(getPersonalProjectId).toHaveBeenCalled();
		expect(getAgentConfig).toHaveBeenCalledWith('project-1', 'agent-x');
		expect(getAgentSkills).toHaveBeenCalledWith('project-1', 'agent-x');
		expect(results).toEqual([
			{
				type: 'agent',
				id: 'agent-x',
				pass: true,
				expectationResults: [
					{ expectation: 'agent has a system prompt', pass: true, reason: 'looks right' },
				],
			},
		]);
	});

	it('fails an expected, discovered agent artifact when the judge fails an assertion', async () => {
		const messages: InstanceAiMessage[] = [
			assistantMessage(agentNode({ targetResource: { type: 'agent', id: 'agent-x' } })),
		];
		const generate: GenerateMock = vi.fn<GenerateFn>().mockResolvedValue({
			structuredOutput: { results: [{ index: 0, pass: false, reason: 'missing skill' }] },
		});
		mockJudge(generate);

		const client = {
			getPersonalProjectId: vi.fn().mockResolvedValue('project-1'),
			getAgentConfig: vi.fn().mockResolvedValue({}),
			getAgentSkills: vi.fn().mockResolvedValue({}),
		} as unknown as N8nClient;

		const results = await resolveArtifactResults({
			messages,
			testCase: baseTestCase({
				expectedArtifacts: ['agent'],
				artifactExpectations: { agent: ['agent has a search skill'] },
			}),
			client,
			logger: silentLogger,
		});

		expect(results).toHaveLength(1);
		expect(results[0].pass).toBe(false);
		expect(results[0].expectationResults).toEqual([
			{ expectation: 'agent has a search skill', pass: false, reason: 'missing skill' },
		]);
	});

	it('reports an expected agent artifact as not produced when discovery finds nothing', async () => {
		const client = {} as unknown as N8nClient;

		const results = await resolveArtifactResults({
			messages: [],
			testCase: baseTestCase({ expectedArtifacts: ['agent'] }),
			client,
			logger: silentLogger,
		});

		expect(results).toEqual([
			{
				type: 'agent',
				id: '(none)',
				pass: false,
				reason: 'expected agent artifact was not produced',
			},
		]);
		expect(mockCreateEvalAgent).not.toHaveBeenCalled();
	});

	it('judges an expected, discovered config-eval artifact against its data_table dataset', async () => {
		const workflowId = 'wf-1';
		const dataTableId = 'dt-1';
		const messages: InstanceAiMessage[] = [
			assistantMessage(agentNode({ targetResource: { type: 'config-eval', id: workflowId } })),
		];
		const generate: GenerateMock = vi.fn<GenerateFn>().mockResolvedValue({
			structuredOutput: { results: [{ index: 0, pass: true, reason: 'dataset looks right' }] },
		});
		mockJudge(generate);

		const columns: DataTableColumnsResponse = [
			{
				id: 'col-1',
				dataTableId,
				name: 'input',
				type: 'string',
				index: 0,
				createdAt: '2024-01-01T00:00:00.000Z',
				updatedAt: '2024-01-01T00:00:00.000Z',
			},
		];
		const rows: DataTableRowsResponse = {
			count: 1,
			data: [
				{
					id: 1,
					createdAt: '2024-01-01T00:00:00.000Z',
					updatedAt: '2024-01-01T00:00:00.000Z',
					input: 'hi',
				},
			],
		};
		const client = {
			getWorkflowEvaluationConfigs: vi
				.fn()
				.mockResolvedValue([dataTableConfig(workflowId, dataTableId)]),
			getPersonalProjectId: vi.fn().mockResolvedValue('project-1'),
			getDataTableColumns: vi.fn().mockResolvedValue(columns),
			getDataTableRows: vi.fn().mockResolvedValue(rows),
		} as unknown as N8nClient;

		const results = await resolveArtifactResults({
			messages,
			testCase: baseTestCase({
				expectedArtifacts: ['config-eval'],
				artifactExpectations: { 'config-eval': ['the dataset covers the happy path'] },
			}),
			client,
			logger: silentLogger,
		});

		expect(results).toEqual([
			{
				type: 'config-eval',
				id: workflowId,
				pass: true,
				expectationResults: [
					{
						expectation: 'the dataset covers the happy path',
						pass: true,
						reason: 'dataset looks right',
					},
				],
			},
		]);
	});

	it('fails when the judge returns only incomplete verdicts (no measured assertions)', async () => {
		const messages: InstanceAiMessage[] = [
			assistantMessage(agentNode({ targetResource: { type: 'agent', id: 'agent-x' } })),
		];
		// Every attempt resolves with an unparseable structured output, so
		// judgeExpectations exhausts its retries and returns all-incomplete verdicts.
		const generate: GenerateMock = vi.fn<GenerateFn>().mockResolvedValue({});
		mockJudge(generate);

		const client = {
			getPersonalProjectId: vi.fn().mockResolvedValue('project-1'),
			getAgentConfig: vi.fn().mockResolvedValue({}),
			getAgentSkills: vi.fn().mockResolvedValue({}),
		} as unknown as N8nClient;

		const results = await resolveArtifactResults({
			messages,
			testCase: baseTestCase({
				expectedArtifacts: ['agent'],
				artifactExpectations: { agent: ['agent has a system prompt'] },
			}),
			client,
			logger: silentLogger,
		});

		expect(results).toHaveLength(1);
		expect(results[0].pass).toBe(false);
		expect(results[0].incomplete).toBe(true);
		expect(results[0].expectationResults?.every((r) => r.incomplete)).toBe(true);
	});

	it('records a fetch/judge error as a failing verdict without throwing', async () => {
		const messages: InstanceAiMessage[] = [
			assistantMessage(agentNode({ targetResource: { type: 'agent', id: 'agent-x' } })),
		];
		const client = {
			getPersonalProjectId: vi.fn().mockRejectedValue(new Error('network down')),
			getAgentConfig: vi.fn(),
			getAgentSkills: vi.fn(),
		} as unknown as N8nClient;

		const results = await resolveArtifactResults({
			messages,
			testCase: baseTestCase({ expectedArtifacts: ['agent'] }),
			client,
			logger: silentLogger,
		});

		expect(results).toEqual([
			{
				type: 'agent',
				id: 'agent-x',
				pass: false,
				reason: 'fetch/judge error: network down',
			},
		]);
		expect(silentLogger.warn).toHaveBeenCalled();
	});
});
