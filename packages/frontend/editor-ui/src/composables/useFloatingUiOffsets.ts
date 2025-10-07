import { NDV_UI_OVERHAUL_EXPERIMENT } from '@/constants';
import { useAssistantStore } from '@/features/assistant/assistant.store';
import { useLogsStore } from '@/stores/logs.store';
import { useNDVStore } from '@/stores/ndv.store';
import { usePostHog } from '@/stores/posthog.store';
import { computed } from 'vue';

const ASSISTANT_FLOATING_BUTTON_SIZE = 42;

export function useFloatingUiOffsets() {
	const assistantStore = useAssistantStore();
	const ndvStore = useNDVStore();
	const posthogStore = usePostHog();
	const logsStore = useLogsStore();

	const isNDVV2 = computed(() =>
		posthogStore.isVariantEnabled(
			NDV_UI_OVERHAUL_EXPERIMENT.name,
			NDV_UI_OVERHAUL_EXPERIMENT.variant,
		),
	);
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
