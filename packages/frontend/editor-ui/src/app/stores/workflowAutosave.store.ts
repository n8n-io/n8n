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

	const consecutiveFailures = ref(0);
	const isPaused = ref(false);
	const lastError = ref<{ message: string; timestamp: number } | null>(null);

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
	}

	function setLastError(message: string) {
		lastError.value = { message, timestamp: Date.now() };
	}

	function resumeAutosave() {
		isPaused.value = false;
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
		setAutoSaveState,
		setPendingAutoSave,
		incrementFailureCount,
		resetFailures,
		setLastError,
		resumeAutosave,
		reset,
	};
});
