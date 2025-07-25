import { useDataStoreStore } from '@/features/dataStore/dataStore.store';

/**
 * Initialize all modules.
 * This is called in init.ts
 * Once we have a proper module loading mechanism,
 * replace this with something more sophisticated.
 */
export const initializeModules = () => {
	useDataStoreStore().initialize();
};
