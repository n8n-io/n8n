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
import { useRouteWorkflowId } from '@/app/composables/useWorkflowId';

export const useWebhooksStore = defineStore(STORES.WEBHOOKS, () => {
	const routeWorkflowId = useRouteWorkflowId();

	// Reactive lookups: re-evaluate when the route's workflow id changes,
	// so external consumers always see the current workflow's stores.
	const workflowDocumentStore = computed(() =>
		useWorkflowDocumentStore(createWorkflowDocumentId(routeWorkflowId.value)),
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
