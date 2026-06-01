import { useAssistantStore } from '@/features/ai/assistant/assistant.store';
import { useChatPanelStore } from '@/features/ai/assistant/chatPanel.store';
import { useLogsStore } from '@/app/stores/logs.store';
import type { NDVStore } from '@/features/ndv/shared/ndv.store';
import { computed, type Ref } from 'vue';

const ASSISTANT_FLOATING_BUTTON_SIZE = 42;

/**
 * Called from `App.vue`, which sits above the workflow document provide tree
 * and therefore cannot use `injectNDVStore()`. The NDV store is passed in and
 * is `null` whenever no workflow document is loaded.
 */
export function useFloatingUiOffsets(ndvStore: Readonly<Ref<NDVStore | null>>) {
	const assistantStore = useAssistantStore();
	const chatPanelStore = useChatPanelStore();
	const logsStore = useLogsStore();

	const isNDVV2 = computed(() => true);
	const askAiOffset = computed(() => (ndvStore.value?.isNDVOpen && !isNDVV2.value ? 48 : 16));

	return {
		askAiFloatingButtonBottomOffset: computed(() => `${askAiOffset.value}px`),
		toastBottomOffset: computed(() => {
			const logsPanelOffset =
				ndvStore.value?.isNDVOpen || chatPanelStore.isOpen ? 0 : logsStore.height;
			const assistantOffset = assistantStore.isFloatingButtonShown
				? ASSISTANT_FLOATING_BUTTON_SIZE + askAiOffset.value
				: 0;

			return `${logsPanelOffset + assistantOffset}px`;
		}),
		toastRightOffset: computed(() => (chatPanelStore.isOpen ? `${chatPanelStore.width}px` : '0px')),
	};
}
