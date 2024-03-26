import { defineStore } from 'pinia';
import * as aiApi from '@/api/ai';
import type { DebugErrorPayload, GenerateCurlPayload } from '@/api/ai';
import { useRootStore } from '@/stores/n8nRoot.store';
import { useSettingsStore } from '@/stores/settings.store';
import { computed } from 'vue';

export const useAIStore = defineStore('ai', () => {
	const rootStore = useRootStore();
	const settingsStore = useSettingsStore();

	const isErrorDebuggingEnabled = computed(() => settingsStore.settings.ai.features.errorDebugging);
	const isGenerateCurlEnabled = computed(() => settingsStore.settings.ai.features.generateCurl);

	async function debugError(payload: DebugErrorPayload) {
		return await aiApi.debugError(rootStore.getRestApiContext, payload);
	}

	async function generateCurl(payload: GenerateCurlPayload) {
		return await aiApi.generateCurl(rootStore.getRestApiContext, payload);
	}

	return { isErrorDebuggingEnabled, isGenerateCurlEnabled, debugError, generateCurl };
});
