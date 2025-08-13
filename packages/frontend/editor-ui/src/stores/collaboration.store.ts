import { defineStore } from 'pinia';
import { isProxy, isReactive, isRef, ref, toRaw, watch } from 'vue';
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
import { useRootStore } from '@n8n/stores/useRootStore';

const HEARTBEAT_INTERVAL = 5 * TIME.MINUTE;

function deepToRaw<T>(sourceObj: T): T {
	const seen = new WeakMap();

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const objectIterator = (input: any): any => {
		if (seen.has(input)) {
			return input;
		}

		if (input !== null && typeof input === 'object') {
			seen.set(input, true);
		}

		if (Array.isArray(input)) {
			return input.map((item) => objectIterator(item));
		}

		if (isRef(input) || isReactive(input) || isProxy(input)) {
			return objectIterator(toRaw(input));
		}

		if (
			input !== null &&
			typeof input === 'object' &&
			Object.getPrototypeOf(input) === Object.prototype
		) {
			return Object.keys(input).reduce((acc, key) => {
				acc[key as keyof typeof acc] = objectIterator(input[key]);
				return acc;
			}, {} as T);
		}

		return input;
	};

	return objectIterator(sourceObj);
}

export interface YjsCollaborator extends Collaborator {
	id: number;
	color: string;
	isSelf: boolean;
	cursor?: {
		x: number;
		y: number;
	};
	selectedNodeName?: string;
	selectedParameterName?: string;
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
	const rootStore = useRootStore();
	const ydoc = ref(new Y.Doc());
	const provider = ref<WebsocketProvider>();
	const undoManager = ref<Y.UndoManager>();
	const undoStackLength = ref(0);
	const redoStackLength = ref(0);

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

	const updateStackLengths = () => {
		if (undoManager.value) {
			console.log(
				'Updating stack lengths - undo stack:',
				undoManager.value.undoStack.length,
				'redo stack:',
				undoManager.value.redoStack.length,
			);
			undoStackLength.value = undoManager.value.undoStack.length;
			redoStackLength.value = undoManager.value.redoStack.length;
		} else {
			console.log('No undo manager available, resetting stack lengths');
			undoStackLength.value = 0;
			redoStackLength.value = 0;
		}
	};

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

	function initYjs(workflowId: string) {
		if (provider.value) {
			console.log('Disconnecting...');
			provider.value.disconnect();
			return;
		}

		console.log('Creating new connection...');

		provider.value = new WebsocketProvider(
			`ws://${rootStore.restApiContext.baseUrl.split('//')[1]}`,
			`collaboration?workflowId=${workflowId}`,
			ydoc.value,
		);

		provider.value.awareness.on('change', () => {
			const states = provider.value?.awareness.getStates() ?? new Map();
			collaborators.value = [...states.values()].flatMap((s) =>
				s.cursor
					? [
							{
								...s.cursor,
								isSelf: s.cursor.id === ydoc.value.clientID,
							},
						]
					: [],
			) as YjsCollaborator[];
		});

		const workflows = ydoc.value.getMap<IWorkflowDb>('workflows');
		// Initialize UndoManager to track changes to the workflows map
		undoManager.value = new Y.UndoManager(workflows);

		// Add listeners to track undo/redo stack changes for reactive buttons
		undoManager.value.on('stack-cleared', updateStackLengths);
		undoManager.value.on('stack-item-added', updateStackLengths);
		undoManager.value.on('stack-item-popped', updateStackLengths);

		// Initial update
		updateStackLengths();

		workflows.observeDeep((events) => {
			events.forEach((event) => {
				if (event.target instanceof Y.Map) {
					const updatedWorkflows = event.target.toJSON();

					for (const [id, value] of Object.entries(updatedWorkflows)) {
						if (id === workflowsStore.workflowId) {
							const currentWorkflow = workflowsStore.workflow;
							const newWorkflow = value as IWorkflowDb;
							const hasChanges = JSON.stringify(currentWorkflow) !== JSON.stringify(newWorkflow);

							if (hasChanges) {
								console.log('Updating workflow store from Y.js change for workflow:', id);
								workflowsStore.setWorkflow(newWorkflow);
							} else {
								console.log('No changes detected, skipping workflow update');
							}
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

			console.log('Workflow changed, adding to Y.Map for undo tracking:', wf.id);
			// Perform the update within a transaction to ensure UndoManager tracks it
			ydoc.value.transact(() => {
				workflows.set(workflowsStore.workflow.id, deepToRaw(wf));
			});

			// Check stacks after transaction
			if (undoManager.value) {
				console.log(
					'After workflow update - undo stack:',
					undoManager.value.undoStack.length,
					'redo stack:',
					undoManager.value.redoStack.length,
				);
			}
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

	const notifyFocus = (name: string, isFocused: boolean) => {
		// TODO: translate to canvas coordinate
		if (!usersStore.currentUser) {
			return;
		}

		provider.value?.awareness.setLocalStateField('cursor', {
			id: ydoc.value.clientID,
			user: usersStore.currentUser,
			lastSeen: new Date().toISOString(),
			color: myColor.value,
			isSelf: true,
			selectedParameterName: isFocused ? name : undefined,
		} as YjsCollaborator);
	};

	watch(
		() => workflowsStore.workflowId,
		(id) => {
			if (id && id !== PLACEHOLDER_EMPTY_WORKFLOW_ID) {
				initYjs(id);
			}
		},
		{ immediate: true },
	);

	const canUndo = () => {
		return undoStackLength.value > 0;
	};

	const canRedo = () => {
		return redoStackLength.value > 0;
	};

	const undo = () => {
		const manager = undoManager.value;
		if (manager && manager.undoStack.length > 0) {
			console.log('Performing undo - stack length:', manager.undoStack.length);
			manager.undo();
			console.log(
				'After undo - undo stack:',
				manager.undoStack.length,
				'redo stack:',
				manager.redoStack.length,
			);
			return true;
		}
		console.log('Cannot undo - no manager or empty stack');
		return false;
	};

	const redo = () => {
		const manager = undoManager.value;
		if (manager && manager.redoStack.length > 0) {
			console.log('Performing redo - stack length:', manager.redoStack.length);
			manager.redo();
			console.log(
				'After redo - undo stack:',
				manager.undoStack.length,
				'redo stack:',
				manager.redoStack.length,
			);
			return true;
		}
		console.log('Cannot redo - no manager or empty stack');
		return false;
	};

	return {
		collaborators,
		initialize,
		terminate,
		startHeartbeat,
		stopHeartbeat,
		notifyMuseMove,
		notifyFocus,
		undo,
		redo,
		canUndo,
		canRedo,
	};
});
