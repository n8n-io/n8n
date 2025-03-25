import { createTestNode, createTestWorkflowObject } from '@/__tests__/mocks';
import { createAiData, getTreeNodeData } from '@/components/RunDataAi/utils';
import { type ITaskData, NodeConnectionTypes } from 'n8n-workflow';

describe(getTreeNodeData, () => {
	function createTaskData(partialData: Partial<ITaskData>): ITaskData {
		return {
			startTime: 0,
			executionTime: 1,
			source: [],
			executionStatus: 'success',
			data: { main: [[{ json: {} }]] },
			...partialData,
		};
	}

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
			A: [createTaskData({ startTime: +new Date('2025-02-26T00:00:00.000Z') })],
			B: [
				createTaskData({ startTime: +new Date('2025-02-26T00:00:01.000Z') }),
				createTaskData({ startTime: +new Date('2025-02-26T00:00:03.000Z') }),
			],
			C: [
				createTaskData({ startTime: +new Date('2025-02-26T00:00:02.000Z') }),
				createTaskData({ startTime: +new Date('2025-02-26T00:00:04.000Z') }),
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
				id: 'A',
				node: 'A',
				runIndex: 0,
				startTime: 0,
				children: [
					{
						depth: 1,
						id: 'B',
						node: 'B',
						runIndex: 0,
						startTime: +new Date('2025-02-26T00:00:01.000Z'),
						children: [
							{
								children: [],
								depth: 2,
								id: 'C',
								node: 'C',
								runIndex: 0,
								startTime: +new Date('2025-02-26T00:00:02.000Z'),
							},
						],
					},
					{
						depth: 1,
						id: 'B',
						node: 'B',
						runIndex: 1,
						startTime: +new Date('2025-02-26T00:00:03.000Z'),
						children: [
							{
								children: [],
								depth: 2,
								id: 'C',
								node: 'C',
								runIndex: 1,
								startTime: +new Date('2025-02-26T00:00:04.000Z'),
							},
						],
					},
				],
			},
		]);
	});
});
