import {
	useDocumentTitle as useDocumentTitleBase,
	type WorkflowTitleStatus,
} from '@n8n/composables/useDocumentTitle';
import { useSettingsStore } from '@/app/stores/settings.store';
import type { Ref } from 'vue';

export type { WorkflowTitleStatus };

export function useDocumentTitle(windowRef?: Ref<Window | undefined>) {
	const settingsStore = useSettingsStore();
	const { releaseChannel } = settingsStore.settings;
	return useDocumentTitleBase({ releaseChannel, windowRef });
}
