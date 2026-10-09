import { useMessage } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRouter } from 'vue-router';

import { AutoSaveState, MODAL_CONFIRM } from '@/app/constants';
import { useWorkflowSaving } from '@/app/composables/useWorkflowSaving';
import { useUIStore } from '@/app/stores/ui.store';
import { useWorkflowSaveStore } from '@/app/stores/workflowSave.store';

/**
 * A move exports the saved workflow, so the editor saves its changes first. The user decides:
 * a save can also change what other people see.
 */
export function useSaveBeforeMove() {
	const i18n = useI18n();
	const message = useMessage();
	const uiStore = useUIStore();
	const saveStore = useWorkflowSaveStore();
	const { saveCurrentWorkflow, cancelAutoSave } = useWorkflowSaving({ router: useRouter() });

	async function confirmSave(place: string): Promise<boolean> {
		const choice = await message.confirm(
			i18n.baseText('linkedInstances.transfer.unsaved.message', { interpolate: { place } }),
			i18n.baseText('linkedInstances.transfer.unsaved.title'),
			{
				type: 'warning',
				confirmButtonText: i18n.baseText('linkedInstances.transfer.unsaved.confirm'),
				cancelButtonText: i18n.baseText('generic.cancel'),
			},
		);
		return choice === MODAL_CONFIRM;
	}

	/** An autosave that runs now can hold every change, so it ends first. */
	async function settleAutoSave(): Promise<void> {
		if (saveStore.autoSaveState === AutoSaveState.InProgress && saveStore.pendingSave) {
			// A failed autosave leaves the editor dirty, so the check below still sees the changes.
			await saveStore.pendingSave.catch(() => false);
		}
	}

	/**
	 * Asks to save when the editor has changes, then saves them.
	 * @param place the name of the linked instance, for the question
	 * @returns true when the saved workflow holds every change
	 */
	async function ensureSaved(place: string): Promise<boolean> {
		await settleAutoSave();
		if (!uiStore.stateIsDirty) return true;
		if (!(await confirmSave(place))) return false;
		if (saveStore.autoSaveState === AutoSaveState.Scheduled) cancelAutoSave();
		return await saveCurrentWorkflow({}, false);
	}

	return { ensureSaved };
}
