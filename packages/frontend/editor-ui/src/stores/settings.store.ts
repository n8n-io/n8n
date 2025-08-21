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
import { testHealthEndpoint } from '@n8n/rest-api-client/api/templates';
import {
	INSECURE_CONNECTION_WARNING,
	LOCAL_STORAGE_EXPERIMENTAL_DOCKED_NODE_SETTINGS,
} from '@/constants';
import { STORES } from '@n8n/stores';
import { UserManagementAuthenticationMethod } from '@/Interface';
import type { IDataObject, WorkflowSettings } from 'n8n-workflow';
import { defineStore } from 'pinia';
import { useRootStore } from '@n8n/stores/useRootStore';
import { makeRestApiRequest } from '@n8n/rest-api-client';
import { useLocalStorage } from '@vueuse/core';

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

	const isEnterpriseFeatureEnabled = computed(() => settings.value.enterprise);

	const nodeJsVersion = computed(() => settings.value.nodeJsVersion);

	const concurrency = computed(() => settings.value.concurrency);

	const isConcurrencyEnabled = computed(() => concurrency.value !== -1);

	const isPublicApiEnabled = computed(() => api.value.enabled);

	const isSwaggerUIEnabled = computed(() => api.value.swaggerUi.enabled);

	const isPreviewMode = computed(() => settings.value.previewMode);

	const publicApiLatestVersion = computed(() => api.value.latestVersion);

	const publicApiPath = computed(() => api.value.path);

	const isAiAssistantEnabled = computed(() => settings.value.aiAssistant?.enabled);

	const isAskAiEnabled = computed(() => settings.value.askAi?.enabled);

	const showSetupPage = computed(() => userManagement.value.showSetupOnFirstLoad);

	const deploymentType = computed(() => settings.value.deployment?.type || 'default');

	const isCloudDeployment = computed(() => settings.value.deployment?.type === 'cloud');

	const activeModules = computed(() => settings.value.activeModules);

	const isModuleActive = (moduleName: string) => {
		return activeModules.value.includes(moduleName);
	};

	const partialExecutionVersion = computed<1 | 2>(() => {
		const defaultVersion = settings.value.partialExecution?.version ?? 1;
		// -1 means we pick the defaultVersion
		//  1 is the old flow
		//  2 is the new flow
		const userVersion = useLocalStorage('PartialExecution.version', -1).value;
		const version = userVersion === -1 ? defaultVersion : userVersion;

		// For backwards compatibility, e.g. if the user has 0 in their local
		// storage, which used to be allowed, but not anymore.
		if (![1, 2].includes(version)) {
			return 1;
		}

		return version as 1 | 2;
	});

	const isAiCreditsEnabled = computed(() => settings.value.aiCredits?.enabled);

	const aiCreditsQuota = computed(() => settings.value.aiCredits?.credits);

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

	const areTagsEnabled = computed(() =>
		settings.value.workflowTagsDisabled !== undefined ? !settings.value.workflowTagsDisabled : true,
	);

	const isHiringBannerEnabled = computed(() => settings.value.hiringBannerEnabled);

	const isTemplatesEnabled = computed(() =>
		Boolean(settings.value.templates && settings.value.templates.enabled),
	);

	const isTemplatesEndpointReachable = computed(() => templatesEndpointHealthy.value);

	const templatesHost = computed(() => settings.value.templates.host);

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

	const setSettings = (newSettings: FrontendSettings) => {
		settings.value = newSettings;
		userManagement.value = newSettings.userManagement;
		if (userManagement.value) {
			userManagement.value.showSetupOnFirstLoad =
				!!settings.value.userManagement.showSetupOnFirstLoad;
		}
		api.value = settings.value.publicApi;
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
		settings.value.communityNodesEnabled = fetchedSettings.communityNodesEnabled;
		settings.value.unverifiedCommunityNodesEnabled =
			fetchedSettings.unverifiedCommunityNodesEnabled;
		setAllowedModules(fetchedSettings.allowedModules);
		setSaveDataErrorExecution(fetchedSettings.saveDataErrorExecution);
		setSaveDataSuccessExecution(fetchedSettings.saveDataSuccessExecution);
		setSaveDataProgressExecution(fetchedSettings.saveExecutionProgress);
		setSaveManualExecutions(fetchedSettings.saveManualExecutions);

		isMFAEnforced.value = settings.value.mfa?.enforced ?? false;

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
		rootStore.setDefaultLocale(fetchedSettings.defaultLocale);
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

		await getModuleSettings();
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

	/**
	 * (Experimental) If set to true, show node settings for a selected node in docked pane
	 */
	const experimental__dockedNodeSettingsEnabled = useLocalStorage(
		LOCAL_STORAGE_EXPERIMENTAL_DOCKED_NODE_SETTINGS,
		false,
		{ writeDefaults: false },
	);

	return {
		settings,
		userManagement,
		templatesEndpointHealthy,
		api,
		mfa,
		isDocker,
		isDevRelease,
		isEnterpriseFeatureEnabled,
		databaseType,
		planName,
		consumerId,
		binaryDataMode,
		pruning,
		security,
		nodeJsVersion,
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
		isAiCreditsEnabled,
		aiCreditsQuota,
		experimental__dockedNodeSettingsEnabled,
		partialExecutionVersion,
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
		isMFAEnforcementLicensed,
		isMFAEnforced,
		activeModules,
		isModuleActive,
	};
});
