import { PERSONALIZATION_MODAL_KEY } from '@/constants';
import {
	changePassword,
	deleteUser,
	getCurrentUser,
	getUsers,
	inviteUsers,
	login,
	loginCurrentUser,
	logout,
	reinvite,
	sendForgotPasswordEmail,
	setupOwner,
	signup,
	submitPersonalizationSurvey,
	skipOwnerSetup,
	updateCurrentUser,
	updateCurrentUserPassword,
	validatePasswordToken,
	validateSignupToken,
} from '@/api/users';
import Vue from 'vue';
import {  ActionContext, Module } from 'vuex';
import {
	IInviteResponse,
	IPersonalizationLatestVersion,
	IRootState,
	IUser,
	IUserResponse,
	IUsersState,
} from '../Interface';
import { getPersonalizedNodeTypes, isAuthorized, PERMISSIONS, ROLE } from './userHelpers';

const isDefaultUser = (user: IUserResponse | null) => Boolean(user && user.isPending && user.globalRole && user.globalRole.name === ROLE.Owner);

const isPendingUser = (user: IUserResponse | null) => Boolean(user && user.isPending);


const module: Module<IUsersState, IRootState> = {
	namespaced: true,
	state: {
		currentUserId: null,
		users: {},
	},
	mutations: {
		addUsers: (state: IUsersState, users: IUserResponse[]) => {
			users.forEach((userResponse: IUserResponse) => {
				const prevUser = state.users[userResponse.id] || {};
				const updatedUser = {
					...prevUser,
					...userResponse,
				};
				const user: IUser = {
					...updatedUser,
					fullName: userResponse.firstName? `${updatedUser.firstName} ${updatedUser.lastName || ''}`: undefined,
					isDefaultUser: isDefaultUser(updatedUser),
					isPendingUser: isPendingUser(updatedUser),
					isOwner: Boolean(updatedUser.globalRole && updatedUser.globalRole.name === ROLE.Owner),
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
		setPersonalizationAnswers(state: IUsersState, answers: IPersonalizationLatestVersion) {
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
		getUserById(state: IUsersState): (userId: string) => IUser | null {
			return (userId: string): IUser | null => state.users[userId];
		},
		canUserDeleteTags(state: IUsersState, getters: any, rootState: IRootState, rootGetters: any) { // tslint:disable-line:no-any
			const currentUser = getters.currentUser;

			return isAuthorized(PERMISSIONS.TAGS.CAN_DELETE_TAGS, currentUser);
		},
		canUserAccessSidebarUserInfo(state: IUsersState, getters: any, rootState: IRootState, rootGetters: any) { // tslint:disable-line:no-any
			const currentUser = getters.currentUser;

			return isAuthorized(PERMISSIONS.PRIMARY_MENU.CAN_ACCESS_USER_INFO, currentUser);
		},
		showUMSetupWarning(state: IUsersState, getters: any, rootState: IRootState, rootGetters: any) { // tslint:disable-line:no-any
			const currentUser = getters.currentUser;

			return isAuthorized(PERMISSIONS.USER_SETTINGS.VIEW_UM_SETUP_WARNING, currentUser);
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
				context.commit('settings/stopShowingSetupPage', null, { root: true });
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
		async updateCurrentUserPassword(context: ActionContext<IUsersState, IRootState>, {password, currentPassword}: {password: string, currentPassword: string}) {
			await updateCurrentUserPassword(context.rootGetters.getRestApiContext, {newPassword: password, currentPassword});
		},
		async deleteUser(context: ActionContext<IUsersState, IRootState>, params: { id: string, transferId?: string}) {
			await deleteUser(context.rootGetters.getRestApiContext, params);
			context.commit('deleteUser', params.id);
		},
		async fetchUsers(context: ActionContext<IUsersState, IRootState>) {
			const users = await getUsers(context.rootGetters.getRestApiContext);
			context.commit('addUsers', users);
		},
		async inviteUsers(context: ActionContext<IUsersState, IRootState>, params: Array<{email: string}>): Promise<IInviteResponse[]> {
			const users = await inviteUsers(context.rootGetters.getRestApiContext, params);
			context.commit('addUsers', users.map(({user}) => ({ isPending: true, ...user })));
			return users;
		},
		async reinviteUser(context: ActionContext<IUsersState, IRootState>, params: {id: string}) {
			await reinvite(context.rootGetters.getRestApiContext, params);
		},
		async submitPersonalizationSurvey(context: ActionContext<IUsersState, IRootState>, results: IPersonalizationLatestVersion) {
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
		async skipOwnerSetup(context: ActionContext<IUsersState, IRootState>) {
			try {
				context.commit('settings/stopShowingSetupPage', null, { root: true });
				await skipOwnerSetup(context.rootGetters.getRestApiContext);
			} catch (error) {}
		},
	},
};

export default module;
