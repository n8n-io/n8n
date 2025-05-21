import { defineStore } from 'pinia';
import { onMounted, ref, watch } from 'vue';
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
import { deepToRaw } from '@/components/RunDataAi/utils';

const HEARTBEAT_INTERVAL = 5 * TIME.MINUTE;

export interface YjsCollaborator extends Collaborator {
	id: number;
	color: string;
	isSelf: boolean;
	cursor?: {
		x: number;
		y: number;
	};
	selectedNodeName?: string;
}

/**
 * Store for tracking active users for workflows. I.e. to show
 * who is collaboratively viewing/editing the workflow at the same time.
 */
export const useCollaborationStore = defineStore(STORES.COLLABORATION, () => {
	const pushStore = usePushConnectionStore();
	const workflowsStore = useWorkflowsStore();
	const usersStore = useUsersStore();
	const uiStore = useUIStore();
	const ydoc = ref(new Y.Doc());
	const provider = ref<WebsocketProvider>();
	const myColor = ref(`hsl(${Math.floor(Math.random() * 360)}, 70%, 50%)`);

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

	const collaborators = ref<YjsCollaborator[]>([]);

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
				// collaborators.value = event.data.collaborators;
			}
		});

		addBeforeUnloadEventBindings();
		notifyWorkflowOpened();
		startHeartbeat();
		initYjs();
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

		// collaborators.value = collaborators.value.filter(
		// 	({ user }) => user.id !== usersStore.currentUserId,
		// );
	}

	function initYjs() {
		if (provider.value) {
			return;
		}

		provider.value = new WebsocketProvider('ws://localhost:1234', 'collabo!!!', ydoc.value);

		provider.value.awareness.on('change', () => {
			const states = provider.value?.awareness.getStates() ?? new Map();
			collaborators.value = [...states.values()].map((s) => ({
				...s.cursor,
				isSelf: s.cursor.id === ydoc.value.clientID,
			})) as YjsCollaborator[];
		});

		const workflows = ydoc.value.getMap<IWorkflowDb>('workflows');

		workflows.observeDeep((events, tx) => {
			events.forEach((event) => {
				if (event.target instanceof Y.Map) {
					const updatedWorkflows = event.target.toJSON();

					for (const [k, v] of Object.entries(updatedWorkflows)) {
						if (
							k === workflowsStore.workflowId &&
							JSON.stringify(workflowsStore.workflow) !== JSON.stringify(v)
						) {
							workflowsStore.setWorkflow(v as IWorkflowDb);
						}
					}
				}
			});
		});
	}

	watch(
		() => workflowsStore.workflow,
		(wf) => {
			const workflows = ydoc.value.getMap<IWorkflowDb>('workflows');

			workflows.set(workflowsStore.workflow.id, deepToRaw(wf));
		},
		{ immediate: true, deep: true },
	);

	watch([() => usersStore.currentUser, () => uiStore.lastSelectedNode], ([user, selected]) => {
		if (!user) {
			return;
		}

		provider.value?.awareness.setLocalStateField('cursor', {
			id: ydoc.value.clientID,
			user,
			isSelf: true,
			lastSeen: new Date().toISOString(),
			color: myColor.value,
			selectedNodeName: selected ?? undefined,
		} as YjsCollaborator);
	});

	const notifyMuseMove = (cursor: { x: number; y: number }) => {
		// TODO: translate to canvas coordinate
		if (!usersStore.currentUser) {
			return;
		}

		console.log(8888, cursor);

		provider.value?.awareness.setLocalStateField('cursor', {
			id: ydoc.value.clientID,
			user: usersStore.currentUser,
			lastSeen: new Date().toISOString(),
			color: myColor.value,
			isSelf: true,
			cursor,
			selectedNodeName: uiStore.lastSelectedNode ?? undefined,
		} as YjsCollaborator);
	};

	onMounted(initYjs);

	return {
		collaborators,
		initialize,
		terminate,
		startHeartbeat,
		stopHeartbeat,
		notifyMuseMove,
	};
});
