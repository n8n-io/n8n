import { useSettingsStore } from '@/app/stores/settings.store';
import { STORES } from '@n8n/stores';
import { defineStore } from 'pinia';
import { computed } from 'vue';

export const useSetupPanelStore = defineStore(STORES.SETUP_PANEL, () => {
	const settingsStore = useSettingsStore();

	const isFeatureEnabled = computed(() => {
		return true;
	});

	return {
		isFeatureEnabled,
	};
});
