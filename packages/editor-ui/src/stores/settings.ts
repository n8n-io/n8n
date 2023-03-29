import { createApiKey, deleteApiKey, getApiKey } from '@/api/api-keys';
import {
	getLdapConfig,
	getLdapSynchronizations,
	runLdapSync,
	testLdapConnection,
	updateLdapConfig,
} from '@/api/ldap';
import { getPromptsData, getSettings, submitContactInfo, submitValueSurvey } from '@/api/settings';
import { testHealthEndpoint } from '@/api/templates';
import {
	CONTACT_PROMPT_MODAL_KEY,
	EnterpriseEditionFeature,
	STORES,
	VALUE_SURVEY_MODAL_KEY,
} from '@/constants';
import {
	ILdapConfig,
	ILogLevel,
	IN8nPromptResponse,
	IN8nPrompts,
	IN8nUISettings,
	IN8nValueSurveyData,
	ISettingsState,
	UserManagementAuthenticationMethod,
	WorkflowCallerPolicyDefaultOption,
} from '@/Interface';
import { IDataObject, ITelemetrySettings } from 'n8n-workflow';
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
			authenticationMethod: UserManagementAuthenticationMethod.Email,
		},
		templatesEndpointHealthy: false,
		api: {
			enabled: false,
			latestVersion: 0,
			path: '/',
			swaggerUi: {
				enabled: false,
			},
		},
		ldap: {
			loginLabel: '',
			loginEnabled: false,
		},
		saml: {
			loginLabel: '',
			loginEnabled: false,
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
		isSwaggerUIEnabled(): boolean {
			return this.api.swaggerUi.enabled;
		},
		publicApiLatestVersion(): number {
			return this.api.latestVersion;
		},
		publicApiPath(): string {
			return this.api.path;
		},
		isLdapLoginEnabled(): boolean {
			return this.ldap.loginEnabled;
		},
		ldapLoginLabel(): string {
			return this.ldap.loginLabel;
		},
		isSamlLoginEnabled(): boolean {
			return this.saml.loginEnabled;
		},
		samlLoginLabel(): string {
			return this.saml.loginLabel;
		},
		showSetupPage(): boolean {
			return this.userManagement.showSetupOnFirstLoad === true;
		},
		deploymentType(): string {
			return this.settings.deployment?.type || 'default';
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
		isUserActivationSurveyEnabled(): boolean {
			return (
				this.settings.telemetry &&
				this.settings.telemetry.enabled &&
				this.settings.userActivationSurveyEnabled
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
		pushBackend(): IN8nUISettings['pushBackend'] {
			return this.settings.pushBackend;
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
		isDefaultAuthenticationSaml(): boolean {
			return this.userManagement.authenticationMethod === UserManagementAuthenticationMethod.Saml;
		},
	},
	actions: {
		setSettings(settings: IN8nUISettings): void {
			this.settings = settings;
			this.userManagement = settings.userManagement;
			if (this.userManagement) {
				this.userManagement.showSetupOnFirstLoad = !!settings.userManagement.showSetupOnFirstLoad;
			}
			this.api = settings.publicApi;
			this.onboardingCallPromptEnabled = settings.onboardingCallPromptEnabled;
			if (settings.sso?.ldap) {
				this.ldap.loginEnabled = settings.sso.ldap.loginEnabled;
				this.ldap.loginLabel = settings.sso.ldap.loginLabel;
			}
			if (settings.sso?.saml) {
				this.saml.loginEnabled = settings.sso.saml.loginEnabled;
				this.saml.loginLabel = settings.sso.saml.loginLabel;
			}
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
		async getLdapConfig() {
			const rootStore = useRootStore();
			return await getLdapConfig(rootStore.getRestApiContext);
		},
		async getLdapSynchronizations(pagination: { page: number }) {
			const rootStore = useRootStore();
			return await getLdapSynchronizations(rootStore.getRestApiContext, pagination);
		},
		async testLdapConnection() {
			const rootStore = useRootStore();
			return await testLdapConnection(rootStore.getRestApiContext);
		},
		async updateLdapConfig(ldapConfig: ILdapConfig) {
			const rootStore = useRootStore();
			return await updateLdapConfig(rootStore.getRestApiContext, ldapConfig);
		},
		async runLdapSync(data: IDataObject) {
			const rootStore = useRootStore();
			return await runLdapSync(rootStore.getRestApiContext, data);
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
