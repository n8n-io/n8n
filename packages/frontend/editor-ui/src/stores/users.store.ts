import { useAsyncState } from '@vueuse/core';
import {
	type LoginRequestDto,
	type PasswordUpdateRequestDto,
	type SettingsUpdateRequestDto,
	type UserUpdateRequestDto,
	type User,
	ROLE,
	type UsersListFilterDto,
} from '@n8n/api-types';
import type { UpdateGlobalRolePayload } from '@/api/users';
import * as usersApi from '@/api/users';
import { BROWSER_ID_STORAGE_KEY } from '@n8n/constants';
import { PERSONALIZATION_MODAL_KEY } from '@/constants';
import { STORES } from '@n8n/stores';
import type {
	IPersonalizationLatestVersion,
	IUser,
	IUserResponse,
	CurrentUserResponse,
	InvitableRoleName,
} from '@/Interface';
import { getPersonalizedNodeTypes } from '@/utils/userUtils';
import { defineStore } from 'pinia';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useUIStore } from './ui.store';
import * as mfaApi from '@n8n/rest-api-client/api/mfa';
import * as cloudApi from '@n8n/rest-api-client/api/cloudPlans';
import * as invitationsApi from '@/api/invitation';
import { computed, ref } from 'vue';
import { useSettingsStore } from '@/stores/settings.store';
import * as onboardingApi from '@/api/workflow-webhooks';
import * as promptsApi from '@n8n/rest-api-client/api/prompts';

const _isPendingUser = (user: IUserResponse | null) => !!user?.isPending;
const _isInstanceOwner = (user: IUserResponse | null) => user?.role === ROLE.Owner;
const _isDefaultUser = (user: IUserResponse | null) =>
	_isInstanceOwner(user) && _isPendingUser(user);

type LoginHook = (user: CurrentUserResponse) => void;
type LogoutHook = () => void;

export const useUsersStore = defineStore(STORES.USERS, () => {
	const initialized = ref(false);
	const currentUserId = ref<string | null>(null);
	const usersById = ref<Record<string, IUser>>({});
	const userQuota = ref<number>(-1);

	const loginHooks = ref<LoginHook[]>([]);
	const logoutHooks = ref<LogoutHook[]>([]);

	// Stores

	const uiStore = useUIStore();
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

	const mfaEnabled = computed(() => currentUser.value?.mfaEnabled ?? false);

	const globalRoleName = computed(() => currentUser.value?.role ?? 'default');

	const userClaimedAiCredits = computed(() => currentUser.value?.settings?.userClaimedAiCredits);

	const isEasyAIWorkflowOnboardingDone = computed(() =>
		Boolean(currentUser.value?.settings?.easyAIWorkflowOnboarded),
	);

	const setEasyAIWorkflowOnboardingDone = () => {
		if (currentUser.value?.settings) {
			currentUser.value.settings.easyAIWorkflowOnboarded = true;
		}
	};

	const isCalloutDismissed = (callout: string) =>
		Boolean(currentUser.value?.settings?.dismissedCallouts?.[callout]);

	const setCalloutDismissed = (callout: string) => {
		if (currentUser.value?.settings) {
			if (!currentUser.value?.settings?.dismissedCallouts) {
				currentUser.value.settings.dismissedCallouts = {};
			}

			currentUser.value.settings.dismissedCallouts[callout] = true;
		}
	};

	const personalizedNodeTypes = computed(() => {
		const user = currentUser.value;
		if (!user) {
			return [];
		}

		const answers = user.personalizationAnswers;
		if (!answers) {
			return [];
		}
		return getPersonalizedNodeTypes(answers);
	});

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
					? `${updatedUser.firstName} ${updatedUser.lastName || ''}`
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

	const setCurrentUser = (user: CurrentUserResponse) => {
		addUsers([user]);
		currentUserId.value = user.id;

		for (const hook of loginHooks.value) {
			try {
				hook(user);
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

		setCurrentUser(user);
	};

	const initialize = async (options: { quota?: number } = {}) => {
		if (initialized.value) {
			return;
		}

		if (typeof options.quota !== 'undefined') {
			userQuota.value = options.quota;
		}

		try {
			await loginWithCookie();
			initialized.value = true;
		} catch (e) {}
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

		setCurrentUser(user);
	};

	const registerLoginHook = (hook: LoginHook) => {
		loginHooks.value.push(hook);
	};

	const registerLogoutHook = (hook: LogoutHook) => {
		logoutHooks.value.push(hook);
	};

	const logout = async () => {
		await usersApi.logout(rootStore.restApiContext);

		unsetCurrentUser();

		for (const hook of logoutHooks.value) {
			try {
				hook();
			} catch (error) {
				console.error('Error executing logout hook:', error);
			}
		}

		localStorage.removeItem(BROWSER_ID_STORAGE_KEY);
	};

	const createOwner = async (params: {
		firstName: string;
		lastName: string;
		email: string;
		password: string;
	}) => {
		const user = await usersApi.setupOwner(rootStore.restApiContext, params);
		if (user) {
			setCurrentUser(user);
			settingsStore.stopShowingSetupPage();
		}
	};

	const validateSignupToken = async (params: { inviteeId: string; inviterId: string }) => {
		return await usersApi.validateSignupToken(rootStore.restApiContext, params);
	};

	const acceptInvitation = async (params: {
		inviteeId: string;
		inviterId: string;
		firstName: string;
		lastName: string;
		password: string;
	}) => {
		const user = await invitationsApi.acceptInvitation(rootStore.restApiContext, params);
		if (user) {
			setCurrentUser(user);
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

	const updateUserSettings = async (settings: SettingsUpdateRequestDto) => {
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

	const fetchUsers = async () => {
		const { items } = await usersApi.getUsers(rootStore.restApiContext, { take: -1, skip: 0 });
		addUsers(items);
	};

	const inviteUsers = async (params: Array<{ email: string; role: InvitableRoleName }>) => {
		const invitedUsers = await invitationsApi.inviteUsers(rootStore.restApiContext, params);
		addUsers(
			invitedUsers.map(({ user }) => ({
				isPending: true,
				...user,
			})),
		);
		return invitedUsers;
	};

	const reinviteUser = async ({ email, role }: { email: string; role: InvitableRoleName }) => {
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

	const submitPersonalizationSurvey = async (results: IPersonalizationLatestVersion) => {
		await usersApi.submitPersonalizationSurvey(rootStore.restApiContext, results);
		setPersonalizationAnswers(results);
	};

	const showPersonalizationSurvey = async () => {
		const surveyEnabled = settingsStore.isPersonalizationSurveyEnabled;
		if (surveyEnabled && currentUser.value && !currentUser.value.personalizationAnswers) {
			uiStore.openModal(PERSONALIZATION_MODAL_KEY);
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
		await fetchUsers();
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

	const submitContactInfo = async (email: string) => {
		try {
			return await promptsApi.submitContactInfo(
				rootStore.instanceId,
				currentUserId.value ?? '',
				email,
			);
		} catch (error) {
			return;
		}
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

	return {
		initialized,
		currentUserId,
		usersById,
		allUsers,
		currentUser,
		userActivated,
		isDefaultUser,
		isInstanceOwner,
		mfaEnabled,
		globalRoleName,
		personalizedNodeTypes,
		userClaimedAiCredits,
		isEasyAIWorkflowOnboardingDone,
		usersLimitNotReached,
		addUsers,
		loginWithCookie,
		initialize,
		setPersonalizationAnswers,
		loginWithCreds,
		logout,
		registerLoginHook,
		registerLogoutHook,
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
		submitContactInfo,
		usersList,
	};
});
