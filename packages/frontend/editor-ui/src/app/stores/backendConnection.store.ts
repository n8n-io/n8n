import { defineStore } from 'pinia';
import { readonly, ref } from 'vue';

/**
 * Store for tracking app-wide backend connectivity status.
 */
export const useBackendConnectionStore = defineStore('backendConnection', () => {
	const isOnline = ref(true);

	function setOnline(value: boolean) {
		isOnline.value = value;
	}

	return {
		isOnline: readonly(isOnline),
		setOnline,
	};
});
