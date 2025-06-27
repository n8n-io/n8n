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
import { useI18n } from '@n8n/i18n';
import SourceControlInitializationErrorMessage from '@/components/SourceControlInitializationErrorMessage.vue';
import { useSSOStore } from '@/stores/sso.store';
import { EnterpriseEditionFeature } from '@/constants';
import type { UserManagementAuthenticationMethod } from '@/Interface';
import { useUIStore } from '@/stores/ui.store';
import type { BannerName } from '@n8n/api-types';
import { useNpsSurveyStore } from '@/stores/npsSurvey.store';
import { usePostHog } from '@/stores/posthog.store';
import { useTelemetry } from '@/composables/useTelemetry';
import { useRBACStore } from '@/stores/rbac.store';

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

		void versionsStore.checkForNewVersions();
	}

	state.initialized = true;
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
	const uiStore = useUIStore();

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
		try {
			await cloudPlanStore.initialize();

			if (cloudPlanStore.userIsTrialing) {
				if (cloudPlanStore.trialExpired) {
					uiStore.pushBannerToStack('TRIAL_OVER');
				} else {
					uiStore.pushBannerToStack('TRIAL');
				}
			} else if (!cloudPlanStore.currentUserCloudInfo?.confirmed) {
				uiStore.pushBannerToStack('EMAIL_CONFIRMATION');
			}
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

function registerAuthenticationHooks() {
	const rootStore = useRootStore();
	const usersStore = useUsersStore();
	const cloudPlanStore = useCloudPlanStore();
	const postHogStore = usePostHog();
	const uiStore = useUIStore();
	const npsSurveyStore = useNpsSurveyStore();
	const telemetry = useTelemetry();
	const RBACStore = useRBACStore();

	usersStore.registerLoginHook((user) => {
		RBACStore.setGlobalScopes(user.globalScopes ?? []);
		telemetry.identify(rootStore.instanceId, user.id);
		postHogStore.init(user.featureFlags);
		npsSurveyStore.setupNpsSurveyOnLogin(user.id, user.settings);
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
