import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useRootStore } from '@n8n/stores/useRootStore';
import { getOtelSettings, updateOtelSettings } from './otel.api';
import type { OtelSettingsResponse } from './otel.api';
import { OTEL_STORE } from './otel.constants';

/** Convert comma-separated "key=value,..." string to array of {key,value} pairs */
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

/** Convert array of {key,value} pairs to comma-separated "key=value,..." string */
export function headersPairsToString(pairs: Array<{ key: string; value: string }>): string {
	return pairs
		.filter((p) => p.key.trim())
		.map((p) => `${p.key}=${p.value}`)
		.join(',');
}

export const useOtelStore = defineStore(OTEL_STORE, () => {
	const rootStore = useRootStore();

	const settings = ref<OtelSettingsResponse | null>(null);
	const savedSettings = ref<OtelSettingsResponse | null>(null);
	const loading = ref(false);
	const saving = ref(false);

	const isDirty = computed(() => {
		if (!settings.value || !savedSettings.value) return false;
		return JSON.stringify(settings.value) !== JSON.stringify(savedSettings.value);
	});

	async function fetchSettings(): Promise<void> {
		loading.value = true;
		try {
			const fetched = await getOtelSettings(rootStore.restApiContext);
			settings.value = { ...fetched };
			savedSettings.value = { ...fetched };
		} finally {
			loading.value = false;
		}
	}

	async function saveSettings(): Promise<{ wasEnabled: boolean; nowEnabled: boolean }> {
		if (!settings.value) throw new Error('No settings to save');
		saving.value = true;
		const wasEnabled = savedSettings.value?.enabled ?? false;
		try {
			const updated = await updateOtelSettings(rootStore.restApiContext, settings.value);
			settings.value = { ...updated };
			savedSettings.value = { ...updated };
			return { wasEnabled, nowEnabled: updated.enabled };
		} finally {
			saving.value = false;
		}
	}

	function discardChanges(): void {
		if (savedSettings.value) {
			settings.value = { ...savedSettings.value };
		}
	}

	return {
		settings,
		savedSettings,
		loading,
		saving,
		isDirty,
		fetchSettings,
		saveSettings,
		discardChanges,
	};
});
