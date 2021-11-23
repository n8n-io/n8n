import {  ActionContext, Module } from 'vuex';
import {
	IN8nUISettings,
	IPersonalizationSurveyAnswers,
	IContactPromptModal,
	IRootState,
	ISettingsState,
} from '../Interface';
import { getSettings, getContactPromptData, submitPersonalizationSurvey, updateContactPromptData } from '../api/settings';
import Vue from 'vue';
import { getPersonalizedNodeTypes } from './helper';
import { CONTACT_PROMPT_MODAL_KEY, PERSONALIZATION_MODAL_KEY } from '@/constants';

const module: Module<ISettingsState, IRootState> = {
	namespaced: true,
	state: {
		settings: {} as IN8nUISettings,
	},
	getters: {
		personalizedNodeTypes(state: ISettingsState): string[] {
			const answers = state.settings.personalizationSurvey && state.settings.personalizationSurvey.answers;
			if (!answers) {
				return [];
			}

			return getPersonalizedNodeTypes(answers);
		},
	},
	mutations: {
		setSettings(state: ISettingsState, settings: IN8nUISettings) {
			state.settings = settings;
		},
		setPersonalizationAnswers(state: ISettingsState, answers: IPersonalizationSurveyAnswers) {
			Vue.set(state.settings, 'personalizationSurvey', {
				answers,
				shouldShow: false,
			});
		},
		setContactPromptModal(state: ISettingsState, data: IContactPromptModal) {
			Vue.set(state.settings, 'contactPromptModal', {
				isAlreadyShowed: data.isAlreadyShowed,
			});
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
			context.commit('versions/setVersionNotificationSettings', settings.versionNotifications, {root: true});
			context.commit('setTelemetry', settings.telemetry, {root: true});

			const showPersonalizationsModal = settings.personalizationSurvey && settings.personalizationSurvey.shouldShow && !settings.personalizationSurvey.answers;
			if (showPersonalizationsModal) {
				context.commit('ui/openModal', PERSONALIZATION_MODAL_KEY, {root: true});
			}
			return settings;
		},
		async submitPersonalizationSurvey(context: ActionContext<ISettingsState, IRootState>, results: IPersonalizationSurveyAnswers) {
			await submitPersonalizationSurvey(context.rootGetters.getRestApiContext, results);

			context.commit('setPersonalizationAnswers', results);
		},
		async getContactPromptData(context: ActionContext<ISettingsState, IRootState>) {
			const contactPromptData = await getContactPromptData(context.state.settings.instanceId);
			let showContactPromptData = true;

			if (context.state.settings.contactPromptModal) {
				showContactPromptData = !context.state.settings.contactPromptModal!.isAlreadyShowed;
			}

			if (contactPromptData.show && showContactPromptData) {
				context.commit('ui/openModal', CONTACT_PROMPT_MODAL_KEY, {root: true});
				context.commit('setContactPromptModal', { isAlreadyShowed: contactPromptData.show });
			}
		},
		async updateContactPromptData(context: ActionContext<ISettingsState, IRootState>, email: string) {
			await updateContactPromptData(context.state.settings.instanceId, email);
		},
	},
};

export default module;
