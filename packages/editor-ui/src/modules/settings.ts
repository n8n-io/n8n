import {  ActionContext, Module } from 'vuex';
import {
	IN8nUISettings,
	IRootState,
	ISettingsState,
	ISurvey,
} from '../Interface';
import { getSettings, submitSurvey } from '../api/settings';
import Vue from 'vue';

const module: Module<ISettingsState, IRootState> = {
	namespaced: true,
	state: {
		settings: {} as IN8nUISettings,
	},
	getters: {
		shouldShowOnboardingSurvey(state: ISettingsState) {
			return state.settings.userSurvey && state.settings.userSurvey.shouldShow && !state.settings.userSurvey.answers;
		},
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
			context.commit('setSettings', settings);
			return settings;
		},
		async submitOnboardingSurvey(context: ActionContext<ISettingsState, IRootState>, results: ISurvey) {
			await submitSurvey(context.rootGetters.getRestApiContext, results);

			context.commit('setOnboardingSurvey', results);
		},
	},
};

export default module;
