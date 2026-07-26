import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import type { IConnections, INode, IWorkflowGroup } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { useInvalidNodeGroupCleanup } from './useInvalidNodeGroupCleanup';
import {
	createWorkflowDocumentId,
	useWorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';
import { STICKY_NODE_TYPE } from '@/app/constants';
import { createTestNode, createTestWorkflow } from '@/__tests__/mocks';

const trackSpy = vi.hoisted(() => vi.fn());
const showMessageSpy = vi.hoisted(() => vi.fn());

vi.mock('@/app/composables/useTelemetry', () => ({
	useTelemetry: vi.fn(() => ({ track: trackSpy })),
}));

vi.mock('@/app/composables/useToast', () => ({
	useToast: () => ({ showMessage: showMessageSpy }),
}));

const WORKFLOW_ID = 'test-workflow';

function createConnection(from: string, to: string): IConnections {
	return {
		[from]: {
			[NodeConnectionTypes.Main]: [[{ node: to, type: NodeConnectionTypes.Main, index: 0 }]],
		},
	};
}

function setupDocumentStore({
	nodes,
	connections = {},
	nodeGroups = [],
}: {
	nodes: INode[];
	connections?: IConnections;
	nodeGroups?: IWorkflowGroup[];
}) {
	const store = useWorkflowDocumentStore(createWorkflowDocumentId(WORKFLOW_ID));
	store.hydrate(createTestWorkflow({ id: WORKFLOW_ID, nodes, connections, nodeGroups }));
	return store;
}

describe('useInvalidNodeGroupCleanup', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		vi.clearAllMocks();
	});

	it('keeps valid groups and shows no toast', () => {
		const store = setupDocumentStore({
			nodes: [
				createTestNode({ id: 'node-a', name: 'Node A' }),
				createTestNode({ id: 'node-b', name: 'Node B' }),
			],
			connections: createConnection('Node A', 'Node B'),
			nodeGroups: [{ id: 'group-1', name: 'Group 1', nodeIds: ['node-a', 'node-b'] }],
		});

		const { removeInvalidNodeGroups } = useInvalidNodeGroupCleanup();
		const removed = removeInvalidNodeGroups(store);

		expect(removed).toEqual([]);
		expect(store.allGroups).toHaveLength(1);
		expect(showMessageSpy).not.toHaveBeenCalled();
		expect(trackSpy).not.toHaveBeenCalled();
	});

	it('keeps a group with a sticky note member and shows no toast', () => {
		const store = setupDocumentStore({
			nodes: [
				createTestNode({ id: 'node-a', name: 'Node A' }),
				createTestNode({ id: 'node-b', name: 'Node B' }),
				createTestNode({ id: 'sticky', name: 'Sticky', type: STICKY_NODE_TYPE }),
			],
			connections: createConnection('Node A', 'Node B'),
			nodeGroups: [{ id: 'group-1', name: 'Group 1', nodeIds: ['node-a', 'node-b', 'sticky'] }],
		});

		const { removeInvalidNodeGroups } = useInvalidNodeGroupCleanup();
		const removed = removeInvalidNodeGroups(store);

		expect(removed).toEqual([]);
		expect(store.allGroups).toHaveLength(1);
		expect(showMessageSpy).not.toHaveBeenCalled();
		expect(trackSpy).not.toHaveBeenCalled();
	});

	it('removes a group whose members do not form a connected subgraph', () => {
		const store = setupDocumentStore({
			nodes: [
				createTestNode({ id: 'node-a', name: 'Node A' }),
				createTestNode({ id: 'node-b', name: 'Node B' }),
				createTestNode({ id: 'node-c', name: 'Node C' }),
			],
			connections: createConnection('Node A', 'Node B'),
			// Node C is not connected to the rest of the group
			nodeGroups: [{ id: 'group-1', name: 'Group 1', nodeIds: ['node-a', 'node-b', 'node-c'] }],
		});

		const { removeInvalidNodeGroups } = useInvalidNodeGroupCleanup();
		const removed = removeInvalidNodeGroups(store);

		expect(removed.map((group) => group.id)).toEqual(['group-1']);
		expect(store.allGroups).toHaveLength(0);
		expect(showMessageSpy).toHaveBeenCalledTimes(1);
		expect(showMessageSpy).toHaveBeenCalledWith(
			expect.objectContaining({
				type: 'warning',
				title: 'Groups removed',
				message:
					'The following groups are incompatible with your n8n version and have been removed: <ul style="list-style-position: inside"><li>Group 1</li></ul>',
			}),
		);
		expect(trackSpy).toHaveBeenCalledWith(
			'User ungrouped nodes',
			expect.objectContaining({
				workflow_id: WORKFLOW_ID,
				group_id: 'group-1',
				group_title: 'Group 1',
				node_ids: ['node-a', 'node-b', 'node-c'],
				node_count: 3,
				source: 'invalid-on-save',
			}),
		);
		expect(trackSpy).toHaveBeenCalledWith('Auto-ungrouped invalid node groups', {
			groups_affected: 1,
		});
	});

	it('removes a group that has no members', () => {
		const store = setupDocumentStore({
			nodes: [createTestNode({ id: 'node-a', name: 'Node A' })],
			nodeGroups: [{ id: 'group-1', name: 'Group 1', nodeIds: [] }],
		});

		const { removeInvalidNodeGroups } = useInvalidNodeGroupCleanup();
		const removed = removeInvalidNodeGroups(store);

		expect(removed.map((group) => group.id)).toEqual(['group-1']);
		expect(store.allGroups).toHaveLength(0);
	});

	it('removes a group referencing a node that does not exist', () => {
		const store = setupDocumentStore({
			nodes: [
				createTestNode({ id: 'node-a', name: 'Node A' }),
				createTestNode({ id: 'node-b', name: 'Node B' }),
			],
			connections: createConnection('Node A', 'Node B'),
			nodeGroups: [
				{ id: 'group-1', name: 'Group 1', nodeIds: ['node-a', 'node-b', 'does-not-exist'] },
			],
		});

		const { removeInvalidNodeGroups } = useInvalidNodeGroupCleanup();
		const removed = removeInvalidNodeGroups(store);

		expect(removed.map((group) => group.id)).toEqual(['group-1']);
		expect(store.allGroups).toHaveLength(0);
	});

	it('removes only invalid groups and lists them in a plural toast', () => {
		const store = setupDocumentStore({
			nodes: [
				createTestNode({ id: 'node-a', name: 'Node A' }),
				createTestNode({ id: 'node-b', name: 'Node B' }),
				createTestNode({ id: 'node-c', name: 'Node C' }),
				createTestNode({ id: 'node-d', name: 'Node D' }),
				createTestNode({ id: 'node-e', name: 'Node E' }),
			],
			connections: createConnection('Node A', 'Node B'),
			nodeGroups: [
				{ id: 'group-1', name: 'Group 1', nodeIds: ['node-a', 'node-b'] },
				// Members are not connected to each other
				{ id: 'group-2', name: 'Group 2', nodeIds: ['node-c', 'node-d'] },
				// References a missing node
				{ id: 'group-3', name: 'Group 3', nodeIds: ['node-e', 'does-not-exist'] },
			],
		});

		const { removeInvalidNodeGroups } = useInvalidNodeGroupCleanup();
		const removed = removeInvalidNodeGroups(store);

		expect(removed.map((group) => group.id)).toEqual(['group-2', 'group-3']);
		expect(store.allGroups.map((group) => group.id)).toEqual(['group-1']);
		expect(showMessageSpy).toHaveBeenCalledTimes(1);
		expect(showMessageSpy).toHaveBeenCalledWith(
			expect.objectContaining({
				type: 'warning',
				title: 'Groups removed',
				message: expect.stringContaining('<li>Group 2</li><li>Group 3</li>'),
			}),
		);
		// One 'User ungrouped nodes' per removed group, plus one aggregate event
		expect(trackSpy).toHaveBeenCalledTimes(3);
		expect(trackSpy).toHaveBeenCalledWith('Auto-ungrouped invalid node groups', {
			groups_affected: 2,
		});
	});

	it('escapes HTML in group names listed in the toast', () => {
		const store = setupDocumentStore({
			nodes: [
				createTestNode({ id: 'node-a', name: 'Node A' }),
				createTestNode({ id: 'node-b', name: 'Node B' }),
			],
			nodeGroups: [
				{ id: 'group-1', name: '<img src=x onerror=alert(1)>', nodeIds: ['node-a', 'node-b'] },
			],
		});

		const { removeInvalidNodeGroups } = useInvalidNodeGroupCleanup();
		removeInvalidNodeGroups(store);

		expect(showMessageSpy).toHaveBeenCalledWith(
			expect.objectContaining({
				message: expect.stringContaining('<li>&lt;img src=x onerror=alert(1)&gt;</li>'),
			}),
		);
	});

	it('does nothing when the workflow has no groups', () => {
		const store = setupDocumentStore({
			nodes: [createTestNode({ id: 'node-a', name: 'Node A' })],
		});

		const { removeInvalidNodeGroups } = useInvalidNodeGroupCleanup();
		const removed = removeInvalidNodeGroups(store);

		expect(removed).toEqual([]);
		expect(showMessageSpy).not.toHaveBeenCalled();
		expect(trackSpy).not.toHaveBeenCalled();
	});
});
