import { onBeforeUnmount, watch, type Ref } from 'vue';
import { useDocumentVisibility } from '@vueuse/core';

import { useCollaborationStore } from '../collaboration.store';

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
