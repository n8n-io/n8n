/**
 * Integration tests for the CRDT collaboration wiring on the real
 * workflowDocument store (CRDT flag enabled). Unlike the mirror's unit tests
 * (which use hand-rolled fake deps), these exercise the actual store composables
 * → mirror → CRDT doc path, and the doc → store applier path.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { NodeConnectionTypes } from 'n8n-workflow';
import { createCRDTProvider, CRDTEngine } from '@n8n/crdt';
import {
	useWorkflowDocumentStore,
	createWorkflowDocumentId,
	disposeWorkflowDocumentStore,
	type WorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';
import { useSettingsStore } from '@/app/stores/settings.store';
import { createTestNode } from '@/__tests__/mocks';
import type { INodeUi } from '@/Interface';

const { getNodeTypeMock } = vi.hoisted(() => ({ getNodeTypeMock: vi.fn().mockReturnValue(null) }));

vi.mock('@/app/stores/nodeTypes.store', () => ({
	useNodeTypesStore: vi.fn(() => ({
		getNodeType: getNodeTypeMock,
		communityNodeType: vi.fn().mockReturnValue(null),
		getAllNodeTypes: vi.fn().mockReturnValue({
			nodeTypes: {},
			init: async () => {},
			getByNameAndVersion: () => undefined,
		}),
	})),
}));

function createNode(overrides: Partial<INodeUi> = {}): INodeUi {
	return createTestNode({ name: 'Test Node', ...overrides }) as INodeUi;
}

let docCounter = 0;
const createdStores: WorkflowDocumentStore[] = [];

function createStore(): WorkflowDocumentStore {
	const store = useWorkflowDocumentStore(createWorkflowDocumentId(`crdt-wf-${docCounter++}`));
	createdStores.push(store);
	return store;
}

describe('workflowDocument.store CRDT integration (flag on)', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		// Force the backend-gated CRDT flag on for every store created here.
		useSettingsStore().settings.collaboration = { crdt: 'local' };
		getNodeTypeMock.mockReturnValue(null);
	});

	afterEach(() => {
		// Dispose to stop the per-store BroadcastChannel so docs don't cross-talk.
		while (createdStores.length) disposeWorkflowDocumentStore(createdStores.pop()!);
	});

	it('creates a collaboration handle when the experiment is enabled', () => {
		const store = createStore();
		expect(store.collaboration).not.toBeNull();
		expect(store.collaboration?.doc).toBeDefined();
		expect(store.collaboration?.undoManager).toBeDefined();
	});

	it('mirrors local store mutations into the CRDT doc', () => {
		const store = createStore();
		const node = createNode({ name: 'A' });

		store.addNode(node);
		store.setConnections({
			A: { main: [[{ node: 'B', type: NodeConnectionTypes.Main, index: 0 }]] },
		});
		store.setPinData({ A: [{ json: { value: 1 } }] });
		store.setName('My Workflow');

		const doc = store.collaboration!.doc;
		expect(doc.getMap('nodes').get(node.id)).toMatchObject({ name: 'A' });
		expect(doc.getMap('connections').get('A')).toBeDefined();
		expect(doc.getMap('pinData').get('A')).toEqual([{ json: { value: 1 } }]);
		expect(doc.getMap('meta').get('name')).toBe('My Workflow');
	});

	it('removes a deleted node from the CRDT doc', () => {
		const store = createStore();
		const node = createNode({ name: 'A' });
		store.addNode(node);
		expect(store.collaboration!.doc.getMap('nodes').has(node.id)).toBe(true);

		store.removeNodeById(node.id);
		expect(store.collaboration!.doc.getMap('nodes').has(node.id)).toBe(false);
	});

	it('mirrors a single-node rename into the CRDT doc by id', () => {
		const store = createStore();
		const node = createNode({ name: 'A' });
		store.addNode(node);
		expect(store.collaboration!.doc.getMap('nodes').get(node.id)).toMatchObject({ name: 'A' });

		// Rename via a single-node update: the UPDATE event must resolve by id, not
		// by the (now-stale) name index, or the rename is dropped from the doc.
		store.updateNodeById(node.id, { name: 'B' });
		expect(store.collaboration!.doc.getMap('nodes').get(node.id)).toMatchObject({ name: 'B' });
	});

	it('applies a remote doc update back into the store via the mirror', () => {
		const store = createStore();

		// A peer doc adds a node, then we apply its update to the store's doc.
		const peer = createCRDTProvider({ engine: CRDTEngine.yjs }).createDoc('peer');
		const remoteNode = createNode({ id: 'remote-1', name: 'Remote' });
		peer.getMap('nodes').set('remote-1', JSON.parse(JSON.stringify(remoteNode)));

		store.collaboration!.doc.applyUpdate(peer.encodeState());

		expect(store.getNodeById('remote-1')).toMatchObject({ name: 'Remote' });
		peer.destroy();
	});
});
