import { computed } from 'vue';

import { useSettingsStore } from '@/app/stores/settings.store';
import { PROMOTIONS_MODULE_NAME } from '@/features/promotions/constants';

export const usePromotionsFeature = () => {
	const settingsStore = useSettingsStore();

	/** The promotions backend module is opt-in (`N8N_ENABLED_MODULES=promotions`). */
	const isPromotionsEnabled = computed(
		() => settingsStore.isModuleActive(PROMOTIONS_MODULE_NAME) === true,
	);

	return { isPromotionsEnabled };
};
