import { renderComponent } from '@/__tests__/render';
import { fireEvent } from '@testing-library/vue';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import type { GraphNode } from '@vue-flow/core';

import CanvasSelectionToolbar from './CanvasSelectionToolbar.vue';
import { useCanvasNodeGroupsStore } from '../../../stores/canvasNodeGroups.store';

const isSelectionGroupableMock = vi.fn();
const isSelectionExtractableMock = vi.fn();
const expandSelectionWithSubNodesMock = vi.fn((nodeIds: string[]) => nodeIds);

vi.mock('@/app/composables/useSelectionValidation', () => ({
	useSelectionValidation: () => ({
		isSelectionGroupable: isSelectionGroupableMock,
		isSelectionExtractable: isSelectionExtractableMock,
		expandSelectionWithSubNodes: expandSelectionWithSubNodesMock,
	}),
}));

vi.mock('@vue-flow/core', () => ({
	useVueFlow: () => ({ vueFlowRef: { value: null } }),
	getRectOfNodes: (nodes: GraphNode[]) => {
		const xs = nodes.map((n) => n.position.x);
		const ys = nodes.map((n) => n.position.y);
		return {
			x: Math.min(...xs),
			y: Math.min(...ys),
			width: Math.max(...xs) - Math.min(...xs) + 100,
			height: Math.max(...ys) - Math.min(...ys) + 100,
		};
	},
}));

function makeNode(id: string, x = 0, y = 0): GraphNode {
	return { id, position: { x, y } } as unknown as GraphNode;
}

describe('CanvasSelectionToolbar', () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia({ stubActions: false }));
		isSelectionGroupableMock.mockReturnValue({
			valid: true,
			subGraphData: { start: 'A', end: 'B' },
		});
		isSelectionExtractableMock.mockImplementation((nodeIds: string[]) =>
			nodeIds.length < 2
				? { valid: false, reason: 'too-few-nodes' }
				: { valid: true, subGraphData: { start: 'A', end: 'B' } },
		);
		expandSelectionWithSubNodesMock.mockImplementation((nodeIds: string[]) => nodeIds);
	});

	function render(
		props: Partial<{
			selectedNodes: GraphNode[];
			readOnly: boolean;
		}> = {},
	) {
		return renderComponent(CanvasSelectionToolbar, {
			props: {
				selectedNodes: props.selectedNodes ?? [],
				readOnly: props.readOnly ?? false,
			},
		});
	}

	it('is hidden when fewer than two nodes are selected', () => {
		const wrapper = render({ selectedNodes: [makeNode('a')] });
		expect(wrapper.queryByTestId('canvas-selection-toolbar')).toBeNull();
	});

	it('is hidden when grouping and extraction reject the selection', () => {
		isSelectionGroupableMock.mockReturnValue({
			valid: false,
			reason: 'invalid-subgraph',
			errors: [],
		});
		isSelectionExtractableMock.mockReturnValue({
			valid: false,
			reason: 'invalid-subgraph',
			errors: [],
		});
		const wrapper = render({ selectedNodes: [makeNode('a'), makeNode('b')] });
		expect(wrapper.queryByTestId('canvas-selection-toolbar')).toBeNull();
	});

	it('shows only Extract when expanded sub-nodes are connected outside the group', () => {
		expandSelectionWithSubNodesMock.mockImplementation((nodeIds: string[]) => [
			...nodeIds,
			'model',
		]);
		isSelectionGroupableMock.mockReturnValue({
			valid: false,
			reason: 'non-main-boundary',
			connection: { source: 'Model', target: 'Other Agent', type: 'ai_languageModel' },
		});

		const wrapper = render({ selectedNodes: [makeNode('a'), makeNode('agent')] });

		expect(isSelectionGroupableMock).toHaveBeenCalledWith(['a', 'agent', 'model']);
		expect(wrapper.queryByTestId('canvas-selection-toolbar-group')).toBeNull();
		expect(wrapper.getByTestId('canvas-selection-toolbar-extract')).toBeTruthy();
	});

	it('shows Group and Extract when the selection is valid and not part of a group', () => {
		const wrapper = render({ selectedNodes: [makeNode('a'), makeNode('b')] });
		expect(wrapper.getByTestId('canvas-selection-toolbar-group')).toBeTruthy();
		expect(wrapper.getByTestId('canvas-selection-toolbar-extract')).toBeTruthy();
	});

	it('hides Group and shows Extract when the selection is fully inside an existing group', () => {
		const store = useCanvasNodeGroupsStore();
		store.createGroup(['a', 'b'], 'Group');
		const wrapper = render({ selectedNodes: [makeNode('a'), makeNode('b')] });
		expect(wrapper.queryByTestId('canvas-selection-toolbar-group')).toBeNull();
		expect(wrapper.getByTestId('canvas-selection-toolbar-extract')).toBeTruthy();
	});

	it('hides Group and shows Extract when a subset of a group is selected', () => {
		const store = useCanvasNodeGroupsStore();
		store.createGroup(['a', 'b', 'c'], 'Group');
		const wrapper = render({ selectedNodes: [makeNode('a'), makeNode('b')] });
		expect(wrapper.queryByTestId('canvas-selection-toolbar-group')).toBeNull();
		expect(wrapper.getByTestId('canvas-selection-toolbar-extract')).toBeTruthy();
	});

	it('hides Group and shows Extract when the selection mixes grouped and ungrouped nodes', () => {
		const store = useCanvasNodeGroupsStore();
		store.createGroup(['a', 'b'], 'Group');
		const wrapper = render({ selectedNodes: [makeNode('a'), makeNode('c')] });
		expect(wrapper.queryByTestId('canvas-selection-toolbar-group')).toBeNull();
		expect(wrapper.getByTestId('canvas-selection-toolbar-extract')).toBeTruthy();
	});

	it('hides Group and shows Extract when the selection spans nodes from different groups', () => {
		const store = useCanvasNodeGroupsStore();
		store.createGroup(['a', 'b'], 'Group A');
		store.createGroup(['c', 'd'], 'Group B');
		const wrapper = render({ selectedNodes: [makeNode('a'), makeNode('c')] });
		expect(wrapper.queryByTestId('canvas-selection-toolbar-group')).toBeNull();
		expect(wrapper.getByTestId('canvas-selection-toolbar-extract')).toBeTruthy();
	});

	it('is hidden in read-only mode', () => {
		const wrapper = render({
			selectedNodes: [makeNode('a'), makeNode('b')],
			readOnly: true,
		});
		expect(wrapper.queryByTestId('canvas-selection-toolbar')).toBeNull();
	});

	it('creates a group when Group is clicked', async () => {
		const store = useCanvasNodeGroupsStore();
		const wrapper = render({ selectedNodes: [makeNode('a'), makeNode('b')] });
		await fireEvent.click(wrapper.getByTestId('canvas-selection-toolbar-group'));

		expect(store.allGroups).toHaveLength(1);
		expect(store.allGroups[0].nodeIds).toEqual(['a', 'b']);
		expect(store.allGroups[0].title).toBe('Group 1');
		expect(wrapper.emitted()['group-created']).toEqual([[store.allGroups[0].id]]);
	});

	it('emits extract-workflow when Extract is clicked', async () => {
		const wrapper = render({ selectedNodes: [makeNode('a'), makeNode('b')] });
		await fireEvent.click(wrapper.getByTestId('canvas-selection-toolbar-extract'));

		expect(wrapper.emitted()['extract-workflow']).toEqual([[['a', 'b']]]);
	});

	it('increments the default title for each new group', async () => {
		const store = useCanvasNodeGroupsStore();
		store.createGroup(['x', 'y'], 'Group 1');

		const wrapper = render({ selectedNodes: [makeNode('a'), makeNode('b')] });
		await fireEvent.click(wrapper.getByTestId('canvas-selection-toolbar-group'));

		expect(store.allGroups[1].title).toBe('Group 2');
	});

	it('auto-includes sub-nodes when the selection has a node with sub-nodes', async () => {
		expandSelectionWithSubNodesMock.mockImplementation((nodeIds: string[]) => [
			...nodeIds,
			'memory',
			'tool',
		]);

		const store = useCanvasNodeGroupsStore();
		const wrapper = render({ selectedNodes: [makeNode('a'), makeNode('agent')] });
		await fireEvent.click(wrapper.getByTestId('canvas-selection-toolbar-group'));

		expect(isSelectionGroupableMock).toHaveBeenCalledWith(['a', 'agent', 'memory', 'tool']);
		expect(store.allGroups[0].nodeIds).toEqual(['a', 'agent', 'memory', 'tool']);
	});

	it('hides Group and shows Extract when an expanded sub-node already belongs to another group', () => {
		expandSelectionWithSubNodesMock.mockImplementation((nodeIds: string[]) => [
			...nodeIds,
			'memory',
		]);

		const store = useCanvasNodeGroupsStore();
		store.createGroup(['other', 'memory'], 'Other');

		const wrapper = render({ selectedNodes: [makeNode('a'), makeNode('agent')] });
		expect(wrapper.queryByTestId('canvas-selection-toolbar-group')).toBeNull();
		expect(wrapper.getByTestId('canvas-selection-toolbar-extract')).toBeTruthy();
	});

	it('positions the toolbar centered above the selection rect in world coordinates', () => {
		const nodeWidth = 100;
		const rectX = 100;
		const rectY = 200;
		const rectWidth = 300 - rectX + nodeWidth;
		const toolbarOffsetPx = 12;
		const wrapper = render({
			selectedNodes: [makeNode('a', rectX, rectY), makeNode('b', 300, rectY)],
		});
		const toolbar = wrapper.getByTestId('canvas-selection-toolbar') as HTMLElement;
		const expectedLeft = rectX + rectWidth / 2;
		const expectedTop = rectY - toolbarOffsetPx;
		expect(toolbar.style.transform).toContain(`translate(${expectedLeft}px, ${expectedTop}px)`);
	});
});
