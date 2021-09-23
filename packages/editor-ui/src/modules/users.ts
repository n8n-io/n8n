import { changePassword, deleteUser, getCurrentUser, getUsers, inviteUsers, login, logout, reinvite, sendForgotPasswordEmail, setupOwner, signup, updateUser, updateUserPassword, validatePasswordToken, validateSignupToken } from '@/api/users';
import Vue from 'vue';
import {  ActionContext, Module } from 'vuex';
import {
	INewUser,
	IRole,
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
		clearCurrentUserId: (state: IUsersState) => {
			state.currentUserId = null;
		},
		deleteUser: (state: IUsersState, userId: string) => {
			Vue.delete(state.users, userId);
		},
	},
	getters: {
		currentUserId(state: IUsersState): string | null {
			return state.currentUserId;
		},
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
		async logout(context: ActionContext<IUsersState, IRootState>) {
			await logout(context.rootGetters.getRestApiContext);
			context.commit('clearCurrentUserId');
		},
		async setupOwner(context: ActionContext<IUsersState, IRootState>, params: INewUser) {
			const user = await setupOwner(context.rootGetters.getRestApiContext, params);
			if (user) {
				context.commit('addUsers', [user]);
				context.commit('setCurrntUserId', user.id);
			}
		},
		async validateSignupToken(context: ActionContext<IUsersState, IRootState>, params: {token: string}) {
			await validateSignupToken(context.rootGetters.getRestApiContext, params);
		},
		async signup(context: ActionContext<IUsersState, IRootState>, params: INewUser) {
			const user = await signup(context.rootGetters.getRestApiContext, params);
			if (user) {
				context.commit('addUsers', [user]);
				context.commit('setCurrntUserId', user.id);
			}
		},
		async sendForgotPasswordEmail(context: ActionContext<IUsersState, IRootState>, params: {email: string}) {
			await sendForgotPasswordEmail(context.rootGetters.getRestApiContext, params);
		},
		async validatePasswordToken(context: ActionContext<IUsersState, IRootState>, params: {token: string}) {
			await validatePasswordToken(context.rootGetters.getRestApiContext, params);
		},
		async changePassword(context: ActionContext<IUsersState, IRootState>, params: {token: string, password: string}) {
			await changePassword(context.rootGetters.getRestApiContext, params);
		},
		async updateUser(context: ActionContext<IUsersState, IRootState>, params: IUser) {
			const user = await updateUser(context.rootGetters.getRestApiContext, params);
			context.commit('addUsers', [user]);
		},
		async updateCurrentUserPassword(context: ActionContext<IUsersState, IRootState>, params: {password: string}) {
			await updateUserPassword(context.rootGetters.getRestApiContext, {password: params.password, id: context.getters.currentUserId});
		},
		async deleteUser(context: ActionContext<IUsersState, IRootState>, params: { id: string, transferId?: string}) {
			await deleteUser(context.rootGetters.getRestApiContext, params);
			context.commit('deleteUser', params.id);
		},
		async fetchUsers(context: ActionContext<IUsersState, IRootState>) {
			const users = await getUsers(context.rootGetters.getRestApiContext);
			context.commit('addUsers', users);
		},
		async inviteUsers(context: ActionContext<IUsersState, IRootState>, params: {emails: string[], role: IRole}) {
			const users = await inviteUsers(context.rootGetters.getRestApiContext, params);
			context.commit('addUsers', users);
		},
		async reinviteUser(context: ActionContext<IUsersState, IRootState>, params: {id: string}) {
			await reinvite(context.rootGetters.getRestApiContext, params);
		},
	},
};

export default module;
