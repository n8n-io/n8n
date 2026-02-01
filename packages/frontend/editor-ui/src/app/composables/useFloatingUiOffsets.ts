import { useAssistantStore } from '@/features/ai/assistant/assistant.store';
import { useLogsStore } from '@/app/stores/logs.store';
import { useNDVStore } from '@/features/ndv/shared/ndv.store';
import { computed } from 'vue';

const ASSISTANT_FLOATING_BUTTON_SIZE = 42;

export function useFloatingUiOffsets() {
	const assistantStore = useAssistantStore();
	const ndvStore = useNDVStore();
	const logsStore = useLogsStore();

	const isNDVV2 = computed(() => true);
	const askAiOffset = computed(() => (ndvStore.isNDVOpen && !isNDVV2.value ? 48 : 16));

	return {
		askAiFloatingButtonBottomOffset: computed(() => `${askAiOffset.value}px`),
		toastBottomOffset: computed(() => {
			const logsPanelOffset = ndvStore.isNDVOpen ? 0 : logsStore.height;
			const assistantOffset = assistantStore.isFloatingButtonShown
				? ASSISTANT_FLOATING_BUTTON_SIZE + askAiOffset.value
				: 0;

			return `${logsPanelOffset + assistantOffset}px`;
		}),
	};
}
