import type { WorkflowJSON } from '@n8n/workflow-sdk';

import { createEvalDataAgentTool } from '../eval-data-agent.tool';

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

const buildOrchestrationCtx = (overrides: Record<string, unknown>) => ({
	domainContext: {
		workflowService: { getAsWorkflowJSON: jest.fn().mockResolvedValue(evalWf()) },
		dataTableService: {
			insertRows: jest.fn().mockResolvedValue(undefined),
			getSchema: jest.fn().mockResolvedValue([]),
			addColumn: jest.fn().mockResolvedValue(undefined),
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
		const insertRows = jest.fn().mockResolvedValue(undefined);
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
					getNodeOutput: jest.fn(async (id: string) => ({
						nodeName: 'EvalTrig',
						items: [{ json: { user_query: `q-${id}` } }],
						totalItems: 1,
						returned: { from: 0, to: 0 },
					})),
				},
				logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
			},
		});
		const tool = createEvalDataAgentTool(ctx as never);

		const result = await tool.execute!({ workflowId: 'w1' }, { agent: {} } as never);

		expect(result.status).toBe('imported');
		expect(result.source).toBe('history');
		expect(result.rowCount).toBe(12);
		expect(insertRows).toHaveBeenCalledWith('dt-1', expect.any(Array), undefined);
	});

	it('falls back to synthetic generation when fewer than 10 valid history rows are available', async () => {
		const insertRows = jest.fn();
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
			.spyOn(require('../../evals/generate-sample-rows.service'), 'generateSampleRows')
			.mockResolvedValue(Array.from({ length: 10 }, (_, i) => ({ user_query: `gen-${i}` })));

		const tool = createEvalDataAgentTool(ctx as never);
		const result = await tool.execute!({ workflowId: 'w1' }, { agent: {} } as never);

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
		const tool = createEvalDataAgentTool(ctx as never);
		const result = await tool.execute!({ workflowId: 'w1' }, { agent: {} } as never);
		expect(result.status).toBe('skipped');
	});

	it('skips with no-detectable-input-columns reason when agent has no $json refs', async () => {
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
		const ctx = buildOrchestrationCtx({
			domainContext: {
				workflowService: { getAsWorkflowJSON: jest.fn().mockResolvedValue(wf) },
				logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
			},
		});
		const tool = createEvalDataAgentTool(ctx as never);
		const result = await tool.execute!({ workflowId: 'w1' }, { agent: {} } as never);
		expect(result.status).toBe('skipped');
		expect(result.reason).toMatch(/no-detectable-input-columns/);
	});

	it('populates expected_* columns from agent output in the history path', async () => {
		const summaries = Array.from({ length: 12 }, (_, i) => ({ id: `e${i}`, status: 'success' }));
		const insertRows = jest.fn().mockResolvedValue(undefined);
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
							return {
								nodeName,
								items: [{ json: { user_query: `q-${id}` } }],
								totalItems: 1,
								returned: { from: 0, to: 0 },
							};
						}
						// Agent node
						return {
							nodeName,
							items: [{ json: { output: `a-${id}` } }],
							totalItems: 1,
							returned: { from: 0, to: 0 },
						};
					}),
				},
				logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
			},
		});
		const tool = createEvalDataAgentTool(ctx as never);
		const result = await tool.execute!({ workflowId: 'w1' }, { agent: {} } as never);
		expect(result.status).toBe('imported');
		expect(result.rowCount).toBe(12);
		expect(insertRows).toHaveBeenCalledWith('dt-1', expect.any(Array), undefined);
		const insertedRows = insertRows.mock.calls[0][1] as Array<Record<string, string>>;
		expect(insertedRows[0]).toEqual({ user_query: 'q-e0', expected_response: 'a-e0' });
	});

	it('synthetic path generates both input AND expected columns', async () => {
		const insertRows = jest.fn();
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
			.spyOn(require('../../evals/generate-sample-rows.service'), 'generateSampleRows')
			.mockResolvedValue([{ user_query: 'q', expected_response: 'r' }]);
		const tool = createEvalDataAgentTool(ctx as never);
		await tool.execute!({ workflowId: 'w1' }, { agent: {} } as never);
		expect(generateSpy).toHaveBeenCalledWith(
			expect.objectContaining({
				columns: ['user_query', 'expected_response'],
				rowCount: 10,
			}),
		);
	});

	it('adds missing columns to the DataTable before inserting rows', async () => {
		const insertRows = jest.fn().mockResolvedValue(undefined);
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
			.spyOn(require('../../evals/generate-sample-rows.service'), 'generateSampleRows')
			.mockResolvedValue([{ user_query: 'q', expected_response: 'r' }]);

		const tool = createEvalDataAgentTool(ctx as never);
		await tool.execute!({ workflowId: 'w1' }, { agent: {} } as never);

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
		const insertRows = jest.fn().mockResolvedValue(undefined);
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
			.spyOn(require('../../evals/generate-sample-rows.service'), 'generateSampleRows')
			.mockResolvedValue([{ user_query: 'q', expected_response: 'r' }]);

		const tool = createEvalDataAgentTool(ctx as never);
		await tool.execute!({ workflowId: 'w1' }, { agent: {} } as never);

		expect(addColumn).not.toHaveBeenCalled();
		expect(insertRows).toHaveBeenCalled();
	});

	it('forwards projectId to insertRows when present', async () => {
		const insertRows = jest.fn();
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
			.spyOn(require('../../evals/generate-sample-rows.service'), 'generateSampleRows')
			.mockResolvedValue([{ user_query: 'q' }]);
		const tool = createEvalDataAgentTool(ctx as never);
		await tool.execute!({ workflowId: 'w1', projectId: 'proj-1' }, { agent: {} } as never);
		expect(insertRows).toHaveBeenCalledWith('dt-1', expect.any(Array), { projectId: 'proj-1' });
	});
});
