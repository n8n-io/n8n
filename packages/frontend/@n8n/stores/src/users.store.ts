import {
	type LoginRequestDto,
	type PasswordUpdateRequestDto,
	type SettingsUpdateRequestDto,
	type UserSelfSettingsUpdateRequestDto,
	type UserUpdateRequestDto,
	type User,
	ROLE,
	type UsersListFilterDto,
} from '@n8n/api-types';
import { BROWSER_ID_STORAGE_KEY } from '@n8n/constants';
import { PERSONALIZATION_MODAL_KEY } from '@n8n/frontend-constants/users';
import type { AssignableGlobalRole } from '@n8n/permissions';
import * as cloudApi from '@n8n/rest-api-client/api/cloudPlans';
import * as mfaApi from '@n8n/rest-api-client/api/mfa';
import * as ssoApi from '@n8n/rest-api-client/api/sso';
import type {
	UpdateGlobalRolePayload,
	IUserResponse,
	IUser,
	CurrentUserResponse,
	IPersonalizationLatestVersion,
} from '@n8n/rest-api-client/api/users';
import * as usersApi from '@n8n/rest-api-client/api/users';
import { useAsyncState } from '@vueuse/core';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import { STORES } from './constants';
import * as invitationsApi from './invitation.api';
import type { ModalOpeners } from './modalOpeners';
import * as onboardingApi from './onboarding.api';
import { useSettingsStore } from './settings.store';
import { useRootStore } from './useRootStore';

const _isPendingUser = (user: IUserResponse | null) => !!user?.isPending;
const _isInstanceOwner = (user: IUserResponse | null) => user?.role === ROLE.Owner;
const _isDefaultUser = (user: IUserResponse | null) =>
	_isInstanceOwner(user) && _isPendingUser(user);
const _isAdmin = (user: IUserResponse | null) => user?.role === ROLE.Admin;

export type LoginHook = (user: CurrentUserResponse) => void | Promise<void>;
type LogoutHook = () => void | Promise<void>;

export const useUsersStore = defineStore(STORES.USERS, () => {
	const initialized = ref(false);
	const currentUserId = ref<string | null>(null);
	const usersById = ref<Record<string, IUser>>({});
	const userQuota = ref<number>(-1);

	const loginHooks = ref<LoginHook[]>([]);
	const logoutHooks = ref<LogoutHook[]>([]);

	// Modal-open actions, registered at app bootstrap (see app/init.ts). Until then
	// they no-op — warning in dev — so the store never reaches into `ui.store`. Shares
	// the `ModalOpeners` contract with the other decoupled stores; this store currently
	// uses only `openModal`.
	const warnModalOpenerMissing = (action: string) => {
		if (import.meta.env.DEV) {
			console.warn(
				`[users.store] ${action} called before modal openers were registered; ignoring. Call registerModalOpeners() at app bootstrap.`,
			);
		}
	};
	const modalOpeners = ref<ModalOpeners>({
		openModal: (name) => warnModalOpenerMissing(`openModal(${String(name)})`),
		openModalWithData: (payload) =>
			warnModalOpenerMissing(`openModalWithData(${String(payload.name)})`),
	});
	const registerModalOpeners = (openers: ModalOpeners) => {
		modalOpeners.value = openers;
	};

	// App-provided capabilities, registered at bootstrap (see app/init.ts) so the store
	// carries no `@/app` dependency. Both fall back to safe no-ops before registration.

	// Permission checks, keyed by capability (app RBAC checks; extend the object as
	// more permissions need resolving). `listUsers` gates the `user:list` scope.
	const canListUsers = ref<() => boolean>(() => false);
	const setPermissionsResolvers = (resolvers: { listUsers: () => boolean }) => {
		canListUsers.value = resolvers.listUsers;
	};

	// Stores

	const rootStore = useRootStore();
	const settingsStore = useSettingsStore();

	// Computed

	const allUsers = computed(() => Object.values(usersById.value));

	const currentUser = computed(() =>
		currentUserId.value ? usersById.value[currentUserId.value] : null,
	);

	const userActivated = computed(() => Boolean(currentUser.value?.settings?.userActivated));

	const isDefaultUser = computed(() => _isDefaultUser(currentUser.value));

	const isInstanceOwner = computed(() => _isInstanceOwner(currentUser.value));

	const isAdmin = computed(() => _isAdmin(currentUser.value));

	const isAdminOrOwner = computed(() => isInstanceOwner.value || isAdmin.value);

	const mfaEnabled = computed(() => currentUser.value?.mfaEnabled ?? false);

	const globalRoleName = computed(() => currentUser.value?.role ?? 'default');

	const userClaimedAiCredits = computed(() => currentUser.value?.settings?.userClaimedAiCredits);

	const isEasyAIWorkflowOnboardingDone = computed(() =>
		Boolean(currentUser.value?.settings?.easyAIWorkflowOnboarded),
	);

	const canUserUpdateVersion = computed(() => {
		return isInstanceOwner.value;
	});

	const setEasyAIWorkflowOnboardingDone = () => {
		if (currentUser.value?.settings) {
			currentUser.value.settings.easyAIWorkflowOnboarded = true;
		}
	};

	const isCalloutDismissed = (callout: string) =>
		Boolean(currentUser.value?.settings?.dismissedCallouts?.[callout]);

	const setCalloutDismissed = (callout: string) => {
		if (currentUser.value?.settings) {
			currentUser.value.settings.dismissedCallouts ??= {};

			currentUser.value.settings.dismissedCallouts[callout] = true;
		}
	};

	const usersLimitNotReached = computed(
		(): boolean => userQuota.value === -1 || userQuota.value > allUsers.value.length,
	);

	// Methods

	const addUsers = (newUsers: User[]) => {
		newUsers.forEach((userResponse) => {
			const prevUser = usersById.value[userResponse.id] || {};
			const updatedUser = {
				...prevUser,
				...userResponse,
			};
			const user: IUser = {
				...updatedUser,
				fullName: userResponse.firstName
					? `${updatedUser.firstName} ${updatedUser.lastName ?? ''}`
					: undefined,
				isDefaultUser: _isDefaultUser(updatedUser),
				isPendingUser: _isPendingUser(updatedUser),
			};

			usersById.value = {
				...usersById.value,
				[user.id]: user,
			};
		});
	};

	const setCurrentUser = async (user: CurrentUserResponse) => {
		addUsers([user]);
		currentUserId.value = user.id;

		for (const hook of loginHooks.value) {
			try {
				await hook(user);
			} catch (error) {
				console.error('Error executing login hook:', error);
			}
		}
	};

	const loginWithCookie = async () => {
		const user = await usersApi.loginCurrentUser(rootStore.restApiContext);
		if (!user) {
			return;
		}

		await setCurrentUser(user);
	};

	const initialize = async () => {
		if (initialized.value) {
			return;
		}

		try {
			await loginWithCookie();
			initialized.value = true;
		} catch {
			// A missing or expired auth cookie before setup is expected; leave the store
			// uninitialized and let the caller proceed to the login/setup flow.
		}
	};

	const unsetCurrentUser = () => {
		currentUserId.value = null;
	};

	const deleteUserById = (userId: string) => {
		const { [userId]: _, ...rest } = usersById.value;
		usersById.value = rest;
	};

	const setPersonalizationAnswers = (answers: IPersonalizationLatestVersion) => {
		if (!currentUser.value) {
			return;
		}

		usersById.value = {
			...usersById.value,
			[currentUser.value.id]: {
				...currentUser.value,
				personalizationAnswers: answers,
			},
		};
	};

	const loginWithCreds = async (params: LoginRequestDto) => {
		const user = await usersApi.login(rootStore.restApiContext, params);
		if (!user) {
			return;
		}

		await setCurrentUser(user);
	};

	const registerLoginHook = (hook: LoginHook) => {
		loginHooks.value.push(hook);
	};

	const registerLogoutHook = (hook: LogoutHook) => {
		logoutHooks.value.push(hook);
	};

	const logout = async (options?: { viaOidc?: boolean }) => {
		let redirectUrl: string | null = null;

		if (options?.viaOidc) {
			try {
				({ redirectUrl } = await ssoApi.oidcLogout(rootStore.restApiContext));
			} catch {
				// The OIDC logout endpoint may be unavailable (e.g. the license
				// lapsed since login). Fall back to the standard logout so the
				// n8n session is terminated in any case.
				await usersApi.logout(rootStore.restApiContext);
			}
		} else {
			await usersApi.logout(rootStore.restApiContext);
		}

		unsetCurrentUser();

		for (const hook of logoutHooks.value) {
			try {
				await hook();
			} catch (error) {
				console.error('Error executing logout hook:', error);
			}
		}

		localStorage.removeItem(BROWSER_ID_STORAGE_KEY);

		return { redirectUrl };
	};

	const createOwner = async (params: {
		firstName: string;
		lastName: string;
		email: string;
		password: string;
	}) => {
		const user = await usersApi.setupOwner(rootStore.restApiContext, params);
		if (user) {
			await setCurrentUser(user);
			settingsStore.stopShowingSetupPage();
		}
	};

	const validateSignupToken = async (params: { token: string }) => {
		return await usersApi.validateSignupToken(rootStore.restApiContext, params);
	};

	const acceptInvitation = async (params: {
		token: string;
		firstName: string;
		lastName: string;
		password: string;
	}) => {
		const user = await invitationsApi.acceptInvitation(rootStore.restApiContext, params);
		if (user) {
			await setCurrentUser(user);
		}
	};

	const sendForgotPasswordEmail = async (params: { email: string }) => {
		await usersApi.sendForgotPasswordEmail(rootStore.restApiContext, params);
	};

	const validatePasswordToken = async (params: { token: string }) => {
		await usersApi.validatePasswordToken(rootStore.restApiContext, params);
	};

	const changePassword = async (params: { token: string; password: string; mfaCode?: string }) => {
		await usersApi.changePassword(rootStore.restApiContext, params);
	};

	const updateUser = async (params: UserUpdateRequestDto) => {
		const user = await usersApi.updateCurrentUser(rootStore.restApiContext, params);
		addUsers([user]);
		return user;
	};

	const updateUserName = async (params: { firstName: string; lastName: string }) => {
		if (!currentUser.value) {
			return;
		}

		return await updateUser({
			email: currentUser.value.email as string,
			...params,
		});
	};

	const updateUserSettings = async (settings: UserSelfSettingsUpdateRequestDto) => {
		const updatedSettings = await usersApi.updateCurrentUserSettings(
			rootStore.restApiContext,
			settings,
		);
		if (currentUser.value) {
			currentUser.value.settings = updatedSettings;
			addUsers([currentUser.value]);
		}
	};

	const updateOtherUserSettings = async (userId: string, settings: SettingsUpdateRequestDto) => {
		await usersApi.updateOtherUserSettings(rootStore.restApiContext, userId, settings);
	};

	const updateCurrentUserPassword = async (params: PasswordUpdateRequestDto) => {
		await usersApi.updateCurrentUserPassword(rootStore.restApiContext, params);
	};

	const deleteUser = async (params: { id: string; transferId?: string }) => {
		await usersApi.deleteUser(rootStore.restApiContext, params);
		deleteUserById(params.id);
	};

	const fetchUsers = async ({
		take,
		skip,
		filter,
	}: { take?: number; skip?: number; filter?: UsersListFilterDto['filter'] } = {}) => {
		if (!canListUsers.value()) {
			return;
		}

		const { items } = await usersApi.getUsers(rootStore.restApiContext, {
			take: take ?? 50,
			skip: skip ?? 0,
			filter,
		});
		addUsers(items);
	};

	const inviteUsers = async (params: Array<{ email: string; role: AssignableGlobalRole }>) => {
		const invitedUsers = await invitationsApi.inviteUsers(rootStore.restApiContext, params);
		addUsers(
			invitedUsers.map(({ user }) => ({
				isPending: true,
				...user,
			})),
		);
		return invitedUsers;
	};

	const reinviteUser = async ({ email, role }: { email: string; role: AssignableGlobalRole }) => {
		const invitationResponse = await invitationsApi.inviteUsers(rootStore.restApiContext, [
			{ email, role },
		]);
		if (!invitationResponse[0].user.emailSent) {
			throw Error(invitationResponse[0].error);
		}
	};

	const getUserPasswordResetLink = async (params: { id: string }) => {
		return await usersApi.getPasswordResetLink(rootStore.restApiContext, params);
	};

	const generateInviteLink = async (params: { id: string }) => {
		return await usersApi.generateInviteLink(rootStore.restApiContext, params);
	};

	const submitPersonalizationSurvey = async (results: IPersonalizationLatestVersion) => {
		await usersApi.submitPersonalizationSurvey(rootStore.restApiContext, results);
		setPersonalizationAnswers(results);
	};

	// Synchronous: after the `ui.store` modal decoupling this only fires the injected
	// opener. All call sites invoke it fire-and-forget (`void ...`).
	const showPersonalizationSurvey = () => {
		const surveyEnabled = settingsStore.isPersonalizationSurveyEnabled;
		if (surveyEnabled && currentUser.value && !currentUser.value.personalizationAnswers) {
			modalOpeners.value.openModal(PERSONALIZATION_MODAL_KEY);
		}
	};

	const fetchMfaQR = async () => {
		return await mfaApi.getMfaQR(rootStore.restApiContext);
	};

	const verifyMfaCode = async (data: { mfaCode: string }) => {
		return await mfaApi.verifyMfaCode(rootStore.restApiContext, data);
	};

	const canEnableMFA = async () => {
		return await mfaApi.canEnableMFA(rootStore.restApiContext);
	};

	const enableMfa = async (data: { mfaCode: string }) => {
		await mfaApi.enableMfa(rootStore.restApiContext, data);
		if (currentUser.value) {
			currentUser.value.mfaEnabled = true;
		}
	};

	const disableMfa = async (data: mfaApi.DisableMfaParams) => {
		await mfaApi.disableMfa(rootStore.restApiContext, data);

		if (currentUser.value) {
			currentUser.value.mfaEnabled = false;
		}
	};

	const updateEnforceMfa = async (enforce: boolean) => {
		await mfaApi.updateEnforceMfa(rootStore.restApiContext, enforce);
		settingsStore.isMFAEnforced = enforce;
	};

	const sendConfirmationEmail = async () => {
		await cloudApi.sendConfirmationEmail(rootStore.restApiContext);
	};

	const updateGlobalRole = async ({ id, newRoleName }: UpdateGlobalRolePayload) => {
		await usersApi.updateGlobalRole(rootStore.restApiContext, { id, newRoleName });
		await fetchUsers({ filter: { ids: [id] } });
	};

	const submitContactEmail = async (email: string, agree: boolean) => {
		if (currentUser.value) {
			return await onboardingApi.submitEmailOnSignup(
				rootStore.instanceId,
				currentUser.value,
				email ?? currentUser.value.email,
				agree,
			);
		}
		return null;
	};

	const usersList = useAsyncState(
		async (filter?: UsersListFilterDto) =>
			await usersApi.getUsers(rootStore.restApiContext, filter),
		{
			count: 0,
			items: [],
		},
		{ immediate: false, resetOnExecute: false },
	);

	const setUserQuota = (quota?: number) => {
		if (typeof quota !== 'undefined') {
			userQuota.value = quota;
		}
	};

	return {
		initialized,
		currentUserId,
		usersById,
		allUsers,
		currentUser,
		userActivated,
		isDefaultUser,
		isInstanceOwner,
		isAdmin,
		isAdminOrOwner,
		mfaEnabled,
		globalRoleName,
		userClaimedAiCredits,
		isEasyAIWorkflowOnboardingDone,
		canUserUpdateVersion,
		usersLimitNotReached,
		addUsers,
		loginWithCookie,
		initialize,
		setPersonalizationAnswers,
		loginWithCreds,
		logout,
		registerLoginHook,
		registerLogoutHook,
		registerModalOpeners,
		setPermissionsResolvers,
		createOwner,
		validateSignupToken,
		acceptInvitation,
		sendForgotPasswordEmail,
		validatePasswordToken,
		changePassword,
		updateUser,
		updateUserName,
		updateUserSettings,
		updateOtherUserSettings,
		updateCurrentUserPassword,
		deleteUser,
		fetchUsers,
		inviteUsers,
		reinviteUser,
		getUserPasswordResetLink,
		generateInviteLink,
		submitPersonalizationSurvey,
		showPersonalizationSurvey,
		fetchMfaQR,
		verifyMfaCode,
		enableMfa,
		disableMfa,
		updateEnforceMfa,
		canEnableMFA,
		sendConfirmationEmail,
		updateGlobalRole,
		setEasyAIWorkflowOnboardingDone,
		isCalloutDismissed,
		setCalloutDismissed,
		submitContactEmail,
		setUserQuota,
		usersList,
	};
});
