import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { VIEWS } from '@/constants';
import { useRolesStore } from '@/stores/roles.store';
import { mockedStore, type MockedStore } from '@/__tests__/utils';
import ProjectRolesView from './ProjectRolesView.vue';

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

const renderComponent = createComponentRenderer(ProjectRolesView, {
	global: {
		stubs: {
			'router-link': {
				template: '<a><slot /></a>',
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
	},
	{
		displayName: 'Custom Role 2',
		slug: 'custom-role-2',
		description: 'Another custom role',
		scopes: ['credential:read'],
		licensed: true,
		systemRole: false,
		roleType: 'project' as const,
	},
];

let rolesStore: MockedStore<typeof useRolesStore>;

describe('ProjectRolesView', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockPush.mockClear();

		createTestingPinia();
		rolesStore = mockedStore(useRolesStore);
	});

	it('should render the page heading and Add Role button', () => {
		rolesStore.processedProjectRoles = [...mockSystemRoles, ...mockCustomRoles];

		const { getByText, getByRole } = renderComponent();

		expect(getByText('Project Roles')).toBeInTheDocument();
		expect(getByRole('button', { name: 'Add Role' })).toBeInTheDocument();
	});

	it('should navigate to new role page when Add Role button is clicked', async () => {
		rolesStore.processedProjectRoles = [];

		const { getByRole } = renderComponent();
		const addButton = getByRole('button', { name: 'Add Role' });

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

	it('should display placeholder values for assigned to and last edited columns', () => {
		rolesStore.processedProjectRoles = mockCustomRoles;

		const { getAllByText } = renderComponent();

		// Both "Assigned to" and "Last edited" columns should show "-" as placeholder
		expect(getAllByText('-')).toHaveLength(mockCustomRoles.length * 2);
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
		expect(getByText('Project Roles')).toBeInTheDocument();
		expect(getByRole('button', { name: 'Add Role' })).toBeInTheDocument();

		// Data table should be present but empty
		expect(getByText('Name')).toBeInTheDocument();
		expect(getByText('Type')).toBeInTheDocument();
	});
});
