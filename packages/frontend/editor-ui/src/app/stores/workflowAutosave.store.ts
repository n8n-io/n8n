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

	function setAutoSaveState(state: AutoSaveState) {
		autoSaveState.value = state;
	}

	function setPendingAutoSave(promise: Promise<void> | null) {
		pendingAutoSave.value = promise;
	}

	function reset() {
		autoSaveState.value = AutoSaveState.Idle;
		pendingAutoSave.value = null;
	}

	return {
		autoSaveState,
		pendingAutoSave,
		setAutoSaveState,
		setPendingAutoSave,
		reset,
	};
});
