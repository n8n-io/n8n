import { changePassword, deleteUser, getCurrentUser, getUsers, inviteUsers, login, logout, reinvite, sendForgotPasswordEmail, setupOwner, signup, updateUser, updateUserPassword, validatePasswordToken, validateSignupToken } from '@/api/users-mock';
import { LOGIN_STATUS } from '@/constants';
import Vue from 'vue';
import { RouteRecordPublic } from 'vue-router';
import {  ActionContext, Module } from 'vuex';
import {
	IRole,
	IRootState,
	IUser,
	IUsersState,
} from '../Interface';
import router from '../router';

const module: Module<IUsersState, IRootState> = {
	namespaced: true,
	state: {
		currentUserId: null,
		users: {},
	},
	mutations: {
		addUsers: (state: IUsersState, users: IUser[]) => {
			users.forEach((user: IUser) => {
				Vue.set(state.users, user.id, user);
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
		allUsers(state: IUsersState): IUser[] {
			return Object.values(state.users);
		},
		currentUserId(state: IUsersState): string | null {
			return state.currentUserId;
		},
		currentUser(state: IUsersState): IUser | null {
			return state.currentUserId ? state.users[state.currentUserId] : null;
		},
		canCurrentUserAccessView(state: IUsersState, getters: any) { // tslint:disable-line:no-any
			return (viewName: string): boolean => {
				const user = getters.currentUser as IUser | null;
				const route = router.getRoutes().find((item: RouteRecordPublic) => item.name === viewName);

				const authorize: string[] | null = route && route.meta ? route.meta.authorize : null;

				if (authorize) {
					if (!user && !authorize.includes(LOGIN_STATUS.LoggedOut)) {
						return false;
					}
					if (user && (!authorize.includes(LOGIN_STATUS.LoggedIn) && !authorize.includes(user.globalRole.name))) {
						return false;
					}
				}

				return true;
			};
		},
		getUserById(state: IUsersState): (userId: string) => IUser | null {
			return (userId: string): IUser | null => state.users[userId];
		},
	},
	actions: {
		async fetchCurrentUser(context: ActionContext<IUsersState, IRootState>) {
			const user = await getCurrentUser(context.rootGetters.getRestApiContext);
			if (user) {
				context.commit('addUsers', [user]);
				context.commit('setCurrentUserId', user.id);
			}
		},
		async login(context: ActionContext<IUsersState, IRootState>, params: {email: string, password: string}) {
			const user = await login(context.rootGetters.getRestApiContext, params);
			if (user) {
				context.commit('addUsers', [user]);
				context.commit('setCurrentUserId', user.id);
			}
		},
		async logout(context: ActionContext<IUsersState, IRootState>) {
			await logout(context.rootGetters.getRestApiContext);
			context.commit('clearCurrentUserId');
		},
		async createOwner(context: ActionContext<IUsersState, IRootState>, params: { firstName: string; lastName: string; email: string; password: string;}) {
			const user = await setupOwner(context.rootGetters.getRestApiContext, params);
			if (user) {
				context.commit('addUsers', [user]);
				context.commit('setCurrentUserId', user.id);
				context.commit('settings/completeInstanceSetup', null, {
					root: true,
				});
			}
		},
		async validateSignupToken(context: ActionContext<IUsersState, IRootState>, params: {token: string}): Promise<{ inviter: { firstName: string, lastName: string } }> {
			return await validateSignupToken(context.rootGetters.getRestApiContext, params);
		},
		async signup(context: ActionContext<IUsersState, IRootState>, params: { firstName: string; lastName: string; password: string;}) {
			const user = await signup(context.rootGetters.getRestApiContext, params);
			if (user) {
				context.commit('addUsers', [user]);
				context.commit('setCurrentUserId', user.id);
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
