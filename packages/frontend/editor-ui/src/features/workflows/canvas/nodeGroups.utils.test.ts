import { describe, it, expect, vi } from 'vitest';
import type { IWorkflowGroup } from 'n8n-workflow';

import { snapshotGroup, deleteGroupWithHistory } from './nodeGroups.utils';
import { RemoveNodeGroupCommand } from '@/app/models/history';
import type { useHistoryStore } from '@/app/stores/history.store';
import type { WorkflowDocumentStore } from '@/app/stores/workflowDocument.store';

function createGroup(overrides: Partial<IWorkflowGroup> = {}): IWorkflowGroup {
	return { id: 'group-1', name: 'Group 1', nodeIds: ['a', 'b'], ...overrides };
}

describe('snapshotGroup', () => {
	it('returns a new object with the same values', () => {
		const group = createGroup();
		const snapshot = snapshotGroup(group);

		expect(snapshot).toEqual(group);
		expect(snapshot).not.toBe(group);
	});

	it('copies nodeIds so later mutations of the source do not leak into the snapshot', () => {
		const group = createGroup({ nodeIds: ['a', 'b'] });
		const snapshot = snapshotGroup(group);

		expect(snapshot.nodeIds).not.toBe(group.nodeIds);

		group.nodeIds.push('c');
		expect(snapshot.nodeIds).toEqual(['a', 'b']);
	});
});

describe('deleteGroupWithHistory', () => {
	function setup() {
		const workflowDocumentStore = {
			deleteGroup: vi.fn(),
		} as unknown as WorkflowDocumentStore;
		const historyStore = {
			pushCommandToUndo: vi.fn(),
		} as unknown as ReturnType<typeof useHistoryStore>;
		return { workflowDocumentStore, historyStore };
	}

	it('deletes the group by id', () => {
		const { workflowDocumentStore, historyStore } = setup();
		const group = createGroup();

		deleteGroupWithHistory(group, workflowDocumentStore, historyStore);

		expect(workflowDocumentStore.deleteGroup).toHaveBeenCalledWith('group-1');
	});

	it('pushes a RemoveNodeGroupCommand carrying the group id and nodeIds', () => {
		const { workflowDocumentStore, historyStore } = setup();
		const group = createGroup({ id: 'group-1', nodeIds: ['a', 'b'] });

		deleteGroupWithHistory(group, workflowDocumentStore, historyStore);

		expect(historyStore.pushCommandToUndo).toHaveBeenCalledTimes(1);
		const command = vi.mocked(historyStore.pushCommandToUndo).mock.calls[0][0];
		expect(command).toBeInstanceOf(RemoveNodeGroupCommand);
		expect((command as RemoveNodeGroupCommand).group.id).toBe('group-1');
		expect((command as RemoveNodeGroupCommand).group.nodeIds).toEqual(['a', 'b']);
	});

	it('snapshots the group so mutating the source after the call does not change the undo command', () => {
		const { workflowDocumentStore, historyStore } = setup();
		const group = createGroup({ nodeIds: ['a', 'b'] });

		deleteGroupWithHistory(group, workflowDocumentStore, historyStore);
		group.nodeIds.push('c');

		const command = vi.mocked(historyStore.pushCommandToUndo).mock
			.calls[0][0] as RemoveNodeGroupCommand;
		expect(command.group.nodeIds).toEqual(['a', 'b']);
	});
});
