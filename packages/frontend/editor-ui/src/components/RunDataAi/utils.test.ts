import { createTestNode, createTestTaskData, createTestWorkflowObject } from '@/__tests__/mocks';
import {
	createAiData,
	findLogEntryToAutoSelect,
	getTreeNodeData,
	type TreeNode,
} from '@/components/RunDataAi/utils';
import {
	AGENT_LANGCHAIN_NODE_TYPE,
	type ExecutionError,
	type ITaskData,
	NodeConnectionTypes,
} from 'n8n-workflow';

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
			A: [createTestTaskData({ startTime: +new Date('2025-02-26T00:00:00.000Z') })],
			B: [
				createTestTaskData({
					startTime: +new Date('2025-02-26T00:00:01.000Z'),
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
					startTime: +new Date('2025-02-26T00:00:03.000Z'),
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
					startTime: +new Date('2025-02-26T00:00:02.000Z'),
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
				createTestTaskData({ startTime: +new Date('2025-02-26T00:00:04.000Z') }),
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
						id: 'B',
						node: 'B',
						runIndex: 0,
						startTime: +new Date('2025-02-26T00:00:01.000Z'),
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
								id: 'C',
								node: 'C',
								runIndex: 0,
								startTime: +new Date('2025-02-26T00:00:02.000Z'),
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
						id: 'B',
						node: 'B',
						runIndex: 1,
						startTime: +new Date('2025-02-26T00:00:03.000Z'),
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
								id: 'C',
								node: 'C',
								runIndex: 1,
								startTime: +new Date('2025-02-26T00:00:04.000Z'),
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

describe(findLogEntryToAutoSelect, () => {
	it('should return undefined if no log entry is provided', () => {
		expect(
			findLogEntryToAutoSelect(
				[],
				{
					A: createTestNode({ name: 'A' }),
					B: createTestNode({ name: 'B' }),
					C: createTestNode({ name: 'C' }),
				},
				{
					A: [],
					B: [],
					C: [],
				},
			),
		).toBe(undefined);
	});

	it('should return first log entry with error', () => {
		expect(
			findLogEntryToAutoSelect(
				[
					createTestLogEntry({ node: 'A', runIndex: 0 }),
					createTestLogEntry({ node: 'B', runIndex: 0 }),
					createTestLogEntry({ node: 'C', runIndex: 0 }),
					createTestLogEntry({ node: 'C', runIndex: 1 }),
					createTestLogEntry({ node: 'C', runIndex: 2 }),
				],
				{
					A: createTestNode({ name: 'A' }),
					B: createTestNode({ name: 'B' }),
					C: createTestNode({ name: 'C' }),
				},
				{
					A: [createTestTaskData({ executionStatus: 'success' })],
					B: [createTestTaskData({ executionStatus: 'success' })],
					C: [
						createTestTaskData({ executionStatus: 'success' }),
						createTestTaskData({ error: {} as ExecutionError, executionStatus: 'error' }),
						createTestTaskData({ error: {} as ExecutionError, executionStatus: 'error' }),
					],
				},
			),
		).toEqual(expect.objectContaining({ node: 'C', runIndex: 1 }));
	});

	it("should return first log entry with error even if it's on a sub node", () => {
		expect(
			findLogEntryToAutoSelect(
				[
					createTestLogEntry({ node: 'A', runIndex: 0 }),
					createTestLogEntry({
						node: 'B',
						runIndex: 0,
						children: [
							createTestLogEntry({ node: 'C', runIndex: 0 }),
							createTestLogEntry({ node: 'C', runIndex: 1 }),
							createTestLogEntry({ node: 'C', runIndex: 2 }),
						],
					}),
				],
				{
					A: createTestNode({ name: 'A' }),
					B: createTestNode({ name: 'B' }),
					C: createTestNode({ name: 'C' }),
				},
				{
					A: [createTestTaskData({ executionStatus: 'success' })],
					B: [createTestTaskData({ executionStatus: 'success' })],
					C: [
						createTestTaskData({ executionStatus: 'success' }),
						createTestTaskData({ error: {} as ExecutionError, executionStatus: 'error' }),
						createTestTaskData({ error: {} as ExecutionError, executionStatus: 'error' }),
					],
				},
			),
		).toEqual(expect.objectContaining({ node: 'C', runIndex: 1 }));
	});

	it('should return first log entry for AI agent node if there is no log entry with error', () => {
		expect(
			findLogEntryToAutoSelect(
				[
					createTestLogEntry({ node: 'A', runIndex: 0 }),
					createTestLogEntry({ node: 'B', runIndex: 0 }),
					createTestLogEntry({ node: 'C', runIndex: 0 }),
					createTestLogEntry({ node: 'C', runIndex: 1 }),
					createTestLogEntry({ node: 'C', runIndex: 2 }),
				],
				{
					A: createTestNode({ name: 'A' }),
					B: createTestNode({ name: 'B', type: AGENT_LANGCHAIN_NODE_TYPE }),
					C: createTestNode({ name: 'C' }),
				},
				{
					A: [createTestTaskData({ executionStatus: 'success' })],
					B: [createTestTaskData({ executionStatus: 'success' })],
					C: [
						createTestTaskData({ executionStatus: 'success' }),
						createTestTaskData({ executionStatus: 'success' }),
						createTestTaskData({ executionStatus: 'success' }),
					],
				},
			),
		).toEqual(expect.objectContaining({ node: 'B', runIndex: 0 }));
	});

	it('should return first log entry if there is no log entry with error nor executed AI agent node', () => {
		expect(
			findLogEntryToAutoSelect(
				[
					createTestLogEntry({ node: 'A', runIndex: 0 }),
					createTestLogEntry({ node: 'B', runIndex: 0 }),
					createTestLogEntry({ node: 'C', runIndex: 0 }),
					createTestLogEntry({ node: 'C', runIndex: 1 }),
					createTestLogEntry({ node: 'C', runIndex: 2 }),
				],
				{
					A: createTestNode({ name: 'A' }),
					B: createTestNode({ name: 'B' }),
					C: createTestNode({ name: 'C' }),
				},
				{
					A: [createTestTaskData({ executionStatus: 'success' })],
					B: [createTestTaskData({ executionStatus: 'success' })],
					C: [
						createTestTaskData({ executionStatus: 'success' }),
						createTestTaskData({ executionStatus: 'success' }),
						createTestTaskData({ executionStatus: 'success' }),
					],
				},
			),
		).toEqual(expect.objectContaining({ node: 'A', runIndex: 0 }));
	});
});

function createTestLogEntry(data: Partial<TreeNode>): TreeNode {
	return {
		node: 'test node',
		runIndex: 0,
		id: String(Math.random()),
		children: [],
		consumedTokens: { completionTokens: 0, totalTokens: 0, promptTokens: 0, isEstimate: false },
		depth: 0,
		startTime: 0,
		...data,
	};
}
