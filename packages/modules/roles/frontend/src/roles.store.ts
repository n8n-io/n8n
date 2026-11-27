import { defineStore } from 'pinia';
import { ref } from 'vue';

/**
 * Pinia stores self-register on the first `use…Store()` call, so there is
 * nothing to declare in the descriptor.
 */
export const useRolesStore = defineStore('roles', () => {
	const isReady = ref(false);

	function markReady() {
		isReady.value = true;
	}

	return { isReady, markReady };
});
