import SourceControlInitializationErrorMessage from '@/features/sourceControl.ee/components/SourceControlInitializationErrorMessage.vue';
import { useExternalHooks } from '@/composables/useExternalHooks';
import { useTelemetry } from '@/composables/useTelemetry';
import { useToast } from '@/composables/useToast';
import { EnterpriseEditionFeature, VIEWS } from '@/constants';
import { useInsightsStore } from '@/features/insights/insights.store';
import type { UserManagementAuthenticationMethod } from '@/Interface';
import {
	registerModuleModals,
	registerModuleProjectTabs,
	registerModuleResources,
	registerModuleSettingsPages,
} from '@/moduleInitializer/moduleInitializer';
import { useCloudPlanStore } from '@/stores/cloudPlan.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useNpsSurveyStore } from '@/stores/npsSurvey.store';
import { usePostHog } from '@/stores/posthog.store';
import { useProjectsStore } from '@/features/projects/projects.store';
import { useRBACStore } from '@/stores/rbac.store';
import { useSettingsStore } from '@/stores/settings.store';
import { useSourceControlStore } from '@/features/sourceControl.ee/sourceControl.store';
import { useSSOStore } from '@/features/sso/sso.store';
import { useUIStore } from '@/stores/ui.store';
import { useUsersStore } from '@/stores/users.store';
import { useVersionsStore } from '@/stores/versions.store';
import type { BannerName } from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { h } from 'vue';
import { useRolesStore } from './stores/roles.store';
import { useDataTableStore } from '@/features/dataTable/dataTable.store';

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
	const versionsStore = useVersionsStore();
	const ssoStore = useSSOStore();
	const uiStore = useUIStore();

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
			saml: settingsStore.isEnterpriseFeatureEnabled[EnterpriseEditionFeature.Saml],
			ldap: settingsStore.isEnterpriseFeatureEnabled[EnterpriseEditionFeature.Ldap],
			oidc: settingsStore.isEnterpriseFeatureEnabled[EnterpriseEditionFeature.Oidc],
		},
	});

	const banners: BannerName[] = [];
	if (settingsStore.isEnterpriseFeatureEnabled.showNonProdBanner) {
		banners.push('NON_PRODUCTION_LICENSE');
	}
	if (
		!(settingsStore.settings.banners?.dismissed || []).includes('V1') &&
		settingsStore.settings.versionCli.startsWith('1.')
	) {
		banners.push('V1');
	}
	uiStore.initialize({
		banners,
	});

	versionsStore.initialize(settingsStore.settings.versionNotifications);

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
	const cloudPlanStore = useCloudPlanStore();
	const projectsStore = useProjectsStore();
	const rolesStore = useRolesStore();
	const insightsStore = useInsightsStore();
	const uiStore = useUIStore();
	const versionsStore = useVersionsStore();
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

	if (settingsStore.isCloudDeployment) {
		void cloudPlanStore
			.initialize()
			.then(() => {
				if (cloudPlanStore.userIsTrialing) {
					if (cloudPlanStore.trialExpired) {
						uiStore.pushBannerToStack('TRIAL_OVER');
					} else {
						uiStore.pushBannerToStack('TRIAL');
					}
				} else if (cloudPlanStore.currentUserCloudInfo?.confirmed === false) {
					uiStore.pushBannerToStack('EMAIL_CONFIRMATION');
				}
			})
			.catch((error) => {
				console.error('Failed to initialize cloud plan store:', error);
			});
	}

	if (settingsStore.isDataTableFeatureEnabled) {
		void dataTableStore
			.fetchDataTableSize()
			.then(({ quotaStatus }) => {
				if (quotaStatus === 'error') {
					uiStore.pushBannerToStack('DATA_TABLE_STORAGE_LIMIT_ERROR');
				} else if (quotaStatus === 'warn') {
					uiStore.pushBannerToStack('DATA_TABLE_STORAGE_LIMIT_WARNING');
				}
			})
			.catch((error) => {
				console.error('Failed to fetch data table limits:', error);
			});
	}

	if (insightsStore.isSummaryEnabled) {
		void insightsStore.weeklySummary.execute();
	}

	// Don't check for new versions in preview mode or demo view (ex: executions iframe)
	if (!settingsStore.isPreviewMode && routeName !== VIEWS.DEMO) {
		void versionsStore.checkForNewVersions();
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
	const cloudPlanStore = useCloudPlanStore();
	const postHogStore = usePostHog();
	const uiStore = useUIStore();
	const npsSurveyStore = useNpsSurveyStore();
	const telemetry = useTelemetry();
	const RBACStore = useRBACStore();
	const settingsStore = useSettingsStore();

	usersStore.registerLoginHook((user) => {
		RBACStore.setGlobalScopes(user.globalScopes ?? []);
		telemetry.identify(rootStore.instanceId, user.id, rootStore.versionCli);
		postHogStore.init(user.featureFlags);
		npsSurveyStore.setupNpsSurveyOnLogin(user.id, user.settings);
		void settingsStore.getModuleSettings();
	});

	usersStore.registerLogoutHook(() => {
		uiStore.clearBannerStack();
		npsSurveyStore.resetNpsSurveyOnLogOut();
		postHogStore.reset();
		cloudPlanStore.reset();
		telemetry.reset();
		RBACStore.setGlobalScopes([]);
	});
}
