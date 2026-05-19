import type { WorkflowJSON } from '@n8n/workflow-sdk';

import type { ExecutionSummary, InstanceAiContext, NodeOutputResult } from '../../../types';
import { extractRowsFromExecutionHistory } from '../extract-rows-from-history.service';

type ExecutionService = InstanceAiContext['executionService'];

const buildContext = (
	executionService: Partial<Pick<ExecutionService, 'list' | 'getNodeOutput'>> = {},
): InstanceAiContext =>
	({
		executionService: {
			list: jest
				.fn<ReturnType<ExecutionService['list']>, Parameters<ExecutionService['list']>>()
				.mockResolvedValue([]),
			getNodeOutput: jest.fn<
				ReturnType<ExecutionService['getNodeOutput']>,
				Parameters<ExecutionService['getNodeOutput']>
			>(),
			...executionService,
		},
	}) as unknown as InstanceAiContext;

const executionSummary = (
	id: string,
	status: ExecutionSummary['status'] = 'success',
): ExecutionSummary => ({
	id,
	workflowId: 'w1',
	workflowName: 'Workflow',
	status,
	startedAt: '2026-01-01T00:00:00.000Z',
	mode: 'manual',
});

const nodeOutput = (nodeName: string, json: Record<string, unknown>): NodeOutputResult => ({
	nodeName,
	items: [{ json }],
	totalItems: 1,
	returned: { from: 0, to: 0 },
});

const buildWorkflow = (): WorkflowJSON =>
	({
		name: 't',
		nodes: [
			{
				name: 'Trigger',
				type: 'n8n-nodes-base.webhook',
				typeVersion: 1,
				parameters: {},
				position: [0, 0],
				id: 't',
			},
			{
				name: 'Agent',
				type: '@n8n/n8n-nodes-langchain.agent',
				typeVersion: 1,
				parameters: {},
				position: [200, 0],
				id: 'a',
			},
		],
		connections: {
			Trigger: { main: [[{ node: 'Agent', type: 'main', index: 0 }]] },
		},
		pinData: {},
		settings: {},
	}) as unknown as WorkflowJSON;

describe('extractRowsFromExecutionHistory', () => {
	it('returns 0 rows when the workflow has no executions', async () => {
		const ctx = buildContext();
		const result = await extractRowsFromExecutionHistory(ctx, {
			workflow: buildWorkflow(),
			workflowId: 'w1',
			agentNodeName: 'Agent',
			inputColumns: ['user_query'],
			expectedToActualPairs: [],
		});
		expect(result.rows).toEqual([]);
		expect(result.scannedExecutions).toBe(0);
	});

	it('extracts agent-input rows from successful executions', async () => {
		const ctx = buildContext({
			list: jest
				.fn<ReturnType<ExecutionService['list']>, Parameters<ExecutionService['list']>>()
				.mockResolvedValueOnce([executionSummary('e1'), executionSummary('e2')]),
			getNodeOutput: jest
				.fn<
					ReturnType<ExecutionService['getNodeOutput']>,
					Parameters<ExecutionService['getNodeOutput']>
				>()
				.mockResolvedValueOnce(nodeOutput('Trigger', { user_query: 'hello' }))
				.mockResolvedValueOnce(nodeOutput('Trigger', { user_query: 'world' })),
		});

		const result = await extractRowsFromExecutionHistory(ctx, {
			workflow: buildWorkflow(),
			workflowId: 'w1',
			agentNodeName: 'Agent',
			inputColumns: ['user_query'],
			expectedToActualPairs: [],
		});

		expect(result.rows).toEqual([{ user_query: 'hello' }, { user_query: 'world' }]);
		expect(result.scannedExecutions).toBe(2);
	});

	it('deduplicates exact-match rows from execution history', async () => {
		const ctx = buildContext({
			list: jest
				.fn<ReturnType<ExecutionService['list']>, Parameters<ExecutionService['list']>>()
				.mockResolvedValueOnce([
					executionSummary('e1'),
					executionSummary('e2'),
					executionSummary('e3'),
				]),
			getNodeOutput: jest
				.fn<
					ReturnType<ExecutionService['getNodeOutput']>,
					Parameters<ExecutionService['getNodeOutput']>
				>()
				.mockResolvedValueOnce(nodeOutput('Trigger', { user_query: 'hello' }))
				.mockResolvedValueOnce(nodeOutput('Trigger', { user_query: 'hello' }))
				.mockResolvedValueOnce(nodeOutput('Trigger', { user_query: 'world' })),
		});

		const result = await extractRowsFromExecutionHistory(ctx, {
			workflow: buildWorkflow(),
			workflowId: 'w1',
			agentNodeName: 'Agent',
			inputColumns: ['user_query'],
			expectedToActualPairs: [],
		});

		expect(result.rows).toEqual([{ user_query: 'hello' }, { user_query: 'world' }]);
		expect(result.scannedExecutions).toBe(3);
	});

	it('skips executions where the projected record is missing a required column', async () => {
		const ctx = buildContext({
			list: jest
				.fn<ReturnType<ExecutionService['list']>, Parameters<ExecutionService['list']>>()
				.mockResolvedValueOnce([executionSummary('e1'), executionSummary('e2')]),
			getNodeOutput: jest
				.fn<
					ReturnType<ExecutionService['getNodeOutput']>,
					Parameters<ExecutionService['getNodeOutput']>
				>()
				.mockResolvedValueOnce(nodeOutput('Trigger', { user_query: 'hello', context: 'c' }))
				.mockResolvedValueOnce(nodeOutput('Trigger', { user_query: 'world' })),
		});

		const result = await extractRowsFromExecutionHistory(ctx, {
			workflow: buildWorkflow(),
			workflowId: 'w1',
			agentNodeName: 'Agent',
			inputColumns: ['user_query', 'context'],
			expectedToActualPairs: [],
		});

		expect(result.rows).toEqual([{ user_query: 'hello', context: 'c' }]);
	});

	it('coerces non-string column values to JSON strings', async () => {
		const ctx = buildContext({
			list: jest
				.fn<ReturnType<ExecutionService['list']>, Parameters<ExecutionService['list']>>()
				.mockResolvedValueOnce([executionSummary('e1')]),
			getNodeOutput: jest
				.fn<
					ReturnType<ExecutionService['getNodeOutput']>,
					Parameters<ExecutionService['getNodeOutput']>
				>()
				.mockResolvedValueOnce(nodeOutput('Trigger', { payload: { nested: 1 } })),
		});

		const result = await extractRowsFromExecutionHistory(ctx, {
			workflow: buildWorkflow(),
			workflowId: 'w1',
			agentNodeName: 'Agent',
			inputColumns: ['payload'],
			expectedToActualPairs: [],
		});

		expect(result.rows).toEqual([{ payload: '{"nested":1}' }]);
	});

	it('stops at the 25-row cap', async () => {
		const summaries = Array.from({ length: 30 }, (_, i) => executionSummary(`e${i}`));
		const outputs = summaries.map((_, i) => nodeOutput('Trigger', { user_query: `q${i}` }));
		const ctx = buildContext({
			list: jest
				.fn<ReturnType<ExecutionService['list']>, Parameters<ExecutionService['list']>>()
				.mockResolvedValueOnce(summaries),
			getNodeOutput: jest.fn<
				ReturnType<ExecutionService['getNodeOutput']>,
				Parameters<ExecutionService['getNodeOutput']>
			>(async () => await Promise.resolve(outputs.shift() ?? nodeOutput('Trigger', {}))),
		});

		const result = await extractRowsFromExecutionHistory(ctx, {
			workflow: buildWorkflow(),
			workflowId: 'w1',
			agentNodeName: 'Agent',
			inputColumns: ['user_query'],
			expectedToActualPairs: [],
		});

		expect(result.rows).toHaveLength(25);
	});

	it('lists only successful executions', async () => {
		const list = jest
			.fn<ReturnType<ExecutionService['list']>, Parameters<ExecutionService['list']>>()
			.mockResolvedValue([executionSummary('e1')]);
		const ctx = buildContext({
			list,
			getNodeOutput: jest
				.fn<
					ReturnType<ExecutionService['getNodeOutput']>,
					Parameters<ExecutionService['getNodeOutput']>
				>()
				.mockResolvedValueOnce(nodeOutput('Trigger', { user_query: 's' })),
		});

		await extractRowsFromExecutionHistory(ctx, {
			workflow: buildWorkflow(),
			workflowId: 'w1',
			agentNodeName: 'Agent',
			inputColumns: ['user_query'],
			expectedToActualPairs: [],
		});

		expect(list).toHaveBeenCalledTimes(1);
		expect(list).toHaveBeenCalledWith({ workflowId: 'w1', status: 'success', limit: 100 });
	});

	it('returns 0 rows and skips silently when getNodeOutput throws for an execution', async () => {
		const ctx = buildContext({
			list: jest
				.fn<ReturnType<ExecutionService['list']>, Parameters<ExecutionService['list']>>()
				.mockResolvedValueOnce([executionSummary('e1')]),
			getNodeOutput: jest
				.fn<
					ReturnType<ExecutionService['getNodeOutput']>,
					Parameters<ExecutionService['getNodeOutput']>
				>()
				.mockRejectedValueOnce(new Error('boom')),
		});

		const result = await extractRowsFromExecutionHistory(ctx, {
			workflow: buildWorkflow(),
			workflowId: 'w1',
			agentNodeName: 'Agent',
			inputColumns: ['user_query'],
			expectedToActualPairs: [],
		});

		expect(result.rows).toEqual([]);
		expect(result.scannedExecutions).toBe(0);
	});

	it('extracts expected columns from agent output when expectedToActualPairs are provided', async () => {
		const ctx = buildContext({
			list: jest
				.fn<ReturnType<ExecutionService['list']>, Parameters<ExecutionService['list']>>()
				.mockResolvedValueOnce([executionSummary('e1')]),
			getNodeOutput: jest.fn<
				ReturnType<ExecutionService['getNodeOutput']>,
				Parameters<ExecutionService['getNodeOutput']>
			>(
				async (_id, nodeName) =>
					await Promise.resolve(
						nodeName === 'Trigger'
							? nodeOutput('Trigger', { user_query: 'hi' })
							: nodeOutput('Agent', { output: 'hello world' }),
					),
			),
		});
		const result = await extractRowsFromExecutionHistory(ctx, {
			workflow: buildWorkflow(),
			workflowId: 'w1',
			agentNodeName: 'Agent',
			inputColumns: ['user_query'],
			expectedToActualPairs: [{ expectedColumn: 'expected_response', actualField: 'output' }],
		});
		expect(result.rows).toEqual([{ user_query: 'hi', expected_response: 'hello world' }]);
	});

	it('skips execution if the agent output is missing the actualField', async () => {
		const ctx = buildContext({
			list: jest
				.fn<ReturnType<ExecutionService['list']>, Parameters<ExecutionService['list']>>()
				.mockResolvedValueOnce([executionSummary('e1')]),
			getNodeOutput: jest.fn<
				ReturnType<ExecutionService['getNodeOutput']>,
				Parameters<ExecutionService['getNodeOutput']>
			>(
				async (_id, nodeName) =>
					await Promise.resolve(
						nodeName === 'Trigger'
							? nodeOutput('Trigger', { user_query: 'hi' })
							: nodeOutput('Agent', {}),
					),
			),
		});
		const result = await extractRowsFromExecutionHistory(ctx, {
			workflow: buildWorkflow(),
			workflowId: 'w1',
			agentNodeName: 'Agent',
			inputColumns: ['user_query'],
			expectedToActualPairs: [{ expectedColumn: 'expected_response', actualField: 'output' }],
		});
		expect(result.rows).toEqual([]);
	});
});
