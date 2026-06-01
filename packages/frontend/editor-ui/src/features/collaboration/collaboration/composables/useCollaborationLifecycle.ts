import { onBeforeUnmount, watch, type Ref } from 'vue';
import { useDocumentVisibility } from '@vueuse/core';

import { useCollaborationStore } from '../collaboration.store';

/**
 * Owns the collaboration store lifecycle for a workflow editor view.
 *
 * Must be called from a stable component (e.g. NodeView) — not from a child
 * whose render position depends on connection state or collaborator count.
 * If lifecycle is tied to such a child, transient unmounts terminate the
 * collaboration session and the push listener never recovers.
 */
export function useCollaborationLifecycle(
	workflowId: Ref<string>,
	options: { enabled: Ref<boolean> },
) {
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
		[() => workflowId.value, () => options.enabled.value] as const,
		([id, enabled]) => {
			const shouldRun = enabled && !!id;
			if (shouldRun && id !== activeWorkflowId) {
				stop();
				start(id);
			} else if (!shouldRun) {
				stop();
			}
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
