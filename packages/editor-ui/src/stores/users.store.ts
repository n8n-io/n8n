import {
	changePassword,
	deleteUser,
	getInviteLink,
	getUsers,
	inviteUsers,
	login,
	loginCurrentUser,
	logout,
	preOwnerSetup,
	reinvite,
	sendForgotPasswordEmail,
	setupOwner,
	signup,
	skipOwnerSetup,
	submitPersonalizationSurvey,
	updateCurrentUser,
	updateCurrentUserPassword,
	updateCurrentUserSettings,
	validatePasswordToken,
	validateSignupToken,
} from '@/api/users';
import { PERSONALIZATION_MODAL_KEY, USER_ACTIVATION_SURVEY_MODAL, STORES } from '@/constants';
import type {
	ICredentialsResponse,
	IInviteResponse,
	IPersonalizationLatestVersion,
	IRole,
	IUser,
	IUserResponse,
	IUsersState,
} from '@/Interface';
import { getCredentialPermissions } from '@/permissions';
import { getPersonalizedNodeTypes, isAuthorized, PERMISSIONS, ROLE } from '@/utils';
import { defineStore } from 'pinia';
import Vue from 'vue';
import { useRootStore } from './n8nRoot.store';
import { usePostHog } from './posthog.store';
import { useSettingsStore } from './settings.store';
import { useUIStore } from './ui.store';

const isDefaultUser = (user: IUserResponse | null) =>
	Boolean(user && user.isPending && user.globalRole && user.globalRole.name === ROLE.Owner);

const isPendingUser = (user: IUserResponse | null) => Boolean(user && user.isPending);

const isInstanceOwner = (user: IUserResponse | null) =>
	Boolean(user?.globalRole?.name === ROLE.Owner);

export const useUsersStore = defineStore(STORES.USERS, {
	state: (): IUsersState => ({
		currentUserId: null,
		users: {},
	}),
	getters: {
		allUsers(): IUser[] {
			return Object.values(this.users);
		},
		userActivated(): boolean {
			return Boolean(this.currentUser?.settings?.userActivated);
		},
		currentUser(): IUser | null {
			return this.currentUserId ? this.users[this.currentUserId] : null;
		},
		isDefaultUser(): boolean {
			return isDefaultUser(this.currentUser);
		},
		isInstanceOwner(): boolean {
			return isInstanceOwner(this.currentUser);
		},
		getUserById(state) {
			return (userId: string): IUser | null => state.users[userId];
		},
		globalRoleName(): IRole {
			return this.currentUser?.globalRole?.name ?? 'default';
		},
		canUserDeleteTags(): boolean {
			return isAuthorized(PERMISSIONS.TAGS.CAN_DELETE_TAGS, this.currentUser);
		},
		canUserActivateLicense(): boolean {
			return isAuthorized(PERMISSIONS.USAGE.CAN_ACTIVATE_LICENSE, this.currentUser);
		},
		canUserAccessSidebarUserInfo() {
			if (this.currentUser) {
				const currentUser: IUser = this.currentUser;
				return isAuthorized(PERMISSIONS.PRIMARY_MENU.CAN_ACCESS_USER_INFO, currentUser);
			}
			return false;
		},
		showUMSetupWarning() {
			if (this.currentUser) {
				const currentUser: IUser = this.currentUser;
				return isAuthorized(PERMISSIONS.USER_SETTINGS.VIEW_UM_SETUP_WARNING, currentUser);
			}
			return false;
		},
		personalizedNodeTypes(): string[] {
			const user = this.currentUser as IUser | null;
			if (!user) {
				return [];
			}

			const answers = user.personalizationAnswers;
			if (!answers) {
				return [];
			}
			return getPersonalizedNodeTypes(answers);
		},
		isResourceAccessible() {
			return (resource: ICredentialsResponse): boolean => {
				const permissions = getCredentialPermissions(this.currentUser, resource);

				return permissions.use;
			};
		},
	},
	actions: {
		addUsers(users: IUserResponse[]) {
			users.forEach((userResponse: IUserResponse) => {
				const prevUser = this.users[userResponse.id] || {};
				const updatedUser = {
					...prevUser,
					...userResponse,
				};
				const user: IUser = {
					...updatedUser,
					fullName: userResponse.firstName
						? `${updatedUser.firstName} ${updatedUser.lastName || ''}`
						: undefined,
					isDefaultUser: isDefaultUser(updatedUser),
					isPendingUser: isPendingUser(updatedUser),
					isOwner: updatedUser.globalRole?.name === ROLE.Owner,
				};
				Vue.set(this.users, user.id, user);
			});
		},
		deleteUserById(userId: string): void {
			Vue.delete(this.users, userId);
		},
		setPersonalizationAnswers(answers: IPersonalizationLatestVersion): void {
			if (!this.currentUser) {
				return;
			}
			Vue.set(this.currentUser, 'personalizationAnswers', answers);
		},
		async loginWithCookie(): Promise<void> {
			const rootStore = useRootStore();
			const user = await loginCurrentUser(rootStore.getRestApiContext);
			if (!user) {
				return;
			}

			this.addUsers([user]);
			this.currentUserId = user.id;

			usePostHog().init(user.featureFlags);
		},
		async loginWithCreds(params: { email: string; password: string }): Promise<void> {
			const rootStore = useRootStore();
			const user = await login(rootStore.getRestApiContext, params);
			if (!user) {
				return;
			}

			this.addUsers([user]);
			this.currentUserId = user.id;

			usePostHog().init(user.featureFlags);
		},
		async logout(): Promise<void> {
			const rootStore = useRootStore();
			await logout(rootStore.getRestApiContext);
			this.currentUserId = null;
			usePostHog().reset();
		},
		async preOwnerSetup() {
			return preOwnerSetup(useRootStore().getRestApiContext);
		},
		async createOwner(params: {
			firstName: string;
			lastName: string;
			email: string;
			password: string;
		}): Promise<void> {
			const rootStore = useRootStore();
			const user = await setupOwner(rootStore.getRestApiContext, params);
			const settingsStore = useSettingsStore();
			if (user) {
				this.addUsers([user]);
				this.currentUserId = user.id;
				settingsStore.stopShowingSetupPage();
			}
		},
		async validateSignupToken(params: {
			inviteeId: string;
			inviterId: string;
		}): Promise<{ inviter: { firstName: string; lastName: string } }> {
			const rootStore = useRootStore();
			return validateSignupToken(rootStore.getRestApiContext, params);
		},
		async signup(params: {
			inviteeId: string;
			inviterId: string;
			firstName: string;
			lastName: string;
			password: string;
		}): Promise<void> {
			const rootStore = useRootStore();
			const user = await signup(rootStore.getRestApiContext, params);
			if (user) {
				this.addUsers([user]);
				this.currentUserId = user.id;
			}

			usePostHog().init(user.featureFlags);
		},
		async sendForgotPasswordEmail(params: { email: string }): Promise<void> {
			const rootStore = useRootStore();
			await sendForgotPasswordEmail(rootStore.getRestApiContext, params);
		},
		async validatePasswordToken(params: { token: string; userId: string }): Promise<void> {
			const rootStore = useRootStore();
			await validatePasswordToken(rootStore.getRestApiContext, params);
		},
		async changePassword(params: {
			token: string;
			password: string;
			userId: string;
		}): Promise<void> {
			const rootStore = useRootStore();
			await changePassword(rootStore.getRestApiContext, params);
		},
		async updateUser(params: {
			id: string;
			firstName: string;
			lastName: string;
			email: string;
		}): Promise<void> {
			const rootStore = useRootStore();
			const user = await updateCurrentUser(rootStore.getRestApiContext, params);
			this.addUsers([user]);
		},
		async updateUserSettings(settings: IUserResponse['settings']): Promise<void> {
			const rootStore = useRootStore();
			const updatedSettings = await updateCurrentUserSettings(
				rootStore.getRestApiContext,
				settings,
			);
			if (this.currentUser) {
				this.currentUser.settings = updatedSettings;
				this.addUsers([this.currentUser]);
			}
		},
		async updateCurrentUserPassword({
			password,
			currentPassword,
		}: {
			password: string;
			currentPassword: string;
		}): Promise<void> {
			const rootStore = useRootStore();
			await updateCurrentUserPassword(rootStore.getRestApiContext, {
				newPassword: password,
				currentPassword,
			});
		},
		async deleteUser(params: { id: string; transferId?: string }): Promise<void> {
			const rootStore = useRootStore();
			await deleteUser(rootStore.getRestApiContext, params);
			this.deleteUserById(params.id);
		},
		async fetchUsers(): Promise<void> {
			const rootStore = useRootStore();
			const users = await getUsers(rootStore.getRestApiContext);
			this.addUsers(users);
		},
		async inviteUsers(params: Array<{ email: string }>): Promise<IInviteResponse[]> {
			const rootStore = useRootStore();
			const users = await inviteUsers(rootStore.getRestApiContext, params);
			this.addUsers(users.map(({ user }) => ({ isPending: true, ...user })));
			return users;
		},
		async reinviteUser(params: { id: string }): Promise<void> {
			const rootStore = useRootStore();
			await reinvite(rootStore.getRestApiContext, params);
		},
		async getUserInviteLink(params: { id: string }): Promise<{ link: string }> {
			const rootStore = useRootStore();
			return getInviteLink(rootStore.getRestApiContext, params);
		},
		async submitPersonalizationSurvey(results: IPersonalizationLatestVersion): Promise<void> {
			const rootStore = useRootStore();
			await submitPersonalizationSurvey(rootStore.getRestApiContext, results);
			this.setPersonalizationAnswers(results);
		},
		async showPersonalizationSurvey(): Promise<void> {
			const settingsStore = useSettingsStore();
			const surveyEnabled = settingsStore.isPersonalizationSurveyEnabled;
			const currentUser = this.currentUser;
			if (surveyEnabled && currentUser && !currentUser.personalizationAnswers) {
				const uiStore = useUIStore();
				uiStore.openModal(PERSONALIZATION_MODAL_KEY);
			}
		},
		async showUserActivationSurveyModal() {
			const settingsStore = useSettingsStore();
			if (settingsStore.isUserActivationSurveyEnabled) {
				const currentUser = this.currentUser;
				if (currentUser?.settings?.showUserActivationSurvey) {
					const uiStore = useUIStore();
					uiStore.openModal(USER_ACTIVATION_SURVEY_MODAL);
				}
			}
		},
		async skipOwnerSetup(): Promise<void> {
			try {
				const rootStore = useRootStore();
				const settingsStore = useSettingsStore();
				settingsStore.stopShowingSetupPage();
				await skipOwnerSetup(rootStore.getRestApiContext);
			} catch (error) {}
		},
	},
});
