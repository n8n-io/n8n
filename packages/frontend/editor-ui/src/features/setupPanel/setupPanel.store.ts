import { usePostHog } from '@/app/stores/posthog.store';
import { useDebounce } from '@/app/composables/useDebounce';
import { STORES } from '@n8n/stores';
import { SETUP_PANEL } from '@/app/constants';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

const HIGHLIGHT_CLEAR_DEBOUNCE_MS = 300;

export const useSetupPanelStore = defineStore(STORES.SETUP_PANEL, () => {
	const posthogStore = usePostHog();
	const { debounce } = useDebounce();

	const isFeatureEnabled = computed(() => {
		return posthogStore.getVariant(SETUP_PANEL.name) === SETUP_PANEL.variant;
	});

	const highlightedNodeIds = ref(new Set<string>());

	const isHighlightActive = computed(() => highlightedNodeIds.value.size > 0);

	const debouncedClear = debounce(
		() => {
			highlightedNodeIds.value = new Set();
		},
		{ debounceTime: HIGHLIGHT_CLEAR_DEBOUNCE_MS, trailing: true },
	);

	function setHighlightedNodes(nodeIds: string[]) {
		debouncedClear.cancel();
		highlightedNodeIds.value = new Set(nodeIds);
	}

	function clearHighlightedNodes() {
		debouncedClear();
	}

	return {
		isFeatureEnabled,
		highlightedNodeIds,
		isHighlightActive,
		setHighlightedNodes,
		clearHighlightedNodes,
	};
});
