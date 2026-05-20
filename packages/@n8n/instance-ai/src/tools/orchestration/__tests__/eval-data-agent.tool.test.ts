import type { WorkflowJSON } from '@n8n/workflow-sdk';

import * as sampleRowsService from '../../evals/generate-sample-rows.service';
import { createEvalDataAgentTool } from '../eval-data-agent.tool';

type EvalDataToolResult = {
	status: 'imported' | 'generated' | 'skipped';
	source?: 'history' | 'synthetic';
	rowCount?: number;
	expectedOutputsNeedUserReview?: boolean;
	expectedOutputColumns?: string[];
	table?: {
		id: string;
		name: string;
		projectId?: string;
		rowCount: number;
		inputColumns: string[];
		previewRows: Array<Record<string, unknown>>;
	};
};

async function runEvalDataTool(
	ctx: ReturnType<typeof buildOrchestrationCtx>,
	input: { workflowId: string; projectId?: string; targetAgentNodeName?: string },
): Promise<EvalDataToolResult> {
	const tool = createEvalDataAgentTool(ctx as never);
	return (await tool.handler!(input, {} as never)) as EvalDataToolResult;
}

const evalWf = (): WorkflowJSON =>
	({
		name: 't',
		nodes: [
			{
				name: 'EvalTrig',
				type: 'n8n-nodes-base.evaluationTrigger',
				typeVersion: 1,
				parameters: { dataTableId: { value: 'dt-1' } },
				position: [0, 0],
				id: 't',
			},
			{
				name: 'Agent',
				type: '@n8n/n8n-nodes-langchain.agent',
				typeVersion: 1,
				parameters: { text: '={{ $json.user_query }}' },
				position: [200, 0],
				id: 'a',
			},
		],
		connections: {
			EvalTrig: { main: [[{ node: 'Agent', type: 'main', index: 0 }]] },
		},
		pinData: {},
		settings: {},
	}) as unknown as WorkflowJSON;

const evalWfWithMetrics = (): WorkflowJSON =>
	({
		name: 't',
		nodes: [
			{
				name: 'EvalTrig',
				type: 'n8n-nodes-base.evaluationTrigger',
				typeVersion: 1,
				parameters: { dataTableId: { value: 'dt-1' } },
				position: [0, 0],
				id: 't',
			},
			{
				name: 'Agent',
				type: '@n8n/n8n-nodes-langchain.agent',
				typeVersion: 1,
				parameters: { text: '={{ $json.user_query }}' },
				position: [200, 0],
				id: 'a',
			},
			{
				name: 'MetricN',
				type: 'n8n-nodes-base.evaluation',
				typeVersion: 1,
				parameters: {
					operation: 'setMetrics',
					expectedAnswer: "={{ $('EvalTrig').item.json.expected_response }}",
					actualAnswer: '={{ $json.output }}',
				},
				position: [400, 0],
				id: 'm',
			},
		],
		connections: {
			EvalTrig: { main: [[{ node: 'Agent', type: 'main', index: 0 }]] },
			Agent: { main: [[{ node: 'MetricN', type: 'main', index: 0 }]] },
		},
		pinData: {},
		settings: {},
	}) as unknown as WorkflowJSON;

const multiAgentEvalWf = (): WorkflowJSON =>
	({
		name: 't',
		nodes: [
			{
				name: 'Router Agent',
				type: '@n8n/n8n-nodes-langchain.agent',
				typeVersion: 1,
				parameters: { text: '={{ $json.router_query }}' },
				position: [0, 0],
				id: 'router',
			},
			{
				name: 'EvalTrig',
				type: 'n8n-nodes-base.evaluationTrigger',
				typeVersion: 1,
				parameters: { dataTableId: { value: 'dt-1' } },
				position: [0, 200],
				id: 't',
			},
			{
				name: 'Answer Agent',
				type: '@n8n/n8n-nodes-langchain.agent',
				typeVersion: 1,
				parameters: { text: '={{ $json.answer_query }}' },
				position: [200, 200],
				id: 'answer',
			},
		],
		connections: {
			EvalTrig: { main: [[{ node: 'Answer Agent', type: 'main', index: 0 }]] },
		},
		pinData: {},
		settings: {},
	}) as unknown as WorkflowJSON;

const nonAgentAiTargetEvalWf = (): WorkflowJSON =>
	({
		name: 't',
		nodes: [
			{
				name: 'EvalTrig',
				type: 'n8n-nodes-base.evaluationTrigger',
				typeVersion: 1,
				parameters: { dataTableId: { value: 'dt-1' } },
				position: [0, 0],
				id: 't',
			},
			{
				name: 'LLM Chain',
				type: '@n8n/n8n-nodes-langchain.chainLlm',
				typeVersion: 1,
				parameters: { prompt: '={{ $json.user_query }}' },
				position: [200, 0],
				id: 'chain',
			},
		],
		connections: {
			EvalTrig: { main: [[{ node: 'LLM Chain', type: 'main', index: 0 }]] },
		},
		pinData: {},
		settings: {},
	}) as unknown as WorkflowJSON;

const ambiguousMultiAgentEvalWf = (): WorkflowJSON =>
	({
		name: 't',
		nodes: [
			{
				name: 'EvalTrig',
				type: 'n8n-nodes-base.evaluationTrigger',
				typeVersion: 1,
				parameters: { dataTableId: { value: 'dt-1' } },
				position: [0, 0],
				id: 't',
			},
			{
				name: 'Router Agent',
				type: '@n8n/n8n-nodes-langchain.agent',
				typeVersion: 1,
				parameters: { text: '={{ $json.router_query }}' },
				position: [200, -100],
				id: 'router',
			},
			{
				name: 'Answer Agent',
				type: '@n8n/n8n-nodes-langchain.agent',
				typeVersion: 1,
				parameters: { text: '={{ $json.answer_query }}' },
				position: [200, 100],
				id: 'answer',
			},
		],
		connections: {
			EvalTrig: {
				main: [
					[
						{ node: 'Router Agent', type: 'main', index: 0 },
						{ node: 'Answer Agent', type: 'main', index: 0 },
					],
				],
			},
		},
		pinData: {},
		settings: {},
	}) as unknown as WorkflowJSON;

const multiTargetEvalWf = (): WorkflowJSON =>
	({
		name: 't',
		nodes: [
			{
				name: 'EvalTrig1',
				type: 'n8n-nodes-base.evaluationTrigger',
				typeVersion: 1,
				parameters: { dataTableId: { value: 'dt-first' } },
				position: [0, -100],
				id: 't1',
			},
			{
				name: 'First Agent',
				type: '@n8n/n8n-nodes-langchain.agent',
				typeVersion: 1,
				parameters: { text: '={{ $json.first_query }}' },
				position: [200, -100],
				id: 'a1',
			},
			{
				name: 'EvalTrig2',
				type: 'n8n-nodes-base.evaluationTrigger',
				typeVersion: 1,
				parameters: { dataTableId: { value: 'dt-second' } },
				position: [0, 100],
				id: 't2',
			},
			{
				name: 'Second Agent',
				type: '@n8n/n8n-nodes-langchain.agent',
				typeVersion: 1,
				parameters: { text: '={{ $json.second_query }}' },
				position: [200, 100],
				id: 'a2',
			},
		],
		connections: {
			EvalTrig1: { main: [[{ node: 'First Agent', type: 'main', index: 0 }]] },
			EvalTrig2: { main: [[{ node: 'Second Agent', type: 'main', index: 0 }]] },
		},
		pinData: {},
		settings: {},
	}) as unknown as WorkflowJSON;

const defaultInsertResult = {
	insertedCount: 0,
	dataTableId: 'dt-1',
	tableName: 'eval_dataset',
	projectId: 'proj-1',
};

const silentLogger = () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() });

/** Default DataTable service stub. Override individual mocks per test as needed. */
function defaultDataTableService(
	overrides: Partial<{
		insertRows: jest.Mock;
		getSchema: jest.Mock;
		addColumn: jest.Mock;
		queryRows: jest.Mock;
	}> = {},
) {
	return {
		insertRows: jest.fn().mockResolvedValue(defaultInsertResult),
		getSchema: jest.fn().mockResolvedValue([]),
		addColumn: jest.fn().mockResolvedValue(undefined),
		queryRows: jest.fn().mockResolvedValue({ count: 0, data: [] }),
		...overrides,
	};
}

/** Execution service stub with no successful executions to read from. */
function emptyExecutionService() {
	return {
		list: jest.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([]),
		getNodeOutput: jest.fn(),
	};
}

/**
 * Execution service stub returning `count` successful executions whose
 * EvalTrig output exposes `user_query: "real-eN"` per execution.
 */
function trigInputHistoryExecutionService(count: number) {
	const summaries = Array.from({ length: count }, (_, i) => ({
		id: `e${i}`,
		status: 'success',
	}));
	return {
		list: jest.fn().mockResolvedValueOnce(summaries).mockResolvedValueOnce([]),
		getNodeOutput: jest.fn(
			async (id: string) =>
				await Promise.resolve({
					nodeName: 'EvalTrig',
					items: [{ json: { user_query: `real-${id}` } }],
					totalItems: 1,
					returned: { from: 0, to: 0 },
				}),
		),
	};
}

/**
 * Execution service stub returning `count` successful executions with both
 * an EvalTrig input (`user_query: "q-eN"`) and an Agent output (`output: "a-eN"`).
 */
function trigInputAgentOutputExecutionService(count: number) {
	const summaries = Array.from({ length: count }, (_, i) => ({
		id: `e${i}`,
		status: 'success',
	}));
	return {
		list: jest.fn().mockResolvedValueOnce(summaries).mockResolvedValueOnce([]),
		getNodeOutput: jest.fn(async (id: string, nodeName: string) =>
			nodeName === 'EvalTrig'
				? await Promise.resolve({
						nodeName,
						items: [{ json: { user_query: `q-${id}` } }],
						totalItems: 1,
						returned: { from: 0, to: 0 },
					})
				: await Promise.resolve({
						nodeName,
						items: [{ json: { output: `a-${id}` } }],
						totalItems: 1,
						returned: { from: 0, to: 0 },
					}),
		),
	};
}

interface BuildCtxOptions {
	workflow?: WorkflowJSON;
	dataTableService?: ReturnType<typeof defaultDataTableService>;
	executionService?: ReturnType<typeof emptyExecutionService>;
}

const buildOrchestrationCtx = (opts: BuildCtxOptions = {}) => ({
	domainContext: {
		workflowService: {
			getAsWorkflowJSON: jest.fn().mockResolvedValue(opts.workflow ?? evalWf()),
		},
		dataTableService: opts.dataTableService ?? defaultDataTableService(),
		executionService: opts.executionService ?? emptyExecutionService(),
		logger: silentLogger(),
	},
});

describe('eval-data tool', () => {
	beforeEach(() => {
		jest.restoreAllMocks();
	});

	it('imports rows from execution history when >= 10 valid rows are available', async () => {
		const dataTableService = defaultDataTableService({
			getSchema: jest.fn().mockResolvedValue([{ name: 'user_query' }]),
		});
		const ctx = buildOrchestrationCtx({
			dataTableService,
			executionService: trigInputHistoryExecutionService(12),
		});

		const result = await runEvalDataTool(ctx, { workflowId: 'w1' });

		expect(result.status).toBe('imported');
		expect(result.source).toBe('history');
		expect(result.rowCount).toBe(12);
		expect(dataTableService.insertRows).toHaveBeenCalledWith('dt-1', expect.any(Array), undefined);
	});

	it('falls back to synthetic generation when fewer than 10 valid history rows are available', async () => {
		const dataTableService = defaultDataTableService({
			getSchema: jest.fn().mockResolvedValue([{ name: 'user_query' }]),
		});
		const ctx = buildOrchestrationCtx({ dataTableService });
		jest
			.spyOn(sampleRowsService, 'generateSampleRows')
			.mockResolvedValue(Array.from({ length: 10 }, (_, i) => ({ user_query: `gen-${i}` })));

		const result = await runEvalDataTool(ctx, { workflowId: 'w1' });

		expect(result.status).toBe('generated');
		expect(result.source).toBe('synthetic');
		expect(result.rowCount).toBe(10);
		expect(dataTableService.insertRows).toHaveBeenCalled();
	});

	it('passes the EvaluationTrigger target agent to synthetic row generation', async () => {
		const dataTableService = defaultDataTableService({
			getSchema: jest.fn().mockResolvedValue([{ name: 'answer_query' }]),
		});
		const ctx = buildOrchestrationCtx({ workflow: multiAgentEvalWf(), dataTableService });
		const generateSpy = jest
			.spyOn(sampleRowsService, 'generateSampleRows')
			.mockResolvedValue([{ answer_query: 'generated' }]);

		await runEvalDataTool(ctx, { workflowId: 'w1' });

		expect(generateSpy).toHaveBeenCalledWith(
			expect.objectContaining({
				columns: ['answer_query'],
				targetAgentNodeName: 'Answer Agent',
			}),
		);
		expect(dataTableService.insertRows).toHaveBeenCalledWith(
			'dt-1',
			[{ answer_query: 'generated' }],
			undefined,
		);
	});

	it('populates eval data for supported non-agent AI targets', async () => {
		const dataTableService = defaultDataTableService({
			getSchema: jest.fn().mockResolvedValue([{ name: 'user_query' }]),
		});
		const ctx = buildOrchestrationCtx({ workflow: nonAgentAiTargetEvalWf(), dataTableService });
		const generateSpy = jest
			.spyOn(sampleRowsService, 'generateSampleRows')
			.mockResolvedValue([{ user_query: 'generated' }]);

		const result = await runEvalDataTool(ctx, { workflowId: 'w1' });

		expect(result.status).toBe('generated');
		expect(generateSpy).toHaveBeenCalledWith(
			expect.objectContaining({
				columns: ['user_query'],
				targetAgentNodeName: 'LLM Chain',
			}),
		);
		expect(dataTableService.insertRows).toHaveBeenCalledWith(
			'dt-1',
			[{ user_query: 'generated' }],
			undefined,
		);
	});

	it('populates eval data when the requested target is a supported non-agent AI node', async () => {
		const dataTableService = defaultDataTableService({
			getSchema: jest.fn().mockResolvedValue([{ name: 'user_query' }]),
		});
		const ctx = buildOrchestrationCtx({ workflow: nonAgentAiTargetEvalWf(), dataTableService });
		const generateSpy = jest
			.spyOn(sampleRowsService, 'generateSampleRows')
			.mockResolvedValue([{ user_query: 'generated' }]);

		const result = await runEvalDataTool(ctx, {
			workflowId: 'w1',
			targetAgentNodeName: 'LLM Chain',
		});

		expect(result.status).toBe('generated');
		expect(generateSpy).toHaveBeenCalledWith(
			expect.objectContaining({
				columns: ['user_query'],
				targetAgentNodeName: 'LLM Chain',
			}),
		);
		expect(dataTableService.insertRows).toHaveBeenCalledWith(
			'dt-1',
			[{ user_query: 'generated' }],
			undefined,
		);
	});

	it('passes the requested target agent through requirement analysis', async () => {
		const dataTableService = defaultDataTableService({
			getSchema: jest.fn().mockResolvedValue([{ name: 'answer_query' }]),
		});
		const ctx = buildOrchestrationCtx({
			workflow: ambiguousMultiAgentEvalWf(),
			dataTableService,
		});
		const generateSpy = jest
			.spyOn(sampleRowsService, 'generateSampleRows')
			.mockResolvedValue([{ answer_query: 'generated' }]);

		await runEvalDataTool(ctx, { workflowId: 'w1', targetAgentNodeName: 'Answer Agent' });

		expect(generateSpy).toHaveBeenCalledWith(
			expect.objectContaining({
				columns: ['answer_query'],
				targetAgentNodeName: 'Answer Agent',
			}),
		);
		expect(dataTableService.insertRows).toHaveBeenCalledWith(
			'dt-1',
			[{ answer_query: 'generated' }],
			undefined,
		);
	});

	it('populates the table for the requested target when multiple eval triggers exist', async () => {
		const dataTableService = defaultDataTableService({
			insertRows: jest.fn().mockResolvedValue({
				...defaultInsertResult,
				dataTableId: 'dt-second',
			}),
			getSchema: jest.fn().mockResolvedValue([{ name: 'second_query' }]),
		});
		const ctx = buildOrchestrationCtx({
			workflow: multiTargetEvalWf(),
			dataTableService,
		});
		jest
			.spyOn(sampleRowsService, 'generateSampleRows')
			.mockResolvedValue([{ second_query: 'generated' }]);

		await runEvalDataTool(ctx, { workflowId: 'w1', targetAgentNodeName: 'Second Agent' });

		expect(dataTableService.insertRows).toHaveBeenCalledWith(
			'dt-second',
			[{ second_query: 'generated' }],
			undefined,
		);
		expect(dataTableService.insertRows).not.toHaveBeenCalledWith(
			'dt-first',
			expect.anything(),
			expect.anything(),
		);
	});

	it('returns skipped when no eval target exists', async () => {
		const wf: WorkflowJSON = {
			name: 't',
			nodes: [],
			connections: {},
			pinData: {},
			settings: {},
		} as never;
		const ctx = buildOrchestrationCtx({ workflow: wf });

		const result = await runEvalDataTool(ctx, { workflowId: 'w1' });

		expect(result.status).toBe('skipped');
	});

	it('populates with the fallback "input" column when agent has no $json refs', async () => {
		const wf = {
			name: 't',
			nodes: [
				{
					name: 'EvalTrig',
					type: 'n8n-nodes-base.evaluationTrigger',
					typeVersion: 1,
					parameters: { dataTableId: { value: 'dt-1' } },
					position: [0, 0],
					id: 't',
				},
				// Agent with no $json refs in its parameters
				{
					name: 'Agent',
					type: '@n8n/n8n-nodes-langchain.agent',
					typeVersion: 1,
					parameters: { text: 'literal prompt' },
					position: [200, 0],
					id: 'a',
				},
			],
			connections: {
				EvalTrig: { main: [[{ node: 'Agent', type: 'main', index: 0 }]] },
			},
			pinData: {},
			settings: {},
		} as unknown as WorkflowJSON;
		const dataTableService = defaultDataTableService({
			getSchema: jest.fn().mockResolvedValue([{ name: 'input' }]),
		});
		const ctx = buildOrchestrationCtx({ workflow: wf, dataTableService });
		jest.spyOn(sampleRowsService, 'generateSampleRows').mockResolvedValue([{ input: 'sample' }]);

		const result = await runEvalDataTool(ctx, { workflowId: 'w1' });

		expect(result.status).toBe('generated');
		expect(dataTableService.insertRows).toHaveBeenCalledWith(
			'dt-1',
			[{ input: 'sample' }],
			undefined,
		);
	});

	it('populates expected_* columns from agent output in the history path', async () => {
		const dataTableService = defaultDataTableService({
			getSchema: jest
				.fn()
				.mockResolvedValue([{ name: 'user_query' }, { name: 'expected_response' }]),
		});
		const ctx = buildOrchestrationCtx({
			workflow: evalWfWithMetrics(),
			dataTableService,
			executionService: trigInputAgentOutputExecutionService(12),
		});

		const result = await runEvalDataTool(ctx, { workflowId: 'w1' });

		expect(result.status).toBe('imported');
		expect(result.rowCount).toBe(12);
		expect(dataTableService.insertRows).toHaveBeenCalledWith('dt-1', expect.any(Array), undefined);
		expect(dataTableService.insertRows).toHaveBeenCalledWith(
			'dt-1',
			expect.arrayContaining([{ user_query: 'q-e0', expected_response: 'a-e0' }]),
			undefined,
		);
	});

	it('synthetic path generates ONLY input columns and flags expected outputs for user review', async () => {
		const dataTableService = defaultDataTableService({
			getSchema: jest
				.fn()
				.mockResolvedValue([{ name: 'user_query' }, { name: 'expected_response' }]),
		});
		const ctx = buildOrchestrationCtx({ workflow: evalWfWithMetrics(), dataTableService });
		const generateSpy = jest
			.spyOn(sampleRowsService, 'generateSampleRows')
			.mockResolvedValue([{ user_query: 'q' }]);

		const result = await runEvalDataTool(ctx, { workflowId: 'w1' });

		expect(generateSpy).toHaveBeenCalledWith(
			expect.objectContaining({
				columns: ['user_query'],
				rowCount: 10,
			}),
		);
		expect(result).toMatchObject({
			status: 'generated',
			source: 'synthetic',
			expectedOutputsNeedUserReview: true,
			expectedOutputColumns: ['expected_response'],
		});
		expect(dataTableService.insertRows).toHaveBeenCalledWith(
			'dt-1',
			[{ user_query: 'q', expected_response: '' }],
			undefined,
		);
	});

	it('does not flag user review on the history path (real outputs are ground truth)', async () => {
		const dataTableService = defaultDataTableService({
			getSchema: jest
				.fn()
				.mockResolvedValue([{ name: 'user_query' }, { name: 'expected_response' }]),
		});
		const ctx = buildOrchestrationCtx({
			workflow: evalWfWithMetrics(),
			dataTableService,
			executionService: trigInputAgentOutputExecutionService(12),
		});

		const result = await runEvalDataTool(ctx, { workflowId: 'w1' });

		expect(result.source).toBe('history');
		expect(result.expectedOutputsNeedUserReview).toBeUndefined();
	});

	it('does not flag user review when there are no expected-output columns', async () => {
		const dataTableService = defaultDataTableService({
			getSchema: jest.fn().mockResolvedValue([{ name: 'user_query' }]),
		});
		const ctx = buildOrchestrationCtx({ dataTableService });
		jest.spyOn(sampleRowsService, 'generateSampleRows').mockResolvedValue([{ user_query: 'q' }]);

		const result = await runEvalDataTool(ctx, { workflowId: 'w1' });

		expect(result.source).toBe('synthetic');
		expect(result.expectedOutputsNeedUserReview).toBeUndefined();
	});

	it('adds missing columns to the DataTable before inserting rows', async () => {
		// Schema has only the input column; expected_response is missing.
		const dataTableService = defaultDataTableService({
			getSchema: jest.fn().mockResolvedValue([{ name: 'user_query' }]),
		});
		const ctx = buildOrchestrationCtx({
			workflow: evalWfWithMetrics(),
			dataTableService,
		});
		jest
			.spyOn(sampleRowsService, 'generateSampleRows')
			.mockResolvedValue([{ user_query: 'q', expected_response: 'r' }]);

		await runEvalDataTool(ctx, { workflowId: 'w1' });

		expect(dataTableService.getSchema).toHaveBeenCalledWith('dt-1', undefined);
		expect(dataTableService.addColumn).toHaveBeenCalledTimes(1);
		expect(dataTableService.addColumn).toHaveBeenCalledWith(
			'dt-1',
			{ name: 'expected_response', type: 'string' },
			undefined,
		);
		expect(dataTableService.insertRows).toHaveBeenCalled();
		expect(dataTableService.insertRows).toHaveBeenCalledWith(
			'dt-1',
			[{ user_query: 'q', expected_response: '' }],
			undefined,
		);
		expect(dataTableService.addColumn.mock.invocationCallOrder[0]).toBeLessThan(
			dataTableService.insertRows.mock.invocationCallOrder[0],
		);
	});

	it('does not add columns that already exist in the DataTable schema', async () => {
		const dataTableService = defaultDataTableService({
			getSchema: jest
				.fn()
				.mockResolvedValue([{ name: 'user_query' }, { name: 'expected_response' }]),
		});
		const ctx = buildOrchestrationCtx({
			workflow: evalWfWithMetrics(),
			dataTableService,
		});
		jest
			.spyOn(sampleRowsService, 'generateSampleRows')
			.mockResolvedValue([{ user_query: 'q', expected_response: 'r' }]);

		await runEvalDataTool(ctx, { workflowId: 'w1' });

		expect(dataTableService.addColumn).not.toHaveBeenCalled();
		expect(dataTableService.insertRows).toHaveBeenCalled();
	});

	it('forwards projectId to insertRows when present', async () => {
		const dataTableService = defaultDataTableService({
			getSchema: jest.fn().mockResolvedValue([{ name: 'user_query' }]),
		});
		const ctx = buildOrchestrationCtx({ dataTableService });
		jest.spyOn(sampleRowsService, 'generateSampleRows').mockResolvedValue([{ user_query: 'q' }]);

		await runEvalDataTool(ctx, { workflowId: 'w1', projectId: 'proj-1' });

		expect(dataTableService.insertRows).toHaveBeenCalledWith('dt-1', expect.any(Array), {
			projectId: 'proj-1',
		});
	});

	it('returns a `table` summary so the agent can recap the populated dataset to the user', async () => {
		const dataTableService = defaultDataTableService({
			getSchema: jest.fn().mockResolvedValue([{ name: 'user_query' }]),
			queryRows: jest.fn().mockResolvedValue({
				count: 2,
				data: [
					{
						user_query:
							'first question with a really long body that should be truncated past eighty characters of content easily',
					},
					{ user_query: 'second' },
				],
			}),
		});
		const ctx = buildOrchestrationCtx({ dataTableService });
		jest.spyOn(sampleRowsService, 'generateSampleRows').mockResolvedValue([{ user_query: 'q' }]);

		const result = await runEvalDataTool(ctx, { workflowId: 'w1' });

		expect(result.table).toMatchObject({
			id: 'dt-1',
			name: 'eval_dataset',
			projectId: 'proj-1',
			rowCount: 1,
			inputColumns: ['user_query'],
		});
		expect(result.table?.previewRows).toHaveLength(2);
		// First row's long string should be truncated.
		expect(String(result.table?.previewRows[0]?.user_query)).toMatch(/…$/);
	});

	describe('few-shot seeding from history', () => {
		it('passes residual history rows to generateSampleRows when below threshold', async () => {
			// 3 valid history rows — below the 10-row threshold, so the tool
			// goes synthetic but should still hand the rows to the generator.
			const dataTableService = defaultDataTableService({
				getSchema: jest.fn().mockResolvedValue([{ name: 'user_query' }]),
			});
			const ctx = buildOrchestrationCtx({
				dataTableService,
				executionService: trigInputHistoryExecutionService(3),
			});
			const generateSpy = jest
				.spyOn(sampleRowsService, 'generateSampleRows')
				.mockResolvedValue([{ user_query: 'synth' }]);

			const result = await runEvalDataTool(ctx, { workflowId: 'w1' });

			expect(result.source).toBe('synthetic');
			const callArg = generateSpy.mock.calls[0]?.[0];
			expect(callArg?.realExamples).toEqual(
				expect.arrayContaining([
					expect.objectContaining({ user_query: 'real-e0' }),
					expect.objectContaining({ user_query: 'real-e1' }),
					expect.objectContaining({ user_query: 'real-e2' }),
				]),
			);
		});

		it('does not pass realExamples when no history rows are available', async () => {
			const dataTableService = defaultDataTableService({
				getSchema: jest.fn().mockResolvedValue([{ name: 'user_query' }]),
			});
			const ctx = buildOrchestrationCtx({ dataTableService });
			const generateSpy = jest
				.spyOn(sampleRowsService, 'generateSampleRows')
				.mockResolvedValue([{ user_query: 'synth' }]);

			await runEvalDataTool(ctx, { workflowId: 'w1' });

			const callArg = generateSpy.mock.calls[0]?.[0];
			expect(callArg).not.toHaveProperty('realExamples');
		});
	});
});
