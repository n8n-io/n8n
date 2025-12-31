import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { waitFor, type RenderResult } from '@testing-library/vue';
import { VIEWS } from '@/app/constants';
import { useRolesStore } from '@/app/stores/roles.store';
import { mockedStore, type MockedStore } from '@/__tests__/utils';
import ProjectRoleView from './ProjectRoleView.vue';

// Mock composables
const mockShowError = vi.fn();
const mockShowMessage = vi.fn();
const mockPush = vi.fn();
const mockReplace = vi.fn();
const mockBack = vi.fn();

vi.mock('@/app/composables/useToast', () => ({
	useToast: () => ({
		showError: mockShowError,
		showMessage: mockShowMessage,
	}),
}));

vi.mock('vue-router', async () => {
	const actual = await vi.importActual('vue-router');
	return {
		...actual,
		useRouter: () => ({
			push: mockPush,
			replace: mockReplace,
			back: mockBack,
		}),
	};
});

const renderComponent = createComponentRenderer(ProjectRoleView);

const defaultScopes = [
	'project:read',
	'project:list',
	'folder:read',
	'folder:list',
	'workflow:read',
	'workflow:list',
	'credential:read',
	'credential:list',
];

// Mock role data
const mockExistingRole = {
	displayName: 'Test Role',
	slug: 'test-role',
	description: 'A test role for testing',
	scopes: ['workflow:read', 'workflow:create', 'credential:read'],
	licensed: true,
	systemRole: false,
	roleType: 'project' as const,
};

const mockSystemRoles = [
	{
		displayName: 'Project Admin',
		slug: 'project:admin',
		description: 'Admin role',
		scopes: ['project:read', 'project:update', 'project:delete'],
		licensed: true,
		systemRole: true,
		roleType: 'project' as const,
	},
	{
		displayName: 'Project Editor',
		slug: 'project:editor',
		description: 'Editor role',
		scopes: ['workflow:read', 'workflow:create', 'workflow:update'],
		licensed: true,
		systemRole: true,
		roleType: 'project' as const,
	},
	{
		displayName: 'Project Viewer',
		slug: 'project:viewer',
		description: 'Viewer role',
		scopes: [...defaultScopes],
		licensed: true,
		systemRole: true,
		roleType: 'project' as const,
	},
];

let rolesStore: MockedStore<typeof useRolesStore>;

// Test utilities
const getFormElements = (container: Element) => ({
	nameInput: container.querySelector('input[maxlength="100"]') as HTMLInputElement,
	descriptionInput: container.querySelector('textarea[maxlength="500"]') as HTMLTextAreaElement,
});

const waitForFormPopulation = async (container: Element, expectedName: string) =>
	await waitFor(() => {
		const { nameInput } = getFormElements(container);
		expect(nameInput?.value).toBe(expectedName);
	});

const fillForm = async (container: Element, name: string, description = '') => {
	const { nameInput, descriptionInput } = getFormElements(container);
	if (nameInput) {
		await userEvent.clear(nameInput);
		await userEvent.type(nameInput, name);
	}
	if (description && descriptionInput) {
		await userEvent.clear(descriptionInput);
		await userEvent.type(descriptionInput, description);
	}
};

const waitForEditButtonsToBe = async (
	getByText: RenderResult['getByText'],
	state: 'enabled' | 'disabled',
) =>
	await waitFor(() => {
		const discardButton = getByText('Discard changes');
		const saveButton = getByText('Save', { selector: 'button' });

		if (state === 'disabled') {
			expect(saveButton).toBeDisabled();
			expect(discardButton).toBeDisabled();
		} else {
			expect(saveButton).not.toBeDisabled();
			expect(discardButton).not.toBeDisabled();
		}
	});

const setupEditingRole = () => {
	rolesStore.fetchRoleBySlug.mockResolvedValueOnce(mockExistingRole);
	rolesStore.roles.project = [mockExistingRole];
};

const setupEditingRoleComponent = async () => {
	setupEditingRole();
	const component = renderComponent({ props: { roleSlug: 'test-role' } });
	await waitFor(() => expect(rolesStore.fetchRoleBySlug).toHaveBeenCalled());
	return component;
};

describe('ProjectRoleView', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		createTestingPinia();
		rolesStore = mockedStore(useRolesStore);

		rolesStore.fetchRoles.mockResolvedValue();

		// Mock store properties
		rolesStore.processedProjectRoles = mockSystemRoles;
	});

	describe('New Role Creation', () => {
		it('should render new role form when no roleSlug prop provided', () => {
			const { getByText, getByPlaceholderText } = renderComponent();

			expect(getByText('New Role')).toBeInTheDocument();
			expect(getByText('Create', { selector: 'button' })).toBeInTheDocument();
			expect(getByText('Role name')).toBeInTheDocument();
			expect(getByText('Description')).toBeInTheDocument();
			expect(getByPlaceholderText('Optional')).toBeInTheDocument();
		});

		it('should render back button that calls router.back', async () => {
			const { getByText } = renderComponent();
			const backButton = getByText('Back to role list');

			await userEvent.click(backButton);

			expect(mockBack).toHaveBeenCalled();
		});

		it('should render permissions section with scope types', () => {
			const { getByText } = renderComponent();

			expect(getByText('Permissions')).toBeInTheDocument();
			expect(getByText('Preset')).toBeInTheDocument();
			expect(getByText('Admin')).toBeInTheDocument();
			expect(getByText('Editor')).toBeInTheDocument();
			expect(getByText('Viewer')).toBeInTheDocument();
		});

		it('should create new role when form is submitted', async () => {
			const mockCreatedRole = { ...mockExistingRole, slug: 'new-role-slug' };
			rolesStore.createProjectRole.mockResolvedValueOnce(mockCreatedRole);

			const { container, getByText } = renderComponent();

			await fillForm(container, 'New Test Role', 'A new test role');
			await userEvent.click(getByText('Create', { selector: 'button' }));

			await waitFor(() => {
				expect(rolesStore.createProjectRole).toHaveBeenCalledWith({
					displayName: 'New Test Role',
					description: 'A new test role',
					scopes: defaultScopes,
					roleType: 'project',
				});
			});

			expect(mockReplace).toHaveBeenCalledWith({
				name: VIEWS.PROJECT_ROLE_SETTINGS,
				params: { roleSlug: 'new-role-slug' },
			});
			expect(mockShowMessage).toHaveBeenCalledWith({
				type: 'success',
				message: 'Role created successfully',
			});
		});

		it('should handle creation error', async () => {
			const error = new Error('Creation failed');
			rolesStore.createProjectRole.mockRejectedValueOnce(error);

			const { container, getByText } = renderComponent();

			await fillForm(container, 'Test Role');
			await userEvent.click(getByText('Create', { selector: 'button' }));

			await waitFor(() => {
				expect(mockShowError).toHaveBeenCalledWith(error, 'Error creating role');
			});
		});
	});

	describe('Existing Role Editing', () => {
		it('should fetch and display existing role when roleSlug is provided', async () => {
			setupEditingRole();

			const { getByText, getByDisplayValue } = await setupEditingRoleComponent();

			await waitFor(() => {
				expect(rolesStore.fetchRoleBySlug).toHaveBeenCalledWith({ slug: 'test-role' });
			});

			await waitFor(() => {
				expect(getByText('Role "Test Role"')).toBeInTheDocument();
				expect(getByText('Save', { selector: 'button' })).toBeInTheDocument();
				expect(getByDisplayValue('Test Role')).toBeInTheDocument();
				expect(getByDisplayValue('A test role for testing')).toBeInTheDocument();
			});
		});

		it('should handle fetch role error', async () => {
			const error = new Error('Fetch failed');
			rolesStore.fetchRoleBySlug.mockRejectedValueOnce(error);

			await setupEditingRoleComponent();

			await waitFor(() => {
				expect(mockShowError).toHaveBeenCalledWith(error, 'Error fetching role');
			});
		});

		it('should update existing role when form is submitted', async () => {
			const updatedRole = { ...mockExistingRole, displayName: 'Updated Role' };
			setupEditingRole();
			rolesStore.updateProjectRole.mockResolvedValueOnce(updatedRole);

			const { container, getByText } = await setupEditingRoleComponent();

			await waitFor(() => expect(rolesStore.fetchRoleBySlug).toHaveBeenCalled());
			await waitForFormPopulation(container, 'Test Role');

			await fillForm(container, 'Updated Role');
			await userEvent.click(getByText('Save', { selector: 'button' }));

			await waitFor(() => {
				expect(rolesStore.updateProjectRole).toHaveBeenCalledWith('test-role', {
					displayName: 'Updated Role',
					description: 'A test role for testing',
					scopes: ['workflow:read', 'workflow:create', 'credential:read'],
				});
			});

			expect(mockShowMessage).toHaveBeenCalledWith({
				type: 'success',
				message: 'Role updated successfully',
			});
		});

		it('should handle update error', async () => {
			const error = new Error('Update failed');
			setupEditingRole();
			rolesStore.updateProjectRole.mockRejectedValueOnce(error);

			const { getByText, container } = await setupEditingRoleComponent();

			await waitFor(() => expect(rolesStore.fetchRoleBySlug).toHaveBeenCalled());
			await waitForFormPopulation(container, 'Test Role');

			await fillForm(container, 'Updated Role');
			await userEvent.click(getByText('Save', { selector: 'button' }));

			await waitFor(() => {
				expect(mockShowError).toHaveBeenCalledWith(error, 'Error updating role');
			});
		});
	});

	describe('Permissions Management', () => {
		it('should render all scope types with checkboxes', async () => {
			const { getByText, getByTestId } = renderComponent();

			// Check scope type headers
			expect(getByText('Project')).toBeInTheDocument();
			expect(getByText('Folders')).toBeInTheDocument();
			expect(getByText('Workflows')).toBeInTheDocument();
			expect(getByText('Credentials')).toBeInTheDocument();
			expect(getByText('Source control')).toBeInTheDocument();

			await waitFor(() => expect(getByTestId('scope-checkbox-project:read')).toBeInTheDocument());

			// Check some specific scope checkboxes
			expect(getByTestId('scope-checkbox-project:read')).toBeInTheDocument();
			expect(getByTestId('scope-checkbox-workflow:create')).toBeInTheDocument();
			expect(getByTestId('scope-checkbox-credential:read')).toBeInTheDocument();
		});

		it('should toggle scope when checkbox is clicked', async () => {
			const { getByTestId } = renderComponent();

			await waitFor(() => expect(getByTestId('scope-checkbox-project:update')).toBeInTheDocument());

			// Find the checkbox by its label text
			const label = getByTestId('scope-checkbox-project:update');
			const checkbox = label.querySelector('input[type="checkbox"]') as HTMLInputElement;

			// Initially unchecked
			expect(checkbox).not.toBeChecked();

			// Click to check
			await userEvent.click(checkbox);
			expect(checkbox).toBeChecked();

			// Click to uncheck
			await userEvent.click(checkbox);
			expect(checkbox).not.toBeChecked();
		});
	});

	describe('Form Validation', () => {
		it('should have maxlength restrictions', () => {
			const { container } = renderComponent();

			const { nameInput, descriptionInput } = getFormElements(container);
			expect(nameInput).toHaveAttribute('maxlength', '100');
			expect(descriptionInput).toHaveAttribute('maxlength', '500');
		});

		it('should show validation asterisk for required field', () => {
			const { getByText } = renderComponent();

			// Check if required asterisk is displayed for role name
			expect(getByText('*')).toBeInTheDocument();
		});
	});

	describe('Action Buttons', () => {
		describe('Editing Mode (initialState exists)', () => {
			it('should render discard changes and save buttons when editing existing role', async () => {
				const { getByText } = await setupEditingRoleComponent();

				await waitFor(() => {
					expect(getByText('Discard changes')).toBeInTheDocument();
					expect(getByText('Save', { selector: 'button' })).toBeInTheDocument();
				});
			});

			it('should disable discard changes and save buttons when no unsaved changes', async () => {
				const { getByText } = await setupEditingRoleComponent();
				await waitForEditButtonsToBe(getByText, 'disabled');
			});

			it('should enable discard changes and save buttons when there are unsaved changes', async () => {
				const { container, getByText } = await setupEditingRoleComponent();
				await waitForFormPopulation(container, 'Test Role');

				await fillForm(container, 'Modified Role');
				await waitForEditButtonsToBe(getByText, 'enabled');
			});

			it('should reset form to initial state when discard changes is clicked', async () => {
				const { container, getByText } = await setupEditingRoleComponent();
				await waitForFormPopulation(container, 'Test Role');

				await fillForm(container, 'Modified Role');
				await userEvent.click(getByText('Discard changes'));

				const { nameInput } = getFormElements(container);
				await waitFor(() => {
					expect(nameInput?.value).toBe('Test Role');
				});
			});

			it('should call handleSubmit when save button is clicked', async () => {
				const updatedRole = { ...mockExistingRole, displayName: 'Updated Role' };
				rolesStore.updateProjectRole.mockResolvedValueOnce(updatedRole);

				const { container, getByText } = await setupEditingRoleComponent();
				await waitForFormPopulation(container, 'Test Role');

				await fillForm(container, 'Updated Role');
				await userEvent.click(getByText('Save', { selector: 'button' }));

				await waitFor(() => {
					expect(rolesStore.updateProjectRole).toHaveBeenCalledWith('test-role', {
						displayName: 'Updated Role',
						description: 'A test role for testing',
						scopes: ['workflow:read', 'workflow:create', 'credential:read'],
					});
				});
			});
		});

		describe('Creation Mode (no initialState)', () => {
			it('should render only create button when creating new role', () => {
				const { getByText, queryByText } = renderComponent();

				expect(getByText('Create', { selector: 'button' })).toBeInTheDocument();
				expect(queryByText('Discard changes')).not.toBeInTheDocument();
				expect(queryByText('Save', { selector: 'button' })).not.toBeInTheDocument();
			});

			it('should call handleSubmit when create button is clicked', async () => {
				const mockCreatedRole = { ...mockExistingRole, slug: 'new-role-slug' };
				rolesStore.createProjectRole.mockResolvedValueOnce(mockCreatedRole);

				const { container, getByText } = renderComponent();

				await fillForm(container, 'New Test Role');
				await userEvent.click(getByText('Create', { selector: 'button' }));

				await waitFor(() => {
					expect(rolesStore.createProjectRole).toHaveBeenCalledWith({
						displayName: 'New Test Role',
						description: '',
						scopes: defaultScopes,
						roleType: 'project',
					});
				});
			});
		});
	});

	describe('Form states', () => {
		it('should disable buttons when form matches initial state', async () => {
			const { getByText } = await setupEditingRoleComponent();
			await waitForEditButtonsToBe(getByText, 'disabled');
		});

		it('should enable buttons when displayName is changed', async () => {
			const { container, getByText } = await setupEditingRoleComponent();
			await waitForFormPopulation(container, 'Test Role');

			await fillForm(container, 'Changed Name');
			await waitForEditButtonsToBe(getByText, 'enabled');
		});

		it('should enable buttons when description is changed', async () => {
			const { container, getByText } = await setupEditingRoleComponent();
			await waitFor(() => {
				const { descriptionInput } = getFormElements(container);
				expect(descriptionInput?.value).toBe('A test role for testing');
			});

			await fillForm(container, 'Test Role', 'Changed description');
			await waitForEditButtonsToBe(getByText, 'enabled');
		});

		it('should enable buttons when scopes are changed', async () => {
			const { getByText, getByTestId } = await setupEditingRoleComponent();
			await waitFor(() => {
				const discardButton = getByText('Discard changes');
				expect(discardButton).toBeDisabled();
			});

			const scopeCheckbox = getByTestId('scope-checkbox-project:update');
			const checkbox = scopeCheckbox.querySelector('input[type="checkbox"]') as HTMLInputElement;

			await userEvent.click(checkbox);
			await waitForEditButtonsToBe(getByText, 'enabled');
		});
	});

	describe('Edge Cases', () => {
		it('should handle empty description', async () => {
			rolesStore.createProjectRole.mockResolvedValue({ ...mockExistingRole, slug: 'new-slug' });

			const { container, getByText } = renderComponent();

			await fillForm(container, 'Test Role');
			await userEvent.click(getByText('Create', { selector: 'button' }));

			await waitFor(() => {
				expect(rolesStore.createProjectRole).toHaveBeenCalledWith({
					displayName: 'Test Role',
					description: '',
					scopes: defaultScopes,
					roleType: 'project',
				});
			});
		});

		it('should update roles array after successful creation', async () => {
			const mockCreatedRole = { ...mockExistingRole, slug: 'new-role' };
			rolesStore.createProjectRole.mockResolvedValueOnce(mockCreatedRole);

			const { container, getByText } = renderComponent();

			await fillForm(container, 'New Role');
			await userEvent.click(getByText('Create', { selector: 'button' }));

			await waitFor(() => {
				expect(rolesStore.createProjectRole).toHaveBeenCalled();
				expect(mockReplace).toHaveBeenCalledWith({
					name: VIEWS.PROJECT_ROLE_SETTINGS,
					params: { roleSlug: 'new-role' },
				});
			});
		});
	});
});
