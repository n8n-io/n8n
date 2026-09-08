import { createTestingPinia } from '@pinia/testing';
import { GROUP_NODE_TYPE, NodeConnectionTypes } from 'n8n-workflow';
import type { IConnections } from 'n8n-workflow';
import { setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { computed, shallowRef } from 'vue';

import type { INodeUi } from '@/Interface';
import { SetNodeParentCommand } from '@/app/models/history';

/**
 * A minimal stand-in for the workflow document store: the node list plus the
 * few edits a group needs. Keeping it in the test makes each expectation read
 * against the real node array, which is where `parentId` lives.
 */
const nodes = shallowRef<INodeUi[]>([]);
const connections = shallowRef<IConnections>({});

const store = {
	get allNodes() {
		return nodes.value;
	},
	get connectionsBySourceNode() {
		return connections.value;
	},
	getNodeById: (id: string) => nodes.value.find((node) => node.id === id),
	updateNodeById: (id: string, data: Partial<INodeUi>) => {
		const index = nodes.value.findIndex((node) => node.id === id);
		if (index === -1) return false;
		nodes.value = nodes.value.map((node, at) => (at === index ? { ...node, ...data } : node));
		return true;
	},
	removeNodeById: (id: string) => {
		nodes.value = nodes.value.filter((node) => node.id !== id);
	},
	addNode: (node: INodeUi) => {
		nodes.value = [...nodes.value, node];
	},
	setNodeParameters: vi.fn(),
};

const pushCommandToUndo = vi.fn();
const startRecordingUndo = vi.fn();
const stopRecordingUndo = vi.fn();

vi.mock('@/app/stores/workflowDocument.store', () => ({
	injectWorkflowDocumentStore: () => computed(() => store),
	useWorkflowDocumentStore: () => store,
}));

vi.mock('@/app/stores/history.store', () => ({
	useHistoryStore: () => ({ pushCommandToUndo, startRecordingUndo, stopRecordingUndo }),
}));

const { buildGroupNode, useGroupNodeOperations } = await import('./useGroupNodeOperations');

function node(name: string, parentId?: string): INodeUi {
	return {
		id: name.toLowerCase(),
		name,
		type: 'n8n-nodes-base.set',
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
		...(parentId === undefined ? {} : { parentId }),
	};
}

function group(id: string, name = id, objective = '', parentId?: string): INodeUi {
	return {
		id,
		name,
		type: GROUP_NODE_TYPE,
		typeVersion: 1,
		position: [100, 200],
		parameters: { objective },
		...(parentId === undefined ? {} : { parentId }),
	};
}

describe('useGroupNodeOperations', () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia({ stubActions: false }));
		nodes.value = [];
		connections.value = {};
		vi.clearAllMocks();
	});

	describe('reading a group', () => {
		it('finds the group nodes and ignores ordinary nodes', () => {
			nodes.value = [group('g1'), node('Plain')];

			expect(
				useGroupNodeOperations()
					.allGroupNodes()
					.map((n) => n.id),
			).toEqual(['g1']);
		});

		it('does not treat an ordinary node as a group', () => {
			nodes.value = [node('Plain')];

			expect(useGroupNodeOperations().getGroupNode('plain')).toBeUndefined();
		});

		it('reads the title from the group name and the description from the objective', () => {
			nodes.value = [group('g1', 'End', 'extract transform and load')];
			const operations = useGroupNodeOperations();

			expect(operations.getGroupTitle('g1')).toBe('End');
			expect(operations.getGroupObjective('g1')).toBe('extract transform and load');
		});

		it('reports an empty group when no node names it as parent', () => {
			nodes.value = [group('g1'), node('Outside')];

			expect(useGroupNodeOperations().isGroupEmpty('g1')).toBe(true);
		});

		it('reports a filled group and lists its interior', () => {
			nodes.value = [group('g1'), node('A', 'g1'), node('B', 'g1'), node('Outside')];
			const operations = useGroupNodeOperations();

			expect(operations.isGroupEmpty('g1')).toBe(false);
			expect(operations.getInterior('g1').map((n) => n.name)).toEqual(['A', 'B']);
		});

		it('finds the group that holds a node', () => {
			nodes.value = [group('g1', 'Group'), node('A', 'g1'), node('Outside')];
			const operations = useGroupNodeOperations();

			expect(operations.getGroupOfNode('a')?.id).toBe('g1');
			expect(operations.getGroupOfNode('outside')).toBeUndefined();
		});

		it('picks a group name no node uses', () => {
			nodes.value = [group('g1', 'Group 1'), node('Group 2')];

			expect(useGroupNodeOperations().nextGroupName('Group')).toBe('Group 3');
		});
	});

	describe('adding a node to a group', () => {
		it('sets parentId and records one undo step', () => {
			nodes.value = [group('g1'), node('A')];

			expect(useGroupNodeOperations().setNodeParent('a', 'g1')).toBe(true);
			expect(nodes.value.find((n) => n.id === 'a')?.parentId).toBe('g1');
			expect(pushCommandToUndo).toHaveBeenCalledWith(expect.any(SetNodeParentCommand));
		});

		it('moves several nodes in one undo step', () => {
			nodes.value = [group('g1'), node('A'), node('B')];

			useGroupNodeOperations().addNodesToGroup('g1', ['a', 'b']);

			expect(nodes.value.filter((n) => n.parentId === 'g1').map((n) => n.name)).toEqual(['A', 'B']);
			expect(startRecordingUndo).toHaveBeenCalledOnce();
			expect(stopRecordingUndo).toHaveBeenCalledOnce();
		});

		it('does nothing when the target is not a group', () => {
			nodes.value = [node('Plain'), node('A')];

			useGroupNodeOperations().addNodesToGroup('plain', ['a']);

			expect(nodes.value.find((n) => n.id === 'a')?.parentId).toBeUndefined();
		});

		it('refuses to put a group inside itself', () => {
			nodes.value = [group('g1')];

			expect(useGroupNodeOperations().setNodeParent('g1', 'g1')).toBe(false);
		});

		it('records nothing when the node is already in that group', () => {
			nodes.value = [group('g1'), node('A', 'g1')];

			expect(useGroupNodeOperations().setNodeParent('a', 'g1')).toBe(true);
			expect(pushCommandToUndo).not.toHaveBeenCalled();
		});
	});

	describe('removing a node from a group', () => {
		it('clears parentId and leaves the group in place, now empty', () => {
			nodes.value = [group('g1'), node('A', 'g1')];
			const operations = useGroupNodeOperations();

			operations.setNodeParent('a', undefined);

			expect(nodes.value.find((n) => n.id === 'a')?.parentId).toBeUndefined();
			// The group survives with no interior: emptiness needs no placeholder.
			expect(operations.getGroupNode('g1')).toBeDefined();
			expect(operations.isGroupEmpty('g1')).toBe(true);
		});
	});

	describe('ungrouping', () => {
		it('takes every node out and deletes the group node', () => {
			nodes.value = [group('g1'), node('A', 'g1'), node('B', 'g1')];

			useGroupNodeOperations().ungroup('g1');

			expect(nodes.value.map((n) => n.name)).toEqual(['A', 'B']);
			expect(nodes.value.every((n) => n.parentId === undefined)).toBe(true);
		});

		it('hands the members to the parent group when the group was nested', () => {
			nodes.value = [group('g1'), group('g2', 'g2', '', 'g1'), node('Deep', 'g2')];

			useGroupNodeOperations().ungroup('g2');

			// `Deep` stays inside the outer group instead of landing on the canvas.
			expect(nodes.value.find((n) => n.name === 'Deep')?.parentId).toBe('g1');
		});
	});

	describe('grouping a selection', () => {
		it('creates a group node and sets parentId on the members', () => {
			nodes.value = [node('A'), node('B')];

			const created = useGroupNodeOperations().groupSelection(['a', 'b']);

			expect(created).toBeDefined();
			expect(created && created.type).toBe(GROUP_NODE_TYPE);
			expect(nodes.value.find((n) => n.id === 'a')?.parentId).toBe(created?.id);
			expect(nodes.value.find((n) => n.id === 'b')?.parentId).toBe(created?.id);
		});

		it('places the group node above the left-top of the members', () => {
			nodes.value = [
				{ ...node('A'), position: [400, 300] },
				{ ...node('B'), position: [200, 500] },
			];

			const created = useGroupNodeOperations().groupSelection(['a', 'b']);

			// Left of the leftmost member and above the topmost, per the spec.
			expect(created?.position[0]).toBeLessThan(200);
			expect(created?.position[1]).toBeLessThan(300);
		});

		it('records the whole group as one undo step', () => {
			nodes.value = [node('A'), node('B')];

			useGroupNodeOperations().groupSelection(['a', 'b']);

			expect(startRecordingUndo).toHaveBeenCalledOnce();
			expect(stopRecordingUndo).toHaveBeenCalledOnce();
		});

		it('never groups a group node, and does nothing with no real members', () => {
			nodes.value = [group('g1')];

			expect(useGroupNodeOperations().groupSelection(['g1'])).toBeUndefined();
		});
	});

	describe('editing the description', () => {
		it('writes the objective on the group node', () => {
			nodes.value = [group('g1', 'End', 'old')];

			useGroupNodeOperations().setGroupObjective('g1', 'new objective');

			expect(store.setNodeParameters).toHaveBeenCalledWith(
				{ name: 'End', value: { objective: 'new objective' } },
				true,
			);
		});

		it('does nothing for a group that does not exist', () => {
			useGroupNodeOperations().setGroupObjective('missing', 'text');

			expect(store.setNodeParameters).not.toHaveBeenCalled();
		});
	});

	describe('undo', () => {
		it('puts a node back in the group it came from, with no new undo step', () => {
			nodes.value = [group('g1'), node('A')];
			const operations = useGroupNodeOperations();

			operations.revertSetNodeParent('a', 'g1');

			expect(nodes.value.find((n) => n.id === 'a')?.parentId).toBe('g1');
			expect(pushCommandToUndo).not.toHaveBeenCalled();
		});

		it('reverses a reparent command back to the previous group', () => {
			const command = new SetNodeParentCommand('a', 'g1', 'g2', 1);
			const reverse = command.getReverseCommand(2);

			expect(reverse).toBeInstanceOf(SetNodeParentCommand);
			expect(reverse).toMatchObject({ nodeId: 'a', oldParentId: 'g2', newParentId: 'g1' });
		});
	});

	describe('buildGroupNode', () => {
		it('builds a group node carrying the title and the objective', () => {
			expect(buildGroupNode({ name: 'End', objective: 'does a thing' }, 'g1')).toEqual({
				id: 'g1',
				name: 'End',
				type: GROUP_NODE_TYPE,
				typeVersion: 1,
				parameters: { objective: 'does a thing' },
			});
		});

		it('defaults the objective to an empty description', () => {
			expect(buildGroupNode({ name: 'Group 1' }, 'g1').parameters).toEqual({ objective: '' });
		});

		it('keeps the position when one is given', () => {
			expect(buildGroupNode({ name: 'G', position: [10, 20] }, 'g1').position).toEqual([10, 20]);
		});
	});

	describe('connection type', () => {
		it('uses the main connection for the group ports', () => {
			// Pins that a group connects like any node: no new edge kind.
			expect(NodeConnectionTypes.Main).toBe('main');
		});
	});
});
