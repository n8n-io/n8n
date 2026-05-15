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
	input: { workflowId: string; projectId?: string },
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

const defaultInsertResult = {
	insertedCount: 0,
	dataTableId: 'dt-1',
	tableName: 'eval_dataset',
	projectId: 'proj-1',
};

const buildOrchestrationCtx = (overrides: Record<string, unknown>) => ({
	domainContext: {
		workflowService: { getAsWorkflowJSON: jest.fn().mockResolvedValue(evalWf()) },
		dataTableService: {
			insertRows: jest.fn().mockResolvedValue(defaultInsertResult),
			getSchema: jest.fn().mockResolvedValue([]),
			addColumn: jest.fn().mockResolvedValue(undefined),
			queryRows: jest.fn().mockResolvedValue({ count: 0, data: [] }),
		},
		executionService: {
			list: jest.fn().mockResolvedValue([]),
			getNodeOutput: jest.fn(),
		},
		logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
		...(overrides.domainContext as Record<string, unknown>),
	},
});

describe('eval-data tool', () => {
	beforeEach(() => {
		jest.restoreAllMocks();
	});

	it('imports rows from execution history when >= 10 valid rows are available', async () => {
		const summaries = Array.from({ length: 12 }, (_, i) => ({ id: `e${i}`, status: 'success' }));
		const insertRows = jest.fn().mockResolvedValue(defaultInsertResult);
		const ctx = buildOrchestrationCtx({
			domainContext: {
				workflowService: { getAsWorkflowJSON: jest.fn().mockResolvedValue(evalWf()) },
				dataTableService: {
					insertRows,
					getSchema: jest.fn().mockResolvedValue([{ name: 'user_query' }]),
					addColumn: jest.fn(),
				},
				executionService: {
					list: jest.fn().mockResolvedValueOnce(summaries).mockResolvedValueOnce([]),
					getNodeOutput: jest.fn(
						async (id: string) =>
							await Promise.resolve({
								nodeName: 'EvalTrig',
								items: [{ json: { user_query: `q-${id}` } }],
								totalItems: 1,
								returned: { from: 0, to: 0 },
							}),
					),
				},
				logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
			},
		});
		const result = await runEvalDataTool(ctx, { workflowId: 'w1' });

		expect(result.status).toBe('imported');
		expect(result.source).toBe('history');
		expect(result.rowCount).toBe(12);
		expect(insertRows).toHaveBeenCalledWith('dt-1', expect.any(Array), undefined);
	});

	it('falls back to synthetic generation when fewer than 10 valid history rows are available', async () => {
		const insertRows = jest.fn().mockResolvedValue(defaultInsertResult);
		const ctx = buildOrchestrationCtx({
			domainContext: {
				workflowService: { getAsWorkflowJSON: jest.fn().mockResolvedValue(evalWf()) },
				dataTableService: {
					insertRows,
					getSchema: jest.fn().mockResolvedValue([{ name: 'user_query' }]),
					addColumn: jest.fn(),
				},
				executionService: {
					list: jest.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([]),
					getNodeOutput: jest.fn(),
				},
				logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
			},
		});

		jest
			.spyOn(sampleRowsService, 'generateSampleRows')
			.mockResolvedValue(Array.from({ length: 10 }, (_, i) => ({ user_query: `gen-${i}` })));

		const result = await runEvalDataTool(ctx, { workflowId: 'w1' });

		expect(result.status).toBe('generated');
		expect(result.source).toBe('synthetic');
		expect(result.rowCount).toBe(10);
		expect(insertRows).toHaveBeenCalled();
	});

	it('returns skipped when no eval target exists', async () => {
		const wf: WorkflowJSON = {
			name: 't',
			nodes: [],
			connections: {},
			pinData: {},
			settings: {},
		} as never;
		const ctx = buildOrchestrationCtx({
			domainContext: {
				workflowService: { getAsWorkflowJSON: jest.fn().mockResolvedValue(wf) },
				logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
			},
		});
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
		const insertRows = jest.fn().mockResolvedValue(defaultInsertResult);
		const ctx = buildOrchestrationCtx({
			domainContext: {
				workflowService: { getAsWorkflowJSON: jest.fn().mockResolvedValue(wf) },
				dataTableService: {
					insertRows,
					getSchema: jest.fn().mockResolvedValue([{ name: 'input' }]),
					addColumn: jest.fn(),
				},
				executionService: {
					list: jest.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([]),
					getNodeOutput: jest.fn(),
				},
				logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
			},
		});
		jest.spyOn(sampleRowsService, 'generateSampleRows').mockResolvedValue([{ input: 'sample' }]);
		const result = await runEvalDataTool(ctx, { workflowId: 'w1' });
		expect(result.status).toBe('generated');
		expect(insertRows).toHaveBeenCalledWith('dt-1', [{ input: 'sample' }], undefined);
	});

	it('populates expected_* columns from agent output in the history path', async () => {
		const summaries = Array.from({ length: 12 }, (_, i) => ({ id: `e${i}`, status: 'success' }));
		const insertRows = jest.fn().mockResolvedValue(defaultInsertResult);
		const ctx = buildOrchestrationCtx({
			domainContext: {
				workflowService: { getAsWorkflowJSON: jest.fn().mockResolvedValue(evalWfWithMetrics()) },
				dataTableService: {
					insertRows,
					getSchema: jest
						.fn()
						.mockResolvedValue([{ name: 'user_query' }, { name: 'expected_response' }]),
					addColumn: jest.fn(),
				},
				executionService: {
					list: jest.fn().mockResolvedValueOnce(summaries).mockResolvedValueOnce([]),
					getNodeOutput: jest.fn(async (id: string, nodeName: string) => {
						if (nodeName === 'EvalTrig') {
							return await Promise.resolve({
								nodeName,
								items: [{ json: { user_query: `q-${id}` } }],
								totalItems: 1,
								returned: { from: 0, to: 0 },
							});
						}
						// Agent node
						return await Promise.resolve({
							nodeName,
							items: [{ json: { output: `a-${id}` } }],
							totalItems: 1,
							returned: { from: 0, to: 0 },
						});
					}),
				},
				logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
			},
		});
		const result = await runEvalDataTool(ctx, { workflowId: 'w1' });
		expect(result.status).toBe('imported');
		expect(result.rowCount).toBe(12);
		expect(insertRows).toHaveBeenCalledWith('dt-1', expect.any(Array), undefined);
		expect(insertRows).toHaveBeenCalledWith(
			'dt-1',
			expect.arrayContaining([{ user_query: 'q-e0', expected_response: 'a-e0' }]),
			undefined,
		);
	});

	it('synthetic path generates ONLY input columns and flags expected outputs for user review', async () => {
		const insertRows = jest.fn().mockResolvedValue(defaultInsertResult);
		const ctx = buildOrchestrationCtx({
			domainContext: {
				workflowService: { getAsWorkflowJSON: jest.fn().mockResolvedValue(evalWfWithMetrics()) },
				dataTableService: {
					insertRows,
					getSchema: jest
						.fn()
						.mockResolvedValue([{ name: 'user_query' }, { name: 'expected_response' }]),
					addColumn: jest.fn(),
				},
				executionService: {
					list: jest.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([]),
					getNodeOutput: jest.fn(),
				},
				logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
			},
		});
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
	});

	it('does not flag user review on the history path (real outputs are ground truth)', async () => {
		const summaries = Array.from({ length: 12 }, (_, i) => ({ id: `e${i}`, status: 'success' }));
		const ctx = buildOrchestrationCtx({
			domainContext: {
				workflowService: { getAsWorkflowJSON: jest.fn().mockResolvedValue(evalWfWithMetrics()) },
				dataTableService: {
					insertRows: jest.fn().mockResolvedValue(defaultInsertResult),
					getSchema: jest
						.fn()
						.mockResolvedValue([{ name: 'user_query' }, { name: 'expected_response' }]),
					addColumn: jest.fn(),
				},
				executionService: {
					list: jest.fn().mockResolvedValueOnce(summaries).mockResolvedValueOnce([]),
					getNodeOutput: jest.fn(async (id: string, nodeName: string) => {
						if (nodeName === 'EvalTrig') {
							return await Promise.resolve({
								nodeName,
								items: [{ json: { user_query: `q-${id}` } }],
								totalItems: 1,
								returned: { from: 0, to: 0 },
							});
						}
						return await Promise.resolve({
							nodeName,
							items: [{ json: { output: `a-${id}` } }],
							totalItems: 1,
							returned: { from: 0, to: 0 },
						});
					}),
				},
				logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
			},
		});
		const result = await runEvalDataTool(ctx, { workflowId: 'w1' });
		expect(result.source).toBe('history');
		expect(result.expectedOutputsNeedUserReview).toBeUndefined();
	});

	it('does not flag user review when there are no expected-output columns', async () => {
		const ctx = buildOrchestrationCtx({
			domainContext: {
				workflowService: { getAsWorkflowJSON: jest.fn().mockResolvedValue(evalWf()) },
				dataTableService: {
					insertRows: jest.fn().mockResolvedValue(defaultInsertResult),
					getSchema: jest.fn().mockResolvedValue([{ name: 'user_query' }]),
					addColumn: jest.fn(),
				},
				executionService: {
					list: jest.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([]),
					getNodeOutput: jest.fn(),
				},
				logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
			},
		});
		jest.spyOn(sampleRowsService, 'generateSampleRows').mockResolvedValue([{ user_query: 'q' }]);
		const result = await runEvalDataTool(ctx, { workflowId: 'w1' });
		expect(result.source).toBe('synthetic');
		expect(result.expectedOutputsNeedUserReview).toBeUndefined();
	});

	it('adds missing columns to the DataTable before inserting rows', async () => {
		const insertRows = jest.fn().mockResolvedValue(defaultInsertResult);
		const addColumn = jest.fn().mockResolvedValue(undefined);
		// Schema has only the input column; expected_response is missing.
		const getSchema = jest.fn().mockResolvedValue([{ name: 'user_query' }]);
		const ctx = buildOrchestrationCtx({
			domainContext: {
				workflowService: { getAsWorkflowJSON: jest.fn().mockResolvedValue(evalWfWithMetrics()) },
				dataTableService: { insertRows, getSchema, addColumn },
				executionService: {
					list: jest.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([]),
					getNodeOutput: jest.fn(),
				},
				logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
			},
		});
		jest
			.spyOn(sampleRowsService, 'generateSampleRows')
			.mockResolvedValue([{ user_query: 'q', expected_response: 'r' }]);

		await runEvalDataTool(ctx, { workflowId: 'w1' });

		expect(getSchema).toHaveBeenCalledWith('dt-1', undefined);
		expect(addColumn).toHaveBeenCalledTimes(1);
		expect(addColumn).toHaveBeenCalledWith(
			'dt-1',
			{ name: 'expected_response', type: 'string' },
			undefined,
		);
		expect(insertRows).toHaveBeenCalled();
		expect(addColumn.mock.invocationCallOrder[0]).toBeLessThan(
			insertRows.mock.invocationCallOrder[0],
		);
	});

	it('does not add columns that already exist in the DataTable schema', async () => {
		const insertRows = jest.fn().mockResolvedValue(defaultInsertResult);
		const addColumn = jest.fn().mockResolvedValue(undefined);
		const getSchema = jest
			.fn()
			.mockResolvedValue([{ name: 'user_query' }, { name: 'expected_response' }]);
		const ctx = buildOrchestrationCtx({
			domainContext: {
				workflowService: { getAsWorkflowJSON: jest.fn().mockResolvedValue(evalWfWithMetrics()) },
				dataTableService: { insertRows, getSchema, addColumn },
				executionService: {
					list: jest.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([]),
					getNodeOutput: jest.fn(),
				},
				logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
			},
		});
		jest
			.spyOn(sampleRowsService, 'generateSampleRows')
			.mockResolvedValue([{ user_query: 'q', expected_response: 'r' }]);

		await runEvalDataTool(ctx, { workflowId: 'w1' });

		expect(addColumn).not.toHaveBeenCalled();
		expect(insertRows).toHaveBeenCalled();
	});

	it('forwards projectId to insertRows when present', async () => {
		const insertRows = jest.fn().mockResolvedValue(defaultInsertResult);
		const ctx = buildOrchestrationCtx({
			domainContext: {
				workflowService: { getAsWorkflowJSON: jest.fn().mockResolvedValue(evalWf()) },
				dataTableService: {
					insertRows,
					getSchema: jest.fn().mockResolvedValue([{ name: 'user_query' }]),
					addColumn: jest.fn(),
				},
				executionService: {
					list: jest.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([]),
					getNodeOutput: jest.fn(),
				},
				logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
			},
		});
		jest.spyOn(sampleRowsService, 'generateSampleRows').mockResolvedValue([{ user_query: 'q' }]);
		await runEvalDataTool(ctx, { workflowId: 'w1', projectId: 'proj-1' });
		expect(insertRows).toHaveBeenCalledWith('dt-1', expect.any(Array), { projectId: 'proj-1' });
	});

	it('returns a `table` summary so the agent can recap the populated dataset to the user', async () => {
		const queryRows = jest.fn().mockResolvedValue({
			count: 2,
			data: [
				{
					user_query:
						'first question with a really long body that should be truncated past eighty characters of content easily',
				},
				{ user_query: 'second' },
			],
		});
		const ctx = buildOrchestrationCtx({
			domainContext: {
				workflowService: { getAsWorkflowJSON: jest.fn().mockResolvedValue(evalWf()) },
				dataTableService: {
					insertRows: jest.fn().mockResolvedValue(defaultInsertResult),
					getSchema: jest.fn().mockResolvedValue([{ name: 'user_query' }]),
					addColumn: jest.fn(),
					queryRows,
				},
				executionService: {
					list: jest.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([]),
					getNodeOutput: jest.fn(),
				},
				logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
			},
		});
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
			const summaries = Array.from({ length: 3 }, (_, i) => ({ id: `e${i}`, status: 'success' }));
			const insertRows = jest.fn().mockResolvedValue(defaultInsertResult);
			const ctx = buildOrchestrationCtx({
				domainContext: {
					workflowService: { getAsWorkflowJSON: jest.fn().mockResolvedValue(evalWf()) },
					dataTableService: {
						insertRows,
						getSchema: jest.fn().mockResolvedValue([{ name: 'user_query' }]),
						addColumn: jest.fn(),
					},
					executionService: {
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
					},
					logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
				},
			});
			const generateSpy = jest
				.spyOn(sampleRowsService, 'generateSampleRows')
				.mockResolvedValue([{ user_query: 'synth' }]);

			const result = await runEvalDataTool(ctx, { workflowId: 'w1' });

			expect(result.source).toBe('synthetic');
			expect(generateSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					realExamples: expect.arrayContaining([
						expect.objectContaining({ user_query: 'real-e0' }),
						expect.objectContaining({ user_query: 'real-e1' }),
						expect.objectContaining({ user_query: 'real-e2' }),
					]),
				}),
			);
		});

		it('does not pass realExamples when no history rows are available', async () => {
			const insertRows = jest.fn().mockResolvedValue(defaultInsertResult);
			const ctx = buildOrchestrationCtx({
				domainContext: {
					workflowService: { getAsWorkflowJSON: jest.fn().mockResolvedValue(evalWf()) },
					dataTableService: {
						insertRows,
						getSchema: jest.fn().mockResolvedValue([{ name: 'user_query' }]),
						addColumn: jest.fn(),
					},
					executionService: {
						list: jest.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([]),
						getNodeOutput: jest.fn(),
					},
					logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
				},
			});
			const generateSpy = jest
				.spyOn(sampleRowsService, 'generateSampleRows')
				.mockResolvedValue([{ user_query: 'synth' }]);

			await runEvalDataTool(ctx, { workflowId: 'w1' });

			const callArg = generateSpy.mock.calls[0]?.[0];
			expect(callArg).not.toHaveProperty('realExamples');
		});
	});
});
