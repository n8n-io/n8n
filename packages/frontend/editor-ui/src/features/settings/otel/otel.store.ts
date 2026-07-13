import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useRootStore } from '@n8n/stores/useRootStore';
import { getOtelSettings, updateOtelSettings, sendOtelTestTrace } from './otel.api';
import type { OtelSettings, OtelSettingsResponse } from './otel.api';
import { OTEL_STORE } from './otel.constants';

export type OtelTestState = 'idle' | 'sending' | 'sent' | 'error';

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

	const testState = ref<OtelTestState>('idle');
	const testError = ref('');
	const testTimestamp = ref('');

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

	let currentTestRun = 0;

	function resetTestState(): void {
		currentTestRun++;
		testState.value = 'idle';
		testError.value = '';
		testTimestamp.value = '';
	}

	async function sendTestTrace(): Promise<void> {
		const runId = ++currentTestRun;
		testState.value = 'sending';
		testError.value = '';
		try {
			const result = await sendOtelTestTrace(rootStore.restApiContext, {
				exporterEndpoint: settings.value.exporterEndpoint,
				exporterTracingPath: settings.value.exporterTracingPath,
				exporterServiceName: settings.value.exporterServiceName,
				exporterHeaders: settings.value.exporterHeaders,
				startupConnectivityTimeoutMs: settings.value.startupConnectivityTimeoutMs,
			});
			if (runId !== currentTestRun) return;
			if (result.success) {
				testTimestamp.value = new Date().toLocaleTimeString();
				testState.value = 'sent';
			} else {
				testError.value = result.error;
				testState.value = 'error';
			}
		} catch (error) {
			if (runId !== currentTestRun) return;
			testError.value = error instanceof Error ? error.message : String(error);
			testState.value = 'error';
		}
	}

	return {
		settings,
		savedSettings,
		envManagedFields,
		loading,
		saving,
		isDirty,
		testState,
		testError,
		testTimestamp,
		fetchSettings,
		saveSettings,
		discardChanges,
		sendTestTrace,
		resetTestState,
	};
});
