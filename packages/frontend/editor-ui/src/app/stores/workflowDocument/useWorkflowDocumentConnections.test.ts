/**
 * Integration tests for useWorkflowDocumentConnections.
 *
 * These tests use a real Pinia store (createPinia, not createTestingPinia) so
 * that every write goes through the actual workflowsStore and every read comes
 * back through the public API. This "round-trip" pattern (write → read back →
 * assert) is intentional:
 *
 *  - It catches regressions when consumers migrate from workflowsStore to
 *    workflowDocumentStore — the round-trip proves both paths produce the same
 *    result.
 *  - It survives internal refactors. When the internals change (e.g. owning
 *    its own refs instead of delegating), these tests stay unchanged because
 *    they only exercise the public contract.
 *  - Delegation-style tests (expect(store.method).toHaveBeenCalled()) would
 *    need to be rewritten every time internals change; round-trips do not.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import type { IConnection, NodeConnectionType } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { createTestNode } from '@/__tests__/mocks';
import type { INodeUi } from '@/Interface';
import {
	useWorkflowDocumentConnections,
	type WorkflowDocumentConnectionsDeps,
} from './useWorkflowDocumentConnections';

function createNode(overrides: Partial<INodeUi> = {}): INodeUi {
	return createTestNode({ name: 'Test Node', ...overrides }) as INodeUi;
}

function createDeps(
	overrides: Partial<WorkflowDocumentConnectionsDeps> = {},
): WorkflowDocumentConnectionsDeps {
	return {
		getNodeById: vi.fn().mockReturnValue(undefined),
		...overrides,
	};
}

/**
 * Helper to create the connection data format expected by addConnection/removeConnection.
 * Returns { connection: [sourceConnection, destinationConnection] }.
 */
function createConnectionData(
	sourceNode: string,
	destNode: string,
	opts: { sourceIndex?: number; destIndex?: number; type?: NodeConnectionType } = {},
): { connection: IConnection[] } {
	const type = opts.type ?? NodeConnectionTypes.Main;
	return {
		connection: [
			{ node: sourceNode, type, index: opts.sourceIndex ?? 0 },
			{ node: destNode, type, index: opts.destIndex ?? 0 },
		],
	};
}

describe('useWorkflowDocumentConnections', () => {
	let workflowsStore: ReturnType<typeof useWorkflowsStore>;
	let deps: WorkflowDocumentConnectionsDeps;

	beforeEach(() => {
		setActivePinia(createPinia());
		workflowsStore = useWorkflowsStore();
		deps = createDeps();

		// Ensure connections are clean — workflowObject may retain state
		// from a previous test if the Workflow class caches internally.
		workflowsStore.setConnections({});
	});

	describe('round-trip: setConnections → read', () => {
		it('connections set via setConnections are readable via connectionsBySourceNode', () => {
			const connections = {
				A: { main: [[{ node: 'B', type: NodeConnectionTypes.Main, index: 0 }]] },
			};

			const composable = useWorkflowDocumentConnections(deps);
			composable.setConnections(connections);

			expect(composable.connectionsBySourceNode.value).toEqual(connections);
		});

		it('connections set via setConnections are readable via connectionsByDestinationNode', () => {
			const connections = {
				A: { main: [[{ node: 'B', type: NodeConnectionTypes.Main, index: 0 }]] },
			};

			const composable = useWorkflowDocumentConnections(deps);
			composable.setConnections(connections);

			// connectionsByDestinationNode inverts: keyed by destination node
			expect(composable.connectionsByDestinationNode.value).toHaveProperty('B');
		});

		it('outgoingConnectionsByNodeName returns connections for existing node', () => {
			const connections = {
				A: { main: [[{ node: 'B', type: NodeConnectionTypes.Main, index: 0 }]] },
			};

			const composable = useWorkflowDocumentConnections(deps);
			composable.setConnections(connections);

			const outgoing = composable.outgoingConnectionsByNodeName('A');
			expect(outgoing.main).toBeDefined();
			expect(outgoing.main[0]).toEqual([{ node: 'B', type: NodeConnectionTypes.Main, index: 0 }]);
		});

		it('outgoingConnectionsByNodeName returns empty object for unknown node', () => {
			const composable = useWorkflowDocumentConnections(deps);

			expect(composable.outgoingConnectionsByNodeName('NonExistent')).toEqual({});
		});

		it('incomingConnectionsByNodeName returns connections for existing node', () => {
			const connections = {
				A: { main: [[{ node: 'B', type: NodeConnectionTypes.Main, index: 0 }]] },
			};

			const composable = useWorkflowDocumentConnections(deps);
			composable.setConnections(connections);

			const incoming = composable.incomingConnectionsByNodeName('B');
			expect(incoming.main).toBeDefined();
		});

		it('incomingConnectionsByNodeName returns empty object for unknown node', () => {
			const composable = useWorkflowDocumentConnections(deps);

			expect(composable.incomingConnectionsByNodeName('NonExistent')).toEqual({});
		});

		it('nodeHasOutputConnection returns true when node has outgoing connections', () => {
			const connections = {
				A: { main: [[{ node: 'B', type: NodeConnectionTypes.Main, index: 0 }]] },
			};

			const composable = useWorkflowDocumentConnections(deps);
			composable.setConnections(connections);

			expect(composable.nodeHasOutputConnection('A')).toBe(true);
		});

		it('nodeHasOutputConnection returns false when node has no outgoing connections', () => {
			const composable = useWorkflowDocumentConnections(deps);

			expect(composable.nodeHasOutputConnection('A')).toBe(false);
		});
	});

	describe('round-trip: addConnection → read', () => {
		it('connection added via addConnection is readable via connectionsBySourceNode', () => {
			const composable = useWorkflowDocumentConnections(deps);
			composable.addConnection(createConnectionData('A', 'B'));

			const connections = composable.connectionsBySourceNode.value;
			expect(connections.A).toBeDefined();
			expect(connections.A.main[0]).toEqual(
				expect.arrayContaining([{ node: 'B', type: NodeConnectionTypes.Main, index: 0 }]),
			);
		});

		it('addConnection skips duplicate connections', () => {
			const composable = useWorkflowDocumentConnections(deps);

			composable.addConnection(createConnectionData('A', 'B'));
			composable.addConnection(createConnectionData('A', 'B'));

			const connections = composable.connectionsBySourceNode.value;
			expect(connections.A.main[0]).toHaveLength(1);
		});

		it('addConnection with multiple connections to same source creates correct structure', () => {
			const composable = useWorkflowDocumentConnections(deps);

			composable.addConnection(createConnectionData('A', 'B'));
			composable.addConnection(createConnectionData('A', 'C'));

			const connections = composable.connectionsBySourceNode.value;
			expect(connections.A.main[0]).toHaveLength(2);
			expect(connections.A.main[0]).toEqual(
				expect.arrayContaining([
					{ node: 'B', type: NodeConnectionTypes.Main, index: 0 },
					{ node: 'C', type: NodeConnectionTypes.Main, index: 0 },
				]),
			);
		});
	});

	describe('round-trip: removeConnection → read', () => {
		it('removeConnection removes a connection from connectionsBySourceNode', () => {
			const composable = useWorkflowDocumentConnections(deps);

			// Verify clean state
			expect(composable.connectionsBySourceNode.value).toEqual({});

			composable.addConnection(createConnectionData('A', 'B'));

			const conns = composable.connectionsBySourceNode.value.A.main[0];
			expect(conns).toHaveLength(1);

			composable.removeConnection(createConnectionData('A', 'B'));
			expect(composable.connectionsBySourceNode.value.A.main[0]).toHaveLength(0);
		});

		it('removeConnection is a no-op when source node does not exist', () => {
			const composable = useWorkflowDocumentConnections(deps);

			// Should not throw — workflowsStore.removeConnection silently returns
			composable.removeConnection(createConnectionData('NonExistent', 'B'));

			// No connection for NonExistent was created
			expect(composable.nodeHasOutputConnection('NonExistent')).toBe(false);
		});
	});

	describe('round-trip: removeAllNodeConnection → read', () => {
		it('removeAllNodeConnection removes all connections for a node', () => {
			const nodeA = createNode({ name: 'A' });

			const composable = useWorkflowDocumentConnections(deps);
			composable.addConnection(createConnectionData('A', 'B'));
			composable.addConnection(createConnectionData('C', 'A'));

			composable.removeAllNodeConnection(nodeA);

			// Outgoing from A should be gone
			expect(composable.nodeHasOutputConnection('A')).toBe(false);
			// Incoming to A (from C) should also be gone
			const cConnections = composable.connectionsBySourceNode.value.C?.main?.[0] ?? [];
			const connectionsToA = cConnections.filter((c) => c.node === 'A');
			expect(connectionsToA).toHaveLength(0);
		});

		it('removeAllNodeConnection with preserveInputConnections keeps incoming', () => {
			const nodeA = createNode({ name: 'A' });

			const composable = useWorkflowDocumentConnections(deps);
			composable.addConnection(createConnectionData('A', 'B'));
			composable.addConnection(createConnectionData('C', 'A'));

			composable.removeAllNodeConnection(nodeA, { preserveInputConnections: true });

			// Outgoing from A should be gone
			expect(composable.nodeHasOutputConnection('A')).toBe(false);
			// Incoming to A (from C) should still exist
			const cConnections = composable.connectionsBySourceNode.value.C?.main?.[0] ?? [];
			const connectionsToA = cConnections.filter((c) => c.node === 'A');
			expect(connectionsToA).toHaveLength(1);
		});

		it('removeAllNodeConnection with preserveOutputConnections keeps outgoing', () => {
			const nodeA = createNode({ name: 'A' });

			const composable = useWorkflowDocumentConnections(deps);
			composable.addConnection(createConnectionData('A', 'B'));
			composable.addConnection(createConnectionData('C', 'A'));

			composable.removeAllNodeConnection(nodeA, { preserveOutputConnections: true });

			// Outgoing from A should still exist
			expect(composable.nodeHasOutputConnection('A')).toBe(true);
			// Incoming to A (from C) should be gone
			const cConnections = composable.connectionsBySourceNode.value.C?.main?.[0] ?? [];
			const connectionsToA = cConnections.filter((c) => c.node === 'A');
			expect(connectionsToA).toHaveLength(0);
		});
	});

	describe('round-trip: removeNodeConnectionsById → read', () => {
		it('removeNodeConnectionsById removes connections by resolving node ID via deps', () => {
			const nodeA = createNode({ name: 'A' });
			const customDeps = createDeps({
				getNodeById: vi.fn().mockReturnValue(nodeA),
			});

			const composable = useWorkflowDocumentConnections(customDeps);
			composable.addConnection(createConnectionData('A', 'B'));

			composable.removeNodeConnectionsById(nodeA.id);

			expect(composable.nodeHasOutputConnection('A')).toBe(false);
		});

		it('removeNodeConnectionsById is a no-op when node ID not found', () => {
			const composable = useWorkflowDocumentConnections(deps);
			composable.addConnection(createConnectionData('A', 'B'));

			// deps.getNodeById returns undefined by default
			composable.removeNodeConnectionsById('nonexistent');

			// Connection should still exist
			expect(composable.nodeHasOutputConnection('A')).toBe(true);
		});
	});

	describe('round-trip: removeAllConnections → read', () => {
		it('removeAllConnections clears all connections', () => {
			const composable = useWorkflowDocumentConnections(deps);
			composable.addConnection(createConnectionData('A', 'B'));
			composable.addConnection(createConnectionData('B', 'C'));

			composable.removeAllConnections();

			expect(composable.connectionsBySourceNode.value).toEqual({});
		});
	});

	describe('isNodeInOutgoingNodeConnections', () => {
		it('returns true when search node is a direct successor', () => {
			const composable = useWorkflowDocumentConnections(deps);
			composable.addConnection(createConnectionData('A', 'B'));

			expect(composable.isNodeInOutgoingNodeConnections('A', 'B')).toBe(true);
		});

		it('returns true when search node is a transitive successor', () => {
			const composable = useWorkflowDocumentConnections(deps);
			composable.addConnection(createConnectionData('A', 'B'));
			composable.addConnection(createConnectionData('B', 'C'));

			expect(composable.isNodeInOutgoingNodeConnections('A', 'C')).toBe(true);
		});

		it('returns false when search node is not connected', () => {
			const composable = useWorkflowDocumentConnections(deps);

			// Only A → B exists, D is completely disconnected
			composable.setConnections({
				A: { main: [[{ node: 'B', type: NodeConnectionTypes.Main, index: 0 }]] },
			});

			expect(composable.isNodeInOutgoingNodeConnections('A', 'D')).toBe(false);
		});

		it('respects depth limit', () => {
			const composable = useWorkflowDocumentConnections(deps);
			composable.addConnection(createConnectionData('A', 'B'));
			composable.addConnection(createConnectionData('B', 'C'));

			// Depth 1: only check direct successors — C is 2 hops away
			expect(composable.isNodeInOutgoingNodeConnections('A', 'C', 1)).toBe(false);
			// Depth 2: check 2 hops — C is reachable
			expect(composable.isNodeInOutgoingNodeConnections('A', 'C', 2)).toBe(true);
		});
	});

	describe('events', () => {
		it('setConnections does not fire onConnectionsChange (initialization path)', () => {
			const hookSpy = vi.fn();

			const composable = useWorkflowDocumentConnections(deps);
			composable.onConnectionsChange(hookSpy);
			composable.setConnections({
				A: { main: [[{ node: 'B', type: NodeConnectionTypes.Main, index: 0 }]] },
			});

			expect(hookSpy).not.toHaveBeenCalled();
		});

		it('setConnections does not fire onStateDirty (initialization path)', () => {
			const dirtySpy = vi.fn();

			const composable = useWorkflowDocumentConnections(deps);
			composable.onStateDirty(dirtySpy);
			composable.setConnections({
				A: { main: [[{ node: 'B', type: NodeConnectionTypes.Main, index: 0 }]] },
			});

			expect(dirtySpy).not.toHaveBeenCalled();
		});

		it('addConnection fires onConnectionsChange with ADD action', () => {
			const hookSpy = vi.fn();
			const connectionData = createConnectionData('A', 'B');

			const composable = useWorkflowDocumentConnections(deps);
			composable.onConnectionsChange(hookSpy);
			composable.addConnection(connectionData);

			expect(hookSpy).toHaveBeenCalledWith({
				action: 'add',
				payload: { connection: connectionData.connection },
			});
		});

		it('addConnection fires onStateDirty', () => {
			const dirtySpy = vi.fn();

			const composable = useWorkflowDocumentConnections(deps);
			composable.onStateDirty(dirtySpy);
			composable.addConnection(createConnectionData('A', 'B'));

			expect(dirtySpy).toHaveBeenCalledOnce();
		});

		it('removeConnection fires onConnectionsChange with DELETE action', () => {
			const hookSpy = vi.fn();
			const connectionData = createConnectionData('A', 'B');

			const composable = useWorkflowDocumentConnections(deps);
			composable.addConnection(connectionData);
			composable.onConnectionsChange(hookSpy);
			composable.removeConnection(connectionData);

			expect(hookSpy).toHaveBeenCalledWith({
				action: 'delete',
				payload: { connection: connectionData.connection },
			});
		});

		it('removeConnection fires onStateDirty', () => {
			const dirtySpy = vi.fn();

			const composable = useWorkflowDocumentConnections(deps);
			composable.addConnection(createConnectionData('A', 'B'));
			composable.onStateDirty(dirtySpy);
			composable.removeConnection(createConnectionData('A', 'B'));

			expect(dirtySpy).toHaveBeenCalledOnce();
		});

		it('removeAllNodeConnection fires onConnectionsChange with DELETE action', () => {
			const hookSpy = vi.fn();
			const nodeA = createNode({ name: 'A' });

			const composable = useWorkflowDocumentConnections(deps);
			composable.addConnection(createConnectionData('A', 'B'));
			composable.onConnectionsChange(hookSpy);
			composable.removeAllNodeConnection(nodeA);

			expect(hookSpy).toHaveBeenCalledWith({
				action: 'delete',
				payload: { nodeName: 'A' },
			});
		});

		it('removeAllNodeConnection fires onStateDirty', () => {
			const dirtySpy = vi.fn();
			const nodeA = createNode({ name: 'A' });

			const composable = useWorkflowDocumentConnections(deps);
			composable.addConnection(createConnectionData('A', 'B'));
			composable.onStateDirty(dirtySpy);
			composable.removeAllNodeConnection(nodeA);

			expect(dirtySpy).toHaveBeenCalledOnce();
		});

		it('removeNodeConnectionsById fires onStateDirty when node is found', () => {
			const dirtySpy = vi.fn();
			const nodeA = createNode({ name: 'A' });
			const customDeps = createDeps({
				getNodeById: vi.fn().mockReturnValue(nodeA),
			});

			const composable = useWorkflowDocumentConnections(customDeps);
			composable.addConnection(createConnectionData('A', 'B'));
			composable.onStateDirty(dirtySpy);
			composable.removeNodeConnectionsById(nodeA.id);

			expect(dirtySpy).toHaveBeenCalledOnce();
		});

		it('removeNodeConnectionsById does not fire events when node not found', () => {
			const hookSpy = vi.fn();
			const dirtySpy = vi.fn();

			const composable = useWorkflowDocumentConnections(deps);
			composable.addConnection(createConnectionData('A', 'B'));
			composable.onConnectionsChange(hookSpy);
			composable.onStateDirty(dirtySpy);
			composable.removeNodeConnectionsById('nonexistent');

			expect(hookSpy).not.toHaveBeenCalled();
			expect(dirtySpy).not.toHaveBeenCalled();
		});

		it('removeAllConnections does not fire onConnectionsChange (reset path)', () => {
			const hookSpy = vi.fn();

			const composable = useWorkflowDocumentConnections(deps);
			composable.addConnection(createConnectionData('A', 'B'));
			composable.onConnectionsChange(hookSpy);
			composable.removeAllConnections();

			expect(hookSpy).not.toHaveBeenCalled();
		});

		it('removeAllConnections does not fire onStateDirty (reset path)', () => {
			const dirtySpy = vi.fn();

			const composable = useWorkflowDocumentConnections(deps);
			composable.addConnection(createConnectionData('A', 'B'));
			composable.onStateDirty(dirtySpy);
			composable.removeAllConnections();

			expect(dirtySpy).not.toHaveBeenCalled();
		});
	});
});
