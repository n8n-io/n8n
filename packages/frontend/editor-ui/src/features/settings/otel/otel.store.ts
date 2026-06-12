import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useRootStore } from '@n8n/stores/useRootStore';
import { getOtelSettings, updateOtelSettings } from './otel.api';
import type { OtelSettings, OtelSettingsResponse } from './otel.api';
import { OTEL_STORE } from './otel.constants';

export function headersStringToPairs(str: string): Array<{ key: string; value: string }> {
	if (!str.trim()) return [];
	return str
		.split(',')
		.map((pair) => {
			const idx = pair.indexOf('=');
			if (idx === -1) return { key: pair.trim(), value: '' };
			return { key: pair.slice(0, idx).trim(), value: pair.slice(idx + 1).trim() };
		})
		.filter((p) => p.key);
}

export function headersPairsToString(pairs: Array<{ key: string; value: string }>): string {
	return pairs
		.filter((p) => p.key.trim())
		.map((p) => `${p.key}=${p.value}`)
		.join(',');
}

const defaultSettings: OtelSettings = {
	enabled: false,
	exporterEndpoint: 'http://localhost:4318',
	exporterTracingPath: '/v1/traces',
	exporterServiceName: 'n8n',
	exporterHeaders: '',
	tracesSampleRate: 1.0,
	startupConnectivityTimeoutMs: 2_000,
	includeNodeSpans: true,
	injectOutbound: true,
	productionExecutionsOnly: true,
};

function extractSettings(response: OtelSettingsResponse): OtelSettings {
	const { envManagedFields: _, ...settings } = response;
	return settings;
}

export const useOtelStore = defineStore(OTEL_STORE, () => {
	const rootStore = useRootStore();

	const settings = ref<OtelSettings>({ ...defaultSettings });
	const savedSettings = ref<OtelSettings>({ ...defaultSettings });
	const envManagedFields = ref<Array<keyof OtelSettings>>([]);
	const loading = ref(true);
	const saving = ref(false);

	const isDirty = computed(
		() => JSON.stringify(settings.value) !== JSON.stringify(savedSettings.value),
	);

	async function fetchSettings(): Promise<void> {
		loading.value = true;
		try {
			const fetched = await getOtelSettings(rootStore.restApiContext);
			settings.value = extractSettings(fetched);
			savedSettings.value = extractSettings(fetched);
			envManagedFields.value = fetched.envManagedFields;
		} finally {
			loading.value = false;
		}
	}

	async function saveSettings(): Promise<void> {
		saving.value = true;
		try {
			const updated = await updateOtelSettings(rootStore.restApiContext, settings.value);
			settings.value = extractSettings(updated);
			savedSettings.value = extractSettings(updated);
			envManagedFields.value = updated.envManagedFields;
		} finally {
			saving.value = false;
		}
	}

	function discardChanges(): void {
		settings.value = { ...savedSettings.value };
	}

	return {
		settings,
		savedSettings,
		envManagedFields,
		loading,
		saving,
		isDirty,
		fetchSettings,
		saveSettings,
		discardChanges,
	};
});
