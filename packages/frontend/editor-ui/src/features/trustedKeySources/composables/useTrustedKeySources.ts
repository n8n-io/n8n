import type { TrustedKeySource, TrustedKeySourcePolicy } from '@n8n/api-types';
import { getTrustedKeySources, updateTrustedKeySourcePolicy } from '@n8n/rest-api-client';
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
	const isSaving = ref(false);

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

	/**
	 * Returns whether the save succeeded, so the caller can keep the form open
	 * on failure rather than losing what the admin typed.
	 *
	 * The server refreshes the source as part of the update, so the row it
	 * returns already carries the resulting `status`/`lastError` — a policy that
	 * saved but whose refresh failed shows up as an errored source rather than
	 * as a failed save.
	 */
	const updatePolicy = async (id: string, policy: TrustedKeySourcePolicy): Promise<boolean> => {
		try {
			isSaving.value = true;
			const updated = await updateTrustedKeySourcePolicy(rootStore.restApiContext, id, policy);
			sources.value = sources.value.map((source) => (source.id === id ? updated : source));
			toast.showMessage({
				title: i18n.baseText('settings.trustedKeySources.policy.saved'),
				type: 'success',
			});
			return true;
		} catch (error) {
			toast.showError(error, i18n.baseText('settings.trustedKeySources.policy.saveError'));
			return false;
		} finally {
			isSaving.value = false;
		}
	};

	return {
		sources,
		isLoading,
		isSaving,
		fetchSources,
		updatePolicy,
	};
}
