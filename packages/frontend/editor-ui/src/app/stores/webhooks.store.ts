import { STORES } from '@n8n/stores';
import { defineStore } from 'pinia';
import { computed } from 'vue';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useNDVStore } from '@/features/ndv/shared/ndv.store';
import {
	createWorkflowDocumentId,
	useWorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';
import { useUIStore } from './ui.store';
import { useUsersStore } from '@/features/settings/users/users.store';
import { useWorkflowsStore } from './workflows.store';
import { useSettingsStore } from './settings.store';

export const useWebhooksStore = defineStore(STORES.WEBHOOKS, () => {
	const workflowsStore = useWorkflowsStore();

	// Reactive lookups: re-evaluate when workflowsStore.workflowId changes,
	// so external consumers always see the current workflow's stores.
	const workflowDocumentStore = computed(() =>
		useWorkflowDocumentStore(createWorkflowDocumentId(workflowsStore.workflowId)),
	);
	const ndvStore = computed(() => useNDVStore(workflowDocumentStore.value.documentId));

	return {
		...useRootStore(),
		...useWorkflowsStore(),
		...useUIStore(),
		...useUsersStore(),
		workflowDocumentStore,
		ndvStore,
		...useSettingsStore(),
	};
});
