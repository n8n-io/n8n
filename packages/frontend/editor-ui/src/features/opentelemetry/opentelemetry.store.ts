import { defineStore } from 'pinia';
import { ref } from 'vue';
import { STORES } from '@n8n/stores';
import { useRootStore } from '@n8n/stores/useRootStore';
import * as otelApi from '@n8n/rest-api-client/api/opentelemetry';
import type { OtelSettings } from '@n8n/rest-api-client/api/opentelemetry';

export type { OtelSettings };

export const useOpenTelemetryStore = defineStore(STORES.OPENTELEMETRY, () => {
	const rootStore = useRootStore();
	const settings = ref<OtelSettings | null>(null);
	const isLoading = ref(false);
	const isSaving = ref(false);
	const lastTestSentAt = ref<string | null>(null);
	const isSendingTestTrace = ref(false);

	async function fetchSettings() {
		isLoading.value = true;
		try {
			settings.value = await otelApi.getOtelSettings(rootStore.restApiContext);
		} finally {
			isLoading.value = false;
		}
	}

	async function saveSettings(updated: OtelSettings) {
		isSaving.value = true;
		try {
			settings.value = await otelApi.updateOtelSettings(rootStore.restApiContext, updated);
		} finally {
			isSaving.value = false;
		}
	}

	async function sendTestTrace() {
		isSendingTestTrace.value = true;
		try {
			const result = await otelApi.sendTestTrace(rootStore.restApiContext);
			lastTestSentAt.value = result.sentAt;
		} finally {
			isSendingTestTrace.value = false;
		}
	}

	return {
		settings,
		isLoading,
		isSaving,
		lastTestSentAt,
		isSendingTestTrace,
		fetchSettings,
		saveSettings,
		sendTestTrace,
	};
});
