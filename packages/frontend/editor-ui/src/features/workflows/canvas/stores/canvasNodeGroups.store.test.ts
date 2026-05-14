import { createPinia, setActivePinia } from 'pinia';
import { describe, expect, it, beforeEach } from 'vitest';

import { useCanvasNodeGroupsStore } from './canvasNodeGroups.store';

describe('canvasNodeGroups.store', () => {
	let store: ReturnType<typeof useCanvasNodeGroupsStore>;

	beforeEach(() => {
		setActivePinia(createPinia());
		store = useCanvasNodeGroupsStore();
	});

	describe('createGroup', () => {
		it('creates a group with the given node ids and title', () => {
			const group = store.createGroup(['a', 'b'], 'My group');

			expect(group.nodeIds).toEqual(['a', 'b']);
			expect(group.title).toBe('My group');
			expect(group.id).toBeTruthy();
			expect(store.allGroups).toHaveLength(1);
		});

		it('assigns a unique id to each group', () => {
			const a = store.createGroup(['a', 'b'], 'A');
			const b = store.createGroup(['c', 'd'], 'B');
			expect(a.id).not.toBe(b.id);
		});
	});

	describe('getNextDefaultTitle', () => {
		it('starts at 1 for the first group', () => {
			expect(store.getNextDefaultTitle('Group')).toBe('Group 1');
		});

		it('uses the next available numbered title', () => {
			store.createGroup(['a', 'b'], 'Group 1');
			store.createGroup(['c', 'd'], 'Group 2');

			expect(store.getNextDefaultTitle('Group')).toBe('Group 3');
		});
	});

	describe('updateTitle', () => {
		it('updates the title of an existing group', () => {
			const group = store.createGroup(['a', 'b'], 'Old');
			store.updateTitle(group.id, 'New');
			expect(store.getGroupById(group.id)?.title).toBe('New');
		});

		it('does nothing for an unknown group id', () => {
			expect(() => store.updateTitle('missing', 'X')).not.toThrow();
		});
	});

	describe('deleteGroup', () => {
		it('removes the group', () => {
			const group = store.createGroup(['a', 'b'], 'X');
			store.deleteGroup(group.id);
			expect(store.allGroups).toHaveLength(0);
		});
	});

	describe('addNodesToGroup', () => {
		it('appends new node ids to an existing group', () => {
			const group = store.createGroup(['a', 'b'], 'X');
			store.addNodesToGroup(group.id, ['c']);
			expect(store.getGroupById(group.id)?.nodeIds).toEqual(['a', 'b', 'c']);
		});

		it('ignores node ids that already belong to the group', () => {
			const group = store.createGroup(['a', 'b'], 'X');
			store.addNodesToGroup(group.id, ['b', 'c']);
			expect(store.getGroupById(group.id)?.nodeIds).toEqual(['a', 'b', 'c']);
		});

		it('does nothing for an unknown group id', () => {
			expect(() => store.addNodesToGroup('missing', ['a'])).not.toThrow();
		});

		it('updates getGroupForNode for the new members', () => {
			const group = store.createGroup(['a', 'b'], 'X');
			store.addNodesToGroup(group.id, ['c']);
			expect(store.getGroupForNode('c')).toEqual({ ...group, nodeIds: ['a', 'b', 'c'] });
		});
	});

	describe('getGroupForNode', () => {
		it('returns the group containing the given node id', () => {
			const group = store.createGroup(['a', 'b'], 'X');
			expect(store.getGroupForNode('a')).toEqual(group);
			expect(store.getGroupForNode('b')).toEqual(group);
		});

		it('returns undefined when the node is not in any group', () => {
			store.createGroup(['a', 'b'], 'X');
			expect(store.getGroupForNode('z')).toBeUndefined();
		});
	});

	describe('replaceNodeInGroup', () => {
		it('replaces an existing member while preserving order', () => {
			const group = store.createGroup(['a', 'b', 'c'], 'X');

			store.replaceNodeInGroup(group.id, 'b', 'replacement');

			expect(store.getGroupById(group.id)?.nodeIds).toEqual(['a', 'replacement', 'c']);
		});

		it('dedupes when the replacement is already in the group', () => {
			const group = store.createGroup(['a', 'b', 'c'], 'X');

			store.replaceNodeInGroup(group.id, 'b', 'c');

			expect(store.getGroupById(group.id)?.nodeIds).toEqual(['a', 'c']);
		});

		it('does nothing for an unknown group id', () => {
			expect(() => store.replaceNodeInGroup('missing', 'a', 'b')).not.toThrow();
		});

		it('does nothing when the previous node is not a group member', () => {
			const group = store.createGroup(['a', 'b'], 'X');

			store.replaceNodeInGroup(group.id, 'c', 'd');

			expect(store.getGroupById(group.id)?.nodeIds).toEqual(['a', 'b']);
		});
	});

	describe('pruneNodes', () => {
		it('removes deleted node ids from each group', () => {
			const group = store.createGroup(['a', 'b', 'c'], 'X');
			store.pruneNodes(new Set(['a', 'b']));
			expect(store.getGroupById(group.id)?.nodeIds).toEqual(['a', 'b']);
		});

		it('deletes a group whose membership drops below 2', () => {
			const group = store.createGroup(['a', 'b'], 'X');
			store.pruneNodes(new Set(['a']));
			expect(store.getGroupById(group.id)).toBeUndefined();
		});

		it('keeps groups whose remaining members still satisfy the minimum size', () => {
			const group = store.createGroup(['a', 'b', 'c'], 'X');
			store.pruneNodes(new Set(['a', 'c']));
			expect(store.getGroupById(group.id)?.nodeIds).toEqual(['a', 'c']);
		});

		it('does nothing when no member nodes were removed', () => {
			const group = store.createGroup(['a', 'b'], 'X');
			store.pruneNodes(new Set(['a', 'b', 'extra']));
			expect(store.getGroupById(group.id)?.nodeIds).toEqual(['a', 'b']);
		});
	});

	describe('clear', () => {
		it('removes all groups', () => {
			store.createGroup(['a', 'b'], 'X');
			store.createGroup(['c', 'd'], 'Y');
			store.clear();
			expect(store.allGroups).toHaveLength(0);
		});
	});
});
