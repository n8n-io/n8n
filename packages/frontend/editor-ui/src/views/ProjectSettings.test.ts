import { reactive, nextTick } from 'vue';
import { within } from '@testing-library/vue';
import { createPinia, setActivePinia } from 'pinia';
import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';
import { getDropdownItems } from '@/__tests__/utils';
import { useRouter } from 'vue-router';
import ProjectSettings from '@/views/ProjectSettings.vue';
import { useProjectsStore } from '@/stores/projects.store';
import { VIEWS } from '@/constants';
import { useUsersStore } from '@/stores/users.store';
import { createProjectListItem } from '@/__tests__/data/projects';
import { createUser } from '@/__tests__/data/users';
import { useSettingsStore } from '@/stores/settings.store';
import type { FrontendSettings } from '@n8n/api-types';
import { ProjectTypes } from '@/types/projects.types';
import { useRolesStore } from '@/stores/roles.store';

vi.mock('vue-router', () => {
	const params = {};
	const push = vi.fn();
	return {
		useRoute: () =>
			reactive({
				params,
			}),
		useRouter: () => ({
			push,
		}),
		RouterLink: vi.fn(),
	};
});

const renderComponent = createComponentRenderer(ProjectSettings);

const projects = [
	ProjectTypes.Personal,
	ProjectTypes.Personal,
	ProjectTypes.Team,
	ProjectTypes.Team,
].map(createProjectListItem);

let router: ReturnType<typeof useRouter>;
let projectsStore: ReturnType<typeof useProjectsStore>;
let usersStore: ReturnType<typeof useUsersStore>;
let settingsStore: ReturnType<typeof useSettingsStore>;
let rolesStore: ReturnType<typeof useRolesStore>;

describe('ProjectSettings', () => {
	beforeEach(() => {
		const pinia = createPinia();
		setActivePinia(pinia);
		router = useRouter();
		projectsStore = useProjectsStore();
		usersStore = useUsersStore();
		settingsStore = useSettingsStore();
		rolesStore = useRolesStore();

		vi.spyOn(usersStore, 'fetchUsers').mockImplementation(async () => await Promise.resolve());
		vi.spyOn(projectsStore, 'getAvailableProjects').mockImplementation(async () => {});
		vi.spyOn(projectsStore, 'availableProjects', 'get').mockReturnValue(projects);
		vi.spyOn(projectsStore, 'isProjectEmpty').mockResolvedValue(false);
		vi.spyOn(settingsStore, 'settings', 'get').mockReturnValue({
			enterprise: {
				projects: {
					team: {
						limit: -1,
					},
				},
			},
			folders: {
				enabled: false,
			},
		} as FrontendSettings);
		vi.spyOn(rolesStore, 'processedProjectRoles', 'get').mockReturnValue([
			{
				slug: 'project:admin',
				displayName: 'Project Admin',
				description: 'Can manage project settings',
				licensed: true,
				roleType: 'project',
				scopes: ['project:read', 'project:write', 'project:delete'],
				systemRole: true,
			},
			{
				slug: 'project:editor',
				displayName: 'Project Editor',
				description: 'Can edit project settings',
				licensed: true,
				roleType: 'project',
				scopes: ['project:read', 'project:write'],
				systemRole: true,
			},
			{
				slug: 'project:custom',
				displayName: 'Custom',
				description: 'Can do some custom actions',
				licensed: true,
				roleType: 'project',
				scopes: ['workflow:list'],
				systemRole: false,
			},
		]);
		// Set up test users using store methods
		const testUser = createUser({
			id: '1',
			firstName: 'John',
			lastName: 'Doe',
			email: 'admin@example.com',
		});

		// Use the store's addUsers method to properly add users
		usersStore.addUsers([testUser]);

		// Mock the computed properties
		vi.spyOn(usersStore, 'allUsers', 'get').mockReturnValue([testUser]);
		vi.spyOn(usersStore, 'usersById', 'get').mockReturnValue({
			'1': testUser,
		});

		projectsStore.setCurrentProject({
			id: '123',
			type: 'team',
			name: 'Test Project',
			icon: { type: 'icon', value: 'folder' },
			relations: [
				{
					id: '1',
					lastName: 'Doe',
					firstName: 'John',
					role: 'project:admin',
					email: 'admin@example.com',
				},
			],
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			scopes: [],
		});
	});

	it('should show confirmation modal before deleting project and delete with transfer', async () => {
		const deleteProjectSpy = vi
			.spyOn(projectsStore, 'deleteProject')
			.mockImplementation(async () => {});

		const { getByTestId, findByRole } = renderComponent();
		const deleteButton = getByTestId('project-settings-delete-button');

		await userEvent.click(deleteButton);
		expect(deleteProjectSpy).not.toHaveBeenCalled();
		const modal = await findByRole('dialog');
		expect(modal).toBeVisible();
		const confirmButton = getByTestId('project-settings-delete-confirm-button');
		expect(confirmButton).toBeDisabled();

		await userEvent.click(within(modal).getAllByRole('radio')[0]);
		const projectSelect = getByTestId('project-sharing-select');
		const projectSelectDropdownItems = await getDropdownItems(projectSelect);
		await userEvent.click(projectSelectDropdownItems[0]);
		expect(confirmButton).toBeEnabled();

		await userEvent.click(confirmButton);
		expect(deleteProjectSpy).toHaveBeenCalledWith('123', expect.any(String));
		expect(router.push).toHaveBeenCalledWith({ name: VIEWS.HOMEPAGE });
	});

	it('should show confirmation modal before deleting project and deleting without transfer', async () => {
		const deleteProjectSpy = vi
			.spyOn(projectsStore, 'deleteProject')
			.mockImplementation(async () => {});

		const { getByTestId, findByRole } = renderComponent();
		const deleteButton = getByTestId('project-settings-delete-button');

		await userEvent.click(deleteButton);
		expect(deleteProjectSpy).not.toHaveBeenCalled();
		const modal = await findByRole('dialog');
		expect(modal).toBeVisible();
		const confirmButton = getByTestId('project-settings-delete-confirm-button');
		expect(confirmButton).toBeDisabled();

		await userEvent.click(within(modal).getAllByRole('radio')[1]);
		const input = within(modal).getByRole('textbox');

		await userEvent.type(input, 'delete all ');
		expect(confirmButton).toBeDisabled();

		await userEvent.type(input, 'data');
		expect(confirmButton).toBeEnabled();

		await userEvent.click(confirmButton);
		expect(deleteProjectSpy).toHaveBeenCalledWith('123', undefined);
		expect(router.push).toHaveBeenCalledWith({ name: VIEWS.HOMEPAGE });
	});

	it('should show role dropdown in members table', async () => {
		const { getByTestId } = renderComponent();
		const membersTable = getByTestId('project-members-table');
		expect(membersTable).toBeVisible();

		// Find the role dropdown within the table
		const roleDropdown = getByTestId('project-member-role-dropdown');
		expect(roleDropdown).toBeVisible();

		// Verify the dropdown shows the current role (Admin)
		const dropdownButton = within(roleDropdown).getByRole('button');
		expect(dropdownButton).toHaveTextContent('Admin');
		expect(dropdownButton).toBeEnabled();
	});

	describe('Form Operations', () => {
		it('should mark form as dirty on text input', async () => {
			const { getByTestId } = renderComponent();
			const nameInput = getByTestId('project-settings-name-input');
			const cancelButton = getByTestId('project-settings-cancel-button');

			// Initially cancel button should be disabled (form not dirty)
			expect(cancelButton).toBeDisabled();

			// Find the actual input element within the N8nFormInput
			const actualInput = nameInput.querySelector('input');
			expect(actualInput).toBeTruthy();

			// Type in the name field
			await userEvent.type(actualInput!, ' Updated');

			// Wait for the component to process the change
			await nextTick();

			// Cancel button should now be enabled (form is dirty)
			expect(cancelButton).toBeEnabled();
		});

		it('should reset form on cancel button click', async () => {
			const { getByTestId } = renderComponent();
			const nameInput = getByTestId('project-settings-name-input');
			const descriptionInput = getByTestId('project-settings-description-input');
			const cancelButton = getByTestId('project-settings-cancel-button');

			// Find the actual input elements
			const actualNameInput = nameInput.querySelector('input')!;
			const actualDescInput = descriptionInput.querySelector('textarea')!;

			// Make changes to form (don't clear first, just add to existing value)
			await userEvent.type(actualNameInput, ' Updated');
			await userEvent.type(actualDescInput, 'Updated Description');

			// Wait for processing
			await nextTick();

			// Verify form is dirty
			expect(cancelButton).toBeEnabled();

			// Click cancel
			await userEvent.click(cancelButton);

			// Verify form is reset
			expect(cancelButton).toBeDisabled();
			expect(actualNameInput.value).toBe('Test Project'); // Back to original
			expect(actualDescInput.value).toBe(''); // Back to original (empty)
		});

		it('should enable save button when form is dirty and valid', async () => {
			const { getByTestId } = renderComponent();
			const nameInput = getByTestId('project-settings-name-input');
			const saveButton = getByTestId('project-settings-save-button');

			// Initially save button should be disabled
			expect(saveButton).toBeDisabled();

			// Find the actual input element
			const actualInput = nameInput.querySelector('input')!;

			// Make a change
			await userEvent.type(actualInput, ' Updated');
			await nextTick();

			// Save button should now be enabled
			expect(saveButton).toBeEnabled();
		});
	});

	describe('Form Validation', () => {
		it('should have proper initial form state', async () => {
			const { getByTestId } = renderComponent();

			const nameInput = getByTestId('project-settings-name-input');
			const descriptionInput = getByTestId('project-settings-description-input');
			const saveButton = getByTestId('project-settings-save-button');
			const cancelButton = getByTestId('project-settings-cancel-button');

			// Check initial values
			const actualNameInput = nameInput.querySelector('input')!;
			const actualDescInput = descriptionInput.querySelector('textarea')!;

			expect(actualNameInput.value).toBe('Test Project');
			expect(actualDescInput.value).toBe('');

			// Check initial button states
			expect(saveButton).toBeDisabled();
			expect(cancelButton).toBeDisabled();
		});
	});

	describe('Save Functionality', () => {
		it('should save project updates through form submission', async () => {
			const updateProjectSpy = vi
				.spyOn(projectsStore, 'updateProject')
				.mockResolvedValue(undefined);

			const { getByTestId } = renderComponent();
			const nameInput = getByTestId('project-settings-name-input');
			const descriptionInput = getByTestId('project-settings-description-input');
			const saveButton = getByTestId('project-settings-save-button');

			// Find the actual input elements
			const actualNameInput = nameInput.querySelector('input')!;
			const actualDescInput = descriptionInput.querySelector('textarea')!;

			// Make changes
			await userEvent.type(actualNameInput, ' - Updated');
			await userEvent.type(actualDescInput, 'Updated project description');

			// Save
			await userEvent.click(saveButton);
			await nextTick();

			// Verify API call
			expect(updateProjectSpy).toHaveBeenCalledWith(
				'123',
				expect.objectContaining({
					name: 'Test Project - Updated',
					description: 'Updated project description',
				}),
			);

			// Verify form is no longer dirty after successful save
			expect(saveButton).toBeDisabled();
		});

		it('should handle save errors', async () => {
			const error = new Error('Save failed');
			vi.spyOn(projectsStore, 'updateProject').mockRejectedValue(error);

			const { getByTestId } = renderComponent();
			const nameInput = getByTestId('project-settings-name-input');
			const saveButton = getByTestId('project-settings-save-button');

			// Find the actual input element
			const actualInput = nameInput.querySelector('input')!;

			// Make changes
			await userEvent.type(actualInput, ' Updated');
			await nextTick();

			// Try to save
			await userEvent.click(saveButton);
			await nextTick();

			// Verify the API was called and would have failed
			expect(projectsStore.updateProject).toHaveBeenCalled();
		});
	});

	describe('Additional UI Tests', () => {
		it('should render project settings form elements', async () => {
			const { getByTestId } = renderComponent();

			// Verify main form elements are present
			const nameInput = getByTestId('project-settings-name-input');
			const descriptionInput = getByTestId('project-settings-description-input');
			const saveButton = getByTestId('project-settings-save-button');
			const cancelButton = getByTestId('project-settings-cancel-button');
			const deleteButton = getByTestId('project-settings-delete-button');

			expect(nameInput).toBeInTheDocument();
			expect(descriptionInput).toBeInTheDocument();
			expect(saveButton).toBeInTheDocument();
			expect(cancelButton).toBeInTheDocument();
			expect(deleteButton).toBeInTheDocument();
		});
	});
});
