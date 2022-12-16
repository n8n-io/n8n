import { createApiKey, deleteApiKey, getApiKey } from '@/api/api-keys';
import { getPromptsData, getSettings, submitContactInfo, submitValueSurvey } from '@/api/settings';
import { testHealthEndpoint } from '@/api/templates';
import {
	CONTACT_PROMPT_MODAL_KEY,
	EnterpriseEditionFeature,
	STORES,
	VALUE_SURVEY_MODAL_KEY,
} from '@/constants';
import {
	ILogLevel,
	IN8nPromptResponse,
	IN8nPrompts,
	IN8nUISettings,
	IN8nValueSurveyData,
	ISettingsState,
	WorkflowCallerPolicyDefaultOption,
} from '@/Interface';
import { store } from '@/store';
import { ITelemetrySettings } from 'n8n-workflow';
import { defineStore } from 'pinia';
import Vue from 'vue';
import { useRootStore } from './n8nRootStore';
import { useUIStore } from './ui';
import { useUsersStore } from './users';
import { useVersionsStore } from './versions';

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
		saveDataErrorExecution: 'all',
		saveDataSuccessExecution: 'all',
		saveManualExecutions: false,
	}),
	getters: {
		isEnterpriseFeatureEnabled() {
			return (feature: EnterpriseEditionFeature): boolean => this.settings.enterprise[feature];
		},
		versionCli(): string {
			return this.settings.versionCli;
		},
		isUserManagementEnabled(): boolean {
			return this.userManagement.enabled;
		},
		isPublicApiEnabled(): boolean {
			return this.api.enabled;
		},
		publicApiLatestVersion(): number {
			return this.api.latestVersion;
		},
		publicApiPath(): string {
			return this.api.path;
		},
		showSetupPage(): boolean {
			return this.userManagement.showSetupOnFirstLoad === true;
		},
		isDesktopDeployment(): boolean {
			if (!this.settings.deployment) {
				return false;
			}
			return this.settings.deployment?.type.startsWith('desktop_');
		},
		isCloudDeployment(): boolean {
			if (!this.settings.deployment) {
				return false;
			}
			return this.settings.deployment.type === 'cloud';
		},
		isSmtpSetup(): boolean {
			return this.userManagement.smtpSetup;
		},
		isPersonalizationSurveyEnabled(): boolean {
			return (
				this.settings.telemetry &&
				this.settings.telemetry.enabled &&
				this.settings.personalizationSurveyEnabled
			);
		},
		telemetry(): ITelemetrySettings {
			return this.settings.telemetry;
		},
		logLevel(): ILogLevel {
			return this.settings.logLevel;
		},
		isTelemetryEnabled(): boolean {
			return this.settings.telemetry && this.settings.telemetry.enabled;
		},
		areTagsEnabled(): boolean {
			return this.settings.workflowTagsDisabled !== undefined
				? !this.settings.workflowTagsDisabled
				: true;
		},
		isHiringBannerEnabled(): boolean {
			return this.settings.hiringBannerEnabled;
		},
		isTemplatesEnabled(): boolean {
			return Boolean(this.settings.templates && this.settings.templates.enabled);
		},
		isTemplatesEndpointReachable(): boolean {
			return this.templatesEndpointHealthy;
		},
		templatesHost(): string {
			return this.settings.templates.host;
		},
		isCommunityNodesFeatureEnabled(): boolean {
			return this.settings.communityNodesEnabled;
		},
		isNpmAvailable(): boolean {
			return this.settings.isNpmAvailable;
		},
		allowedModules(): { builtIn?: string[]; external?: string[] } {
			return this.settings.allowedModules;
		},
		isQueueModeEnabled(): boolean {
			return this.settings.executionMode === 'queue';
		},
		workflowCallerPolicyDefaultOption(): WorkflowCallerPolicyDefaultOption {
			return this.settings.workflowCallerPolicyDefaultOption;
		},
	},
	actions: {
		setSettings(settings: IN8nUISettings): void {
			this.settings = settings;
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
			this.setAllowedModules(settings.allowedModules as { builtIn?: string; external?: string });
			this.setSaveDataErrorExecution(settings.saveDataErrorExecution);
			this.setSaveDataSuccessExecution(settings.saveDataSuccessExecution);
			this.setSaveManualExecutions(settings.saveManualExecutions);

			rootStore.setUrlBaseWebhook(settings.urlBaseWebhook);
			rootStore.setUrlBaseEditor(settings.urlBaseEditor);
			rootStore.setEndpointWebhook(settings.endpointWebhook);
			rootStore.setEndpointWebhookTest(settings.endpointWebhookTest);
			rootStore.setTimezone(settings.timezone);
			rootStore.setExecutionTimeout(settings.executionTimeout);
			rootStore.setMaxExecutionTimeout(settings.maxExecutionTimeout);
			rootStore.setVersionCli(settings.versionCli);
			rootStore.setInstanceId(settings.instanceId);
			rootStore.setOauthCallbackUrls(settings.oauthCallbackUrls);
			rootStore.setN8nMetadata(settings.n8nMetadata || {});
			rootStore.setDefaultLocale(settings.defaultLocale);
			rootStore.setIsNpmAvailable(settings.isNpmAvailable);
			useVersionsStore().setVersionNotificationSettings(settings.versionNotifications);
		},
		stopShowingSetupPage(): void {
			Vue.set(this.userManagement, 'showSetupOnFirstLoad', false);
		},
		setPromptsData(promptsData: IN8nPrompts): void {
			Vue.set(this, 'promptsData', promptsData);
		},
		setAllowedModules(allowedModules: { builtIn?: string; external?: string }): void {
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
				const promptsData: IN8nPrompts = await getPromptsData(
					this.settings.instanceId,
					usersStore.currentUserId || '',
				);

				if (promptsData && promptsData.showContactPrompt) {
					uiStore.openModal(CONTACT_PROMPT_MODAL_KEY);
				} else if (promptsData && promptsData.showValueSurvey) {
					uiStore.openModal(VALUE_SURVEY_MODAL_KEY);
				}

				this.setPromptsData(promptsData);
				Promise.resolve();
			} catch (error) {
				Promise.reject(error);
			}
		},
		async submitContactInfo(email: string): Promise<IN8nPromptResponse | undefined> {
			try {
				const usersStore = useUsersStore();
				return await submitContactInfo(
					this.settings.instanceId,
					usersStore.currentUserId || '',
					email,
				);
			} catch (error) {
				return;
			}
		},
		async submitValueSurvey(params: IN8nValueSurveyData): Promise<IN8nPromptResponse | undefined> {
			try {
				const usersStore = useUsersStore();
				return await submitValueSurvey(
					this.settings.instanceId,
					usersStore.currentUserId || '',
					params,
				);
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
		setSaveDataErrorExecution(newValue: string) {
			Vue.set(this, 'saveDataErrorExecution', newValue);
		},
		setSaveDataSuccessExecution(newValue: string) {
			Vue.set(this, 'saveDataSuccessExecution', newValue);
		},
		setSaveManualExecutions(saveManualExecutions: boolean) {
			Vue.set(this, 'saveManualExecutions', saveManualExecutions);
		},
	},
});
