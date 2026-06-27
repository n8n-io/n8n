import { computed, effectScope, ref, shallowRef } from 'vue';
import { createEventHook } from '@vueuse/core';
import type { IConnections, INodeExecutionData, IPinData, IWorkflowSettings } from 'n8n-workflow';
import type { INodeUi } from '@/Interface';
import { CHANGE_ACTION } from '../workflowDocument/types';
import type { NodesChangeEvent } from '../workflowDocument/useWorkflowDocumentNodes';
import type { ConnectionsChangeEvent } from '../workflowDocument/useWorkflowDocumentConnections';
import type { PinDataChangeEvent } from '../workflowDocument/useWorkflowDocumentPinData';
import type { SettingsChangeEvent } from '../workflowDocument/useWorkflowDocumentSettings';
import type { NameChangeEvent } from '../workflowDocument/useWorkflowDocumentName';
import {
	useWorkflowDocumentCollaboration,
	type WorkflowDocumentCollaborationDeps,
} from './useWorkflowDocumentCollaboration';

let docCounter = 0;

function makeNode(id: string, name: string): INodeUi {
	return {
		id,
		name,
		type: 'n8n-nodes-base.noOp',
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
	} as INodeUi;
}

/** Minimal store stand-in providing the collaboration deps (sans docId). */
function createFakeDeps() {
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

	const deps: Omit<WorkflowDocumentCollaborationDeps, 'docId'> = {
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
		setConnections: (value) => (connections.value = value),
		pinNodeData: (nodeName: string, data: INodeExecutionData[]) =>
			(pinData.value = { ...pinData.value, [nodeName]: data }),
		unpinNodeData: (nodeName: string) => {
			const { [nodeName]: _removed, ...rest } = pinData.value;
			pinData.value = rest;
		},
		setName: (value) => (name.value = value),
		setSettings: (value) => (settings.value = value),
	};

	return { deps, state: { nodesById }, actions: { addNode } };
}

describe('useWorkflowDocumentCollaboration', () => {
	it('captures local edits in the undo manager and reverts them through the applier', () => {
		const { deps, state, actions } = createFakeDeps();
		const scope = effectScope();
		const collaboration = scope.run(() =>
			useWorkflowDocumentCollaboration({ docId: `collab-${docCounter++}`, ...deps }),
		)!;

		// A local edit is captured.
		actions.addNode(makeNode('n1', 'Node 1'));
		expect(state.nodesById.value.has('n1')).toBe(true);
		expect(collaboration.undoManager.canUndo()).toBe(true);

		// Undo reverts the doc transaction; the mirror applier removes the node.
		collaboration.undoManager.undo();
		expect(state.nodesById.value.has('n1')).toBe(false);

		// Redo re-applies it.
		collaboration.undoManager.redo();
		expect(state.nodesById.value.has('n1')).toBe(true);

		scope.stop();
	});

	it('exposes the doc and tears down on scope dispose', () => {
		const { deps } = createFakeDeps();
		const scope = effectScope();
		const collaboration = scope.run(() =>
			useWorkflowDocumentCollaboration({ docId: `collab-${docCounter++}`, ...deps }),
		)!;

		expect(collaboration.doc).toBeDefined();
		// Disposing the scope must not throw (sync stop + mirror + doc teardown).
		expect(() => scope.stop()).not.toThrow();
	});
});
