import { changePassword, deleteUser, getCurrentUser, getUsers, inviteUsers, login, loginCurrentUser, logout, reinvite, sendForgotPasswordEmail, setupOwner, signup, submitPersonalizationSurvey, updateCurrentUser, updateCurrentUserPassword, validatePasswordToken, validateSignupToken } from '@/api/users-mock';
import { PERSONALIZATION_MODAL_KEY } from '@/constants';
import Vue from 'vue';
import {  ActionContext, Module } from 'vuex';
import {
	IPermissions,
	IPersonalizationSurveyAnswers,
	IRootState,
	IUser,
	IUserResponse,
	IUsersState,
} from '../Interface';
import { getPersonalizedNodeTypes, isAuthorized, PERMISSIONS, ROLE } from './userHelpers';

const isDefaultUser = (user: IUserResponse | null) => Boolean(user && !user.email);

const isPendingUser = (user: IUserResponse | null) => Boolean(user && user.email && !user.firstName && !user.lastName);


const module: Module<IUsersState, IRootState> = {
	namespaced: true,
	state: {
		currentUserId: null,
		users: {},
	},
	mutations: {
		addUsers: (state: IUsersState, users: IUserResponse[]) => {
			users.forEach((userResponse: IUserResponse) => {
				const user: IUser = {
					...userResponse,
					fullName: userResponse.firstName? `${userResponse.firstName} ${userResponse.lastName || ''}`: undefined,
					isDefaultUser: isDefaultUser(userResponse),
					isPendingUser: isPendingUser(userResponse),
					isCurrentUser: userResponse.id === state.currentUserId,
					isOwner: Boolean(userResponse.globalRole && userResponse.globalRole.name === ROLE.Owner),
				};
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
		setPersonalizationAnswers(state: IUsersState, answers: IPersonalizationSurveyAnswers) {
			if (!state.currentUserId) {
				return;
			}

			const user = state.users[state.currentUserId] as IUser | null;
			if (!user) {
				return;
			}

			Vue.set(user, 'personalizationAnswers', answers);
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
		isUMEnabled(state: IUsersState, getters: any, rootState: IRootState, rootGetters: any): boolean { // tslint:disable-line:no-any
			return rootGetters['settings/isUserManagementEnabled'];
		},
		personalizedNodeTypes(state: IUsersState, getters: any): string[] { // tslint:disable-line:no-any
			const user = getters.currentUser as IUser | null;
			if (!user) {
				return [];
			}

			const answers = user.personalizationAnswers;
			if (!answers) {
				return [];
			}

			return getPersonalizedNodeTypes(answers);
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
		async getCurrentUser(context: ActionContext<IUsersState, IRootState>) {
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
		async validatePasswordToken(context: ActionContext<IUsersState, IRootState>, params: {token: string, userId: string}) {
			await validatePasswordToken(context.rootGetters.getRestApiContext, params);
		},
		async changePassword(context: ActionContext<IUsersState, IRootState>, params: {token: string, password: string, userId: string}) {
			await changePassword(context.rootGetters.getRestApiContext, params);
		},
		async updateUser(context: ActionContext<IUsersState, IRootState>, params: {id: string, firstName: string, lastName: string, email: string}) {
			const user = await updateCurrentUser(context.rootGetters.getRestApiContext, params);
			context.commit('addUsers', [user]);
		},
		async updateCurrentUserPassword(context: ActionContext<IUsersState, IRootState>, params: {password: string}) {
			await updateCurrentUserPassword(context.rootGetters.getRestApiContext, {password: params.password});
		},
		async deleteUser(context: ActionContext<IUsersState, IRootState>, params: { id: string, transferId?: string}) {
			await deleteUser(context.rootGetters.getRestApiContext, params);
			context.commit('deleteUser', params.id);
		},
		async fetchUsers(context: ActionContext<IUsersState, IRootState>) {
			const users = await getUsers(context.rootGetters.getRestApiContext);
			context.commit('addUsers', users);
		},
		async inviteUsers(context: ActionContext<IUsersState, IRootState>, params: Array<{email: string}>): Promise<Array<Partial<IUserResponse>>> {
			const users = await inviteUsers(context.rootGetters.getRestApiContext, params);
			context.commit('addUsers', users);
			return users;
		},
		async reinviteUser(context: ActionContext<IUsersState, IRootState>, params: {id: string}) {
			await reinvite(context.rootGetters.getRestApiContext, params);
		},
		async submitPersonalizationSurvey(context: ActionContext<IUsersState, IRootState>, results: IPersonalizationSurveyAnswers) {
			await submitPersonalizationSurvey(context.rootGetters.getRestApiContext, results);

			context.commit('setPersonalizationAnswers', results);
		},
		async showPersonalizationSurvey(context: ActionContext<IUsersState, IRootState>) {
			const surveyEnabled = context.rootGetters['settings/isPersonalizationSurveyEnabled'] as boolean;
			const currentUser = context.getters.currentUser as IUser | null;
			if (surveyEnabled && currentUser && !currentUser.personalizationAnswers) {
				context.dispatch('ui/openModal', PERSONALIZATION_MODAL_KEY, {root: true});
			}
		},
	},
};

export default module;
