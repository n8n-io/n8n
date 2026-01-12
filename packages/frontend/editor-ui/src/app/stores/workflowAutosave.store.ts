import { defineStore } from 'pinia';
import { ref } from 'vue';
import { AutoSaveState } from '@/app/constants';

/**
 * Store for managing workflow autosave state.
 * This ensures all components share the same autosave state across the app.
 */
export const useWorkflowAutosaveStore = defineStore('workflowAutosave', () => {
	const autoSaveState = ref<AutoSaveState>(AutoSaveState.Idle);
	const pendingAutoSave = ref<Promise<void> | null>(null);

	// Circuit breaker state (for backend errors only)
	const consecutiveFailures = ref(0);
	const isPaused = ref(false);
	const lastError = ref<{ message: string; timestamp: number } | null>(null);

	// Network retry state (for connection errors)
	const networkRetryCount = ref(0);
	const networkRetryDelay = ref(2000); // Start with 2s
	const isNetworkRetrying = ref(false);
	const scheduleAutoSaveCallback = ref<(() => void) | null>(null);

	function setAutoSaveState(state: AutoSaveState) {
		autoSaveState.value = state;
	}

	function setPendingAutoSave(promise: Promise<void> | null) {
		pendingAutoSave.value = promise;
	}

	function incrementFailureCount(pauseImmediately = false) {
		consecutiveFailures.value++;
		if (pauseImmediately) {
			isPaused.value = true;
		} else if (consecutiveFailures.value >= 3) {
			isPaused.value = true;
		}
	}

	function resetFailures() {
		consecutiveFailures.value = 0;
		isPaused.value = false;
		lastError.value = null;
		networkRetryCount.value = 0;
		networkRetryDelay.value = 2000;
		isNetworkRetrying.value = false;
	}

	function setLastError(message: string) {
		lastError.value = { message, timestamp: Date.now() };
	}

	function resumeAutosave() {
		isPaused.value = false;
	}

	// Exponential backoff: 2s, 4s, 8s, 16s, 32s (max)
	function incrementNetworkRetry() {
		networkRetryCount.value++;
		networkRetryDelay.value = Math.min(2000 * Math.pow(2, networkRetryCount.value - 1), 32000);
		console.log(
			`[Autosave Network Retry] Attempt ${networkRetryCount.value}, next retry in ${networkRetryDelay.value}ms`,
		);
	}

	function getNetworkRetryDelay() {
		return networkRetryDelay.value;
	}

	function setNetworkRetrying(value: boolean) {
		isNetworkRetrying.value = value;
	}

	function setScheduleAutoSaveCallback(callback: () => void) {
		scheduleAutoSaveCallback.value = callback;
	}

	function scheduleNetworkRetry() {
		if (scheduleAutoSaveCallback.value) {
			scheduleAutoSaveCallback.value();
		}
	}

	function reset() {
		autoSaveState.value = AutoSaveState.Idle;
		pendingAutoSave.value = null;
	}

	return {
		autoSaveState,
		pendingAutoSave,
		consecutiveFailures,
		isPaused,
		lastError,
		networkRetryCount,
		isNetworkRetrying,
		setAutoSaveState,
		setPendingAutoSave,
		incrementFailureCount,
		resetFailures,
		setLastError,
		resumeAutosave,
		incrementNetworkRetry,
		getNetworkRetryDelay,
		setNetworkRetrying,
		setScheduleAutoSaveCallback,
		scheduleNetworkRetry,
		reset,
	};
});
