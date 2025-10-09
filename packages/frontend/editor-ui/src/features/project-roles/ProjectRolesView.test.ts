import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { MODAL_CONFIRM, VIEWS } from '@/constants';
import { useRolesStore } from '@/stores/roles.store';
import { mockedStore, type MockedStore } from '@/__tests__/utils';
import ProjectRolesView from './ProjectRolesView.vue';
import { useSettingsStore } from '@/stores/settings.store';

// Mock vue-router
const mockPush = vi.fn();
vi.mock('vue-router', async () => {
	const actual = await vi.importActual('vue-router');
	return {
		...actual,
		useRouter: () => ({
			push: mockPush,
		}),
	};
});

// Mock composables
const mockShowMessage = vi.fn();
const mockShowError = vi.fn();
const mockConfirm = vi.fn();

vi.mock('@/composables/useToast', () => ({
	useToast: () => ({
		showMessage: mockShowMessage,
		showError: mockShowError,
	}),
}));

vi.mock('@/composables/useMessage', () => ({
	useMessage: () => ({
		confirm: mockConfirm,
	}),
}));

const renderComponent = createComponentRenderer(ProjectRolesView, {
	global: {
		stubs: {
			RouterLink: {
				template: '<router-link-stub v-bind="$attrs"><slot /></router-link-stub>',
			},
		},
	},
});

// Mock data for testing
const mockSystemRoles = [
	{
		displayName: 'Project Admin',
		slug: 'project:admin',
		description: 'Can manage all project resources',
		scopes: ['project:update', 'project:delete'],
		licensed: true,
		systemRole: true,
		roleType: 'project' as const,
	},
	{
		displayName: 'Project Editor',
		slug: 'project:editor',
		description: 'Can create and edit workflows',
		scopes: ['workflow:create', 'workflow:update'],
		licensed: true,
		systemRole: true,
		roleType: 'project' as const,
	},
];

const mockCustomRoles = [
	{
		displayName: 'Custom Role 1',
		slug: 'custom-role-1',
		description: 'Custom role for testing',
		scopes: ['workflow:read'],
		licensed: true,
		systemRole: false,
		roleType: 'project' as const,
		usedByUsers: 0,
	},
	{
		displayName: 'Custom Role 2',
		slug: 'custom-role-2',
		description: 'Another custom role',
		scopes: ['credential:read'],
		licensed: true,
		systemRole: false,
		roleType: 'project' as const,
		usedByUsers: 0,
	},
];

let rolesStore: MockedStore<typeof useRolesStore>;
let settingsStore: MockedStore<typeof useSettingsStore>;

describe('ProjectRolesView', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockPush.mockClear();
		mockShowMessage.mockClear();
		mockShowError.mockClear();
		mockConfirm.mockClear();

		createTestingPinia();
		rolesStore = mockedStore(useRolesStore);
		settingsStore = mockedStore(useSettingsStore);
		settingsStore.isCustomRolesFeatureEnabled = true;
	});

	it('should render the page heading and Add Role button', () => {
		rolesStore.processedProjectRoles = [...mockSystemRoles, ...mockCustomRoles];

		const { getByText, getByRole } = renderComponent();

		expect(getByText('Project roles')).toBeInTheDocument();
		expect(getByRole('button', { name: 'Add role' })).toBeInTheDocument();
	});

	it('should navigate to new role page when Add Role button is clicked', async () => {
		rolesStore.processedProjectRoles = [];

		const { getByRole } = renderComponent();
		const addButton = getByRole('button', { name: 'Add role' });

		await userEvent.click(addButton);

		expect(mockPush).toHaveBeenCalledWith({ name: VIEWS.PROJECT_NEW_ROLE });
	});

	it('should render data table with correct headers', () => {
		rolesStore.processedProjectRoles = [];

		const { getByText } = renderComponent();

		expect(getByText('Name')).toBeInTheDocument();
		expect(getByText('Type')).toBeInTheDocument();
		expect(getByText('Assigned to')).toBeInTheDocument();
		expect(getByText('Last edited')).toBeInTheDocument();
	});

	it('should display system roles correctly', () => {
		rolesStore.processedProjectRoles = mockSystemRoles;

		const { getByText, getAllByText } = renderComponent();

		// Check system role names and descriptions are displayed
		expect(getByText('Project Admin')).toBeInTheDocument();
		expect(getByText('Can manage all project resources')).toBeInTheDocument();
		expect(getByText('Project Editor')).toBeInTheDocument();
		expect(getByText('Can create and edit workflows')).toBeInTheDocument();

		// Check system role type indicators
		expect(getAllByText('System')).toHaveLength(2);
	});

	it('should display custom roles with clickable links', () => {
		rolesStore.processedProjectRoles = mockCustomRoles;

		const { getByText, getAllByText } = renderComponent();

		// Check custom role names and descriptions are displayed
		expect(getByText('Custom Role 1')).toBeInTheDocument();
		expect(getByText('Custom role for testing')).toBeInTheDocument();
		expect(getByText('Custom Role 2')).toBeInTheDocument();
		expect(getByText('Another custom role')).toBeInTheDocument();

		// Check custom role type indicators
		expect(getAllByText('Custom')).toHaveLength(2);
	});

	it('should not show action buttons for system roles', () => {
		rolesStore.processedProjectRoles = mockSystemRoles;

		const { queryByTestId } = renderComponent();

		// System roles should not have action toggle buttons
		expect(queryByTestId('action-toggle')).not.toBeInTheDocument();
	});

	it('should show action buttons for custom roles', () => {
		rolesStore.processedProjectRoles = mockCustomRoles;

		const { getAllByTestId } = renderComponent();

		// Custom roles should have action toggle buttons
		const actionToggles = getAllByTestId('action-toggle');
		expect(actionToggles).toHaveLength(2);
	});

	it('should handle mixed system and custom roles', () => {
		rolesStore.processedProjectRoles = [...mockSystemRoles, ...mockCustomRoles];

		const { getByText, getAllByText, getAllByTestId } = renderComponent();

		// Check that all roles are displayed
		expect(getByText('Project Admin')).toBeInTheDocument();
		expect(getByText('Project Editor')).toBeInTheDocument();
		expect(getByText('Custom Role 1')).toBeInTheDocument();
		expect(getByText('Custom Role 2')).toBeInTheDocument();

		// Check type indicators
		expect(getAllByText('System')).toHaveLength(2);
		expect(getAllByText('Custom')).toHaveLength(2);

		// Only custom roles should have action toggles
		expect(getAllByTestId('action-toggle')).toHaveLength(2);
	});

	it('should render empty state when no roles are present', () => {
		rolesStore.processedProjectRoles = [];

		const { getByText, getByRole } = renderComponent();

		// Should still show the heading and add button
		expect(getByText('Project roles')).toBeInTheDocument();
		expect(getByRole('button', { name: 'Add role' })).toBeInTheDocument();

		// Data table should be present but empty
		expect(getByText('Name')).toBeInTheDocument();
		expect(getByText('Type')).toBeInTheDocument();
	});

	describe('duplicateRole', () => {
		it('should successfully duplicate a custom role', async () => {
			const mockRole = mockCustomRoles[0];
			const duplicatedRole = {
				...mockRole,
				displayName: 'Copy of Custom Role 1',
				slug: 'copy-of-custom-role-1',
			};

			// Set up store with initial arrays
			const initialProjectRoles = [mockRole];
			rolesStore.processedProjectRoles = initialProjectRoles;
			rolesStore.createProjectRole.mockResolvedValue(duplicatedRole);
			rolesStore.roles.project = initialProjectRoles;

			const { getAllByTestId, getByTestId } = renderComponent();
			const actionToggle = getAllByTestId('action-toggle')[0];

			await userEvent.click(actionToggle);

			// Find and click the duplicate action
			const duplicateButton = getByTestId('action-duplicate');
			await userEvent.click(duplicateButton);

			expect(rolesStore.createProjectRole).toHaveBeenCalledWith({
				displayName: 'Copy of Custom Role 1',
				description: 'Custom role for testing',
				roleType: 'project',
				scopes: ['workflow:read'],
			});

			// Check that the duplicated role was pushed to the same array
			expect(rolesStore.roles.project).toHaveLength(2);
			expect(rolesStore.roles.project[1]).toStrictEqual(duplicatedRole);
			expect(mockShowMessage).toHaveBeenCalledWith({
				type: 'success',
				message: "Role 'Custom Role 1' duplicated successfully as 'Copy of Custom Role 1'",
			});
		});

		it('should handle duplicate role with null description', async () => {
			const mockRole = {
				...mockCustomRoles[0],
				description: null,
			};
			const duplicatedRole = {
				...mockRole,
				displayName: 'Copy of Custom Role 1',
				slug: 'copy-of-custom-role-1',
			};

			rolesStore.processedProjectRoles = [mockRole];
			rolesStore.createProjectRole.mockResolvedValue(duplicatedRole);
			rolesStore.roles.project = [mockRole];

			const { getAllByTestId, getByTestId } = renderComponent();
			const actionToggle = getAllByTestId('action-toggle')[0];

			await userEvent.click(actionToggle);

			const duplicateButton = getByTestId('action-duplicate');
			await userEvent.click(duplicateButton);

			expect(rolesStore.createProjectRole).toHaveBeenCalledWith({
				displayName: 'Copy of Custom Role 1',
				description: undefined,
				roleType: 'project',
				scopes: ['workflow:read'],
			});
		});

		it('should handle duplicate role error', async () => {
			const mockRole = mockCustomRoles[0];
			const error = new Error('Failed to duplicate role');

			rolesStore.processedProjectRoles = [mockRole];
			rolesStore.createProjectRole.mockRejectedValue(error);
			rolesStore.roles.project = [mockRole];

			const { getAllByTestId, getByTestId } = renderComponent();
			const actionToggle = getAllByTestId('action-toggle')[0];

			await userEvent.click(actionToggle);

			const duplicateButton = getByTestId('action-duplicate');
			await userEvent.click(duplicateButton);

			expect(rolesStore.createProjectRole).toHaveBeenCalled();
			expect(mockShowError).toHaveBeenCalledWith(error, 'Error duplicating role');
			expect(rolesStore.roles.project).not.toContain(
				expect.objectContaining({
					displayName: 'Copy of Custom Role 1',
				}),
			);
		});
	});

	describe('deleteRole', () => {
		it('should successfully delete a custom role when confirmed', async () => {
			const mockRole = mockCustomRoles[0];
			rolesStore.processedProjectRoles = [mockRole];
			rolesStore.roles.project = [mockRole];
			rolesStore.deleteProjectRole.mockResolvedValue(mockRole);
			mockConfirm.mockResolvedValue(MODAL_CONFIRM);

			const { getAllByTestId, getByTestId } = renderComponent();
			const actionToggle = getAllByTestId('action-toggle')[0];

			await userEvent.click(actionToggle);

			const deleteButton = getByTestId('action-delete');
			await userEvent.click(deleteButton);

			expect(mockConfirm).toHaveBeenCalledWith(
				`Are you sure that you want to delete '${mockRole.displayName}' permanently? This action cannot be undone.`,
				`Delete '${mockRole.displayName}'?`,
				{
					type: 'warning',
					confirmButtonText: 'Delete',
					cancelButtonText: 'Cancel',
				},
			);

			expect(rolesStore.deleteProjectRole).toHaveBeenCalledWith(mockRole.slug);
			expect(rolesStore.roles.project).not.toContain(mockRole);
			expect(mockShowMessage).toHaveBeenCalledWith({ title: 'Role deleted', type: 'success' });
		});

		it('should not delete role when user cancels confirmation', async () => {
			const mockRole = mockCustomRoles[0];
			const initialProjectRoles = [mockRole];
			rolesStore.processedProjectRoles = initialProjectRoles;
			rolesStore.roles.project = initialProjectRoles;
			mockConfirm.mockResolvedValue('cancel');

			const { getAllByTestId, getByTestId } = renderComponent();
			const actionToggle = getAllByTestId('action-toggle')[0];

			await userEvent.click(actionToggle);

			const deleteButton = getByTestId('action-delete');
			await userEvent.click(deleteButton);

			expect(mockConfirm).toHaveBeenCalled();
			expect(rolesStore.deleteProjectRole).not.toHaveBeenCalled();
			expect(rolesStore.roles.project).toHaveLength(1);
			expect(rolesStore.roles.project[0]).toStrictEqual(mockRole);
			expect(mockShowMessage).not.toHaveBeenCalled();
		});

		it('should handle delete role error', async () => {
			const mockRole = mockCustomRoles[0];
			const error = new Error('Failed to delete role');
			const initialProjectRoles = [mockRole];

			rolesStore.processedProjectRoles = initialProjectRoles;
			rolesStore.roles.project = initialProjectRoles;
			rolesStore.deleteProjectRole.mockRejectedValue(error);
			mockConfirm.mockResolvedValue(MODAL_CONFIRM);

			const { getAllByTestId, getByTestId } = renderComponent();
			const actionToggle = getAllByTestId('action-toggle')[0];

			await userEvent.click(actionToggle);

			const deleteButton = getByTestId('action-delete');
			await userEvent.click(deleteButton);

			expect(rolesStore.deleteProjectRole).toHaveBeenCalledWith(mockRole.slug);
			expect(mockShowError).toHaveBeenCalledWith(error, 'Error deleting role');
			expect(rolesStore.roles.project).toHaveLength(1);
			expect(rolesStore.roles.project[0]).toStrictEqual(mockRole);
			expect(mockShowMessage).not.toHaveBeenCalledWith({ title: 'Role deleted', type: 'success' });
		});

		it('should handle role not found in store during deletion', async () => {
			const mockRole = mockCustomRoles[0];
			const nonExistentRole = { ...mockRole, slug: 'non-existent-role' };
			const initialProjectRoles = [mockRole];

			rolesStore.processedProjectRoles = [nonExistentRole];
			rolesStore.roles.project = initialProjectRoles;
			// Role not in store
			rolesStore.deleteProjectRole.mockResolvedValue(nonExistentRole);
			mockConfirm.mockResolvedValue(MODAL_CONFIRM);

			const { getAllByTestId, getByTestId } = renderComponent();
			const actionToggle = getAllByTestId('action-toggle')[0];

			await userEvent.click(actionToggle);

			const deleteButton = getByTestId('action-delete');
			await userEvent.click(deleteButton);

			expect(rolesStore.deleteProjectRole).toHaveBeenCalledWith('non-existent-role');
			expect(mockShowMessage).toHaveBeenCalledWith({ title: 'Role deleted', type: 'success' });
			// Store should remain unchanged since role wasn't found
			expect(rolesStore.roles.project).toHaveLength(1);
			expect(rolesStore.roles.project[0]).toStrictEqual(mockRole);
		});
	});
});
