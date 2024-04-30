import { defineStore } from 'pinia';
import * as aiApi from '@/api/ai';
import type { DebugErrorPayload } from '@/api/ai';
import { useRootStore } from '@/stores/n8nRoot.store';
import { useSettingsStore } from '@/stores/settings.store';
import { Ref, computed, reactive, ref } from 'vue';
import type { XYPosition } from '@/Interface';
import { Endpoint } from '@jsplumb/core';

const CURRENT_POPUP_HEIGHT = 94;

/**
 * Calculates the position for the next step popup based on the specified element
 * so they are aligned vertically.
 */
const getPopupCenterPosition = (relativeElement: HTMLElement) => {
	const bounds = relativeElement.getBoundingClientRect();
	const rectMiddle = bounds.top + bounds.height / 2;
	const x = bounds.left + bounds.width + 22;
	const y = rectMiddle - CURRENT_POPUP_HEIGHT / 2;
	return [x, y] as XYPosition;
};

export const useAIStore = defineStore('ai', () => {
	const rootStore = useRootStore();
	const settingsStore = useSettingsStore();

	const assistantChatOpen = ref(false);
	const nextStepPopupConfig = reactive({
		open: false,
		title: '',
		position: [0, 0] as XYPosition,
	});
	const endpointForNextStep: Ref<Endpoint | null> = ref(null);
	const isErrorDebuggingEnabled = computed(() => settingsStore.settings.ai.errorDebugging);

	function openNextStepPopup(title: string, relativeElement: HTMLElement) {
		nextStepPopupConfig.open = true;
		nextStepPopupConfig.title = title;
		nextStepPopupConfig.position = getPopupCenterPosition(relativeElement);
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
		endpointForNextStep,
	};
});
