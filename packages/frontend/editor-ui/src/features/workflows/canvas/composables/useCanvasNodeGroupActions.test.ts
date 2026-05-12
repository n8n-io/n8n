import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { ref } from 'vue';
import type { GraphNode } from '@vue-flow/core';

import { useCanvasNodeGroupActions } from './useCanvasNodeGroupActions';
import { useCanvasNodeGroupsStore } from '../stores/canvasNodeGroups.store';

const isSelectionGroupableMock = vi.fn();
const expandSelectionWithSubNodesMock = vi.fn((nodeIds: string[]) => nodeIds);

vi.mock('@/app/composables/useSelectionValidation', () => ({
	useSelectionValidation: () => ({
		isSelectionGroupable: isSelectionGroupableMock,
		expandSelectionWithSubNodes: expandSelectionWithSubNodesMock,
	}),
}));

function makeNode(id: string): GraphNode {
	return { id, position: { x: 0, y: 0 } } as unknown as GraphNode;
}

describe('useCanvasNodeGroupActions', () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia({ stubActions: false }));
		isSelectionGroupableMock.mockReturnValue({
			valid: true,
			subGraphData: { start: 'A', end: 'B' },
		});
		expandSelectionWithSubNodesMock.mockImplementation((ids: string[]) => ids);
	});

	describe('canGroup', () => {
		it('is false in read-only mode', () => {
			const { canGroup } = useCanvasNodeGroupActions(ref([makeNode('a'), makeNode('b')]), {
				readOnly: () => true,
			});
			expect(canGroup.value).toBe(false);
		});

		it('is true when validation succeeds and no node is grouped', () => {
			const { canGroup } = useCanvasNodeGroupActions(ref([makeNode('a'), makeNode('b')]));
			expect(canGroup.value).toBe(true);
		});

		it('is false when any node in the expanded selection is already grouped', () => {
			const store = useCanvasNodeGroupsStore();
			store.createGroup(['a', 'c'], 'Group');
			const { canGroup } = useCanvasNodeGroupActions(ref([makeNode('a'), makeNode('b')]));
			expect(canGroup.value).toBe(false);
		});

		it('is false when validation rejects the selection', () => {
			isSelectionGroupableMock.mockReturnValue({ valid: false, reason: 'invalid-subgraph' });
			const { canGroup } = useCanvasNodeGroupActions(ref([makeNode('a'), makeNode('b')]));
			expect(canGroup.value).toBe(false);
		});
	});

	describe('groupSelection', () => {
		it('creates a group from the expanded selection', () => {
			expandSelectionWithSubNodesMock.mockImplementation((ids: string[]) => [...ids, 'memory']);
			const store = useCanvasNodeGroupsStore();
			const { groupSelection } = useCanvasNodeGroupActions(ref([makeNode('a'), makeNode('agent')]));
			const group = groupSelection();
			expect(group?.nodeIds).toEqual(['a', 'agent', 'memory']);
			expect(store.allGroups).toHaveLength(1);
		});

		it('returns null when canGroup is false', () => {
			isSelectionGroupableMock.mockReturnValue({ valid: false, reason: 'too-few-nodes' });
			const { groupSelection } = useCanvasNodeGroupActions(ref([makeNode('a')]));
			expect(groupSelection()).toBeNull();
		});
	});

	describe('canUngroup', () => {
		it('is true when any selected node belongs to a group', () => {
			const store = useCanvasNodeGroupsStore();
			store.createGroup(['a', 'b'], 'Group');
			const { canUngroup } = useCanvasNodeGroupActions(ref([makeNode('a')]));
			expect(canUngroup.value).toBe(true);
		});

		it('is false when no selected node belongs to a group', () => {
			const { canUngroup } = useCanvasNodeGroupActions(ref([makeNode('a')]));
			expect(canUngroup.value).toBe(false);
		});

		it('is false in read-only mode', () => {
			const store = useCanvasNodeGroupsStore();
			store.createGroup(['a', 'b'], 'Group');
			const { canUngroup } = useCanvasNodeGroupActions(ref([makeNode('a')]), {
				readOnly: () => true,
			});
			expect(canUngroup.value).toBe(false);
		});
	});

	describe('ungroupSelection', () => {
		it('deletes all groups containing any selected node', () => {
			const store = useCanvasNodeGroupsStore();
			const groupA = store.createGroup(['a', 'b'], 'Group A');
			const groupB = store.createGroup(['c', 'd'], 'Group B');
			store.createGroup(['e', 'f'], 'Group C');

			const { ungroupSelection } = useCanvasNodeGroupActions(ref([makeNode('a'), makeNode('c')]));
			const deletedIds = ungroupSelection();

			expect(deletedIds).toEqual(expect.arrayContaining([groupA.id, groupB.id]));
			expect(store.allGroups).toHaveLength(1);
			expect(store.allGroups[0].title).toBe('Group C');
		});

		it('returns an empty array when no selected node belongs to a group', () => {
			const { ungroupSelection } = useCanvasNodeGroupActions(ref([makeNode('a')]));
			expect(ungroupSelection()).toEqual([]);
		});
	});
});
