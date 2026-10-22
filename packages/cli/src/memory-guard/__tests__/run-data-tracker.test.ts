import { mockLogger } from '@n8n/backend-test-utils';
import type {
	NodeExecuteAfterContext,
	NodeExecuteBeforeContext,
	WorkflowExecuteAfterContext,
	WorkflowExecuteBeforeContext,
	WorkflowExecuteResumeContext,
} from '@n8n/decorators';
import type { INodeExecutionData, IRunData, IRunExecutionData, ITaskData } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { ActiveExecutions } from '@/active-executions';

import { estimateItemsSize, estimateTaskDataSize } from '../estimate-run-data-size';
import { RunDataTracker } from '../run-data-tracker';

vi.mock('../estimate-run-data-size', async (importOriginal) => {
	const actual = await importOriginal<typeof import('../estimate-run-data-size')>();
	return { ...actual, estimateTaskDataSize: vi.fn(actual.estimateTaskDataSize) };
});

const toItems = (count: number): INodeExecutionData[] =>
	Array.from({ length: count }, (_, i) => ({ json: { id: i, name: `item-${i}` } }));

const sizeOf = (items: INodeExecutionData[]) => estimateItemsSize(items, new WeakSet());

/** The estimate of items whose data was already counted: their item wrappers only. */
const wrappersOf = (items: INodeExecutionData[]) => {
	const seen = new WeakSet<object>();
	estimateItemsSize(items, seen);
	return estimateItemsSize(items, seen);
};

describe('RunDataTracker', () => {
	const activeIds = new Set<string>();
	const activeExecutions = mock<ActiveExecutions>({
		has: (executionId: string) => activeIds.has(executionId),
	});
	let tracker: RunDataTracker;

	const runExecutionData = (runData: IRunData = {}) =>
		({ resultData: { runData } }) as unknown as IRunExecutionData;
	const taskDataOf = (items: INodeExecutionData[]) =>
		({ data: { main: [items] } }) as unknown as ITaskData;

	const start = (executionId: string, runData?: IRunData) => {
		activeIds.add(executionId);
		tracker.onExecutionStart({
			executionId,
			executionData: runData ? runExecutionData(runData) : undefined,
		} as WorkflowExecuteBeforeContext);
	};
	const resume = (executionId: string, runData: IRunData = {}) =>
		tracker.onExecutionResume({
			executionId,
			executionData: runExecutionData(runData),
		} as WorkflowExecuteResumeContext);
	// The engine gives each node run an execution index, the same at start and finish.
	let nextExecutionIndex = 0;
	const startedRuns = new Map<string, ITaskData>();
	const nodeStart = (
		executionId: string,
		nodeName: string,
		{ input, from }: { input?: INodeExecutionData[]; from?: string } = {},
	) => {
		const taskData = {
			executionIndex: nextExecutionIndex++,
			source: from ? [{ previousNode: from }] : [],
			...(input ? { inputOverride: { main: [input] } } : {}),
		} as unknown as ITaskData;
		startedRuns.set(nodeName, taskData);
		tracker.onNodeStart({ executionId, nodeName, taskData } as unknown as NodeExecuteBeforeContext);
	};
	/** Finishes the last started run of `nodeName`, or a run with `executionIndex` if given. */
	const nodeFinish = (
		executionId: string,
		nodeName: string,
		items: INodeExecutionData[] = [],
		executionIndex?: number,
	) => {
		const started = executionIndex === undefined ? startedRuns.get(nodeName) : undefined;
		const taskData = started ?? ({ executionIndex: executionIndex ?? -1 } as unknown as ITaskData);
		taskData.data = { main: [items] };
		tracker.onNodeFinish({
			executionId,
			nodeName,
			taskData,
			executionData: runExecutionData(),
		} as NodeExecuteAfterContext);
	};
	const end = (executionId: string) => {
		tracker.onExecutionEnd({ executionId } as WorkflowExecuteAfterContext);
		activeIds.delete(executionId);
	};

	beforeEach(() => {
		activeIds.clear();
		startedRuns.clear();
		tracker = new RunDataTracker(mockLogger(), activeExecutions);
	});

	it('should sum node output sizes for each execution and for each node', () => {
		const first = toItems(3);
		const second = toItems(2);
		const loop = toItems(4);
		start('1');

		nodeStart('1', 'First');
		nodeFinish('1', 'First', first);
		nodeStart('1', 'Second');
		nodeFinish('1', 'Second', second);
		nodeStart('1', 'Second');
		nodeFinish('1', 'Second', loop);

		expect(tracker.getEstimate('1')).toEqual({
			totalBytes: sizeOf(first) + sizeOf(second) + sizeOf(loop),
			bytesByNode: new Map([
				['First', sizeOf(first)],
				['Second', sizeOf(second) + sizeOf(loop)],
			]),
			runningNode: undefined,
		});
	});

	it('should count data that a node passes on by reference once', () => {
		const items = toItems(3);
		start('1');

		nodeFinish('1', 'Source', items);
		nodeFinish('1', 'Pass through', items);

		expect(tracker.getEstimate('1')?.bytesByNode).toEqual(
			new Map([
				['Source', sizeOf(items)],
				['Pass through', wrappersOf(items)],
			]),
		);
	});

	it('should keep executions apart', () => {
		const items = toItems(3);
		start('1');
		start('2');

		nodeFinish('1', 'Node', items);
		nodeFinish('2', 'Node', items);

		expect(tracker.getEstimate('1')?.totalBytes).toBe(sizeOf(items));
		expect(tracker.getEstimate('2')?.totalBytes).toBe(sizeOf(items));
	});

	it('should report the innermost running node', () => {
		start('1');

		nodeStart('1', 'Agent');
		expect(tracker.getEstimate('1')?.runningNode).toBe('Agent');

		nodeStart('1', 'Tool');
		expect(tracker.getEstimate('1')?.runningNode).toBe('Tool');

		nodeFinish('1', 'Tool');
		expect(tracker.getEstimate('1')?.runningNode).toBe('Agent');

		nodeFinish('1', 'Agent');
		expect(tracker.getEstimate('1')?.runningNode).toBeUndefined();
	});

	it('should keep a tool running when a tool that runs at the same time finishes', () => {
		start('1');
		nodeStart('1', 'Agent');
		nodeStart('1', 'Tool A', { from: 'Agent' });
		nodeStart('1', 'Tool B', { from: 'Agent' });

		nodeFinish('1', 'Tool A');

		expect(tracker.getEstimate('1')?.runningNode).toBe('Tool B');
	});

	it('should drop a tool that returned no data when its agent finishes', () => {
		start('1');
		nodeStart('1', 'Agent');
		nodeStart('1', 'Sub-agent', { from: 'Agent' });
		nodeStart('1', 'Tool that returned no data', { from: 'Sub-agent' });

		nodeFinish('1', 'Agent');

		expect(tracker.getEstimate('1')?.runningNode).toBeUndefined();
	});

	it('should keep a sibling tool running when a sub-agent finishes', () => {
		start('1');
		nodeStart('1', 'Agent');
		nodeStart('1', 'Sub-agent', { from: 'Agent' });
		nodeStart('1', 'Sibling tool', { from: 'Agent' });
		nodeStart('1', 'Tool that returned no data', { from: 'Sub-agent' });

		nodeFinish('1', 'Sub-agent');

		expect(tracker.getEstimate('1')?.runningNode).toBe('Sibling tool');
	});

	it('should match a resumed agent by name when it finishes under a new execution index', () => {
		start('1');
		nodeStart('1', 'Agent');

		nodeFinish('1', 'Agent', [], 999);

		expect(tracker.getEstimate('1')?.runningNode).toBeUndefined();
	});

	it('should ignore a node finish without a matching start', () => {
		start('1');
		nodeStart('1', 'Agent');

		nodeFinish('1', 'Resumed node', [], 999);

		expect(tracker.getEstimate('1')?.runningNode).toBe('Agent');
	});

	it('should count the input of an AI sub-node when it starts, and its data once only', () => {
		const prompt = toItems(3);
		const response = toItems(1);
		start('1');

		nodeStart('1', 'Model', { input: prompt, from: 'Agent' });
		expect(tracker.getEstimate('1')?.totalBytes).toBe(sizeOf(prompt));

		// At finish, the prompt objects are already counted, so only their item wrappers count again.
		nodeFinish('1', 'Model', response);
		expect(tracker.getEstimate('1')?.totalBytes).toBe(
			sizeOf(prompt) + wrappersOf(prompt) + sizeOf(response),
		);
	});

	it('should stop tracking an execution when it ends', () => {
		start('1');
		nodeFinish('1', 'Node', toItems(3));

		end('1');

		expect(tracker.getEstimate('1')).toBeUndefined();
	});

	it('should ignore node events of an execution that ended or never started', () => {
		start('1');
		end('1');

		nodeStart('1', 'Late node');
		nodeFinish('1', 'Late node', toItems(3));
		nodeFinish('2', 'Unknown node', toItems(3));

		expect(tracker.getEstimate('1')).toBeUndefined();
		expect(tracker.getEstimate('2')).toBeUndefined();
	});

	it('should count the reloaded run data when an execution resumes', () => {
		const beforeWait = toItems(3);
		const reloaded = toItems(3);
		const afterWait = toItems(2);
		start('1');
		nodeFinish('1', 'Before wait', beforeWait);

		resume('1', { 'Before wait': [taskDataOf(reloaded)] });
		nodeFinish('1', 'After wait', afterWait);

		expect(tracker.getEstimate('1')?.bytesByNode).toEqual(
			new Map([
				['Before wait', sizeOf(reloaded)],
				['After wait', sizeOf(afterWait)],
			]),
		);
	});

	it('should count the run data that an execution starts with', () => {
		const earlier = toItems(4);

		start('1', { 'Earlier run': [taskDataOf(earlier), taskDataOf(earlier)] });

		// The second run holds the same objects, so only its item wrappers are new.
		expect(tracker.getEstimate('1')?.totalBytes).toBe(sizeOf(earlier) + wrappersOf(earlier));
	});

	describe('when an execution starts with many runs', () => {
		const runsOf = (count: number, itemCount: number) =>
			Array.from({ length: count }, () => taskDataOf(toItems(itemCount)));

		beforeEach(() => {
			vi.mocked(estimateTaskDataSize).mockClear();
		});

		it('should measure 25 runs and give the others the average of their node', () => {
			start('1', { Node: runsOf(100, 3) });

			expect(estimateTaskDataSize).toHaveBeenCalledTimes(25);
			expect(tracker.getEstimate('1')?.totalBytes).toBe(100 * sizeOf(toItems(3)));
		});

		it('should measure each run once, without sharing, when all runs fit in the budget', () => {
			start('1', { Node: runsOf(25, 3) });

			expect(estimateTaskDataSize).toHaveBeenCalledTimes(25);
			for (const [, , , sharing] of vi.mocked(estimateTaskDataSize).mock.calls) {
				expect(sharing).toBeUndefined();
			}
			expect(tracker.getEstimate('1')?.totalBytes).toBe(25 * sizeOf(toItems(3)));
		});

		it('should measure distinct runs when a node has a few more runs than the budget', () => {
			start('1', { Node: runsOf(26, 3) });

			const measured = vi.mocked(estimateTaskDataSize).mock.calls.map(([taskData]) => taskData);
			expect(new Set(measured).size).toBe(25);
			expect(tracker.getEstimate('1')?.totalBytes).toBe(26 * sizeOf(toItems(3)));
		});

		it('should measure a run of every node before a second run of any node', () => {
			const loop = runsOf(1000, 1);
			const large = runsOf(2, 50);

			start('1', { Loop: loop, Large: large });

			const measured = vi.mocked(estimateTaskDataSize).mock.calls.map(([taskData]) => taskData);
			expect(measured.filter((taskData) => loop.includes(taskData))).toHaveLength(23);
			expect(measured.filter((taskData) => large.includes(taskData))).toHaveLength(2);
			expect(tracker.getEstimate('1')?.bytesByNode).toEqual(
				new Map([
					['Loop', 1000 * sizeOf(toItems(1))],
					['Large', 2 * sizeOf(toItems(50))],
				]),
			);
		});

		it('should give a node without a measured run the average of all measured runs', () => {
			const runData = Object.fromEntries(
				Array.from({ length: 30 }, (_, i) => [`Node ${i}`, runsOf(1, 2)]),
			);

			start('1', runData);

			expect(estimateTaskDataSize).toHaveBeenCalledTimes(25);
			expect(tracker.getEstimate('1')?.bytesByNode.get('Node 29')).toBe(sizeOf(toItems(2)));
			expect(tracker.getEstimate('1')?.totalBytes).toBe(30 * sizeOf(toItems(2)));
		});

		it('should leave a run whose estimate fails out of the average of its node', () => {
			vi.mocked(estimateTaskDataSize).mockImplementationOnce(() => {
				throw new Error('estimate');
			});

			start('1', { Node: runsOf(100, 3) });

			expect(tracker.getEstimate('1')?.totalBytes).toBe(100 * sizeOf(toItems(3)));
		});

		it('should give a node whose estimates all fail the average of all measured runs', async () => {
			const actual = await vi.importActual<typeof import('../estimate-run-data-size')>(
				'../estimate-run-data-size',
			);
			const loop = runsOf(1000, 2);
			vi.mocked(estimateTaskDataSize).mockImplementation((taskData, ...rest) => {
				if (loop.includes(taskData)) throw new Error('estimate');
				return actual.estimateTaskDataSize(taskData, ...rest);
			});

			start('1', { Loop: loop, Other: runsOf(1, 2) });

			expect(tracker.getEstimate('1')?.bytesByNode.get('Loop')).toBe(1000 * sizeOf(toItems(2)));
			vi.mocked(estimateTaskDataSize).mockImplementation(actual.estimateTaskDataSize);
		});

		const payloads = Array.from({ length: 25 }, (_, i) => ({ data: `${i}-`.repeat(50_000) }));

		it.each([
			['all runs hold one object', () => ({ payload: payloads[0] })],
			[
				'the second half of the runs hold a second object',
				(run: number) => ({ payload: payloads[run < 50 ? 0 : 1] }),
			],
			['the runs alternate between two objects', (run: number) => ({ payload: payloads[run % 2] })],
			['the runs take turns with three objects', (run: number) => ({ payload: payloads[run % 3] })],
			[
				'each group of 4 runs holds its object and the object of the next group',
				(run: number) => {
					const group = Math.floor(run / 4);
					return { payload: payloads[group], next: payloads[(group + 1) % 25] };
				},
			],
		])('should count once each object that many runs hold, when %s', (_, jsonOf) => {
			const runs = Array.from({ length: 100 }, (_, run) => [{ json: jsonOf(run) }]);
			const seen = new WeakSet<object>();
			const fullWalk = runs.reduce((bytes, items) => bytes + estimateItemsSize(items, seen), 0);

			start('1', { Node: runs.map(taskDataOf) });

			expect(tracker.getEstimate('1')?.totalBytes).toBe(fullWalk);
		});

		it('should count nothing for a node without runs', () => {
			start('1', { Empty: [] });

			expect(tracker.getEstimate('1')?.totalBytes).toBe(0);
		});
	});

	it('should drop an execution that is no longer active when another starts', () => {
		start('1');
		activeIds.delete('1'); // its end handler never ran
		start('2');

		expect(tracker.getEstimate('1')).toBeUndefined();
		expect(tracker.getEstimate('2')).toBeDefined();
	});

	it('should keep an execution that is still active when another starts', () => {
		start('1');
		start('2');

		expect(tracker.getEstimate('1')).toBeDefined();
	});

	it.each([
		[
			'an execution start',
			() =>
				tracker.onExecutionStart({
					executionId: '2',
					executionData: {},
				} as unknown as WorkflowExecuteBeforeContext),
		],
		[
			'an execution resume',
			() =>
				tracker.onExecutionResume({
					executionId: '2',
					executionData: {},
				} as unknown as WorkflowExecuteResumeContext),
		],
		[
			'a node start',
			() =>
				tracker.onNodeStart({
					executionId: '1',
					nodeName: 'Node',
					taskData: { executionIndex: 0 },
				} as unknown as NodeExecuteBeforeContext),
		],
		[
			'a node finish',
			() =>
				tracker.onNodeFinish({
					executionId: '1',
					nodeName: 'Node',
					taskData: { executionIndex: 0, data: { main: [toItems(1)] } },
					executionData: {},
				} as unknown as NodeExecuteAfterContext),
		],
	])('should not throw when the event data of %s is malformed', (_, handle) => {
		start('1');

		expect(handle).not.toThrow();
		expect(tracker.getEstimate('1')?.totalBytes).toBe(0);
	});

	it.each([
		['an object without a prototype', Object.create(null) as unknown],
		[
			'an error whose message throws',
			Object.defineProperty(new Error(), 'message', {
				get() {
					throw new Error('message getter');
				},
			}),
		],
	])('should not throw when estimating throws %s', (_, thrown) => {
		start('1');
		nodeStart('1', 'Node');
		const taskData = startedRuns.get('Node')!;
		// The engine builds `data`, so the estimator reads it directly and can see this throw.
		Object.defineProperty(taskData, 'data', {
			enumerable: true,
			get() {
				throw thrown;
			},
			set() {},
		});

		expect(() =>
			tracker.onNodeFinish({
				executionId: '1',
				nodeName: 'Node',
				taskData,
				executionData: runExecutionData(),
			} as NodeExecuteAfterContext),
		).not.toThrow();
		expect(tracker.getEstimate('1')?.totalBytes).toBe(0);
	});
});
