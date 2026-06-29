import { onBeforeUnmount, watch, type Ref } from 'vue';
import { useDocumentVisibility } from '@vueuse/core';

import { useCollaborationStore } from '../collaboration.store';

/**
 * Owns the collaboration session for the editor. Call from a component that
 * stays mounted while a workflow is open — not from a child of
 * `ConnectionTracker`, whose unmount on a blip would terminate the session
 * (ADO-5309). Reacts to `workflowId` changes; a falsy id stays idle.
 */
export function useCollaborationLifecycle(workflowId: Ref<string>) {
	const collaborationStore = useCollaborationStore();
	const visibility = useDocumentVisibility();

	let activeWorkflowId = '';

	function start(id: string) {
		activeWorkflowId = id;
		void collaborationStore.initialize(id);
	}

	function stop() {
		if (!activeWorkflowId) return;
		activeWorkflowId = '';
		collaborationStore.terminate();
	}

	watch(
		workflowId,
		(id) => {
			if (id === activeWorkflowId) return;
			stop();
			if (id) start(id);
		},
		{ immediate: true },
	);

	watch(visibility, (state) => {
		// Only toggle the heartbeat while a workflow is open.
		if (!activeWorkflowId) return;
		if (state === 'hidden') {
			collaborationStore.stopHeartbeat();
		} else {
			collaborationStore.startHeartbeat();
		}
	});

	onBeforeUnmount(() => {
		stop();
	});
}
