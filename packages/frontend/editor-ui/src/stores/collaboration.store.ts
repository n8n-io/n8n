import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useRoute } from 'vue-router';
import type { Collaborator } from '@n8n/api-types';
import * as Y from 'yjs';

import { PLACEHOLDER_EMPTY_WORKFLOW_ID, TIME } from '@/constants';
import { STORES } from '@n8n/stores';
import { useBeforeUnload } from '@/composables/useBeforeUnload';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { usePushConnectionStore } from '@/stores/pushConnection.store';
import { useUsersStore } from '@/stores/users.store';
import { useUIStore } from '@/stores/ui.store';
import type { IWorkflowDb } from '@/Interface';
import { WebsocketProvider } from 'y-websocket';
import type { INode } from 'n8n-workflow';

const HEARTBEAT_INTERVAL = 5 * TIME.MINUTE;

/**
 * Store for tracking active users for workflows. I.e. to show
 * who is collaboratively viewing/editing the workflow at the same time.
 */
export const useCollaborationStore = defineStore(STORES.COLLABORATION, () => {
	const pushStore = usePushConnectionStore();
	const workflowsStore = useWorkflowsStore();
	const usersStore = useUsersStore();
	const uiStore = useUIStore();
	const isLocalUpdate = ref(false);
	const ydoc = ref(new Y.Doc());

	const route = useRoute();
	const { addBeforeUnloadEventBindings, removeBeforeUnloadEventBindings, addBeforeUnloadHandler } =
		useBeforeUnload({ route });
	const unloadTimeout = ref<NodeJS.Timeout | null>(null);

	addBeforeUnloadHandler(() => {
		// Notify that workflow is closed straight away
		notifyWorkflowClosed();
		if (uiStore.stateIsDirty) {
			// If user decided to stay on the page we notify that the workflow is opened again
			unloadTimeout.value = setTimeout(() => notifyWorkflowOpened, 5 * TIME.SECOND);
		}
	});

	const collaborators = ref<Collaborator[]>([]);

	const heartbeatTimer = ref<number | null>(null);

	const startHeartbeat = () => {
		stopHeartbeat();
		heartbeatTimer.value = window.setInterval(notifyWorkflowOpened, HEARTBEAT_INTERVAL);
	};

	const stopHeartbeat = () => {
		if (heartbeatTimer.value !== null) {
			clearInterval(heartbeatTimer.value);
			heartbeatTimer.value = null;
		}
	};

	const pushStoreEventListenerRemovalFn = ref<(() => void) | null>(null);

	function initialize() {
		if (pushStoreEventListenerRemovalFn.value) {
			return;
		}

		pushStoreEventListenerRemovalFn.value = pushStore.addEventListener((event) => {
			if (
				event.type === 'collaboratorsChanged' &&
				event.data.workflowId === workflowsStore.workflowId
			) {
				collaborators.value = event.data.collaborators;
			}
		});

		addBeforeUnloadEventBindings();
		notifyWorkflowOpened();
		startHeartbeat();
		initYjs(workflowsStore.workflow);
	}

	function terminate() {
		if (typeof pushStoreEventListenerRemovalFn.value === 'function') {
			pushStoreEventListenerRemovalFn.value();
			pushStoreEventListenerRemovalFn.value = null;
		}
		notifyWorkflowClosed();
		stopHeartbeat();
		pushStore.clearQueue();
		removeBeforeUnloadEventBindings();
		if (unloadTimeout.value) {
			clearTimeout(unloadTimeout.value);
		}
	}

	function notifyWorkflowOpened() {
		const { workflowId } = workflowsStore;
		if (workflowId === PLACEHOLDER_EMPTY_WORKFLOW_ID) return;
		pushStore.send({ type: 'workflowOpened', workflowId });
	}

	function notifyWorkflowClosed() {
		const { workflowId } = workflowsStore;
		if (workflowId === PLACEHOLDER_EMPTY_WORKFLOW_ID) return;
		pushStore.send({ type: 'workflowClosed', workflowId });

		collaborators.value = collaborators.value.filter(
			({ user }) => user.id !== usersStore.currentUserId,
		);
	}

	function initYjs(workflow: IWorkflowDb) {
		console.log('[CollaborationStore]', 'initializing...');
		// For this PoC, we are using websocket connection
		// If we want to enable offline ediing,
		// we can include indexDB or localStorage
		// And Yjs should take care of syncing between them
		const wsProvider = new WebsocketProvider(
			'ws://localhost:1234',
			`workflow:${workflow.id}`,
			ydoc.value,
		);

		// Setup Yjs shared document that contains workflow data
		const metadata = ydoc.value.getMap('metadata');
		metadata.set('name', workflow.name);
		metadata.set('active', workflow.active);

		// Add nodes to the document
		const nodes = ydoc.value.getMap('nodes');

		workflow.nodes.forEach((node) => {
			// We will use Y.Map as a shared type for each node
			const nodeMap = new Y.Map();
			Object.entries(node).forEach(([key, value]) => {
				// Each node property is an entry in this map
				// TODO: Figure out how to properly represent `parameters`
				nodeMap.set(key, value);
			});
			nodes.set(node.id, nodeMap);
		});

		// TODO: Add connections and the rest of workflow properties
		// Observe changes and update UI when shared document
		// is updated by someone else
		// For PoC, we observe only node changes
		nodes.observeDeep((events) => {
			// Don't update if the change is coming from me
			if (isLocalUpdate.value) {
				return;
			}
			events.forEach((event) => {
				if (event.target instanceof Y.Map) {
					const updatedNode = event.target.toJSON();
					const nodeIndex = workflowsStore.workflow.nodes.findIndex(
						(node) => node.id === updatedNode.id,
					);
					// Update the actual node in workflow
					workflowsStore.updateNodeAtIndex(nodeIndex, updatedNode);
				}
			});
		});
	}

	function updateNodeProperty<K extends keyof INode>(nodeId: string, property: K, value: unknown) {
		isLocalUpdate.value = true;
		const nodes = ydoc.value.getMap('nodes');
		const node = nodes.get(nodeId);
		if (node) {
			node.set(property, value);
		}
		isLocalUpdate.value = false;
	}

	return {
		collaborators,
		initialize,
		terminate,
		startHeartbeat,
		stopHeartbeat,
		updateNodeProperty,
	};
});
