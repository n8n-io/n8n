import { describe, it, expect, vi, beforeEach } from 'vitest';
import { computed } from 'vue';
import type { IWorkflowGroup } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { createTestNode } from '@/__tests__/mocks';
import { NO_OP_NODE_TYPE } from '@/app/constants';

import { useCanvasNodeGroupTelemetry } from './useCanvasNodeGroupTelemetry';

const trackSpy = vi.hoisted(() => vi.fn());
// Experiment cleanup: remove with emptyCanvasGroups (121_empty_canvas_groups).
const emptyCanvasGroupsEnabled = vi.hoisted(() => ({ value: true }));
const workflowDocumentStore = vi.hoisted(() => ({
	workflowId: 'wf-test',
	allNodes: [] as ReturnType<typeof createTestNode>[],
	connectionsBySourceNode: {},
}));

vi.mock('@n8n/composables/useTelemetry', () => ({
	useTelemetry: vi.fn(() => ({ track: trackSpy })),
}));

vi.mock('@/app/stores/workflowDocument.store', () => ({
	injectWorkflowDocumentStore: vi.fn(() => computed(() => workflowDocumentStore)),
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: vi.fn(() => ({ pushRef: 'push-ref-test' })),
}));

// Experiment cleanup: remove with emptyCanvasGroups (121_empty_canvas_groups).
vi.mock('./useEmptyCanvasGroupsFlag', () => ({
	useEmptyCanvasGroupsFlag: vi.fn(() => emptyCanvasGroupsEnabled),
}));

function makeGroup(overrides: Partial<IWorkflowGroup> = {}): IWorkflowGroup {
	return { id: 'group-1', nodeIds: ['a', 'b', 'c'], name: 'My Group', ...overrides };
}

describe('useCanvasNodeGroupTelemetry', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Experiment cleanup: remove with emptyCanvasGroups (121_empty_canvas_groups).
		emptyCanvasGroupsEnabled.value = true;
		workflowDocumentStore.allNodes = [];
		workflowDocumentStore.connectionsBySourceNode = {};
	});

	it.each([
		['trackUngrouped', 'User ungrouped nodes'],
		['trackCollapsed', 'User collapsed group'],
		['trackExpanded', 'User expanded group'],
	] as const)('%s fires "%s" with the full property set', (method, eventName) => {
		const telemetry = useCanvasNodeGroupTelemetry();

		telemetry[method](makeGroup(), 'group-toolbar');

		expect(trackSpy).toHaveBeenCalledWith(eventName, {
			workflow_id: 'wf-test',
			group_id: 'group-1',
			node_ids: ['a', 'b', 'c'],
			node_count: 3,
			group_title: 'My Group',
			source: 'group-toolbar',
			push_ref: 'push-ref-test',
		});
	});

	it('tracks a created group through the registry', () => {
		const telemetry = useCanvasNodeGroupTelemetry();

		telemetry.trackGrouped(makeGroup(), 'group-toolbar');

		expect(trackSpy).toHaveBeenCalledWith(TELEMETRY_EVENT.WORKFLOW.USER_GROUPED_NODES, {
			workflow_id: 'wf-test',
			group_id: 'group-1',
			node_ids: ['a', 'b', 'c'],
			node_count: 3,
			group_title: 'My Group',
			source: 'group-toolbar',
			push_ref: 'push-ref-test',
			// Experiment cleanup: remove with emptyCanvasGroups (121_empty_canvas_groups).
			is_empty: false,
		});
	});

	// Experiment cleanup: remove with emptyCanvasGroups (121_empty_canvas_groups).
	it('excludes the internal anchor when tracking an empty group', () => {
		const anchor = createTestNode({
			id: 'anchor',
			type: NO_OP_NODE_TYPE,
			parameters: { emptyGroupAnchor: true },
		});
		workflowDocumentStore.allNodes = [anchor];
		const telemetry = useCanvasNodeGroupTelemetry();

		telemetry.trackGrouped(makeGroup({ nodeIds: [anchor.id] }), 'node-creator', 'add_node_button');

		expect(trackSpy).toHaveBeenCalledWith(TELEMETRY_EVENT.WORKFLOW.USER_GROUPED_NODES, {
			workflow_id: 'wf-test',
			group_id: 'group-1',
			node_ids: [],
			node_count: 0,
			group_title: 'My Group',
			source: 'node-creator',
			push_ref: 'push-ref-test',
			is_empty: true,
			node_creator_open_source: 'add_node_button',
		});
	});

	// Experiment cleanup: remove with emptyCanvasGroups (121_empty_canvas_groups).
	it('tracks an existing connection when the empty group is created around its anchor', () => {
		const anchor = createTestNode({
			id: 'anchor',
			name: 'Anchor',
			type: NO_OP_NODE_TYPE,
			parameters: { emptyGroupAnchor: true },
		});
		workflowDocumentStore.allNodes = [anchor];
		workflowDocumentStore.connectionsBySourceNode = {
			Before: {
				[NodeConnectionTypes.Main]: [
					[{ node: anchor.name, type: NodeConnectionTypes.Main, index: 0 }],
				],
			},
		};
		const telemetry = useCanvasNodeGroupTelemetry();

		telemetry.trackInitialEmptyGroupConnection(makeGroup({ nodeIds: [anchor.id] }));

		expect(trackSpy).toHaveBeenCalledWith(TELEMETRY_EVENT.WORKFLOW.USER_CONNECTED_EMPTY_GROUP, {
			workflow_id: 'wf-test',
			group_id: 'group-1',
			push_ref: 'push-ref-test',
			was_first_connection: false,
		});
	});

	it('passes through the event source', () => {
		const telemetry = useCanvasNodeGroupTelemetry();

		telemetry.trackGrouped(makeGroup(), 'keyboard-shortcut');

		expect(trackSpy).toHaveBeenCalledWith(
			TELEMETRY_EVENT.WORKFLOW.USER_GROUPED_NODES,
			expect.objectContaining({ source: 'keyboard-shortcut' }),
		);
	});

	// Experiment cleanup: remove with emptyCanvasGroups (121_empty_canvas_groups).
	it('keeps the existing grouped-nodes payload and suppresses new events when disabled', () => {
		emptyCanvasGroupsEnabled.value = false;
		const telemetry = useCanvasNodeGroupTelemetry();
		const group = makeGroup();

		telemetry.trackGrouped(group, 'group-toolbar');
		telemetry.trackInitialEmptyGroupConnection(group);

		expect(trackSpy).toHaveBeenCalledOnce();
		expect(trackSpy).toHaveBeenCalledWith(TELEMETRY_EVENT.WORKFLOW.USER_GROUPED_NODES, {
			workflow_id: 'wf-test',
			group_id: 'group-1',
			node_ids: ['a', 'b', 'c'],
			node_count: 3,
			group_title: 'My Group',
			source: 'group-toolbar',
			push_ref: 'push-ref-test',
		});
	});
});
