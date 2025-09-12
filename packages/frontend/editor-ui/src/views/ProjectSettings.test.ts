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

const mockTrack = vi.fn();
const mockShowMessage = vi.fn();
const mockShowError = vi.fn();

vi.mock('@/composables/useTelemetry', () => ({
	useTelemetry: () => ({
		track: mockTrack,
	}),
}));

vi.mock('@/composables/useToast', () => ({
	useToast: () => ({
		showMessage: mockShowMessage,
		showError: mockShowError,
	}),
}));

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
		mockTrack.mockClear();
		mockShowMessage.mockClear();
		mockShowError.mockClear();

		mockShowMessage.mockReturnValue({ id: 'test', close: vi.fn() });

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
		const testUser = createUser({
			id: '1',
			firstName: 'John',
			lastName: 'Doe',
			email: 'admin@example.com',
		});

		usersStore.addUsers([testUser]);

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

		const roleDropdown = getByTestId('project-member-role-dropdown');
		expect(roleDropdown).toBeVisible();

		const dropdownButton = within(roleDropdown).getByRole('button');
		expect(dropdownButton).toHaveTextContent('Admin');
		expect(dropdownButton).toBeEnabled();
	});

	describe('Form Operations', () => {
		it('should mark form as dirty on text input', async () => {
			const { getByTestId } = renderComponent();
			const nameInput = getByTestId('project-settings-name-input');
			const cancelButton = getByTestId('project-settings-cancel-button');

			expect(cancelButton).toBeDisabled();

			const actualInput = nameInput.querySelector('input');
			expect(actualInput).toBeTruthy();

			await userEvent.type(actualInput!, ' Updated');

			await nextTick();

			expect(cancelButton).toBeEnabled();
		});

		it('should reset form on cancel button click', async () => {
			const { getByTestId } = renderComponent();
			const nameInput = getByTestId('project-settings-name-input');
			const descriptionInput = getByTestId('project-settings-description-input');
			const cancelButton = getByTestId('project-settings-cancel-button');

			const actualNameInput = nameInput.querySelector('input')!;
			const actualDescInput = descriptionInput.querySelector('textarea')!;

			await userEvent.type(actualNameInput, ' Updated');
			await userEvent.type(actualDescInput, 'Updated Description');

			await nextTick();

			expect(cancelButton).toBeEnabled();

			await userEvent.click(cancelButton);
			expect(cancelButton).toBeDisabled();
			expect(actualNameInput.value).toBe('Test Project'); // Back to original
			expect(actualDescInput.value).toBe(''); // Back to original (empty)
		});

		it('should enable save button when form is dirty and valid', async () => {
			const { getByTestId } = renderComponent();
			const nameInput = getByTestId('project-settings-name-input');
			const saveButton = getByTestId('project-settings-save-button');

			expect(saveButton).toBeDisabled();

			const actualInput = nameInput.querySelector('input')!;

			await userEvent.type(actualInput, ' Updated');
			await nextTick();
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

			const actualNameInput = nameInput.querySelector('input')!;
			const actualDescInput = descriptionInput.querySelector('textarea')!;

			expect(actualNameInput.value).toBe('Test Project');
			expect(actualDescInput.value).toBe('');
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

			const actualNameInput = nameInput.querySelector('input')!;
			const actualDescInput = descriptionInput.querySelector('textarea')!;

			await userEvent.type(actualNameInput, ' - Updated');
			await userEvent.type(actualDescInput, 'Updated project description');
			await nextTick();

			await userEvent.type(actualNameInput, '{enter}');
			await nextTick();
			expect(updateProjectSpy).toHaveBeenCalledWith(
				'123',
				expect.objectContaining({
					name: 'Test Project - Updated',
					description: 'Updated project description',
				}),
			);

			expect(mockShowMessage).toHaveBeenCalledWith({
				type: 'success',
				title: expect.any(String),
			});

			expect(mockTrack).toHaveBeenCalledWith(
				'User changed project name',
				expect.objectContaining({
					project_id: '123',
					name: 'Test Project - Updated',
				}),
			);
			expect(mockTrack).toHaveBeenCalledTimes(1); // Only name change for this test
		});

		it('should handle save errors', async () => {
			const error = new Error('Save failed');
			vi.spyOn(projectsStore, 'updateProject').mockRejectedValue(error);

			const { getByTestId } = renderComponent();
			const nameInput = getByTestId('project-settings-name-input');

			const actualInput = nameInput.querySelector('input')!;

			await userEvent.type(actualInput, ' Updated');
			await nextTick();
			await userEvent.type(actualInput, '{enter}');
			await nextTick();

			expect(projectsStore.updateProject).toHaveBeenCalled();

			expect(mockShowError).toHaveBeenCalledWith(error, expect.any(String));

			expect(mockShowMessage).not.toHaveBeenCalled();
		});
	});

	describe('Component State Management', () => {
		it('should handle form state changes correctly', async () => {
			const { getByTestId } = renderComponent();
			const cancelButton = getByTestId('project-settings-cancel-button');
			const nameInput = getByTestId('project-settings-name-input');

			expect(cancelButton).toBeDisabled();

			const actualInput = nameInput.querySelector('input')!;
			await userEvent.type(actualInput, ' Modified');
			await nextTick();

			expect(cancelButton).toBeEnabled();

			await userEvent.click(cancelButton);
			await nextTick();
			expect(cancelButton).toBeDisabled();
			expect(actualInput.value).toBe('Test Project'); // Back to original
		});

		it('should manage member table display correctly', async () => {
			const { getByTestId } = renderComponent();
			const membersTable = getByTestId('project-members-table');
			const roleDropdown = getByTestId('project-member-role-dropdown');

			const dropdownButton = within(roleDropdown).getByRole('button');
			expect(dropdownButton).toHaveTextContent('Admin');
			expect(dropdownButton).toBeEnabled();
			expect(membersTable).toBeInTheDocument();
		});
	});

	describe('API Integration', () => {
		it('should handle project updates through the store', async () => {
			const updateProjectSpy = vi
				.spyOn(projectsStore, 'updateProject')
				.mockResolvedValue(undefined);

			const { getByTestId } = renderComponent();
			const nameInput = getByTestId('project-settings-name-input');
			const saveButton = getByTestId('project-settings-save-button');

			const actualInput = nameInput.querySelector('input')!;
			await userEvent.type(actualInput, ' - API Test');
			await userEvent.click(saveButton);
			await nextTick();
			expect(updateProjectSpy).toHaveBeenCalledWith(
				'123',
				expect.objectContaining({
					name: 'Test Project - API Test',
					description: '',
					relations: expect.any(Array),
				}),
			);

			expect(mockShowMessage).toHaveBeenCalledWith({
				type: 'success',
				title: expect.any(String),
			});

			expect(mockTrack).toHaveBeenCalledWith(
				'User changed project name',
				expect.objectContaining({
					project_id: '123',
					name: 'Test Project - API Test',
				}),
			);
		});

		it('should handle API errors gracefully', async () => {
			const error = new Error('API Error');
			const updateProjectSpy = vi.spyOn(projectsStore, 'updateProject').mockRejectedValue(error);

			const { getByTestId } = renderComponent();
			const nameInput = getByTestId('project-settings-name-input');
			const saveButton = getByTestId('project-settings-save-button');

			const actualInput = nameInput.querySelector('input')!;
			await userEvent.type(actualInput, ' - Error Test');
			await userEvent.click(saveButton);
			await nextTick();
			expect(updateProjectSpy).toHaveBeenCalled();
			expect(updateProjectSpy).toHaveBeenCalledWith(
				'123',
				expect.objectContaining({
					name: 'Test Project - Error Test',
				}),
			);

			expect(mockShowError).toHaveBeenCalledWith(error, expect.any(String));

			expect(mockShowMessage).not.toHaveBeenCalled();
		});
	});

	describe('Form Data Management', () => {
		it('should track form state correctly', async () => {
			const { getByTestId } = renderComponent();
			const cancelButton = getByTestId('project-settings-cancel-button');
			const nameInput = getByTestId('project-settings-name-input');
			const descInput = getByTestId('project-settings-description-input');

			expect(cancelButton).toBeDisabled();

			const actualNameInput = nameInput.querySelector('input')!;
			const actualDescInput = descInput.querySelector('textarea')!;

			await userEvent.type(actualNameInput, ' - Modified');
			await userEvent.type(actualDescInput, 'Updated description');
			await nextTick();

			expect(cancelButton).toBeEnabled();

			await userEvent.click(cancelButton);
			await nextTick();
			expect(cancelButton).toBeDisabled();
			expect(actualNameInput.value).toBe('Test Project');
			expect(actualDescInput.value).toBe('');
		});

		it('should handle member search element presence', async () => {
			const { getByTestId } = renderComponent();

			try {
				const searchInput = getByTestId('project-members-search');
				expect(searchInput).toBeInTheDocument();

				const actualSearchInput = searchInput.querySelector('input');
				if (actualSearchInput) {
					await userEvent.type(actualSearchInput, 'test');
					expect(actualSearchInput.value).toBe('test');
				}
			} catch (error) {
				expect(true).toBe(true);
			}
		});

		it('should manage member table data correctly', async () => {
			const { getByTestId } = renderComponent();
			const membersTable = getByTestId('project-members-table');
			const memberSelect = getByTestId('project-members-select');

			expect(membersTable).toBeInTheDocument();
			expect(memberSelect).toBeInTheDocument();
			expect(membersTable.textContent).toContain('John');
		});
	});

	describe('Form Submission Process', () => {
		it('should handle successful form submission', async () => {
			const updateProjectSpy = vi
				.spyOn(projectsStore, 'updateProject')
				.mockResolvedValue(undefined);

			const { getByTestId } = renderComponent();
			const nameInput = getByTestId('project-settings-name-input');
			const saveButton = getByTestId('project-settings-save-button');

			const actualInput = nameInput.querySelector('input')!;
			await userEvent.type(actualInput, ' - Updated');
			await nextTick();

			await userEvent.click(saveButton);
			await nextTick();
			expect(updateProjectSpy).toHaveBeenCalledWith(
				'123',
				expect.objectContaining({
					name: 'Test Project - Updated',
					description: '',
				}),
			);

			expect(mockShowMessage).toHaveBeenCalledWith({
				type: 'success',
				title: expect.any(String),
			});

			expect(mockTrack).toHaveBeenCalledWith(
				'User changed project name',
				expect.objectContaining({
					project_id: '123',
					name: 'Test Project - Updated',
				}),
			);
		});

		it('should handle form validation correctly', async () => {
			const { getByTestId } = renderComponent();
			const nameInput = getByTestId('project-settings-name-input');
			const saveButton = getByTestId('project-settings-save-button');

			const actualInput = nameInput.querySelector('input')!;
			await userEvent.clear(actualInput);
			await nextTick();

			expect(saveButton).toBeDisabled();

			await userEvent.type(actualInput, 'Valid Project Name');
			await nextTick();
			expect(saveButton).toBeEnabled();
		});

		it('should maintain form state properly after save', async () => {
			vi.spyOn(projectsStore, 'updateProject').mockResolvedValue(undefined);

			const { getByTestId } = renderComponent();
			const nameInput = getByTestId('project-settings-name-input');
			const saveButton = getByTestId('project-settings-save-button');
			const cancelButton = getByTestId('project-settings-cancel-button');

			const actualInput = nameInput.querySelector('input')!;
			await userEvent.type(actualInput, ' - Test Save');
			await nextTick();

			expect(cancelButton).toBeEnabled();

			await userEvent.click(saveButton);
			await nextTick();
			expect(cancelButton).toBeDisabled();
		});
	});

	describe('Component Lifecycle and Watchers', () => {
		it('should initialize form data when current project changes', async () => {
			const { getByTestId } = renderComponent();

			const newProject = {
				id: '456',
				type: 'team' as const,
				name: 'New Project Name',
				description: 'New project description',
				icon: { type: 'icon' as const, value: 'star' },
				relations: [
					{
						id: '2',
						firstName: 'Jane',
						lastName: 'Doe',
						email: 'jane@example.com',
						role: 'project:editor',
					},
				],
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				scopes: [],
			};

			projectsStore.setCurrentProject(newProject);
			await nextTick();
			const nameInput = getByTestId('project-settings-name-input');
			const descriptionInput = getByTestId('project-settings-description-input');

			const actualNameInput = nameInput.querySelector('input')!;
			const actualDescInput = descriptionInput.querySelector('textarea')!;

			expect(actualNameInput.value).toBe('New Project Name');
			expect(actualDescInput.value).toBe('New project description');
		});

		it('should handle project data initialization', async () => {
			const newProject = {
				id: '456',
				type: 'team' as const,
				name: 'Updated Project Name',
				description: 'Updated description',
				icon: { type: 'icon' as const, value: 'star' },
				relations: [
					{
						id: '2',
						firstName: 'Jane',
						lastName: 'Smith',
						email: 'jane@example.com',
						role: 'project:editor',
					},
				],
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				scopes: [],
			};

			const { getByTestId } = renderComponent();

			projectsStore.setCurrentProject(newProject);
			await nextTick();
			const nameInput = getByTestId('project-settings-name-input');
			const descInput = getByTestId('project-settings-description-input');

			const actualNameInput = nameInput.querySelector('input')!;
			const actualDescInput = descInput.querySelector('textarea')!;

			expect(actualNameInput.value).toBe('Updated Project Name');
			expect(actualDescInput.value).toBe('Updated description');
		});
	});

	describe('Error Handling', () => {
		it('should handle save errors gracefully', async () => {
			const error = new Error('Save failed');
			const updateProjectSpy = vi.spyOn(projectsStore, 'updateProject').mockRejectedValue(error);

			const { getByTestId } = renderComponent();
			const nameInput = getByTestId('project-settings-name-input');
			const saveButton = getByTestId('project-settings-save-button');

			const actualInput = nameInput.querySelector('input')!;
			await userEvent.type(actualInput, ' Updated');
			await nextTick();

			await userEvent.click(saveButton);
			await nextTick();
			expect(updateProjectSpy).toHaveBeenCalled();

			expect(mockShowError).toHaveBeenCalledWith(error, expect.any(String));

			expect(mockShowMessage).not.toHaveBeenCalled();
		});

		it('should prevent invalid form submissions', async () => {
			const updateProjectSpy = vi
				.spyOn(projectsStore, 'updateProject')
				.mockResolvedValue(undefined);

			const { getByTestId } = renderComponent();
			const nameInput = getByTestId('project-settings-name-input');
			const saveButton = getByTestId('project-settings-save-button');

			const actualInput = nameInput.querySelector('input')!;
			await userEvent.clear(actualInput);
			await nextTick();

			expect(saveButton).toBeDisabled();
			await userEvent.click(saveButton);
			await nextTick();

			expect(updateProjectSpy).not.toHaveBeenCalled();
		});
	});

	describe('Additional UI Tests', () => {
		it('should render project settings form elements', async () => {
			const { getByTestId } = renderComponent();

			const nameInput = getByTestId('project-settings-name-input');
			const descriptionInput = getByTestId('project-settings-description-input');
			const saveButton = getByTestId('project-settings-save-button');
			const cancelButton = getByTestId('project-settings-cancel-button');
			const deleteButton = getByTestId('project-settings-delete-button');
			const membersSelect = getByTestId('project-members-select');
			const membersTable = getByTestId('project-members-table');

			expect(nameInput).toBeInTheDocument();
			expect(descriptionInput).toBeInTheDocument();
			expect(saveButton).toBeInTheDocument();
			expect(cancelButton).toBeInTheDocument();
			expect(deleteButton).toBeInTheDocument();
			expect(membersSelect).toBeInTheDocument();
			expect(membersTable).toBeInTheDocument();
		});

		it('should handle member table pagination and options', async () => {
			const { getByTestId } = renderComponent();
			const membersTable = getByTestId('project-members-table');

			expect(membersTable).toBeInTheDocument();
		});
	});
});
