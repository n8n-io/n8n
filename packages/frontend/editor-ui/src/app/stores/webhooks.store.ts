import { STORES } from '@n8n/stores';
import { defineStore } from 'pinia';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useUIStore } from './ui.store';
import { useUsersStore } from '@/features/settings/users/users.store';
import { useWorkflowsStore } from './workflows.store';
import { useSettingsStore } from './settings.store';

// Bag of global stores exposed to external hooks (cloud/EE) via runExternalHook.
// Per-workflow state (e.g., NDV) is NOT included here — it is resolved by the
// hook runner at invocation time so it is scoped to the active workflow.
export const useWebhooksStore = defineStore(STORES.WEBHOOKS, () => {
	return {
		...useRootStore(),
		...useWorkflowsStore(),
		...useUIStore(),
		...useUsersStore(),
		...useSettingsStore(),
	};
});
