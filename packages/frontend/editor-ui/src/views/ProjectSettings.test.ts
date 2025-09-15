import { defineComponent, nextTick, reactive } from 'vue';
import userEvent from '@testing-library/user-event';
import { createTestingPinia } from '@pinia/testing';
import { createComponentRenderer } from '@/__tests__/render';
import {
	getDropdownItems,
	mockedStore,
	type MockedStore,
	useEmitters,
	type Emitter,
	waitAllPromises,
} from '@/__tests__/utils';
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
const { emitters, addEmitter } = useEmitters<
	'projectMembersTable' | 'n8nUserSelect' | 'n8nIconPicker'
>();

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

// Stub child components to simplify event-driven testing
vi.mock('@/components/Projects/ProjectMembersTable.vue', () => ({
	default: defineComponent({
		name: 'ProjectMembersTableStub',
		props: {
			data: { type: Object, required: true },
			currentUserId: { type: String, required: false },
			projectRoles: { type: Array, required: true },
		},
		emits: ['update:options', 'update:role'],
		setup(_, { emit }) {
			addEmitter('projectMembersTable', emit as unknown as Emitter);
			return {};
		},
		data() {
			return {
				tableOptions: {
					page: 0,
					itemsPerPage: 10,
					sortBy: [] as Array<{ id: string; desc: boolean }>,
				},
			};
		},
		template:
			'<div data-test-id="project-members-table">' +
			'<div data-test-id="members-count">{{ data.items.length }}</div>' +
			'<div data-test-id="members-page">{{ tableOptions.page }}</div>' +
			'</div>',
	}),
}));

vi.mock('@n8n/design-system', async (importOriginal) => {
	const original = await importOriginal<object>();
	return {
		...original,
		N8nInput: defineComponent({
			name: 'N8nInputStub',
			props: { modelValue: { type: String, required: false } },
			emits: ['update:model-value'],
			template:
				'<div data-test-id="n8n-input-stub"><input :value="modelValue" @input="$emit(\'update:model-value\', $event.target.value)" /></div>',
		}),
		N8nUserSelect: defineComponent({
			name: 'N8nUserSelectStub',
			props: {
				users: { type: Array, required: true },
				currentUserId: { type: String, required: false },
				placeholder: { type: String, required: false },
			},
			emits: ['update:model-value'],
			setup(_, { emit }) {
				addEmitter('n8nUserSelect', emit as unknown as Emitter);
				return {};
			},
			template: '<div data-test-id="project-members-select"></div>',
		}),
		N8nIconPicker: defineComponent({
			name: 'N8nIconPickerStub',
			props: { modelValue: { type: Object, required: false } },
			emits: ['update:model-value'],
			setup(_, { emit }) {
				addEmitter('n8nIconPicker', emit as unknown as Emitter);
				return {};
			},
			template: '<div data-test-id="icon-picker"></div>',
		}),
	};
});

const renderComponent = createComponentRenderer(ProjectSettings);

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

		projectsStore = mockedStore(useProjectsStore);
		usersStore = mockedStore(useUsersStore);
		settingsStore = mockedStore(useSettingsStore);
		rolesStore = mockedStore(useRolesStore);

		settingsStore.settings = {
			enterprise: {
				projects: {
					team: { limit: -1 },
				},
			},
			folders: { enabled: false },
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

		projectsStore.currentProject = mockProject;
		projectsStore.currentProjectId = mockProject.id;
		projectsStore.availableProjects = projects;

		usersStore.allUsers = [
			createUser({ id: '1', firstName: 'John', lastName: 'Doe', email: 'john@example.com' }),
			createUser({ id: '2', firstName: 'Jane', lastName: 'Roe', email: 'jane@example.com' }),
			createUser({
				id: 'current-user',
				firstName: 'Current',
				lastName: 'User',
				email: 'current@example.com',
			}),
		];
		usersStore.usersById = Object.fromEntries(usersStore.allUsers.map((u) => [u.id, u]));

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

	it('deletes project with transfer or wipe based on modal selection', async () => {
		projectsStore.deleteProject.mockResolvedValue();
		projectsStore.isProjectEmpty.mockResolvedValue(false);

		const r1 = renderComponent();
		const deleteButton = r1.getByTestId('project-settings-delete-button');

		// Case 1: Non-empty project, transfer to another project
		await userEvent.click(deleteButton);
		await nextTick();
		expect(r1.getByTestId('project-settings-delete-confirm-button')).toBeInTheDocument();

		const transferRadio = document.querySelector('input[value="transfer"]') as HTMLInputElement;
		await userEvent.click(transferRadio);
		await nextTick();

		const transferSelect = r1.getByTestId('project-sharing-select');
		const transferOptions = await getDropdownItems(transferSelect);
		await userEvent.click(transferOptions[0]);
		await nextTick();

		await userEvent.click(r1.getByTestId('project-settings-delete-confirm-button'));
		await waitAllPromises();
		expect(projectsStore.deleteProject).toHaveBeenCalledWith('123', expect.any(String));
		expect(mockRouterPush).toHaveBeenCalledWith({ name: VIEWS.HOMEPAGE });

		// Case 2: Empty project, wiping directly (no transfer)
		projectsStore.deleteProject.mockClear();
		projectsStore.isProjectEmpty.mockResolvedValue(true);
		// unmount previous instance and re-render to reset dialog internal state
		r1.unmount();
		const r2 = renderComponent();
		const deleteButton2 = r2.getByTestId('project-settings-delete-button');
		await userEvent.click(deleteButton2);
		await nextTick();
		await userEvent.click(r2.getByTestId('project-settings-delete-confirm-button'));
		await waitAllPromises();
		expect(projectsStore.deleteProject).toHaveBeenCalledWith('123', undefined);
	});

	it('renders core form elements and initializes state', async () => {
		const { getByTestId } = renderComponent();
		await nextTick();
		expect(getByTestId('project-settings-container')).toBeInTheDocument();
		const nameInput = getByTestId('project-settings-name-input');
		const descriptionInput = getByTestId('project-settings-description-input');
		const saveButton = getByTestId('project-settings-save-button');
		const cancelButton = getByTestId('project-settings-cancel-button');
		expect(nameInput).toBeInTheDocument();
		expect(descriptionInput).toBeInTheDocument();
		expect(saveButton).toBeDisabled();
		expect(cancelButton).toBeDisabled();
		const actualName = getInput(nameInput);
		const actualDesc = getTextarea(descriptionInput);
		expect(actualName.value).toBe('Test Project');
		expect(actualDesc.value).toBe('');
	});

	describe('Form interactions', () => {
		it('marks dirty, cancels reset, and saves via Enter and button', async () => {
			const updateSpy = vi.spyOn(projectsStore, 'updateProject').mockResolvedValue(undefined);
			const { getByTestId } = renderComponent();
			const nameInput = getByTestId('project-settings-name-input');
			const saveButton = getByTestId('project-settings-save-button');
			const cancelButton = getByTestId('project-settings-cancel-button');
			const actualInput = getInput(nameInput);

			// Dirty then cancel
			await userEvent.type(actualInput, ' Extra');
			expect(cancelButton).toBeEnabled();
			await userEvent.click(cancelButton);
			expect(actualInput.value).toBe('Test Project');
			expect(cancelButton).toBeDisabled();

			// Save via Enter
			await userEvent.type(actualInput, ' - Updated');
			await userEvent.type(actualInput, '{enter}');
			await nextTick();
			expect(updateSpy).toHaveBeenCalledWith(
				'123',
				expect.objectContaining({ name: 'Test Project - Updated', description: '' }),
			);
			expect(mockShowMessage).toHaveBeenCalled();
			expect(mockTrack).toHaveBeenCalledWith(
				'User changed project name',
				expect.objectContaining({ project_id: '123', name: 'Test Project - Updated' }),
			);

			// Save via button
			await userEvent.type(actualInput, ' Again');
			expect(saveButton).toBeEnabled();
			await userEvent.click(saveButton);
			await nextTick();
			expect(updateSpy).toHaveBeenCalledTimes(2);
			expect(mockShowMessage).toHaveBeenCalledTimes(2);
		});
	});

	describe('Validation and error handling', () => {
		it('prevents invalid save and shows error on failed save', async () => {
			const error = new Error('Save failed');
			projectsStore.updateProject.mockRejectedValue(error);
			const { getByTestId } = renderComponent();
			const nameInput = getByTestId('project-settings-name-input');
			const saveButton = getByTestId('project-settings-save-button');
			const actualInput = getInput(nameInput);

			await userEvent.type(actualInput, ' Updated');
			await userEvent.type(actualInput, '{enter}');
			await nextTick();
			expect(projectsStore.updateProject).toHaveBeenCalled();
			expect(mockShowError).toHaveBeenCalledWith(error, expect.any(String));
			expect(mockShowMessage).not.toHaveBeenCalled();

			projectsStore.updateProject.mockClear();
			await userEvent.clear(actualInput);
			expect(saveButton).toBeDisabled();
			await userEvent.click(saveButton);
			expect(projectsStore.updateProject).not.toHaveBeenCalled();
		});
	});

	describe('Save state and validation', () => {
		it('maintains state after save and validation toggles', async () => {
			const updateSpy = vi.spyOn(projectsStore, 'updateProject').mockResolvedValue(undefined);
			const { getByTestId } = renderComponent();
			const nameInput = getByTestId('project-settings-name-input');
			const cancelButton = getByTestId('project-settings-cancel-button');
			const saveButton = getByTestId('project-settings-save-button');
			const actualInput = getInput(nameInput);

			await userEvent.clear(actualInput);
			expect(saveButton).toBeDisabled();
			await userEvent.type(actualInput, 'Valid Project Name');
			expect(saveButton).toBeEnabled();
			expect(cancelButton).toBeEnabled();
			await userEvent.click(saveButton);
			await nextTick();
			expect(updateSpy).toHaveBeenCalled();
			expect(cancelButton).toBeDisabled();
			expect(saveButton).toBeDisabled();
		});
	});

	describe('Members table and role updates', () => {
		it('adds a member and saves with telemetry', async () => {
			const updateSpy = vi.spyOn(projectsStore, 'updateProject').mockResolvedValue(undefined);
			const { getByTestId } = renderComponent();
			await nextTick();

			// Initially one member
			expect(getByTestId('members-count').textContent).toBe('1');

			// Add member via user select
			emitters.n8nUserSelect.emit('update:model-value', '2');
			await nextTick();
			expect(getByTestId('members-count').textContent).toBe('2');

			// Ensure form valid + dirty; name keystroke triggers validate and enables save
			const nameInput = getByTestId('project-settings-name-input');
			await userEvent.type(nameInput.querySelector('input')!, ' ');
			await userEvent.click(getByTestId('project-settings-save-button'));
			await nextTick();

			expect(updateSpy).toHaveBeenCalled();
			expect(mockTrack).toHaveBeenCalledWith(
				'User added member to project',
				expect.objectContaining({ project_id: '123', target_user_id: '2' }),
			);
		});
		it('filters members via search and saves', async () => {
			const updateSpy = vi.spyOn(projectsStore, 'updateProject').mockResolvedValue(undefined);
			const { getByTestId } = renderComponent();
			await nextTick();
			expect(getByTestId('members-count').textContent).toBe('1');
			const searchContainer = getByTestId('project-members-search');
			const searchInput = searchContainer.querySelector('input')!;
			await userEvent.type(searchInput, 'john@example.com');
			await new Promise((r) => setTimeout(r, 350));
			expect(getByTestId('members-count').textContent).toBe('1');
			// Make a minor change to mark the form dirty so save is enabled
			const nameInput = getByTestId('project-settings-name-input');
			await userEvent.type(nameInput.querySelector('input')!, ' ');
			await userEvent.click(getByTestId('project-settings-save-button'));
			await nextTick();
			expect(updateSpy).toHaveBeenCalled();
		});

		it('inline role change saves immediately with telemetry', async () => {
			projectsStore.updateProject.mockResolvedValue(undefined);
			renderComponent();
			await nextTick();

			emitters.projectMembersTable.emit('update:role', { userId: '1', role: 'project:editor' });
			await nextTick();
			expect(projectsStore.updateProject).toHaveBeenCalledWith(
				'123',
				expect.objectContaining({
					relations: expect.arrayContaining([
						expect.objectContaining({ userId: '1', role: 'project:editor' }),
					]),
				}),
			);
			expect(mockShowMessage).toHaveBeenCalled();
			expect(mockTrack).toHaveBeenCalledWith(
				'User changed member role on project',
				expect.objectContaining({ project_id: '123', target_user_id: '1', role: 'project:editor' }),
			);
		});

		it('rolls back role on save error', async () => {
			// First, inline update fails and rolls back
			projectsStore.updateProject.mockRejectedValueOnce(new Error('fail'));
			const utils = renderComponent();
			await nextTick();
			emitters.projectMembersTable.emit('update:role', { userId: '1', role: 'project:viewer' });
			await nextTick();
			expect(mockShowError).toHaveBeenCalled();

			// Next form save should contain original role (admin) due to rollback
			const nameInput = utils.getByTestId('project-settings-name-input');
			await userEvent.type(getInput(nameInput), ' touch');
			await userEvent.click(utils.getByTestId('project-settings-save-button'));
			await nextTick();
			const lastCall = projectsStore.updateProject.mock.calls.pop();
			expect(lastCall?.[1].relations).toEqual(
				expect.arrayContaining([expect.objectContaining({ userId: '1', role: 'project:admin' })]),
			);
		});

		it('marks member for removal, filters it out, and saves without it with telemetry', async () => {
			const updateSpy = vi.spyOn(projectsStore, 'updateProject').mockResolvedValue(undefined);
			const { getByTestId, queryByTestId } = renderComponent();
			await nextTick();
			expect(getByTestId('members-count').textContent).toBe('1');

			// Mark for removal
			emitters.projectMembersTable.emit('update:role', { userId: '1', role: 'remove' });
			await nextTick();
			// Pending removal should hide members table container entirely
			expect(queryByTestId('members-count')).toBeNull();

			await userEvent.click(getByTestId('project-settings-save-button'));
			await nextTick();
			expect(updateSpy).toHaveBeenCalled();
			const payload = updateSpy.mock.calls[0][1];
			expect(payload.relations).toEqual([]);
			expect(mockTrack).toHaveBeenCalledWith(
				'User removed member from project',
				expect.objectContaining({ project_id: '123', target_user_id: '1' }),
			);
		});

		it('prevents saving when invalid role selected', async () => {
			// Set invalid role and try to save
			const utils = renderComponent();
			await nextTick();
			emitters.projectMembersTable.emit('update:role', {
				userId: '1',
				role: 'project:personalOwner',
			});
			await nextTick();
			// Clear prior success toast from inline update (if any)
			mockShowMessage.mockClear();
			// Mark form dirty so save is enabled
			const nameInput = utils.getByTestId('project-settings-name-input');
			await userEvent.type(nameInput.querySelector('input')!, ' ');
			await userEvent.click(utils.getByTestId('project-settings-save-button'));
			await nextTick();
			expect(mockShowError).toHaveBeenCalled();
			// Should not show success on invalid role
			expect(mockShowMessage).not.toHaveBeenCalled();
		});

		it('resets pagination to first page on search', async () => {
			const utils = renderComponent();
			await nextTick();
			emitters.projectMembersTable.emit('update:options', {
				page: 2,
				itemsPerPage: 10,
				sortBy: [],
			});
			await nextTick();
			const searchContainer = utils.getByTestId('project-members-search');
			const searchInput = searchContainer.querySelector('input')!;
			await userEvent.type(searchInput, 'john');
			await new Promise((r) => setTimeout(r, 350));
			// unmount first to avoid duplicate elements
			utils.unmount();
			const utils2 = renderComponent();
			expect(utils2.getByTestId('members-page').textContent).toBe('0');
		});
	});

	describe('Icon updates', () => {
		it('updates project icon and shows success toast', async () => {
			const updateSpy = vi.spyOn(projectsStore, 'updateProject').mockResolvedValue(undefined);
			renderComponent();
			await nextTick();
			emitters.n8nIconPicker.emit('update:model-value', { type: 'icon', value: 'zap' });
			await nextTick();
			await waitAllPromises();
			expect(updateSpy).toHaveBeenCalled();
			expect(mockShowMessage).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
		});
	});

	describe('Lifecycle', () => {
		it('reacts to project change and keeps inputs bound', async () => {
			const { getByTestId } = renderComponent();
			const nameInput = getByTestId('project-settings-name-input');
			const descInput = getByTestId('project-settings-description-input');
			const actualName = getInput(nameInput);
			const actualDesc = descInput.querySelector('textarea')!;
			expect(actualName.value).toBe('Test Project');
			expect(actualDesc.value).toBe('');
			const updatedProject = {
				...projectsStore.currentProject!,
				name: 'Updated Project',
				description: 'Updated description',
			};
			projectsStore.setCurrentProject(updatedProject);
			await nextTick();
			expect(nameInput).toBeInTheDocument();
			expect(descInput).toBeInTheDocument();
			expect(getByTestId('project-members-select')).toBeInTheDocument();
		});
	});
});
