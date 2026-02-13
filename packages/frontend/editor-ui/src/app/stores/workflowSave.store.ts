import { defineStore } from 'pinia';
import { ref } from 'vue';
import { AutoSaveState } from '@/app/constants';
import { calculateExponentialBackoff, RETRY_START_DELAY } from '@/app/utils/retryUtils';

/**
 * Store for managing workflow save state.
 * This ensures all components share the same save state across the app.
 *
 * Tracks both:
 * - `pendingSave`: Any save operation in progress
 * - `autoSaveState`: State of the debounced autosave scheduler
 *
 */
export const useWorkflowSaveStore = defineStore('workflowSave', () => {
	const autoSaveState = ref<AutoSaveState>(AutoSaveState.Idle);
	const pendingSave = ref<Promise<boolean> | null>(null);

	// Exponential backoff state
	const retryCount = ref(0);
	const retryDelay = ref(RETRY_START_DELAY);
	const isRetrying = ref(false);
	const lastError = ref<string | null>(null);
	const conflictModalShown = ref(false);

	function setAutoSaveState(state: AutoSaveState) {
		autoSaveState.value = state;
	}

	function setPendingSave(promise: Promise<boolean> | null) {
		pendingSave.value = promise;
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
		pendingSave.value = null;
		resetRetry();
	}

	return {
		autoSaveState,
		pendingSave,
		retryCount,
		retryDelay,
		isRetrying,
		lastError,
		conflictModalShown,
		setAutoSaveState,
		setPendingSave,
		incrementRetry,
		getRetryDelay,
		setRetrying,
		setLastError,
		setConflictModalShown,
		resetRetry,
		reset,
	};
});
