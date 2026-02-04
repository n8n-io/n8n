import { usePostHog } from '@/app/stores/posthog.store';
import { STORES } from '@n8n/stores';
import { SETUP_PANEL } from '@/app/constants';
import { defineStore } from 'pinia';
import { computed } from 'vue';

export const useSetupPanelStore = defineStore(STORES.SETUP_PANEL, () => {
	const posthogStore = usePostHog();

	const isFeatureEnabled = computed(() => {
		return posthogStore.getVariant(SETUP_PANEL.name) === SETUP_PANEL.variant;
	});

	return {
		isFeatureEnabled,
	};
});
