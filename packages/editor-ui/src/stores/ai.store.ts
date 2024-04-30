import { defineStore } from 'pinia';
import * as aiApi from '@/api/ai';
import type { DebugErrorPayload } from '@/api/ai';
import { useRootStore } from '@/stores/n8nRoot.store';
import { useSettingsStore } from '@/stores/settings.store';
import { computed, reactive, ref } from 'vue';
import type { XYPosition } from '@/Interface';

export const useAIStore = defineStore('ai', () => {
	const rootStore = useRootStore();
	const settingsStore = useSettingsStore();

	const assistantChatOpen = ref(false);
	const nextStepPopupConfig = reactive({
		open: false,
		title: '',
		position: [0, 0] as XYPosition,
	});
	const isErrorDebuggingEnabled = computed(() => settingsStore.settings.ai.errorDebugging);

	function openNextStepPopup(title: string, position: XYPosition) {
		nextStepPopupConfig.open = true;
		nextStepPopupConfig.title = title;
		nextStepPopupConfig.position = position;
	}

	function closeNextStepPopup() {
		nextStepPopupConfig.open = false;
	}

	async function debugError(payload: DebugErrorPayload) {
		return await aiApi.debugError(rootStore.getRestApiContext, payload);
	}

	return {
		isErrorDebuggingEnabled,
		debugError,
		assistantChatOpen,
		nextStepPopupConfig,
		openNextStepPopup,
		closeNextStepPopup,
	};
});
