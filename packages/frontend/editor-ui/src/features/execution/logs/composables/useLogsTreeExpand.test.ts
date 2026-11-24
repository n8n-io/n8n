import { shallowRef } from 'vue';
import { createRunExecutionData, NodeConnectionTypes, type ExecutionError } from 'n8n-workflow';
import {
	createTestNode,
	createTestTaskData,
	createTestWorkflowExecutionResponse,
	createTestWorkflowObject,
} from '@/__tests__/mocks';
import { createLogTree } from '../logs.utils';
import { type LogEntry, isGroupLog } from '../logs.types';
import { useLogsTreeExpand } from './useLogsTreeExpand';

function buildGroupedTree(options: { withError?: boolean } = {}): LogEntry[] {
	const workflow = createTestWorkflowObject({
		id: 'w1',
		nodes: [
			createTestNode({ id: 'A', name: 'A' }),
			createTestNode({ id: 'B', name: 'B' }),
			createTestNode({ id: 'C', name: 'C' }),
		],
		connections: {
			A: { main: [[{ node: 'B', type: NodeConnectionTypes.Main, index: 0 }]] },
			B: { main: [[{ node: 'C', type: NodeConnectionTypes.Main, index: 0 }]] },
		},
	});
	const response = createTestWorkflowExecutionResponse({
		id: 'e1',
		data: createRunExecutionData({
			resultData: {
				runData: {
					A: [createTestTaskData({ startTime: 0, executionIndex: 0 })],
					B: [createTestTaskData({ startTime: 1, executionIndex: 1 })],
					C: [
						createTestTaskData({
							startTime: 2,
							executionIndex: 2,
							...(options.withError
								? {
										executionStatus: 'error',
										error: { message: 'boom' } as unknown as ExecutionError,
									}
								: {}),
						}),
					],
				},
			},
		}),
	});
	return createLogTree(workflow, response, {}, {}, undefined, [
		{ id: 'group-1', name: 'My Group', nodeIds: ['B', 'C'] },
	]);
}

describe('useLogsTreeExpand', () => {
	const loadSubExecution = vi.fn();

	it('collapses a group by default, hiding its member rows', () => {
		const entries = shallowRef<LogEntry[]>(buildGroupedTree());
		const { flatLogEntries } = useLogsTreeExpand(entries, loadSubExecution);

		// A, group — but not the group's B and C members
		expect(flatLogEntries.value.map((e) => (isGroupLog(e) ? e.group.name : e.node.name))).toEqual([
			'A',
			'My Group',
		]);
	});

	it('keeps a group expanded by default when a descendant errored', () => {
		const entries = shallowRef<LogEntry[]>(buildGroupedTree({ withError: true }));
		const { flatLogEntries } = useLogsTreeExpand(entries, loadSubExecution);

		expect(flatLogEntries.value.map((e) => (isGroupLog(e) ? e.group.name : e.node.name))).toEqual([
			'A',
			'My Group',
			'B',
			'C',
		]);
	});

	it('lets a user toggle override the default collapsed state', () => {
		const entries = shallowRef<LogEntry[]>(buildGroupedTree());
		const { flatLogEntries, toggleExpanded } = useLogsTreeExpand(entries, loadSubExecution);

		const groupEntry = entries.value.find(isGroupLog)!;
		toggleExpanded(groupEntry, true);

		expect(flatLogEntries.value.map((e) => (isGroupLog(e) ? e.group.name : e.node.name))).toEqual([
			'A',
			'My Group',
			'B',
			'C',
		]);
	});
});
