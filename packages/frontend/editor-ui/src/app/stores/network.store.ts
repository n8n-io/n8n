import { defineStore } from 'pinia';
import { readonly, ref } from 'vue';

/**
 * Store for tracking app-wide network connectivity status.
 */
export const useNetworkStore = defineStore('network', () => {
	const isOnline = ref(typeof navigator !== 'undefined' ? navigator.onLine : true);

	function setOnline(value: boolean) {
		isOnline.value = value;
	}

	return {
		isOnline: readonly(isOnline),
		setOnline,
	};
});
