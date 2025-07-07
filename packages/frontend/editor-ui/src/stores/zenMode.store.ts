import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useZenModeStore = defineStore('zenMode', () => {
	const isZenModeActive = ref(false);

	function toggleZenMode() {
		isZenModeActive.value = !isZenModeActive.value;
	}

	function enableZenMode() {
		isZenModeActive.value = true;
	}

	function disableZenMode() {
		isZenModeActive.value = false;
	}

	return {
		isZenModeActive,
		toggleZenMode,
		enableZenMode,
		disableZenMode,
	};
});
