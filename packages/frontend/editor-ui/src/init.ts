import { h } from 'vue';
import { useCloudPlanStore } from '@/stores/cloudPlan.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useSettingsStore } from '@/stores/settings.store';
import { useSourceControlStore } from '@/stores/sourceControl.store';
import { useUsersStore } from '@/stores/users.store';
import { useExternalHooks } from '@/composables/useExternalHooks';
import { useVersionsStore } from '@/stores/versions.store';
import { useProjectsStore } from '@/stores/projects.store';
import { useRolesStore } from './stores/roles.store';
import { useInsightsStore } from '@/features/insights/insights.store';
import { useToast } from '@/composables/useToast';
import { useI18n } from '@/composables/useI18n';
import SourceControlInitializationErrorMessage from '@/components/SourceControlInitializationErrorMessage.vue';

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
	const usersStore = useUsersStore();
	const versionsStore = useVersionsStore();

	await settingsStore.initialize();

	void useExternalHooks().run('app.mount');

	if (!settingsStore.isPreviewMode) {
		await usersStore.initialize();

		void versionsStore.checkForNewVersions();
	}

	coreInitialized = true;
}

/**
 * Initializes the features of the application that require an authenticated user
 */
export async function initializeAuthenticatedFeatures(
	initialized: boolean = authenticatedFeaturesInitialized,
) {
	if (initialized) {
		return;
	}

	const usersStore = useUsersStore();
	if (!usersStore.currentUser) {
		return;
	}

	const i18n = useI18n();
	const toast = useToast();
	const sourceControlStore = useSourceControlStore();
	const settingsStore = useSettingsStore();
	const rootStore = useRootStore();
	const nodeTypesStore = useNodeTypesStore();
	const cloudPlanStore = useCloudPlanStore();
	const projectsStore = useProjectsStore();
	const rolesStore = useRolesStore();
	const insightsStore = useInsightsStore();

	if (sourceControlStore.isEnterpriseSourceControlEnabled) {
		try {
			await sourceControlStore.getPreferences();
		} catch (e) {
			toast.showMessage({
				title: i18n.baseText('settings.sourceControl.connection.error'),
				message: h(SourceControlInitializationErrorMessage),
				type: 'error',
				duration: 0,
			});
			console.error('Failed to initialize source control store', e);
		}
	}

	if (settingsStore.isTemplatesEnabled) {
		try {
			await settingsStore.testTemplatesEndpoint();
		} catch (e) {}
	}

	if (rootStore.defaultLocale !== 'en') {
		await nodeTypesStore.getNodeTranslationHeaders();
	}

	if (settingsStore.isCloudDeployment) {
		try {
			await cloudPlanStore.initialize();
		} catch (e) {
			console.error('Failed to initialize cloud plan store:', e);
		}
	}

	if (insightsStore.isSummaryEnabled) {
		void insightsStore.weeklySummary.execute();
	}

	await Promise.all([
		projectsStore.getMyProjects(),
		projectsStore.getPersonalProject(),
		projectsStore.getProjectsCount(),
		rolesStore.fetchRoles(),
	]);

	authenticatedFeaturesInitialized = true;
}
