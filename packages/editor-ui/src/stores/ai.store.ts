import { defineStore } from 'pinia';
import * as aiApi from '@/api/ai';
import type { DebugErrorPayload } from '@/api/ai';
import { useRootStore } from '@/stores/n8nRoot.store';
import { useSettingsStore } from '@/stores/settings.store';
import { computed } from 'vue';

export const useAIStore = defineStore('ai', () => {
	const rootStore = useRootStore();
	const settingsStore = useSettingsStore();

	const isErrorDebuggingEnabled = computed(() => settingsStore.settings.ai.errorDebugging);

	async function debugError(payload: DebugErrorPayload) {
		return await aiApi.debugError(rootStore.getRestApiContext, payload);
	}

	return { isErrorDebuggingEnabled, debugError };
});
