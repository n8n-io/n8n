import type { TrustedKeySource } from '@n8n/api-types';
import { getTrustedKeySources } from '@n8n/rest-api-client';
import { useRootStore } from '@n8n/stores/useRootStore';
import { ref } from 'vue';

import { useToast } from '@n8n/composables/useToast';
import { useI18n } from '@n8n/i18n';

export function useTrustedKeySources() {
	const rootStore = useRootStore();
	const toast = useToast();
	const i18n = useI18n();

	const sources = ref<TrustedKeySource[]>([]);
	const isLoading = ref(false);

	const fetchSources = async (): Promise<void> => {
		try {
			isLoading.value = true;
			sources.value = await getTrustedKeySources(rootStore.restApiContext);
		} catch (error) {
			toast.showError(error, i18n.baseText('settings.trustedKeySources.fetchError'));
		} finally {
			isLoading.value = false;
		}
	};

	return {
		sources,
		isLoading,
		fetchSources,
	};
}
