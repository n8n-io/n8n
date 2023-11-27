import { useCloudPlanStore } from '@/stores/cloudPlan.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useRootStore } from '@/stores/n8nRoot.store';
import { useSettingsStore } from '@/stores/settings.store';
import { useSourceControlStore } from '@/stores/sourceControl.store';
import { useUsersStore } from '@/stores/users.store';
import { initializeCloudHooks } from '@/hooks/register';

let coreInitialized = false;
let authenticatedFeaturesInitialized = false;

/**
 * Initializes the core application stores and hooks
 * This is called once, when the first route is loaded.
 */
export async function initializeCore() {
	if (coreInitialized) {
		return;
	}

	const settingsStore = useSettingsStore();
	const cloudPlanStore = useCloudPlanStore();
	const usersStore = useUsersStore();

	await settingsStore.initialize();
	await usersStore.initialize();
	if (settingsStore.isCloudDeployment) {
		await Promise.all([cloudPlanStore.initialize(), initializeCloudHooks()]);
	}

	coreInitialized = true;
}

/**
 * Initializes the features of the application that require an authenticated user
 */
export async function initializeAuthenticatedFeatures() {
	if (authenticatedFeaturesInitialized) {
		return;
	}

	const usersStore = useUsersStore();
	if (!usersStore.currentUser) {
		return;
	}

	const sourceControlStore = useSourceControlStore();
	const settingsStore = useSettingsStore();
	const rootStore = useRootStore();
	const nodeTypesStore = useNodeTypesStore();

	if (sourceControlStore.isEnterpriseSourceControlEnabled) {
		await sourceControlStore.getPreferences();
	}

	if (settingsStore.isTemplatesEnabled) {
		try {
			await settingsStore.testTemplatesEndpoint();
		} catch (e) {}
	}

	if (rootStore.defaultLocale !== 'en') {
		await nodeTypesStore.getNodeTranslationHeaders();
	}

	authenticatedFeaturesInitialized = true;
}
