import {  ActionContext, Module } from 'vuex';
import {
	IRootState,
	IUsersState,
} from '../Interface';

const module: Module<IUsersState, IRootState> = {
	namespaced: true,
	state: {},
	actions: {
		// async getCurrentUser(context: ActionContext<IUsersState, IRootState>) {
		// },
	},
};

export default module;
