import { changePassword, deleteUser, getCurrentUser, getUsers, inviteUsers, login, loginCurrentUser, logout, reinvite, sendForgotPasswordEmail, setupOwner, signup, skipOwnerSetup, submitPersonalizationSurvey, updateCurrentUser, updateCurrentUserPassword, validatePasswordToken, validateSignupToken } from "@/api/users";
import { PERSONALIZATION_MODAL_KEY, STORES } from "@/constants";
import { IInviteResponse, IPersonalizationLatestVersion, IUser, IUserResponse, IUsersState } from "@/Interface";
import { getPersonalizedNodeTypes, isAuthorized, PERMISSIONS, ROLE } from "@/stores/userHelpers";
import { defineStore } from "pinia";
import Vue from "vue";
import { useRootStore } from "./n8nRootStore";
import { useSettingsStore } from "./settings";
import { useUIStore } from "./ui";

const isDefaultUser = (user: IUserResponse | null) => Boolean(user && user.isPending && user.globalRole && user.globalRole.name === ROLE.Owner);
const isPendingUser = (user: IUserResponse | null) => Boolean(user && user.isPending);

export const useUsersStore = defineStore(STORES.USERS, {
	state: (): IUsersState => ({
		currentUserId: null,
		users: {},
	}),
	getters: {
		allUsers(): IUser[] {
			return Object.values(this.users);
		},
		currentUser(): IUser | null {
			return this.currentUserId ? this.users[this.currentUserId] : null;
		},
		getUserById(): (userId: string) => IUser | null {
			return (userId: string): IUser | null => this.users[userId];
		},
		globalRoleName(): string {
			return this.currentUser?.globalRole?.name || '';
		},
		canUserDeleteTags(): boolean {
			return isAuthorized(PERMISSIONS.TAGS.CAN_DELETE_TAGS, this.currentUser);
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
					fullName: userResponse.firstName? `${updatedUser.firstName} ${updatedUser.lastName || ''}`: undefined,
					isDefaultUser: isDefaultUser(updatedUser),
					isPendingUser: isPendingUser(updatedUser),
					isOwner: Boolean(updatedUser.globalRole && updatedUser.globalRole.name === ROLE.Owner),
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
		async getCurrentUser(): void {
			const rootStore = useRootStore();
			const user = await getCurrentUser(rootStore.getRestApiContext);
			if (user) {
				this.addUsers([user]);
				this.currentUserId = user.id;
			}
		},
		async loginWithCookie(): void {
			const rootStore = useRootStore();
			const user = await loginCurrentUser(rootStore.getRestApiContext);
			if (user) {
				this.addUsers([user]);
				this.currentUserId = user.id;
			}
		},
		async loginWithCreds(params: {email: string, password: string}): Promise<void> {
			const rootStore = useRootStore();
			const user = await login(rootStore.getRestApiContext, params);
			if (user) {
				this.addUsers([user]);
				this.currentUserId = user.id;
			}
		},
		async logout(): Promise<void> {
			const rootStore = useRootStore();
			await logout(rootStore.getRestApiContext);
			this.currentUserId = null;
		},
		async createOwner(params: { firstName: string; lastName: string; email: string; password: string;}): Promise<void> {
			const rootStore = useRootStore();
			const user = await setupOwner(rootStore.getRestApiContext, params);
			const settingsStore = useSettingsStore();
			if (user) {
				this.addUsers([user]);
				this.currentUserId = user.id;
				settingsStore.stopShowingSetupPage();
			}
		},
		async validateSignupToken(params: {inviteeId: string, inviterId: string}): Promise<{ inviter: { firstName: string, lastName: string } }> {
			const rootStore = useRootStore();
			return await validateSignupToken(rootStore.getRestApiContext, params);
		},
		async signup(params: { inviteeId: string; inviterId: string; firstName: string; lastName: string; password: string;}): Promise<void> {
			const rootStore = useRootStore();
			const user = await signup(rootStore.getRestApiContext, params);
			if (user) {
				this.addUsers([user]);
				this.currentUserId = user.id;
			}
		},
		async sendForgotPasswordEmail( params: {email: string}): Promise<void> {
			const rootStore = useRootStore();
			await sendForgotPasswordEmail(rootStore.getRestApiContext, params);
		},
		async validatePasswordToken(params: {token: string, userId: string}): Promise<void> {
			const rootStore = useRootStore();
			await validatePasswordToken(rootStore.getRestApiContext, params);
		},
		async changePassword(params: {token: string, password: string, userId: string}): Promise<void> {
			const rootStore = useRootStore();
			await changePassword(rootStore.getRestApiContext, params);
		},
		async updateUser(params: {id: string, firstName: string, lastName: string, email: string}): Promise<void> {
			const rootStore = useRootStore();
			const user = await updateCurrentUser(rootStore.getRestApiContext, params);
			this.addUsers([user]);
		},
		async updateCurrentUserPassword({password, currentPassword}: {password: string, currentPassword: string}): Promise<void> {
			const rootStore = useRootStore();
			await updateCurrentUserPassword(rootStore.getRestApiContext, {newPassword: password, currentPassword});
		},
		async deleteUser(params: { id: string, transferId?: string}): Promise<void> {
			const rootStore = useRootStore();
			await deleteUser(rootStore.getRestApiContext, params);
			this.deleteUserById(params.id);
		},
		async fetchUsers(): Promise<void> {
			const rootStore = useRootStore();
			const users = await getUsers(rootStore.getRestApiContext);
			this.addUsers(users);
		},
		async inviteUsers(params: Array<{email: string}>): Promise<IInviteResponse[]> {
			const rootStore = useRootStore();
			const users = await inviteUsers(rootStore.getRestApiContext, params);
			this.addUsers(users.map(({user}) => ({ isPending: true, ...user })));
			return users;
		},
		async reinviteUser(params: {id: string}): Promise<void> {
			const rootStore = useRootStore();
			await reinvite(rootStore.getRestApiContext, params);
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
