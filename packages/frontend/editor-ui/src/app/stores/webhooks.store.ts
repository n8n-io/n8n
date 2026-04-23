import { STORES } from '@n8n/stores';
import { defineStore } from 'pinia';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useNDVStore } from '@/features/ndv/shared/ndv.store';
import { createWorkflowDocumentId } from '@/app/stores/workflowDocument.store';
import { useUIStore } from './ui.store';
import { useUsersStore } from '@/features/settings/users/users.store';
import { useWorkflowsStore } from './workflows.store';
import { useSettingsStore } from './settings.store';

export const useWebhooksStore = defineStore(STORES.WEBHOOKS, () => {
	const workflowsStore = useWorkflowsStore();
	return {
		...useRootStore(),
		...workflowsStore,
		...useUIStore(),
		...useUsersStore(),
		...useNDVStore(createWorkflowDocumentId(workflowsStore.workflowId)),
		...useSettingsStore(),
	};
});
