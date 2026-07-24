import { computed, ref, shallowRef } from 'vue';
import { createEventHook } from '@vueuse/core';
import { createCRDTProvider, CRDTEngine, ChangeOrigin } from '@n8n/crdt';
import type { CRDTDoc } from '@n8n/crdt';
import type {
	IConnections,
	INodeConnections,
	INodeExecutionData,
	IPinData,
	IWorkflowSettings,
} from 'n8n-workflow';
import type { INodeUi } from '@/Interface';
import { CHANGE_ACTION } from '../workflowDocument/types';
import type { NodesChangeEvent } from '../workflowDocument/useWorkflowDocumentNodes';
import type { ConnectionsChangeEvent } from '../workflowDocument/useWorkflowDocumentConnections';
import type { PinDataChangeEvent } from '../workflowDocument/useWorkflowDocumentPinData';
import type { SettingsChangeEvent } from '../workflowDocument/useWorkflowDocumentSettings';
import type { NameChangeEvent } from '../workflowDocument/useWorkflowDocumentName';
import { useWorkflowDocumentCrdtMirror } from './useWorkflowDocumentCrdtMirror';

const provider = createCRDTProvider({ engine: CRDTEngine.yjs });

function makeNode(id: string, name: string, overrides: Partial<INodeUi> = {}): INodeUi {
	return {
		id,
		name,
		type: 'n8n-nodes-base.noOp',
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
		...overrides,
	} as INodeUi;
}

/**
 * Minimal in-memory stand-in for the workflow document store. Its setters mutate
 * local refs AND fire the same change hooks the real composables fire, so the
 * mirror sees a faithful contract (local edits → hooks; applier → setters).
 */
function createHarness(doc: CRDTDoc) {
	const nodesById = shallowRef(new Map<string, INodeUi>());
	const connections = ref<IConnections>({});
	const pinData = ref<IPinData>({});
	const name = ref('');
	const settings = ref<IWorkflowSettings>({ executionOrder: 'v1' });

	const onNodesChange = createEventHook<NodesChangeEvent>();
	const onConnectionsChange = createEventHook<ConnectionsChangeEvent>();
	const onPinnedDataChange = createEventHook<PinDataChangeEvent>();
	const onSettingsChange = createEventHook<SettingsChangeEvent>();
	const onNameChange = createEventHook<NameChangeEvent>();

	function addNode(node: INodeUi) {
		nodesById.value.set(node.id, node);
		void onNodesChange.trigger({ action: CHANGE_ACTION.ADD, payload: { node } });
	}
	function updateNodeById(id: string, partial: Partial<INodeUi>) {
		const node = nodesById.value.get(id);
		if (!node) return false;
		Object.assign(node, partial);
		void onNodesChange.trigger({
			action: CHANGE_ACTION.UPDATE,
			payload: { name: node.name, id: node.id },
		});
		return true;
	}
	function removeNodeById(id: string) {
		const node = nodesById.value.get(id);
		nodesById.value.delete(id);
		void onNodesChange.trigger({
			action: CHANGE_ACTION.DELETE,
			payload: { id, name: node?.name ?? '' },
		});
	}
	// Granular setter that fires an event (mirrors `addConnection`).
	function addConnectionForSource(sourceName: string, value: INodeConnections) {
		connections.value = { ...connections.value, [sourceName]: value };
		void onConnectionsChange.trigger({
			action: CHANGE_ACTION.ADD,
			payload: { connection: [] },
		});
	}
	// Silent bulk setter (mirrors `setConnections`); used by the remote applier.
	function setConnections(value: IConnections) {
		connections.value = value;
	}
	function pinNodeData(nodeName: string, data: INodeExecutionData[]) {
		const action = pinData.value[nodeName] ? CHANGE_ACTION.UPDATE : CHANGE_ACTION.ADD;
		pinData.value = { ...pinData.value, [nodeName]: data };
		void onPinnedDataChange.trigger({ action, payload: { nodeName, data } });
	}
	function unpinNodeData(nodeName: string) {
		const { [nodeName]: _removed, ...rest } = pinData.value;
		pinData.value = rest;
		void onPinnedDataChange.trigger({
			action: CHANGE_ACTION.DELETE,
			payload: { nodeName, data: undefined },
		});
	}
	function setName(value: string) {
		name.value = value;
		void onNameChange.trigger({ action: CHANGE_ACTION.UPDATE, payload: { name: value } });
	}
	function setSettings(value: IWorkflowSettings) {
		settings.value = value;
		void onSettingsChange.trigger({ action: CHANGE_ACTION.UPDATE, payload: { settings: value } });
	}

	const mirror = useWorkflowDocumentCrdtMirror({
		doc,
		nodesById,
		connectionsBySourceNode: computed(() => connections.value),
		getPinDataSnapshot: () => ({ ...pinData.value }),
		name,
		getSettingsSnapshot: () => ({ ...settings.value }),
		onNodesChange: onNodesChange.on,
		onConnectionsChange: onConnectionsChange.on,
		onPinnedDataChange: onPinnedDataChange.on,
		onSettingsChange: onSettingsChange.on,
		onNameChange: onNameChange.on,
		addNode,
		updateNodeById,
		removeNodeById,
		setConnections,
		pinNodeData,
		unpinNodeData,
		setName,
		setSettings,
	});

	return {
		mirror,
		state: { nodesById, connections, pinData, name, settings },
		actions: {
			addNode,
			updateNodeById,
			removeNodeById,
			addConnectionForSource,
			pinNodeData,
			unpinNodeData,
			setName,
			setSettings,
		},
	};
}

describe('useWorkflowDocumentCrdtMirror', () => {
	let doc: CRDTDoc;

	beforeEach(() => {
		doc = provider.createDoc('test-doc');
	});

	describe('local write-through (ref → doc)', () => {
		it('writes an added node into the nodes map', () => {
			const { actions } = createHarness(doc);
			actions.addNode(makeNode('n1', 'Node 1'));

			expect(doc.getMap('nodes').get('n1')).toMatchObject({ id: 'n1', name: 'Node 1' });
		});

		it('reflects a node update in the doc', () => {
			const { actions } = createHarness(doc);
			actions.addNode(makeNode('n1', 'Node 1'));
			actions.updateNodeById('n1', { position: [100, 200] });

			expect(doc.getMap('nodes').get('n1')).toMatchObject({ position: [100, 200] });
		});

		it('removes a deleted node from the doc', () => {
			const { actions } = createHarness(doc);
			actions.addNode(makeNode('n1', 'Node 1'));
			actions.removeNodeById('n1');

			expect(doc.getMap('nodes').has('n1')).toBe(false);
		});

		it('writes name and settings into the meta map', () => {
			const { actions } = createHarness(doc);
			actions.setName('My Workflow');
			actions.setSettings({ executionOrder: 'v1', timezone: 'Europe/Berlin' });

			const meta = doc.getMap('meta');
			expect(meta.get('name')).toBe('My Workflow');
			expect(meta.get('settings')).toMatchObject({ timezone: 'Europe/Berlin' });
		});

		it('stores a detached snapshot, not the live node reference', () => {
			const { actions } = createHarness(doc);
			const node = makeNode('n1', 'Node 1');
			actions.addNode(node);
			// Mutate the live object WITHOUT going through a setter.
			node.parameters = { mutated: true };

			expect(doc.getMap('nodes').get('n1')).toMatchObject({ parameters: {} });
		});
	});

	describe('round-trip across two docs (doc → ref applier)', () => {
		let docB: CRDTDoc;

		beforeEach(() => {
			docB = provider.createDoc('test-doc-b');
		});

		function sync(from: CRDTDoc, to: CRDTDoc) {
			to.applyUpdate(from.encodeState());
		}

		// Bring two freshly-seeded docs to a shared baseline before divergent
		// edits. This mirrors two tabs that both hydrated the same server
		// workflow: scalar `meta` keys (name/settings) are seeded by each doc, so
		// without a shared baseline those concurrent same-key writes conflict
		// (last-write-wins) instead of cleanly propagating one peer's edit.
		function establishBaseline(a: CRDTDoc, b: CRDTDoc) {
			sync(a, b);
			sync(b, a);
		}

		it('propagates an added node to the second store', () => {
			const a = createHarness(doc);
			const b = createHarness(docB);
			establishBaseline(doc, docB);

			a.actions.addNode(makeNode('n1', 'Node 1'));
			sync(doc, docB);

			expect(b.state.nodesById.value.get('n1')).toMatchObject({ id: 'n1', name: 'Node 1' });
		});

		it('propagates connections, pin data, name and settings', () => {
			const a = createHarness(doc);
			const b = createHarness(docB);
			establishBaseline(doc, docB);

			a.actions.addNode(makeNode('n1', 'A'));
			a.actions.addConnectionForSource('A', {
				main: [[{ node: 'B', type: 'main', index: 0 }]],
			} as INodeConnections);
			a.actions.pinNodeData('A', [{ json: { hello: 'world' } }]);
			a.actions.setName('Synced');
			a.actions.setSettings({ executionOrder: 'v1', saveManualExecutions: true });

			sync(doc, docB);

			expect(b.state.connections.value.A).toBeDefined();
			expect(b.state.pinData.value.A).toEqual([{ json: { hello: 'world' } }]);
			expect(b.state.name.value).toBe('Synced');
			expect(b.state.settings.value).toMatchObject({ saveManualExecutions: true });
		});

		it('propagates a node deletion to the second store', () => {
			const a = createHarness(doc);
			const b = createHarness(docB);
			establishBaseline(doc, docB);

			a.actions.addNode(makeNode('n1', 'Node 1'));
			sync(doc, docB);
			expect(b.state.nodesById.value.has('n1')).toBe(true);

			a.actions.removeNodeById('n1');
			sync(doc, docB);

			expect(b.state.nodesById.value.has('n1')).toBe(false);
		});
	});

	describe('loop prevention', () => {
		it('does not emit a local echo when applying a remote update', () => {
			const a = createHarness(doc);
			const docB = provider.createDoc('test-doc-b');
			createHarness(docB);

			a.actions.addNode(makeNode('n1', 'Node 1'));

			const localEchoes: number[] = [];
			docB.onUpdate((_update, origin) => {
				if (origin === ChangeOrigin.local) localEchoes.push(1);
			});

			docB.applyUpdate(doc.encodeState());

			// The remote apply must not trigger the applier to write back locally.
			expect(localEchoes).toHaveLength(0);
		});

		it('converges and is idempotent on repeated applies', () => {
			const a = createHarness(doc);
			const docB = provider.createDoc('test-doc-b');
			const b = createHarness(docB);

			a.actions.addNode(makeNode('n1', 'Node 1'));
			docB.applyUpdate(doc.encodeState());
			docB.applyUpdate(doc.encodeState());

			expect(b.state.nodesById.value.size).toBe(1);
		});
	});

	describe('origin gating', () => {
		it('ignores local-origin transactions in the applier', () => {
			const a = createHarness(doc);
			// A purely local edit must not run the applier (which would call setters
			// a second time). One node in, one node present.
			a.actions.addNode(makeNode('n1', 'Node 1'));

			expect(a.state.nodesById.value.size).toBe(1);
			expect(doc.getMap('nodes').has('n1')).toBe(true);
		});
	});

	describe('sync()', () => {
		it('seeds the doc from current store state', () => {
			const a = createHarness(doc);
			// Mutate connections via the silent bulk setter (no event), then sync.
			a.actions.addNode(makeNode('n1', 'A'));
			a.state.connections.value = { A: { main: [[{ node: 'B', type: 'main', index: 0 }]] } };
			a.mirror.sync();

			expect(doc.getMap('connections').get('A')).toBeDefined();
		});
	});

	describe('destroy()', () => {
		it('stops applying remote updates after destroy', () => {
			const a = createHarness(doc);
			const docB = provider.createDoc('test-doc-b');
			const b = createHarness(docB);

			b.mirror.destroy();
			a.actions.addNode(makeNode('n1', 'Node 1'));
			docB.applyUpdate(doc.encodeState());

			expect(b.state.nodesById.value.has('n1')).toBe(false);
		});
	});
});
