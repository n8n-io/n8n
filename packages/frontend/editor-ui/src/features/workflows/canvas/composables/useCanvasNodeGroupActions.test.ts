import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { computed } from 'vue';
import type { GraphNode } from '@vue-flow/core';

import { useCanvasNodeGroupActions } from './useCanvasNodeGroupActions';
import {
	useWorkflowDocumentStore,
	createWorkflowDocumentId,
} from '@/app/stores/workflowDocument.store';

const isSelectionGroupableMock = vi.fn();
const expandSelectionWithSubNodesMock = vi.fn((nodeIds: string[]) => nodeIds);

vi.mock('@/app/composables/useSelectionValidation', () => ({
	useSelectionValidation: () => ({
		isSelectionGroupable: isSelectionGroupableMock,
		expandSelectionWithSubNodes: expandSelectionWithSubNodesMock,
	}),
}));

let workflowDocumentStore: ReturnType<typeof useWorkflowDocumentStore>;

vi.mock('@/app/stores/workflowDocument.store', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@/app/stores/workflowDocument.store')>();
	return {
		...actual,
		injectWorkflowDocumentStore: () => computed(() => workflowDocumentStore),
	};
});

function makeNode(id: string): GraphNode {
	return { id, position: { x: 0, y: 0 } } as unknown as GraphNode;
}

describe('useCanvasNodeGroupActions', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		workflowDocumentStore = useWorkflowDocumentStore(createWorkflowDocumentId('wf-test'));
		isSelectionGroupableMock.mockReturnValue({
			valid: true,
			subGraphData: { start: 'A', end: 'B' },
		});
		expandSelectionWithSubNodesMock.mockImplementation((ids: string[]) => ids);
	});

	describe('canGroup', () => {
		it('is false in read-only mode', () => {
			const { canGroup } = useCanvasNodeGroupActions(
				computed(() => [makeNode('a'), makeNode('b')]),
				{
					readOnly: () => true,
				},
			);
			expect(canGroup.value).toBe(false);
		});

		it('is true when validation succeeds and no node is grouped', () => {
			const { canGroup } = useCanvasNodeGroupActions(
				computed(() => [makeNode('a'), makeNode('b')]),
			);
			expect(canGroup.value).toBe(true);
		});

		it('is false when validation rejects the selection because a node is already grouped', () => {
			isSelectionGroupableMock.mockReturnValue({
				valid: false,
				reason: 'node-already-grouped',
				nodeIds: ['a'],
			});
			const { canGroup } = useCanvasNodeGroupActions(
				computed(() => [makeNode('a'), makeNode('b')]),
			);
			expect(canGroup.value).toBe(false);
		});

		it('is false when validation rejects the selection', () => {
			isSelectionGroupableMock.mockReturnValue({ valid: false, reason: 'invalid-subgraph' });
			const { canGroup } = useCanvasNodeGroupActions(
				computed(() => [makeNode('a'), makeNode('b')]),
			);
			expect(canGroup.value).toBe(false);
		});
	});

	describe('groupSelection', () => {
		it('creates a group from the expanded selection', () => {
			expandSelectionWithSubNodesMock.mockImplementation((ids: string[]) => [...ids, 'memory']);
			const { groupSelection } = useCanvasNodeGroupActions(
				computed(() => [makeNode('a'), makeNode('agent')]),
			);
			const group = groupSelection();
			expect(group?.nodeIds).toEqual(['a', 'agent', 'memory']);
			expect(workflowDocumentStore.allGroups).toHaveLength(1);
		});

		it('returns null when canGroup is false', () => {
			isSelectionGroupableMock.mockReturnValue({ valid: false, reason: 'too-few-nodes' });
			const { groupSelection } = useCanvasNodeGroupActions(computed(() => [makeNode('a')]));
			expect(groupSelection()).toBeNull();
		});
	});

	describe('canUngroup', () => {
		it('is true when any selected node belongs to a group', () => {
			workflowDocumentStore.createGroup(['a', 'b'], 'Group');
			const { canUngroup } = useCanvasNodeGroupActions(computed(() => [makeNode('a')]));
			expect(canUngroup.value).toBe(true);
		});

		it('is false when no selected node belongs to a group', () => {
			const { canUngroup } = useCanvasNodeGroupActions(computed(() => [makeNode('a')]));
			expect(canUngroup.value).toBe(false);
		});

		it('is false in read-only mode', () => {
			workflowDocumentStore.createGroup(['a', 'b'], 'Group');
			const { canUngroup } = useCanvasNodeGroupActions(
				computed(() => [makeNode('a')]),
				{
					readOnly: () => true,
				},
			);
			expect(canUngroup.value).toBe(false);
		});
	});

	describe('ungroupSelection', () => {
		it('deletes all groups containing any selected node', () => {
			const groupA = workflowDocumentStore.createGroup(['a', 'b'], 'Group A');
			const groupB = workflowDocumentStore.createGroup(['c', 'd'], 'Group B');
			workflowDocumentStore.createGroup(['e', 'f'], 'Group C');

			const { ungroupSelection } = useCanvasNodeGroupActions(
				computed(() => [makeNode('a'), makeNode('c')]),
			);
			const deletedIds = ungroupSelection();

			expect(deletedIds).toEqual(expect.arrayContaining([groupA.id, groupB.id]));
			expect(workflowDocumentStore.allGroups).toHaveLength(1);
			expect(workflowDocumentStore.allGroups[0].name).toBe('Group C');
		});

		it('returns an empty array when no selected node belongs to a group', () => {
			const { ungroupSelection } = useCanvasNodeGroupActions(computed(() => [makeNode('a')]));
			expect(ungroupSelection()).toEqual([]);
		});
	});
});
