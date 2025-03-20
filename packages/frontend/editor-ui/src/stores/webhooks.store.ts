import { STORES } from '@/constants';
import { defineStore } from 'pinia';
import { useRootStore } from './root.store';
import { useNDVStore } from './ndv.store';
import { useUIStore } from './ui.store';
import { useUsersStore } from './users.store';
import { useWorkflowsStore } from './workflows.store';
import { useSettingsStore } from './settings.store';

export const useWebhooksStore = defineStore(STORES.WEBHOOKS, () => {
	return {
		...useRootStore(),
		...useWorkflowsStore(),
		...useUIStore(),
		...useUsersStore(),
		...useNDVStore(),
		...useSettingsStore(),
	};
});
