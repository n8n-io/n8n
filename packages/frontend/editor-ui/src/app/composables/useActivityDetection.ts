import { onMounted, onUnmounted, watch } from 'vue';
import { useDebounceFn } from '@vueuse/core';
import { getDebounceTime } from '@n8n/composables/useDebounce';
import { DEBOUNCE_TIME } from '@/app/constants/durations';

type ActivityDetectionStore = {
	recordActivity: () => void;
	isCurrentTabWriter: boolean;
};

export function useActivityDetection(store: ActivityDetectionStore) {
	const recordActivity = useDebounceFn(() => {
		store.recordActivity();
	}, getDebounceTime(DEBOUNCE_TIME.COLLABORATION.ACTIVITY));

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
		() => store.isCurrentTabWriter,
		(isWriter) => {
			if (isWriter) {
				attachListeners();
			} else {
				detachListeners();
			}
		},
	);

	onMounted(() => {
		// Attach listeners if current tab is writer
		if (store.isCurrentTabWriter) {
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
