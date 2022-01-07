import { changePassword, deleteUser, getCurrentUser, getUsers, inviteUsers, login, loginCurrentUser, logout, reinvite, sendForgotPasswordEmail, setupOwner, signup, updateUser, updateUserPassword, validatePasswordToken, validateSignupToken } from '@/api/users-mock';
import { LOGIN_STATUS, PERMISSIONS, ROLE } from '@/constants';
import Vue from 'vue';
import {  ActionContext, Module } from 'vuex';
import {
	IPermissions,
	IRole,
	IRootState,
	IUser,
	IUsersState,
} from '../Interface';

const isAuthorized = (permissions: IPermissions, {currentUser, isUMEnabled}: {currentUser: IUser | null, isUMEnabled: boolean}): boolean => {
	const loginStatus = currentUser ? LOGIN_STATUS.LoggedIn : LOGIN_STATUS.LoggedOut;
	if (permissions.deny) {
		if (permissions.deny.um === isUMEnabled) {
			return false;
		}

		if (permissions.deny.loginStatus && permissions.deny.loginStatus.includes(loginStatus)) {
			return false;
		}

		if (currentUser) {
			const role = currentUser.email ? currentUser.globalRole.name: ROLE.Default;
			if (permissions.deny.role && permissions.deny.role.includes(role)) {
				return false;
			}
		}
	}

	if (permissions.allow) {
		if (permissions.allow.um === isUMEnabled) {
			return true;
		}

		if (permissions.allow.loginStatus && permissions.allow.loginStatus.includes(loginStatus)) {
			return true;
		}

		if (currentUser) {
			const role = currentUser.email ? currentUser.globalRole.name: ROLE.Default;
			if (permissions.allow.role && permissions.allow.role.includes(role)) {
				return true;
			}
		}
	}

	return false;
};

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
				const authorize: IPermissions | null = PERMISSIONS.ROUTES[viewName];
				if (!authorize) {
					return false;
				}

				return isAuthorized(authorize, getters);
			};
		},
		getUserById(state: IUsersState): (userId: string) => IUser | null {
			return (userId: string): IUser | null => state.users[userId];
		},
		canUserDeleteTags(state: IUsersState, getters: any) { // tslint:disable-line:no-any
			return isAuthorized(PERMISSIONS.TAGS.CAN_DELETE_TAGS, getters);
		},
		canUserAccessSidebarUserInfo(state: IUsersState, getters: any) { // tslint:disable-line:no-any
			return isAuthorized(PERMISSIONS.PRIMARY_MENU.CAN_ACCESS_USER_INFO, getters);
		},
		canUserAccessSettings(state: IUsersState, getters: any) { // tslint:disable-line:no-any
			return isAuthorized(PERMISSIONS.ROUTES.SettingsRedirect, getters);
		},
		showUMSetupWarning(state: IUsersState, getters: any) { // tslint:disable-line:no-any
			return isAuthorized(PERMISSIONS.USER_SETTINGS.VIEW_UM_SETUP_WARNING, getters);
		},
		isDefaultUser(state: IUsersState, getter: any): boolean { // tslint:disable-line:no-any
			const user = getter.currentUser as IUser | null;

			return user ? !user.email : false;
		},
		isUMEnabled(state: IUsersState, getters: any, rootState: IRootState, rootGetters: any): boolean { // tslint:disable-line:no-any
			return rootGetters['settings/isUserManagementEnabled'];
		},
	},
	actions: {
		async loginWithCookie(context: ActionContext<IUsersState, IRootState>) {
			const user = await loginCurrentUser(context.rootGetters.getRestApiContext);
			if (user) {
				context.commit('addUsers', [user]);
				context.commit('setCurrentUserId', user.id);
			}
		},
		async fetchCurrentUser(context: ActionContext<IUsersState, IRootState>) {
			const user = await getCurrentUser(context.rootGetters.getRestApiContext);
			if (user) {
				context.commit('addUsers', [user]);
				context.commit('setCurrentUserId', user.id);
			}
		},
		async loginWithCreds(context: ActionContext<IUsersState, IRootState>, params: {email: string, password: string}) {
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
			}
		},
		async validateSignupToken(context: ActionContext<IUsersState, IRootState>, params: {inviteeId: string, inviterId: string}): Promise<{ inviter: { firstName: string, lastName: string } }> {
			return await validateSignupToken(context.rootGetters.getRestApiContext, params);
		},
		async signup(context: ActionContext<IUsersState, IRootState>, params: { inviteeId: string; inviterId: string; firstName: string; lastName: string; password: string;}) {
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
