import { computed, ref } from 'vue';
import Bowser from 'bowser';
import type {
	IUserManagementSettings,
	FrontendSettings,
	FrontendModuleSettings,
} from '@n8n/api-types';

import * as eventsApi from '@n8n/rest-api-client/api/events';
import * as settingsApi from '@n8n/rest-api-client/api/settings';
import * as moduleSettingsApi from '@n8n/rest-api-client/api/module-settings';
import * as aiUsageApi from '@n8n/rest-api-client/api/ai-usage';
import { testHealthEndpoint } from '@n8n/rest-api-client/api/templates';
import { INSECURE_CONNECTION_WARNING } from '@/app/constants';
import { STORES } from '@n8n/stores';
import { UserManagementAuthenticationMethod } from '@/Interface';
import type { IDataObject, WorkflowSettings } from 'n8n-workflow';
import { defineStore } from 'pinia';
import { useRootStore } from '@n8n/stores/useRootStore';
import { makeRestApiRequest } from '@n8n/rest-api-client';

export const useSettingsStore = defineStore(STORES.SETTINGS, () => {
	const initialized = ref(false);
	const settings = ref<FrontendSettings>({} as FrontendSettings);
	const moduleSettings = ref<FrontendModuleSettings>({});
	const userManagement = ref<IUserManagementSettings>({
		quota: -1,
		showSetupOnFirstLoad: false,
		smtpSetup: false,
		authenticationMethod: UserManagementAuthenticationMethod.Email,
	});
	const templatesEndpointHealthy = ref(false);
	const api = ref({
		enabled: false,
		latestVersion: 0,
		path: '/',
		swaggerUi: {
			enabled: false,
		},
	});
	const mfa = ref({ enabled: false });
	const folders = ref({ enabled: false });

	const saveDataErrorExecution = ref<WorkflowSettings.SaveDataExecution>('all');
	const saveDataSuccessExecution = ref<WorkflowSettings.SaveDataExecution>('all');
	const saveManualExecutions = ref(false);
	const saveDataProgressExecution = ref(false);
	const isMFAEnforced = ref(false);

	const isDocker = computed(() => settings.value?.isDocker ?? false);

	const databaseType = computed(() => settings.value?.databaseType);

	const planName = computed(() => settings.value?.license.planName ?? 'Community');

	const consumerId = computed(() => settings.value?.license.consumerId);

	const binaryDataMode = computed(() => settings.value?.binaryDataMode);

	const pruning = computed(() => settings.value?.pruning);

	const security = computed(() => ({
		blockFileAccessToN8nFiles: settings.value.security.blockFileAccessToN8nFiles,
		secureCookie: settings.value.authCookie.secure,
	}));

	const isEnterpriseFeatureEnabled = computed(() => settings.value.enterprise ?? {});

	const nodeJsVersion = computed(() => settings.value.nodeJsVersion);

	const nodeEnv = computed(() => settings.value.nodeEnv);

	const concurrency = computed(() => settings.value.concurrency);

	const isConcurrencyEnabled = computed(() => concurrency.value !== -1);

	const isPublicApiEnabled = computed(() => api.value.enabled);

	const isSwaggerUIEnabled = computed(() => api.value.swaggerUi.enabled);

	const isPreviewMode = computed(() => settings.value.previewMode);

	const publicApiLatestVersion = computed(() => api.value.latestVersion);

	const publicApiPath = computed(() => api.value.path);

	const isAiAssistantEnabled = computed(
		() => settings.value.aiAssistant?.enabled && settings.value.aiAssistant?.setup,
	);

	const isAskAiEnabled = computed(() => settings.value.askAi?.enabled);

	const isAiBuilderEnabled = computed(
		() => settings.value.aiBuilder?.enabled && settings.value.aiBuilder?.setup,
	);

	const isAiAssistantOrBuilderEnabled = computed(
		() => isAiAssistantEnabled.value || isAiBuilderEnabled.value,
	);

	const showSetupPage = computed(() => userManagement.value.showSetupOnFirstLoad);

	const deploymentType = computed(() => settings.value.deployment?.type || 'default');

	const isCloudDeployment = computed(() => settings.value.deployment?.type === 'cloud');

	const activeModules = computed(() => settings.value.activeModules);

	const isModuleActive = (moduleName: string) => {
		return activeModules.value?.includes(moduleName);
	};

	const isAiCreditsEnabled = computed(
		() => settings.value.aiCredits?.enabled && settings.value.aiCredits?.setup,
	);

	const aiCreditsQuota = computed(() => settings.value.aiCredits?.credits);

	const isAiDataSharingEnabled = computed(
		() => settings.value.ai?.allowSendingParameterValues ?? true,
	);

	const isSmtpSetup = computed(() => userManagement.value.smtpSetup);

	const isPersonalizationSurveyEnabled = computed(
		() => settings.value.telemetry?.enabled && settings.value.personalizationSurveyEnabled,
	);

	const telemetry = computed(() => settings.value.telemetry);

	const logLevel = computed(() => settings.value.logLevel);

	const isTelemetryEnabled = computed(
		() => settings.value.telemetry && settings.value.telemetry.enabled,
	);

	const isMFAEnforcementLicensed = computed(() => {
		return settings.value.enterprise?.mfaEnforcement ?? false;
	});

	const isMfaFeatureEnabled = computed(() => mfa.value.enabled);

	const isFoldersFeatureEnabled = computed(() => folders.value.enabled);

	const isDataTableFeatureEnabled = computed(() => isModuleActive('data-table'));

	const isChatFeatureEnabled = computed(() => isModuleActive('chat-hub'));

	const isCustomRolesFeatureEnabled = computed(
		() => settings.value.enterprise?.customRoles ?? false,
	);

	const areTagsEnabled = computed(() =>
		settings.value.workflowTagsDisabled !== undefined ? !settings.value.workflowTagsDisabled : true,
	);

	const isHiringBannerEnabled = computed(() => settings.value.hiringBannerEnabled);

	const isTemplatesEnabled = computed(() => Boolean(settings.value.templates?.enabled));

	const isTemplatesEndpointReachable = computed(() => templatesEndpointHealthy.value);

	const templatesHost = computed(() => settings.value.templates?.host ?? '');

	const pushBackend = computed(() => settings.value.pushBackend);

	const isCommunityNodesFeatureEnabled = computed(() => settings.value.communityNodesEnabled);

	const isUnverifiedPackagesEnabled = computed(
		() => settings.value.unverifiedCommunityNodesEnabled,
	);

	const allowedModules = computed(() => settings.value.allowedModules);

	const isQueueModeEnabled = computed(() => settings.value.executionMode === 'queue');
	const isMultiMain = computed(() => settings.value.isMultiMain);

	const isWorkerViewAvailable = computed(() => !!settings.value.enterprise?.workerView);

	const workflowCallerPolicyDefaultOption = computed(
		() => settings.value.workflowCallerPolicyDefaultOption,
	);

	const permanentlyDismissedBanners = computed(() => settings.value.banners?.dismissed ?? []);

	const isCommunityPlan = computed(() => planName.value.toLowerCase() === 'community');

	const isDevRelease = computed(() => settings.value.releaseChannel === 'dev');

	const endpointHealth = computed(() => settings.value.endpointHealth);

	const setSettings = (newSettings: FrontendSettings) => {
		settings.value = newSettings;

		userManagement.value = newSettings.userManagement;
		if (userManagement.value) {
			userManagement.value.showSetupOnFirstLoad =
				!!settings.value.userManagement.showSetupOnFirstLoad;
		}

		if (settings.value.publicApi) {
			api.value = settings.value.publicApi;
		}

		mfa.value.enabled = settings.value.mfa?.enabled;
		folders.value.enabled = settings.value.folders?.enabled;

		if (settings.value.versionCli) {
			useRootStore().setVersionCli(settings.value.versionCli);
		}

		if (settings.value.authCookie.secure) {
			const { browser } = Bowser.parse(navigator.userAgent);
			if (
				location.protocol === 'http:' &&
				(!['localhost', '127.0.0.1'].includes(location.hostname) || browser.name === 'Safari')
			) {
				document.write(INSECURE_CONNECTION_WARNING);
				return;
			}
		}
	};

	const setAllowedModules = (allowedModules: FrontendSettings['allowedModules']) => {
		settings.value.allowedModules = allowedModules;
	};

	const setSaveDataErrorExecution = (newValue: WorkflowSettings.SaveDataExecution) => {
		saveDataErrorExecution.value = newValue;
	};

	const setSaveDataSuccessExecution = (newValue: WorkflowSettings.SaveDataExecution) => {
		saveDataSuccessExecution.value = newValue;
	};

	const setSaveManualExecutions = (newValue: boolean) => {
		saveManualExecutions.value = newValue;
	};

	const setSaveDataProgressExecution = (newValue: boolean) => {
		saveDataProgressExecution.value = newValue;
	};

	const getSettings = async () => {
		const rootStore = useRootStore();
		const fetchedSettings = await settingsApi.getSettings(rootStore.restApiContext);

		setSettings(fetchedSettings);
		rootStore.setDefaultLocale(fetchedSettings.defaultLocale);

		// Set MFA enforced state even for public settings mode
		// as it is needed to determine if the MFA setup page should be shown
		isMFAEnforced.value = settings.value.mfa?.enforced ?? false;

		if (fetchedSettings.settingsMode === 'public') {
			// public settings mode is typically used for unauthenticated users
			// when public settings are returned we can skip the rest of the setup
			// that need the full set of authenticated settings
			return;
		}

		settings.value.communityNodesEnabled = fetchedSettings.communityNodesEnabled;
		settings.value.unverifiedCommunityNodesEnabled =
			fetchedSettings.unverifiedCommunityNodesEnabled;
		setAllowedModules(fetchedSettings.allowedModules);
		setSaveDataErrorExecution(fetchedSettings.saveDataErrorExecution);
		setSaveDataSuccessExecution(fetchedSettings.saveDataSuccessExecution);
		setSaveDataProgressExecution(fetchedSettings.saveExecutionProgress);
		setSaveManualExecutions(fetchedSettings.saveManualExecutions);

		rootStore.setUrlBaseWebhook(fetchedSettings.urlBaseWebhook);
		rootStore.setUrlBaseEditor(fetchedSettings.urlBaseEditor);
		rootStore.setEndpointForm(fetchedSettings.endpointForm);
		rootStore.setEndpointFormTest(fetchedSettings.endpointFormTest);
		rootStore.setEndpointFormWaiting(fetchedSettings.endpointFormWaiting);
		rootStore.setEndpointWebhook(fetchedSettings.endpointWebhook);
		rootStore.setEndpointWebhookTest(fetchedSettings.endpointWebhookTest);
		rootStore.setEndpointWebhookWaiting(fetchedSettings.endpointWebhookWaiting);
		rootStore.setEndpointMcp(fetchedSettings.endpointMcp);
		rootStore.setEndpointMcpTest(fetchedSettings.endpointMcpTest);
		rootStore.setTimezone(fetchedSettings.timezone);
		rootStore.setExecutionTimeout(fetchedSettings.executionTimeout);
		rootStore.setMaxExecutionTimeout(fetchedSettings.maxExecutionTimeout);
		rootStore.setInstanceId(fetchedSettings.instanceId);
		rootStore.setOauthCallbackUrls(fetchedSettings.oauthCallbackUrls);
		rootStore.setN8nMetadata(fetchedSettings.n8nMetadata || {});
		rootStore.setBinaryDataMode(fetchedSettings.binaryDataMode);

		if (fetchedSettings.telemetry.enabled) {
			void eventsApi.sessionStarted(rootStore.restApiContext);
		}
	};

	const initialize = async () => {
		if (initialized.value) {
			return;
		}

		await getSettings();

		initialized.value = true;
	};

	const stopShowingSetupPage = () => {
		userManagement.value.showSetupOnFirstLoad = false;
	};

	const disableTemplates = () => {
		settings.value = {
			...settings.value,
			templates: {
				...settings.value.templates,
				enabled: false,
			},
		};
	};

	const testTemplatesEndpoint = async () => {
		const timeout = new Promise((_, reject) => setTimeout(() => reject(), 2000));
		await Promise.race([testHealthEndpoint(templatesHost.value), timeout]);
		templatesEndpointHealthy.value = true;
	};

	const getTimezones = async (): Promise<IDataObject> => {
		const rootStore = useRootStore();
		return await makeRestApiRequest(rootStore.restApiContext, 'GET', '/options/timezones');
	};

	const reset = () => {
		settings.value = {} as FrontendSettings;
	};

	const getModuleSettings = async () => {
		const fetched = await moduleSettingsApi.getModuleSettings(useRootStore().restApiContext);
		moduleSettings.value = fetched;
	};

	const updateAiDataSharingSettings = async (allowSendingParameterValues: boolean) => {
		const rootStore = useRootStore();
		await aiUsageApi.updateAiUsageSettings(rootStore.restApiContext, {
			allowSendingParameterValues,
		});
		if (settings.value.ai) {
			settings.value.ai.allowSendingParameterValues = allowSendingParameterValues;
		}
	};

	return {
		settings,
		userManagement,
		templatesEndpointHealthy,
		api,
		mfa,
		isDocker,
		isDevRelease,
		endpointHealth,
		isEnterpriseFeatureEnabled,
		databaseType,
		planName,
		consumerId,
		binaryDataMode,
		pruning,
		security,
		nodeJsVersion,
		nodeEnv,
		concurrency,
		isConcurrencyEnabled,
		isPublicApiEnabled,
		isSwaggerUIEnabled,
		isPreviewMode,
		publicApiLatestVersion,
		publicApiPath,
		showSetupPage,
		deploymentType,
		isCloudDeployment,
		isSmtpSetup,
		isPersonalizationSurveyEnabled,
		telemetry,
		logLevel,
		isTelemetryEnabled,
		isMfaFeatureEnabled,
		isFoldersFeatureEnabled,
		isAiAssistantEnabled,
		isCustomRolesFeatureEnabled,
		areTagsEnabled,
		isHiringBannerEnabled,
		isTemplatesEnabled,
		isTemplatesEndpointReachable,
		templatesHost,
		pushBackend,
		isCommunityNodesFeatureEnabled,
		isUnverifiedPackagesEnabled,
		allowedModules,
		isQueueModeEnabled,
		isMultiMain,
		isWorkerViewAvailable,
		workflowCallerPolicyDefaultOption,
		permanentlyDismissedBanners,
		saveDataErrorExecution,
		saveDataSuccessExecution,
		saveManualExecutions,
		saveDataProgressExecution,
		isCommunityPlan,
		isAskAiEnabled,
		isAiBuilderEnabled,
		isAiAssistantOrBuilderEnabled,
		isAiCreditsEnabled,
		aiCreditsQuota,
		isAiDataSharingEnabled,
		reset,
		getTimezones,
		testTemplatesEndpoint,
		disableTemplates,
		stopShowingSetupPage,
		getSettings,
		setSettings,
		initialize,
		getModuleSettings,
		moduleSettings,
		updateAiDataSharingSettings,
		isMFAEnforcementLicensed,
		isMFAEnforced,
		activeModules,
		isModuleActive,
		isDataTableFeatureEnabled,
		isChatFeatureEnabled,
	};
});
