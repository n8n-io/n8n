import { createTestingPinia } from '@pinia/testing';
import { GROUP_NODE_TYPE, NodeConnectionTypes } from 'n8n-workflow';
import type { IConnections } from 'n8n-workflow';
import { setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { computed, shallowRef } from 'vue';

import type { INodeUi } from '@/Interface';

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
	updateNodeById: vi.fn(),
	removeNodeById: vi.fn(),
	setNodeParameters: vi.fn(),
};

vi.mock('@/app/stores/workflowDocument.store', () => ({
	injectWorkflowDocumentStore: () => computed(() => store),
	useWorkflowDocumentStore: () => store,
}));

vi.mock('@/app/stores/history.store', () => ({
	useHistoryStore: () => ({
		pushCommandToUndo: vi.fn(),
		startRecordingUndo: vi.fn(),
		stopRecordingUndo: vi.fn(),
	}),
}));

const { mockInteriorGenerator, useGroupNodeGeneration } = await import('./useGroupNodeGeneration');

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

function group(id: string, name = id, objective = ''): INodeUi {
	return {
		id,
		name,
		type: GROUP_NODE_TYPE,
		typeVersion: 1,
		position: [100, 200],
		parameters: { objective },
	};
}

function connect(...edges: Array<[string, string]>): IConnections {
	const result: IConnections = {};

	for (const [from, to] of edges) {
		const bySource = (result[from] ??= {});
		const main = (bySource[NodeConnectionTypes.Main] ??= [[]]);
		(main[0] ??= []).push({ node: to, type: NodeConnectionTypes.Main, index: 0 });
	}

	return result;
}

describe('useGroupNodeGeneration', () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia({ stubActions: false }));
		nodes.value = [];
		connections.value = {};
		vi.clearAllMocks();
	});

	describe('the mock generator', () => {
		it('returns an Extract, Transform, Load chain', () => {
			const interior = mockInteriorGenerator({
				groupId: 'g1',
				title: 'End',
				objective: '',
				origin: [0, 0],
			});

			expect(interior.nodes.map((candidate) => candidate.name)).toEqual([
				'Extract',
				'Transform',
				'Load',
			]);
			// Chained left to right, so the group has one entry and one exit.
			expect(interior.edges).toEqual([
				[0, 1],
				[1, 2],
			]);
		});

		it('spaces the nodes out from the origin', () => {
			const interior = mockInteriorGenerator({
				groupId: 'g1',
				title: 'End',
				objective: '',
				origin: [500, 300],
			});

			expect(interior.nodes.map((candidate) => candidate.position)).toEqual([
				[500, 300],
				[740, 300],
				[980, 300],
			]);
		});
	});

	describe('planInterior', () => {
		it('plans a fill for an empty group, starting inside its card', () => {
			nodes.value = [group('g1', 'End', 'extract and load')];

			const interior = useGroupNodeGeneration().planInterior('g1');

			expect(interior?.nodes).toHaveLength(3);
			// Below the card header and inside its left edge.
			expect(interior?.nodes[0].position).toEqual([132, 296]);
		});

		it('gives the generator the title and the objective', () => {
			nodes.value = [group('g1', 'End', 'extract and load')];
			const generate = vi.fn().mockReturnValue({ nodes: [], edges: [] });

			useGroupNodeGeneration().planInterior('g1', generate);

			expect(generate).toHaveBeenCalledWith(
				expect.objectContaining({ groupId: 'g1', title: 'End', objective: 'extract and load' }),
			);
		});

		it('plans nothing for a group that already holds nodes', () => {
			nodes.value = [group('g1'), node('A', 'g1')];

			expect(useGroupNodeGeneration().planInterior('g1')).toBeUndefined();
		});

		it('plans nothing for a group that does not exist', () => {
			expect(useGroupNodeGeneration().planInterior('missing')).toBeUndefined();
		});
	});

	describe('interiorBoundary', () => {
		it('reports the interior entry and exit nodes of a chain', () => {
			nodes.value = [group('g1'), node('A', 'g1'), node('B', 'g1'), node('C', 'g1')];
			connections.value = connect(['A', 'B'], ['B', 'C']);

			expect(useGroupNodeGeneration().interiorBoundary('g1')).toEqual({
				entries: ['A'],
				exits: ['C'],
			});
		});

		it('reports several entries and exits when the interior is not a chain', () => {
			nodes.value = [group('g1'), node('A', 'g1'), node('B', 'g1')];

			expect(useGroupNodeGeneration().interiorBoundary('g1')).toEqual({
				entries: ['A', 'B'],
				exits: ['A', 'B'],
			});
		});

		it('reports nothing for an empty group', () => {
			nodes.value = [group('g1')];

			expect(useGroupNodeGeneration().interiorBoundary('g1')).toEqual({
				entries: [],
				exits: [],
			});
		});
	});

	describe('boundaryConnections', () => {
		it("lists the edges into and out of the group's ports", () => {
			nodes.value = [group('g1', 'Group'), node('Src'), node('Dst')];
			connections.value = connect(['Src', 'Group'], ['Group', 'Dst']);

			const boundary = useGroupNodeGeneration().boundaryConnections('Group');

			expect(boundary.incoming.map((connection) => connection.node)).toEqual(['Src']);
			expect(boundary.outgoing.map((connection) => connection.node)).toEqual(['Dst']);
		});

		it('lists nothing for a group nothing connects to', () => {
			nodes.value = [group('g1', 'Group')];

			expect(useGroupNodeGeneration().boundaryConnections('Group')).toEqual({
				incoming: [],
				outgoing: [],
			});
		});
	});
});
