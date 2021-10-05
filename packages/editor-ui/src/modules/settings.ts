import {  ActionContext, Module } from 'vuex';
import {
	IN8nUISettings,
	IRootState,
	ISettingsState,
	ISurvey,
} from '../Interface';
import { getSettings, submitSurvey } from '../api/settings';
import Vue from 'vue';
import { ONBOARDING_MODAL_KEY } from '@/constants';

const module: Module<ISettingsState, IRootState> = {
	namespaced: true,
	state: {
		settings: {} as IN8nUISettings,
	},
	getters: {
	},
	mutations: {
		setSettings(state: ISettingsState, settings: IN8nUISettings) {
			state.settings = settings;
		},
		setOnboardingSurvey(state: ISettingsState, answers: ISurvey) {
			Vue.set(state.settings, 'userSurvey', {
				answers,
				shouldShow: false,
			});
		},
	},
	actions: {
		async getSettings(context: ActionContext<ISettingsState, IRootState>) {
			const settings = await getSettings(context.rootGetters.getRestApiContext);
			settings.userSurvey = {
				shouldShow: true,
			};
			context.commit('setSettings', settings);

			// todo refactor to this store
			context.commit('setUrlBaseWebhook', settings.urlBaseWebhook, {root: true});
			context.commit('setEndpointWebhook', settings.endpointWebhook, {root: true});
			context.commit('setEndpointWebhookTest', settings.endpointWebhookTest, {root: true});
			context.commit('setSaveDataErrorExecution', settings.saveDataErrorExecution, {root: true});
			context.commit('setSaveDataSuccessExecution', settings.saveDataSuccessExecution, {root: true});
			context.commit('setTimezone', settings.timezone, {root: true});
			context.commit('setExecutionTimeout', settings.executionTimeout, {root: true});
			context.commit('setMaxExecutionTimeout', settings.maxExecutionTimeout, {root: true});
			context.commit('setVersionCli', settings.versionCli, {root: true});
			context.commit('setInstanceId', settings.instanceId, {root: true});
			context.commit('setOauthCallbackUrls', settings.oauthCallbackUrls, {root: true});
			context.commit('setN8nMetadata', settings.n8nMetadata || {}, {root: true});
			context.commit('versions/setVersionNotificationSettings', settings.versionNotifications, {root: true});

			const showOnboardingSurvey = settings.userSurvey && settings.userSurvey.shouldShow && !settings.userSurvey.answers;
			if (showOnboardingSurvey) {
				context.commit('ui/openModal', ONBOARDING_MODAL_KEY, {root: true});
			}
			return settings;
		},
		async submitOnboardingSurvey(context: ActionContext<ISettingsState, IRootState>, results: ISurvey) {
			await submitSurvey(context.rootGetters.getRestApiContext, results);

			context.commit('setOnboardingSurvey', results);
		},
	},
};

export default module;
