import {  ActionContext, Module } from 'vuex';
import {
	IN8nUISettings,
	IRootState,
	ISettingsState,
} from '../Interface';
import { getSettings } from '../api/settings';

const module: Module<ISettingsState, IRootState> = {
	namespaced: true,
	state: {
		settings: {} as IN8nUISettings,
	},
	getters: {
		versionCli(state: ISettingsState) {
			return state.settings.versionCli;
		},
	},
	mutations: {
		setSettings(state: ISettingsState, settings: IN8nUISettings) {
			state.settings = settings;
		},
	},
	actions: {
		async fetchSettings(context: ActionContext<ISettingsState, IRootState>) {
			const settings = await getSettings(context.rootGetters.getRestApiContext);
			context.commit('setSettings', settings);
		},
	},
};

export default module;
