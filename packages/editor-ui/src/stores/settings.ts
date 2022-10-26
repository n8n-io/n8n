import { createApiKey, deleteApiKey, getApiKey } from "@/api/api-keys";
import { getPromptsData, getSettings, submitContactInfo, submitValueSurvey } from "@/api/settings";
import { testHealthEndpoint } from "@/api/templates";
import { CONTACT_PROMPT_MODAL_KEY, EnterpriseEditionFeature, STORES, VALUE_SURVEY_MODAL_KEY } from "@/constants";
import { ILogLevel, IN8nPromptResponse, IN8nPrompts, IN8nUISettings, IN8nValueSurveyData, ISettingsState } from "@/Interface";
import { ITelemetrySettings } from "n8n-workflow";
import { defineStore } from "pinia";
import Vue from "vue";
import { useRootStore } from "./n8nRootStore";
import { useUIStore } from "./ui";
import { useUsersStore } from "./users";

export const useSettingsStore = defineStore(STORES.SETTINGS, {
	state: (): ISettingsState => ({
		settings: {} as IN8nUISettings,
		promptsData: {} as IN8nPrompts,
		userManagement: {
			enabled: false,
			showSetupOnFirstLoad: false,
			smtpSetup: false,
		},
		templatesEndpointHealthy: false,
		api: {
			enabled: false,
			latestVersion: 0,
			path: '/',
		},
		onboardingCallPromptEnabled: false,
	}),
	getters: {
		isEnterpriseFeatureEnabled: (state: ISettingsState) => (feature: EnterpriseEditionFeature): boolean => {
			return state.settings.enterprise[feature];
		},
		versionCli: (state: ISettingsState): string => {
			return state.settings.versionCli;
		},
		isUserManagementEnabled(state: ISettingsState): boolean {
			return state.userManagement.enabled;
		},
		isPublicApiEnabled(state: ISettingsState): boolean {
			return state.api.enabled;
		},
		publicApiLatestVersion(state: ISettingsState): number {
			return state.api.latestVersion;
		},
		publicApiPath(state: ISettingsState): string {
			return state.api.path;
		},
		showSetupPage(state: ISettingsState) {
			return state.userManagement.showSetupOnFirstLoad;
		},
		isDesktopDeployment(state: ISettingsState) {
			return state.settings.deployment?.type.startsWith('desktop_');
		},
		isCloudDeployment(state: ISettingsState) {
			return state.settings.deployment && state.settings.deployment.type === 'cloud';
		},
		isSmtpSetup(state: ISettingsState) {
			return state.userManagement.smtpSetup;
		},
		isPersonalizationSurveyEnabled(state: ISettingsState) {
			return (state.settings.telemetry && state.settings.telemetry.enabled) && state.settings.personalizationSurveyEnabled;
		},
		telemetry: (state): ITelemetrySettings => {
			return state.settings.telemetry;
		},
		logLevel: (state): ILogLevel => {
			return state.settings.logLevel;
		},
		isTelemetryEnabled: (state) => {
			return state.settings.telemetry && state.settings.telemetry.enabled;
		},
		areTagsEnabled: (state) => {
			return state.settings.workflowTagsDisabled !== undefined ? !state.settings.workflowTagsDisabled : true;
		},
		isHiringBannerEnabled: (state): boolean => {
			return state.settings.hiringBannerEnabled;
		},
		isTemplatesEnabled: (state): boolean => {
			return Boolean(state.settings.templates && state.settings.templates.enabled);
		},
		isTemplatesEndpointReachable: (state): boolean => {
			return state.templatesEndpointHealthy;
		},
		templatesHost: (state): string  => {
			return state.settings.templates.host;
		},
		isCommunityNodesFeatureEnabled: (state): boolean => {
			return state.settings.communityNodesEnabled;
		},
		isNpmAvailable: (state): boolean => {
			return state.settings.isNpmAvailable;
		},
		allowedModules: (state): { builtIn?: string[]; external?: string[] } => {
			return state.settings.allowedModules;
		},
		isQueueModeEnabled: (state): boolean => {
			return state.settings.executionMode === 'queue';
		},
	},
	actions: {
		setSettings(settings: IN8nUISettings): void {
			this.settings =  settings;
			this.userManagement.enabled = settings.userManagement.enabled;
			this.userManagement.showSetupOnFirstLoad = !!settings.userManagement.showSetupOnFirstLoad;
			this.userManagement.smtpSetup = settings.userManagement.smtpSetup;
			this.api.enabled = settings.publicApi.enabled;
			this.api.latestVersion = settings.publicApi.latestVersion;
			this.api.path = settings.publicApi.path;
			this.onboardingCallPromptEnabled = settings.onboardingCallPromptEnabled;
		},
		async getSettings(): Promise<void> {
			const rootStore = useRootStore();
			const settings = await getSettings(rootStore.getRestApiContext);

			this.setSettings(settings);
			this.settings.communityNodesEnabled = settings.communityNodesEnabled;
			// TODO: This will need to be updated on interface level once vuex store in removed
			this.setAllowedModules(settings.allowedModules as { builtIn?: string, external?: string });

			rootStore.urlBaseWebhook = settings.urlBaseWebhook;
			rootStore.urlBaseEditor = settings.urlBaseEditor;
			rootStore.endpointWebhook = settings.endpointWebhook;
			rootStore.endpointWebhookTest = settings.endpointWebhookTest;
			rootStore.saveDataErrorExecution = settings.saveDataErrorExecution;
			rootStore.saveDataSuccessExecution = settings.saveDataSuccessExecution;
			rootStore.saveManualExecutions = settings.saveManualExecutions;
			rootStore.timezone = settings.timezone;
			rootStore.executionTimeout = settings.executionTimeout;
			rootStore.maxExecutionTimeout = settings.maxExecutionTimeout;
			rootStore.versionCli = settings.versionCli;
			rootStore.instanceId = settings.instanceId;
			rootStore.oauthCallbackUrls = settings.oauthCallbackUrls;
			rootStore.n8nMetadata = settings.n8nMetadata || {};
			rootStore.defaultLocale = settings.defaultLocale;
			rootStore.isNpmAvailable =  settings.isNpmAvailable;
			// TODO: context.commit('versions/setVersionNotificationSettings', settings.versionNotifications, {root: true});
		},
		stopShowingSetupPage(): void {
			Vue.set(this.userManagement, 'showSetupOnFirstLoad', false);

		},
		setPromptsData(promptsData: IN8nPrompts): void {
			Vue.set(this, 'promptsData', promptsData);
		},
		setAllowedModules(allowedModules: { builtIn?: string, external?: string }): void {
			this.settings.allowedModules = {
				...(allowedModules.builtIn && { builtIn: allowedModules.builtIn.split(',') }),
				...(allowedModules.external && { external: allowedModules.external.split(',') }),
			};
		},
		async fetchPromptsData(): Promise<void> {
			if (!this.isTelemetryEnabled) {
				Promise.resolve();
			}
			try {
				const uiStore = useUIStore();
				const usersStore = useUsersStore();
				const promptsData: IN8nPrompts = await getPromptsData(this.settings.instanceId, usersStore.currentUserId || '');

				if (promptsData && promptsData.showContactPrompt) {
					uiStore.openModal(CONTACT_PROMPT_MODAL_KEY);
				} else  if (promptsData && promptsData.showValueSurvey) {
					uiStore.openModal(VALUE_SURVEY_MODAL_KEY);
				}

				this.setPromptsData(promptsData);
				Promise.resolve();
			} catch (error) {
				Promise.reject(error);
			}
		},
		async submitContactInfo(email: string): Promise<any> {
			try {
				const usersStore = useUsersStore();
				return await submitContactInfo(this.settings.instanceId, usersStore.currentUserId || '', email);
			} catch (error) {
				Promise.reject(error);
			}
		},
		async submitValueSurvey(params: IN8nValueSurveyData): Promise<IN8nPromptResponse | undefined> {
			try {
				const usersStore = useUsersStore();
				return await submitValueSurvey(this.settings.instanceId, usersStore.currentUserId || '', params);
			} catch (error) {
				return;
			}
		},
		async testTemplatesEndpoint(): Promise<void> {
			const timeout = new Promise((_, reject) => setTimeout(() => reject(), 2000));
			await Promise.race([testHealthEndpoint(this.templatesHost), timeout]);
			this.templatesEndpointHealthy = true;
		},
		async getApiKey(): Promise<string | null> {
			const rootStore = useRootStore();
			const { apiKey } = await getApiKey(rootStore.getRestApiContext);
			return apiKey;
		},
		async createApiKey(): Promise<string | null> {
			const rootStore = useRootStore();
			const { apiKey } = await createApiKey(rootStore.getRestApiContext);
			return apiKey;
		},
		async deleteApiKey(): Promise<void> {
			const rootStore = useRootStore();
			await deleteApiKey(rootStore.getRestApiContext);
		},
	},
});
