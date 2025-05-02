import {
	createTestLogEntry,
	createTestNode,
	createTestTaskData,
	createTestWorkflow,
	createTestWorkflowExecutionResponse,
	createTestWorkflowObject,
} from '@/__tests__/mocks';
import {
	createAiData,
	createLogEntries,
	deepToRaw,
	findSelectedLogEntry,
	getTreeNodeData,
	getTreeNodeDataV2,
} from '@/components/RunDataAi/utils';
import {
	AGENT_LANGCHAIN_NODE_TYPE,
	type ExecutionError,
	type ITaskData,
	NodeConnectionTypes,
} from 'n8n-workflow';
import { type LogEntrySelection } from '../CanvasChat/types/logs';
import { type IExecutionResponse } from '@/Interface';
import { isReactive, reactive } from 'vue';

describe(getTreeNodeData, () => {
	it('should generate one node per execution', () => {
		const workflow = createTestWorkflowObject({
			nodes: [
				createTestNode({ name: 'A' }),
				createTestNode({ name: 'B' }),
				createTestNode({ name: 'C' }),
			],
			connections: {
				B: { ai_tool: [[{ node: 'A', type: NodeConnectionTypes.AiTool, index: 0 }]] },
				C: {
					ai_languageModel: [[{ node: 'B', type: NodeConnectionTypes.AiLanguageModel, index: 0 }]],
				},
			},
		});
		const taskDataByNodeName: Record<string, ITaskData[]> = {
			A: [createTestTaskData({ startTime: Date.parse('2025-02-26T00:00:00.000Z') })],
			B: [
				createTestTaskData({
					startTime: Date.parse('2025-02-26T00:00:01.000Z'),
					data: {
						main: [
							[
								{
									json: {
										tokenUsage: {
											completionTokens: 1,
											promptTokens: 2,
											totalTokens: 3,
										},
									},
								},
							],
						],
					},
				}),
				createTestTaskData({
					startTime: Date.parse('2025-02-26T00:00:03.000Z'),
					data: {
						main: [
							[
								{
									json: {
										tokenUsage: {
											completionTokens: 4,
											promptTokens: 5,
											totalTokens: 6,
										},
									},
								},
							],
						],
					},
				}),
			],
			C: [
				createTestTaskData({
					startTime: Date.parse('2025-02-26T00:00:02.000Z'),
					data: {
						main: [
							[
								{
									json: {
										tokenUsageEstimate: {
											completionTokens: 7,
											promptTokens: 8,
											totalTokens: 9,
										},
									},
								},
							],
						],
					},
				}),
				createTestTaskData({ startTime: Date.parse('2025-02-26T00:00:04.000Z') }),
			],
		};

		expect(
			getTreeNodeData(
				'A',
				workflow,
				createAiData('A', workflow, (name) => taskDataByNodeName[name] ?? null),
			),
		).toEqual([
			{
				depth: 0,
				id: 'A:0',
				node: 'A',
				runIndex: 0,
				startTime: 0,
				parent: undefined,
				consumedTokens: {
					completionTokens: 0,
					promptTokens: 0,
					totalTokens: 0,
					isEstimate: false,
				},
				children: [
					{
						depth: 1,
						id: 'B:0',
						node: 'B',
						runIndex: 0,
						startTime: Date.parse('2025-02-26T00:00:01.000Z'),
						parent: expect.objectContaining({ node: 'A' }),
						consumedTokens: {
							completionTokens: 1,
							promptTokens: 2,
							totalTokens: 3,
							isEstimate: false,
						},
						children: [
							{
								children: [],
								depth: 2,
								id: 'C:0',
								node: 'C',
								runIndex: 0,
								startTime: Date.parse('2025-02-26T00:00:02.000Z'),
								parent: expect.objectContaining({ node: 'B' }),
								consumedTokens: {
									completionTokens: 7,
									promptTokens: 8,
									totalTokens: 9,
									isEstimate: true,
								},
							},
						],
					},
					{
						depth: 1,
						id: 'B:1',
						node: 'B',
						runIndex: 1,
						startTime: Date.parse('2025-02-26T00:00:03.000Z'),
						parent: expect.objectContaining({ node: 'A' }),
						consumedTokens: {
							completionTokens: 4,
							promptTokens: 5,
							totalTokens: 6,
							isEstimate: false,
						},
						children: [
							{
								children: [],
								depth: 2,
								id: 'C:1',
								node: 'C',
								runIndex: 1,
								startTime: Date.parse('2025-02-26T00:00:04.000Z'),
								parent: expect.objectContaining({ node: 'B' }),
								consumedTokens: {
									completionTokens: 0,
									promptTokens: 0,
									totalTokens: 0,
									isEstimate: false,
								},
							},
						],
					},
				],
			},
		]);
	});
});

describe(getTreeNodeDataV2, () => {
	it('should generate one node per execution', () => {
		const workflow = createTestWorkflowObject({
			nodes: [
				createTestNode({ name: 'A' }),
				createTestNode({ name: 'B' }),
				createTestNode({ name: 'C' }),
			],
			connections: {
				B: { ai_tool: [[{ node: 'A', type: NodeConnectionTypes.AiTool, index: 0 }]] },
				C: {
					ai_languageModel: [[{ node: 'B', type: NodeConnectionTypes.AiLanguageModel, index: 0 }]],
				},
			},
		});

		const jsonB1 = { tokenUsage: { completionTokens: 1, promptTokens: 2, totalTokens: 3 } };
		const jsonB2 = { tokenUsage: { completionTokens: 4, promptTokens: 5, totalTokens: 6 } };
		const jsonC1 = { tokenUsageEstimate: { completionTokens: 7, promptTokens: 8, totalTokens: 9 } };

		expect(
			getTreeNodeDataV2('A', createTestTaskData({}), workflow, {
				A: [createTestTaskData({ startTime: Date.parse('2025-02-26T00:00:00.000Z') })],
				B: [
					createTestTaskData({
						startTime: Date.parse('2025-02-26T00:00:01.000Z'),
						data: { main: [[{ json: jsonB1 }]] },
					}),
					createTestTaskData({
						startTime: Date.parse('2025-02-26T00:00:03.000Z'),
						data: { main: [[{ json: jsonB2 }]] },
					}),
				],
				C: [
					createTestTaskData({
						startTime: Date.parse('2025-02-26T00:00:02.000Z'),
						data: { main: [[{ json: jsonC1 }]] },
					}),
					createTestTaskData({ startTime: Date.parse('2025-02-26T00:00:04.000Z') }),
				],
			}),
		).toEqual([
			{
				depth: 0,
				id: 'A:0',
				node: expect.objectContaining({ name: 'A' }),
				runIndex: 0,
				runData: expect.objectContaining({ startTime: 0 }),
				parent: undefined,
				consumedTokens: {
					completionTokens: 0,
					promptTokens: 0,
					totalTokens: 0,
					isEstimate: false,
				},
				children: [
					{
						depth: 1,
						id: 'B:0',
						node: expect.objectContaining({ name: 'B' }),
						runIndex: 0,
						runData: expect.objectContaining({
							startTime: Date.parse('2025-02-26T00:00:01.000Z'),
						}),
						parent: expect.objectContaining({ node: expect.objectContaining({ name: 'A' }) }),
						consumedTokens: {
							completionTokens: 1,
							promptTokens: 2,
							totalTokens: 3,
							isEstimate: false,
						},
						children: [
							{
								children: [],
								depth: 2,
								id: 'C:0',
								node: expect.objectContaining({ name: 'C' }),
								runIndex: 0,
								runData: expect.objectContaining({
									startTime: Date.parse('2025-02-26T00:00:02.000Z'),
								}),
								parent: expect.objectContaining({ node: expect.objectContaining({ name: 'B' }) }),
								consumedTokens: {
									completionTokens: 7,
									promptTokens: 8,
									totalTokens: 9,
									isEstimate: true,
								},
							},
						],
					},
					{
						depth: 1,
						id: 'B:1',
						node: expect.objectContaining({ name: 'B' }),
						runIndex: 1,
						runData: expect.objectContaining({
							startTime: Date.parse('2025-02-26T00:00:03.000Z'),
						}),
						parent: expect.objectContaining({ node: expect.objectContaining({ name: 'A' }) }),
						consumedTokens: {
							completionTokens: 4,
							promptTokens: 5,
							totalTokens: 6,
							isEstimate: false,
						},
						children: [
							{
								children: [],
								depth: 2,
								id: 'C:1',
								node: expect.objectContaining({ name: 'C' }),
								runIndex: 1,
								runData: expect.objectContaining({
									startTime: Date.parse('2025-02-26T00:00:04.000Z'),
								}),
								parent: expect.objectContaining({ node: expect.objectContaining({ name: 'B' }) }),
								consumedTokens: {
									completionTokens: 0,
									promptTokens: 0,
									totalTokens: 0,
									isEstimate: false,
								},
							},
						],
					},
				],
			},
		]);
	});
});

describe(findSelectedLogEntry, () => {
	function find(state: LogEntrySelection, response: IExecutionResponse) {
		return findSelectedLogEntry(state, {
			...response,
			tree: createLogEntries(
				createTestWorkflowObject(response.workflowData),
				response.data?.resultData.runData ?? {},
			),
		});
	}

	describe('when log is not manually selected', () => {
		it('should return undefined if no execution data exists', () => {
			const response = createTestWorkflowExecutionResponse({
				workflowData: createTestWorkflow({
					nodes: [
						createTestNode({ name: 'A' }),
						createTestNode({ name: 'B' }),
						createTestNode({ name: 'C' }),
					],
				}),
				data: { resultData: { runData: {} } },
			});

			expect(find({ type: 'initial' }, response)).toBe(undefined);
		});

		it('should return first log entry with error', () => {
			const response = createTestWorkflowExecutionResponse({
				workflowData: createTestWorkflow({
					nodes: [
						createTestNode({ name: 'A' }),
						createTestNode({ name: 'B' }),
						createTestNode({ name: 'C' }),
					],
				}),
				data: {
					resultData: {
						runData: {
							A: [createTestTaskData({ executionStatus: 'success' })],
							B: [createTestTaskData({ executionStatus: 'success' })],
							C: [
								createTestTaskData({ executionStatus: 'success' }),
								createTestTaskData({ error: {} as ExecutionError, executionStatus: 'error' }),
								createTestTaskData({ error: {} as ExecutionError, executionStatus: 'error' }),
							],
						},
					},
				},
			});

			expect(find({ type: 'initial' }, response)).toEqual(
				expect.objectContaining({ node: expect.objectContaining({ name: 'C' }), runIndex: 1 }),
			);
		});

		it("should return first log entry with error even if it's on a sub node", () => {
			const response = createTestWorkflowExecutionResponse({
				workflowData: createTestWorkflow({
					nodes: [
						createTestNode({ name: 'A' }),
						createTestNode({ name: 'B' }),
						createTestNode({ name: 'C' }),
					],
					connections: {
						C: {
							[NodeConnectionTypes.AiLanguageModel]: [
								[{ node: 'B', type: NodeConnectionTypes.AiLanguageModel, index: 0 }],
							],
						},
					},
				}),
				data: {
					resultData: {
						runData: {
							A: [createTestTaskData({ executionStatus: 'success' })],
							B: [createTestTaskData({ executionStatus: 'success' })],
							C: [
								createTestTaskData({ executionStatus: 'success' }),
								createTestTaskData({ error: {} as ExecutionError, executionStatus: 'error' }),
								createTestTaskData({ error: {} as ExecutionError, executionStatus: 'error' }),
							],
						},
					},
				},
			});

			expect(find({ type: 'initial' }, response)).toEqual(
				expect.objectContaining({ node: expect.objectContaining({ name: 'C' }), runIndex: 1 }),
			);
		});

		it('should return first log entry for AI agent node if there is no log entry with error', () => {
			const response = createTestWorkflowExecutionResponse({
				workflowData: createTestWorkflow({
					nodes: [
						createTestNode({ name: 'A' }),
						createTestNode({ name: 'B', type: AGENT_LANGCHAIN_NODE_TYPE }),
						createTestNode({ name: 'C' }),
					],
				}),
				data: {
					resultData: {
						runData: {
							A: [createTestTaskData({ executionStatus: 'success' })],
							B: [createTestTaskData({ executionStatus: 'success' })],
							C: [
								createTestTaskData({ executionStatus: 'success' }),
								createTestTaskData({ error: {} as ExecutionError, executionStatus: 'error' }),
								createTestTaskData({ error: {} as ExecutionError, executionStatus: 'error' }),
							],
						},
					},
				},
			});

			expect(find({ type: 'initial' }, response)).toEqual(
				expect.objectContaining({ node: expect.objectContaining({ name: 'B' }), runIndex: 0 }),
			);
		});

		it('should return first log entry if there is no log entry with error nor executed AI agent node', () => {
			const response = createTestWorkflowExecutionResponse({
				workflowData: createTestWorkflow({
					nodes: [
						createTestNode({ name: 'A' }),
						createTestNode({ name: 'B' }),
						createTestNode({ name: 'C' }),
					],
				}),
				data: {
					resultData: {
						runData: {
							A: [createTestTaskData({ executionStatus: 'success' })],
							B: [createTestTaskData({ executionStatus: 'success' })],
							C: [
								createTestTaskData({ executionStatus: 'success' }),
								createTestTaskData({ executionStatus: 'success' }),
								createTestTaskData({ executionStatus: 'success' }),
							],
						},
					},
				},
			});

			expect(find({ type: 'initial' }, response)).toEqual(
				expect.objectContaining({ node: expect.objectContaining({ name: 'A' }), runIndex: 0 }),
			);
		});
	});

	describe('when log is manually selected', () => {
		it('should return manually selected log', () => {
			const nodeA = createTestNode({ name: 'A' });
			const response = createTestWorkflowExecutionResponse({
				workflowData: createTestWorkflow({
					id: 'test-wf-id',
					nodes: [nodeA, createTestNode({ name: 'B' })],
				}),
				data: {
					resultData: {
						runData: {
							A: [createTestTaskData({ executionStatus: 'success' })],
							B: [createTestTaskData({ error: {} as ExecutionError, executionStatus: 'error' })],
						},
					},
				},
			});

			const result = find(
				{
					type: 'selected',
					workflowId: 'test-wf-id',
					data: createTestLogEntry({ node: nodeA, runIndex: 0 }),
				},
				response,
			);

			expect(result).toEqual(
				expect.objectContaining({ node: expect.objectContaining({ name: 'A' }), runIndex: 0 }),
			);
		});
	});
});

describe(createLogEntries, () => {
	it('should return root node log entries in ascending order of executionIndex', () => {
		const workflow = createTestWorkflowObject({
			nodes: [
				createTestNode({ name: 'A' }),
				createTestNode({ name: 'B' }),
				createTestNode({ name: 'C' }),
			],
			connections: {
				B: { main: [[{ node: 'A', type: NodeConnectionTypes.Main, index: 0 }]] },
				C: { main: [[{ node: 'B', type: NodeConnectionTypes.Main, index: 0 }]] },
			},
		});

		expect(
			createLogEntries(workflow, {
				A: [
					createTestTaskData({
						startTime: Date.parse('2025-04-04T00:00:00.000Z'),
						executionIndex: 0,
					}),
				],
				B: [
					createTestTaskData({
						startTime: Date.parse('2025-04-04T00:00:01.000Z'),
						executionIndex: 1,
					}),
				],
				C: [
					createTestTaskData({
						startTime: Date.parse('2025-04-04T00:00:02.000Z'),
						executionIndex: 3,
					}),
					createTestTaskData({
						startTime: Date.parse('2025-04-04T00:00:03.000Z'),
						executionIndex: 2,
					}),
				],
			}),
		).toEqual([
			expect.objectContaining({ node: expect.objectContaining({ name: 'A' }), runIndex: 0 }),
			expect.objectContaining({ node: expect.objectContaining({ name: 'B' }), runIndex: 0 }),
			expect.objectContaining({ node: expect.objectContaining({ name: 'C' }), runIndex: 1 }),
			expect.objectContaining({ node: expect.objectContaining({ name: 'C' }), runIndex: 0 }),
		]);
	});

	it('should return sub node log entries in ascending order of executionIndex', () => {
		const workflow = createTestWorkflowObject({
			nodes: [
				createTestNode({ name: 'A' }),
				createTestNode({ name: 'B' }),
				createTestNode({ name: 'C' }),
			],
			connections: {
				A: { main: [[{ node: 'B', type: NodeConnectionTypes.Main, index: 0 }]] },
				C: {
					[NodeConnectionTypes.AiLanguageModel]: [
						[{ node: 'B', type: NodeConnectionTypes.AiLanguageModel, index: 0 }],
					],
				},
			},
		});

		expect(
			createLogEntries(workflow, {
				A: [
					createTestTaskData({
						startTime: Date.parse('2025-04-04T00:00:00.000Z'),
						executionIndex: 0,
					}),
				],
				B: [
					createTestTaskData({
						startTime: Date.parse('2025-04-04T00:00:01.000Z'),
						executionIndex: 1,
					}),
				],
				C: [
					createTestTaskData({
						startTime: Date.parse('2025-04-04T00:00:02.000Z'),
						executionIndex: 3,
					}),
					createTestTaskData({
						startTime: Date.parse('2025-04-04T00:00:03.000Z'),
						executionIndex: 2,
					}),
				],
			}),
		).toEqual([
			expect.objectContaining({ node: expect.objectContaining({ name: 'A' }), runIndex: 0 }),
			expect.objectContaining({
				node: expect.objectContaining({ name: 'B' }),
				runIndex: 0,
				children: [
					expect.objectContaining({ node: expect.objectContaining({ name: 'C' }), runIndex: 1 }),
					expect.objectContaining({ node: expect.objectContaining({ name: 'C' }), runIndex: 0 }),
				],
			}),
		]);
	});

	it('should not include runs for disabled nodes', () => {
		const workflow = createTestWorkflowObject({
			nodes: [createTestNode({ name: 'A' }), createTestNode({ name: 'B', disabled: true })],
			connections: {
				A: { main: [[{ node: 'B', type: NodeConnectionTypes.Main, index: 0 }]] },
			},
		});

		expect(
			createLogEntries(workflow, { A: [createTestTaskData()], B: [createTestTaskData()] }),
		).toEqual([expect.objectContaining({ node: expect.objectContaining({ name: 'A' }) })]);
	});
});

describe(deepToRaw, () => {
	it('should convert reactive fields to raw in data with circular structure', () => {
		const data = reactive({
			foo: reactive({ bar: {} }),
			bazz: {},
		});

		data.foo.bar = data;
		data.bazz = data;

		const raw = deepToRaw(data);

		expect(isReactive(data)).toBe(true);
		expect(isReactive(data.foo)).toBe(true);
		expect(isReactive(data.foo.bar)).toBe(true);
		expect(isReactive(data.bazz)).toBe(true);
		expect(isReactive(raw)).toBe(false);
		expect(isReactive(raw.foo)).toBe(false);
		expect(isReactive(raw.foo.bar)).toBe(false);
		expect(isReactive(raw.bazz)).toBe(false);
	});
});
