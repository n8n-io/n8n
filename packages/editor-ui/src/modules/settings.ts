import {  ActionContext, Module } from 'vuex';
import {
	ILogLevel,
	IN8nPrompts,
	IN8nUISettings,
	IN8nValueSurveyData,
	IRootState,
	ISettingsState,
} from '../Interface';
import { getPromptsData, submitValueSurvey, submitContactInfo, getSettings } from '../api/settings';
import Vue from 'vue';
import { CONTACT_PROMPT_MODAL_KEY, VALUE_SURVEY_MODAL_KEY } from '@/constants';
import { ITelemetrySettings } from 'n8n-workflow';
import { testHealthEndpoint } from '@/api/templates';
import {createApiKey, deleteApiKey, getApiKey} from "@/api/api-keys";

const module: Module<ISettingsState, IRootState> = {
	namespaced: true,
	state: {
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
	},
	getters: {
		versionCli(state: ISettingsState) {
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
		getPromptsData(state: ISettingsState) {
			return state.promptsData;
		},
		isSmtpSetup(state: ISettingsState) {
			return state.userManagement.smtpSetup;
		},
		isPersonalizationSurveyEnabled(state: ISettingsState) {
			return state.settings.telemetry.enabled && state.settings.personalizationSurveyEnabled;
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
		isOnboardingCallPromptFeatureEnabled: (state): boolean => {
			return state.onboardingCallPromptEnabled;
		},
		isCommunityNodesFeatureEnabled: (state): boolean => {
			return state.settings.communityNodesEnabled;
		},
		isQueueModeEnabled: (state): boolean => {
			return state.settings.executionMode === 'queue';
		},
	},
	mutations: {
		setSettings(state: ISettingsState, settings: IN8nUISettings) {
			state.settings = settings;
			state.userManagement.enabled = settings.userManagement.enabled;
			state.userManagement.showSetupOnFirstLoad = !!settings.userManagement.showSetupOnFirstLoad;
			state.userManagement.smtpSetup = settings.userManagement.smtpSetup;
			state.api.enabled = settings.publicApi.enabled;
			state.api.latestVersion = settings.publicApi.latestVersion;
			state.api.path = settings.publicApi.path;
			state.onboardingCallPromptEnabled = settings.onboardingCallPromptEnabled;
		},
		stopShowingSetupPage(state: ISettingsState) {
			Vue.set(state.userManagement, 'showSetupOnFirstLoad', false);
		},
		setPromptsData(state: ISettingsState, promptsData: IN8nPrompts) {
			Vue.set(state, 'promptsData', promptsData);
		},
		setTemplatesEndpointHealthy(state: ISettingsState) {
			state.templatesEndpointHealthy = true;
		},
		setCommunityNodesFeatureEnabled(state: ISettingsState, isEnabled: boolean) {
			state.settings.communityNodesEnabled = isEnabled;
		},
	},
	actions: {
		async getSettings(context: ActionContext<ISettingsState, IRootState>) {
			const settings = await getSettings(context.rootGetters.getRestApiContext);
			context.commit('setSettings', settings);

			// todo refactor to this store
			context.commit('setUrlBaseWebhook', settings.urlBaseWebhook, {root: true});
			context.commit('setEndpointWebhook', settings.endpointWebhook, {root: true});
			context.commit('setEndpointWebhookTest', settings.endpointWebhookTest, {root: true});
			context.commit('setSaveDataErrorExecution', settings.saveDataErrorExecution, {root: true});
			context.commit('setSaveDataSuccessExecution', settings.saveDataSuccessExecution, {root: true});
			context.commit('setSaveManualExecutions', settings.saveManualExecutions, {root: true});
			context.commit('setTimezone', settings.timezone, {root: true});
			context.commit('setExecutionTimeout', settings.executionTimeout, {root: true});
			context.commit('setMaxExecutionTimeout', settings.maxExecutionTimeout, {root: true});
			context.commit('setVersionCli', settings.versionCli, {root: true});
			context.commit('setInstanceId', settings.instanceId, {root: true});
			context.commit('setOauthCallbackUrls', settings.oauthCallbackUrls, {root: true});
			context.commit('setN8nMetadata', settings.n8nMetadata || {}, {root: true});
			context.commit('setDefaultLocale', settings.defaultLocale, {root: true});
			context.commit('versions/setVersionNotificationSettings', settings.versionNotifications, {root: true});
			context.commit('setCommunityNodesFeatureEnabled', settings.communityNodesEnabled === true);
		},
		async fetchPromptsData(context: ActionContext<ISettingsState, IRootState>) {
			if (!context.getters.isTelemetryEnabled) {
				return;
			}

			try {
				const instanceId = context.state.settings.instanceId;
				const userId = context.rootGetters['users/currentUserId'];
				const promptsData: IN8nPrompts = await getPromptsData(instanceId, userId);

				if (promptsData && promptsData.showContactPrompt) {
					context.commit('ui/openModal', CONTACT_PROMPT_MODAL_KEY, {root: true});
				} else if (promptsData && promptsData.showValueSurvey) {
					context.commit('ui/openModal', VALUE_SURVEY_MODAL_KEY, {root: true});
				}

				context.commit('setPromptsData', promptsData);
			} catch (e) {
				return e;
			}

		},
		async submitContactInfo(context: ActionContext<ISettingsState, IRootState>, email: string) {
			try {
				const instanceId = context.state.settings.instanceId;
				const userId = context.rootGetters['users/currentUserId'];
				return await submitContactInfo(instanceId, userId, email);
			} catch (e) {
				return e;
			}
		},
		async submitValueSurvey(context: ActionContext<ISettingsState, IRootState>, params: IN8nValueSurveyData) {
			try {
				const instanceId = context.state.settings.instanceId;
				const userId = context.rootGetters['users/currentUserId'];
				return await submitValueSurvey(instanceId, userId, params);
			} catch (e) {
				return e;
			}
		},
		async testTemplatesEndpoint(context: ActionContext<ISettingsState, IRootState>) {
			const timeout = new Promise((_, reject) => setTimeout(() => reject(), 2000));
			await Promise.race([testHealthEndpoint(context.getters.templatesHost), timeout]);
			context.commit('setTemplatesEndpointHealthy', true);
		},
		async getApiKey(context: ActionContext<ISettingsState, IRootState>) {
			const { apiKey } = await getApiKey(context.rootGetters['getRestApiContext']);
			return apiKey;
		},
		async createApiKey(context: ActionContext<ISettingsState, IRootState>) {
			const { apiKey } = await createApiKey(context.rootGetters['getRestApiContext']);
			return apiKey;
		},
		async deleteApiKey(context: ActionContext<ISettingsState, IRootState>) {
			await deleteApiKey(context.rootGetters['getRestApiContext']);
		},
	},
};

export default module;
