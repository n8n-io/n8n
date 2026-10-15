import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import { within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { useRolesStore } from '@n8n/stores/roles.store';
import { useRBACStore } from '@n8n/stores/rbac.store';
import { mockedStore, type MockedStore } from '@/__tests__/utils';
import InstanceRolesView from './InstanceRolesView.vue';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useUsersStore } from '@n8n/stores/users.store';

vi.mock('vue-router', async () => {
	const actual = await vi.importActual('vue-router');
	return {
		...actual,
		useRouter: () => ({ push: vi.fn() }),
	};
});

vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showMessage: vi.fn(), showError: vi.fn() }),
}));

vi.mock('@/app/composables/useMessage', () => ({
	useMessage: () => ({ confirm: vi.fn() }),
}));

// Render the dialog only when open so presence assertions reflect the modal's visibility.
const ElDialogStub = {
	props: ['modelValue'],
	template: `
		<div v-if="modelValue" role="dialog">
			<slot name="header" />
			<slot />
			<slot name="footer" />
		</div>
	`,
};

const renderComponent = createComponentRenderer(InstanceRolesView, {
	global: {
		stubs: {
			RouterLink: {
				template: '<router-link-stub v-bind="$attrs"><slot /></router-link-stub>',
			},
			ElDialog: ElDialogStub,
			N8nSelect: true,
		},
	},
});

const mockSystemRoles = [
	{
		displayName: 'Admin',
		slug: 'global:admin',
		description: 'Instance admin',
		scopes: [],
		licensed: true,
		systemRole: true,
		roleType: 'global' as const,
		usedByUsers: 2,
	},
	{
		displayName: 'Member',
		slug: 'global:member',
		description: 'Instance member',
		scopes: [],
		licensed: true,
		systemRole: true,
		roleType: 'global' as const,
		usedByUsers: 5,
	},
];

const mockCustomRoles = [
	{
		displayName: 'Custom Global Role',
		slug: 'custom:global-1',
		description: 'A custom instance role',
		scopes: [],
		licensed: true,
		systemRole: false,
		roleType: 'global' as const,
		usedByUsers: 0,
	},
];

let rolesStore: MockedStore<typeof useRolesStore>;
let settingsStore: MockedStore<typeof useSettingsStore>;
let rbacStore: MockedStore<typeof useRBACStore>;
let usersStore: MockedStore<typeof useUsersStore>;

describe('InstanceRolesView', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		createTestingPinia();
		rolesStore = mockedStore(useRolesStore);
		settingsStore = mockedStore(useSettingsStore);
		settingsStore.isCustomRolesFeatureEnabled = true;
		rbacStore = mockedStore(useRBACStore);
		usersStore = mockedStore(useUsersStore);
		// Default to an entitled caller who doesn't hold the role being deleted;
		// individual tests override.
		rbacStore.hasScope = vi.fn().mockReturnValue(true);
		usersStore.currentUser = { id: 'me', role: 'global:owner' } as never;
	});

	it('should render the members-assigned column and table headers', () => {
		rolesStore.processedInstanceRoles = [...mockSystemRoles, ...mockCustomRoles];

		const { getByText } = renderComponent();

		expect(getByText('Members assigned')).toBeInTheDocument();
		expect(getByText('Name')).toBeInTheDocument();
		expect(getByText('Type')).toBeInTheDocument();
		expect(getByText('Last edited')).toBeInTheDocument();
	});

	it('should render a row per instance role by identity', () => {
		rolesStore.processedInstanceRoles = [...mockSystemRoles, ...mockCustomRoles];

		const { getByText, getAllByText } = renderComponent();

		expect(getByText('Admin')).toBeInTheDocument();
		expect(getByText('Member')).toBeInTheDocument();
		expect(getByText('Custom Global Role')).toBeInTheDocument();
		expect(getAllByText('System')).toHaveLength(2);
		expect(getAllByText('Custom')).toHaveLength(1);
	});

	it('should show destructive actions only for custom roles', () => {
		rolesStore.processedInstanceRoles = [...mockSystemRoles, ...mockCustomRoles];

		const { getAllByTestId } = renderComponent();

		// Only the single custom role has an action toggle; system roles are read-only.
		expect(getAllByTestId('action-toggle')).toHaveLength(1);
	});

	it('should duplicate a custom instance role with roleType global', async () => {
		const customRole = mockCustomRoles[0];
		const duplicated = { ...customRole, slug: 'custom:global-2', displayName: 'Copy' };
		rolesStore.processedInstanceRoles = [customRole];
		rolesStore.roles.global = [customRole];
		rolesStore.createRole.mockResolvedValue(duplicated);

		const { getByTestId, getAllByTestId } = renderComponent();
		await userEvent.click(within(getAllByTestId('action-toggle')[0]).getByRole('button'));
		await userEvent.click(getByTestId('action-duplicate'));

		expect(rolesStore.createRole).toHaveBeenCalledWith(
			expect.objectContaining({ roleType: 'global', scopes: [] }),
		);
	});

	it('should open the reassign modal when deleting a custom role with assigned users', async () => {
		const customRole = { ...mockCustomRoles[0], usedByUsers: 3 };
		rolesStore.processedInstanceRoles = [...mockSystemRoles, customRole];
		rolesStore.roles.global = [...mockSystemRoles, customRole];
		// The delete flow fetches the current count before deciding.
		rolesStore.fetchRoleBySlug.mockResolvedValue({ ...customRole, usedByUsers: 3 });

		const { getByTestId, getAllByTestId } = renderComponent();
		await userEvent.click(within(getAllByTestId('action-toggle')[0]).getByRole('button'));
		await userEvent.click(getByTestId('action-delete'));

		expect(rolesStore.fetchRoleBySlug).toHaveBeenCalledWith({ slug: customRole.slug });
		expect(getByTestId('delete-instance-role-modal')).toBeInTheDocument();
		// No deletion happens just from opening the modal.
		expect(rolesStore.deleteRole).not.toHaveBeenCalled();
	});

	it('should disable delete for a role with assigned users when the caller lacks user:changeRole', async () => {
		rbacStore.hasScope = vi.fn().mockReturnValue(false);
		const customRole = { ...mockCustomRoles[0], usedByUsers: 3 };
		rolesStore.processedInstanceRoles = [...mockSystemRoles, customRole];
		rolesStore.roles.global = [...mockSystemRoles, customRole];

		const { getByTestId, getAllByTestId } = renderComponent();
		await userEvent.click(within(getAllByTestId('action-toggle')[0]).getByRole('button'));
		await userEvent.click(getByTestId('action-delete'));

		// The action is disabled, so nothing is triggered.
		expect(rolesStore.fetchRoleBySlug).not.toHaveBeenCalled();
		expect(rolesStore.deleteRole).not.toHaveBeenCalled();
	});

	it('should disable delete for the current user’s own role', async () => {
		const customRole = { ...mockCustomRoles[0], usedByUsers: 3 };
		usersStore.currentUser = { id: 'me', role: customRole.slug } as never;
		rolesStore.processedInstanceRoles = [...mockSystemRoles, customRole];
		rolesStore.roles.global = [...mockSystemRoles, customRole];

		const { getByTestId, getAllByTestId } = renderComponent();
		await userEvent.click(within(getAllByTestId('action-toggle')[0]).getByRole('button'));
		await userEvent.click(getByTestId('action-delete'));

		// Own role can't be deleted, so the action is disabled and nothing triggers.
		expect(rolesStore.fetchRoleBySlug).not.toHaveBeenCalled();
		expect(rolesStore.deleteRole).not.toHaveBeenCalled();
	});

	it('should not open the reassign modal when the custom role has no assigned users', async () => {
		const customRole = { ...mockCustomRoles[0], usedByUsers: 0 };
		rolesStore.processedInstanceRoles = [customRole];
		rolesStore.roles.global = [customRole];
		rolesStore.fetchRoleBySlug.mockResolvedValue({ ...customRole, usedByUsers: 0 });

		const { queryByTestId, getByTestId, getAllByTestId } = renderComponent();
		await userEvent.click(within(getAllByTestId('action-toggle')[0]).getByRole('button'));
		await userEvent.click(getByTestId('action-delete'));

		// Falls back to the standard confirm dialog rather than the reassign modal.
		expect(queryByTestId('delete-instance-role-modal')).not.toBeInTheDocument();
	});
});
