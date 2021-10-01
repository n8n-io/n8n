import {  ActionContext, Module } from 'vuex';
import {
	IN8nUISettings,
	IRootState,
	ISettingsState,
} from '../Interface';
import { getSettings } from '../api/settings-mock';

const module: Module<ISettingsState, IRootState> = {
	namespaced: true,
	state: {
		settings: {} as IN8nUISettings,
	},
	getters: {
		versionCli(state: ISettingsState) {
			return state.settings.versionCli;
		},
		isUserManagementEnabled(state: ISettingsState): boolean {
			return !!state.settings.userManagement && state.settings.userManagement.enabled;
		},
		isInstanceSetup(state: ISettingsState) {
			return !!state.settings.userManagement && state.settings.userManagement.hasOwner;
		},
	},
	mutations: {
		setSettings(state: ISettingsState, settings: IN8nUISettings) {
			state.settings = settings;
		},
		completeInstanceSetup(state: ISettingsState) {
			if (state.settings.userManagement) {
				state.settings.userManagement.hasOwner = true;
			}
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
