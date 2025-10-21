import { onMounted, onUnmounted } from 'vue';
import { useDebounceFn } from '@vueuse/core';
import { useCollaborationStore } from '@/features/collaboration/collaboration/collaboration.store';

export function useActivityDetection() {
	const collaborationStore = useCollaborationStore();

	const recordActivity = useDebounceFn(() => {
		console.log('[ActivityDetection] 🖱️ User activity detected, recording...');
		collaborationStore.recordActivity();
	}, 100);

	const events = ['mousedown', 'keydown', 'touchstart'];

	onMounted(() => {
		events.forEach((event) => {
			document.addEventListener(event, recordActivity, { passive: true });
		});
	});

	onUnmounted(() => {
		events.forEach((event) => {
			document.removeEventListener(event, recordActivity);
		});
	});

	return {
		recordActivity,
	};
}
