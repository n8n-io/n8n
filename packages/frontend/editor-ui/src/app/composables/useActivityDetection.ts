import { onMounted, onUnmounted, watch } from 'vue';
import { useDebounceFn } from '@vueuse/core';
import { useCollaborationStore } from '@/features/collaboration/collaboration/collaboration.store';

export function useActivityDetection() {
	const collaborationStore = useCollaborationStore();

	const recordActivity = useDebounceFn(() => {
		collaborationStore.recordActivity();
	}, 100);

	const events = ['mousedown', 'keydown', 'touchstart'];

	const attachListeners = () => {
		events.forEach((event) => {
			document.addEventListener(event, recordActivity, { passive: true });
		});
	};

	const detachListeners = () => {
		events.forEach((event) => {
			document.removeEventListener(event, recordActivity);
		});
	};

	// Watch for writer status changes
	watch(
		() => collaborationStore.isCurrentUserWriter,
		(isWriter) => {
			if (isWriter) {
				attachListeners();
			} else {
				detachListeners();
			}
		},
	);

	onMounted(() => {
		// Attach listeners if user is writer
		if (collaborationStore.isCurrentUserWriter) {
			attachListeners();
		}
	});

	onUnmounted(() => {
		detachListeners();
	});

	return {
		recordActivity,
	};
}
