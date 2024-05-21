import type { UpdateGlobalRolePayload } from '@/api/users';
import {
	changePassword,
	deleteUser,
	getPasswordResetLink,
	getUsers,
	login,
	loginCurrentUser,
	logout,
	sendForgotPasswordEmail,
	setupOwner,
	submitPersonalizationSurvey,
	updateCurrentUser,
	updateCurrentUserPassword,
	updateCurrentUserSettings,
	updateOtherUserSettings,
	validatePasswordToken,
	validateSignupToken,
	updateGlobalRole,
} from '@/api/users';
import { PERSONALIZATION_MODAL_KEY, STORES, ROLE } from '@/constants';
import type {
	Cloud,
	IInviteResponse,
	IPersonalizationLatestVersion,
	IRole,
	IUser,
	IUserResponse,
	IUsersState,
	CurrentUserResponse,
	InvitableRoleName,
} from '@/Interface';
import { getPersonalizedNodeTypes } from '@/utils/userUtils';
import { defineStore } from 'pinia';
import { useRootStore } from './n8nRoot.store';
import { usePostHog } from './posthog.store';
import { useSettingsStore } from './settings.store';
import { useUIStore } from './ui.store';
import { useCloudPlanStore } from './cloudPlan.store';
import { disableMfa, enableMfa, getMfaQR, verifyMfaToken } from '@/api/mfa';
import { confirmEmail, getCloudUserInfo } from '@/api/cloudPlans';
import { useRBACStore } from '@/stores/rbac.store';
import type { Scope } from '@n8n/permissions';
import { inviteUsers, acceptInvitation } from '@/api/invitation';

const isPendingUser = (user: IUserResponse | null) => !!user?.isPending;
const isInstanceOwner = (user: IUserResponse | null) => user?.role === ROLE.Owner;
const isDefaultUser = (user: IUserResponse | null) => isInstanceOwner(user) && isPendingUser(user);

export const useUsersStore = defineStore(STORES.USERS, {
	state: (): IUsersState => ({
		initialized: false,
		currentUserId: null,
		users: {},
		currentUserCloudInfo: null,
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
		mfaEnabled(): boolean {
			return this.currentUser?.mfaEnabled ?? false;
		},
		getUserById(state) {
			return (userId: string): IUser | null => state.users[userId];
		},
		globalRoleName(): IRole {
			return this.currentUser?.role ?? 'default';
		},
		personalizedNodeTypes(): string[] {
			const user = this.currentUser;
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
		async initialize() {
			if (this.initialized) {
				return;
			}

			try {
				await this.loginWithCookie();
				this.initialized = true;
			} catch (e) {}
		},
		setCurrentUser(user: CurrentUserResponse) {
			this.addUsers([user]);
			this.currentUserId = user.id;

			const defaultScopes: Scope[] = [];
			useRBACStore().setGlobalScopes(user.globalScopes || defaultScopes);
			usePostHog().init(user.featureFlags);
		},
		unsetCurrentUser() {
			this.currentUserId = null;
			this.currentUserCloudInfo = null;
			useRBACStore().setGlobalScopes([]);
		},
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
				};

				this.users = {
					...this.users,
					[user.id]: user,
				};
			});
		},
		deleteUserById(userId: string): void {
			const { [userId]: _, ...users } = this.users;
			this.users = users;
		},
		setPersonalizationAnswers(answers: IPersonalizationLatestVersion): void {
			if (!this.currentUser) {
				return;
			}

			this.users = {
				...this.users,
				[this.currentUser.id]: {
					...this.currentUser,
					personalizationAnswers: answers,
				},
			};
		},
		async loginWithCookie(): Promise<void> {
			const rootStore = useRootStore();
			const user = await loginCurrentUser(rootStore.getRestApiContext);
			if (!user) {
				return;
			}

			this.setCurrentUser(user);
		},
		async loginWithCreds(params: {
			email: string;
			password: string;
			mfaToken?: string;
			mfaRecoveryCode?: string;
		}): Promise<void> {
			const rootStore = useRootStore();
			const user = await login(rootStore.getRestApiContext, params);
			if (!user) {
				return;
			}

			this.setCurrentUser(user);
		},
		async logout(): Promise<void> {
			const rootStore = useRootStore();
			await logout(rootStore.getRestApiContext);
			this.unsetCurrentUser();
			useCloudPlanStore().reset();
			usePostHog().reset();
			useUIStore().clearBannerStack();
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
				this.setCurrentUser(user);
				settingsStore.stopShowingSetupPage();
			}
		},
		async validateSignupToken(params: {
			inviteeId: string;
			inviterId: string;
		}): Promise<{ inviter: { firstName: string; lastName: string } }> {
			const rootStore = useRootStore();
			return await validateSignupToken(rootStore.getRestApiContext, params);
		},
		async acceptInvitation(params: {
			inviteeId: string;
			inviterId: string;
			firstName: string;
			lastName: string;
			password: string;
		}): Promise<void> {
			const rootStore = useRootStore();
			const user = await acceptInvitation(rootStore.getRestApiContext, params);
			if (user) {
				this.setCurrentUser(user);
			}
		},
		async sendForgotPasswordEmail(params: { email: string }): Promise<void> {
			const rootStore = useRootStore();
			await sendForgotPasswordEmail(rootStore.getRestApiContext, params);
		},
		async validatePasswordToken(params: { token: string }): Promise<void> {
			const rootStore = useRootStore();
			await validatePasswordToken(rootStore.getRestApiContext, params);
		},
		async changePassword(params: {
			token: string;
			password: string;
			mfaToken?: string;
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
		async updateOtherUserSettings(
			userId: string,
			settings: IUserResponse['settings'],
		): Promise<void> {
			const rootStore = useRootStore();
			const updatedSettings = await updateOtherUserSettings(
				rootStore.getRestApiContext,
				userId,
				settings,
			);
			this.users[userId].settings = updatedSettings;
			this.addUsers([this.users[userId]]);
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
		async inviteUsers(
			params: Array<{ email: string; role: InvitableRoleName }>,
		): Promise<IInviteResponse[]> {
			const rootStore = useRootStore();
			const users = await inviteUsers(rootStore.getRestApiContext, params);
			this.addUsers(
				users.map(({ user }, index) => ({
					isPending: true,
					globalRole: { name: params[index].role },
					...user,
				})),
			);
			return users;
		},
		async reinviteUser({ email, role }: { email: string; role: InvitableRoleName }): Promise<void> {
			const rootStore = useRootStore();
			const invitationResponse = await inviteUsers(rootStore.getRestApiContext, [{ email, role }]);
			if (!invitationResponse[0].user.emailSent) {
				throw Error(invitationResponse[0].error);
			}
		},
		async getUserPasswordResetLink(params: { id: string }): Promise<{ link: string }> {
			const rootStore = useRootStore();
			return await getPasswordResetLink(rootStore.getRestApiContext, params);
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
		async getMfaQR(): Promise<{ qrCode: string; secret: string; recoveryCodes: string[] }> {
			const rootStore = useRootStore();
			return await getMfaQR(rootStore.getRestApiContext);
		},
		async verifyMfaToken(data: { token: string }): Promise<void> {
			const rootStore = useRootStore();
			return await verifyMfaToken(rootStore.getRestApiContext, data);
		},
		async enableMfa(data: { token: string }) {
			const rootStore = useRootStore();
			const usersStore = useUsersStore();
			await enableMfa(rootStore.getRestApiContext, data);
			const currentUser = usersStore.currentUser;
			if (currentUser) {
				currentUser.mfaEnabled = true;
			}
		},
		async disabledMfa() {
			const rootStore = useRootStore();
			const usersStore = useUsersStore();
			await disableMfa(rootStore.getRestApiContext);
			const currentUser = usersStore.currentUser;
			if (currentUser) {
				currentUser.mfaEnabled = false;
			}
		},
		async fetchUserCloudAccount() {
			let cloudUser: Cloud.UserAccount | null = null;
			try {
				cloudUser = await getCloudUserInfo(useRootStore().getRestApiContext);
				this.currentUserCloudInfo = cloudUser;
			} catch (error) {
				throw new Error(error);
			}
		},
		async confirmEmail() {
			await confirmEmail(useRootStore().getRestApiContext);
		},

		async updateGlobalRole({ id, newRoleName }: UpdateGlobalRolePayload) {
			const rootStore = useRootStore();
			await updateGlobalRole(rootStore.getRestApiContext, { id, newRoleName });
			await this.fetchUsers();
		},
	},
});
