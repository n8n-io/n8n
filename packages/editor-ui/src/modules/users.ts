import { getCurrentUser, login } from '@/api/users';
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
	mutations: {
		addUsers: (state: IUsersState, users: IUser[]) => {
			users.forEach((user: IUser) => {
				state.users[user.id] = user;
			});
		},
		setCurrentUserId: (state: IUsersState, userId: string) => {
			state.currentUserId = userId;
		},
	},
	getters: {
		currentUser(state: IUsersState): IUser | null {
			// return {
			// 	id: '1',
			// 	email: 'test@gmail.com',
			// 	role: 'Owner',
			// };
			return state.currentUserId ? state.users[state.currentUserId] : null;
		},
	},
	actions: {
		async fetchCurrentUser(context: ActionContext<IUsersState, IRootState>) {
			const user = await getCurrentUser(context.rootGetters.getRestApiContext);
			if (user) {
				context.commit('addUsers', [user]);
				context.commit('setCurrntUserId', user.id);
			}
		},
		async login(context: ActionContext<IUsersState, IRootState>, params: {email: string, password: string}) {
			const user = await login(context.rootGetters.getRestApiContext, params);
			if (user) {
				context.commit('addUsers', [user]);
				context.commit('setCurrntUserId', user.id);
			}
		},
	},
};

export default module;
