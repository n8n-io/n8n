import { defineStore } from 'pinia';
import { ref } from 'vue';

interface NotificationSuppressionState {
	suppressed: boolean;
	allowErrors: boolean;
}

// Whether the current session expiry has been handled, and notification-suppression state to restore afterwards.
export const useSessionExpiryStore = defineStore('sessionExpiry', () => {
	const handled = ref(false);
	const priorSuppression = ref<NotificationSuppressionState | undefined>(undefined);

	function markHandled() {
		handled.value = true;
	}

	function resetHandled() {
		handled.value = false;
	}

	function setPriorSuppression(value: NotificationSuppressionState) {
		priorSuppression.value = value;
	}

	return {
		handled,
		priorSuppression,
		markHandled,
		resetHandled,
		setPriorSuppression,
	};
});
