import SourceControlInitializationErrorMessage from '@/features/integrations/sourceControl.ee/components/SourceControlInitializationErrorMessage.vue';
import { useExternalHooks } from '@/app/composables/useExternalHooks';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useToast } from '@/app/composables/useToast';
import { VIEWS } from '@/app/constants';
import { useInsightsStore } from '@/features/execution/insights/insights.store';
import type { UserManagementAuthenticationMethod } from '@/Interface';
import {
	registerModuleModals,
	registerModuleProjectTabs,
	registerModuleResources,
	registerModuleSettingsPages,
} from '@/app/moduleInitializer/moduleInitializer';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useNpsSurveyStore } from '@/app/stores/npsSurvey.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useRBACStore } from '@/app/stores/rbac.store';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useSourceControlStore } from '@/features/integrations/sourceControl.ee/sourceControl.store';
import { useSSOStore } from '@/features/settings/sso/sso.store';
import { useUsersStore } from '@/features/settings/users/users.store';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { h } from 'vue';
import { useRolesStore } from '@/app/stores/roles.store';
import { useDataTableStore } from '@/features/core/dataTable/dataTable.store';

export const state = {
	initialized: false,
};
let authenticatedFeaturesInitialized = false;

/**
 * Initializes the core application stores and hooks
 * This is called once, when the first route is loaded.
 */
export async function initializeCore() {
	if (state.initialized) {
		return;
	}

	const settingsStore = useSettingsStore();
	const usersStore = useUsersStore();
	const ssoStore = useSSOStore();

	const toast = useToast();
	const i18n = useI18n();

	registerAuthenticationHooks();

	/**
	 * Initialize stores
	 */

	try {
		await settingsStore.initialize();
	} catch (error) {
		toast.showToast({
			title: i18n.baseText('startupError'),
			message: i18n.baseText('startupError.message'),
			type: 'error',
			duration: 0,
		});
	}

	ssoStore.initialize({
		authenticationMethod: settingsStore.userManagement
			.authenticationMethod as UserManagementAuthenticationMethod,
		config: settingsStore.settings.sso,
		features: {
			saml: true,
			ldap: true,
			oidc: true,
		},
	});

	void useExternalHooks().run('app.mount');

	if (!settingsStore.isPreviewMode) {
		await usersStore.initialize({
			quota: settingsStore.userManagement.quota,
		});
	}

	state.initialized = true;
}

/**
 * Initializes the features of the application that require an authenticated user
 */
export async function initializeAuthenticatedFeatures(
	initialized: boolean = authenticatedFeaturesInitialized,
	routeName?: string,
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
	const projectsStore = useProjectsStore();
	const rolesStore = useRolesStore();
	const insightsStore = useInsightsStore();
	const dataTableStore = useDataTableStore();

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

	if (rootStore.defaultLocale !== 'en') {
		await nodeTypesStore.getNodeTranslationHeaders();
	}

	if (settingsStore.isDataTableFeatureEnabled) {
		void dataTableStore.fetchDataTableSize().catch((error) => {
			console.error('Failed to fetch data table limits:', error);
		});
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

	// Initialize modules
	registerModuleResources();
	registerModuleProjectTabs();
	registerModuleModals();
	registerModuleSettingsPages();

	authenticatedFeaturesInitialized = true;
}

function registerAuthenticationHooks() {
	const rootStore = useRootStore();
	const usersStore = useUsersStore();
	const npsSurveyStore = useNpsSurveyStore();
	const telemetry = useTelemetry();
	const RBACStore = useRBACStore();
	const settingsStore = useSettingsStore();

	usersStore.registerLoginHook(async (user) => {
		await settingsStore.getSettings();

		RBACStore.setGlobalScopes(user.globalScopes ?? []);
		telemetry.identify(rootStore.instanceId, user.id, rootStore.versionCli);
		npsSurveyStore.setupNpsSurveyOnLogin(user.id, user.settings);
		void settingsStore.getModuleSettings();
	});

	usersStore.registerLogoutHook(() => {
		npsSurveyStore.resetNpsSurveyOnLogOut();
		telemetry.reset();
		RBACStore.setGlobalScopes([]);
	});
}
