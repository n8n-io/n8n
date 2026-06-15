import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { computed } from 'vue';
import type { GraphNode } from '@vue-flow/core';

import { useCanvasNodeGroupActions } from './useCanvasNodeGroupActions';
import {
	useWorkflowDocumentStore,
	createWorkflowDocumentId,
} from '@/app/stores/workflowDocument.store';
import { useHistoryStore } from '@/app/stores/history.store';
import {
	AddNodeGroupCommand,
	RemoveNodeGroupCommand,
	UpdateNodeGroupCommand,
} from '@/app/models/history';

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
			isSelectionGroupableMock.mockReturnValue({ valid: false, reason: 'invalid-subgraph' });
			const { groupSelection } = useCanvasNodeGroupActions(computed(() => [makeNode('a')]));
			expect(groupSelection()).toBeNull();
		});
	});

	describe('history tracking', () => {
		it('records an AddNodeGroupCommand when a group is created', () => {
			const historyStore = useHistoryStore();
			const { groupSelection } = useCanvasNodeGroupActions(
				computed(() => [makeNode('a'), makeNode('b')]),
			);

			const group = groupSelection();

			expect(historyStore.undoStack).toHaveLength(1);
			const command = historyStore.undoStack[0];
			expect(command).toBeInstanceOf(AddNodeGroupCommand);
			expect((command as AddNodeGroupCommand).group).toEqual(group);
		});

		it('records nothing when grouping is not allowed', () => {
			isSelectionGroupableMock.mockReturnValue({ valid: false, reason: 'invalid-subgraph' });
			const historyStore = useHistoryStore();
			const { groupSelection } = useCanvasNodeGroupActions(computed(() => [makeNode('a')]));

			groupSelection();

			expect(historyStore.undoStack).toHaveLength(0);
		});

		it('records an UpdateNodeGroupCommand with before/after snapshots on rename', () => {
			const group = workflowDocumentStore.createGroup(['a', 'b'], 'Old');
			const historyStore = useHistoryStore();
			const { renameGroup } = useCanvasNodeGroupActions(computed(() => [makeNode('a')]));

			renameGroup(group.id, 'New');

			expect(historyStore.undoStack).toHaveLength(1);
			const command = historyStore.undoStack[0] as UpdateNodeGroupCommand;
			expect(command).toBeInstanceOf(UpdateNodeGroupCommand);
			expect(command.before).toEqual({ id: group.id, name: 'Old', nodeIds: ['a', 'b'] });
			expect(command.after).toEqual({ id: group.id, name: 'New', nodeIds: ['a', 'b'] });
		});

		it('records nothing when rename does not change the name', () => {
			const group = workflowDocumentStore.createGroup(['a', 'b'], 'Same');
			const historyStore = useHistoryStore();
			const { renameGroup } = useCanvasNodeGroupActions(computed(() => [makeNode('a')]));

			renameGroup(group.id, 'Same');

			expect(historyStore.undoStack).toHaveLength(0);
		});

		it('records nothing when renaming an unknown group', () => {
			const historyStore = useHistoryStore();
			const { renameGroup } = useCanvasNodeGroupActions(computed(() => [makeNode('a')]));

			renameGroup('missing', 'New');

			expect(historyStore.undoStack).toHaveLength(0);
		});

		it('deletes the group and records a RemoveNodeGroupCommand on ungroup', () => {
			const group = workflowDocumentStore.createGroup(['a', 'b'], 'X');
			const historyStore = useHistoryStore();
			const { ungroup } = useCanvasNodeGroupActions(computed(() => [makeNode('a')]));

			ungroup(group.id);

			expect(workflowDocumentStore.getGroupById(group.id)).toBeUndefined();
			expect(historyStore.undoStack).toHaveLength(1);
			const command = historyStore.undoStack[0] as RemoveNodeGroupCommand;
			expect(command).toBeInstanceOf(RemoveNodeGroupCommand);
			expect(command.group).toEqual({ id: group.id, name: 'X', nodeIds: ['a', 'b'] });
		});

		it('records nothing when ungrouping an unknown group', () => {
			const historyStore = useHistoryStore();
			const { ungroup } = useCanvasNodeGroupActions(computed(() => [makeNode('a')]));

			ungroup('missing');

			expect(historyStore.undoStack).toHaveLength(0);
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

	describe('selectedGroupIds', () => {
		it('lists each group containing any selected node once', () => {
			const groupA = workflowDocumentStore.createGroup(['a', 'b'], 'Group A');
			const groupB = workflowDocumentStore.createGroup(['c', 'd'], 'Group B');
			workflowDocumentStore.createGroup(['e', 'f'], 'Group C');

			const { selectedGroupIds } = useCanvasNodeGroupActions(
				computed(() => [makeNode('a'), makeNode('b'), makeNode('c')]),
			);

			expect(selectedGroupIds.value).toEqual(expect.arrayContaining([groupA.id, groupB.id]));
			expect(selectedGroupIds.value).toHaveLength(2);
		});

		it('is empty when no selected node belongs to a group', () => {
			const { selectedGroupIds } = useCanvasNodeGroupActions(computed(() => [makeNode('a')]));
			expect(selectedGroupIds.value).toEqual([]);
		});
	});
});
