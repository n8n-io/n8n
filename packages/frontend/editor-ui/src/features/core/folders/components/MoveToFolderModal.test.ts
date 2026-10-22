import { shallowRef, toValue, type MaybeRefOrGetter } from 'vue';
import userEvent from '@testing-library/user-event';
import { createTestingPinia } from '@pinia/testing';
import { waitFor, screen, within } from '@testing-library/vue';
import { faker } from '@faker-js/faker';
import { createComponentRenderer } from '@/__tests__/render';
import {
	createProjectListItem,
	createProjectSharingData,
} from '@/features/collaboration/projects/__tests__/utils';
import {
	getDropdownItems,
	getSelectedDropdownValue,
	mockedStore,
	type MockedStore,
} from '@/__tests__/utils';
import { useUIStore } from '@/app/stores/ui.store';
import { MOVE_FOLDER_MODAL_KEY } from '../folders.constants';
import { useSettingsStore } from '@n8n/stores/settings.store';
import type { FolderTransferResult, FrontendSettings } from '@n8n/api-types';
import type {
	TransferPreview,
	TransferPreviewTarget,
} from '@n8n/frontend-module-type-availability-policies';
import type { Project } from '@/features/collaboration/projects/projects.types';
import type {
	ICredentialsResponse,
	IUsedCredential,
} from '@/features/credentials/credentials.types';
import type { ChangeLocationSearchResult } from '../folders.types';
import { getTruncatedProjectName } from '@/features/collaboration/projects/projects.utils';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useFoldersStore } from '../folders.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import MoveToFolderModal from './MoveToFolderModal.vue';
import type { EventBus } from '@n8n/utils/event-bus';
import type { WorkflowListEventMap } from '../folders.types';
import * as workflowDependenciesApi from '@/app/api/workflow-dependencies';

vi.mock('@/app/api/workflow-dependencies');

const transferPreviewMock = vi.hoisted(() => ({
	preview: undefined as { value: unknown } | undefined,
	target: undefined as MaybeRefOrGetter<unknown>,
	destination: undefined as MaybeRefOrGetter<unknown>,
}));

vi.mock('@n8n/frontend-module-type-availability-policies', async (importOriginal) => {
	const actual =
		await importOriginal<typeof import('@n8n/frontend-module-type-availability-policies')>();
	return {
		...actual,
		useTransferPreview: (
			target: MaybeRefOrGetter<unknown>,
			destination: MaybeRefOrGetter<unknown>,
		) => {
			transferPreviewMock.target = target;
			transferPreviewMock.destination = destination;
			return { preview: transferPreviewMock.preview };
		},
	};
});

const toastMock = vi.hoisted(() => ({ showForWorkflow: vi.fn(), showForFolder: vi.fn() }));

vi.mock('@/app/composables/useUnpublishedByMoveToast', () => ({
	useUnpublishedByMoveToast: () => toastMock,
}));

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
let workflowsListStore: MockedStore<typeof useWorkflowsListStore>;
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
		projects: { team: { limit: -1 } },
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
	currentUserCanUse: true,
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
	currentUserCanUse: true,
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
} as unknown as EventBus<WorkflowListEventMap>;

describe('MoveToFolderModal', () => {
	beforeEach(() => {
		transferPreviewMock.preview = shallowRef<TransferPreview | null>(null);
		createTestingPinia();
		uiStore = mockedStore(useUIStore);
		uiStore.modalStateById = {
			[MOVE_FOLDER_MODAL_KEY]: {
				open: true,
			},
		};

		settingsStore = mockedStore(useSettingsStore);
		settingsStore.settings = {
			enterprise: {
				projects: { team: { limit: -1 } },
			},
		} as FrontendSettings;

		credentialsStore = mockedStore(useCredentialsStore);
		credentialsStore.fetchAllCredentials = vi.fn().mockResolvedValue([]);

		workflowsListStore = mockedStore(useWorkflowsListStore);
		workflowsListStore.fetchWorkflow = vi.fn().mockResolvedValue({
			id: TEST_WORKFLOW_RESOURCE.id,
			name: TEST_WORKFLOW_RESOURCE.name,
			parentFolderId: TEST_WORKFLOW_RESOURCE.parentFolderId,
			usedCredentials: [],
		});

		vi.mocked(workflowDependenciesApi.getResourceDependencies).mockResolvedValue({});
		vi.mocked(workflowDependenciesApi.getFolderDependencies).mockResolvedValue([]);

		foldersStore = mockedStore(useFoldersStore);
		foldersStore.fetchFolderUsedCredentials = vi.fn().mockResolvedValue([]);
		foldersStore.fetchFoldersAvailableForMove = vi.fn().mockResolvedValue([]);
		foldersStore.fetchFolderContent = vi.fn().mockResolvedValue({
			totalWorkflows: 0,
			totalSubFolders: 0,
		});
		foldersStore.moveFolder = vi.fn().mockResolvedValue(undefined);
		foldersStore.moveFolderToProject = vi.fn().mockResolvedValue(undefined);

		workflowsStore = mockedStore(useWorkflowsStore);
		workflowsStore.updateWorkflow = vi.fn().mockResolvedValue({});

		projectsStore = mockedStore(useProjectsStore);
		projectsStore.moveResourceToProject = vi.fn().mockResolvedValue(undefined);
		projectsStore.searchProjects.mockResolvedValue({ count: projects.length, data: projects });
		projectsStore.globalProjectPermissions = { list: true };

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
		// Project root is auto-selected by the dropdown after loading
		await waitFor(() =>
			expect(within(folderSelect).getByRole('combobox')).toHaveValue('No folder (project root)'),
		);

		const folderSelectDropdownItems = await getDropdownItems(folderSelect);
		expect(folderSelectDropdownItems).toHaveLength(2); // root, test

		await userEvent.click(folderSelectDropdownItems[1]);
		expect(within(folderSelect).getByRole('combobox')).toHaveValue('test');
	});

	it('should reset to project root when switching projects', async () => {
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

		// After switching projects, the project root should be selected
		expect(within(folderSelect).getByRole('combobox')).toHaveValue('No folder (project root)');
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
		// Wait for dropdown to load and auto-select project root
		await waitFor(() => expect(submitButton).toBeEnabled());

		const folderSelect = getByTestId('move-to-folder-dropdown');
		const folderSelectDropdownItems = await getDropdownItems(folderSelect);
		await userEvent.click(folderSelectDropdownItems[1]);

		expect(submitButton).toBeEnabled();
		await userEvent.click(submitButton);

		expect(foldersStore.moveFolder).toHaveBeenCalledWith(
			personalProject.id,
			TEST_FOLDER_RESOURCE.id,
			folder.id,
		);
		expect(mockEventBus.emit).toHaveBeenCalledWith('folder-moved', {
			newParent: {
				id: folder.id,
				name: folder.name,
				type: folder.resource,
			},
			folder: { id: TEST_FOLDER_RESOURCE.id, name: TEST_FOLDER_RESOURCE.name },
			options: { skipApiCall: true },
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
		await waitFor(() => expect(submitButton).toBeEnabled());

		const folderSelect = getByTestId('move-to-folder-dropdown');
		const folderSelectDropdownItems = await getDropdownItems(folderSelect);
		await userEvent.click(folderSelectDropdownItems[1]);

		expect(submitButton).toBeEnabled();
		await userEvent.click(submitButton);

		await waitFor(() => {
			expect(foldersStore.moveFolderToProject).toHaveBeenCalledWith(
				personalProject.id,
				TEST_FOLDER_RESOURCE.id,
				teamProjects[0].id,
				folder.id,
				undefined,
			);
		});
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

		await waitFor(() => {
			expect(foldersStore.moveFolderToProject).toHaveBeenCalledWith(
				personalProject.id,
				TEST_FOLDER_RESOURCE.id,
				teamProjects[0].id,
				folder.id,
				[shareableUsedCredential.id],
			);
		});
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

		await waitFor(() => {
			expect(foldersStore.moveFolderToProject).toHaveBeenCalledWith(
				personalProject.id,
				TEST_FOLDER_RESOURCE.id,
				teamProjects[0].id,
				folder.id,
				undefined,
			);
		});
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
		await waitFor(() => expect(submitButton).toBeEnabled());

		await userEvent.click(submitButton);

		await waitFor(() => {
			expect(foldersStore.moveFolderToProject).toHaveBeenCalledWith(
				personalProject.id,
				TEST_FOLDER_RESOURCE.id,
				anotherUser.id,
				undefined,
				undefined,
			);
		});
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
					name: `${anotherUser.name} (Personal space)`,
				},
				canAccess: false,
			},
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
		expect(workflowsListStore.fetchWorkflow).toHaveBeenCalledWith(TEST_WORKFLOW_RESOURCE.id);
	});

	describe('data table dependency warning', () => {
		const mockDataTableDependencies = () => {
			vi.mocked(workflowDependenciesApi.getResourceDependencies).mockResolvedValue({
				[TEST_WORKFLOW_RESOURCE.id]: {
					dependencies: [
						{ type: 'dataTableId', id: 'dt-1', name: 'Customers', projectId: personalProject.id },
						{ type: 'dataTableId', id: 'dt-2', name: 'Orders', projectId: personalProject.id },
					],
					inaccessibleCount: 0,
				},
			});
		};

		const renderWorkflowModal = () =>
			renderComponent({
				props: {
					data: {
						resource: TEST_WORKFLOW_RESOURCE,
						resourceType: 'workflow',
						workflowListEventBus: mockEventBus,
					},
				},
			});

		const selectTeamProject = async (projectSelect: HTMLElement) => {
			await userEvent.click(projectSelect);
			const projectSelectDropdownItems = await getDropdownItems(projectSelect);
			const teamProject = [...projectSelectDropdownItems].find(
				(item) => item.querySelector('p')?.textContent?.trim() === teamProjects[0].name,
			);
			await userEvent.click(teamProject as Element);
		};

		it('should warn when transferring a workflow that uses data tables, without blocking the move', async () => {
			settingsStore.settings = enableSharing;
			mockDataTableDependencies();

			const { getByTestId, getByText } = renderWorkflowModal();

			await waitFor(() => expect(getByTestId('moveFolder-modal')).toBeInTheDocument());
			await selectTeamProject(getByTestId('project-sharing-select'));

			await waitFor(() =>
				expect(getByTestId('move-modal-data-tables-warning')).toBeInTheDocument(),
			);
			expect(getByText('2 data tables')).toBeInTheDocument();

			// The warning must not block: the transfer still goes through with it on screen.
			const submitButton = getByTestId('confirm-move-folder-button');
			await waitFor(() => expect(submitButton).toBeEnabled());
			await userEvent.click(submitButton);

			await waitFor(() =>
				expect(projectsStore.moveResourceToProject).toHaveBeenCalledWith(
					'workflow',
					TEST_WORKFLOW_RESOURCE.id,
					teamProjects[0].id,
					undefined,
					undefined,
				),
			);
			expect(getByTestId('move-modal-data-tables-warning')).toBeInTheDocument();
		});

		it('should not warn when moving a workflow within the same project', async () => {
			settingsStore.settings = enableSharing;
			mockDataTableDependencies();

			const { getByTestId, queryByTestId } = renderWorkflowModal();

			await waitFor(() => expect(getByTestId('moveFolder-modal')).toBeInTheDocument());

			expect(queryByTestId('move-modal-data-tables-warning')).not.toBeInTheDocument();
		});

		it('should warn when transferring a folder whose workflows use data tables', async () => {
			settingsStore.settings = enableSharing;
			vi.mocked(workflowDependenciesApi.getFolderDependencies).mockResolvedValue([
				{ type: 'dataTableId', id: 'dt-1', name: 'Customers', projectId: personalProject.id },
			]);

			const { getByTestId, getByText } = renderComponent({
				props: {
					data: {
						resource: TEST_FOLDER_RESOURCE,
						resourceType: 'folder',
						workflowListEventBus: mockEventBus,
					},
				},
			});

			await waitFor(() => expect(getByTestId('moveFolder-modal')).toBeInTheDocument());
			await selectTeamProject(getByTestId('project-sharing-select'));

			await waitFor(() =>
				expect(getByTestId('move-modal-data-tables-warning')).toBeInTheDocument(),
			);
			expect(getByText('1 data table')).toBeInTheDocument();
		});

		it('should not warn about data tables the destination project already owns', async () => {
			settingsStore.settings = enableSharing;
			vi.mocked(workflowDependenciesApi.getResourceDependencies).mockResolvedValue({
				[TEST_WORKFLOW_RESOURCE.id]: {
					dependencies: [
						{ type: 'dataTableId', id: 'dt-1', name: 'Customers', projectId: teamProjects[0].id },
					],
					inaccessibleCount: 0,
				},
			});

			const { getByTestId, queryByTestId } = renderWorkflowModal();

			await waitFor(() => expect(getByTestId('moveFolder-modal')).toBeInTheDocument());
			await selectTeamProject(getByTestId('project-sharing-select'));

			expect(queryByTestId('move-modal-data-tables-warning')).not.toBeInTheDocument();
		});

		it('should not warn when the resource stays in its own project on the overview page', async () => {
			settingsStore.settings = enableSharing;
			// The overview page has no current project; the resource's home project is the comparand.
			projectsStore.currentProject = null;
			projectsStore.currentProjectId = undefined;
			mockDataTableDependencies();

			const { getByTestId, queryByTestId } = renderComponent({
				props: {
					data: {
						resource: { ...TEST_WORKFLOW_RESOURCE, homeProjectId: teamProjects[0].id },
						resourceType: 'workflow',
						workflowListEventBus: mockEventBus,
					},
				},
			});

			await waitFor(() => expect(getByTestId('moveFolder-modal')).toBeInTheDocument());
			await selectTeamProject(getByTestId('project-sharing-select'));

			expect(queryByTestId('move-modal-data-tables-warning')).not.toBeInTheDocument();

			// Suppressing the warning must not reroute the submit: without a current project the
			// transfer branch is still the one whose events the workflow list and editor handle.
			await userEvent.click(getByTestId('confirm-move-folder-button'));

			await waitFor(() => expect(projectsStore.moveResourceToProject).toHaveBeenCalled());
			expect(workflowsStore.updateWorkflow).not.toHaveBeenCalled();
		});

		it('should not warn when the workflow has no data table dependencies', async () => {
			settingsStore.settings = enableSharing;

			const { getByTestId, queryByTestId } = renderWorkflowModal();

			await waitFor(() => expect(getByTestId('moveFolder-modal')).toBeInTheDocument());
			await selectTeamProject(getByTestId('project-sharing-select'));

			expect(queryByTestId('move-modal-data-tables-warning')).not.toBeInTheDocument();
		});
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
		// Wait for dropdown to load and auto-select project root
		await waitFor(() => expect(submitButton).toBeEnabled());

		const folderSelect = getByTestId('move-to-folder-dropdown');
		const folderSelectDropdownItems = await getDropdownItems(folderSelect);
		await userEvent.click(folderSelectDropdownItems[1]);

		expect(submitButton).toBeEnabled();
		await userEvent.click(submitButton);

		await waitFor(() => {
			expect(workflowsStore.updateWorkflow).toHaveBeenCalledWith(TEST_WORKFLOW_RESOURCE.id, {
				parentFolderId: folder.id,
			});
		});
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
			options: { skipApiCall: true },
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
		await waitFor(() => expect(submitButton).toBeEnabled());

		const folderSelect = getByTestId('move-to-folder-dropdown');
		const folderSelectDropdownItems = await getDropdownItems(folderSelect);
		await userEvent.click(folderSelectDropdownItems[1]);

		expect(submitButton).toBeEnabled();
		await userEvent.click(submitButton);

		await waitFor(() => {
			expect(projectsStore.moveResourceToProject).toHaveBeenCalledWith(
				'workflow',
				TEST_WORKFLOW_RESOURCE.id,
				teamProjects[0].id,
				folder.id,
				undefined,
			);
		});
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
			toast: {
				targetProject: teamProjects[0],
				targetProjectName: getTruncatedProjectName(teamProjects[0].name),
				shareUsedCredentials: false,
				areAllUsedCredentialsShareable: true,
			},
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
		await waitFor(() => expect(submitButton).toBeEnabled());
		await userEvent.click(submitButton);

		await waitFor(() => {
			expect(projectsStore.moveResourceToProject).toHaveBeenCalledWith(
				'workflow',
				TEST_WORKFLOW_RESOURCE.id,
				anotherUser.id,
				undefined,
				undefined,
			);
		});
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
					name: `${anotherUser.name} (Personal space)`,
				},
				canAccess: false,
			},
			toast: {
				targetProject: anotherUser,
				targetProjectName: `${anotherUser.name} (Personal space)`,
				shareUsedCredentials: false,
				areAllUsedCredentialsShareable: true,
			},
		});
	});

	describe('transfer policy warning', () => {
		const unpublishPreview: TransferPreview = {
			restricted: [],
			unpublishReasons: [
				{
					kind: 'node-type-unavailable',
					checkId: 'node-type-availability',
					message: 'blocked',
					subject: 'n8n-nodes-base.slack',
					subjectType: 'nodeType',
					scope: 'instance',
				},
			],
			workflowsToUnpublish: [],
			checkFailed: false,
		};

		const setPreview = (preview: TransferPreview | null) => {
			(transferPreviewMock.preview as ReturnType<typeof shallowRef>).value = preview;
		};
		const currentTarget = () => toValue(transferPreviewMock.target) as TransferPreviewTarget | null;
		const currentDestination = () => toValue(transferPreviewMock.destination);

		const renderModal = (resourceType: 'workflow' | 'folder', resource = TEST_WORKFLOW_RESOURCE) =>
			renderComponent({
				props: { data: { resource, resourceType, workflowListEventBus: mockEventBus } },
			});

		const selectTeamProject = async (getByTestId: (id: string) => HTMLElement) => {
			const projectSelect = getByTestId('project-sharing-select');
			await userEvent.click(projectSelect);
			const items = await getDropdownItems(projectSelect);
			const teamProject = [...items].find(
				(item) => item.querySelector('p')?.textContent?.trim() === teamProjects[0].name,
			);
			await userEvent.click(teamProject as Element);
		};

		beforeEach(() => {
			settingsStore.settings = enableSharing;
		});

		it('should not build a preview target while the project is unchanged', async () => {
			const { getByTestId } = renderModal('workflow');
			await waitFor(() => expect(getByTestId('moveFolder-modal')).toBeInTheDocument());

			expect(currentTarget()).toBeNull();
		});

		it('should build a workflow target once another project is selected', async () => {
			const { getByTestId } = renderModal('workflow');
			await waitFor(() => expect(getByTestId('moveFolder-modal')).toBeInTheDocument());

			await selectTeamProject(getByTestId);

			expect(currentTarget()).toEqual({ resourceType: 'workflow', id: TEST_WORKFLOW_RESOURCE.id });
			expect(currentDestination()).toBe(teamProjects[0].id);
		});

		it('should build a folder target with the source project once another project is selected', async () => {
			const { getByTestId } = renderModal('folder', TEST_FOLDER_RESOURCE);
			await waitFor(() => expect(getByTestId('moveFolder-modal')).toBeInTheDocument());

			await selectTeamProject(getByTestId);

			expect(currentTarget()).toEqual({
				resourceType: 'folder',
				id: TEST_FOLDER_RESOURCE.id,
				projectId: personalProject.id,
			});
			expect(currentDestination()).toBe(teamProjects[0].id);
		});

		it('should drop the target when the folder has no known source project', async () => {
			projectsStore.currentProject = null;
			const { getByTestId } = renderModal('folder', TEST_FOLDER_RESOURCE);
			await waitFor(() => expect(getByTestId('moveFolder-modal')).toBeInTheDocument());

			await selectTeamProject(getByTestId);

			expect(currentTarget()).toBeNull();
		});

		it('should not render the warning when there is no preview', async () => {
			const { getByTestId, queryByTestId } = renderModal('workflow');
			await waitFor(() => expect(getByTestId('moveFolder-modal')).toBeInTheDocument());

			expect(queryByTestId('transfer-policy-warning')).not.toBeInTheDocument();
		});

		it('should render the warning when a preview exists', async () => {
			setPreview(unpublishPreview);

			const { getByTestId } = renderModal('workflow');

			await waitFor(() => expect(getByTestId('transfer-policy-warning')).toBeVisible());
		});

		it('should name the destination project in the warning', async () => {
			setPreview(unpublishPreview);
			const { getByTestId } = renderModal('workflow');
			await waitFor(() => expect(getByTestId('moveFolder-modal')).toBeInTheDocument());

			await selectTeamProject(getByTestId);

			expect(getByTestId('transfer-policy-warning')).toHaveTextContent(
				getTruncatedProjectName(teamProjects[0].name),
			);
		});

		describe('unpublished-by-move toast', () => {
			const submitTransfer = async (
				resourceType: 'workflow' | 'folder',
				resource: typeof TEST_WORKFLOW_RESOURCE,
			) => {
				const { getByTestId } = renderModal(resourceType, resource);
				await waitFor(() => expect(getByTestId('moveFolder-modal')).toBeInTheDocument());
				await selectTeamProject(getByTestId);

				const submitButton = getByTestId('confirm-move-folder-button');
				await waitFor(() => expect(submitButton).toBeEnabled());
				await userEvent.click(submitButton);
			};

			it('should pass the workflow result, name and project name to the toast', async () => {
				const result = { unpublishReasons: unpublishPreview.unpublishReasons };
				projectsStore.moveResourceToProject = vi.fn().mockResolvedValue(result);

				await submitTransfer('workflow', TEST_WORKFLOW_RESOURCE);

				await waitFor(() =>
					expect(toastMock.showForWorkflow).toHaveBeenCalledWith(
						result,
						TEST_WORKFLOW_RESOURCE.name,
						getTruncatedProjectName(teamProjects[0].name),
					),
				);
				expect(toastMock.showForFolder).not.toHaveBeenCalled();
			});

			it('should pass the folder result and project name to the toast', async () => {
				const result: FolderTransferResult = {
					unpublishedWorkflows: [{ id: 'w1', name: 'Flow', unpublishReasons: [] }],
				};
				foldersStore.moveFolderToProject = vi.fn().mockResolvedValue(result);

				await submitTransfer('folder', TEST_FOLDER_RESOURCE);

				await waitFor(() =>
					expect(toastMock.showForFolder).toHaveBeenCalledWith(
						result,
						getTruncatedProjectName(teamProjects[0].name),
					),
				);
				expect(toastMock.showForWorkflow).not.toHaveBeenCalled();
			});

			it('should not show the toast when the transfer fails', async () => {
				projectsStore.moveResourceToProject = vi.fn().mockRejectedValue(new Error('nope'));

				await submitTransfer('workflow', TEST_WORKFLOW_RESOURCE);

				await waitFor(() => expect(projectsStore.moveResourceToProject).toHaveBeenCalled());
				expect(toastMock.showForWorkflow).not.toHaveBeenCalled();
			});

			it('should not show the toast for a move inside the same project', async () => {
				const { getByTestId } = renderModal('workflow');
				await waitFor(() => expect(getByTestId('moveFolder-modal')).toBeInTheDocument());

				const folderSelect = getByTestId('move-to-folder-dropdown');
				foldersStore.fetchFoldersAvailableForMove = vi.fn().mockResolvedValue([folder]);
				await userEvent.click(folderSelect);
				const items = await getDropdownItems(folderSelect);
				await userEvent.click(items[items.length - 1]);

				const submitButton = getByTestId('confirm-move-folder-button');
				await waitFor(() => expect(submitButton).toBeEnabled());
				await userEvent.click(submitButton);

				await waitFor(() => expect(workflowsStore.updateWorkflow).toHaveBeenCalled());
				expect(toastMock.showForWorkflow).not.toHaveBeenCalled();
				expect(toastMock.showForFolder).not.toHaveBeenCalled();
			});
		});
	});
});
