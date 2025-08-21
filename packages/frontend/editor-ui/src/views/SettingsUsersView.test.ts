import { defineComponent } from 'vue';
import { createTestingPinia } from '@pinia/testing';
import { screen, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { type FrontendSettings, type Role, ROLE, type UsersList } from '@n8n/api-types';
import type { IUser } from '@n8n/rest-api-client/api/users';
import {
	INVITE_USER_MODAL_KEY,
	DELETE_USER_MODAL_KEY,
	EnterpriseEditionFeature,
} from '@/constants';
import SettingsUsersView from '@/views/SettingsUsersView.vue';
import { createComponentRenderer } from '@/__tests__/render';
import { useEmitters } from '@/__tests__/utils';
import {
	cleanupAppModals,
	createAppModals,
	mockedStore,
	type MockedStore,
} from '@/__tests__/utils';
import { useUsersStore } from '@/stores/users.store';
import { useUIStore } from '@/stores/ui.store';
import { useSettingsStore } from '@/stores/settings.store';
import { useSSOStore } from '@/stores/sso.store';

const { emitters, addEmitter } = useEmitters<'settingsUsersTable'>();

// Mock the SettingsUsersTable component to emit events
vi.mock('@/components/SettingsUsers/SettingsUsersTable.vue', () => ({
	default: defineComponent({
		setup(_, { emit }) {
			addEmitter('settingsUsersTable', emit);
		},
		template: '<div />',
	}),
}));

const mockToast = {
	showToast: vi.fn(),
	showError: vi.fn(),
};

const mockClipboard = {
	copy: vi.fn(),
};

const mockPageRedirectionHelper = {
	goToUpgrade: vi.fn(),
};

vi.mock('@/composables/useToast', () => ({
	useToast: vi.fn(() => mockToast),
}));

vi.mock('@/composables/useClipboard', () => ({
	useClipboard: vi.fn(() => mockClipboard),
}));

vi.mock('@/composables/useDocumentTitle', () => ({
	useDocumentTitle: vi.fn(() => ({
		set: vi.fn(),
	})),
}));

vi.mock('@/composables/usePageRedirectionHelper', () => ({
	usePageRedirectionHelper: vi.fn(() => mockPageRedirectionHelper),
}));

const mockUsersList: UsersList = {
	items: [
		{
			id: '1',
			email: 'admin@example.com',
			firstName: 'Admin',
			lastName: 'User',
			role: ROLE.Admin,
			isOwner: true,
			isPending: false,
			settings: {},
		},
		{
			id: '2',
			email: 'member@example.com',
			firstName: 'Member',
			lastName: 'User',
			role: ROLE.Member,
			isOwner: false,
			isPending: false,
			settings: {},
		},
		{
			id: '3',
			email: 'pending@example.com',
			firstName: '',
			lastName: '',
			role: ROLE.Member,
			isOwner: false,
			isPending: true,
			settings: {},
			inviteAcceptUrl: 'https://example.com/invite/123',
		},
	],
	count: 3,
};

let renderComponent: ReturnType<typeof createComponentRenderer>;
let usersStore: MockedStore<typeof useUsersStore>;
let uiStore: MockedStore<typeof useUIStore>;
let settingsStore: MockedStore<typeof useSettingsStore>;
let ssoStore: MockedStore<typeof useSSOStore>;

describe('SettingsUsersView', () => {
	beforeEach(() => {
		createAppModals();
		renderComponent = createComponentRenderer(SettingsUsersView, {
			pinia: createTestingPinia(),
		});

		usersStore = mockedStore(useUsersStore);
		uiStore = mockedStore(useUIStore);
		settingsStore = mockedStore(useSettingsStore);
		ssoStore = mockedStore(useSSOStore);

		// Setup default store states
		usersStore.usersLimitNotReached = true;
		usersStore.usersList = {
			state: mockUsersList,
			isLoading: false,
			execute: vi.fn(),
			isReady: true,
			error: null,
			then: vi.fn(),
		};
		usersStore.currentUserId = '1';
		usersStore.reinviteUser = vi.fn().mockResolvedValue(undefined);
		usersStore.getUserPasswordResetLink = vi
			.fn()
			.mockResolvedValue({ link: 'https://example.com/reset/123' });
		usersStore.updateOtherUserSettings = vi.fn().mockResolvedValue(undefined);
		usersStore.updateGlobalRole = vi.fn().mockResolvedValue(undefined);
		usersStore.updateEnforceMfa = vi.fn().mockResolvedValue(undefined);

		settingsStore.isSmtpSetup = true;
		settingsStore.isMFAEnforced = false;
		settingsStore.settings.enterprise = {
			mfaEnforcement: true,
		} as FrontendSettings['enterprise'];
		settingsStore.settings.enterprise[EnterpriseEditionFeature.AdvancedPermissions] = true;
		ssoStore.isSamlLoginEnabled = false;
	});

	afterEach(() => {
		cleanupAppModals();
		vi.clearAllMocks();
	});

	it('should turn enforcing mfa on', async () => {
		const { getByTestId } = renderComponent();

		const actionSwitch = getByTestId('enable-force-mfa');
		expect(actionSwitch).toBeInTheDocument();

		await userEvent.click(actionSwitch);

		expect(usersStore.updateEnforceMfa).toHaveBeenCalledWith(true);
	});

	it('should turn enforcing mfa off', async () => {
		settingsStore.isMFAEnforced = true;
		const { getByTestId } = renderComponent();

		const actionSwitch = getByTestId('enable-force-mfa');
		expect(actionSwitch).toBeInTheDocument();

		await userEvent.click(actionSwitch);

		expect(usersStore.updateEnforceMfa).toHaveBeenCalledWith(false);
	});

	it('should handle MFA enforcement error', async () => {
		usersStore.updateEnforceMfa = vi.fn().mockRejectedValue(new Error('MFA update failed'));

		const { getByTestId } = renderComponent();

		const actionSwitch = getByTestId('enable-force-mfa');
		await userEvent.click(actionSwitch);

		await waitFor(() => {
			expect(mockToast.showError).toHaveBeenCalledWith(expect.any(Error), expect.any(String));
		});
	});

	it('should handle missing user settings in SSO actions', async () => {
		// Remove settings from user
		usersStore.usersList.state.items[1].settings = undefined;

		renderComponent();

		emitters.settingsUsersTable.emit('action', { action: 'allowSSOManualLogin', userId: '2' });

		expect(usersStore.updateOtherUserSettings).toHaveBeenCalledWith('2', {
			allowSSOManualLogin: true,
		});
	});

	it('should render correctly with users list', () => {
		renderComponent();

		expect(screen.getByRole('heading', { name: /users/i })).toBeInTheDocument();
		expect(screen.getByTestId('users-list-search')).toBeInTheDocument();
		expect(screen.getByTestId('settings-users-invite-button')).toBeInTheDocument();
	});

	it('should open invite modal when invite button is clicked', async () => {
		renderComponent();

		const inviteButton = screen.getByTestId('settings-users-invite-button');
		await userEvent.click(inviteButton);

		expect(uiStore.openModalWithData).toHaveBeenCalledWith({
			name: INVITE_USER_MODAL_KEY,
			data: {
				afterInvite: expect.any(Function),
			},
		});
	});

	it('should disable invite button when SSO is enabled', () => {
		ssoStore.isSamlLoginEnabled = true;

		renderComponent();

		const inviteButton = screen.getByTestId('settings-users-invite-button');
		expect(inviteButton).toBeDisabled();
	});

	it('should disable invite button when users limit is reached', () => {
		usersStore.usersLimitNotReached = false;

		renderComponent();

		const inviteButton = screen.getByTestId('settings-users-invite-button');
		expect(inviteButton).toBeDisabled();
	});

	it('should handle search input with debouncing', async () => {
		renderComponent();

		const searchInput = screen.getByTestId('users-list-search');
		await userEvent.type(searchInput, 'test search');

		await waitFor(() => {
			expect(usersStore.usersList.execute).toHaveBeenCalled();
		});
	});

	it('should show upgrade banner when users limit is reached', () => {
		usersStore.usersLimitNotReached = false;

		const { getByTestId } = renderComponent();

		expect(getByTestId('action-box')).toBeInTheDocument();
	});

	it('should show advanced permissions notice when feature is disabled', async () => {
		settingsStore.settings.enterprise[EnterpriseEditionFeature.AdvancedPermissions] = false;

		renderComponent();

		expect(screen.getByTestId('upgrade-permissions-link')).toBeInTheDocument();
		await userEvent.click(screen.getByTestId('upgrade-permissions-link'));

		expect(mockPageRedirectionHelper.goToUpgrade).toHaveBeenCalled();
	});

	it('should not show users table when limit is reached and only one user exists', () => {
		usersStore.usersLimitNotReached = false;
		usersStore.usersList.state = {
			...mockUsersList,
			count: 1,
		};

		const { queryByTestId } = renderComponent();

		expect(queryByTestId('settings-users-table')).not.toBeInTheDocument();
	});

	it('should show users table when limit is reached but multiple users exist', () => {
		usersStore.usersLimitNotReached = false;
		usersStore.usersList.state = {
			...mockUsersList,
			count: 3,
		};

		const { getByTestId } = renderComponent();

		// The users container should be visible when there are multiple users
		expect(getByTestId('settings-users-table')).toBeInTheDocument();
	});

	describe('search functionality', () => {
		it('should handle empty search', async () => {
			renderComponent();

			const searchInput = screen.getByTestId('users-list-search');
			await userEvent.clear(searchInput);

			await waitFor(() => {
				expect(usersStore.usersList.execute).toHaveBeenCalledWith(0, {
					skip: 0,
					take: 10,
					sortBy: ['firstName:asc', 'lastName:asc', 'email:asc'],
					expand: ['projectRelations'],
					filter: {
						fullText: '',
					},
				});
			});
		});

		it('should handle search with special characters', async () => {
			renderComponent();

			const searchInput = screen.getByTestId('users-list-search');
			await userEvent.type(searchInput, '@#$%^&*()');

			await waitFor(() => {
				expect(usersStore.usersList.execute).toHaveBeenCalledWith(0, {
					skip: 0,
					take: 10,
					sortBy: ['firstName:asc', 'lastName:asc', 'email:asc'],
					expand: ['projectRelations'],
					filter: {
						fullText: '@#$%^&*()',
					},
				});
			});
		});

		it('should reset to first page when searching', async () => {
			renderComponent();

			// Set table to page 2
			emitters.settingsUsersTable.emit('update:options', {
				page: 2,
				itemsPerPage: 10,
				sortBy: [{ id: 'email', desc: false }],
			});

			// Now search - should reset to page 0
			const searchInput = screen.getByTestId('users-list-search');
			await userEvent.type(searchInput, 'test');

			await waitFor(() => {
				expect(usersStore.usersList.execute).toHaveBeenCalledWith(0, {
					skip: 0, // Should be 0, not 20 (page 2)
					take: 10,
					sortBy: ['email:asc'],
					expand: ['projectRelations'],
					filter: {
						fullText: 'test',
					},
				});
			});
		});

		it('should handle search with whitespace only', async () => {
			renderComponent();

			const searchInput = screen.getByTestId('users-list-search');
			await userEvent.type(searchInput, '   ');

			await waitFor(() => {
				expect(usersStore.usersList.execute).toHaveBeenCalledWith(0, {
					skip: 0,
					take: 10,
					sortBy: ['firstName:asc', 'lastName:asc', 'email:asc'],
					expand: ['projectRelations'],
					filter: {
						fullText: '', // Should be trimmed to empty string
					},
				});
			});
		});
	});

	describe('component lifecycle', () => {
		it('should not load users data when showing UM setup warning', async () => {
			usersStore.currentUser = { isDefaultUser: true } as IUser;
			renderComponent();

			// Should not call execute when showing setup warning
			expect(usersStore.usersList.execute).not.toHaveBeenCalled();
		});

		it('should load users data on mount when not showing setup warning', async () => {
			renderComponent();

			await waitFor(() => {
				expect(usersStore.usersList.execute).toHaveBeenCalledWith(0, {
					skip: 0,
					take: 10,
					sortBy: ['firstName:asc', 'lastName:asc', 'email:asc'],
					expand: ['projectRelations'],
					filter: {
						fullText: '',
					},
				});
			});
		});
	});

	describe('user actions', () => {
		it('should handle delete user action', async () => {
			renderComponent();

			emitters.settingsUsersTable.emit('action', { action: 'delete', userId: '2' });

			expect(uiStore.openModalWithData).toHaveBeenCalledWith({
				name: DELETE_USER_MODAL_KEY,
				data: {
					userId: '2',
					afterDelete: expect.any(Function),
				},
			});
		});

		it('should handle reinvite user action', async () => {
			renderComponent();

			emitters.settingsUsersTable.emit('action', { action: 'reinvite', userId: '3' });

			expect(usersStore.reinviteUser).toHaveBeenCalledWith({
				email: 'pending@example.com',
				role: ROLE.Member,
			});
			await waitFor(() => {
				expect(mockToast.showToast).toHaveBeenCalledWith({
					type: 'success',
					title: expect.any(String),
					message: expect.any(String),
				});
			});
		});

		it('should handle copy invite link action', async () => {
			renderComponent();

			emitters.settingsUsersTable.emit('action', { action: 'copyInviteLink', userId: '3' });

			expect(mockClipboard.copy).toHaveBeenCalledWith('https://example.com/invite/123');
			await waitFor(() => {
				expect(mockToast.showToast).toHaveBeenCalledWith({
					type: 'success',
					title: expect.any(String),
					message: expect.any(String),
				});
			});
		});

		it('should handle copy password reset link action', async () => {
			renderComponent();

			emitters.settingsUsersTable.emit('action', { action: 'copyPasswordResetLink', userId: '2' });

			expect(usersStore.getUserPasswordResetLink).toHaveBeenCalledWith(mockUsersList.items[1]);
			await waitFor(() => {
				expect(mockClipboard.copy).toHaveBeenCalledWith('https://example.com/reset/123');
				expect(mockToast.showToast).toHaveBeenCalledWith({
					type: 'success',
					title: expect.any(String),
					message: expect.any(String),
				});
			});
		});

		it('should handle allow SSO manual login action', async () => {
			renderComponent();

			emitters.settingsUsersTable.emit('action', { action: 'allowSSOManualLogin', userId: '2' });

			expect(usersStore.updateOtherUserSettings).toHaveBeenCalledWith('2', {
				allowSSOManualLogin: true,
			});
			await waitFor(() => {
				expect(mockToast.showToast).toHaveBeenCalledWith({
					type: 'success',
					title: expect.any(String),
					message: expect.any(String),
				});
			});
		});

		it('should handle disallow SSO manual login action', async () => {
			// Set user to have SSO manual login enabled
			usersStore.usersList.state.items[1].settings = { allowSSOManualLogin: true };

			renderComponent();

			emitters.settingsUsersTable.emit('action', { action: 'disallowSSOManualLogin', userId: '2' });

			expect(usersStore.updateOtherUserSettings).toHaveBeenCalledWith('2', {
				allowSSOManualLogin: false,
			});
			await waitFor(() => {
				expect(mockToast.showToast).toHaveBeenCalledWith({
					type: 'success',
					title: expect.any(String),
					message: expect.any(String),
				});
			});
		});

		it('should handle reinvite user error', async () => {
			usersStore.reinviteUser = vi.fn().mockRejectedValue(new Error('Failed to reinvite'));

			renderComponent();

			emitters.settingsUsersTable.emit('action', { action: 'reinvite', userId: '3' });

			await waitFor(() => {
				expect(mockToast.showError).toHaveBeenCalledWith(expect.any(Error), expect.any(String));
			});
		});

		it('should handle copy invite link with missing inviteAcceptUrl', async () => {
			// Remove invite URL from user
			usersStore.usersList.state.items[2].inviteAcceptUrl = undefined;

			renderComponent();

			emitters.settingsUsersTable.emit('action', { action: 'copyInviteLink', userId: '3' });

			// Should not call clipboard.copy or show toast
			expect(mockClipboard.copy).not.toHaveBeenCalled();
			expect(mockToast.showToast).not.toHaveBeenCalled();
		});

		it('should handle copy password reset link error', async () => {
			usersStore.getUserPasswordResetLink = vi
				.fn()
				.mockRejectedValue(new Error('Reset link failed'));

			renderComponent();

			emitters.settingsUsersTable.emit('action', { action: 'copyPasswordResetLink', userId: '2' });

			await waitFor(() => {
				expect(usersStore.getUserPasswordResetLink).toHaveBeenCalled();
				expect(mockClipboard.copy).not.toHaveBeenCalled();
				expect(mockToast.showToast).not.toHaveBeenCalled();
			});
		});

		it('should handle reinvite with invalid role', async () => {
			// Set user with invalid role
			usersStore.usersList.state.items[2].role = 'invalid-role' as Role;

			renderComponent();

			emitters.settingsUsersTable.emit('action', { action: 'reinvite', userId: '3' });

			// Should not call reinviteUser with invalid role
			expect(usersStore.reinviteUser).not.toHaveBeenCalled();
		});

		it('should handle reinvite with missing user data', async () => {
			// Remove email from user
			usersStore.usersList.state.items[2].email = undefined;

			renderComponent();

			emitters.settingsUsersTable.emit('action', { action: 'reinvite', userId: '3' });

			// Should not call reinviteUser
			expect(usersStore.reinviteUser).not.toHaveBeenCalled();
		});

		it('should handle disallow SSO manual login with missing settings', async () => {
			// Remove settings from user
			usersStore.usersList.state.items[1].settings = undefined;

			renderComponent();

			emitters.settingsUsersTable.emit('action', { action: 'disallowSSOManualLogin', userId: '2' });

			// Should not call updateOtherUserSettings
			expect(usersStore.updateOtherUserSettings).not.toHaveBeenCalled();
		});
	});

	describe('role updates', () => {
		it('should handle role update', async () => {
			renderComponent();

			emitters.settingsUsersTable.emit('update:role', { role: ROLE.Admin, userId: '2' });

			expect(usersStore.updateGlobalRole).toHaveBeenCalledWith({
				id: '2',
				newRoleName: ROLE.Admin,
			});
			await waitFor(() => {
				expect(mockToast.showToast).toHaveBeenCalledWith({
					type: 'success',
					title: expect.any(String),
					message: expect.any(String),
				});
			});
		});

		it('should handle role update error', async () => {
			usersStore.updateGlobalRole = vi.fn().mockRejectedValue(new Error('Failed to update role'));

			renderComponent();

			emitters.settingsUsersTable.emit('update:role', { role: ROLE.Admin, userId: '2' });
			await waitFor(() => {
				expect(mockToast.showError).toHaveBeenCalledWith(expect.any(Error), expect.any(String));
			});
		});

		it('should handle role update for non-existent user', async () => {
			renderComponent();

			emitters.settingsUsersTable.emit('update:role', { role: ROLE.Admin, userId: 'non-existent' });

			await waitFor(() => {
				expect(mockToast.showError).toHaveBeenCalledWith(expect.any(Error), expect.any(String));
			});

			// Should not call updateGlobalRole
			expect(usersStore.updateGlobalRole).not.toHaveBeenCalled();
		});

		it('should use email as fallback when user has no first/last name', async () => {
			// Set user with no first/last name
			usersStore.usersList.state.items[1].firstName = '';
			usersStore.usersList.state.items[1].lastName = '';

			renderComponent();

			emitters.settingsUsersTable.emit('update:role', { role: ROLE.Admin, userId: '2' });

			await waitFor(() => {
				expect(mockToast.showToast).toHaveBeenCalledWith({
					type: 'success',
					title: expect.any(String),
					message: expect.stringContaining('member@example.com'),
				});
			});
		});
	});

	describe('table functionality', () => {
		it('should handle table options update', async () => {
			renderComponent();

			emitters.settingsUsersTable.emit('update:options', {
				page: 1,
				itemsPerPage: 20,
				sortBy: [{ id: 'role', desc: true }],
			});

			expect(usersStore.usersList.execute).toHaveBeenCalledWith(0, {
				skip: 20,
				take: 20,
				sortBy: ['role:desc'],
				expand: ['projectRelations'],
				filter: {
					fullText: '',
				},
			});
		});

		it('should transform name sort to firstName, lastName, email', async () => {
			renderComponent();

			emitters.settingsUsersTable.emit('update:options', {
				page: 0,
				itemsPerPage: 10,
				sortBy: [{ id: 'name', desc: false }],
			});

			expect(usersStore.usersList.execute).toHaveBeenCalledWith(0, {
				skip: 0,
				take: 10,
				sortBy: ['firstName:asc', 'lastName:asc', 'email:asc'],
				expand: ['projectRelations'],
				filter: {
					fullText: '',
				},
			});
		});

		it('should filter out invalid sort keys', async () => {
			renderComponent();

			emitters.settingsUsersTable.emit('update:options', {
				page: 0,
				itemsPerPage: 10,
				sortBy: [{ id: 'invalidKey', desc: false }],
			});

			expect(usersStore.usersList.execute).toHaveBeenCalledWith(0, {
				skip: 0,
				take: 10,
				sortBy: [], // Invalid keys should be filtered out
				expand: ['projectRelations'],
				filter: {
					fullText: '',
				},
			});
		});

		it('should handle multiple mixed sort keys', async () => {
			renderComponent();

			emitters.settingsUsersTable.emit('update:options', {
				page: 0,
				itemsPerPage: 10,
				sortBy: [
					{ id: 'name', desc: false },
					{ id: 'email', desc: true },
					{ id: 'invalidKey', desc: false },
					{ id: 'role', desc: true },
				],
			});

			expect(usersStore.usersList.execute).toHaveBeenCalledWith(0, {
				skip: 0,
				take: 10,
				sortBy: ['firstName:asc', 'lastName:asc', 'email:asc', 'email:desc', 'role:desc'],
				expand: ['projectRelations'],
				filter: {
					fullText: '',
				},
			});
		});

		it('should handle pagination correctly', async () => {
			renderComponent();

			emitters.settingsUsersTable.emit('update:options', {
				page: 3,
				itemsPerPage: 25,
				sortBy: [{ id: 'email', desc: false }],
			});

			expect(usersStore.usersList.execute).toHaveBeenCalledWith(0, {
				skip: 75, // page 3 * 25 items per page
				take: 25,
				sortBy: ['email:asc'],
				expand: ['projectRelations'],
				filter: {
					fullText: '',
				},
			});
		});
	});

	describe('upgrade functionality', () => {
		it('should handle upgrade banner click', async () => {
			usersStore.usersLimitNotReached = false;

			renderComponent();

			const upgradeButton = screen.getByRole('button', { name: /view plans/i });
			await userEvent.click(upgradeButton);

			expect(mockPageRedirectionHelper.goToUpgrade).toHaveBeenCalledWith(
				'settings-users',
				'upgrade-users',
			);
		});

		it('should handle advanced permissions upgrade click', async () => {
			settingsStore.isEnterpriseFeatureEnabled[EnterpriseEditionFeature.AdvancedPermissions] =
				false;

			renderComponent();

			const upgradeLink = screen.getByTestId('upgrade-permissions-link');
			await userEvent.click(upgradeLink);

			expect(mockPageRedirectionHelper.goToUpgrade).toHaveBeenCalledWith(
				'settings-users',
				'upgrade-advanced-permissions',
			);
		});
	});

	describe('edge cases', () => {
		it('should handle empty users list', () => {
			usersStore.usersList.state = {
				items: [],
				count: 0,
			};

			renderComponent();

			expect(screen.getByTestId('settings-users-table')).toBeInTheDocument();
		});

		it('should handle loading state', () => {
			usersStore.usersList.isLoading = true;

			const { getByTestId } = renderComponent();

			expect(getByTestId('settings-users-table')).toBeInTheDocument();
		});

		it('should handle user with missing email', async () => {
			usersStore.usersList.state.items[1].email = undefined;

			renderComponent();

			emitters.settingsUsersTable.emit('update:role', { role: ROLE.Admin, userId: '2' });

			await waitFor(() => {
				expect(mockToast.showToast).toHaveBeenCalledWith({
					type: 'success',
					title: expect.any(String),
					message: expect.stringContaining(''),
				});
			});
		});

		it('should handle SSO actions with user not found', async () => {
			renderComponent();

			emitters.settingsUsersTable.emit('action', {
				action: 'allowSSOManualLogin',
				userId: 'non-existent',
			});

			// Should not call updateOtherUserSettings
			expect(usersStore.updateOtherUserSettings).not.toHaveBeenCalled();
		});

		it('should handle copy password reset link with user not found', async () => {
			renderComponent();

			emitters.settingsUsersTable.emit('action', {
				action: 'copyPasswordResetLink',
				userId: 'non-existent',
			});

			// Should not call getUserPasswordResetLink
			expect(usersStore.getUserPasswordResetLink).not.toHaveBeenCalled();
		});

		it('should handle table data update with network error', async () => {
			usersStore.usersList.execute = vi.fn().mockRejectedValue(new Error('Network error'));

			renderComponent();

			emitters.settingsUsersTable.emit('update:options', {
				page: 0,
				itemsPerPage: 10,
				sortBy: [{ id: 'email', desc: false }],
			});

			await waitFor(() => {
				expect(usersStore.usersList.execute).toHaveBeenCalled();
			});
		});

		it('should handle sort by multiple fields with same direction', async () => {
			renderComponent();

			emitters.settingsUsersTable.emit('update:options', {
				page: 0,
				itemsPerPage: 10,
				sortBy: [
					{ id: 'email', desc: false },
					{ id: 'firstName', desc: false },
					{ id: 'lastName', desc: false },
				],
			});

			expect(usersStore.usersList.execute).toHaveBeenCalledWith(0, {
				skip: 0,
				take: 10,
				sortBy: ['email:asc', 'firstName:asc', 'lastName:asc'],
				expand: ['projectRelations'],
				filter: {
					fullText: '',
				},
			});
		});

		it('should handle MFA enforcement with partial success', async () => {
			let callCount = 0;
			usersStore.updateEnforceMfa = vi.fn().mockImplementation(async () => {
				callCount++;
				if (callCount === 1) {
					throw Error('First attempt failed');
				}
				return await Promise.resolve();
			});

			const { getByTestId } = renderComponent();

			const actionSwitch = getByTestId('enable-force-mfa');
			await userEvent.click(actionSwitch);

			await waitFor(() => {
				expect(mockToast.showError).toHaveBeenCalledWith(expect.any(Error), expect.any(String));
			});

			// Try again
			await userEvent.click(actionSwitch);

			await waitFor(() => {
				expect(usersStore.updateEnforceMfa).toHaveBeenCalledTimes(2);
			});
		});

		it('should handle rapid consecutive search inputs', async () => {
			renderComponent();

			const searchInput = screen.getByTestId('users-list-search');

			// Type rapidly
			await userEvent.type(searchInput, 'a');
			await userEvent.type(searchInput, 'b');
			await userEvent.type(searchInput, 'c');

			await waitFor(() => {
				expect(usersStore.usersList.execute).toHaveBeenCalledTimes(2); // Once on mount, once on search because of debounce
				expect(usersStore.usersList.execute).toHaveBeenCalledWith(0, {
					skip: 0,
					take: 10,
					sortBy: ['firstName:asc', 'lastName:asc', 'email:asc'],
					expand: ['projectRelations'],
					filter: {
						fullText: 'abc',
					},
				});
			});
		});
	});
});
