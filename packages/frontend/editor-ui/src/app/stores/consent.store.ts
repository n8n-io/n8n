import { STORES } from '@n8n/stores';
import { defineStore } from 'pinia';
import { useRootStore } from '@n8n/stores/useRootStore';

import * as consentApi from '@n8n/rest-api-client/api/consent';
import { type Ref, ref } from 'vue';
import type { ConsentDetails } from '@n8n/rest-api-client/api/consent';
import { ResponseError } from '@n8n/rest-api-client/utils';

export const useConsentStore = defineStore(STORES.CONSENT, () => {
	const consentDetails = ref<ConsentDetails | null>(null);
	const isLoading = ref(false);
	const error = ref<string | null>(null);
	const errorCode: Ref<'resource_unavailable' | 'forbidden' | null> = ref(null);

	const rootStore = useRootStore();

	const fetchConsentDetails = async () => {
		isLoading.value = true;
		error.value = null;
		errorCode.value = null;

		try {
			consentDetails.value = await consentApi.getConsentDetails(rootStore.restApiContext);
			return consentDetails.value;
		} catch (err) {
			if (err instanceof ResponseError && err.httpStatusCode === 422) {
				errorCode.value = 'resource_unavailable';
			} else if (err instanceof ResponseError && err.httpStatusCode === 403) {
				errorCode.value = 'forbidden';
			}
			error.value = err instanceof Error ? err.message : 'Failed to load consent details';
			throw err;
		} finally {
			isLoading.value = false;
		}
	};

	const approveConsent = async (approved: boolean, scopes?: string[]) => {
		isLoading.value = true;
		error.value = null;

		try {
			const response = await consentApi.approveConsent(rootStore.restApiContext, approved, scopes);
			return response;
		} catch (err) {
			error.value = err instanceof Error ? err.message : 'Failed to process consent';
			throw err;
		} finally {
			isLoading.value = false;
		}
	};

	const resetState = () => {
		consentDetails.value = null;
		isLoading.value = false;
		error.value = null;
		errorCode.value = null;
	};

	return {
		fetchConsentDetails,
		approveConsent,
		resetState,
		consentDetails,
		isLoading,
		error,
		errorCode,
	};
});
