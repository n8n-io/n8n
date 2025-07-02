import { createTestingPinia } from '@pinia/testing';
import { screen, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { type FrontendSettings, ROLE, type UsersList } from '@n8n/api-types';
import {
	INVITE_USER_MODAL_KEY,
	DELETE_USER_MODAL_KEY,
	EnterpriseEditionFeature,
} from '@/constants';
import SettingsUsersView from '@/views/SettingsUsersView.vue';
import { createComponentRenderer } from '@/__tests__/render';
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

// Mock the SettingsUsersTable component to emit events when clicked
vi.mock('@/components/SettingsUsers/SettingsUsersTable.vue', () => ({
	default: {
		name: 'SettingsUsersTable',
		props: ['data', 'loading', 'actions'],
		emits: ['update:options', 'update:role', 'action'],
		template: `
			<div data-test-id="settings-users-table">
				<button data-test-id="emit-delete" @click="$emit('action', { action: 'delete', userId: '2' })">Delete</button>
				<button data-test-id="emit-reinvite" @click="$emit('action', { action: 'reinvite', userId: '3' })">Reinvite</button>
				<button data-test-id="emit-copy-invite" @click="$emit('action', { action: 'copyInviteLink', userId: '3' })">Copy Invite</button>
				<button data-test-id="emit-copy-reset" @click="$emit('action', { action: 'copyPasswordResetLink', userId: '2' })">Copy Reset</button>
				<button data-test-id="emit-allow-sso" @click="$emit('action', { action: 'allowSSOManualLogin', userId: '2' })">Allow SSO</button>
				<button data-test-id="emit-disallow-sso" @click="$emit('action', { action: 'disallowSSOManualLogin', userId: '2' })">Disallow SSO</button>
				<button data-test-id="emit-role-update" @click="$emit('update:role', { userId: '2', role: 'global:admin' })">Update Role</button>
				<button data-test-id="emit-options-update" @click="$emit('update:options', { page: 1, itemsPerPage: 20, sortBy: [{ id: 'role', desc: true }] })">Update Options</button>
				<button data-test-id="emit-name-sort" @click="$emit('update:options', { page: 0, itemsPerPage: 10, sortBy: [{ id: 'name', desc: false }] })">Name Sort</button>
				<button data-test-id="emit-invalid-sort" @click="$emit('update:options', { page: 0, itemsPerPage: 10, sortBy: [{ id: 'invalidKey', desc: false }] })">Invalid Sort</button>
			</div>
		`,
	},
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

vi.mock('@/utils/rbac/permissions', () => ({
	hasPermission: vi.fn(() => false),
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

		settingsStore.isSmtpSetup = true;
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

	it('turn enforcing mfa on', async () => {
		const { getByTestId } = renderComponent();

		const actionSwitch = getByTestId('enable-force-mfa');
		expect(actionSwitch).toBeInTheDocument();

		await userEvent.click(actionSwitch);

		expect(usersStore.updateEnforceMfa).toHaveBeenCalledWith(true);
	});

	it('turn enforcing mfa off', async () => {
		settingsStore.isMFAEnforced = true;
		const { getByTestId } = renderComponent();

		const actionSwitch = getByTestId('enable-force-mfa');
		expect(actionSwitch).toBeInTheDocument();

		await userEvent.click(actionSwitch);

		expect(usersStore.updateEnforceMfa).toHaveBeenCalledWith(false);
	});

	it('should render correctly with users list', () => {
		renderComponent();

		expect(screen.getByRole('heading', { name: /users/i })).toBeInTheDocument();
		expect(screen.getByTestId('users-list-search')).toBeInTheDocument();
		expect(screen.getByTestId('settings-users-invite-button')).toBeInTheDocument();
	});

	it('should open invite modal when invite button is clicked', async () => {
		const user = userEvent.setup();
		renderComponent();

		const inviteButton = screen.getByTestId('settings-users-invite-button');
		await user.click(inviteButton);

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
		const user = userEvent.setup();
		renderComponent();

		const searchInput = screen.getByTestId('users-list-search');
		await user.type(searchInput, 'test search');

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

	describe('user actions', () => {
		it('should handle delete user action', async () => {
			const user = userEvent.setup();
			renderComponent();

			await user.click(screen.getByTestId('emit-delete'));

			expect(uiStore.openModalWithData).toHaveBeenCalledWith({
				name: DELETE_USER_MODAL_KEY,
				data: {
					userId: '2',
					afterDelete: expect.any(Function),
				},
			});
		});

		it('should handle reinvite user action', async () => {
			const user = userEvent.setup();
			renderComponent();

			await user.click(screen.getByTestId('emit-reinvite'));

			expect(usersStore.reinviteUser).toHaveBeenCalledWith({
				email: 'pending@example.com',
				role: ROLE.Member,
			});
			expect(mockToast.showToast).toHaveBeenCalledWith({
				type: 'success',
				title: expect.any(String),
				message: expect.any(String),
			});
		});

		it('should handle copy invite link action', async () => {
			const user = userEvent.setup();
			renderComponent();

			await user.click(screen.getByTestId('emit-copy-invite'));

			expect(mockClipboard.copy).toHaveBeenCalledWith('https://example.com/invite/123');
			expect(mockToast.showToast).toHaveBeenCalledWith({
				type: 'success',
				title: expect.any(String),
				message: expect.any(String),
			});
		});

		it('should handle copy password reset link action', async () => {
			const user = userEvent.setup();
			renderComponent();

			await user.click(screen.getByTestId('emit-copy-reset'));

			expect(usersStore.getUserPasswordResetLink).toHaveBeenCalledWith(mockUsersList.items[1]);
			expect(mockClipboard.copy).toHaveBeenCalledWith('https://example.com/reset/123');
			expect(mockToast.showToast).toHaveBeenCalledWith({
				type: 'success',
				title: expect.any(String),
				message: expect.any(String),
			});
		});

		it('should handle allow SSO manual login action', async () => {
			const user = userEvent.setup();
			renderComponent();

			await user.click(screen.getByTestId('emit-allow-sso'));

			expect(usersStore.updateOtherUserSettings).toHaveBeenCalledWith('2', {
				allowSSOManualLogin: true,
			});
			expect(mockToast.showToast).toHaveBeenCalledWith({
				type: 'success',
				title: expect.any(String),
				message: expect.any(String),
			});
		});

		it('should handle disallow SSO manual login action', async () => {
			// Set user to have SSO manual login enabled
			usersStore.usersList.state.items[1].settings = { allowSSOManualLogin: true };

			const user = userEvent.setup();
			renderComponent();

			await user.click(screen.getByTestId('emit-disallow-sso'));

			expect(usersStore.updateOtherUserSettings).toHaveBeenCalledWith('2', {
				allowSSOManualLogin: false,
			});
			expect(mockToast.showToast).toHaveBeenCalledWith({
				type: 'success',
				title: expect.any(String),
				message: expect.any(String),
			});
		});

		it('should handle reinvite user error', async () => {
			usersStore.reinviteUser = vi.fn().mockRejectedValue(new Error('Failed to reinvite'));

			const user = userEvent.setup();
			renderComponent();

			await user.click(screen.getByTestId('emit-reinvite'));

			expect(mockToast.showError).toHaveBeenCalledWith(expect.any(Error), expect.any(String));
		});
	});

	describe('role updates', () => {
		it('should handle role update', async () => {
			const user = userEvent.setup();
			renderComponent();

			await user.click(screen.getByTestId('emit-role-update'));

			expect(usersStore.updateGlobalRole).toHaveBeenCalledWith({
				id: '2',
				newRoleName: ROLE.Admin,
			});
			expect(mockToast.showToast).toHaveBeenCalledWith({
				type: 'success',
				title: expect.any(String),
				message: expect.any(String),
			});
		});

		it('should handle role update error', async () => {
			usersStore.updateGlobalRole = vi.fn().mockRejectedValue(new Error('Failed to update role'));

			const user = userEvent.setup();
			renderComponent();

			await user.click(screen.getByTestId('emit-role-update'));

			expect(mockToast.showError).toHaveBeenCalledWith(expect.any(Error), expect.any(String));
		});
	});

	describe('table functionality', () => {
		it('should handle table options update', async () => {
			const user = userEvent.setup();
			renderComponent();

			await user.click(screen.getByTestId('emit-options-update'));

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
			const user = userEvent.setup();
			renderComponent();

			await user.click(screen.getByTestId('emit-name-sort'));

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
			const user = userEvent.setup();
			renderComponent();

			await user.click(screen.getByTestId('emit-invalid-sort'));

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
	});
});
