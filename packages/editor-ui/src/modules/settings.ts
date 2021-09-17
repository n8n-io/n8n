import {  ActionContext, Module } from 'vuex';
import {
	IRootState,
	ISettingsState,
} from '../Interface';
import { getSettings } from '../api/settings';

const module: Module<ISettingsState, IRootState> = {
	namespaced: true,
	state: {},
	actions: {
		async fetchSettings(context: ActionContext<ISettingsState, IRootState>) {
			await getSettings(context.rootGetters.getRestApiContext);
		},
	},
};

export default module;
