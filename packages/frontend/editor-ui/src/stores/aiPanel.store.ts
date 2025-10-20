import { defineStore } from 'pinia';
import { computed } from 'vue';
import { jsonParse } from 'n8n-workflow';
import { useStorage } from '@/composables/useStorage';

const DEFAULT_PANEL_WIDTH = 400;
const MIN_PANEL_WIDTH = 350;
const MAX_PANEL_WIDTH = 800;
const LOCAL_STORAGE_AI_PANEL = 'aiPanel_state';

type AIPanelData = {
	width: number;
};

const DEFAULT_AI_PANEL_DATA: AIPanelData = { width: DEFAULT_PANEL_WIDTH };

export const useAIPanelStore = defineStore('aiPanel', () => {
	const aiPanelStorage = useStorage(LOCAL_STORAGE_AI_PANEL);

	const aiPanelData = computed((): AIPanelData => {
		return aiPanelStorage.value
			? jsonParse(aiPanelStorage.value, { fallbackValue: DEFAULT_AI_PANEL_DATA })
			: DEFAULT_AI_PANEL_DATA;
	});

	const panelWidth = computed(() => aiPanelData.value.width);

	function updateWidth(newWidth: number) {
		// Clamp width to valid range
		const clampedWidth = Math.max(MIN_PANEL_WIDTH, Math.min(MAX_PANEL_WIDTH, newWidth));

		aiPanelStorage.value = JSON.stringify({
			width: clampedWidth,
		});
	}

	function resetWidth() {
		aiPanelStorage.value = JSON.stringify({
			width: DEFAULT_PANEL_WIDTH,
		});
	}

	return {
		panelWidth,
		updateWidth,
		resetWidth,
	};
});
