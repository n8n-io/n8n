import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { computed } from 'vue';

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
import {
	createCanvasGraphNode,
	createCanvasGraphGroupNode,
} from '@/features/workflows/canvas/__tests__/utils';

const resolveGroupableNodeIdsMock = vi.fn();

vi.mock('@/app/composables/useSelectionValidation', () => ({
	useSelectionValidation: () => ({
		resolveGroupableNodeIds: resolveGroupableNodeIdsMock,
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

describe('useCanvasNodeGroupActions', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		workflowDocumentStore = useWorkflowDocumentStore(createWorkflowDocumentId('wf-test'));
		// Mirrors the real resolver's contract: member ids when groupable, null otherwise
		resolveGroupableNodeIdsMock
			.mockClear()
			.mockImplementation((ids: string[]) => (ids.length > 0 ? [...ids] : null));
	});

	describe('canGroup', () => {
		it('is false in read-only mode', () => {
			const { canGroup } = useCanvasNodeGroupActions(
				computed(() => [createCanvasGraphNode({ id: 'a' }), createCanvasGraphNode({ id: 'b' })]),
				{
					readOnly: () => true,
				},
			);
			expect(canGroup.value).toBe(false);
		});

		it('is false when the selection is empty', () => {
			const { canGroup } = useCanvasNodeGroupActions(computed(() => []));
			expect(canGroup.value).toBe(false);
		});

		it('is true when the resolver accepts the selection', () => {
			const { canGroup } = useCanvasNodeGroupActions(
				computed(() => [createCanvasGraphNode({ id: 'a' }), createCanvasGraphNode({ id: 'b' })]),
			);
			expect(canGroup.value).toBe(true);
			expect(resolveGroupableNodeIdsMock).toHaveBeenCalledWith(['a', 'b']);
		});

		it('is false when the resolver rejects the selection', () => {
			resolveGroupableNodeIdsMock.mockReturnValue(null);
			const { canGroup } = useCanvasNodeGroupActions(
				computed(() => [createCanvasGraphNode({ id: 'a' }), createCanvasGraphNode({ id: 'b' })]),
			);
			expect(canGroup.value).toBe(false);
		});
	});

	describe('groupNodes', () => {
		it('creates a group from the given ids expanded with sub-nodes, independently of the selection', () => {
			resolveGroupableNodeIdsMock.mockImplementation((ids: string[]) => [...ids, 'memory']);
			const { groupNodes } = useCanvasNodeGroupActions(
				computed(() => [createCanvasGraphNode({ id: 'unrelated-selection' })]),
			);

			const group = groupNodes(['a', 'agent']);

			expect(resolveGroupableNodeIdsMock).toHaveBeenCalledWith(['a', 'agent']);
			expect(group?.nodeIds).toEqual(['a', 'agent', 'memory']);
			expect(workflowDocumentStore.allGroups).toHaveLength(1);
		});

		it('creates the group from exactly the ids the resolver returns', () => {
			// e.g. a stale id in the input is validated away and must not be persisted
			resolveGroupableNodeIdsMock.mockReturnValue(['a']);
			const { groupNodes } = useCanvasNodeGroupActions(computed(() => []));

			const group = groupNodes(['a', 'stale-id']);

			expect(group?.nodeIds).toEqual(['a']);
		});

		it('returns null for an empty id list', () => {
			const { groupNodes } = useCanvasNodeGroupActions(computed(() => []));

			expect(groupNodes([])).toBeNull();
			expect(workflowDocumentStore.allGroups).toHaveLength(0);
		});

		it('returns null in read-only mode', () => {
			const { groupNodes } = useCanvasNodeGroupActions(
				computed(() => []),
				{
					readOnly: () => true,
				},
			);

			expect(groupNodes(['a', 'b'])).toBeNull();
			expect(resolveGroupableNodeIdsMock).not.toHaveBeenCalled();
			expect(workflowDocumentStore.allGroups).toHaveLength(0);
		});

		it('returns null when the resolver rejects the nodes', () => {
			resolveGroupableNodeIdsMock.mockReturnValue(null);
			const { groupNodes } = useCanvasNodeGroupActions(computed(() => []));

			expect(groupNodes(['a', 'b'])).toBeNull();
			expect(workflowDocumentStore.allGroups).toHaveLength(0);
		});

		it('records an AddNodeGroupCommand when a group is created', () => {
			const historyStore = useHistoryStore();
			const { groupNodes } = useCanvasNodeGroupActions(computed(() => []));

			const group = groupNodes(['a', 'b']);

			expect(historyStore.undoStack).toHaveLength(1);
			const command = historyStore.undoStack[0];
			expect(command).toBeInstanceOf(AddNodeGroupCommand);
			expect((command as AddNodeGroupCommand).group).toEqual(group);
		});
	});

	describe('groupSelection', () => {
		it('returns null when the selection is empty', () => {
			const { groupSelection } = useCanvasNodeGroupActions(computed(() => []));

			expect(groupSelection()).toBeNull();
			expect(workflowDocumentStore.allGroups).toHaveLength(0);
		});

		it('creates a group from the expanded selection', () => {
			resolveGroupableNodeIdsMock.mockImplementation((ids: string[]) => [...ids, 'memory']);
			const { groupSelection } = useCanvasNodeGroupActions(
				computed(() => [
					createCanvasGraphNode({ id: 'a' }),
					createCanvasGraphNode({ id: 'agent' }),
				]),
			);
			const group = groupSelection();
			expect(group?.nodeIds).toEqual(['a', 'agent', 'memory']);
			expect(workflowDocumentStore.allGroups).toHaveLength(1);
		});

		it('returns null when the resolver rejects the selection', () => {
			resolveGroupableNodeIdsMock.mockReturnValue(null);
			const { groupSelection } = useCanvasNodeGroupActions(
				computed(() => [createCanvasGraphNode({ id: 'a' })]),
			);
			expect(groupSelection()).toBeNull();
		});
	});

	describe('history tracking', () => {
		it('records an AddNodeGroupCommand when a group is created', () => {
			const historyStore = useHistoryStore();
			const { groupSelection } = useCanvasNodeGroupActions(
				computed(() => [createCanvasGraphNode({ id: 'a' }), createCanvasGraphNode({ id: 'b' })]),
			);

			const group = groupSelection();

			expect(historyStore.undoStack).toHaveLength(1);
			const command = historyStore.undoStack[0];
			expect(command).toBeInstanceOf(AddNodeGroupCommand);
			expect((command as AddNodeGroupCommand).group).toEqual(group);
		});

		it('records nothing when grouping is not allowed', () => {
			resolveGroupableNodeIdsMock.mockReturnValue(null);
			const historyStore = useHistoryStore();
			const { groupSelection } = useCanvasNodeGroupActions(
				computed(() => [createCanvasGraphNode({ id: 'a' })]),
			);

			groupSelection();

			expect(historyStore.undoStack).toHaveLength(0);
		});

		it('records an UpdateNodeGroupCommand with before/after snapshots on rename', () => {
			const group = workflowDocumentStore.createGroup(['a', 'b'], 'Old');
			const historyStore = useHistoryStore();
			const { renameGroup } = useCanvasNodeGroupActions(
				computed(() => [createCanvasGraphNode({ id: 'a' })]),
			);

			renameGroup(group.id, 'New');

			expect(historyStore.undoStack).toHaveLength(1);
			const command = historyStore.undoStack[0] as UpdateNodeGroupCommand;
			expect(command).toBeInstanceOf(UpdateNodeGroupCommand);
			expect(command.before).toEqual({ id: group.id, name: 'Old', nodeIds: ['a', 'b'] });
			expect(command.after).toEqual({ id: group.id, name: 'New', nodeIds: ['a', 'b'] });
		});

		it('does not rename in read-only mode', () => {
			const group = workflowDocumentStore.createGroup(['a', 'b'], 'Old');
			const historyStore = useHistoryStore();
			const { renameGroup } = useCanvasNodeGroupActions(
				computed(() => []),
				{
					readOnly: () => true,
				},
			);

			renameGroup(group.id, 'New');

			expect(workflowDocumentStore.getGroupById(group.id)?.name).toBe('Old');
			expect(historyStore.undoStack).toHaveLength(0);
		});

		it('does not ungroup in read-only mode', () => {
			const group = workflowDocumentStore.createGroup(['a', 'b'], 'X');
			const historyStore = useHistoryStore();
			const { ungroup } = useCanvasNodeGroupActions(
				computed(() => []),
				{
					readOnly: () => true,
				},
			);

			ungroup(group.id);

			expect(workflowDocumentStore.getGroupById(group.id)).toBeDefined();
			expect(historyStore.undoStack).toHaveLength(0);
		});

		it('records nothing when rename does not change the name', () => {
			const group = workflowDocumentStore.createGroup(['a', 'b'], 'Same');
			const historyStore = useHistoryStore();
			const { renameGroup } = useCanvasNodeGroupActions(
				computed(() => [createCanvasGraphNode({ id: 'a' })]),
			);

			renameGroup(group.id, 'Same');

			expect(historyStore.undoStack).toHaveLength(0);
		});

		it('records nothing when renaming an unknown group', () => {
			const historyStore = useHistoryStore();
			const { renameGroup } = useCanvasNodeGroupActions(
				computed(() => [createCanvasGraphNode({ id: 'a' })]),
			);

			renameGroup('missing', 'New');

			expect(historyStore.undoStack).toHaveLength(0);
		});

		it('deletes the group and records a RemoveNodeGroupCommand on ungroup', () => {
			const group = workflowDocumentStore.createGroup(['a', 'b'], 'X');
			const historyStore = useHistoryStore();
			const { ungroup } = useCanvasNodeGroupActions(
				computed(() => [createCanvasGraphNode({ id: 'a' })]),
			);

			ungroup(group.id);

			expect(workflowDocumentStore.getGroupById(group.id)).toBeUndefined();
			expect(historyStore.undoStack).toHaveLength(1);
			const command = historyStore.undoStack[0] as RemoveNodeGroupCommand;
			expect(command).toBeInstanceOf(RemoveNodeGroupCommand);
			expect(command.group).toEqual({ id: group.id, name: 'X', nodeIds: ['a', 'b'] });
		});

		it('records nothing when ungrouping an unknown group', () => {
			const historyStore = useHistoryStore();
			const { ungroup } = useCanvasNodeGroupActions(
				computed(() => [createCanvasGraphNode({ id: 'a' })]),
			);

			ungroup('missing');

			expect(historyStore.undoStack).toHaveLength(0);
		});
	});

	describe('canUngroup', () => {
		it('is true when any selected node belongs to a group', () => {
			workflowDocumentStore.createGroup(['a', 'b'], 'Group');
			const { canUngroup } = useCanvasNodeGroupActions(
				computed(() => [createCanvasGraphNode({ id: 'a' })]),
			);
			expect(canUngroup.value).toBe(true);
		});

		it('is true when a collapsed group node is directly selected', () => {
			const group = workflowDocumentStore.createGroup(['a', 'b'], 'Group');
			const { canUngroup } = useCanvasNodeGroupActions(
				computed(() => [createCanvasGraphGroupNode({ id: group.id })]),
			);
			expect(canUngroup.value).toBe(true);
		});

		it('is false when no selected node belongs to a group', () => {
			const { canUngroup } = useCanvasNodeGroupActions(
				computed(() => [createCanvasGraphNode({ id: 'a' })]),
			);
			expect(canUngroup.value).toBe(false);
		});

		it('is false in read-only mode', () => {
			workflowDocumentStore.createGroup(['a', 'b'], 'Group');
			const { canUngroup } = useCanvasNodeGroupActions(
				computed(() => [createCanvasGraphNode({ id: 'a' })]),
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
				computed(() => [
					createCanvasGraphNode({ id: 'a' }),
					createCanvasGraphNode({ id: 'b' }),
					createCanvasGraphNode({ id: 'c' }),
				]),
			);

			expect(selectedGroupIds.value).toEqual(expect.arrayContaining([groupA.id, groupB.id]));
			expect(selectedGroupIds.value).toHaveLength(2);
		});

		it('resolves the group id from a directly selected collapsed group node', () => {
			const group = workflowDocumentStore.createGroup(['a', 'b'], 'Group');
			const { selectedGroupIds } = useCanvasNodeGroupActions(
				computed(() => [createCanvasGraphGroupNode({ id: group.id })]),
			);
			expect(selectedGroupIds.value).toEqual([group.id]);
		});

		it('is empty when no selected node belongs to a group', () => {
			const { selectedGroupIds } = useCanvasNodeGroupActions(
				computed(() => [createCanvasGraphNode({ id: 'a' })]),
			);
			expect(selectedGroupIds.value).toEqual([]);
		});
	});
});
