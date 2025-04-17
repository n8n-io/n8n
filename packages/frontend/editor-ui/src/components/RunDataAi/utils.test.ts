import { createTestNode, createTestTaskData, createTestWorkflowObject } from '@/__tests__/mocks';
import { createAiData, getTreeNodeData } from '@/components/RunDataAi/utils';
import { type ITaskData, NodeConnectionTypes } from 'n8n-workflow';

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
