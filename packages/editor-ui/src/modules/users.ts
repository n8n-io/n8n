import {  ActionContext, Module } from 'vuex';
import {
	IRootState,
	IUser,
	IUsersState,
} from '../Interface';

const module: Module<IUsersState, IRootState> = {
	namespaced: true,
	state: {
		currentUserId: null,
		users: {},
	},
	getters: {
		currentUser(state: IUsersState): IUser | null {
			return state.currentUserId ? state.users[state.currentUserId] : null;
		},
	},
	actions: {
		async fetchCurrentUser(context: ActionContext<IUsersState, IRootState>) {
			return null;
		},
	},
};

export default module;
