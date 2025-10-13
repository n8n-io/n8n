import userEvent from '@testing-library/user-event';
import { createTestingPinia } from '@pinia/testing';
import { waitFor, screen, within } from '@testing-library/vue';
import { faker } from '@faker-js/faker';
import { createComponentRenderer } from '@/__tests__/render';
import {
	createProjectListItem,
	createProjectSharingData,
} from '@/features/projects/__tests__/utils';
import {
	getDropdownItems,
	getSelectedDropdownValue,
	mockedStore,
	type MockedStore,
} from '@/__tests__/utils';
import { useUIStore } from '@/stores/ui.store';
import { MOVE_FOLDER_MODAL_KEY } from '../folders.constants';
import { useSettingsStore } from '@/stores/settings.store';
import type { FrontendSettings } from '@n8n/api-types';
import type { Project } from '@/features/projects/projects.types';
import type { ICredentialsResponse, IUsedCredential } from '@/Interface';
import type { ChangeLocationSearchResult } from '../folders.types';
import { useCredentialsStore } from '@/stores/credentials.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useFoldersStore } from '../folders.store';
import { useProjectsStore } from '@/features/projects/projects.store';
import MoveToFolderModal from './MoveToFolderModal.vue';
import type { EventBus } from '@n8n/utils/dist/event-bus';

vi.mock('vue-router', () => {
	const push = vi.fn();
	const resolve = vi.fn().mockReturnValue({ href: '/projects/1/folders/1' });
	return {
		useRouter: vi.fn().mockReturnValue({
			push,
			resolve,
		}),
		useRoute: vi.fn().mockReturnValue({
			params: {
				projectId: '1',

				folderId: '1',
			},
			query: {},
		}),
		RouterLink: vi.fn(),
	};
});

const renderComponent = createComponentRenderer(MoveToFolderModal, {
	props: {
		modalName: MOVE_FOLDER_MODAL_KEY,
	},
});

const TEST_FOLDER_RESOURCE = {
	id: 'test-folder-id',
	name: 'Test Folder',
	parentFolderId: 'test-parent-folder-id',
};

const TEST_WORKFLOW_RESOURCE = {
	id: 'test-workflow-id',
	name: 'Test Workflow',
	parentFolderId: 'test-parent-folder-id',
};

let uiStore: MockedStore<typeof useUIStore>;
let settingsStore: MockedStore<typeof useSettingsStore>;
let credentialsStore: MockedStore<typeof useCredentialsStore>;
let workflowsStore: MockedStore<typeof useWorkflowsStore>;
let foldersStore: MockedStore<typeof useFoldersStore>;
let projectsStore: MockedStore<typeof useProjectsStore>;

const personalProject = createProjectListItem('personal');
const anotherUser = createProjectListItem('personal');
const teamProjects = Array.from({ length: 3 }, () => createProjectListItem('team'));
const projects = [personalProject, ...teamProjects, anotherUser];
const homeProject = createProjectSharingData();

const enableSharing = {
	enterprise: {
		sharing: true,
	},
} as FrontendSettings;

const createCredential = (overrides = {}): ICredentialsResponse => ({
	id: faker.string.alphanumeric(10),
	createdAt: faker.date.recent().toISOString(),
	updatedAt: faker.date.recent().toISOString(),
	type: 'generic',
	name: faker.lorem.words(2),
	sharedWithProjects: [],
	isManaged: false,
	homeProject,
	...overrides,
});

const readableCredential = createCredential({
	scopes: ['credential:read'],
});
const readableUsedCredential: IUsedCredential = {
	id: readableCredential.id,
	name: readableCredential.name,
	credentialType: readableCredential.type,
	currentUserHasAccess: true,
	homeProject,
	sharedWithProjects: [],
};

const shareableCredential = createCredential({
	scopes: ['credential:share', 'credential:read'],
});
const shareableUsedCredential: IUsedCredential = {
	id: shareableCredential.id,
	name: shareableCredential.name,
	credentialType: shareableCredential.type,
	currentUserHasAccess: true,
	homeProject,
	sharedWithProjects: [],
};

const folder: ChangeLocationSearchResult = {
	createdAt: faker.date.recent().toISOString(),
	updatedAt: faker.date.recent().toISOString(),
	id: faker.string.alphanumeric(10),
	name: 'test',
	homeProject,
	tags: [],
	workflowCount: 0,
	subFolderCount: 0,
	path: ['test'],
	resource: 'folder',
};

const mockEventBus = {
	emit: vi.fn(),
} as unknown as EventBus;

describe('MoveToFolderModal', () => {
	beforeEach(() => {
		createTestingPinia();
		uiStore = mockedStore(useUIStore);
		uiStore.modalsById = {
			[MOVE_FOLDER_MODAL_KEY]: {
				open: true,
			},
		};

		settingsStore = mockedStore(useSettingsStore);
		settingsStore.settings = {
			enterprise: {},
		} as FrontendSettings;

		credentialsStore = mockedStore(useCredentialsStore);
		credentialsStore.fetchAllCredentials = vi.fn().mockResolvedValue([]);

		workflowsStore = mockedStore(useWorkflowsStore);
		workflowsStore.fetchWorkflow = vi.fn().mockResolvedValue({
			id: TEST_WORKFLOW_RESOURCE.id,
			name: TEST_WORKFLOW_RESOURCE.name,
			parentFolderId: TEST_WORKFLOW_RESOURCE.parentFolderId,
			usedCredentials: [],
		});

		foldersStore = mockedStore(useFoldersStore);
		foldersStore.fetchFolderUsedCredentials = vi.fn().mockResolvedValue([]);
		foldersStore.fetchFoldersAvailableForMove = vi.fn().mockResolvedValue([]);
		foldersStore.fetchFolderContent = vi.fn().mockResolvedValue({
			totalWorkflows: 0,
			totalSubFolders: 0,
		});

		projectsStore = mockedStore(useProjectsStore);

		projectsStore.currentProject = personalProject as unknown as Project;
		projectsStore.currentProjectId = personalProject.id;
		projectsStore.personalProject = personalProject as unknown as Project;
		projectsStore.projects = projects;
		projectsStore.availableProjects = projects;
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should render for folder resource with no workflows or subfolders', async () => {
		const { getByTestId, queryByTestId } = renderComponent({
			props: {
				data: {
					resource: TEST_FOLDER_RESOURCE,
					resourceType: 'folder',
					workflowListEventBus: mockEventBus,
				},
			},
		});

		await waitFor(() => expect(getByTestId('moveFolder-modal')).toBeInTheDocument());
		expect(screen.getByText(`Move folder ${TEST_FOLDER_RESOURCE.name}`)).toBeInTheDocument();
		expect(queryByTestId('move-modal-description')).not.toBeInTheDocument();
		expect(getByTestId('move-to-folder-dropdown')).toBeInTheDocument();
	});

	it('should render for folder resource with workflows and subfolders', async () => {
		foldersStore.fetchFolderContent = vi.fn().mockResolvedValue({
			totalWorkflows: 1,
			totalSubFolders: 1,
		});

		const { getByTestId } = renderComponent({
			props: {
				data: {
					resource: TEST_FOLDER_RESOURCE,
					resourceType: 'folder',
					workflowListEventBus: mockEventBus,
				},
			},
		});

		await waitFor(() => expect(getByTestId('moveFolder-modal')).toBeInTheDocument());
		expect(screen.getByText(`Move folder ${TEST_FOLDER_RESOURCE.name}`)).toBeInTheDocument();
		expect(screen.getByTestId('move-modal-description')).toBeInTheDocument();
	});

	it('should not see the project sharing select without sharing license', async () => {
		const { getByTestId, queryByTestId } = renderComponent({
			props: {
				data: {
					resource: TEST_FOLDER_RESOURCE,
					resourceType: 'folder',
					workflowListEventBus: mockEventBus,
				},
			},
		});

		await waitFor(() => expect(getByTestId('moveFolder-modal')).toBeInTheDocument());

		expect(queryByTestId('project-sharing-select')).not.toBeInTheDocument();
	});

	it('should see the project sharing select with sharing license', async () => {
		settingsStore.settings = enableSharing;

		const { getByTestId } = renderComponent({
			props: {
				data: {
					resource: TEST_FOLDER_RESOURCE,
					resourceType: 'folder',
					workflowListEventBus: mockEventBus,
				},
			},
		});

		await waitFor(() => expect(getByTestId('moveFolder-modal')).toBeInTheDocument());
		expect(getByTestId('project-sharing-select')).toBeInTheDocument();
	});

	it('should select a project with the picker', async () => {
		settingsStore.settings = enableSharing;

		const { getByTestId, queryByTestId } = renderComponent({
			props: {
				data: {
					resource: TEST_FOLDER_RESOURCE,
					resourceType: 'folder',
					workflowListEventBus: mockEventBus,
				},
			},
		});

		await waitFor(() => expect(getByTestId('moveFolder-modal')).toBeInTheDocument());

		const projectSelect = getByTestId('project-sharing-select');
		expect(projectSelect).toBeVisible();

		await userEvent.click(getByTestId('project-sharing-select'));

		const projectSelectDropdownItems = await getDropdownItems(projectSelect);
		expect(projectSelectDropdownItems).toHaveLength(5);
		let selectedValue = await getSelectedDropdownValue(projectSelectDropdownItems);
		expect(selectedValue).toBe(personalProject.name);

		await userEvent.click(projectSelectDropdownItems[0]);
		expect(queryByTestId('project-sharing-list-item')).not.toBeInTheDocument();

		selectedValue = await getSelectedDropdownValue(projectSelectDropdownItems);
		const selectedProject = projects.find((p) => p.name === selectedValue);
		expect(selectedProject).toBeDefined();
	});

	it('should not render credentials sharing checkbox for folder without shareable resources', async () => {
		settingsStore.settings = enableSharing;
		credentialsStore.fetchAllCredentials = vi
			.fn()
			.mockResolvedValue([readableCredential, shareableCredential]);
		foldersStore.fetchFolderUsedCredentials = vi.fn().mockResolvedValue([readableUsedCredential]);

		const { getByTestId, queryByTestId } = renderComponent({
			props: {
				data: {
					resource: TEST_FOLDER_RESOURCE,
					resourceType: 'folder',
					workflowListEventBus: mockEventBus,
				},
			},
		});

		await waitFor(() => expect(getByTestId('moveFolder-modal')).toBeInTheDocument());

		// Select another project to share from Personal -> Team 1
		const projectSelect = getByTestId('project-sharing-select');
		await userEvent.click(getByTestId('project-sharing-select'));
		const projectSelectDropdownItems = await getDropdownItems(projectSelect);
		const teamProject = [...projectSelectDropdownItems].find(
			(item) => item.querySelector('p')?.textContent?.trim() === teamProjects[0].name,
		);
		expect(teamProject).toBeDefined();

		await userEvent.click(teamProject as Element);
		expect(queryByTestId('move-modal-share-credentials-checkbox')).not.toBeInTheDocument();
	});

	it('should render credentials sharing checkbox for folder with shareable resources', async () => {
		settingsStore.settings = enableSharing;
		credentialsStore.fetchAllCredentials = vi.fn().mockResolvedValue([shareableCredential]);
		foldersStore.fetchFolderUsedCredentials = vi.fn().mockResolvedValue([shareableUsedCredential]);

		const { getByTestId } = renderComponent({
			props: {
				data: {
					resource: TEST_FOLDER_RESOURCE,
					resourceType: 'folder',
					workflowListEventBus: mockEventBus,
				},
			},
		});

		await waitFor(() => expect(getByTestId('moveFolder-modal')).toBeInTheDocument());

		// Select another project to share from Personal -> Team 1
		const projectSelect = getByTestId('project-sharing-select');
		await userEvent.click(getByTestId('project-sharing-select'));
		const projectSelectDropdownItems = await getDropdownItems(projectSelect);
		const teamProject = [...projectSelectDropdownItems].find(
			(item) => item.querySelector('p')?.textContent?.trim() === teamProjects[0].name,
		);
		expect(teamProject).toBeDefined();

		await userEvent.click(teamProject as Element);

		await waitFor(() =>
			expect(getByTestId('move-modal-share-credentials-checkbox')).toBeInTheDocument(),
		);

		expect(getByTestId('move-modal-share-credentials-checkbox')).not.toBeChecked();
		expect(getByTestId('move-modal-used-credentials-warning')).toBeInTheDocument();
	});

	it('should select a folder with the picker', async () => {
		foldersStore.fetchFoldersAvailableForMove = vi.fn().mockResolvedValue([folder]);

		const { getByTestId } = renderComponent({
			props: {
				data: {
					resource: TEST_FOLDER_RESOURCE,
					resourceType: 'folder',
					workflowListEventBus: mockEventBus,
				},
			},
		});

		await waitFor(() => expect(getByTestId('moveFolder-modal')).toBeInTheDocument());

		const folderSelect = getByTestId('move-to-folder-dropdown');
		expect(folderSelect).toBeVisible();
		expect(within(folderSelect).getByRole('combobox')).toHaveValue('');

		const folderSelectDropdownItems = await getDropdownItems(folderSelect);
		expect(folderSelectDropdownItems).toHaveLength(2); // root, test

		await userEvent.click(folderSelectDropdownItems[1]);
		expect(within(folderSelect).getByRole('combobox')).toHaveValue('test');
	});

	it('should clear selected folder when switching projects', async () => {
		settingsStore.settings = enableSharing;
		foldersStore.fetchFoldersAvailableForMove = vi.fn().mockResolvedValue([folder]);

		const { getByTestId } = renderComponent({
			props: {
				data: {
					resource: TEST_FOLDER_RESOURCE,
					resourceType: 'folder',
					workflowListEventBus: mockEventBus,
				},
			},
		});

		await waitFor(() => expect(getByTestId('moveFolder-modal')).toBeInTheDocument());

		const folderSelect = getByTestId('move-to-folder-dropdown');
		const folderSelectDropdownItems = await getDropdownItems(folderSelect);
		await userEvent.click(folderSelectDropdownItems[1]);

		expect(within(folderSelect).getByRole('combobox')).toHaveValue('test');

		const projectSelect = getByTestId('project-sharing-select');
		await userEvent.click(getByTestId('project-sharing-select'));
		const teamProject = [...(await getDropdownItems(projectSelect))].find(
			(item) => item.querySelector('p')?.textContent?.trim() === teamProjects[0].name,
		);
		await userEvent.click(teamProject as Element);

		expect(within(folderSelect).getByRole('combobox')).toHaveValue('');
	});

	it('should move selected folder on submit', async () => {
		foldersStore.fetchFoldersAvailableForMove = vi.fn().mockResolvedValue([folder]);

		const { getByTestId } = renderComponent({
			props: {
				data: {
					resource: TEST_FOLDER_RESOURCE,
					resourceType: 'folder',
					workflowListEventBus: mockEventBus,
				},
			},
		});

		await waitFor(() => expect(getByTestId('moveFolder-modal')).toBeInTheDocument());

		const submitButton = getByTestId('confirm-move-folder-button');
		expect(submitButton).toBeDisabled();

		const folderSelect = getByTestId('move-to-folder-dropdown');
		const folderSelectDropdownItems = await getDropdownItems(folderSelect);
		await userEvent.click(folderSelectDropdownItems[1]);

		expect(submitButton).toBeEnabled();
		await userEvent.click(submitButton);

		expect(mockEventBus.emit).toHaveBeenCalledWith('folder-moved', {
			newParent: {
				id: folder.id,
				name: folder.name,
				type: folder.resource,
			},
			folder: { id: TEST_FOLDER_RESOURCE.id, name: TEST_FOLDER_RESOURCE.name },
		});
	});

	it('should transfer selected folder on submit', async () => {
		foldersStore.fetchFoldersAvailableForMove = vi.fn().mockResolvedValue([folder]);
		settingsStore.settings = enableSharing;

		const { getByTestId } = renderComponent({
			props: {
				data: {
					resource: TEST_FOLDER_RESOURCE,
					resourceType: 'folder',
					workflowListEventBus: mockEventBus,
				},
			},
		});

		await waitFor(() => expect(getByTestId('moveFolder-modal')).toBeInTheDocument());

		const projectSelect = getByTestId('project-sharing-select');
		await userEvent.click(getByTestId('project-sharing-select'));
		const projectSelectDropdownItems = await getDropdownItems(projectSelect);
		const teamProject = [...projectSelectDropdownItems].find(
			(item) => item.querySelector('p')?.textContent?.trim() === teamProjects[0].name,
		);
		await userEvent.click(teamProject as Element);

		const submitButton = getByTestId('confirm-move-folder-button');
		expect(submitButton).toBeDisabled();

		const folderSelect = getByTestId('move-to-folder-dropdown');
		const folderSelectDropdownItems = await getDropdownItems(folderSelect);
		await userEvent.click(folderSelectDropdownItems[1]);

		expect(submitButton).toBeEnabled();
		await userEvent.click(submitButton);

		expect(mockEventBus.emit).toHaveBeenCalledWith('folder-transferred', {
			source: {
				projectId: personalProject.id,
				folder: {
					id: TEST_FOLDER_RESOURCE.id,
					name: TEST_FOLDER_RESOURCE.name,
				},
			},
			destination: {
				projectId: teamProjects[0].id,
				parentFolder: {
					id: folder.id,
					name: folder.name,
				},
				canAccess: true,
			},
			shareCredentials: undefined,
		});
	});

	it('should transfer selected folder and used credentials on submit', async () => {
		settingsStore.settings = enableSharing;
		foldersStore.fetchFoldersAvailableForMove = vi.fn().mockResolvedValue([folder]);
		credentialsStore.fetchAllCredentials = vi.fn().mockResolvedValue([shareableCredential]);
		foldersStore.fetchFolderUsedCredentials = vi.fn().mockResolvedValue([shareableUsedCredential]);

		const { getByTestId } = renderComponent({
			props: {
				data: {
					resource: TEST_FOLDER_RESOURCE,
					resourceType: 'folder',
					workflowListEventBus: mockEventBus,
				},
			},
		});

		await waitFor(() => expect(getByTestId('moveFolder-modal')).toBeInTheDocument());

		const projectSelect = getByTestId('project-sharing-select');
		await userEvent.click(getByTestId('project-sharing-select'));
		const projectSelectDropdownItems = await getDropdownItems(projectSelect);
		const teamProject = [...projectSelectDropdownItems].find(
			(item) => item.querySelector('p')?.textContent?.trim() === teamProjects[0].name,
		);
		expect(teamProject).toBeDefined();

		await userEvent.click(teamProject as Element);

		const submitButton = getByTestId('confirm-move-folder-button');
		const folderSelect = getByTestId('move-to-folder-dropdown');
		const folderSelectDropdownItems = await getDropdownItems(folderSelect);

		await userEvent.click(folderSelectDropdownItems[1]);
		await userEvent.click(getByTestId('move-modal-share-credentials-checkbox'));
		await userEvent.click(submitButton);

		expect(mockEventBus.emit).toHaveBeenCalledWith('folder-transferred', {
			source: {
				projectId: personalProject.id,
				folder: {
					id: TEST_FOLDER_RESOURCE.id,
					name: TEST_FOLDER_RESOURCE.name,
				},
			},
			destination: {
				projectId: teamProjects[0].id,
				parentFolder: {
					id: folder.id,
					name: folder.name,
				},
				canAccess: true,
			},
			shareCredentials: [shareableUsedCredential.id],
		});
	});

	it('should transfer selected folder and not pass used credentials if unchecked on submit', async () => {
		settingsStore.settings = enableSharing;
		foldersStore.fetchFoldersAvailableForMove = vi.fn().mockResolvedValue([folder]);
		credentialsStore.fetchAllCredentials = vi.fn().mockResolvedValue([shareableCredential]);
		foldersStore.fetchFolderUsedCredentials = vi.fn().mockResolvedValue([shareableUsedCredential]);

		const { getByTestId } = renderComponent({
			props: {
				data: {
					resource: TEST_FOLDER_RESOURCE,
					resourceType: 'folder',
					workflowListEventBus: mockEventBus,
				},
			},
		});

		await waitFor(() => expect(getByTestId('moveFolder-modal')).toBeInTheDocument());

		const projectSelect = getByTestId('project-sharing-select');
		await userEvent.click(getByTestId('project-sharing-select'));
		const projectSelectDropdownItems = await getDropdownItems(projectSelect);
		const teamProject = [...projectSelectDropdownItems].find(
			(item) => item.querySelector('p')?.textContent?.trim() === teamProjects[0].name,
		);
		expect(teamProject).toBeDefined();

		await userEvent.click(teamProject as Element);

		const submitButton = getByTestId('confirm-move-folder-button');
		const folderSelect = getByTestId('move-to-folder-dropdown');
		const folderSelectDropdownItems = await getDropdownItems(folderSelect);

		await userEvent.click(folderSelectDropdownItems[1]);
		await userEvent.click(submitButton);

		expect(mockEventBus.emit).toHaveBeenCalledWith('folder-transferred', {
			source: {
				projectId: personalProject.id,
				folder: {
					id: TEST_FOLDER_RESOURCE.id,
					name: TEST_FOLDER_RESOURCE.name,
				},
			},
			destination: {
				projectId: teamProjects[0].id,
				parentFolder: {
					id: folder.id,
					name: folder.name,
				},
				canAccess: true,
			},
			shareCredentials: undefined,
		});
	});

	it('should transfer selected folder to personal project on submit', async () => {
		settingsStore.settings = enableSharing;

		const { getByTestId } = renderComponent({
			props: {
				data: {
					resource: TEST_FOLDER_RESOURCE,
					resourceType: 'folder',
					workflowListEventBus: mockEventBus,
				},
			},
		});

		await waitFor(() => expect(getByTestId('moveFolder-modal')).toBeInTheDocument());

		const projectSelect = getByTestId('project-sharing-select');
		await userEvent.click(getByTestId('project-sharing-select'));
		const projectSelectDropdownItems = await getDropdownItems(projectSelect);
		const anotherUserPersonalProject = [...projectSelectDropdownItems].find(
			(item) => item.querySelector('p')?.textContent?.trim() === anotherUser.name,
		);
		expect(anotherUserPersonalProject).toBeDefined();

		await userEvent.click(anotherUserPersonalProject as Element);

		const submitButton = getByTestId('confirm-move-folder-button');
		expect(submitButton).toBeEnabled();

		expect(submitButton).toBeEnabled();
		await userEvent.click(submitButton);

		expect(mockEventBus.emit).toHaveBeenCalledWith('folder-transferred', {
			source: {
				projectId: personalProject.id,
				folder: {
					id: TEST_FOLDER_RESOURCE.id,
					name: TEST_FOLDER_RESOURCE.name,
				},
			},
			destination: {
				projectId: anotherUser.id,
				parentFolder: {
					id: undefined,
					name: anotherUser.name,
				},
				canAccess: false,
			},
			shareCredentials: undefined,
		});
	});

	it('should render for workflow resource', async () => {
		const { getByTestId } = renderComponent({
			props: {
				data: {
					resource: TEST_WORKFLOW_RESOURCE,
					resourceType: 'workflow',
					workflowListEventBus: mockEventBus,
				},
			},
		});
		await waitFor(() => expect(getByTestId('moveFolder-modal')).toBeInTheDocument());
		expect(screen.getByText(`Move workflow ${TEST_WORKFLOW_RESOURCE.name}`)).toBeInTheDocument();
		expect(workflowsStore.fetchWorkflow).toHaveBeenCalledWith(TEST_WORKFLOW_RESOURCE.id);
	});

	it('should move selected workflow on submit', async () => {
		foldersStore.fetchFoldersAvailableForMove = vi.fn().mockResolvedValue([folder]);

		const { getByTestId } = renderComponent({
			props: {
				data: {
					resource: TEST_WORKFLOW_RESOURCE,
					resourceType: 'workflow',
					workflowListEventBus: mockEventBus,
				},
			},
		});

		await waitFor(() => expect(getByTestId('moveFolder-modal')).toBeInTheDocument());

		const submitButton = getByTestId('confirm-move-folder-button');
		expect(submitButton).toBeDisabled();

		const folderSelect = getByTestId('move-to-folder-dropdown');
		const folderSelectDropdownItems = await getDropdownItems(folderSelect);
		await userEvent.click(folderSelectDropdownItems[1]);

		expect(submitButton).toBeEnabled();
		await userEvent.click(submitButton);

		expect(mockEventBus.emit).toHaveBeenCalledWith('workflow-moved', {
			newParent: {
				id: folder.id,
				name: folder.name,
				type: folder.resource,
			},
			workflow: {
				id: TEST_WORKFLOW_RESOURCE.id,
				name: TEST_WORKFLOW_RESOURCE.name,
				oldParentId: TEST_WORKFLOW_RESOURCE.parentFolderId,
			},
		});
	});

	it('should transfer selected workflow on submit', async () => {
		foldersStore.fetchFoldersAvailableForMove = vi.fn().mockResolvedValue([folder]);
		settingsStore.settings = enableSharing;

		const { getByTestId } = renderComponent({
			props: {
				data: {
					resource: TEST_WORKFLOW_RESOURCE,
					resourceType: 'workflow',
					workflowListEventBus: mockEventBus,
				},
			},
		});

		await waitFor(() => expect(getByTestId('moveFolder-modal')).toBeInTheDocument());

		const projectSelect = getByTestId('project-sharing-select');
		await userEvent.click(getByTestId('project-sharing-select'));
		const projectSelectDropdownItems = await getDropdownItems(projectSelect);
		const teamProject = [...projectSelectDropdownItems].find(
			(item) => item.querySelector('p')?.textContent?.trim() === teamProjects[0].name,
		);
		expect(teamProject).toBeDefined();

		await userEvent.click(teamProject as Element);

		const submitButton = getByTestId('confirm-move-folder-button');
		expect(submitButton).toBeDisabled();

		const folderSelect = getByTestId('move-to-folder-dropdown');
		const folderSelectDropdownItems = await getDropdownItems(folderSelect);
		await userEvent.click(folderSelectDropdownItems[1]);

		expect(submitButton).toBeEnabled();
		await userEvent.click(submitButton);

		expect(mockEventBus.emit).toHaveBeenCalledWith('workflow-transferred', {
			source: {
				projectId: personalProject.id,
				workflow: {
					id: TEST_WORKFLOW_RESOURCE.id,
					name: TEST_WORKFLOW_RESOURCE.name,
				},
			},
			destination: {
				projectId: teamProjects[0].id,
				parentFolder: {
					id: folder.id,
					name: folder.name,
				},
				canAccess: true,
			},
			shareCredentials: undefined,
		});
	});

	it('should transfer selected workflow to personal project on submit', async () => {
		settingsStore.settings = enableSharing;

		const { getByTestId } = renderComponent({
			props: {
				data: {
					resource: TEST_WORKFLOW_RESOURCE,
					resourceType: 'workflow',
					workflowListEventBus: mockEventBus,
				},
			},
		});

		await waitFor(() => expect(getByTestId('moveFolder-modal')).toBeInTheDocument());

		const projectSelect = getByTestId('project-sharing-select');
		await userEvent.click(getByTestId('project-sharing-select'));
		const projectSelectDropdownItems = await getDropdownItems(projectSelect);
		const anotherUserPersonalProject = [...projectSelectDropdownItems].find(
			(item) => item.querySelector('p')?.textContent?.trim() === anotherUser.name,
		);
		expect(anotherUserPersonalProject).toBeDefined();

		await userEvent.click(anotherUserPersonalProject as Element);

		const submitButton = getByTestId('confirm-move-folder-button');
		expect(submitButton).toBeEnabled();

		expect(submitButton).toBeEnabled();
		await userEvent.click(submitButton);

		expect(mockEventBus.emit).toHaveBeenCalledWith('workflow-transferred', {
			source: {
				projectId: personalProject.id,
				workflow: {
					id: TEST_WORKFLOW_RESOURCE.id,
					name: TEST_WORKFLOW_RESOURCE.name,
				},
			},
			destination: {
				projectId: anotherUser.id,
				parentFolder: {
					id: undefined,
					name: anotherUser.name,
				},
				canAccess: false,
			},
			shareCredentials: undefined,
		});
	});
});
