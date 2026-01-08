import type { Ref } from 'vue';
import { useDocumentTitle as useBaseDocumentTitle } from '@n8n/composables/useDocumentTitle';
import { useSettingsStore } from '@/app/stores/settings.store';

export type { WorkflowTitleStatus } from '@n8n/composables/useDocumentTitle';

/**
 * A composable that wraps useDocumentTitle from @n8n/composables
 * and automatically provides the releaseChannel from the settings store.
 *
 * @param windowRef - Optional window reference for pop-out windows
 * @returns The document title utilities (set, reset, setDocumentTitle)
 */
export function useDocumentTitle(windowRef?: Ref<Window | undefined>) {
	const settingsStore = useSettingsStore();

	return useBaseDocumentTitle({
		releaseChannel: settingsStore.settings.releaseChannel,
		windowRef,
	});
}
