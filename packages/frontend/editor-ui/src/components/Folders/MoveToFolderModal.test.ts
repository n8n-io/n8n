import { createTestingPinia } from '@pinia/testing';
import { waitFor, screen } from '@testing-library/vue';
import { createComponentRenderer } from '@/__tests__/render';
import {
	cleanupAppModals,
	createAppModals,
	mockedStore,
	type MockedStore,
} from '@/__tests__/utils';
import MoveToFolderModal from './MoveToFolderModal.vue';
import { useUIStore } from '@/stores/ui.store';
import { MOVE_FOLDER_MODAL_KEY } from '@/constants';
import { createEventBus } from '@n8n/utils/event-bus';
import { useSettingsStore } from '@/stores/settings.store';
import type { FrontendSettings } from '@n8n/api-types';
import type { Project, ProjectListItem } from '@/types/projects.types';
import { useCredentialsStore } from '@/stores/credentials.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useFoldersStore } from '@/stores/folders.store';
import { useProjectsStore } from '@/stores/projects.store';

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

const eventBus = createEventBus();

describe('MoveToFolderModal', () => {
	beforeEach(() => {
		createAppModals();
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
		const currentProject = {
			id: '1',
			name: 'Test Project',
		} as Project;
		const personalProject = {
			id: 'personal-project-id',
			name: 'Personal',
		} as Project;

		projectsStore.currentProject = currentProject;
		projectsStore.currentProjectId = currentProject.id;
		projectsStore.personalProject = personalProject;
		projectsStore.availableProjects = [
			currentProject,
			personalProject,
		] as unknown as ProjectListItem[];
	});

	afterEach(() => {
		cleanupAppModals();
		vi.clearAllMocks();
	});

	it('should render for folder resource', async () => {
		const { getByTestId } = renderComponent({
			props: {
				data: {
					resource: TEST_FOLDER_RESOURCE,
					resourceType: 'folder',
					workflowListEventBus: eventBus,
				},
			},
		});

		await waitFor(() => expect(getByTestId('moveFolder-modal')).toBeInTheDocument());
		expect(screen.getByText(`Move folder ${TEST_FOLDER_RESOURCE.name}`)).toBeInTheDocument();
		// expect(screen.getByTestId('move-folder-description')).toBeInTheDocument();
	});

	it('should render for workflow resource', async () => {
		const { getByTestId } = renderComponent({
			props: {
				data: {
					resource: TEST_WORKFLOW_RESOURCE,
					resourceType: 'workflow',
				},
			},
		});
		await waitFor(() => expect(getByTestId('moveFolder-modal')).toBeInTheDocument());
		expect(screen.getByText(`Move workflow ${TEST_WORKFLOW_RESOURCE.name}`)).toBeInTheDocument();
		// expect(screen.queryByTestId('move-folder-description')).not.toBeInTheDocument();
	});
});
