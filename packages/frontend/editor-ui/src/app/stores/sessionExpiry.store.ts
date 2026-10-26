import { defineStore } from 'pinia';
import { ref } from 'vue';

// Dedupes concurrent 401s so only the first one redirects to sign-in.
export const useSessionExpiryStore = defineStore('sessionExpiry', () => {
	const handled = ref(false);

	function markHandled() {
		handled.value = true;
	}

	return {
		handled,
		markHandled,
	};
});
