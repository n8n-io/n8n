import type { WorkflowJSON } from '@n8n/workflow-sdk';

import { extractRowsFromExecutionHistory } from '../extract-rows-from-history.service';

const buildContext = (overrides: any = {}) => ({
	executionService: {
		list: jest.fn().mockResolvedValue([]),
		getNodeOutput: jest.fn(),
		...overrides.executionService,
	},
	...overrides,
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
		const result = await extractRowsFromExecutionHistory(ctx as any, {
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
			executionService: {
				list: jest
					.fn()
					.mockResolvedValueOnce([
						{ id: 'e1', status: 'success' },
						{ id: 'e2', status: 'success' },
					])
					.mockResolvedValueOnce([]),
				getNodeOutput: jest
					.fn()
					.mockResolvedValueOnce({
						nodeName: 'Trigger',
						items: [{ json: { user_query: 'hello' } }],
						totalItems: 1,
						returned: { from: 0, to: 0 },
					})
					.mockResolvedValueOnce({
						nodeName: 'Trigger',
						items: [{ json: { user_query: 'world' } }],
						totalItems: 1,
						returned: { from: 0, to: 0 },
					}),
			},
		});

		const result = await extractRowsFromExecutionHistory(ctx as any, {
			workflow: buildWorkflow(),
			workflowId: 'w1',
			agentNodeName: 'Agent',
			inputColumns: ['user_query'],
			expectedToActualPairs: [],
		});

		expect(result.rows).toEqual([{ user_query: 'hello' }, { user_query: 'world' }]);
		expect(result.scannedExecutions).toBe(2);
	});

	it('skips executions where the projected record is missing a required column', async () => {
		const ctx = buildContext({
			executionService: {
				list: jest
					.fn()
					.mockResolvedValueOnce([
						{ id: 'e1', status: 'success' },
						{ id: 'e2', status: 'success' },
					])
					.mockResolvedValueOnce([]),
				getNodeOutput: jest
					.fn()
					.mockResolvedValueOnce({
						nodeName: 'Trigger',
						items: [{ json: { user_query: 'hello', context: 'c' } }],
						totalItems: 1,
						returned: { from: 0, to: 0 },
					})
					.mockResolvedValueOnce({
						nodeName: 'Trigger',
						items: [{ json: { user_query: 'world' /* no context */ } }],
						totalItems: 1,
						returned: { from: 0, to: 0 },
					}),
			},
		});

		const result = await extractRowsFromExecutionHistory(ctx as any, {
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
			executionService: {
				list: jest
					.fn()
					.mockResolvedValueOnce([{ id: 'e1', status: 'success' }])
					.mockResolvedValueOnce([]),
				getNodeOutput: jest.fn().mockResolvedValueOnce({
					nodeName: 'Trigger',
					items: [{ json: { payload: { nested: 1 } } }],
					totalItems: 1,
					returned: { from: 0, to: 0 },
				}),
			},
		});

		const result = await extractRowsFromExecutionHistory(ctx as any, {
			workflow: buildWorkflow(),
			workflowId: 'w1',
			agentNodeName: 'Agent',
			inputColumns: ['payload'],
			expectedToActualPairs: [],
		});

		expect(result.rows).toEqual([{ payload: '{"nested":1}' }]);
	});

	it('stops at the 25-row cap', async () => {
		const summaries = Array.from({ length: 30 }, (_, i) => ({
			id: `e${i}`,
			status: 'success' as const,
		}));
		const outputs = summaries.map((_, i) => ({
			nodeName: 'Trigger',
			items: [{ json: { user_query: `q${i}` } }],
			totalItems: 1,
			returned: { from: 0, to: 0 },
		}));
		const ctx = buildContext({
			executionService: {
				list: jest.fn().mockResolvedValueOnce(summaries).mockResolvedValueOnce([]),
				getNodeOutput: jest.fn(async (_id: string, _name: string) => outputs.shift()!),
			},
		});

		const result = await extractRowsFromExecutionHistory(ctx as any, {
			workflow: buildWorkflow(),
			workflowId: 'w1',
			agentNodeName: 'Agent',
			inputColumns: ['user_query'],
			expectedToActualPairs: [],
		});

		expect(result.rows).toHaveLength(25);
	});

	it('lists success and error statuses (two list calls, one per status)', async () => {
		const list = jest
			.fn()
			.mockResolvedValueOnce([{ id: 'e1', status: 'success' }])
			.mockResolvedValueOnce([{ id: 'e2', status: 'error' }]);
		const ctx = buildContext({
			executionService: {
				list,
				getNodeOutput: jest
					.fn()
					.mockResolvedValueOnce({
						nodeName: 'Trigger',
						items: [{ json: { user_query: 's' } }],
						totalItems: 1,
						returned: { from: 0, to: 0 },
					})
					.mockResolvedValueOnce({
						nodeName: 'Trigger',
						items: [{ json: { user_query: 'e' } }],
						totalItems: 1,
						returned: { from: 0, to: 0 },
					}),
			},
		});

		await extractRowsFromExecutionHistory(ctx as any, {
			workflow: buildWorkflow(),
			workflowId: 'w1',
			agentNodeName: 'Agent',
			inputColumns: ['user_query'],
			expectedToActualPairs: [],
		});

		expect(list).toHaveBeenNthCalledWith(1, { workflowId: 'w1', status: 'success', limit: 100 });
		expect(list).toHaveBeenNthCalledWith(2, { workflowId: 'w1', status: 'error', limit: 100 });
	});

	it('returns 0 rows and skips silently when getNodeOutput throws for an execution', async () => {
		const ctx = buildContext({
			executionService: {
				list: jest
					.fn()
					.mockResolvedValueOnce([{ id: 'e1', status: 'success' }])
					.mockResolvedValueOnce([]),
				getNodeOutput: jest.fn().mockRejectedValueOnce(new Error('boom')),
			},
		});

		const result = await extractRowsFromExecutionHistory(ctx as any, {
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
			executionService: {
				list: jest
					.fn()
					.mockResolvedValueOnce([{ id: 'e1', status: 'success' }])
					.mockResolvedValueOnce([]),
				getNodeOutput: jest.fn(async (_id: string, nodeName: string) => {
					if (nodeName === 'Trigger') {
						return {
							nodeName: 'Trigger',
							items: [{ json: { user_query: 'hi' } }],
							totalItems: 1,
							returned: { from: 0, to: 0 },
						};
					}
					// Agent node
					return {
						nodeName: 'Agent',
						items: [{ json: { output: 'hello world' } }],
						totalItems: 1,
						returned: { from: 0, to: 0 },
					};
				}),
			},
		});
		const result = await extractRowsFromExecutionHistory(ctx as any, {
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
			executionService: {
				list: jest
					.fn()
					.mockResolvedValueOnce([{ id: 'e1', status: 'success' }])
					.mockResolvedValueOnce([]),
				getNodeOutput: jest.fn(async (_id: string, nodeName: string) => {
					if (nodeName === 'Trigger') {
						return {
							nodeName: 'Trigger',
							items: [{ json: { user_query: 'hi' } }],
							totalItems: 1,
							returned: { from: 0, to: 0 },
						};
					}
					return {
						nodeName: 'Agent',
						items: [
							{
								json: {
									/* no output field */
								},
							},
						],
						totalItems: 1,
						returned: { from: 0, to: 0 },
					};
				}),
			},
		});
		const result = await extractRowsFromExecutionHistory(ctx as any, {
			workflow: buildWorkflow(),
			workflowId: 'w1',
			agentNodeName: 'Agent',
			inputColumns: ['user_query'],
			expectedToActualPairs: [{ expectedColumn: 'expected_response', actualField: 'output' }],
		});
		expect(result.rows).toEqual([]);
	});
});
