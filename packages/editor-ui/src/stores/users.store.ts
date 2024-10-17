import type {
	PasswordUpdateRequestDto,
	SettingsUpdateRequestDto,
	UserUpdateRequestDto,
} from '@n8n/api-types';
import type { UpdateGlobalRolePayload } from '@/api/users';
import * as usersApi from '@/api/users';
import { BROWSER_ID_STORAGE_KEY, PERSONALIZATION_MODAL_KEY, STORES, ROLE } from '@/constants';
import type {
	Cloud,
	IPersonalizationLatestVersion,
	IUser,
	IUserResponse,
	CurrentUserResponse,
	InvitableRoleName,
} from '@/Interface';
import { getPersonalizedNodeTypes } from '@/utils/userUtils';
import { defineStore } from 'pinia';
import { useRootStore } from '@/stores/root.store';
import { usePostHog } from './posthog.store';
import { useSettingsStore } from './settings.store';
import { useUIStore } from './ui.store';
import { useCloudPlanStore } from './cloudPlan.store';
import * as mfaApi from '@/api/mfa';
import * as cloudApi from '@/api/cloudPlans';
import { useRBACStore } from '@/stores/rbac.store';
import type { Scope } from '@n8n/permissions';
import * as invitationsApi from '@/api/invitation';
import { useNpsSurveyStore } from './npsSurvey.store';
import { computed, ref } from 'vue';
import { useTelemetry } from '@/composables/useTelemetry';

const _isPendingUser = (user: IUserResponse | null) => !!user?.isPending;
const _isInstanceOwner = (user: IUserResponse | null) => user?.role === ROLE.Owner;
const _isDefaultUser = (user: IUserResponse | null) =>
	_isInstanceOwner(user) && _isPendingUser(user);

export const useUsersStore = defineStore(STORES.USERS, () => {
	const initialized = ref(false);
	const currentUserId = ref<string | null>(null);
	const usersById = ref<Record<string, IUser>>({});
	const currentUserCloudInfo = ref<Cloud.UserAccount | null>(null);

	// Stores

	const RBACStore = useRBACStore();
	const npsSurveyStore = useNpsSurveyStore();
	const uiStore = useUIStore();
	const rootStore = useRootStore();
	const settingsStore = useSettingsStore();
	const cloudPlanStore = useCloudPlanStore();
	const telemetry = useTelemetry();

	// Composables

	const postHogStore = usePostHog();

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

	// Methods

	const addUsers = (newUsers: IUserResponse[]) => {
		newUsers.forEach((userResponse: IUserResponse) => {
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

		const defaultScopes: Scope[] = [];
		RBACStore.setGlobalScopes(user.globalScopes || defaultScopes);
		telemetry.identify(rootStore.instanceId, user.id);
		postHogStore.init(user.featureFlags);
		npsSurveyStore.setupNpsSurveyOnLogin(user.id, user.settings);
	};

	const loginWithCookie = async () => {
		const user = await usersApi.loginCurrentUser(rootStore.restApiContext);
		if (!user) {
			return;
		}

		setCurrentUser(user);
	};

	const initialize = async () => {
		if (initialized.value) {
			return;
		}

		try {
			await loginWithCookie();
			initialized.value = true;
		} catch (e) {}
	};

	const unsetCurrentUser = () => {
		currentUserId.value = null;
		currentUserCloudInfo.value = null;
		telemetry.reset();
		RBACStore.setGlobalScopes([]);
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

	const loginWithCreds = async (params: {
		email: string;
		password: string;
		mfaToken?: string;
		mfaRecoveryCode?: string;
	}) => {
		const user = await usersApi.login(rootStore.restApiContext, params);
		if (!user) {
			return;
		}

		setCurrentUser(user);
	};

	const logout = async () => {
		await usersApi.logout(rootStore.restApiContext);
		unsetCurrentUser();
		cloudPlanStore.reset();
		postHogStore.reset();
		uiStore.clearBannerStack();
		npsSurveyStore.resetNpsSurveyOnLogOut();

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

	const changePassword = async (params: { token: string; password: string; mfaToken?: string }) => {
		await usersApi.changePassword(rootStore.restApiContext, params);
	};

	const updateUser = async (params: UserUpdateRequestDto) => {
		const user = await usersApi.updateCurrentUser(rootStore.restApiContext, params);
		addUsers([user]);
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
		const updatedSettings = await usersApi.updateOtherUserSettings(
			rootStore.restApiContext,
			userId,
			settings,
		);
		usersById.value[userId].settings = updatedSettings;
		addUsers([usersById.value[userId]]);
	};

	const updateCurrentUserPassword = async (params: PasswordUpdateRequestDto) => {
		await usersApi.updateCurrentUserPassword(rootStore.restApiContext, params);
	};

	const deleteUser = async (params: { id: string; transferId?: string }) => {
		await usersApi.deleteUser(rootStore.restApiContext, params);
		deleteUserById(params.id);
	};

	const fetchUsers = async () => {
		const users = await usersApi.getUsers(rootStore.restApiContext);
		addUsers(users);
	};

	const inviteUsers = async (params: Array<{ email: string; role: InvitableRoleName }>) => {
		const invitedUsers = await invitationsApi.inviteUsers(rootStore.restApiContext, params);
		addUsers(
			invitedUsers.map(({ user }, index) => ({
				isPending: true,
				globalRole: { name: params[index].role },
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

	const verifyMfaToken = async (data: { token: string }) => {
		return await mfaApi.verifyMfaToken(rootStore.restApiContext, data);
	};

	const canEnableMFA = async () => {
		return await mfaApi.canEnableMFA(rootStore.restApiContext);
	};

	const enableMfa = async (data: { token: string }) => {
		await mfaApi.enableMfa(rootStore.restApiContext, data);
		if (currentUser.value) {
			currentUser.value.mfaEnabled = true;
		}
	};

	const disableMfa = async (mfaCode: string) => {
		await mfaApi.disableMfa(rootStore.restApiContext, {
			token: mfaCode,
		});

		if (currentUser.value) {
			currentUser.value.mfaEnabled = false;
		}
	};

	const fetchUserCloudAccount = async () => {
		let cloudUser: Cloud.UserAccount | null = null;
		try {
			cloudUser = await cloudApi.getCloudUserInfo(rootStore.restApiContext);
			currentUserCloudInfo.value = cloudUser;
		} catch (error) {
			throw new Error(error);
		}
	};

	const sendConfirmationEmail = async () => {
		await cloudApi.sendConfirmationEmail(rootStore.restApiContext);
	};

	const updateGlobalRole = async ({ id, newRoleName }: UpdateGlobalRolePayload) => {
		await usersApi.updateGlobalRole(rootStore.restApiContext, { id, newRoleName });
		await fetchUsers();
	};

	const reset = () => {
		initialized.value = false;
		currentUserId.value = null;
		usersById.value = {};
		currentUserCloudInfo.value = null;
	};

	return {
		initialized,
		currentUserId,
		usersById,
		currentUserCloudInfo,
		allUsers,
		currentUser,
		userActivated,
		isDefaultUser,
		isInstanceOwner,
		mfaEnabled,
		globalRoleName,
		personalizedNodeTypes,
		addUsers,
		loginWithCookie,
		initialize,
		setPersonalizationAnswers,
		loginWithCreds,
		logout,
		createOwner,
		validateSignupToken,
		acceptInvitation,
		sendForgotPasswordEmail,
		validatePasswordToken,
		changePassword,
		updateUser,
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
		verifyMfaToken,
		enableMfa,
		disableMfa,
		canEnableMFA,
		fetchUserCloudAccount,
		sendConfirmationEmail,
		updateGlobalRole,
		reset,
	};
});
