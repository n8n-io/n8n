import type { NodeExecuteAfterContext } from '@n8n/decorators';
import type { IRunExecutionData } from 'n8n-workflow';

import { countInputItems, countOutputItems } from '../otel-lifecycle-handler';

const emptyExecutionData = {
	resultData: { runData: {}, pinData: {} },
	executionData: undefined,
} as unknown as IRunExecutionData;

describe('countOutputItems', () => {
	it('should count items across branches', () => {
		const data = {
			main: [[{ json: { a: 1 } }, { json: { a: 2 } }], [{ json: { b: 1 } }]],
		};

		expect(countOutputItems(data)).toBe(3);
	});

	it('should return 0 when data is undefined', () => {
		expect(countOutputItems(undefined)).toBe(0);
	});

	it('should return 0 when main is empty', () => {
		expect(countOutputItems({ main: [] })).toBe(0);
	});

	it('should handle null branches', () => {
		const data = { main: [null, [{ json: {} }], null] };

		expect(countOutputItems(data)).toBe(1);
	});
});

describe('countInputItems', () => {
	function makeCtx(
		source: NodeExecuteAfterContext['taskData']['source'],
		runData: IRunExecutionData['resultData']['runData'],
	): NodeExecuteAfterContext {
		return {
			type: 'nodeExecuteAfter',
			workflow: {
				id: 'wf',
				name: 'W',
				active: false,
				isArchived: false,
				createdAt: new Date(),
				updatedAt: new Date(),
				activeVersionId: null,
				connections: {},
				nodes: [],
			},
			nodeName: 'TestNode',
			executionId: 'exec-1',
			taskData: {
				startTime: 0,
				executionTime: 10,
				executionIndex: 0,
				source,
			},
			executionData: {
				...emptyExecutionData,
				resultData: { ...emptyExecutionData.resultData, runData },
			},
		} as unknown as NodeExecuteAfterContext;
	}

	it('should count items from a single source', () => {
		const ctx = makeCtx([{ previousNode: 'Trigger', previousNodeRun: 0 }], {
			Trigger: [
				{
					startTime: 0,
					executionTime: 10,
					executionIndex: 0,
					source: [],
					data: { main: [[{ json: { a: 1 } }, { json: { a: 2 } }, { json: { a: 3 } }]] },
				},
			],
		});

		expect(countInputItems(ctx)).toBe(3);
	});

	it('should count items only from the referenced output branch', () => {
		const ctx = makeCtx([{ previousNode: 'IF', previousNodeRun: 0, previousNodeOutput: 1 }], {
			IF: [
				{
					startTime: 0,
					executionTime: 10,
					executionIndex: 0,
					source: [],
					data: {
						main: [
							// Branch 0 (true): 2 items
							[{ json: { matched: true } }, { json: { matched: true } }],
							// Branch 1 (false): 5 items
							[
								{ json: { matched: false } },
								{ json: { matched: false } },
								{ json: { matched: false } },
								{ json: { matched: false } },
								{ json: { matched: false } },
							],
						],
					},
				},
			],
		});

		// Should count only branch 1 (5 items), not branch 0+1 (7 items)
		expect(countInputItems(ctx)).toBe(5);
	});

	it('should sum items from multiple sources', () => {
		const ctx = makeCtx(
			[
				{ previousNode: 'NodeA', previousNodeRun: 0 },
				{ previousNode: 'NodeB', previousNodeRun: 0 },
			],
			{
				NodeA: [
					{
						startTime: 0,
						executionTime: 10,
						executionIndex: 0,
						source: [],
						data: { main: [[{ json: { a: 1 } }, { json: { a: 2 } }]] },
					},
				],
				NodeB: [
					{
						startTime: 0,
						executionTime: 10,
						executionIndex: 0,
						source: [],
						data: { main: [[{ json: { b: 1 } }]] },
					},
				],
			},
		);

		expect(countInputItems(ctx)).toBe(3);
	});

	it('should return 0 when source is empty', () => {
		const ctx = makeCtx([], {});

		expect(countInputItems(ctx)).toBe(0);
	});

	it('should skip null sources', () => {
		const ctx = makeCtx([null as never, { previousNode: 'Trigger', previousNodeRun: 0 }], {
			Trigger: [
				{
					startTime: 0,
					executionTime: 10,
					executionIndex: 0,
					source: [],
					data: { main: [[{ json: {} }]] },
				},
			],
		});

		expect(countInputItems(ctx)).toBe(1);
	});

	it('should return 0 when source node has no run data', () => {
		const ctx = makeCtx([{ previousNode: 'MissingNode', previousNodeRun: 0 }], {});

		expect(countInputItems(ctx)).toBe(0);
	});
});
