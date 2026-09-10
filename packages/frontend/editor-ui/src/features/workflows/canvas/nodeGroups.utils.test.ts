import { describe, it, expect, vi } from 'vitest';
import { NodeConnectionTypes, type IWorkflowGroup } from 'n8n-workflow';
import type { Connection } from '@vue-flow/core';

import {
	snapshotGroup,
	deleteGroupWithHistory,
	mutateEmptyGroupVisualLink,
} from './nodeGroups.utils';
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

describe('mutateEmptyGroupVisualLink', () => {
	const emptyGroup: IWorkflowGroup = {
		id: 'empty',
		name: 'Empty',
		nodeIds: [],
		frame: { position: [100, 100], size: [240, 160] },
		visualLinks: [],
	};

	function connection(overrides: Partial<Connection> = {}): Connection {
		return {
			source: 'node-a',
			sourceHandle: 'outputs/main/1',
			target: 'group:empty',
			targetHandle: 'inputs/main/0',
			...overrides,
		};
	}

	it('adds a node-to-empty-group link to the owning group', () => {
		const result = mutateEmptyGroupVisualLink([emptyGroup], connection(), 'add');

		expect(result).toEqual({
			handled: true,
			nextNodeGroups: [
				{
					...emptyGroup,
					visualLinks: [
						{
							source: {
								kind: 'node',
								id: 'node-a',
								port: { type: NodeConnectionTypes.Main, index: 1 },
							},
							target: {
								kind: 'group',
								id: 'empty',
								port: { type: NodeConnectionTypes.Main, index: 0 },
							},
						},
					],
				},
			],
		});
	});

	it('removes the matching empty-group-to-node link', () => {
		const group: IWorkflowGroup = {
			...emptyGroup,
			visualLinks: [
				{
					source: {
						kind: 'group',
						id: 'empty',
						port: { type: NodeConnectionTypes.Main, index: 0 },
					},
					target: {
						kind: 'node',
						id: 'node-b',
						port: { type: NodeConnectionTypes.Main, index: 2 },
					},
				},
			],
		};
		const result = mutateEmptyGroupVisualLink(
			[group],
			connection({
				source: 'group:empty',
				sourceHandle: 'outputs/main/0',
				target: 'node-b',
				targetHandle: 'inputs/main/2',
			}),
			'remove',
		);

		expect(result).toMatchObject({
			handled: true,
			nextNodeGroups: [{ id: 'empty', visualLinks: [] }],
		});
	});

	it('leaves an ordinary node connection on the existing mutation path', () => {
		const result = mutateEmptyGroupVisualLink(
			[emptyGroup],
			connection({ target: 'node-b' }),
			'add',
		);

		expect(result).toEqual({ handled: false });
	});

	it('leaves a collapsed non-empty group edge on the existing canonical path', () => {
		const nonEmptyGroup: IWorkflowGroup = { id: 'members', name: 'Members', nodeIds: ['node-b'] };
		const result = mutateEmptyGroupVisualLink(
			[nonEmptyGroup],
			connection({ target: 'group:members', targetHandle: 'left' }),
			'remove',
		);

		expect(result).toEqual({ handled: false });
	});
});
