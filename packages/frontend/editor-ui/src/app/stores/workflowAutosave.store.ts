import { defineStore } from 'pinia';
import { ref } from 'vue';
import { AutoSaveState } from '@/app/constants';
import { calculateExponentialBackoff, RETRY_START_DELAY } from '@/app/utils/retryUtils';

/**
 * Store for managing workflow autosave state.
 * This ensures all components share the same autosave state across the app.
 */
export const useWorkflowAutosaveStore = defineStore('workflowAutosave', () => {
	const autoSaveState = ref<AutoSaveState>(AutoSaveState.Idle);
	const pendingAutoSave = ref<Promise<void> | null>(null);

	// Exponential backoff state
	const retryCount = ref(0);
	const retryDelay = ref(RETRY_START_DELAY);
	const isRetrying = ref(false);
	const lastError = ref<string | null>(null);
	const conflictModalShown = ref(false);

	function setAutoSaveState(state: AutoSaveState) {
		autoSaveState.value = state;
	}

	function setPendingAutoSave(promise: Promise<void> | null) {
		pendingAutoSave.value = promise;
	}

	function incrementRetry() {
		retryCount.value++;
		retryDelay.value = calculateExponentialBackoff(retryCount.value);
	}

	function getRetryDelay() {
		return retryDelay.value;
	}

	function setRetrying(value: boolean) {
		isRetrying.value = value;
	}

	function setLastError(error: string | null) {
		lastError.value = error;
	}

	function setConflictModalShown(value: boolean) {
		conflictModalShown.value = value;
	}

	function resetRetry() {
		retryCount.value = 0;
		retryDelay.value = RETRY_START_DELAY;
		isRetrying.value = false;
		lastError.value = null;
		conflictModalShown.value = false;
	}

	function reset() {
		autoSaveState.value = AutoSaveState.Idle;
		pendingAutoSave.value = null;
		resetRetry();
	}

	return {
		autoSaveState,
		pendingAutoSave,
		retryCount,
		retryDelay,
		isRetrying,
		lastError,
		conflictModalShown,
		setAutoSaveState,
		setPendingAutoSave,
		incrementRetry,
		getRetryDelay,
		setRetrying,
		setLastError,
		setConflictModalShown,
		resetRetry,
		reset,
	};
});
