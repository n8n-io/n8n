import { within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';
import { getDropdownItems, mockedStore } from '@/__tests__/utils';
import SettingsUsersView from '@/views/SettingsUsersView.vue';
import { useUsersStore } from '@/stores/users.store';
import { createUser } from '@/__tests__/data/users';
import { useRBACStore } from '@/stores/rbac.store';
import { useSettingsStore } from '@/stores/settings.store';
import { createTestingPinia, type TestingOptions } from '@pinia/testing';
import merge from 'lodash/merge';
import { useUIStore } from '@/stores/ui.store';
import { useSSOStore } from '@/stores/sso.store';
import { STORES } from '@n8n/stores';
import { usePageRedirectionHelper } from '@/composables/usePageRedirectionHelper';

const loggedInUser = createUser();
const invitedUser = createUser({
	firstName: undefined,
	inviteAcceptUrl: 'dummy',
	role: 'global:admin',
});
const user = createUser();
const userWithDisabledSSO = createUser({
	settings: { allowSSOManualLogin: true },
});

const initialState = {
	[STORES.USERS]: {
		currentUserId: loggedInUser.id,
		usersById: {
			[loggedInUser.id]: loggedInUser,
			[invitedUser.id]: invitedUser,
			[user.id]: user,
			[userWithDisabledSSO.id]: userWithDisabledSSO,
		},
	},
	[STORES.SETTINGS]: { settings: { enterprise: { advancedPermissions: true } } },
};

const getInitialState = (state: TestingOptions['initialState'] = {}) =>
	merge({}, initialState, state);

const copy = vi.fn();
vi.mock('@/composables/useClipboard', () => ({
	useClipboard: () => ({
		copy,
	}),
}));

const renderView = createComponentRenderer(SettingsUsersView);

const triggerUserAction = async (userListItem: HTMLElement, action: string) => {
	expect(userListItem).toBeInTheDocument();

	const actionToggle = within(userListItem).getByTestId('action-toggle');
	const actionToggleButton = within(actionToggle).getByRole('button');
	expect(actionToggleButton).toBeVisible();

	await userEvent.click(actionToggle);
	const actionToggleId = actionToggleButton.getAttribute('aria-controls');

	const actionDropdown = document.getElementById(actionToggleId as string) as HTMLElement;
	await userEvent.click(within(actionDropdown).getByTestId(`action-${action}`));
};

const showToast = vi.fn();
const showError = vi.fn();
vi.mock('@/composables/useToast', () => ({
	useToast: () => ({
		showToast,
		showError,
	}),
}));

vi.mock('@/composables/usePageRedirectionHelper', () => {
	const goToUpgrade = vi.fn();
	return {
		usePageRedirectionHelper: () => ({
			goToUpgrade,
		}),
	};
});

describe('SettingsUsersView', () => {
	afterEach(() => {
		copy.mockReset();
		showToast.mockReset();
		showError.mockReset();
	});

	it('turn enforcing mfa on', async () => {
		const pinia = createTestingPinia({
			initialState: getInitialState({
				settings: {
					settings: {
						enterprise: {
							mfaEnforcement: true,
						},
					},
				},
			}),
		});

		const userStore = mockedStore(useUsersStore);
		const { getByTestId } = renderView({ pinia });

		const actionSwitch = getByTestId('enable-force-mfa');
		expect(actionSwitch).toBeInTheDocument();

		await userEvent.click(actionSwitch);

		expect(userStore.updateEnforceMfa).toHaveBeenCalledWith(true);
	});

	it('turn enforcing mfa off', async () => {
		const pinia = createTestingPinia({
			initialState: getInitialState({
				settings: {
					settings: {
						enterprise: {
							mfaEnforcement: true,
						},
					},
				},
			}),
		});

		const userStore = mockedStore(useUsersStore);
		const settingsStore = mockedStore(useSettingsStore);
		settingsStore.isMFAEnforced = true;
		const { getByTestId } = renderView({ pinia });

		const actionSwitch = getByTestId('enable-force-mfa');
		expect(actionSwitch).toBeInTheDocument();

		await userEvent.click(actionSwitch);

		expect(userStore.updateEnforceMfa).toHaveBeenCalledWith(false);
	});

	it('hides invite button visibility based on user permissions', async () => {
		const pinia = createTestingPinia({ initialState: getInitialState() });
		const userStore = mockedStore(useUsersStore);
		userStore.currentUser = createUser({ isDefaultUser: true });

		const { queryByTestId } = renderView({ pinia });

		expect(queryByTestId('settings-users-invite-button')).not.toBeInTheDocument();
	});

	describe('Below quota', () => {
		const pinia = createTestingPinia({ initialState: getInitialState() });

		const usersStore = mockedStore(useUsersStore);
		usersStore.usersLimitNotReached = false;

		it('disables the invite button', async () => {
			const { getByTestId } = renderView({ pinia });

			expect(getByTestId('settings-users-invite-button')).toBeDisabled();
		});

		it('allows the user to upgrade', async () => {
			const { getByTestId } = renderView({ pinia });
			const pageRedirectionHelper = usePageRedirectionHelper();

			const actionBox = getByTestId('action-box');
			expect(actionBox).toBeInTheDocument();

			await userEvent.click(await within(actionBox).findByText('View plans'));

			expect(pageRedirectionHelper.goToUpgrade).toHaveBeenCalledWith(
				'settings-users',
				'upgrade-users',
			);
		});
	});

	it('disables the invite button on SAML login', async () => {
		const pinia = createTestingPinia({ initialState: getInitialState() });
		const ssoStore = useSSOStore(pinia);
		ssoStore.isSamlLoginEnabled = true;

		const { getByTestId } = renderView({ pinia });

		expect(getByTestId('settings-users-invite-button')).toBeDisabled();
	});

	it('shows the invite modal', async () => {
		const pinia = createTestingPinia({ initialState: getInitialState() });
		const { getByTestId } = renderView({ pinia });

		const uiStore = useUIStore();
		await userEvent.click(getByTestId('settings-users-invite-button'));

		expect(uiStore.openModal).toHaveBeenCalledWith('inviteUser');
	});

	it('shows warning when advanced permissions are not enabled', async () => {
		const pinia = createTestingPinia({
			initialState: getInitialState({
				[STORES.SETTINGS]: { settings: { enterprise: { advancedPermissions: false } } },
			}),
		});

		const { getByText } = renderView({ pinia });

		expect(getByText('to unlock the ability to create additional admin users'));
	});

	describe('per user actions', () => {
		it('should copy invite link to clipboard', async () => {
			const action = 'copyInviteLink';

			const pinia = createTestingPinia({ initialState: getInitialState() });

			const { getByTestId } = renderView({ pinia });

			await triggerUserAction(getByTestId(`user-list-item-${invitedUser.email}`), action);

			expect(copy).toHaveBeenCalledWith(invitedUser.inviteAcceptUrl);
			expect(showToast).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
		});

		it('should re invite users', async () => {
			const action = 'reinvite';

			const pinia = createTestingPinia({ initialState: getInitialState() });

			const settingsStore = mockedStore(useSettingsStore);
			settingsStore.isSmtpSetup = true;

			const userStore = useUsersStore();

			const { getByTestId } = renderView({ pinia });

			await triggerUserAction(getByTestId(`user-list-item-${invitedUser.email}`), action);

			expect(userStore.reinviteUser).toHaveBeenCalled();
			expect(showToast).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
		});

		it('should show delete users modal with the right permissions', async () => {
			const action = 'delete';

			const pinia = createTestingPinia({ initialState: getInitialState() });

			const rbacStore = mockedStore(useRBACStore);
			rbacStore.hasScope.mockReturnValue(true);

			const { getByTestId } = renderView({ pinia });

			await triggerUserAction(getByTestId(`user-list-item-${user.email}`), action);

			const uiStore = useUIStore();
			expect(uiStore.openDeleteUserModal).toHaveBeenCalledWith(user.id);
		});

		it('should allow coping reset password link', async () => {
			const action = 'copyPasswordResetLink';

			const pinia = createTestingPinia({ initialState: getInitialState() });

			const rbacStore = mockedStore(useRBACStore);
			rbacStore.hasScope.mockReturnValue(true);

			const userStore = mockedStore(useUsersStore);
			userStore.getUserPasswordResetLink.mockResolvedValue({ link: 'dummy-reset-password' });

			const { getByTestId } = renderView({ pinia });

			await triggerUserAction(getByTestId(`user-list-item-${user.email}`), action);

			expect(userStore.getUserPasswordResetLink).toHaveBeenCalledWith(user);

			expect(copy).toHaveBeenCalledWith('dummy-reset-password');
			expect(showToast).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
		});

		it('should enable SSO manual login', async () => {
			const action = 'allowSSOManualLogin';

			const pinia = createTestingPinia({ initialState: getInitialState() });

			const ssoStore = useSSOStore(pinia);
			ssoStore.isSamlLoginEnabled = true;

			const userStore = useUsersStore();

			const { getByTestId } = renderView({ pinia });

			await triggerUserAction(getByTestId(`user-list-item-${user.email}`), action);
			expect(userStore.updateOtherUserSettings).toHaveBeenCalledWith(user.id, {
				allowSSOManualLogin: true,
			});
			expect(showToast).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
		});

		it('should disable SSO manual login', async () => {
			const action = 'disallowSSOManualLogin';

			const pinia = createTestingPinia({ initialState: getInitialState() });

			const ssoStore = useSSOStore(pinia);
			ssoStore.isSamlLoginEnabled = true;

			const userStore = useUsersStore();

			const { getByTestId } = renderView({ pinia });

			await triggerUserAction(getByTestId(`user-list-item-${userWithDisabledSSO.email}`), action);

			expect(userStore.updateOtherUserSettings).toHaveBeenCalledWith(userWithDisabledSSO.id, {
				allowSSOManualLogin: false,
			});
			expect(showToast).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
		});
	});

	it("should show success toast when changing a user's role", async () => {
		const pinia = createTestingPinia({ initialState: getInitialState() });

		const rbacStore = mockedStore(useRBACStore);
		rbacStore.hasScope.mockReturnValue(true);

		const userStore = useUsersStore();

		const { getByTestId } = renderView({ pinia });

		const userListItem = getByTestId(`user-list-item-${invitedUser.email}`);
		expect(userListItem).toBeInTheDocument();

		const roleSelect = within(userListItem).getByTestId('user-role-select');

		const roleDropdownItems = await getDropdownItems(roleSelect);
		await userEvent.click(roleDropdownItems[0]);

		expect(userStore.updateGlobalRole).toHaveBeenCalledWith(
			expect.objectContaining({ newRoleName: 'global:member' }),
		);

		expect(showToast).toHaveBeenCalledWith(
			expect.objectContaining({ type: 'success', message: expect.stringContaining('Member') }),
		);
	});
});
