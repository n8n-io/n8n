import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { computed, nextTick, shallowRef } from 'vue';
import { waitFor } from '@testing-library/vue';
import { createRunExecutionData, NodeConnectionTypes } from 'n8n-workflow';

import { useLogsSelection } from './useLogsSelection';
import { createLogTree, flattenLogEntries } from '../logs.utils';
import {
	type GroupLogEntry,
	type LogEntry,
	type NodeLogEntry,
	isGroupLog,
	isNodeLog,
} from '../logs.types';
import { useCanvasStore } from '@/app/stores/canvas.store';
import {
	createTestNode,
	createTestTaskData,
	createTestWorkflowExecutionResponse,
	createTestWorkflowObject,
} from '@/__tests__/mocks';

vi.mock('@/app/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track: vi.fn() }),
}));

describe('useLogsSelection', () => {
	function setup() {
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
		const executionResponse = createTestWorkflowExecutionResponse({
			id: 'e1',
			data: createRunExecutionData({
				resultData: {
					runData: {
						A: [createTestTaskData({ startTime: 0, executionIndex: 0 })],
						B: [createTestTaskData({ startTime: 1, executionIndex: 1 })],
						C: [createTestTaskData({ startTime: 2, executionIndex: 2 })],
					},
				},
			}),
		});

		const tree = shallowRef<LogEntry[]>(
			createLogTree(workflow, executionResponse, {}, {}, undefined, [
				{ id: 'group-1', name: 'My Group', nodeIds: ['B', 'C'] },
			]),
		);
		const flatLogEntries = computed(() => flattenLogEntries(tree.value, {}));
		const execution = computed(() => executionResponse);

		const groupEntry = tree.value.find(isGroupLog) as GroupLogEntry;
		const memberEntry = groupEntry.children.find(isNodeLog) as NodeLogEntry;

		const selection = useLogsSelection(execution, tree, flatLogEntries, vi.fn());

		return { selection, groupEntry, memberEntry };
	}

	beforeEach(() => {
		setActivePinia(createTestingPinia({ stubActions: false }));
	});

	it('keeps a member row selected when the canvas maps it to its collapsed group', async () => {
		const { selection, memberEntry } = setup();
		const canvasStore = useCanvasStore();

		// User picks a member node row in the logs
		selection.select(memberEntry);
		expect(selection.selected.value?.id).toBe(memberEntry.id);

		// Our logs->canvas sync selects the (collapsed) group on the canvas
		canvasStore.setSelectedGroupId('group-1');

		// Let the canvas->logs watcher run, then assert selection stayed on the
		// specific member instead of bouncing up to the group row
		await nextTick();
		expect(selection.selected.value?.id).toBe(memberEntry.id);
	});

	it('selects the group row when the group is picked on the canvas directly', async () => {
		const { selection, groupEntry } = setup();
		const canvasStore = useCanvasStore();

		// Nothing member-specific is selected in the logs
		canvasStore.setSelectedGroupId('group-1');

		await waitFor(() => expect(selection.selected.value?.id).toBe(groupEntry.id));
	});
});
