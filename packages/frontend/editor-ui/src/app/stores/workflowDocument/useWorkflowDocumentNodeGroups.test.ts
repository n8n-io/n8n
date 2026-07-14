import { describe, expect, it, beforeEach, vi } from 'vitest';

import { useWorkflowDocumentNodeGroups } from './useWorkflowDocumentNodeGroups';

describe('useWorkflowDocumentNodeGroups', () => {
	let nodeGroups: ReturnType<typeof useWorkflowDocumentNodeGroups>;

	beforeEach(() => {
		nodeGroups = useWorkflowDocumentNodeGroups();
	});

	describe('createGroup', () => {
		it('creates a group with the given node ids and name', () => {
			const group = nodeGroups.createGroup(['a', 'b'], 'My group');

			expect(group.nodeIds).toEqual(['a', 'b']);
			expect(group.name).toBe('My group');
			expect(group.id).toBeTruthy();
			expect(nodeGroups.allGroups.value).toHaveLength(1);
		});

		it('assigns a unique id to each group', () => {
			const a = nodeGroups.createGroup(['a', 'b'], 'A');
			const b = nodeGroups.createGroup(['c', 'd'], 'B');
			expect(a.id).not.toBe(b.id);
		});

		it('does not mark state dirty when requested', () => {
			const dirtySpy = vi.fn();
			nodeGroups.onStateDirty(dirtySpy);

			nodeGroups.createGroup(['a', 'b'], 'A', { markDirty: false });

			expect(dirtySpy).not.toHaveBeenCalled();
			expect(nodeGroups.allGroups.value).toHaveLength(1);
		});

		it('carries startCollapsed on the ADD event so the view can skip auto-expand', () => {
			const changeSpy = vi.fn();
			nodeGroups.onNodeGroupsChange(changeSpy);

			const group = nodeGroups.createGroup(['a', 'b'], 'A', { startCollapsed: true });

			expect(changeSpy).toHaveBeenCalledWith({
				action: 'add',
				payload: { group, startCollapsed: true },
			});
		});
	});

	describe('getNextDefaultName', () => {
		it('starts at 1 for the first group', () => {
			expect(nodeGroups.getNextDefaultName('Group')).toBe('Group 1');
		});

		it('uses the next available numbered name', () => {
			nodeGroups.setNodeGroups([
				{ id: 'g1', name: 'Group 1', nodeIds: ['a', 'b'] },
				{ id: 'g2', name: 'Group 2', nodeIds: ['c', 'd'] },
			]);

			expect(nodeGroups.getNextDefaultName('Group')).toBe('Group 3');
		});

		it('increments a trailing number in the base name', () => {
			nodeGroups.setNodeGroups([
				{ id: 'g1', name: 'Q2', nodeIds: ['a', 'b'] },
				{ id: 'g2', name: 'Q3', nodeIds: ['c', 'd'] },
			]);

			expect(nodeGroups.getNextDefaultName('Q2')).toBe('Q4');
		});

		it('uses the first available number after the trailing base number', () => {
			nodeGroups.setNodeGroups([
				{ id: 'g1', name: 'Release 2026', nodeIds: ['a', 'b'] },
				{ id: 'g2', name: 'Release 2028', nodeIds: ['c', 'd'] },
			]);

			expect(nodeGroups.getNextDefaultName('Release 2026')).toBe('Release 2027');
		});
	});

	describe('updateName', () => {
		it('updates the name of an existing group', () => {
			const group = nodeGroups.createGroup(['a', 'b'], 'Old');
			nodeGroups.updateName(group.id, 'New');
			expect(nodeGroups.getGroupById(group.id)?.name).toBe('New');
		});

		it('does nothing for an unknown group id', () => {
			expect(() => nodeGroups.updateName('missing', 'X')).not.toThrow();
		});
	});

	describe('updateDescription', () => {
		it('sets the description of an existing group', () => {
			const group = nodeGroups.createGroup(['a', 'b'], 'G');
			nodeGroups.updateDescription(group.id, 'What this group does');
			expect(nodeGroups.getGroupById(group.id)?.description).toBe('What this group does');
		});

		it('clears the description when given an empty string', () => {
			const group = nodeGroups.createGroup(['a', 'b'], 'G');
			nodeGroups.updateDescription(group.id, 'Something');
			nodeGroups.updateDescription(group.id, '');
			expect(nodeGroups.getGroupById(group.id)?.description).toBeUndefined();
		});

		it('does not fire a change event when the description is unchanged', () => {
			const group = nodeGroups.createGroup(['a', 'b'], 'G');
			nodeGroups.updateDescription(group.id, 'Same');
			const changeSpy = vi.fn();
			nodeGroups.onNodeGroupsChange(changeSpy);
			nodeGroups.updateDescription(group.id, 'Same');
			expect(changeSpy).not.toHaveBeenCalled();
		});

		it('does nothing for an unknown group id', () => {
			expect(() => nodeGroups.updateDescription('missing', 'X')).not.toThrow();
		});
	});

	describe('deleteGroup', () => {
		it('removes the group', () => {
			const group = nodeGroups.createGroup(['a', 'b'], 'X');
			nodeGroups.deleteGroup(group.id);
			expect(nodeGroups.allGroups.value).toHaveLength(0);
		});
	});

	describe('restoreGroup', () => {
		it('recreates a previously deleted group with the same id', () => {
			const group = nodeGroups.createGroup(['a', 'b'], 'X');
			nodeGroups.deleteGroup(group.id);

			nodeGroups.restoreGroup(group);

			expect(nodeGroups.getGroupById(group.id)).toEqual(group);
			expect(nodeGroups.allGroups.value).toHaveLength(1);
		});

		it('overwrites the full state of an existing group', () => {
			const group = nodeGroups.createGroup(['a', 'b', 'c'], 'X');

			nodeGroups.restoreGroup({ id: group.id, name: 'Restored', nodeIds: ['a'] });

			expect(nodeGroups.getGroupById(group.id)).toEqual({
				id: group.id,
				name: 'Restored',
				nodeIds: ['a'],
			});
		});

		it('emits an ADD event when the group does not exist yet', () => {
			const changeSpy = vi.fn();
			nodeGroups.onNodeGroupsChange(changeSpy);

			nodeGroups.restoreGroup({ id: 'g1', name: 'X', nodeIds: ['a'] });

			expect(changeSpy).toHaveBeenCalledWith({
				action: 'add',
				payload: { group: { id: 'g1', name: 'X', nodeIds: ['a'] }, startCollapsed: undefined },
			});
		});

		it('emits an UPDATE event when the group already exists', () => {
			const group = nodeGroups.createGroup(['a', 'b'], 'X');
			const changeSpy = vi.fn();
			nodeGroups.onNodeGroupsChange(changeSpy);

			nodeGroups.restoreGroup({ id: group.id, name: 'X', nodeIds: ['a'] });

			expect(changeSpy).toHaveBeenCalledWith({
				action: 'update',
				payload: { group: { id: group.id, name: 'X', nodeIds: ['a'] } },
			});
		});

		it('clones nodeIds so later mutations of the input do not leak in', () => {
			const restored = { id: 'g1', name: 'X', nodeIds: ['a', 'b'] };
			nodeGroups.restoreGroup(restored);

			restored.nodeIds.push('c');

			expect(nodeGroups.getGroupById('g1')?.nodeIds).toEqual(['a', 'b']);
		});
	});

	describe('addNodesToGroup', () => {
		it('appends new node ids to an existing group', () => {
			const group = nodeGroups.createGroup(['a', 'b'], 'X');
			nodeGroups.addNodesToGroup(group.id, ['c']);
			expect(nodeGroups.getGroupById(group.id)?.nodeIds).toEqual(['a', 'b', 'c']);
		});

		it('ignores node ids that already belong to the group', () => {
			const group = nodeGroups.createGroup(['a', 'b'], 'X');
			nodeGroups.addNodesToGroup(group.id, ['b', 'c']);
			expect(nodeGroups.getGroupById(group.id)?.nodeIds).toEqual(['a', 'b', 'c']);
		});

		it('does nothing for an unknown group id', () => {
			expect(() => nodeGroups.addNodesToGroup('missing', ['a'])).not.toThrow();
		});

		it('updates getGroupForNode for the new members', () => {
			const group = nodeGroups.createGroup(['a', 'b'], 'X');
			nodeGroups.addNodesToGroup(group.id, ['c']);
			expect(nodeGroups.getGroupForNode('c')).toEqual({ ...group, nodeIds: ['a', 'b', 'c'] });
		});
	});

	describe('getGroupForNode', () => {
		it('returns the group containing the given node id', () => {
			const group = nodeGroups.createGroup(['a', 'b'], 'X');
			expect(nodeGroups.getGroupForNode('a')).toEqual(group);
			expect(nodeGroups.getGroupForNode('b')).toEqual(group);
		});

		it('returns undefined when the node is not in any group', () => {
			nodeGroups.createGroup(['a', 'b'], 'X');
			expect(nodeGroups.getGroupForNode('z')).toBeUndefined();
		});
	});

	describe('replaceNodeInGroup', () => {
		it('replaces an existing member while preserving order', () => {
			const group = nodeGroups.createGroup(['a', 'b', 'c'], 'X');

			nodeGroups.replaceNodeInGroup(group.id, 'b', 'replacement');

			expect(nodeGroups.getGroupById(group.id)?.nodeIds).toEqual(['a', 'replacement', 'c']);
		});

		it('dedupes when the replacement is already in the group', () => {
			const group = nodeGroups.createGroup(['a', 'b', 'c'], 'X');

			nodeGroups.replaceNodeInGroup(group.id, 'b', 'c');

			expect(nodeGroups.getGroupById(group.id)?.nodeIds).toEqual(['a', 'c']);
		});

		it('does nothing for an unknown group id', () => {
			expect(() => nodeGroups.replaceNodeInGroup('missing', 'a', 'b')).not.toThrow();
		});

		it('does nothing when the previous node is not a group member', () => {
			const group = nodeGroups.createGroup(['a', 'b'], 'X');

			nodeGroups.replaceNodeInGroup(group.id, 'c', 'd');

			expect(nodeGroups.getGroupById(group.id)?.nodeIds).toEqual(['a', 'b']);
		});
	});

	describe('removeNodeFromGroups', () => {
		it('removes a node from a group that contains it', () => {
			const group = nodeGroups.createGroup(['a', 'b', 'c'], 'X');
			nodeGroups.removeNodeFromGroups('c');
			expect(nodeGroups.getGroupById(group.id)?.nodeIds).toEqual(['a', 'b']);
		});

		it('keeps a single-node group when one of two members is removed', () => {
			const group = nodeGroups.createGroup(['a', 'b'], 'X');
			nodeGroups.removeNodeFromGroups('b');
			expect(nodeGroups.getGroupById(group.id)?.nodeIds).toEqual(['a']);
		});

		it('deletes a group when its last member is removed', () => {
			const group = nodeGroups.createGroup(['a'], 'X');
			nodeGroups.removeNodeFromGroups('a');
			expect(nodeGroups.getGroupById(group.id)).toBeUndefined();
		});

		it('removes the node from every group it belongs to', () => {
			const groupA = nodeGroups.createGroup(['a', 'b'], 'A');
			const groupB = nodeGroups.createGroup(['a', 'c'], 'B');
			nodeGroups.removeNodeFromGroups('a');
			expect(nodeGroups.getGroupById(groupA.id)?.nodeIds).toEqual(['b']);
			expect(nodeGroups.getGroupById(groupB.id)?.nodeIds).toEqual(['c']);
		});

		it('does nothing when the node is not in any group', () => {
			const group = nodeGroups.createGroup(['a', 'b'], 'X');
			nodeGroups.removeNodeFromGroups('extra');
			expect(nodeGroups.getGroupById(group.id)?.nodeIds).toEqual(['a', 'b']);
		});
	});

	describe('setNodeGroups', () => {
		it('stores groups as provided', () => {
			const groups = [
				{ id: 'g1', name: 'Multi', nodeIds: ['a', 'b'] },
				{ id: 'g2', name: 'Single', nodeIds: ['c'] },
			];

			nodeGroups.setNodeGroups(groups);

			expect(nodeGroups.allGroups.value).toEqual(groups);
		});
	});

	describe('clearNodeGroups', () => {
		it('removes all groups', () => {
			nodeGroups.createGroup(['a', 'b'], 'X');
			nodeGroups.createGroup(['c', 'd'], 'Y');
			nodeGroups.clearNodeGroups();
			expect(nodeGroups.allGroups.value).toHaveLength(0);
		});
	});
});
