import '@/app/polyfills';
import SourceControlInitializationErrorMessage from '@/features/integrations/sourceControl.ee/components/SourceControlInitializationErrorMessage.vue';
import { useExternalHooks } from '@/app/composables/useExternalHooks';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useToast } from '@/app/composables/useToast';
import { EnterpriseEditionFeature, VIEWS } from '@/app/constants';
import type { UserManagementAuthenticationMethod } from '@/Interface';
import {
	registerModuleModals,
	registerModuleProjectTabs,
	registerModuleResources,
	registerModuleSettingsPages,
} from '@/app/moduleInitializer/moduleInitializer';
import { useCloudPlanStore } from '@/app/stores/cloudPlan.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useNpsSurveyStore } from '@/app/stores/npsSurvey.store';
import { usePostHog } from '@/app/stores/posthog.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useRBACStore } from '@/app/stores/rbac.store';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useSourceControlStore } from '@/features/integrations/sourceControl.ee/sourceControl.store';
import { useSSOStore } from '@/features/settings/sso/sso.store';
import { useUsersStore } from '@/features/settings/users/users.store';
import { useVersionsStore } from '@/app/stores/versions.store';
import { useBannersStore } from '@/features/shared/banners/banners.store';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { h } from 'vue';
import { useRolesStore } from '@/app/stores/roles.store';
import { useDataTableStore } from '@/features/core/dataTable/dataTable.store';
import { hasPermission } from '@/app/utils/rbac/permissions';

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
	const versionsStore = useVersionsStore();
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
		console.error('Failed to initialize settings store', error);
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

	versionsStore.initialize(settingsStore.settings.versionNotifications);

	if (!settingsStore.isPreviewMode) {
		await usersStore.initialize();
	}

	void useExternalHooks().run('app.mount');

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
	const bannersStore = useBannersStore();
	const versionsStore = useVersionsStore();
	const dataTableStore = useDataTableStore();

	if (!settingsStore.isPreviewMode) {
		usersStore.setUserQuota(settingsStore.userManagement.quota);
	}

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

	if (settingsStore.isEnterpriseFeatureEnabled.showNonProdBanner) {
		bannersStore.pushBannerToStack('NON_PRODUCTION_LICENSE');
	}

	if (
		settingsStore.settings.banners &&
		!settingsStore.settings.banners.dismissed.includes('V1') &&
		settingsStore.settings.versionCli.startsWith('1.')
	) {
		bannersStore.pushBannerToStack('V1');
	}

	if (settingsStore.isCloudDeployment) {
		void cloudPlanStore
			.initialize()
			.then(() => {
				if (cloudPlanStore.userIsTrialing) {
					if (cloudPlanStore.trialExpired) {
						bannersStore.pushBannerToStack('TRIAL_OVER');
					} else {
						if (!cloudPlanStore.isTrialUpgradeOnSidebar) {
							bannersStore.pushBannerToStack('TRIAL');
						}
					}
				} else if (cloudPlanStore.currentUserCloudInfo?.confirmed === false) {
					bannersStore.pushBannerToStack('EMAIL_CONFIRMATION');
				}
			})
			.catch((error) => {
				console.error('Failed to initialize cloud plan store:', error);
			});
	}

	if (
		settingsStore.isDataTableFeatureEnabled &&
		hasPermission(['rbac'], { rbac: { scope: 'dataTable:list' } })
	) {
		void dataTableStore
			.fetchDataTableSize()
			.then(({ quotaStatus }) => {
				if (quotaStatus === 'error') {
					bannersStore.pushBannerToStack('DATA_TABLE_STORAGE_LIMIT_ERROR');
				} else if (quotaStatus === 'warn') {
					bannersStore.pushBannerToStack('DATA_TABLE_STORAGE_LIMIT_WARNING');
				}
			})
			.catch((error) => {
				console.error('Failed to fetch data table limits:', error);
			});
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
	const bannersStore = useBannersStore();
	const npsSurveyStore = useNpsSurveyStore();
	const telemetry = useTelemetry();
	const RBACStore = useRBACStore();
	const settingsStore = useSettingsStore();

	usersStore.registerLoginHook(async (user) => {
		await settingsStore.getSettings();

		RBACStore.setGlobalScopes(user.globalScopes ?? []);
		telemetry.identify(rootStore.instanceId, user.id, rootStore.versionCli);
		postHogStore.init(user.featureFlags);
		npsSurveyStore.setupNpsSurveyOnLogin(user.id, user.settings);
		void settingsStore.getModuleSettings();
		void bannersStore.loadDynamicBanners();
	});

	usersStore.registerLogoutHook(() => {
		bannersStore.clearBannerStack();
		npsSurveyStore.resetNpsSurveyOnLogOut();
		postHogStore.reset();
		cloudPlanStore.reset();
		telemetry.reset();
		RBACStore.setGlobalScopes([]);
	});
}
