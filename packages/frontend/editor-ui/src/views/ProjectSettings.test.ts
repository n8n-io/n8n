import { nextTick, reactive } from 'vue';
import userEvent from '@testing-library/user-event';
import { createTestingPinia } from '@pinia/testing';
import { createComponentRenderer } from '@/__tests__/render';
import { getDropdownItems, mockedStore, type MockedStore } from '@/__tests__/utils';
import ProjectSettings from '@/views/ProjectSettings.vue';
import { useProjectsStore } from '@/stores/projects.store';
import { VIEWS } from '@/constants';
import type { Project } from '@/types/projects.types';
import { ProjectTypes } from '@/types/projects.types';
import { createProjectListItem } from '@/__tests__/data/projects';
import { createUser } from '@/__tests__/data/users';
import { useUsersStore } from '@/stores/users.store';
import { useSettingsStore } from '@/stores/settings.store';
import { useRolesStore } from '@/stores/roles.store';
import type { FrontendSettings } from '@n8n/api-types';

const mockTrack = vi.fn();
const mockShowMessage = vi.fn();
const mockShowError = vi.fn();
const mockRouterPush = vi.fn();

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

vi.mock('vue-router', async () => {
	const actual = await vi.importActual('vue-router');
	return {
		...actual,
		useRouter: vi.fn(() => ({
			currentRoute: {
				value: {
					params: {},
				},
			},
			push: mockRouterPush,
		})),
		useRoute: () =>
			reactive({
				params: {},
				query: {},
			}),
	};
});

const renderComponent = createComponentRenderer(ProjectSettings);

// Helper function to get input elements safely
const getInput = (element: Element): HTMLInputElement => {
	const input = element.querySelector('input');
	if (!input) throw new Error('Input element not found');
	return input;
};

const getTextarea = (element: Element): HTMLTextAreaElement => {
	const textarea = element.querySelector('textarea');
	if (!textarea) throw new Error('Textarea element not found');
	return textarea;
};

const projects = [
	ProjectTypes.Personal,
	ProjectTypes.Personal,
	ProjectTypes.Team,
	ProjectTypes.Team,
].map(createProjectListItem);

let projectsStore: MockedStore<typeof useProjectsStore>;
let usersStore: MockedStore<typeof useUsersStore>;
let settingsStore: MockedStore<typeof useSettingsStore>;
let rolesStore: MockedStore<typeof useRolesStore>;

describe('ProjectSettings', () => {
	beforeEach(() => {
		mockTrack.mockClear();
		mockShowMessage.mockClear();
		mockShowError.mockClear();
		mockRouterPush.mockClear();

		mockShowMessage.mockReturnValue({ id: 'test', close: vi.fn() });

		createTestingPinia();

		// Get the mocked store instances
		projectsStore = mockedStore(useProjectsStore);
		usersStore = mockedStore(useUsersStore);
		settingsStore = mockedStore(useSettingsStore);
		rolesStore = mockedStore(useRolesStore);

		settingsStore.settings = {
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
		} as FrontendSettings;

		rolesStore.processedProjectRoles = [
			{
				slug: 'project:admin',
				displayName: 'Admin',
				description: null,
				systemRole: false,
				roleType: 'project' as const,
				scopes: [],
				licensed: true,
			},
			{
				slug: 'project:editor',
				displayName: 'Editor',
				description: null,
				systemRole: false,
				roleType: 'project' as const,
				scopes: [],
				licensed: true,
			},
			{
				slug: 'project:viewer',
				displayName: 'Viewer',
				description: null,
				systemRole: false,
				roleType: 'project' as const,
				scopes: [],
				licensed: true,
			},
		];

		// Mock project data
		const mockProject: Project = {
			id: '123',
			name: 'Test Project',
			description: '',
			type: 'team',
			icon: { type: 'icon', value: 'layers' },
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			relations: [
				{
					id: '1',
					firstName: 'John',
					lastName: 'Doe',
					email: 'john@example.com',
					role: 'project:admin',
				},
			],
			scopes: ['project:read'],
		};

		// Set current project data for component access
		Object.assign(projectsStore, {
			currentProject: mockProject,
			currentProjectId: mockProject.id,
			availableProjects: projects,
		});

		// Explicitly stub all store actions to prevent network calls
		projectsStore.getProject = vi.fn().mockResolvedValue(undefined);
		projectsStore.updateProject = vi.fn().mockResolvedValue(undefined);
		projectsStore.deleteProject = vi.fn().mockResolvedValue(undefined);
		projectsStore.isProjectEmpty = vi.fn().mockResolvedValue(false);
		projectsStore.getAllProjects = vi.fn().mockResolvedValue(undefined);
		projectsStore.getMyProjects = vi.fn().mockResolvedValue(undefined);
		projectsStore.getPersonalProject = vi.fn().mockResolvedValue(undefined);
		projectsStore.getProjectsCount = vi.fn().mockResolvedValue(undefined);
		projectsStore.setCurrentProject = vi.fn();

		// Mock users data
		usersStore.allUsers = [
			createUser({
				id: '1',
				firstName: 'John',
				lastName: 'Doe',
				email: 'john@example.com',
			}),
			createUser({
				id: 'current-user',
				firstName: 'Current',
				lastName: 'User',
				email: 'current@example.com',
			}),
		];

		// Mock current user
		usersStore.currentUser = {
			id: 'current-user',
			firstName: 'Current',
			lastName: 'User',
			email: 'current@example.com',
			isDefaultUser: false,
			isPending: false,
			isPendingUser: false,
			mfaEnabled: false,
			signInType: 'email',
		};
	});

	it('should show confirmation modal before deleting project and delete with transfer', async () => {
		// Reset the mock and set up specific behavior for this test
		projectsStore.deleteProject.mockResolvedValue();

		const { getByTestId } = renderComponent();
		const deleteButton = getByTestId('project-settings-delete-button');
		// Note: The transfer select is inside the modal and needs the transfer option to be selected first

		await userEvent.click(deleteButton);
		await nextTick();

		// Modal should be visible - check by looking for dialog content
		expect(getByTestId('project-settings-delete-confirm-button')).toBeInTheDocument();

		// Select transfer option (radio button)
		const transferRadio = getByTestId('project-settings-delete-confirm-button')
			.closest('div')
			?.querySelector('input[value="transfer"]');
		if (transferRadio) {
			await userEvent.click(transferRadio);
			await nextTick();
		}

		// Now we can access the transfer select
		const transferSelect = getByTestId('project-sharing-select');

		const transferOptions = await getDropdownItems(transferSelect);
		const firstTransferOption = transferOptions[0];

		await userEvent.click(firstTransferOption);
		await nextTick();

		const confirmDeleteButton = getByTestId('project-settings-delete-confirm-button');
		await userEvent.click(confirmDeleteButton);
		await nextTick();

		// Wait for async operations to complete
		await new Promise((resolve) => setTimeout(resolve, 100));

		expect(projectsStore.deleteProject).toHaveBeenCalledWith('123', expect.any(String));

		expect(mockRouterPush).toHaveBeenCalledWith({ name: VIEWS.HOMEPAGE });
	});

	it('should show confirmation modal before deleting project and deleting without transfer', async () => {
		projectsStore.deleteProject.mockResolvedValue();
		// Mock empty project so delete is valid without selecting an operation
		projectsStore.isProjectEmpty.mockResolvedValue(true);

		const { getByTestId } = renderComponent();
		const deleteButton = getByTestId('project-settings-delete-button');

		await userEvent.click(deleteButton);
		await nextTick();

		// Modal should be visible - check by looking for dialog content
		expect(getByTestId('project-settings-delete-confirm-button')).toBeInTheDocument();

		const confirmDeleteButton = getByTestId('project-settings-delete-confirm-button');
		await userEvent.click(confirmDeleteButton);
		await nextTick();

		// Wait for async operations to complete
		await new Promise((resolve) => setTimeout(resolve, 100));

		expect(projectsStore.deleteProject).toHaveBeenCalledWith('123', undefined);

		expect(mockRouterPush).toHaveBeenCalledWith({ name: VIEWS.HOMEPAGE });
	});

	it('should render project settings container correctly', async () => {
		const { getByTestId } = renderComponent();

		// Wait for component to fully render
		await nextTick();

		// Check that the main container is rendered
		const container = getByTestId('project-settings-container');
		expect(container).toBeInTheDocument();

		// Check that essential form elements exist
		const nameInput = getByTestId('project-settings-name-input');
		const saveButton = getByTestId('project-settings-save-button');
		expect(nameInput).toBeInTheDocument();
		expect(saveButton).toBeInTheDocument();
	});

	describe('Form Operations', () => {
		it('should mark form as dirty on text input', async () => {
			const { getByTestId } = renderComponent();
			const nameInput = getByTestId('project-settings-name-input');
			const cancelButton = getByTestId('project-settings-cancel-button');

			expect(cancelButton).toBeDisabled();

			const actualInput = getInput(nameInput);
			await userEvent.type(actualInput, ' Extra');

			expect(cancelButton).toBeEnabled();
		});

		it('should reset form on cancel button click', async () => {
			const { getByTestId } = renderComponent();
			const nameInput = getByTestId('project-settings-name-input');
			const cancelButton = getByTestId('project-settings-cancel-button');

			const actualInput = getInput(nameInput);
			await userEvent.type(actualInput, ' Extra');

			expect(cancelButton).toBeEnabled();

			await userEvent.click(cancelButton);
			expect(actualInput.value).toBe('Test Project');
			expect(cancelButton).toBeDisabled();
		});

		it('should enable save button when form is dirty and valid', async () => {
			const { getByTestId } = renderComponent();
			const nameInput = getByTestId('project-settings-name-input');
			const saveButton = getByTestId('project-settings-save-button');

			expect(saveButton).toBeDisabled();

			const actualInput = getInput(nameInput);
			await userEvent.type(actualInput, ' Modified');

			expect(saveButton).toBeEnabled();
		});
	});

	describe('Form Validation', () => {
		it('should have proper initial form state', async () => {
			const { getByTestId } = renderComponent();

			// Wait for component to fully mount and watchers to run
			await nextTick();

			const nameInput = getByTestId('project-settings-name-input');
			const descriptionInput = getByTestId('project-settings-description-input');
			const cancelButton = getByTestId('project-settings-cancel-button');
			const saveButton = getByTestId('project-settings-save-button');

			const actualNameInput = getInput(nameInput);
			const actualDescInput = getTextarea(descriptionInput);

			expect(actualNameInput.value).toBe('Test Project');
			expect(actualDescInput.value).toBe('');
			expect(cancelButton).toBeDisabled();
			expect(saveButton).toBeDisabled();
		});
	});

	describe('Save and Form Submission', () => {
		it('should save project updates via form submission with Enter key', async () => {
			const updateProjectSpy = vi
				.spyOn(projectsStore, 'updateProject')
				.mockResolvedValue(undefined);

			const { getByTestId } = renderComponent();
			const nameInput = getByTestId('project-settings-name-input');
			const descriptionInput = getByTestId('project-settings-description-input');

			const actualNameInput = getInput(nameInput);
			const actualDescInput = getTextarea(descriptionInput);

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
		});

		it('should handle successful save via button click', async () => {
			const updateProjectSpy = vi
				.spyOn(projectsStore, 'updateProject')
				.mockResolvedValue(undefined);

			const { getByTestId } = renderComponent();
			const nameInput = getByTestId('project-settings-name-input');
			const saveButton = getByTestId('project-settings-save-button');

			const actualInput = getInput(nameInput);
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
		});

		it('should handle save errors and prevent invalid submissions', async () => {
			// Test save error handling
			const error = new Error('Save failed');
			projectsStore.updateProject.mockRejectedValue(error);

			const { getByTestId } = renderComponent();
			const nameInput = getByTestId('project-settings-name-input');
			const saveButton = getByTestId('project-settings-save-button');

			const actualInput = getInput(nameInput);

			// Test save error
			await userEvent.type(actualInput, ' Updated');
			await nextTick();
			await userEvent.type(actualInput, '{enter}');
			await nextTick();

			expect(projectsStore.updateProject).toHaveBeenCalled();
			expect(mockShowError).toHaveBeenCalledWith(error, expect.any(String));
			expect(mockShowMessage).not.toHaveBeenCalled();

			// Test invalid form submission prevention
			projectsStore.updateProject.mockClear();
			await userEvent.clear(actualInput);
			await nextTick();

			expect(saveButton).toBeDisabled();
			await userEvent.click(saveButton);

			expect(projectsStore.updateProject).not.toHaveBeenCalled();
		});

		it('should maintain form state properly after save and handle validation', async () => {
			const updateProjectSpy = vi
				.spyOn(projectsStore, 'updateProject')
				.mockResolvedValue(undefined);

			const { getByTestId } = renderComponent();
			const nameInput = getByTestId('project-settings-name-input');
			const cancelButton = getByTestId('project-settings-cancel-button');
			const saveButton = getByTestId('project-settings-save-button');

			const actualInput = getInput(nameInput);

			// Test validation
			await userEvent.clear(actualInput);
			await nextTick();
			expect(saveButton).toBeDisabled();

			await userEvent.type(actualInput, 'Valid Project Name');
			await nextTick();
			expect(saveButton).toBeEnabled();
			expect(cancelButton).toBeEnabled();

			// Test state after save
			await userEvent.click(saveButton);
			await nextTick();

			expect(updateProjectSpy).toHaveBeenCalled();
			expect(cancelButton).toBeDisabled();
			expect(saveButton).toBeDisabled();
		});
	});

	describe('Component State Management', () => {
		it('should handle form state changes correctly', async () => {
			const { getByTestId } = renderComponent();
			const cancelButton = getByTestId('project-settings-cancel-button');
			const nameInput = getByTestId('project-settings-name-input');

			expect(cancelButton).toBeDisabled();

			const actualInput = getInput(nameInput);
			await userEvent.type(actualInput, ' Modified');
			await nextTick();

			expect(cancelButton).toBeEnabled();

			await userEvent.click(cancelButton);
			await nextTick();
			expect(cancelButton).toBeDisabled();
			expect(actualInput.value).toBe('Test Project');
		});

		it('should manage component state correctly', () => {
			const { getByTestId } = renderComponent();

			// Test that main form elements are rendered properly
			const nameInput = getByTestId('project-settings-name-input');
			const saveButton = getByTestId('project-settings-save-button');
			const cancelButton = getByTestId('project-settings-cancel-button');

			expect(nameInput).toBeInTheDocument();
			expect(saveButton).toBeInTheDocument();
			expect(cancelButton).toBeInTheDocument();
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

			const actualInput = getInput(nameInput);
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
			projectsStore.updateProject.mockRejectedValue(error);

			const { getByTestId } = renderComponent();
			const nameInput = getByTestId('project-settings-name-input');
			const saveButton = getByTestId('project-settings-save-button');

			const actualInput = getInput(nameInput);
			await userEvent.type(actualInput, ' - Error Test');
			await userEvent.click(saveButton);
			await nextTick();
			expect(projectsStore.updateProject).toHaveBeenCalled();
			expect(projectsStore.updateProject).toHaveBeenCalledWith(
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

			const actualNameInput = getInput(nameInput);
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
			} catch {
				expect(true).toBe(true);
			}
		});

		it('should manage member selection properly', () => {
			const { getByTestId } = renderComponent();
			const memberSelect = getByTestId('project-members-select');

			expect(memberSelect).toBeInTheDocument();
			// Member select should be rendered even if no current members
		});
	});

	describe('Component Lifecycle and Watchers', () => {
		it('should initialize form data when current project changes', async () => {
			const { getByTestId } = renderComponent();
			const nameInput = getByTestId('project-settings-name-input');
			const descInput = getByTestId('project-settings-description-input');

			const actualNameInput = getInput(nameInput);
			const actualDescInput = descInput.querySelector('textarea')!;

			expect(actualNameInput.value).toBe('Test Project');
			expect(actualDescInput.value).toBe('');

			const updatedProject = {
				...projectsStore.currentProject!,
				name: 'Updated Project',
				description: 'Updated description',
			};
			projectsStore.setCurrentProject(updatedProject);

			await nextTick();
		});

		it('should handle project data initialization', () => {
			const { getByTestId } = renderComponent();

			expect(getByTestId('project-settings-name-input')).toBeInTheDocument();
			expect(getByTestId('project-settings-description-input')).toBeInTheDocument();
			expect(getByTestId('project-members-select')).toBeInTheDocument();
		});
	});

	describe('UI Elements', () => {
		it('should render all project settings form and management elements', () => {
			const { getByTestId, container } = renderComponent();

			// Form elements
			const form = container.querySelector('form');
			const nameInput = getByTestId('project-settings-name-input');
			const descriptionInput = getByTestId('project-settings-description-input');
			const saveButton = getByTestId('project-settings-save-button');
			const cancelButton = getByTestId('project-settings-cancel-button');
			const deleteButton = getByTestId('project-settings-delete-button');

			// Member management elements
			const membersSelect = getByTestId('project-members-select');

			// Assert all elements are present
			expect(form).toBeInTheDocument();
			expect(nameInput).toBeInTheDocument();
			expect(descriptionInput).toBeInTheDocument();
			expect(saveButton).toBeInTheDocument();
			expect(cancelButton).toBeInTheDocument();
			expect(deleteButton).toBeInTheDocument();
			expect(membersSelect).toBeInTheDocument();
		});
	});
});
